import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@anivora/database';
import { IngestionService } from './ingestion/ingestion.service';
import { ProviderRegistry } from './providers/provider.registry';

export class IngestionWorker {
  private readonly redis: IORedis;
  private readonly prisma: PrismaClient;
  private readonly ingestionService: IngestionService;
  private syncQueue!: Queue;
  private healthQueue!: Queue;
  private syncWorker!: Worker;
  private healthWorker!: Worker;

  constructor() {
    const redisUrl =
      process.env.REDIS_URL ||
      `redis://:${process.env.REDIS_PASSWORD || 'anivora_redis_secret'}@${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6380}`;
    this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.prisma = new PrismaClient();
    this.ingestionService = new IngestionService(this.prisma);
  }

  public async start(): Promise<void> {
    console.log('[Worker] Starting ANIVORA Ingestion & Background Worker...');

    // 1. Ensure providers are seeded in DB
    await this.syncProvidersToDb();

    // 2. Initialize Queues
    this.syncQueue = new Queue('content-sync', { connection: this.redis });
    this.healthQueue = new Queue('provider-health', { connection: this.redis });

    // 3. Setup Workers
    this.syncWorker = new Worker(
      'content-sync',
      async (job: Job) => {
        return await this.processSyncJob(job);
      },
      { connection: this.redis, concurrency: 2 },
    );

    this.healthWorker = new Worker(
      'provider-health',
      async (job: Job) => {
        return await this.processHealthJob(job);
      },
      { connection: this.redis, concurrency: 1 },
    );

    // Event listeners
    this.syncWorker.on('completed', (job) => {
      console.log(`[Worker] Sync Job ${job.id} completed successfully.`);
    });

    this.syncWorker.on('failed', (job, err) => {
      console.error(`[Worker] Sync Job ${job?.id} failed:`, err);
    });

    this.healthWorker.on('completed', (job) => {
      console.log(`[Worker] Health Job ${job.id} completed.`);
    });

    // 4. Schedule periodic jobs
    await this.scheduleCronJobs();

    console.log('[Worker] Ingestion Worker running and listening for jobs.');
  }

  private async syncProvidersToDb(): Promise<void> {
    const adapters = ProviderRegistry.getAll();
    for (const adapter of adapters) {
      const existing = await this.prisma.provider.findFirst({
        where: {
          OR: [{ id: adapter.config.id }, { slug: adapter.config.slug }, { name: adapter.config.name }],
        },
      });

      if (existing) {
        await this.prisma.provider.update({
          where: { id: existing.id },
          data: {
            name: adapter.config.name,
            slug: adapter.config.slug,
            baseUrl: adapter.config.baseUrl,
            priority: adapter.config.priority,
            supportsAnime: adapter.config.supportsAnime,
            supportsDonghua: adapter.config.supportsDonghua,
          },
        });
      } else {
        await this.prisma.provider.create({
          data: {
            id: adapter.config.id,
            name: adapter.config.name,
            slug: adapter.config.slug,
            baseUrl: adapter.config.baseUrl,
            priority: adapter.config.priority,
            supportsAnime: adapter.config.supportsAnime,
            supportsDonghua: adapter.config.supportsDonghua,
          },
        });
      }
    }
  }

  private async processSyncJob(job: Job): Promise<any> {
    const { providerId, page = 1 } = job.data;
    const adapter = ProviderRegistry.get(providerId);

    if (!adapter) {
      throw new Error(`No adapter found for provider: ${providerId}`);
    }

    console.log(`[Worker] Fetching latest updates from provider: ${adapter.config.name} (page ${page})`);
    const updates = await adapter.getLatestUpdates(page);
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of updates) {
      try {
        const detail = await adapter.getDetail(item.externalUrl);
        const res = await this.ingestionService.ingestContent(adapter.config.id, detail);
        if (res.created) createdCount++;
        if (res.updated) updatedCount++;
      } catch (err: any) {
        console.error(`[Worker] Failed to ingest item ${item.title}:`, err.message);
      }
    }

    return { processed: updates.length, created: createdCount, updated: updatedCount };
  }

  private async processHealthJob(_job: Job): Promise<any> {
    const adapters = ProviderRegistry.getAll();
    const results = [];

    for (const adapter of adapters) {
      const health = await adapter.checkHealth();
      results.push(health);

      await this.prisma.provider.update({
        where: { id: adapter.config.id },
        data: {
          status: health.status as any,
          lastCheckedAt: health.checkedAt,
        },
      });
    }

    return results;
  }

  private async scheduleCronJobs(): Promise<void> {
    // Check provider health every 5 minutes
    await this.healthQueue.add(
      'periodic-health-check',
      {},
      {
        repeat: { every: 5 * 60 * 1000 },
        jobId: 'provider-health-cron',
      },
    );

    // Sync active providers every 30 minutes
    const adapters = ProviderRegistry.getAll();
    for (const adapter of adapters) {
      await this.syncQueue.add(
        `sync-${adapter.config.id}`,
        { providerId: adapter.config.id, page: 1 },
        {
          repeat: { every: 30 * 60 * 1000 },
          jobId: `sync-${adapter.config.id}-cron`,
        },
      );
    }
  }

  public async stop(): Promise<void> {
    await this.syncWorker?.close();
    await this.healthWorker?.close();
    await this.syncQueue?.close();
    await this.healthQueue?.close();
    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}

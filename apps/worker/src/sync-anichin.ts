import { PrismaClient } from '@anivora/database';
import { IngestionService } from './ingestion/ingestion.service';
import { AnichinAdapter } from './providers/anichin.adapter';

/**
 * Live Ingestion Runner - Fetches real Donghua from Anichin
 */
async function syncAnichin(pageLimit: number = 1, maxSeriesCount: number = 10) {
  const prisma = new PrismaClient();
  const ingestionService = new IngestionService(prisma);
  const adapter = new AnichinAdapter();

  console.log(`🚀 Starting live sync from Anichin (${adapter.config.baseUrl})...`);

  // Ensure provider exists in database
  const provider = await prisma.provider.upsert({
    where: { slug: adapter.config.slug },
    create: {
      id: adapter.config.id,
      name: adapter.config.name,
      slug: adapter.config.slug,
      baseUrl: adapter.config.baseUrl,
      priority: adapter.config.priority,
      supportsAnime: adapter.config.supportsAnime,
      supportsDonghua: adapter.config.supportsDonghua,
    },
    update: {
      name: adapter.config.name,
      baseUrl: adapter.config.baseUrl,
      priority: adapter.config.priority,
    },
  });

  const providerId = provider.id;

  let totalProcessed = 0;
  for (let page = 1; page <= pageLimit; page++) {
    console.log(`📄 Fetching Ongoing page ${page}...`);
    const updates = await adapter.getLatestUpdates(page);
    console.log(`Found ${updates.length} items on page ${page}.`);

    for (const item of updates.slice(0, maxSeriesCount)) {
      try {
        console.log(`\n⏳ Ingesting: ${item.title} (${item.externalUrl})`);
        const detail = await adapter.getDetail(item.externalUrl);
        console.log(`   Fetched detail: ${detail.title} - ${detail.episodes.length} episodes, ${detail.genres.join(', ')}`);

        const res = await ingestionService.ingestContent(providerId, detail);
        console.log(`   ✅ DB Result: Created: ${res.created}, Updated: ${res.updated} (ID: ${res.contentId})`);

        // Also resolve playback stream for the latest episode of this series
        if (detail.episodes.length > 0) {
          const latestEp = detail.episodes[detail.episodes.length - 1];
          if (latestEp) {
            console.log(`   🎬 Resolving stream sources for ${latestEp.title}...`);
            const streams = await adapter.resolvePlayback(latestEp.externalUrl);
            console.log(`   Found ${streams.length} playback streams.`);

            const epRecord = await prisma.episode.findFirst({
              where: { contentId: res.contentId, episodeNumber: latestEp.episodeNumber },
              include: { sources: true },
            });

            if (epRecord && epRecord.sources.length > 0) {
              const epSource = epRecord.sources[0];
              if (epSource) {
                for (const st of streams) {
                  await prisma.playbackSource.create({
                    data: {
                      episodeSourceId: epSource.id,
                      serverName: st.serverName,
                      streamUrl: st.streamUrl,
                      format: st.format,
                      codec: st.codec,
                      quality: st.quality,
                      headers: st.headers,
                      priority: st.priority,
                    },
                  });
                }
                console.log(`   ✅ Saved ${streams.length} playback sources to DB.`);
              }
            }
          }
        }

        totalProcessed++;
      } catch (err: any) {
        console.error(`   ❌ Failed to ingest ${item.title}:`, err.message);
      }
    }
  }

  console.log(`\n🎉 Ingestion finished! Successfully processed ${totalProcessed} Donghua series from Anichin.`);
  await prisma.$disconnect();
}

// Run 1 page sync (up to 6 series with real episodes & streams)
syncAnichin(1, 6).catch(console.error);

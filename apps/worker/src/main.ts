import * as dotenv from 'dotenv';
import { IngestionWorker } from './worker';

dotenv.config({ path: '../../.env' });

async function bootstrap() {
  const worker = new IngestionWorker();

  const shutdown = async (signal: string) => {
    console.log(`[Worker] Received ${signal}. Shutting down gracefully...`);
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await worker.start();
  } catch (error) {
    console.error('[Worker] Fatal error during startup:', error);
    process.exit(1);
  }
}

bootstrap();

import 'dotenv/config'; // Load .env before anything else
import { env } from './config/env';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { log } from './utils/logger';

async function bootstrap() {
  try {
    // Connect to the database
    await connectDatabase();
    log.info('✅ Database connection established');

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      log.info(`🚀 FinData Hub API running`, {
        port:        env.PORT,
        environment: env.NODE_ENV,
        docs:        `http://localhost:${env.PORT}/api/docs`,
        health:      `http://localhost:${env.PORT}/health`,
      });
    });

    // ── Graceful shutdown ────────────────────────────────────────────────────

    const shutdown = async (signal: string) => {
      log.info(`Received ${signal} — shutting down gracefully...`);

      server.close(async () => {
        try {
          await disconnectDatabase();
          log.info('Database disconnected. Goodbye!');
          process.exit(0);
        } catch (err) {
          log.error('Error during shutdown', { err });
          process.exit(1);
        }
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        log.error('Forceful shutdown due to timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      log.error('Unhandled promise rejection', { reason });
    });

    process.on('uncaughtException', (err) => {
      log.error('Uncaught exception', { err: err.message, stack: err.stack });
      process.exit(1);
    });
  } catch (err) {
    log.error('Failed to start server', { err });
    process.exit(1);
  }
}

bootstrap();

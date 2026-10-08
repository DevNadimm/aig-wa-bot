import { createApp, logger } from './app.js';
import { initializeWhatsAppOnStartup } from './core/whatsapp/connection.js';
import { configCache } from './core/config/cache.js';

import { ensureDefaultSetup } from './database/seed.js';

const PORT = process.env.PORT || 3000;

export let globalConfig = { orgId: '', botId: '' };

async function bootstrap() {
  try {
    const app = createApp();

    // Initialize config cache
    await configCache.init();

    // Ensure database has at least one Organization and Bot Instance
    const setup = await ensureDefaultSetup();
    if (setup) {
      globalConfig = setup;
      logger.info(`Loaded DB config: Org=${setup.orgId}, Bot=${setup.botId}`);
    } else {
      logger.warn('Could not load DB setup. Foreign key inserts may fail.');
    }

    // Initialize WhatsApp Baileys connection
    await initializeWhatsAppOnStartup('main-bot');

    const { startTimeoutWorker } = await import('./core/workflow/timeout_worker.js');
    startTimeoutWorker();

    app.listen(PORT, () => {
      logger.info(`AIG WA BOT Engine is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();

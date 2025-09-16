import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { loadEnabledServices } from './core/loader';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Basic endpoints always available
app.get('/', (_req, res) => {
  res.json({ message: 'API orchestrator is running' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.get('/version', (_req, res) => {
  res.json({ version: process.env.npm_package_version || '0.0.0' });
});

// Load optional services
const logger = {
  info: console.log.bind(console, '[info]'),
  warn: console.warn.bind(console, '[warn]'),
  error: console.error.bind(console, '[error]')
};

async function bootstrap() {
  // Build manifest purely from env flags
  const enabledFromEnv = (v: string | undefined) => (v || '').toLowerCase() === 'true';
  const manifest = {
    services: {
      firebase: { enabled: enabledFromEnv(process.env.ENABLE_FIREBASE) },
      openai: { enabled: enabledFromEnv(process.env.ENABLE_OPENAI) },
      revenuecat: { enabled: enabledFromEnv(process.env.ENABLE_REVENUECAT) },
      design: { enabled: enabledFromEnv(process.env.ENABLE_DESIGN) },
    }
  };

  await loadEnabledServices(app, manifest, {
    env: process.env,
    logger,
    services: {}
  });

  // Register health endpoints for disabled services to return a consistent message
  for (const [serviceName, cfg] of Object.entries(manifest.services)) {
    if (cfg.enabled) continue;
    app.get(`/${serviceName}/health`, (_req, res) => {
      res.status(503).json({ service: serviceName, status: 'unavailable', error: 'Service disabled' });
    });
  }

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to bootstrap server', err);
  process.exit(1);
});

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import https from 'https';
import morgan from 'morgan';
import path from 'path';
import { randomUUID } from 'crypto';
import { loadEnabledServices } from './core/loader';
import { createApiKeyMiddleware } from './core/security';

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

// Load env variables from root directory first, then from current directory
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const boolFromEnv = (value: string | undefined, defaultValue = false) => {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const normalized = value.toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
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

  const configuredApiKey = process.env.SERVER_API_KEY
  let resolvedApiKey = configuredApiKey;

  if (!resolvedApiKey) {
    resolvedApiKey = randomUUID();
    process.env.SERVER_API_KEY = resolvedApiKey;

    if (process.env.NODE_ENV === 'production') {
      logger.warn('SERVER_API_KEY not provided; generated ephemeral API key for this runtime.');
    } else {
      logger.info('SERVER_API_KEY not provided; generated development API key.');
      logger.info(`Generated API key (development only): ${resolvedApiKey}`);
    }
  }

  const apiKeyMiddleware = createApiKeyMiddleware({
    apiKey: resolvedApiKey,
    headerName: process.env.API_KEY_HEADER,
    queryParamName: process.env.API_KEY_QUERY_PARAM,
    allowedPaths: [/^\/$/, /^\/health$/, /^\/version$/],
    logger
  });

  app.use(apiKeyMiddleware);

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

  const enableHttps = boolFromEnv(process.env.ENABLE_HTTPS, false);
  const enableHttp = boolFromEnv(process.env.ENABLE_HTTP, true);
  const port = parseInt(process.env.PORT || '3000', 10);

  if (enableHttps) {
    const keyPath = process.env.TLS_KEY_PATH;
    const certPath = process.env.TLS_CERT_PATH;
    const caPathsRaw = process.env.TLS_CA_PATHS || process.env.TLS_CA_PATH;
    const httpsPort = parseInt(process.env.HTTPS_PORT || '3443', 10);

    if (!keyPath || !certPath) {
      logger.error('ENABLE_HTTPS is true but TLS_KEY_PATH or TLS_CERT_PATH is not set. Skipping HTTPS startup.');
    } else {
      try {
        const httpsOptions: https.ServerOptions = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        };

        if (caPathsRaw) {
          const caPaths = caPathsRaw.split(',').map((p) => p.trim()).filter(Boolean);
          if (caPaths.length > 0) {
            httpsOptions.ca = caPaths.map((p) => fs.readFileSync(p));
          }
        }

        const passphrase = process.env.TLS_PASSPHRASE;
        if (passphrase) {
          httpsOptions.passphrase = passphrase;
        }

        const httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(httpsPort, () => {
          logger.info(`HTTPS server listening on port ${httpsPort}`);
        });
      } catch (err) {
        logger.error('Failed to start HTTPS server', err);
      }
    }
  }

  if (enableHttp) {
    app.listen(port, () => {
      logger.info(`HTTP server listening on port ${port}`);
    });
  }
}

bootstrap().catch((err) => {
  logger.error('Failed to bootstrap server', err);
  process.exit(1);
});

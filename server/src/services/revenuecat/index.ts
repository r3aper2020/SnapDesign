import type { Express, Request, Response } from 'express';
import type { ServiceModule, ServiceContext } from '../../core/types';
import path from 'path';
import dotenv from 'dotenv';

// Load service-scoped .env (server/src/services/revenuecat/.env)
dotenv.config({ path: path.join(__dirname, '.env') });

interface RevenueCatConfig {
  apiKey: string;
  webhookSecret: string;
}

function getRevenueCatConfig(): RevenueCatConfig | null {
  const apiKey = process.env.REVENUECAT_API_KEY;
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  
  if (!apiKey || !webhookSecret) {
    return null;
  }

  return {
    apiKey,
    webhookSecret
  };
}

let revenueCatConfig: RevenueCatConfig | null = null;

function requireRevenueCat(req: Request, res: Response, next: any) {
  if (!revenueCatConfig) {
    return res.status(503).json({ error: 'RevenueCat service not configured' });
  }
  next();
}

const revenueCatService: ServiceModule = {
  name: 'revenuecat',
  
  async init(ctx: ServiceContext) {
    revenueCatConfig = getRevenueCatConfig();
    
    if (revenueCatConfig) {
      ctx.logger.info('RevenueCat service initialized');
    } else {
      ctx.logger.warn('RevenueCat env vars missing (REVENUECAT_API_KEY, REVENUECAT_WEBHOOK_SECRET). Service will run in stub mode');
    }
  },
  
  async registerRoutes(app: Express, ctx: ServiceContext) {
    // GET /revenuecat/health - Service health check
    app.get('/revenuecat/health', (_req, res) => {
      res.json({
        service: 'revenuecat',
        status: revenueCatConfig ? 'healthy' : 'unavailable',
        version: '1.0.0',
        endpoints: {
          subscriptions: ['/revenuecat/subscribers', '/revenuecat/subscribers/:userId'],
          webhooks: ['/revenuecat/webhooks']
        }
      });
    });

    // GET /revenuecat/subscribers - List subscribers
    app.get('/revenuecat/subscribers', requireRevenueCat, async (req, res) => {
      try {
        // This would make actual RevenueCat API calls
        res.json({
          success: true,
          message: 'RevenueCat subscribers endpoint - implement with actual API calls',
          config: {
            hasApiKey: !!revenueCatConfig?.apiKey,
            hasWebhookSecret: !!revenueCatConfig?.webhookSecret
          }
        });
      } catch (err) {
        ctx.logger.error('RevenueCat subscribers failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /revenuecat/webhooks - Handle RevenueCat webhooks
    app.post('/revenuecat/webhooks', requireRevenueCat, async (req, res) => {
      try {
        // This would handle RevenueCat webhook events
        res.json({
          success: true,
          message: 'RevenueCat webhook endpoint - implement webhook handling',
          received: req.body
        });
      } catch (err) {
        ctx.logger.error('RevenueCat webhook failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Stub endpoints for when RevenueCat is not configured
    if (!revenueCatConfig) {
      app.get('/revenuecat/subscribers', (_req, res) => {
        res.status(503).json({ error: 'RevenueCat service not configured' });
      });
      app.post('/revenuecat/webhooks', (_req, res) => {
        res.status(503).json({ error: 'RevenueCat service not configured' });
      });
    }
  }
};

export default revenueCatService;

import path from 'path';
import type { Express } from 'express';
import { ServiceModule, ServiceContext } from './types';

export type ServicesManifest = { services: Record<string, { enabled: boolean }> };

export async function loadEnabledServices(
  app: Express,
  manifest: ServicesManifest,
  ctx: ServiceContext
): Promise<void> {
  for (const [serviceName, cfg] of Object.entries(manifest.services)) {
    if (!cfg.enabled) continue;

    const modulePath = path.join(__dirname, '..', 'services', serviceName, 'index');

    try {
      const mod: ServiceModule = (await import(modulePath)).default as ServiceModule;
      ctx.logger.info(`Loading service: ${mod.name}`);
      await mod.init?.(ctx);
      await mod.registerRoutes?.(app, ctx);
    } catch (err) {
      ctx.logger.error(`Failed to load service '${serviceName}':`, err);
    }
  }
}

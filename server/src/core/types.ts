import type { Express } from 'express';

export type Logger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type ServiceContext = {
  env: NodeJS.ProcessEnv;
  logger: Logger;
  services: Record<string, unknown>;
};

export type ServiceModule = {
  name: string;
  init?: (ctx: ServiceContext) => Promise<void> | void;
  registerRoutes?: (app: Express, ctx: ServiceContext) => Promise<void> | void;
};

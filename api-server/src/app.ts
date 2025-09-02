import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { router as designRouter } from './routes/design';
import { router as searchRouter } from './routes/search';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.use('/design', designRouter);
  app.use('/search', searchRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};

const app = createApp();
export default app;


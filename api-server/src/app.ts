import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { router as searchRouter } from './routes/search';
import decorateRouter from './routes/decorate';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/search', searchRouter);
app.use('/decorate', decorateRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;


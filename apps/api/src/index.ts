import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { healthRouter } from './routes/health.js';
import { aiRouter } from './routes/ai.js';

const app = new Hono();

app.route('/api', healthRouter);
app.route('/api/ai', aiRouter);

const port = Number(process.env.PORT) || 3001;
console.log(`Rapport API Gateway running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;

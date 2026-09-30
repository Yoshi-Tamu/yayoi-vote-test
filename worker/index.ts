import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import auth from './routes/auth';
import admin from './routes/admin';
import poll from './routes/poll';
import { protectMutations } from './middleware/auth';
import type { AppEnv } from './types';

export const app = new Hono<AppEnv>();

app.use('/api/*', secureHeaders());
app.use('/api/*', protectMutations);
app.route('/api/auth', auth);
app.route('/api', poll);
app.route('/api/admin', admin);

app.get('/api/health', (c) => c.json({ ok: true as const, data: { status: 'ok' as const } }));
app.notFound((c) =>
  c.json({ ok: false as const, error: { code: 'NOT_FOUND', message: '見つかりません' } }, 404)
);
app.onError((error, c) => {
  console.error(error);
  return c.json(
    { ok: false as const, error: { code: 'INTERNAL_ERROR', message: '処理に失敗しました' } },
    500
  );
});

export default app;

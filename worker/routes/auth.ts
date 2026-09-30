import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { readAdminOverview } from '../lib/admin';
import { createSessionToken, pinMatches, signText } from '../lib/crypto';
import { readPoll } from '../lib/poll';
import { errorResponse, readJsonObject } from '../lib/request';
import { ADMIN_COOKIE, VOTER_COOKIE } from '../middleware/auth';
import type { AppEnv, SessionRole } from '../types';

const auth = new Hono<AppEnv>();
const WINDOW_MS = 5 * 60 * 1000;
const BLOCK_MS = 5 * 60 * 1000;
const MAX_FAILURES = 5;

interface AttemptRow {
  window_started_at: number;
  failures: number;
  blocked_until: number;
}

async function attemptKey(c: Parameters<typeof errorResponse>[0], role: SessionRole): Promise<string> {
  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  return signText(c.env.SESSION_SECRET, `pin:${role}:${ip}`);
}

async function isBlocked(c: Parameters<typeof errorResponse>[0], key: string, now: number): Promise<boolean> {
  const row = await c.env.DB.prepare(
    'SELECT window_started_at, failures, blocked_until FROM auth_attempts WHERE key = ?'
  )
    .bind(key)
    .first<AttemptRow>();
  return row !== null && row.blocked_until > now;
}

async function recordFailure(c: Parameters<typeof errorResponse>[0], key: string, now: number) {
  const row = await c.env.DB.prepare(
    'SELECT window_started_at, failures, blocked_until FROM auth_attempts WHERE key = ?'
  )
    .bind(key)
    .first<AttemptRow>();
  const inWindow = row !== null && now - row.window_started_at < WINDOW_MS;
  const failures = inWindow ? row.failures + 1 : 1;
  const windowStartedAt = inWindow ? row.window_started_at : now;
  const blockedUntil = failures >= MAX_FAILURES ? now + BLOCK_MS : 0;
  await c.env.DB.prepare(
    `INSERT INTO auth_attempts (key, window_started_at, failures, blocked_until)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       window_started_at = excluded.window_started_at,
       failures = excluded.failures,
       blocked_until = excluded.blocked_until`
  )
    .bind(key, windowStartedAt, failures, blockedUntil)
    .run();
}

function configureCookie(c: Parameters<typeof errorResponse>[0], name: string, token: string, maxAge: number) {
  setCookie(c, name, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge
  });
}

async function login(c: Parameters<typeof errorResponse>[0], role: SessionRole) {
  if (!c.env.SESSION_SECRET || !(role === 'admin' ? c.env.ADMIN_PIN : c.env.VOTER_PIN)) {
    return errorResponse(c, 500, 'CONFIG_ERROR', 'PIN設定がありません');
  }
  const body = await readJsonObject(c);
  if (!body || typeof body.pin !== 'string') {
    return errorResponse(c, 400, 'VALIDATION_ERROR', '4桁のPINを入力してください');
  }

  const now = Date.now();
  const key = await attemptKey(c, role);
  if (await isBlocked(c, key, now)) {
    return errorResponse(c, 429, 'TOO_MANY_ATTEMPTS', 'しばらく待ってから再度お試しください');
  }

  const expected = role === 'admin' ? c.env.ADMIN_PIN : c.env.VOTER_PIN;
  if (!pinMatches(body.pin, expected)) {
    await recordFailure(c, key, now);
    return errorResponse(c, 401, 'INVALID_PIN', 'PINが違います');
  }
  await c.env.DB.prepare('DELETE FROM auth_attempts WHERE key = ?').bind(key).run();

  const maxAge = role === 'admin' ? 8 * 60 * 60 : 24 * 60 * 60;
  const payload = {
    role,
    expiresAt: now + maxAge * 1000,
    ...(role === 'voter' ? { deviceId: crypto.randomUUID() } : {})
  };
  const token = await createSessionToken(c.env.SESSION_SECRET, payload);
  configureCookie(c, role === 'admin' ? ADMIN_COOKIE : VOTER_COOKIE, token, maxAge);
  if (role === 'admin') {
    return c.json({
      ok: true as const,
      data: { role, overview: await readAdminOverview(c.env.DB) }
    });
  }
  return c.json({ ok: true as const, data: { role, poll: await readPoll(c.env.DB) } });
}

auth.post('/voter', (c) => login(c, 'voter'));
auth.post('/admin', (c) => login(c, 'admin'));
auth.delete('/session', (c) => {
  deleteCookie(c, ADMIN_COOKIE, { path: '/' });
  deleteCookie(c, VOTER_COOKIE, { path: '/' });
  return c.json({ ok: true as const, data: null });
});

export default auth;

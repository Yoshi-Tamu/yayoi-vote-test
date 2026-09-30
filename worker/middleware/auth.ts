import { getCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import { verifySessionToken } from '../lib/crypto';
import { errorResponse } from '../lib/request';
import type { AppEnv, SessionRole } from '../types';

export const ADMIN_COOKIE = 'admin_session';
export const VOTER_COOKIE = 'voter_session';

export function requireRole(role: SessionRole): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!c.env.SESSION_SECRET) {
      return errorResponse(c, 500, 'CONFIG_ERROR', 'セッション設定がありません');
    }
    const cookieName = role === 'admin' ? ADMIN_COOKIE : VOTER_COOKIE;
    const session = await verifySessionToken(c.env.SESSION_SECRET, getCookie(c, cookieName));
    if (!session || session.role !== role) {
      return errorResponse(c, 401, 'AUTH_REQUIRED', 'PINを入力してください');
    }
    c.set('session', session);
    await next();
  };
}

export const protectMutations: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    await next();
    return;
  }
  const origin = c.req.header('Origin');
  if (origin) {
    const requestUrl = new URL(c.req.url);
    const originUrl = new URL(origin);
    const loopback = new Set(['localhost', '127.0.0.1', '::1']);
    const sameHost = requestUrl.hostname === originUrl.hostname;
    const localPair = loopback.has(requestUrl.hostname) && loopback.has(originUrl.hostname);
    if (!sameHost && !localPair) {
      return errorResponse(c, 403, 'INVALID_ORIGIN', 'この操作は許可されていません');
    }
  }
  await next();
};

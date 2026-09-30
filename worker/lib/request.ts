import type { Context } from 'hono';
import type { AppEnv } from '../types';

export async function readJsonObject(c: Context<AppEnv>): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await c.req.json();
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function errorResponse(
  c: Context<AppEnv>,
  status: 400 | 401 | 403 | 404 | 409 | 429 | 500,
  code: string,
  message: string
) {
  return c.json({ ok: false as const, error: { code, message } }, status);
}

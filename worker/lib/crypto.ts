import type { SessionPayload } from '../types';

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function signText(secret: string, value: string): Promise<string> {
  return bytesToBase64Url(await hmac(secret, value));
}

export async function hashDevice(secret: string, deviceId: string): Promise<string> {
  return signText(secret, `device:${deviceId}`);
}

export async function createCancelToken(
  secret: string,
  voteId: string,
  deviceId: string
): Promise<string> {
  return signText(secret, `cancel:${voteId}:${deviceId}`);
}

export async function createSessionToken(secret: string, payload: SessionPayload): Promise<string> {
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await signText(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(
  secret: string,
  token: string | undefined,
  now = Date.now()
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra) return null;

  const expected = await hmac(secret, encodedPayload);
  let actual: Uint8Array;
  try {
    actual = base64UrlToBytes(signature);
  } catch {
    return null;
  }
  if (!equalBytes(expected, actual)) return null;

  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
    const payload: unknown = JSON.parse(decoded);
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('role' in payload) ||
      !('expiresAt' in payload)
    ) {
      return null;
    }
    const role = payload.role;
    const expiresAt = payload.expiresAt;
    const deviceId = 'deviceId' in payload ? payload.deviceId : undefined;
    if (
      (role !== 'admin' && role !== 'voter') ||
      typeof expiresAt !== 'number' ||
      expiresAt <= now ||
      (deviceId !== undefined && typeof deviceId !== 'string') ||
      (role === 'voter' && !deviceId)
    ) {
      return null;
    }
    return { role, expiresAt, ...(deviceId ? { deviceId } : {}) };
  } catch {
    return null;
  }
}

export function pinMatches(actual: string, expected: string): boolean {
  if (!/^\d{4}$/.test(actual) || !/^\d{4}$/.test(expected)) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

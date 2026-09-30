export interface VoteCursor {
  castAt: number;
  id: string;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export function encodeVoteCursor(cursor: VoteCursor): string {
  return toBase64Url(JSON.stringify(cursor));
}

export function decodeVoteCursor(value: string | undefined): VoteCursor | null {
  if (!value || value.length > 256) return null;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('castAt' in parsed) ||
      !('id' in parsed) ||
      typeof parsed.castAt !== 'number' ||
      !Number.isSafeInteger(parsed.castAt) ||
      typeof parsed.id !== 'string' ||
      parsed.id.length < 1 ||
      parsed.id.length > 100
    ) {
      return null;
    }
    return { castAt: parsed.castAt, id: parsed.id };
  } catch {
    return null;
  }
}

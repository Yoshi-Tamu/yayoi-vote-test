import { describe, expect, it } from 'vitest';
import { createCancelToken, createSessionToken, pinMatches, verifySessionToken } from '../worker/lib/crypto';

describe('PIN and session handling', () => {
  it('accepts only the matching four-digit PIN', () => {
    expect(pinMatches('1234', '1234')).toBe(true);
    expect(pinMatches('1235', '1234')).toBe(false);
    expect(pinMatches('123', '0123')).toBe(false);
    expect(pinMatches('abcd', 'abcd')).toBe(false);
  });

  it('verifies a signed voter session', async () => {
    const token = await createSessionToken('test-secret', {
      role: 'voter',
      deviceId: 'device-1',
      expiresAt: 2_000
    });
    await expect(verifySessionToken('test-secret', token, 1_000)).resolves.toEqual({
      role: 'voter',
      deviceId: 'device-1',
      expiresAt: 2_000
    });
    await expect(verifySessionToken('wrong-secret', token, 1_000)).resolves.toBeNull();
    await expect(verifySessionToken('test-secret', token, 3_000)).resolves.toBeNull();
  });

  it('binds a cancel token to both the vote and device', async () => {
    const token = await createCancelToken('test-secret', 'vote-1', 'device-1');
    await expect(createCancelToken('test-secret', 'vote-1', 'device-1')).resolves.toBe(token);
    await expect(createCancelToken('test-secret', 'vote-2', 'device-1')).resolves.not.toBe(token);
    await expect(createCancelToken('test-secret', 'vote-1', 'device-2')).resolves.not.toBe(token);
  });
});

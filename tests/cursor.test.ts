import { describe, expect, it } from 'vitest';
import { decodeVoteCursor, encodeVoteCursor } from '../worker/lib/cursor';

describe('vote cursor', () => {
  it('round-trips a timestamp and vote id', () => {
    const cursor = { castAt: 1_790_812_800_000, id: 'vote-id' };
    expect(decodeVoteCursor(encodeVoteCursor(cursor))).toEqual(cursor);
  });

  it('rejects invalid cursor values', () => {
    expect(decodeVoteCursor(undefined)).toBeNull();
    expect(decodeVoteCursor('not-base64')).toBeNull();
    expect(decodeVoteCursor('a'.repeat(257))).toBeNull();
  });
});

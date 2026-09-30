import { describe, expect, it } from 'vitest';
import { getPollStatus, parseClosingTime } from '../worker/lib/poll';
import type { PollRow } from '../worker/types';

function poll(overrides: Partial<PollRow> = {}): PollRow {
  return {
    id: 1,
    title: '投票',
    accepting_votes: 1,
    closes_at: 2_000,
    revision: 1,
    created_at: 0,
    updated_at: 0,
    ...overrides
  };
}

describe('poll timing', () => {
  it('stops accepting at the configured deadline', () => {
    expect(getPollStatus(poll(), 1_999)).toBe('open');
    expect(getPollStatus(poll(), 2_000)).toBe('closed');
    expect(getPollStatus(poll(), 2_001)).toBe('closed');
  });

  it('distinguishes an unconfigured poll from a paused poll', () => {
    expect(getPollStatus(poll({ closes_at: null }), 1_000)).toBe('draft');
    expect(getPollStatus(poll({ accepting_votes: 0 }), 1_000)).toBe('paused');
  });

  it('parses valid dates and rejects invalid values', () => {
    expect(parseClosingTime('2026-10-01T00:00:00.000Z')).toBe(1_790_812_800_000);
    expect(parseClosingTime(null)).toBeNull();
    expect(parseClosingTime('invalid')).toBeUndefined();
    expect(parseClosingTime(123)).toBeUndefined();
  });
});

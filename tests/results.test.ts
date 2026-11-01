import { describe, expect, it } from 'vitest';
import { rankResults } from '../worker/lib/results';
import type { ResultOption } from '../shared/types';

function option(id: string, votes: number, sortOrder = 0): ResultOption {
  return { id, label: id, votes, sortOrder };
}

describe('public results', () => {
  it('excludes the paper plane before calculating the top three', () => {
    const entries = rankResults([
      option('fourth', 2), option('plane', 100), option('first', 12), option('third', 4), option('second', 8)
    ], 'plane');
    expect(entries.map(({ id, rank, votes, tied }) => ({ id, rank, votes, tied }))).toEqual([
      { id: 'first', rank: 1, votes: 12, tied: false },
      { id: 'second', rank: 2, votes: 8, tied: false },
      { id: 'third', rank: 3, votes: 4, tied: false }
    ]);
  });

  it('uses competition ranking and shows all ties at third place', () => {
    const entries = rankResults([
      option('a', 12, 1), option('b', 12, 2), option('c', 6, 3), option('d', 6, 4), option('e', 4, 5)
    ], 'plane');
    expect(entries.map(({ rank, tied, votes }) => ({ rank, tied, votes }))).toEqual([
      { rank: 1, tied: true, votes: 12 }, { rank: 1, tied: true, votes: 12 },
      { rank: 3, tied: true, votes: 6 }, { rank: 3, tied: true, votes: 6 }
    ]);
  });

  it('does not drop tied winners even when there are more than three', () => {
    const entries = rankResults(Array.from({ length: 5 }, (_, index) => option(String(index), 10, index)), 'plane');
    expect(entries).toHaveLength(5);
    expect(entries.every((entry) => entry.rank === 1 && entry.tied)).toBe(true);
  });

  it('omits zero-vote options and handles fewer than three results', () => {
    expect(rankResults([option('a', 0), option('plane', 1)], 'plane')).toEqual([]);
    expect(rankResults([option('a', 2), option('b', 1), option('c', 0)], 'plane').map((entry) => entry.rank)).toEqual([1, 2]);
  });

  it('keeps ties in display order and leaves the input unchanged', () => {
    const options = [option('second', 5, 2), option('first', 5, 1)];
    expect(rankResults(options, 'plane').map((entry) => entry.id)).toEqual(['first', 'second']);
    expect(options.map((entry) => entry.id)).toEqual(['second', 'first']);
  });
});

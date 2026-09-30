import type { PollStatus, PollView } from '../../shared/types';
import type { Bindings, OptionRow, PollRow } from '../types';

export function getPollStatus(poll: PollRow, now = Date.now()): PollStatus {
  if (poll.closes_at === null) return 'draft';
  if (now >= poll.closes_at) return 'closed';
  if (poll.accepting_votes !== 1) return 'paused';
  return 'open';
}

export async function readPoll(db: Bindings['DB'], now = Date.now()): Promise<PollView> {
  const [poll, optionsResult] = await Promise.all([
    db.prepare('SELECT * FROM poll WHERE id = 1').first<PollRow>(),
    db
      .prepare('SELECT id, label, sort_order FROM options WHERE poll_id = 1 ORDER BY sort_order, created_at')
      .all<OptionRow>()
  ]);
  if (!poll) throw new Error('Poll configuration is missing');
  return {
    title: poll.title,
    acceptingVotes: poll.accepting_votes === 1,
    closesAt: poll.closes_at === null ? null : new Date(poll.closes_at).toISOString(),
    revision: poll.revision,
    status: getPollStatus(poll, now),
    options: optionsResult.results.map((option) => ({
      id: option.id,
      label: option.label,
      sortOrder: option.sort_order
    }))
  };
}

export function parseClosingTime(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

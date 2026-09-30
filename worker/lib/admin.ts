import type { AdminOverview } from '../../shared/types';
import { getPollStatus } from './poll';
import type { Bindings, PollRow } from '../types';

interface ResultOptionRow {
  id: string;
  label: string;
  sort_order: number;
  votes: number;
}

export async function readAdminOverview(
  db: Bindings['DB'],
  now = Date.now()
): Promise<AdminOverview> {
  const [poll, optionsResult] = await Promise.all([
    db.prepare('SELECT * FROM poll WHERE id = 1').first<PollRow>(),
    db
      .prepare(
        `SELECT options.id, options.label, options.sort_order, COUNT(votes.id) AS votes
         FROM options LEFT JOIN votes ON votes.option_id = options.id
         WHERE options.poll_id = 1
         GROUP BY options.id
         ORDER BY options.sort_order, options.created_at`
      )
      .all<ResultOptionRow>()
  ]);
  if (!poll) throw new Error('Poll configuration is missing');

  const options = optionsResult.results.map((option) => ({
    id: option.id,
    label: option.label,
    sortOrder: option.sort_order,
    votes: Number(option.votes)
  }));
  return {
    poll: {
      title: poll.title,
      acceptingVotes: poll.accepting_votes === 1,
      closesAt: poll.closes_at === null ? null : new Date(poll.closes_at).toISOString(),
      revision: poll.revision,
      status: getPollStatus(poll, now),
      options: options.map(({ id, label, sortOrder }) => ({ id, label, sortOrder }))
    },
    totalVotes: options.reduce((total, option) => total + option.votes, 0),
    options
  };
}

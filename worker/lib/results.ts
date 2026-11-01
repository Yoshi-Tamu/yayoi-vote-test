import type { RankedOption, ResultOption } from '../../shared/types';

export function rankResults(options: ResultOption[], excludedOptionId: string): RankedOption[] {
  const eligible = options
    .filter((option) => option.id !== excludedOptionId && option.votes > 0)
    .sort((left, right) => right.votes - left.votes || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const entries: RankedOption[] = [];
  let rank = 0;

  for (let index = 0; index < eligible.length; index += 1) {
    const option = eligible[index];
    if (index === 0 || option.votes !== eligible[index - 1].votes) rank = index + 1;
    if (rank > 3) break;
    entries.push({
      id: option.id,
      label: option.label,
      votes: option.votes,
      rank,
      tied: option.votes === eligible[index - 1]?.votes || option.votes === eligible[index + 1]?.votes
    });
  }
  return entries;
}

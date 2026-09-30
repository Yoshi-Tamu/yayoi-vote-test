export type PollStatus = 'draft' | 'paused' | 'open' | 'closed';

export interface PollOption {
  id: string;
  label: string;
  sortOrder: number;
}

export interface PollView {
  title: string;
  acceptingVotes: boolean;
  closesAt: string | null;
  revision: number;
  status: PollStatus;
  options: PollOption[];
}

export interface VoteReceipt {
  voteId: string;
  cancelToken: string;
  castAt: string;
}

export interface ResultOption extends PollOption {
  votes: number;
}

export interface ResultVote {
  id: string;
  optionId: string;
  optionLabel: string;
  castAt: string;
}

export interface AdminOverview {
  poll: PollView;
  totalVotes: number;
  options: ResultOption[];
}

export interface VotePage {
  votes: ResultVote[];
  nextCursor: string | null;
}

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

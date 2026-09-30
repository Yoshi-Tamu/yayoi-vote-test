/// <reference types="@cloudflare/workers-types" />

export interface Bindings {
  DB: D1Database;
  ADMIN_PIN: string;
  VOTER_PIN: string;
  SESSION_SECRET: string;
}

export type SessionRole = 'admin' | 'voter';

export interface SessionPayload {
  role: SessionRole;
  deviceId?: string;
  expiresAt: number;
}

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    session: SessionPayload;
  };
};

export interface PollRow {
  id: number;
  title: string;
  accepting_votes: number;
  closes_at: number | null;
  revision: number;
  created_at: number;
  updated_at: number;
}

export interface OptionRow {
  id: string;
  label: string;
  sort_order: number;
}

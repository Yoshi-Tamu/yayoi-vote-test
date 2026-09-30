PRAGMA foreign_keys = ON;

CREATE TABLE poll (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL,
  accepting_votes INTEGER NOT NULL DEFAULT 0 CHECK (accepting_votes IN (0, 1)),
  closes_at INTEGER,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO poll (id, title, accepting_votes, closes_at, revision, created_at, updated_at)
VALUES (1, '弥生祭 人気投票', 0, NULL, 1, unixepoch('subsec') * 1000, unixepoch('subsec') * 1000);

CREATE TABLE options (
  id TEXT PRIMARY KEY,
  poll_id INTEGER NOT NULL DEFAULT 1 REFERENCES poll(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 40),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX options_poll_sort_idx ON options (poll_id, sort_order, created_at);

CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  option_id TEXT NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  device_key_hash TEXT NOT NULL,
  cast_at INTEGER NOT NULL,
  UNIQUE (device_key_hash, request_id)
);

CREATE INDEX votes_option_idx ON votes (option_id);
CREATE INDEX votes_cast_at_idx ON votes (cast_at DESC);

CREATE TABLE auth_attempts (
  key TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  failures INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);

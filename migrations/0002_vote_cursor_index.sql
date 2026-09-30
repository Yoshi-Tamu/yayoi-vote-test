DROP INDEX IF EXISTS votes_cast_at_idx;
CREATE INDEX votes_cast_at_id_idx ON votes (cast_at DESC, id DESC);
PRAGMA optimize;

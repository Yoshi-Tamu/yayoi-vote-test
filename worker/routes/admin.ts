import { Hono } from 'hono';
import type { VotePage } from '../../shared/types';
import { readAdminOverview } from '../lib/admin';
import { decodeVoteCursor, encodeVoteCursor } from '../lib/cursor';
import { parseClosingTime } from '../lib/poll';
import { errorResponse, readJsonObject } from '../lib/request';
import { requireRole } from '../middleware/auth';
import type { AppEnv } from '../types';

const admin = new Hono<AppEnv>();
admin.use('*', requireRole('admin'));

admin.get('/overview', async (c) => {
  return c.json({ ok: true as const, data: await readAdminOverview(c.env.DB) });
});

admin.put('/poll', async (c) => {
  const body = await readJsonObject(c);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const closesAt = parseClosingTime(body?.closesAt);
  const acceptingVotes = body?.acceptingVotes;
  if (!title || title.length > 80 || closesAt === undefined || typeof acceptingVotes !== 'boolean') {
    return errorResponse(c, 400, 'VALIDATION_ERROR', '投票設定が正しくありません');
  }
  if (acceptingVotes) {
    if (closesAt === null || closesAt <= Date.now()) {
      return errorResponse(c, 400, 'INVALID_DEADLINE', '受付期限を未来の日時に設定してください');
    }
    const optionCount = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM options WHERE poll_id = 1')
      .first<{ count: number }>();
    if (!optionCount || Number(optionCount.count) === 0) {
      return errorResponse(c, 400, 'NO_OPTIONS', '投票先を1件以上追加してください');
    }
  }

  await c.env.DB.prepare(
    `UPDATE poll
     SET title = ?, closes_at = ?, accepting_votes = ?, updated_at = ?
     WHERE id = 1`
  )
    .bind(title, closesAt, acceptingVotes ? 1 : 0, Date.now())
    .run();
  return c.json({ ok: true as const, data: await readAdminOverview(c.env.DB) });
});

admin.post('/options', async (c) => {
  const body = await readJsonObject(c);
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  if (!label || label.length > 40) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', '投票先は1文字以上40文字以内で入力してください');
  }
  const current = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM options WHERE poll_id = 1'
  ).first<{ next_order: number }>();
  const now = Date.now();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO options (id, poll_id, label, sort_order, created_at, updated_at)
     VALUES (?, 1, ?, ?, ?, ?)`
  )
    .bind(id, label, Number(current?.next_order ?? 0), now, now)
    .run();
  return c.json({ ok: true as const, data: await readAdminOverview(c.env.DB) }, 201);
});

admin.patch('/options/:id', async (c) => {
  const body = await readJsonObject(c);
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  const sortOrder = body?.sortOrder;
  if (!label || label.length > 40 || typeof sortOrder !== 'number' || !Number.isInteger(sortOrder)) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', '投票先の内容が正しくありません');
  }
  const result = await c.env.DB.prepare(
    'UPDATE options SET label = ?, sort_order = ?, updated_at = ? WHERE id = ? AND poll_id = 1'
  )
    .bind(label, sortOrder, Date.now(), c.req.param('id'))
    .run();
  if ((result.meta.changes ?? 0) !== 1) {
    return errorResponse(c, 404, 'OPTION_NOT_FOUND', '投票先が見つかりません');
  }
  return c.json({ ok: true as const, data: await readAdminOverview(c.env.DB) });
});

admin.delete('/options/:id', async (c) => {
  const body = await readJsonObject(c);
  const deleteVotes = body?.deleteVotes === true;
  const optionId = c.req.param('id');
  const row = await c.env.DB.prepare(
    `SELECT options.id, COUNT(votes.id) AS vote_count
     FROM options LEFT JOIN votes ON votes.option_id = options.id
     WHERE options.id = ? GROUP BY options.id`
  )
    .bind(optionId)
    .first<{ id: string; vote_count: number }>();
  if (!row) return errorResponse(c, 404, 'OPTION_NOT_FOUND', '投票先が見つかりません');
  if (Number(row.vote_count) > 0 && !deleteVotes) {
    return errorResponse(c, 409, 'OPTION_HAS_VOTES', 'この投票先には票が入っています');
  }
  await c.env.DB.prepare('DELETE FROM options WHERE id = ?').bind(optionId).run();
  return c.json({ ok: true as const, data: await readAdminOverview(c.env.DB) });
});

interface ResultVoteRow {
  id: string;
  option_id: string;
  option_label: string;
  cast_at: number;
}

admin.get('/votes', async (c) => {
  const limitValue = c.req.query('limit') ?? '50';
  const limit = Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', '取得件数が正しくありません');
  }
  const cursorValue = c.req.query('cursor');
  const cursor = decodeVoteCursor(cursorValue);
  if (cursorValue && !cursor) {
    return errorResponse(c, 400, 'INVALID_CURSOR', 'カーソルが正しくありません');
  }

  const query = cursor
    ? c.env.DB.prepare(
        `SELECT votes.id, votes.option_id, options.label AS option_label, votes.cast_at
         FROM votes JOIN options ON options.id = votes.option_id
         WHERE votes.cast_at < ? OR (votes.cast_at = ? AND votes.id < ?)
         ORDER BY votes.cast_at DESC, votes.id DESC
         LIMIT ?`
      ).bind(cursor.castAt, cursor.castAt, cursor.id, limit + 1)
    : c.env.DB.prepare(
        `SELECT votes.id, votes.option_id, options.label AS option_label, votes.cast_at
         FROM votes JOIN options ON options.id = votes.option_id
         ORDER BY votes.cast_at DESC, votes.id DESC
         LIMIT ?`
      ).bind(limit + 1);
  const result = await query.all<ResultVoteRow>();
  const hasMore = result.results.length > limit;
  const rows = result.results.slice(0, limit);
  const last = rows.at(-1);
  const data: VotePage = {
    votes: rows.map((vote) => ({
      id: vote.id,
      optionId: vote.option_id,
      optionLabel: vote.option_label,
      castAt: new Date(vote.cast_at).toISOString()
    })),
    nextCursor:
      hasMore && last ? encodeVoteCursor({ castAt: last.cast_at, id: last.id }) : null
  };
  return c.json({ ok: true as const, data });
});

admin.delete('/votes/:id', async (c) => {
  const result = await c.env.DB.prepare('DELETE FROM votes WHERE id = ?').bind(c.req.param('id')).run();
  if ((result.meta.changes ?? 0) !== 1) {
    return errorResponse(c, 404, 'VOTE_NOT_FOUND', '票が見つかりません');
  }
  return c.json({
    ok: true as const,
    data: { voteId: c.req.param('id'), overview: await readAdminOverview(c.env.DB) }
  });
});

admin.post('/reset', async (c) => {
  const body = await readJsonObject(c);
  if (body?.target === 'votes') {
    await c.env.DB.prepare('DELETE FROM votes').run();
    return c.json({
      ok: true as const,
      data: { target: 'votes' as const, overview: await readAdminOverview(c.env.DB) }
    });
  }
  if (body?.target === 'poll') {
    const now = Date.now();
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM votes'),
      c.env.DB.prepare('DELETE FROM options'),
      c.env.DB
        .prepare(
          `UPDATE poll SET title = ?, accepting_votes = 0, closes_at = NULL,
           revision = revision + 1, updated_at = ? WHERE id = 1`
        )
        .bind('弥生祭 人気投票', now)
    ]);
    return c.json({
      ok: true as const,
      data: { target: 'poll' as const, overview: await readAdminOverview(c.env.DB) }
    });
  }
  return errorResponse(c, 400, 'VALIDATION_ERROR', 'リセット対象が正しくありません');
});

export default admin;

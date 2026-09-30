import { Hono } from 'hono';
import { createCancelToken, hashDevice } from '../lib/crypto';
import { readPoll } from '../lib/poll';
import { errorResponse, readJsonObject } from '../lib/request';
import { requireRole } from '../middleware/auth';
import type { AppEnv, PollRow } from '../types';

const poll = new Hono<AppEnv>();

poll.get('/poll', requireRole('voter'), async (c) => {
  return c.json({ ok: true as const, data: await readPoll(c.env.DB) });
});

interface ExistingVote {
  id: string;
  cast_at: number;
}

poll.post('/votes', requireRole('voter'), async (c) => {
  const body = await readJsonObject(c);
  if (!body || typeof body.optionId !== 'string' || typeof body.requestId !== 'string') {
    return errorResponse(c, 400, 'VALIDATION_ERROR', '投票内容が正しくありません');
  }
  if (body.requestId.length < 8 || body.requestId.length > 100) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'リクエストIDが正しくありません');
  }

  const session = c.get('session');
  if (!session.deviceId) return errorResponse(c, 401, 'AUTH_REQUIRED', 'PINを入力してください');
  const deviceHash = await hashDevice(c.env.SESSION_SECRET, session.deviceId);
  const existing = await c.env.DB.prepare(
    'SELECT id, cast_at FROM votes WHERE device_key_hash = ? AND request_id = ?'
  )
    .bind(deviceHash, body.requestId)
    .first<ExistingVote>();
  if (existing) {
    return c.json({
      ok: true as const,
      data: {
        voteId: existing.id,
        cancelToken: await createCancelToken(c.env.SESSION_SECRET, existing.id, session.deviceId),
        castAt: new Date(existing.cast_at).toISOString()
      }
    });
  }

  const now = Date.now();
  const currentPoll = await c.env.DB.prepare('SELECT * FROM poll WHERE id = 1').first<PollRow>();
  if (!currentPoll) return errorResponse(c, 500, 'CONFIG_ERROR', '投票設定がありません');
  if (currentPoll.closes_at === null || currentPoll.accepting_votes !== 1) {
    return errorResponse(c, 409, 'POLL_NOT_OPEN', '現在、投票を受け付けていません');
  }
  if (now >= currentPoll.closes_at) {
    return errorResponse(c, 409, 'POLL_EXPIRED', '投票受付は終了しました');
  }

  const voteId = crypto.randomUUID();
  const result = await c.env.DB.prepare(
    `INSERT INTO votes (id, option_id, request_id, device_key_hash, cast_at)
     SELECT ?, options.id, ?, ?, ?
     FROM options JOIN poll ON poll.id = options.poll_id
     WHERE options.id = ?
       AND poll.id = 1
       AND poll.accepting_votes = 1
       AND poll.closes_at IS NOT NULL
       AND poll.closes_at > ?`
  )
    .bind(voteId, body.requestId, deviceHash, now, body.optionId, now)
    .run();
  if ((result.meta.changes ?? 0) !== 1) {
    return errorResponse(c, 409, 'VOTE_REJECTED', '投票を受け付けられませんでした');
  }

  return c.json(
    {
      ok: true as const,
      data: {
        voteId,
        cancelToken: await createCancelToken(c.env.SESSION_SECRET, voteId, session.deviceId),
        castAt: new Date(now).toISOString()
      }
    },
    201
  );
});

poll.post('/votes/:id/cancel', requireRole('voter'), async (c) => {
  const body = await readJsonObject(c);
  if (!body || typeof body.cancelToken !== 'string') {
    return errorResponse(c, 400, 'VALIDATION_ERROR', '取消情報がありません');
  }
  const session = c.get('session');
  if (!session.deviceId) return errorResponse(c, 401, 'AUTH_REQUIRED', 'PINを入力してください');
  const voteId = c.req.param('id');
  const expected = await createCancelToken(c.env.SESSION_SECRET, voteId, session.deviceId);
  if (body.cancelToken !== expected) {
    return errorResponse(c, 403, 'INVALID_CANCEL_TOKEN', 'この票は取り消せません');
  }
  const deviceHash = await hashDevice(c.env.SESSION_SECRET, session.deviceId);
  const result = await c.env.DB.prepare('DELETE FROM votes WHERE id = ? AND device_key_hash = ?')
    .bind(voteId, deviceHash)
    .run();
  if ((result.meta.changes ?? 0) !== 1) {
    return errorResponse(c, 404, 'VOTE_NOT_FOUND', '票が見つかりません');
  }
  return c.json({ ok: true as const, data: { voteId } });
});

export default poll;

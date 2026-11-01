import { Hono } from 'hono';
import type { ResultsView } from '../../shared/types';
import { readAdminOverview } from '../lib/admin';
import { errorResponse } from '../lib/request';
import { rankResults } from '../lib/results';
import type { AppEnv } from '../types';

const results = new Hono<AppEnv>();

results.get('/results', async (c) => {
  c.header('Cache-Control', 'no-store');
  if (!c.env.RESULTS_EXCLUDED_OPTION_ID) {
    return errorResponse(c, 500, 'CONFIG_ERROR', '結果の表示設定がありません');
  }
  const overview = await readAdminOverview(c.env.DB);
  const data: ResultsView = {
    title: overview.poll.title,
    entries: rankResults(overview.options, c.env.RESULTS_EXCLUDED_OPTION_ID)
  };
  return c.json({ ok: true as const, data });
});

export default results;

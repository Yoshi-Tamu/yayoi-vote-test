# Repository

sveltekit + Vite + Hono + Typescript のCloudFlareWorkers　以下CFW上で動作するWebアプリ。
githubのhttps://github.com/Yoshi-Tamu/yayoi-vote-testリポジトリを使うこと。

# Commands

- Install: `npm install`
- Dev: `npm run dev`
- Test: `npm test`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Preview: `npm run preview`
- Local D1 migration: `npm run db:migrate:local`
- Remote D1 migration: `npm run db:migrate:remote`

# Conventions

- TypeScriptでは `any` を原則使用しない
- 既存のディレクトリ構成を優先する
- 同等の既存utilityがある場合は再利用する
- APIレスポンス形式は既存endpointに合わせる
- 利用者画面・管理画面とも、装飾と文言は必要最低限にする
- キャッチコピーや宣伝調の文言を画面内に追加しない

# Boundaries

- 新しい依存関係を追加する前に必要性を確認する
- `.env` やsecretをコミットしない
- 無関係なリファクタリングを同時に行わない
- ユーザーの既存変更をrevertしない

# Verification

変更した領域に応じて、関連テスト・typecheck・lint・buildを実行する。

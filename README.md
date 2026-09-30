# 弥生祭 人気投票

SvelteKitの画面とHono APIを1つのCloudflare Workerで動かす投票アプリです。データはCloudflare D1に保存します。

## ローカル実行

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

- 利用者画面: `http://localhost:5173/`
- 管理画面: `http://localhost:5173/admin/`

`.dev.vars` の `ADMIN_PIN`、`VOTER_PIN`、`SESSION_SECRET` はローカル用の値に変更してください。`.dev.vars` はGitの管理対象外です。

## 検証

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

## 本番セットアップ

本番用Cloudflare環境を作成する際に、以下が必要です。

1. D1データベース `yayoi-vote-test` を作成する
2. `wrangler.jsonc` の `database_id` を実際のIDに置き換える
3. `ADMIN_PIN`、`VOTER_PIN`、`SESSION_SECRET` をCloudflare Secretsへ登録する
4. リモートD1へマイグレーションを適用する
5. Workerをデプロイする

リモートD1の変更とデプロイはCloudflare環境を変更するため、実行前に承認を得てください。

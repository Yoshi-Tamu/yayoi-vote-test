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

## 本番環境

- URL: `https://yayoi-vote-test.nemuri3-zzz.workers.dev`
- D1: `yayoi-vote-test`

`ADMIN_PIN`、`VOTER_PIN`、`SESSION_SECRET` はCloudflare Secretsに登録し、リポジトリには保存しません。

マイグレーションを追加した場合は、デプロイ前に次を実行します。

```powershell
npm run db:migrate:remote
npm run deploy
```

リモートD1の変更とデプロイはCloudflare環境を変更するため、実行前に承認を得てください。

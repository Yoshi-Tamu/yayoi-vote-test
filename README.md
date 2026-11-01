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
- 公開結果: `http://localhost:5173/kekka/`（PIN不要）

`.dev.vars` の `ADMIN_PIN`、`VOTER_PIN`、`SESSION_SECRET` はローカル用の値に変更してください。`.dev.vars` はGitの管理対象外です。

## 結果ページ

`/kekka/` は、紙ヒコーキを除いた上位3位までの作品名と票数を表示します。同票は「タイ」と表示し、順位は1位・1位・3位の方式です。3位以内で同率の作品はすべて表示し、0票の作品は表示しません。取得はページ表示時と「更新」ボタンを押したときだけ行います。

除外対象は `wrangler.jsonc` の `RESULTS_EXCLUDED_OPTION_ID` で指定します。現在は「No.3 ひこうきとばそ！」の作品IDです。投票全体のリセットなどで作品を作り直した場合は、新しいIDに変更してデプロイしてください。除外は結果表示だけに適用し、元の作品・票や管理画面の集計は変更しません。

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

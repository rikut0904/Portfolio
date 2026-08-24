# Portfolio

## 構成

- `frontend/`: Next.jsフロントエンド
- `backend/`: Go APIサーバー
- `docker-compose.yml`: ローカル実行環境（フロントエンド + バックエンド）

## Makeで起動

0. 環境ファイルを準備する

   - `make init-env`
1. 起動する

   - `make up`
   - `make help`（利用可能なターゲットを表示）
2. 動作を確認する

   - フロントエンド: `http://localhost:3001`
   - バックエンドヘルスチェック: `http://localhost:8081/health`
3. ログを確認する

   - `make logs`
4. 停止する

   - `make down`

## 注意事項

- ログインにFirebaseの環境変数は必要ありません。
- 認証はバックエンドのAPI（`/api/auth/login`、`/api/auth/me`）によるBasic認証で行います。
- `backend/.env`で`APP_MODE=true`を設定すると、`/admin/login`から`/admin/signin`へリダイレクトします。
- Docker Composeは以下の環境ファイルを読み込みます。

  - `frontend/.env`
  - `backend/.env`

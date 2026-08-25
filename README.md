# Portfolio

## 構成

- `frontend/`: Next.jsフロントエンド
- `backend/`: Go APIサーバー
- `docker-compose.yml`: ローカル実行環境（フロントエンド + バックエンド）

## Makeで起動

0. 環境ファイルを準備する

   - `make init-env`
1. Migrationを実行する

   - `make migrate`
2. 起動する

   - `make up`
   - `make help`（利用可能なターゲットを表示）
3. 動作を確認する

   - フロントエンド: `http://localhost:3001`
   - バックエンドヘルスチェック: `http://localhost:8081/health`
4. ログを確認する

   - `make logs`
5. 停止する

   - `make down`

## モックデータ

ローカル画面の確認用にデータを投入できます。

```bash
make mocks
```

`make mocks`はローカルの`postgres`サービスに対してのみ実行してください。本番DBや共有DBの`DATABASE_URL`を指定して実行してはいけません。Makefileにはローカル接続先以外を拒否する安全ガードがあり、migrationと匿名モックデータの投入を行います。

## 注意事項

- `.env.example`は本番環境へ設定する項目の例、`.env.local.example`はローカル開発用の例です。
- ログインにFirebaseの環境変数は必要ありません。
- 認証はバックエンドのAPI（`/api/auth/login`、`/api/auth/me`）によるBasic認証で行います。
- Google Calendarの環境変数は任意です。未設定の場合はGoogle Calendar連携を無効にして起動します。
- ローカルDBは固定値（`portfolio` / `portfolio` / `portfolio`）で、`postgres_data`ボリュームに保存されます。
- CIはローカルとは別の`postgres-ci`（`portfolio_ci` / `portfolio_ci` / `portfolio_ci`）を使い、毎回破棄します。
- ローカルの基本設定（DB、Basic認証、メールなど）は`docker-compose.yml`に固定しています。
- Google Calendar、Discord webhook、GitHub APIの設定は`backend/.env.local`から読み込みます。
- 連携機能を使う場合だけ、`backend/.env.local`へ必要な環境変数を設定します。

- Discord:
  - `DISCORD_WEBHOOK_URL` または `DISCORD_WEBHOOK_URLS`
- GitHub:
  - `GITHUB_TOKEN`
  - `GITHUB_OWNER`
  - `GITHUB_REPO`
  - `GITHUB_BRANCH`
- Google Calendar:
  - `GOOGLE_CALENDAR_IDS`
  - `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`
  - `GOOGLE_CALENDAR_TIMEZONE`
- `make`のCompose操作は`backend/.env.local`を連携機能用の環境ファイルとして読み込みます。

## CI

GitHub Actionsの以下のワークフローを、`main`へのpushとPull Requestで実行します。

- `fmt.yml`: Goの`gofmt`とフロントエンドのPrettier
- `lint.yml`: Goの`go vet`とフロントエンドのESLint
- `ci.yml`: Goのテスト
- `build.yml`: Go・Next.js・DockerイメージのビルドとDocker Compose設定の検証
- `security.yml`: Goとnpmの依存関係の脆弱性チェック
- `race.yml`: Goのデータ競合検出
- `integration.yml`: CI用PostgreSQLでのMigration・API・Basic認証の結合テスト

Dependabotは以下の依存関係を毎週月曜日に確認し、更新Pull Requestを作成します。

- BackendのGoモジュール
- Frontendのnpmパッケージ
- GitHub Actions
- Dockerイメージ

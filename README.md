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

# Vercel デプロイ設定ガイド

## 環境変数の設定

Vercelにデプロイする際、以下の環境変数を設定する必要があります。

### 1. Vercel に環境変数を設定

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」
4. 以下の環境変数を追加：

#### Vercel（フロントエンド）の環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `BACKEND_API_URL` | バックエンドのURL | Next.jsからバックエンドへ接続するURL |

管理者認証と画像アップロードの設定は、Vercelではなくバックエンドの実行環境（Railwayなど）に設定します。

#### バックエンドの必須環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `BASIC_AUTH_USERNAME` | 管理者ユーザー名 | Basic認証のユーザー名 |
| `BASIC_AUTH_PASSWORD` | 強力なパスワード | Basic認証のパスワード。未設定ではバックエンドが起動しません |
| `BASIC_AUTH_EMAIL` | 管理者メールアドレス | 管理ログなどに表示するメールアドレス（任意） |
| `GITHUB_TOKEN` | GitHubのPAT | 画像アップロードAPIでGitHubにpushする認証トークン |
| `GITHUB_OWNER` | GitHubユーザー名／Org名 | 画像をpushするリポジトリのオーナー |
| `GITHUB_REPO` | リポジトリ名 | 画像を配置するリポジトリ |
| `GITHUB_BRANCH` | ブランチ名（例: main） | ファイルを作成するブランチ。省略時はmain |

### GitHub Personal Access Token の作成

1. GitHubにログインし、右上のプロフィール → **Settings** → **Developer settings** → **Personal access tokens** へ移動
2. `repo` 権限を含むトークンを作成（Fine-grainedの場合は対象リポジトリへの **Contents: Read and write** を許可）
3. 得られたトークンを `GITHUB_TOKEN` に設定し、同じリポジトリの `owner` / `repo` / 使用ブランチを環境変数に入力

トークンにはファイル作成権限が必要なので、必要最低限のスコープで生成し、漏洩を避けるためバックエンドの環境変数としてのみ利用してください。

### 2. Vercel環境変数の適用範囲

`BACKEND_API_URL`を以下の環境に適用：
- ✅ Production
- ✅ Preview
- ✅ Development

バックエンド側のBasic認証・GitHub環境変数は、バックエンドを実行する環境のProduction設定に追加してください。

### 3. 再デプロイ

環境変数を設定後、プロジェクトを再デプロイしてください。

## ローカル開発環境の設定

1. バックエンドの `.env.local` はComposeの固定値を使用し、Google Calendar・Discord webhook・GitHub連携を使う場合だけ設定を追加します：
```bash
cp backend/.env.local.example backend/.env.local
```

2. GitHubトークンなどの本番設定は、`backend/.env.example`を参考に本番環境へ設定します。

## 注意事項

- ⚠️ `.env`と`.env.local`は絶対にGitにコミットしないでください（`.gitignore` に含まれています）
- ⚠️ `BASIC_AUTH_PASSWORD` は本番・Previewごとに安全な値を設定してください
- ✅ Firebaseの環境変数は不要です

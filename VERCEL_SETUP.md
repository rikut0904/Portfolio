# Vercel デプロイ設定ガイド

## 環境変数の設定

Vercelにデプロイする際、以下の環境変数を設定する必要があります。

### 1. Firebase Service Account Key の取得

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. 「プロジェクトの設定」→「サービスアカウント」
4. 「新しい秘密鍵の生成」をクリック
5. `serviceAccountKey.json` がダウンロードされます

### 2. JSON を1行の文字列に変換

ダウンロードした `serviceAccountKey.json` の内容を1行の文字列にします：

```bash
# Linux/Mac
cat serviceAccountKey.json | jq -c

# または手動でスペースと改行を削除
```

### 3. Vercel に環境変数を設定

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」
4. 以下の環境変数を追加：

#### 必須環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | JSON文字列全体 | Firebase Admin SDK用のサービスアカウントキー |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase設定のapiKey | Firebaseクライアント設定 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase設定のauthDomain | Firebaseクライアント設定 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase設定のprojectId | Firebaseクライアント設定 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase設定のstorageBucket | Firebaseクライアント設定 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase設定のmessagingSenderId | Firebaseクライアント設定 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase設定のappId | Firebaseクライアント設定 |

### 4. 環境変数の適用範囲

すべての環境変数を以下の環境に適用：
- ✅ Production
- ✅ Preview
- ✅ Development

### 5. 再デプロイ

環境変数を設定後、プロジェクトを再デプロイしてください。

## ローカル開発環境の設定

1. `.env.local.example` をコピーして `.env.local` を作成：
```bash
cp .env.local.example .env.local
```

2. `serviceAccountKey.json` の内容を1行にして、`.env.local` の `FIREBASE_SERVICE_ACCOUNT_KEY` に設定：
```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}'
```

3. その他のFirebase設定値も `.env.local` に追加

## 注意事項

- ⚠️ `serviceAccountKey.json` は絶対にGitにコミットしないでください
- ⚠️ `.env.local` もGitにコミットしないでください（`.gitignore` に含まれています）
- ✅ `.env.local.example` のみGitにコミットしてください

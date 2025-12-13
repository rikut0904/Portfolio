// Firebase Admin SDK設定（サーバーサイド専用）
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
        "Please add it to your Vercel environment variables."
      );
    }

    const serviceAccount = JSON.parse(serviceAccountKey);

    // 必須フィールドのチェック
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error(
        "Service account key is missing required fields (project_id, private_key, or client_email). " +
        "Please check your FIREBASE_SERVICE_ACCOUNT_KEY environment variable."
      );
    }

    // private_key の改行(\n)を本物の改行に戻す
    if (typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    throw error; // ビルド時にエラーを明確にするため
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;

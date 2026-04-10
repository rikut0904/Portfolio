"use client";

import React, { useRef, useState } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import Link from "next/link";

function ImagesContent() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPath, setUploadPath] = useState("product");
  const [uploading, setUploading] = useState(false);
  const [uploadedImagePath, setUploadedImagePath] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // プレビュー用のURLを作成
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("path", uploadPath);

      const token = await user.getIdToken();
      const response = await fetch("/api/images/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 409) {
        const data = await response.json();
        alert(
          `同名のファイルが既に存在します。\nファイル名を変更し、必要に応じて以下のパスを確認してください。\n${data.path ?? ""}`,
        );
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setUploadedImagePath(data.path);
        setSelectedFile(null);
        setPreviewUrl("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        alert(
          "アップロード成功！\nGitHubへのプッシュが完了すると、数分後にデプロイされます。",
        );
      } else {
        alert("アップロードに失敗しました");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-5">
          <Link
            href="/admin"
            className="text-blue-800 hover:text-gray-900 mb-4"
          >
            ← ダッシュボード
          </Link>
          <h1 className="text-2xl font-bold mb-4">画像管理</h1>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="space-y-4">
            {/* アップロード先選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アップロード先
              </label>
              <select
                value={uploadPath}
                onChange={(e) => setUploadPath(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="product">作品画像 (/img/product/)</option>
                <option value="profile">プロフィール画像 (/img/)</option>
                <option value="other">その他 (/img/other/)</option>
              </select>
            </div>

            {/* ファイル選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ファイル選択
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* プレビュー */}
            {previewUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プレビュー
                </label>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-md rounded border border-gray-300"
                />
              </div>
            )}

            {/* アップロードボタン */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "アップロード中..." : "GitHubにアップロード"}
            </button>

            {/* アップロード結果 */}
            {uploadedImagePath && (
              <div className="bg-green-50 border border-green-200 p-4 rounded">
                <p className="font-semibold text-green-800 mb-2">
                  アップロード成功！
                </p>
                <p className="text-sm text-gray-700">パス:</p>
                <code className="block bg-white px-3 py-2 rounded border border-gray-300 text-sm mt-1">
                  {uploadedImagePath}
                </code>
                <p className="text-sm text-gray-600 mt-2">
                  このパスを作品登録などで使用してください
                </p>
              </div>
            )}
          </div>

          {/* 使い方説明 */}
          <div className="mt-8 border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-2">使い方</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>アップロード先のフォルダを選択</li>
              <li>画像ファイルを選択</li>
              <li>「GitHubにアップロード」をクリック</li>
              <li>表示されたパスをコピー</li>
              <li>作品登録などで画像パスとして使用</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ImagesPage() {
  return (
    <ProtectedRoute>
      <ImagesContent />
    </ProtectedRoute>
  );
}

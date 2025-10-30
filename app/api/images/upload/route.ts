import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "../../../../lib/firebase/admin";
import { Octokit } from "@octokit/rest";

// 認証チェックヘルパー
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

// POST: 画像をGitHubにアップロード（認証必要）
export async function POST(request: NextRequest) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string; // e.g., "product" or "profile"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ファイルをBase64に変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Content = buffer.toString("base64");

    // GitHub API初期化
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const owner = process.env.GITHUB_OWNER!;
    const repo = process.env.GITHUB_REPO!;
    const branch = process.env.GITHUB_BRANCH || "main";

    // ファイル名を生成（タイムスタンプ + 元のファイル名）
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `public/img/${path}/${fileName}`;

    // GitHubにファイルをアップロード
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Upload image: ${fileName}`,
      content: base64Content,
      branch,
    });

    // 公開URLを返す
    const publicPath = `/img/${path}/${fileName}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
      fileName,
      sha: response.data.content?.sha,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

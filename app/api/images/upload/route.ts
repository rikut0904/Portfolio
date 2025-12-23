import { NextRequest, NextResponse } from "next/server";
import { writeAdminLog } from "../../../../lib/admin/logs";
import { checkAdminAuth } from "../../../../lib/auth/admin-auth";
import { Octokit } from "@octokit/rest";

// POST: 画像をGitHubにアップロード（認証必要）
export async function POST(request: NextRequest) {
  const user = await checkAdminAuth(request);
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

    // 元のファイル名を利用（空白や全角文字を安全な形式に正規化）
    const sanitizedFileName = file.name
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const fileName = sanitizedFileName.length > 0 ? sanitizedFileName : file.name;
    const filePath = `public/img/${path}/${fileName}`;

    // 既存ファイル確認で同名ファイルアップロードを防止
    try {
      await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch,
      });

      return NextResponse.json(
        { error: "File already exists", path: `/img/${path}/${fileName}` },
        { status: 409 }
      );
    } catch (error: any) {
      if (error.status !== 404) {
        throw error;
      }
    }

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

    await writeAdminLog({
      action: "upload",
      entity: "image",
      user,
      details: {
        path: publicPath,
        fileName,
      },
    });

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

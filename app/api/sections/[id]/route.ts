import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "../../../../lib/firebase/admin";

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

// PUT: セクションデータを更新（認証必要）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const data = await request.json();

    await adminDb.collection("sections").doc(id).update(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

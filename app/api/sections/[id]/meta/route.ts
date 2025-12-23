import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "../../../../../lib/firebase/admin";
import { writeAdminLog } from "../../../../../lib/admin/logs";

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

// PATCH: セクションのメタデータを部分更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const updates = await request.json();

    // メタデータを更新
    await adminDb.collection("sectionMeta").doc(id).update(updates);

    await writeAdminLog({
      action: "update",
      entity: "sectionMeta",
      entityId: id,
      user,
      details: {
        updates,
      },
    });

    return NextResponse.json({ message: "Meta updated successfully" });
  } catch (error) {
    console.error("Error updating section meta:", error);
    return NextResponse.json({ error: "Failed to update section meta" }, { status: 500 });
  }
}

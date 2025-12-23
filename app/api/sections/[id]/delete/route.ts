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

// DELETE: セクションを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // sectionsコレクションから削除
    await adminDb.collection("sections").doc(id).delete();

    // sectionMetaコレクションから削除
    await adminDb.collection("sectionMeta").doc(id).delete();

    await writeAdminLog({
      action: "delete",
      entity: "section",
      entityId: id,
      user,
    });

    return NextResponse.json({ message: "Section deleted successfully" });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}

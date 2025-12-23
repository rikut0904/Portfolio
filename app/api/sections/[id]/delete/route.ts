import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../../lib/firebase/admin";
import { writeAdminLog } from "../../../../../lib/admin/logs";
import { checkAdminAuth } from "../../../../../lib/auth/admin-auth";

// DELETE: セクションを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAdminAuth(request);
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
      level: "warn",
    });

    return NextResponse.json({ message: "Section deleted successfully" });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}

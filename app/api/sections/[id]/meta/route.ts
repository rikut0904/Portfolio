import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../../lib/firebase/admin";
import { writeAdminLog } from "../../../../../lib/admin/logs";
import { checkAdminAuth } from "../../../../../lib/auth/admin-auth";

// PATCH: セクションのメタデータを部分更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAdminAuth(request);
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

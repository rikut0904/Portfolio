import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase/admin";
import { writeAdminLog } from "../../../../lib/admin/logs";
import { checkAdminAuth } from "../../../../lib/auth/admin-auth";

// PUT: セクションデータを更新（認証必要）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const data = await request.json();

    await adminDb.collection("sections").doc(id).update(data);

    await writeAdminLog({
      action: "update",
      entity: "section",
      entityId: id,
      user,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

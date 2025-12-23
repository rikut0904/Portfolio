import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase/admin";
import { writeAdminLog } from "../../../../lib/admin/logs";
import { checkAdminAuth } from "../../../../lib/auth/admin-auth";

// PUT: 技術を編集（認証必要）
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
    const { name, category } = data;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Technology name is required" },
        { status: 400 }
      );
    }

    // 同じ名前の技術が他に存在しないかチェック（自分自身は除く）
    const existingSnapshot = await adminDb
      .collection("technologies")
      .where("name", "==", name.trim())
      .get();

    const duplicates = existingSnapshot.docs.filter(doc => doc.id !== id);
    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: "Technology with this name already exists" },
        { status: 400 }
      );
    }

    await adminDb.collection("technologies").doc(id).update({
      name: name.trim(),
      category: category || "",
      updatedAt: new Date().toISOString(),
    });

    await writeAdminLog({
      action: "update",
      entity: "technology",
      entityId: id,
      user,
      details: {
        name: name.trim(),
        category: category || "",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating technology:", error);
    return NextResponse.json({ error: "Failed to update technology" }, { status: 500 });
  }
}

// DELETE: 技術を削除（認証必要）
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
    await adminDb.collection("technologies").doc(id).delete();

    await writeAdminLog({
      action: "delete",
      entity: "technology",
      entityId: id,
      user,
      level: "warn",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting technology:", error);
    return NextResponse.json({ error: "Failed to delete technology" }, { status: 500 });
  }
}

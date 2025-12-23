import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase/admin";
import { writeAdminLog } from "../../../../lib/admin/logs";
import { checkAdminAuth } from "../../../../lib/auth/admin-auth";

// GET: 特定の課外活動を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await adminDb.collection("activities").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      activity: { id: doc.id, ...doc.data() },
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

// PUT: 課外活動を更新
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
    const body = await request.json();

    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection("activities").doc(id).update(updateData);

    await writeAdminLog({
      action: "update",
      entity: "activity",
      entityId: id,
      user,
    });

    return NextResponse.json({
      message: "Activity updated successfully",
    });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

// DELETE: 課外活動を削除
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
    await adminDb.collection("activities").doc(id).delete();

    await writeAdminLog({
      action: "delete",
      entity: "activity",
      entityId: id,
      user,
      level: "warn",
    });

    return NextResponse.json({
      message: "Activity deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}

// PATCH: 課外活動の一部を更新（順番変更など）
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

    await adminDb.collection("activities").doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    await writeAdminLog({
      action: "update",
      entity: "activity",
      entityId: id,
      user,
      details: {
        updates,
      },
    });

    return NextResponse.json({
      message: "Activity updated successfully",
    });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

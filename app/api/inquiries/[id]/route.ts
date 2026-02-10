import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase/admin";
import { checkAdminAuth } from "../../../../lib/auth/admin-auth";
import { writeAdminLog } from "../../../../lib/admin/logs";

const normalize = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const doc = await adminDb.collection("inquiries").doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = doc.data() || {};
    const detail = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };

    await writeAdminLog({
      action: "read",
      entity: "inquiry",
      entityId: doc.id,
      user,
    });

    return NextResponse.json({ inquiry: detail });
  } catch (error) {
    console.error("Error fetching inquiry:", error);
    return NextResponse.json({ error: "Failed to fetch inquiry" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const status = normalize(data?.status);
    if (!status || !["pending", "in_progress", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const now = new Date().toISOString();
    await adminDb.collection("inquiries").doc(params.id).update({
      status,
      updatedAt: now,
    });

    await writeAdminLog({
      action: "update",
      entity: "inquiry",
      entityId: params.id,
      user,
      details: { status },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating inquiry status:", error);
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}

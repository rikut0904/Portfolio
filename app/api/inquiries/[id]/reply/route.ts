import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "../../../../../lib/firebase/admin";
import { randomUUID } from "crypto";
import { checkAdminAuth } from "../../../../../lib/auth/admin-auth";
import { writeAdminLog } from "../../../../../lib/admin/logs";

const normalize = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const message = normalize(data?.message);
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const reply = {
      id: randomUUID(),
      message,
      senderType: "admin",
      senderName: user.email || "admin",
      createdAt: now,
    };

    const docRef = adminDb.collection("inquiries").doc(params.id);

    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists) {
        throw new Error("Not found");
      }
      const current = snapshot.data() || {};
      const nextStatus = current.status === "pending" ? "in_progress" : current.status;

      transaction.update(docRef, {
        replies: admin.firestore.FieldValue.arrayUnion(reply),
        status: nextStatus,
        updatedAt: now,
      });
    });

    await writeAdminLog({
      action: "reply",
      entity: "inquiry",
      entityId: params.id,
      user,
      details: { messageLength: message.length },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Error creating inquiry reply:", error);
    return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
  }
}

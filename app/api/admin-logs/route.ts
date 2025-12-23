import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "../../../lib/firebase/admin";
import { writeAdminLog, pruneOldAdminLogs } from "../../../lib/admin/logs";
import { checkAdminAuth } from "../../../lib/auth/admin-auth";

type AuthLogBody = {
  action?: string;
};

export async function POST(request: NextRequest) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as AuthLogBody;
    const action = body?.action?.toString();

    if (!action || (action !== "login" && action !== "logout")) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "";

    await writeAdminLog({
      action,
      entity: "auth",
      user,
      details: {
        userAgent,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating admin log:", error);
    return NextResponse.json({ error: "Failed to create admin log" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const cursorParam = searchParams.get("cursor");
    const limit = Math.min(parseInt(limitParam || "10", 10) || 10, 50);

    const decodeCursor = (value: string) => {
      try {
        const decoded = Buffer.from(value, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded);
        if (typeof parsed?.createdAt !== "string" || typeof parsed?.id !== "string") {
          return null;
        }
        return parsed as { createdAt: string; id: string };
      } catch {
        return null;
      }
    };

    const encodeCursor = (createdAt: string, id: string) =>
      Buffer.from(JSON.stringify({ createdAt, id })).toString("base64");

    await pruneOldAdminLogs();
    let query = adminDb
      .collection("adminLogs")
      .orderBy("createdAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc")
      .limit(limit);

    if (cursorParam) {
      const cursor = decodeCursor(cursorParam);
      if (cursor) {
        query = query.startAfter(cursor.createdAt, cursor.id);
      }
    }

    const snapshot = await query.get();

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor =
      lastDoc && snapshot.size === limit
        ? encodeCursor(lastDoc.get("createdAt"), lastDoc.id)
        : null;

    return NextResponse.json({ logs, nextCursor });
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    return NextResponse.json({ error: "Failed to fetch admin logs" }, { status: 500 });
  }
}

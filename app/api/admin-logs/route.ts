import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../lib/firebase/admin";
import { writeAdminLog, pruneOldAdminLogs } from "../../../lib/admin/logs";

type AuthLogBody = {
  action?: string;
};

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

export async function POST(request: NextRequest) {
  const user = await checkAuth(request);
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
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await pruneOldAdminLogs();
    const snapshot = await adminDb
      .collection("adminLogs")
      .orderBy("createdAt", "desc")
      .get();

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    return NextResponse.json({ error: "Failed to fetch admin logs" }, { status: 500 });
  }
}

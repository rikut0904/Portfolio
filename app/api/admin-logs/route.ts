import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "../../../lib/firebase/admin";
import { writeAdminLog } from "../../../lib/admin/logs";

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

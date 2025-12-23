import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase/admin";
import { writeAdminLog } from "../../../lib/admin/logs";
import { checkAdminAuth } from "../../../lib/auth/admin-auth";

// GET: 全技術を取得
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("technologies")
      .orderBy("name", "asc")
      .get();

    const technologies = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      name: doc.data().name,
      category: doc.data().category || "",
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    return NextResponse.json({ technologies });
  } catch (error) {
    console.error("Error fetching technologies:", error);
    return NextResponse.json({ error: "Failed to fetch technologies" }, { status: 500 });
  }
}

// POST: 新しい技術を追加（認証必要）
export async function POST(request: NextRequest) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { name, category } = data;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Technology name is required" },
        { status: 400 }
      );
    }

    // 重複チェック
    const existingSnapshot = await adminDb
      .collection("technologies")
      .where("name", "==", name.trim())
      .get();

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: "Technology already exists" },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection("technologies").add({
      name: name.trim(),
      category: category || "",
      createdAt: new Date().toISOString(),
    });

    const newTechnology = {
      id: docRef.id,
      name: name.trim(),
      category: category || "",
      createdAt: new Date().toISOString(),
    };

    await writeAdminLog({
      action: "create",
      entity: "technology",
      entityId: docRef.id,
      user,
      details: {
        name: name.trim(),
        category: category || "",
      },
    });

    return NextResponse.json({ technology: newTechnology }, { status: 201 });
  } catch (error) {
    console.error("Error creating technology:", error);
    return NextResponse.json({ error: "Failed to create technology" }, { status: 500 });
  }
}

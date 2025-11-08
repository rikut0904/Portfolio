import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "../../../lib/firebase/admin";

// 認証チェックヘルパー
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
  const user = await checkAuth(request);
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

    return NextResponse.json({ technology: newTechnology }, { status: 201 });
  } catch (error) {
    console.error("Error creating technology:", error);
    return NextResponse.json({ error: "Failed to create technology" }, { status: 500 });
  }
}

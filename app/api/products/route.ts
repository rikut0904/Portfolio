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

// GET: 全作品を取得
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("products")
      .orderBy("createdAt", "desc")
      .get();

    const products = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST: 新しい作品を追加（認証必要）
export async function POST(request: NextRequest) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { title, description, image, link } = data;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection("products").add({
      title,
      description,
      image: image || "",
      link: link || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const newProduct = {
      id: docRef.id,
      title,
      description,
      image,
      link,
    };

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

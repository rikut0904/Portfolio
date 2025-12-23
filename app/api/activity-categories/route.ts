import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "../../../lib/firebase/admin";
import { writeAdminLog } from "../../../lib/admin/logs";

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

// GET: 全カテゴリを取得
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("activityCategories")
      .orderBy("order", "asc")
      .get();

    const categories = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      { categories },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST: 新しいカテゴリを追加
export async function POST(request: NextRequest) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, order } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // orderが指定されていない場合、最大値+1を設定
    let categoryOrder = order;
    if (typeof categoryOrder !== "number") {
      const snapshot = await adminDb
        .collection("activityCategories")
        .orderBy("order", "desc")
        .limit(1)
        .get();

      const maxOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order;
      categoryOrder = maxOrder + 1;
    }

    const categoryData = {
      name,
      order: categoryOrder,
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb
      .collection("activityCategories")
      .add(categoryData);

    await writeAdminLog({
      action: "create",
      entity: "activityCategory",
      entityId: docRef.id,
      user,
      details: {
        name,
        order: categoryOrder,
      },
    });

    return NextResponse.json(
      {
        message: "Category created successfully",
        category: { id: docRef.id, ...categoryData },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

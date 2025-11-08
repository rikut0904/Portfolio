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

// GET: 全課外活動を取得
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("activities")
      .orderBy("order", "desc")
      .get();

    const activities = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      { activities },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// POST: 新しい課外活動を追加
export async function POST(request: NextRequest) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      technologies,
      link,
      image,
      status,
      createdYear,
      createdMonth,
      order,
    } = body;

    if (!title || !category) {
      return NextResponse.json(
        { error: "Title and category are required" },
        { status: 400 }
      );
    }

    // orderが指定されていない場合、最大値+1を設定
    let activityOrder = order;
    if (typeof activityOrder !== "number") {
      const snapshot = await adminDb
        .collection("activities")
        .orderBy("order", "desc")
        .limit(1)
        .get();

      const maxOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order;
      activityOrder = maxOrder + 1;
    }

    const activityData = {
      title,
      description,
      category,
      technologies: technologies || [],
      link: link || "",
      image: image || "",
      status: status || "非公開",
      createdYear: createdYear || new Date().getFullYear(),
      createdMonth: createdMonth || new Date().getMonth() + 1,
      order: activityOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("activities").add(activityData);

    return NextResponse.json(
      {
        message: "Activity created successfully",
        activity: { id: docRef.id, ...activityData },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}

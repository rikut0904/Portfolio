import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase/admin";
import { writeAdminLog } from "../../../lib/admin/logs";
import { checkAdminAuth } from "../../../lib/auth/admin-auth";

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
  const user = await checkAdminAuth(request);
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

    await writeAdminLog({
      action: "create",
      entity: "activity",
      entityId: docRef.id,
      user,
      details: {
        title,
        category,
        status: status || "非公開",
      },
    });

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

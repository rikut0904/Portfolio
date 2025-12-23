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

// GET: 全セクションとメタデータを取得
export async function GET() {
  try {
    // セクションメタデータとセクションデータを並列取得
    const [metaSnapshot, sectionsSnapshot] = await Promise.all([
      adminDb.collection("sectionMeta").orderBy("order", "asc").get(),
      adminDb.collection("sections").get()
    ]);

    // sectionsをMapに変換して高速アクセス
    const sectionsMap = new Map();
    sectionsSnapshot.docs.forEach((doc: any) => {
      sectionsMap.set(doc.id, doc.data());
    });

    // メタデータとセクションデータを結合
    const sectionsWithMeta = metaSnapshot.docs.map((metaDoc: any) => {
      const meta = metaDoc.data();
      const sectionData = sectionsMap.get(metaDoc.id) || {};

      return {
        id: metaDoc.id,
        meta,
        data: sectionData,
      };
    });

    return NextResponse.json({
      sections: sectionsWithMeta
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

// POST: 新しいセクションを追加（認証必要）
export async function POST(request: NextRequest) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, displayName, type, order, sortOrder, data } = await request.json();

    if (!id || !displayName || !type) {
      return NextResponse.json(
        { error: "id, displayName, and type are required" },
        { status: 400 }
      );
    }

    // 既存のセクションIDと重複していないかチェック
    const existingMeta = await adminDb.collection("sectionMeta").doc(id).get();
    if (existingMeta.exists) {
      return NextResponse.json(
        { error: "Section with this ID already exists" },
        { status: 409 }
      );
    }

    // orderが指定されていない場合のみ、最大のorder値を取得して+1
    let newOrder = order;
    if (typeof order !== "number") {
      const metaSnapshot = await adminDb
        .collection("sectionMeta")
        .orderBy("order", "desc")
        .limit(1)
        .get();

      const maxOrder = metaSnapshot.empty ? 0 : metaSnapshot.docs[0].data().order;
      newOrder = maxOrder + 1;
    }

    // メタデータを作成
    const metaData: any = {
      displayName,
      type,
      order: newOrder,
      editable: true,
    };

    // historyタイプの場合のみsortOrderを追加
    if (type === "history" && sortOrder) {
      metaData.sortOrder = sortOrder;
    }

    await adminDb.collection("sectionMeta").doc(id).set(metaData);

    // セクションデータを作成
    await adminDb.collection("sections").doc(id).set(data || {});

    await writeAdminLog({
      action: "create",
      entity: "section",
      entityId: id,
      user,
      details: {
        displayName,
        type,
        order: newOrder,
      },
    });

    return NextResponse.json({
      message: "Section created successfully",
      section: {
        id,
        meta: metaData,
        data: data || {},
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating section:", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

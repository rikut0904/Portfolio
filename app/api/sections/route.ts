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

// GET: 全セクションとメタデータを取得
export async function GET() {
  try {
    // セクションメタデータを取得
    const metaSnapshot = await adminDb
      .collection("sectionMeta")
      .orderBy("order", "asc")
      .get();

    const sectionsWithMeta = await Promise.all(
      metaSnapshot.docs.map(async (metaDoc: any) => {
        const meta = metaDoc.data();
        const sectionDoc = await adminDb.collection("sections").doc(metaDoc.id).get();
        const sectionData = sectionDoc.data();

        return {
          id: metaDoc.id,
          meta,
          data: sectionData || {},
        };
      })
    );

    return NextResponse.json({ sections: sectionsWithMeta });
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

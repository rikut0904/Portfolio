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

// GET: 作品を取得（フィルタリング、ソート、ページネーション対応）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // クエリパラメータの取得
    const category = searchParams.get("category");
    const technologies = searchParams.get("technologies")?.split(",").filter(Boolean);
    const status = searchParams.get("status");
    const deployStatus = searchParams.get("deployStatus");
    const createdYear = searchParams.get("createdYear");
    const createdMonth = searchParams.get("createdMonth");
    const sortBy = searchParams.get("sortBy") || "createdYear-asc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100"); // デフォルト100件

    // クエリの構築
    let query: any = adminDb.collection("products");

    // フィルタリング
    if (category) {
      query = query.where("category", "==", category);
    }
    if (status) {
      query = query.where("status", "==", status);
    }
    if (deployStatus) {
      query = query.where("deployStatus", "==", deployStatus);
    }
    if (createdYear) {
      query = query.where("createdYear", "==", parseInt(createdYear));
    }
    if (createdMonth) {
      query = query.where("createdMonth", "==", parseInt(createdMonth));
    }

    // ソート処理
    let sortField = "createdYear";
    let sortDirection: "asc" | "desc" = "asc";

    switch (sortBy) {
      case "createdYear-asc":
        sortField = "createdYear";
        sortDirection = "asc";
        break;
      case "createdYear-desc":
        sortField = "createdYear";
        sortDirection = "desc";
        break;
      case "title-asc":
        sortField = "title";
        sortDirection = "asc";
        break;
      case "title-desc":
        sortField = "title";
        sortDirection = "desc";
        break;
      case "createdAt-asc":
        sortField = "createdAt";
        sortDirection = "asc";
        break;
      case "createdAt-desc":
        sortField = "createdAt";
        sortDirection = "desc";
        break;
    }

    query = query.orderBy(sortField, sortDirection);

    // 作成月でのサブソート（年でソートする場合のみ）
    if (sortBy === "createdYear-asc" || sortBy === "createdYear-desc") {
      query = query.orderBy("createdMonth", sortDirection);
    }

    // データ取得
    const snapshot = await query.get();

    let products = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    // 技術フィルター（配列の場合はクライアント側でフィルタリング）
    if (technologies && technologies.length > 0) {
      products = products.filter((p: any) =>
        p.technologies?.some((tech: string) => technologies.includes(tech))
      );
    }

    // 総数を取得
    const total = products.length;

    // ページネーション
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = products.slice(startIndex, endIndex);

    return NextResponse.json({
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: endIndex < total,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
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
    const { title, description, image, link, category, technologies, status, deployStatus, createdYear, createdMonth } = data;

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
      category: category || "",
      technologies: technologies || [],
      status: status || "公開",
      deployStatus: deployStatus || "未公開",
      createdYear: createdYear || new Date().getFullYear(),
      createdMonth: createdMonth || (new Date().getMonth() + 1),
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

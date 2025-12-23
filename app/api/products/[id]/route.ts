import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase/admin";
import { writeAdminLog } from "../../../../lib/admin/logs";
import { checkAdminAuth } from "../../../../lib/auth/admin-auth";

// PUT: 作品を更新（認証必要）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const data = await request.json();
    const { title, description, image, link, githubUrl, category, technologies, status, deployStatus, createdYear, createdMonth } = data;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    await adminDb
      .collection("products")
      .doc(id)
      .update({
        title,
        description,
        image: image || "",
        link: link || "",
        githubUrl: githubUrl || "",
        category: category || "",
        technologies: technologies || [],
        status: status || "公開",
        deployStatus: deployStatus || "未公開",
        createdYear: createdYear || new Date().getFullYear(),
        createdMonth: createdMonth || (new Date().getMonth() + 1),
        updatedAt: new Date().toISOString(),
      });

    await writeAdminLog({
      action: "update",
      entity: "product",
      entityId: id,
      user,
      details: {
        title,
        status: status || "公開",
        deployStatus: deployStatus || "未公開",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE: 作品を削除（認証必要）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await adminDb.collection("products").doc(id).delete();

    await writeAdminLog({
      action: "delete",
      entity: "product",
      entityId: id,
      user,
      level: "warn",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

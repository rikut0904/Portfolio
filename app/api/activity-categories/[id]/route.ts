import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "../../../../lib/firebase/admin";

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

// DELETE: カテゴリを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await adminDb.collection("activityCategories").doc(id).delete();

    return NextResponse.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}

// PATCH: カテゴリの一部を更新（順番変更など）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const updates = await request.json();

    // カテゴリ名の変更の場合、関連する活動も更新する必要がある
    if (updates.name) {
      // トランザクションを使用して原子的に更新
      await adminDb.runTransaction(async (transaction) => {
        // カテゴリ情報を取得
        const categoryRef = adminDb.collection("activityCategories").doc(id);
        const categoryDoc = await transaction.get(categoryRef);

        if (!categoryDoc.exists) {
          throw new Error("Category not found");
        }

        const oldCategoryName = categoryDoc.data()?.name;

        // カテゴリを更新
        transaction.update(categoryRef, updates);

        // 古いカテゴリ名を持つすべての活動を検索
        const activitiesSnapshot = await adminDb
          .collection("activities")
          .where("category", "==", oldCategoryName)
          .get();

        // すべての活動のcategoryフィールドを新しいカテゴリ名に更新
        activitiesSnapshot.docs.forEach((doc) => {
          transaction.update(doc.ref, { category: updates.name });
        });
      });

      return NextResponse.json({
        message: "Category and related activities updated successfully",
      });
    } else {
      // カテゴリ名以外の更新（順番変更など）の場合は通常通り更新
      await adminDb.collection("activityCategories").doc(id).update(updates);

      return NextResponse.json({
        message: "Category updated successfully",
      });
    }
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

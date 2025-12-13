/**
 * 資格セクションのデータ形式を変換するスクリプト
 *
 * 古い形式:
 * {
 *   categories: ["情報", "電気"],
 *   items: [
 *     { category: "情報", name: "基本情報技術者試験" },
 *     { category: "電気", name: "第三種電気主任技術者試験" }
 *   ]
 * }
 *
 * 新しい形式:
 * {
 *   items: [
 *     {
 *       title: "情報",
 *       items: ["基本情報技術者試験"]
 *     },
 *     {
 *       title: "電気",
 *       items: ["第三種電気主任技術者試験"]
 *     }
 *   ]
 * }
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Firebase Admin SDKの初期化
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();

interface OldCertificationData {
  categories: string[];
  items: Array<{
    category: string;
    name: string;
  }>;
}

interface NewCertificationData {
  items: Array<{
    title: string;
    items: string[];
  }>;
}

async function migrateCertificationData() {
  try {
    console.log('🔍 資格セクションを検索中...');

    // sectionMetaとsectionsの両方のコレクションを取得
    const [metaSnapshot, sectionsSnapshot] = await Promise.all([
      db.collection('sectionMeta').get(),
      db.collection('sections').get()
    ]);

    // sectionsをMapに変換して高速アクセス
    const sectionsMap = new Map();
    sectionsSnapshot.docs.forEach(doc => {
      sectionsMap.set(doc.id, doc.data());
    });

    for (const metaDoc of metaSnapshot.docs) {
      const meta = metaDoc.data();
      const sectionId = metaDoc.id;
      const sectionData = sectionsMap.get(sectionId) || {};

      console.log(`\n📄 セクション: ${sectionId}`);
      console.log(`   表示名: ${meta.displayName}`);
      console.log(`   タイプ: ${meta.type}`);

      // categorizedタイプで、古い形式のデータ構造を持つセクションを探す
      if (meta.type === 'categorized' &&
          sectionData.categories &&
          sectionData.items &&
          Array.isArray(sectionData.categories) &&
          Array.isArray(sectionData.items) &&
          sectionData.items.length > 0 &&
          sectionData.items[0]?.category !== undefined) {

        console.log('   ✅ 古い形式のデータを検出しました');
        console.log('   📊 現在のデータ:');
        console.log(`      - カテゴリ数: ${sectionData.categories.length}`);
        console.log(`      - 項目数: ${sectionData.items.length}`);

        const oldData = sectionData as OldCertificationData;

        // 新しい形式に変換
        const newItems = oldData.categories.map(category => ({
          title: category,
          items: oldData.items
            .filter(item => item.category === category)
            .map(item => item.name)
        }));

        const newData: NewCertificationData = {
          items: newItems
        };

        console.log('   🔄 新しい形式に変換:');
        newItems.forEach((item, index) => {
          console.log(`      カテゴリ ${index + 1}: ${item.title} (${item.items.length}個の項目)`);
          item.items.forEach((certName, itemIndex) => {
            console.log(`        ${itemIndex + 1}. ${certName}`);
          });
        });

        // データを更新
        console.log('   💾 データを更新中...');
        await db.collection('sections').doc(sectionId).set(newData);

        console.log('   ✅ 更新完了！');
      } else {
        console.log('   ⏭️  変換不要（既に新しい形式またはcategorizedタイプではない）');
      }
    }

    console.log('\n🎉 移行が完了しました！');
    process.exit(0);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
migrateCertificationData();

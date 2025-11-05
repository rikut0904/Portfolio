"use client";

import React from "react";
import Image from "next/image";
import FadeInSection from "./FadeInSection";
import Accordion from "./Accordion";

interface Section {
  id: string;
  meta: {
    displayName: string;
    type: string;
    order: number;
    editable: boolean;
    sortOrder?: "asc" | "desc";
  };
  data: any;
}

interface DynamicSectionProps {
  section: Section;
}

export default function DynamicSection({ section }: DynamicSectionProps) {
  const { meta, data } = section;

  // 既存のFirebaseデータ構造（single, categorized, timeline）に対応
  // single: プロフィール
  const renderSingle = () => {
    const singleData = data?.data || {};
    return (
      <FadeInSection>
        <section id={section.id}>
          <h2>{meta.displayName}</h2>
          <div className="flex flex-col md:flex-row items-left gap-8 card">
            {singleData.profileImage && (
              <Image
                src={singleData.profileImage}
                alt="プロフィール写真"
                width={150}
                height={150}
                className="rounded-full object-cover"
              />
            )}
            <div>
              {singleData.name && <h3>名前：{singleData.name}</h3>}
              {singleData.hometown && <p>出身：{singleData.hometown}</p>}
              {singleData.hobbies && <p>趣味：{singleData.hobbies}</p>}
              {singleData.university && <p>{singleData.university}</p>}
            </div>
          </div>
        </section>
      </FadeInSection>
    );
  };

  // categorized: 専門領域、資格
  const renderCategorized = () => {
    // 専門領域タイプ（items配列）
    if (data?.items && Array.isArray(data.items) && data.items.length > 0 && data.items[0].title) {
      return (
        <FadeInSection>
          <section id={section.id}>
            <h2>{meta.displayName}</h2>
            <div className="grid-card">
              {data.items.map((item: any, index: number) => (
                <div key={index} className="card">
                  <h3>{item.title}</h3>
                  <ol>
                    {item.items?.map((subItem: string, subIndex: number) => (
                      <li key={subIndex}>{subItem}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        </FadeInSection>
      );
    }

    // 資格タイプ（categoriesとitems）
    if (data?.categories && data?.items) {
      return (
        <FadeInSection>
          <section id={section.id}>
            <h2>{meta.displayName}</h2>
            <div className="grid-card">
              {data.categories.map((category: string, index: number) => (
                <div key={index} className="card">
                  <h3>{category}</h3>
                  <ol>
                    {data.items
                      .filter((item: any) => item.category === category)
                      .map((item: any, itemIndex: number) => (
                        <li key={itemIndex}>{item.name}</li>
                      ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        </FadeInSection>
      );
    }

    return null;
  };


  // 新しい管理画面形式（list, history）に対応
  const renderList = () => {
    const lists = data?.lists || [];
    return (
      <FadeInSection>
        <section id={section.id}>
          <h2>{meta.displayName}</h2>
          <div className="grid-card">
            {lists.map((list: any, index: number) => (
              <div key={index} className="card">
                <h3>{list.title}</h3>
                <ol>
                  {list.items?.map((item: string, itemIndex: number) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      </FadeInSection>
    );
  };

  const renderHistory = () => {
    // データ構造が2種類ある:
    // 1. 新形式: { histories: [...] }
    // 2. 旧形式: { items: [...] } または { type: 'timeline', items: [...] }
    let histories = data?.histories || [];

    // 旧形式（items）の場合は変換
    if (histories.length === 0 && data?.items) {
      histories = data.items;
    }

    return (
      <FadeInSection>
        <section id={section.id}>
          <Accordion title={meta.displayName} defaultOpen={false}>
            <div className="flex flex-col gap-4">
              {histories.map((history: any, index: number) => (
                <div key={index} className="card" style={{ backgroundColor: 'white' }}>
                  <h3>{history.date}</h3>
                  <ul className="list-disc ml-5">
                    {history.details?.map((detail: string, detailIndex: number) => (
                      <li key={detailIndex}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Accordion>
        </section>
      </FadeInSection>
    );
  };

  // セクションタイプに応じてレンダリング
  switch (meta.type) {
    case "single":
      return renderSingle();
    case "categorized":
      return renderCategorized();
    case "list":
      return renderList();
    case "history":
      return renderHistory();
    default:
      return null;
  }
}

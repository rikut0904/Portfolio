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

  const renderLinkedText = (text: string, url?: string) =>
    !url ? (
      text
    ) : (
      <a
        href={url}
        className="text-blue-700 underline underline-offset-4 hover:text-blue-900"
        target={url.startsWith("http") ? "_blank" : undefined}
        rel={url.startsWith("http") ? "noreferrer" : undefined}
      >
        {text}
      </a>
    );

  // 既存のFirebaseデータ構造（single, categorized, timeline）に対応
  // single: プロフィール
  const renderSingle = () => {
    const nested =
      data?.data && typeof data.data === "object" ? data.data : null;
    const singleData = nested || data || {};
    return (
      <FadeInSection>
        <section id={section.id}>
          <h2>{meta.displayName}</h2>
          <div className="flex flex-col md:flex-row items-left gap-8 card">
            {(singleData.profileImage || singleData.imageUrl) && (
              <Image
                src={singleData.profileImage || singleData.imageUrl}
                alt="プロフィール写真"
                width={150}
                height={150}
                className="rounded-full object-cover"
              />
            )}
            <div>
              {singleData.name && <h3>名前：{singleData.name}</h3>}
              {(singleData.hometown || singleData.from) && (
                <p>出身：{singleData.hometown || singleData.from}</p>
              )}
              {singleData.hobbies && <p>趣味：{singleData.hobbies}</p>}
              {(singleData.university || singleData.affiliation) && (
                <p>{singleData.university || singleData.affiliation}</p>
              )}
            </div>
          </div>
        </section>
      </FadeInSection>
    );
  };

  // categorized: 専門領域、資格
  const renderCategorized = () => {
    // 専門領域タイプ（items配列）
    if (
      data?.items &&
      Array.isArray(data.items) &&
      data.items.length > 0 &&
      data.items[0].title
    ) {
      return (
        <FadeInSection>
          <section id={section.id}>
            <h2>{meta.displayName}</h2>
            <div className="grid-card">
              {data.items.map((item: any, index: number) => (
                <div key={index} className="card">
                  <h3>{item.title}</h3>
                  <ol>
                    {item.items?.map((subItem: any, subIndex: number) => (
                      <li key={subIndex}>
                        {typeof subItem === "string" ? subItem : subItem?.text || ""}
                      </li>
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
                  {list.items?.map((item: any, itemIndex: number) => (
                    <li key={itemIndex}>
                      {typeof item === "string" ? item : item?.text || ""}
                    </li>
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
                <div key={index} className="card">
                  <h3>{renderLinkedText(history.date, history.url)}</h3>
                  <ul className="list-disc ml-5">
                    {history.details?.map(
                      (detail: any, detailIndex: number) => (
                        <li key={detailIndex}>
                          {renderLinkedText(
                            typeof detail === "string" ? detail : detail?.text || "",
                            typeof detail === "string" ? "" : detail?.url || "",
                          )}
                        </li>
                      ),
                    )}
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

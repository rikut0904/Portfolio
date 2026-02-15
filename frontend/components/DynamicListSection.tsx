"use client";

import React, { useEffect, useState } from "react";
import FadeInSection from "./FadeInSection";

interface ListItem {
  title: string;
  items: string[];
}

interface DynamicListSectionProps {
  sectionId: string;
  defaultTitle: string;
  defaultData: ListItem[];
}

export default function DynamicListSection({
  sectionId,
  defaultTitle,
  defaultData,
}: DynamicListSectionProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [listData, setListData] = useState(defaultData);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/sections");
        const data = await response.json();
        const section = data.sections?.find((s: any) => s.id === sectionId);
        if (section && section.data.lists) {
          setListData(section.data.lists);
          if (section.meta.displayName) {
            setTitle(section.meta.displayName);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch ${sectionId}:`, error);
      }
    };
    fetchData();
  }, [sectionId]);

  return (
    <FadeInSection>
      <section id={sectionId}>
        <h2>{title}</h2>
        <div className="grid-card">
          {listData.map((list, index) => (
            <div key={index} className="card">
              <h3>{list.title}</h3>
              <ol>
                {list.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </FadeInSection>
  );
}

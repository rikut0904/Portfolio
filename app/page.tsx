"use client";

import React, { useEffect, useState } from "react";
import DynamicSection from "../components/DynamicSection";
import SiteLayout from "../components/layouts/SiteLayout";

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

export default function Home() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await fetch("/api/sections");
      const data = await response.json();
      setSections(data.sections || []);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    } finally {
      setLoading(false);
    }
  };

  // 連続する履歴系セクション（history）のグループを検出
  const findHistoryGroupStart = () => {
    let maxConsecutiveCount = 0;
    let maxGroupStartIndex = -1;
    let currentCount = 0;
    let currentGroupStart = -1;

    sections.forEach((section, index) => {
      const isHistoryType = section.meta.type === 'history';

      if (isHistoryType) {
        if (currentCount === 0) {
          currentGroupStart = index;
        }
        currentCount++;
      } else {
        if (currentCount > maxConsecutiveCount) {
          maxConsecutiveCount = currentCount;
          maxGroupStartIndex = currentGroupStart;
        }
        currentCount = 0;
        currentGroupStart = -1;
      }
    });

    // 最後のグループもチェック
    if (currentCount > maxConsecutiveCount) {
      maxGroupStartIndex = currentGroupStart;
    }

    return maxGroupStartIndex;
  };

  if (loading) {
    return (
      <SiteLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SiteLayout>
    );
  }

  const historyGroupStartIndex = findHistoryGroupStart();

  return (
    <SiteLayout>
      {/* 全セクションをFirebaseから動的に表示 */}
      {sections.map((section, index) => {
        // 最も長い連続する履歴系セクショングループの最初の前に「略歴」を表示
        const isFirstOfMainHistoryGroup = index === historyGroupStartIndex;

        return (
          <React.Fragment key={section.id}>
            {isFirstOfMainHistoryGroup && (
              <section>
                <h2>略歴</h2>
              </section>
            )}
            <DynamicSection section={section} />
          </React.Fragment>
        );
      })}
    </SiteLayout>
  );
}
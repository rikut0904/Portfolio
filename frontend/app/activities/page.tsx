"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import FadeInSection from "../../components/FadeInSection";
import SiteLayout from "../../components/layouts/SiteLayout";

interface Activity {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  category: string;
  status?: string;
  order: number;
}

interface Category {
  id: string;
  name: string;
  order: number;
}

export default function ActivityPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, activitiesRes] = await Promise.all([
          fetch("/api/activity-categories"),
          fetch("/api/activities"),
        ]);

        if (!categoriesRes.ok || !activitiesRes.ok) {
          throw new Error("課外活動データの取得に失敗しました");
        }

        const [categoriesData, activitiesData] = await Promise.all([
          categoriesRes.json(),
          activitiesRes.json(),
        ]);

        const publicActivities: Activity[] = (
          activitiesData.activities || []
        )
          .filter((activity: Activity) => activity.status === "公開")
          .sort((a: Activity, b: Activity) => a.order - b.order);

        const categoryMap = new Map<string, Category>();

        (categoriesData.categories || []).forEach((category: Category) => {
          const normalizedName = category.name?.trim();
          if (normalizedName) {
            categoryMap.set(normalizedName, {
              ...category,
              name: normalizedName,
            });
          }
        });

        publicActivities.forEach((activity) => {
          const normalizedCategory = activity.category?.trim() || "その他";
          activity.category = normalizedCategory;

          if (!categoryMap.has(normalizedCategory)) {
            categoryMap.set(normalizedCategory, {
              id: `activity-category-${normalizedCategory}`,
              name: normalizedCategory,
              order: Number.MAX_SAFE_INTEGER,
            });
          }
        });

        setCategories(
          Array.from(categoryMap.values()).sort(
            (a, b) => a.order - b.order || a.name.localeCompare(b.name, "ja"),
          ),
        );
        setActivities(publicActivities);
      } catch (error) {
        console.error("Failed to fetch activities:", error);
        setErrorMessage(
          "課外活動を読み込めませんでした。時間をおいて再度お試しください。",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <SiteLayout>
        <div className="loading-state" role="status" aria-label="読み込み中">
          <span className="loading-spinner" />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout className="activities-page">
      <section id="activity" className="page-section">
        <FadeInSection>
          <p className="section-kicker">Activities</p>
          <h1>課外活動</h1>
          <p className="page-lead">
            コミュニティ運営やイベント、学外での取り組みを紹介します。
          </p>
        </FadeInSection>

        {errorMessage ? (
          <div className="empty-state" role="alert">
            <h2>データを表示できませんでした</h2>
            <p>{errorMessage}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="empty-state">
            <h2>現在、公開中の活動はありません</h2>
            <p>新しい活動は準備ができ次第追加します。</p>
          </div>
        ) : (
          categories.map((category) => {
            const categoryActivities = activities.filter(
              (activity) => activity.category === category.name,
            );

            if (categoryActivities.length === 0) return null;

            return (
              <FadeInSection key={category.id}>
                <section className="activity-group">
                  <h2>{category.name}</h2>
                  <div className="activity-grid">
                    {categoryActivities.map((activity) => {
                      const isExternal = activity.link?.startsWith("http");

                      return (
                        <a
                          key={activity.id}
                          href={activity.link || undefined}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noreferrer" : undefined}
                          className="card activity-card"
                        >
                          {activity.image && (
                            <div className="activity-card__media">
                              <Image
                                src={activity.image}
                                alt=""
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="activity-card__body">
                            <h3>{activity.title}</h3>
                            {activity.description && (
                              <p>{activity.description}</p>
                            )}
                            {activity.link && (
                              <span className="activity-card__link">
                                詳しく見る <span aria-hidden="true">↗</span>
                              </span>
                            )}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </section>
              </FadeInSection>
            );
          })
        )}
      </section>
    </SiteLayout>
  );
}

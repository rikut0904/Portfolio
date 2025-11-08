"use client";

import React, { useState, useEffect } from "react";
import FadeInSection from "../../components/FadeInSection";
import Link from "next/link";
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 並列でデータ取得
      const [categoriesRes, activitiesRes] = await Promise.all([
        fetch("/api/activity-categories"),
        fetch("/api/activities"),
      ]);

      const [categoriesData, activitiesData] = await Promise.all([
        categoriesRes.json(),
        activitiesRes.json(),
      ]);

      const sortedCategories = (categoriesData.categories || []).sort(
        (a: Category, b: Category) => a.order - b.order
      );

      const publicActivities = (activitiesData.activities || [])
        .filter((a: Activity) => a.status === "公開")
        .sort((a: Activity, b: Activity) => a.order - b.order);

      setCategories(sortedCategories);
      setActivities(publicActivities);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SiteLayout>
        <section id="activity" className="py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section id="activity" className="py-8">
        <FadeInSection>
          <h1>課外活動</h1>
        </FadeInSection>
        {categories.map((category) => {
          const categoryActivities = activities.filter(
            (a) => a.category === category.name
          );

          if (categoryActivities.length === 0) return null;

          return (
            <FadeInSection key={category.id}>
              <h2>{category.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categoryActivities.map((activity) => (
                  <Link key={activity.id} href={activity.link || "#"}>
                    <div className="card">
                      <h3>{activity.title}</h3>
                      {activity.description && <p>{activity.description}</p>}
                      {activity.image && (
                        <img
                          src={activity.image}
                          alt={activity.title}
                          className="mt-2 rounded"
                        />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </FadeInSection>
          );
        })}
      </section>
    </SiteLayout>
  );
}
import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth/AuthContext";

export interface Activity {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  category: string;
  status?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export function useCategoryActivities(categoryId: string) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCategoryAndActivities = async () => {
    try {
      const [categoryResponse, activitiesResponse] = await Promise.all([
        fetch("/api/activity-categories"),
        fetch("/api/activities"),
      ]);

      const [categoryData, activitiesData] = await Promise.all([
        categoryResponse.json(),
        activitiesResponse.json(),
      ]);

      const foundCategory = categoryData.categories.find(
        (c: Category) => c.id === categoryId
      );

      if (!foundCategory) {
        setLoading(false);
        return;
      }

      setCategory(foundCategory);

      const filtered = (activitiesData.activities || [])
        .filter((a: Activity) => a.category === foundCategory.name)
        .sort((a: Activity, b: Activity) => a.order - b.order);

      setActivities(filtered);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryAndActivities();
  }, [categoryId]);

  const createActivity = async (formData: {
    title: string;
    description: string;
    image: string;
    link: string;
    status: string;
  }) => {
    if (!user || !category) return false;

    try {
      const token = await user.getIdToken();
      const maxOrder = Math.max(...activities.map((a) => a.order), 0);

      const response = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          category: category.name,
          order: maxOrder + 1,
        }),
      });

      if (response.ok) {
        await fetchCategoryAndActivities();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to create activity:", error);
      return false;
    }
  };

  const updateActivity = async (
    activityId: string,
    formData: {
      title: string;
      description: string;
      image: string;
      link: string;
      status: string;
    }
  ) => {
    if (!user) return false;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/activities/${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCategoryAndActivities();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update activity:", error);
      return false;
    }
  };

  const deleteActivity = async (activityId: string) => {
    if (!user) return false;

    const previousActivities = [...activities];
    setActivities((prevActivities) =>
      prevActivities.filter((a) => a.id !== activityId)
    );

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/activities/${activityId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setActivities(previousActivities);
        return false;
      }
      return true;
    } catch (error) {
      setActivities(previousActivities);
      console.error("Failed to delete activity:", error);
      return false;
    }
  };

  const moveActivity = async (activityId: string, direction: "up" | "down") => {
    if (!user) return false;

    const currentIndex = activities.findIndex((a) => a.id === activityId);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === activities.length - 1)
    ) {
      return false;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentActivity = activities[currentIndex];
    const targetActivity = activities[targetIndex];

    const newActivities = [...activities];
    const currentOrder = currentActivity.order;
    const targetOrder = targetActivity.order;

    newActivities[currentIndex] = { ...currentActivity, order: targetOrder };
    newActivities[targetIndex] = { ...targetActivity, order: currentOrder };

    [newActivities[currentIndex], newActivities[targetIndex]] = [
      newActivities[targetIndex],
      newActivities[currentIndex],
    ];

    setActivities(newActivities);

    try {
      const token = await user.getIdToken();
      await Promise.all([
        fetch(`/api/activities/${currentActivity.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: targetOrder }),
        }),
        fetch(`/api/activities/${targetActivity.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: currentOrder }),
        }),
      ]);
      return true;
    } catch (error) {
      console.error("Failed to move activity:", error);
      await fetchCategoryAndActivities();
      return false;
    }
  };

  const updateCategoryName = async (newName: string) => {
    if (!user || !category || !newName.trim()) return false;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/activity-categories/${category.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (response.ok) {
        await fetchCategoryAndActivities();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update category name:", error);
      return false;
    }
  };

  return {
    activities,
    category,
    loading,
    createActivity,
    updateActivity,
    deleteActivity,
    moveActivity,
    updateCategoryName,
    refetch: fetchCategoryAndActivities,
  };
}

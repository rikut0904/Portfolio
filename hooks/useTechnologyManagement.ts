import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth/AuthContext";

export function useTechnologyManagement() {
  const { user } = useAuth();
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [newTechName, setNewTechName] = useState("");
  const [isAddingTech, setIsAddingTech] = useState(false);

  useEffect(() => {
    fetchTechnologies();
  }, []);

  const fetchTechnologies = async () => {
    try {
      const response = await fetch("/api/technologies");
      const data = await response.json();
      setTechnologies(data.technologies.map((t: any) => t.name));
    } catch (error) {
      console.error("Failed to fetch technologies:", error);
    }
  };

  const handleAddTechnology = async () => {
    if (!newTechName.trim() || !user) return;

    const techName = newTechName.trim();
    setNewTechName("");
    setIsAddingTech(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/technologies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: techName }),
      });

      if (response.ok) {
        await fetchTechnologies();
        alert(`「${techName}」を追加しました`);
      } else {
        const error = await response.json();
        setNewTechName(techName);
        alert(error.error || "Failed to add technology");
      }
    } catch (error) {
      console.error("Error adding technology:", error);
      setNewTechName(techName);
      alert("Failed to add technology");
    } finally {
      setIsAddingTech(false);
    }
  };

  return {
    technologies,
    newTechName,
    setNewTechName,
    isAddingTech,
    handleAddTechnology,
  };
}

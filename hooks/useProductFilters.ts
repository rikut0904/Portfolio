import { useState } from "react";
import { Product } from "./useProductManagement";

export function useProductFilters(products: Product[]) {
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTechnologies, setFilterTechnologies] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDeployStatus, setFilterDeployStatus] = useState("");
  const [filterCreatedYear, setFilterCreatedYear] = useState("");
  const [filterCreatedMonth, setFilterCreatedMonth] = useState("");
  const [sortBy, setSortBy] = useState("createdYear-asc");

  const getFilteredAndSortedProducts = () => {
    if (!Array.isArray(products)) {
      return [];
    }

    let filtered = [...products];

    if (filterCategory) {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    if (filterTechnologies.length > 0) {
      filtered = filtered.filter(p =>
        p.technologies?.some(tech => filterTechnologies.includes(tech))
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (filterCreatedYear) {
      filtered = filtered.filter(p => p.createdYear?.toString() === filterCreatedYear);
    }

    if (filterCreatedMonth) {
      filtered = filtered.filter(p => p.createdMonth?.toString() === filterCreatedMonth);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "createdYear-asc": {
          const yearDiff = (a.createdYear || 0) - (b.createdYear || 0);
          if (yearDiff !== 0) return yearDiff;
          return (a.createdMonth || 0) - (b.createdMonth || 0);
        }
        case "createdYear-desc": {
          const yearDiff = (b.createdYear || 0) - (a.createdYear || 0);
          if (yearDiff !== 0) return yearDiff;
          return (b.createdMonth || 0) - (a.createdMonth || 0);
        }
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const clearFilters = () => {
    setFilterCategory("");
    setFilterTechnologies([]);
    setFilterStatus("");
    setFilterDeployStatus("");
    setFilterCreatedYear("");
    setFilterCreatedMonth("");
    setSortBy("createdYear-asc");
  };

  return {
    filterCategory,
    setFilterCategory,
    filterTechnologies,
    setFilterTechnologies,
    filterStatus,
    setFilterStatus,
    filterDeployStatus,
    setFilterDeployStatus,
    filterCreatedYear,
    setFilterCreatedYear,
    filterCreatedMonth,
    setFilterCreatedMonth,
    sortBy,
    setSortBy,
    getFilteredAndSortedProducts,
    clearFilters,
  };
}

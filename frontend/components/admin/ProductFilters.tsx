import React from "react";
import Accordion from "../Accordion";

interface ProductFiltersProps {
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  filterDeployStatus: string;
  setFilterDeployStatus: (value: string) => void;
  filterCreatedYear: string;
  setFilterCreatedYear: (value: string) => void;
  filterCreatedMonth: string;
  setFilterCreatedMonth: (value: string) => void;
  filterTechnologies: string[];
  setFilterTechnologies: (value: string[]) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  categories: string[];
  statuses: string[];
  deployStatuses: string[];
  technologies: string[];
  availableYears: (number | undefined)[];
  availableMonths: (number | undefined)[];
  onClearFilters: () => void;
}

export default function ProductFilters({
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  filterDeployStatus,
  setFilterDeployStatus,
  filterCreatedYear,
  setFilterCreatedYear,
  filterCreatedMonth,
  setFilterCreatedMonth,
  filterTechnologies,
  setFilterTechnologies,
  sortBy,
  setSortBy,
  categories,
  statuses,
  deployStatuses,
  technologies,
  availableYears,
  availableMonths,
  onClearFilters,
}: ProductFiltersProps) {
  return (
    <Accordion title="フィルター・ソート" defaultOpen={false}>
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* カテゴリフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリ
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">すべて</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 公開ステータスフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              公開ステータス
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">すべて</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* デプロイ状況フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              デプロイ状況
            </label>
            <select
              value={filterDeployStatus}
              onChange={(e) => setFilterDeployStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">すべて</option>
              {deployStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* 作成年フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作成年
            </label>
            <select
              value={filterCreatedYear}
              onChange={(e) => setFilterCreatedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">すべて</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
          </div>

          {/* 作成月フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作成月
            </label>
            <select
              value={filterCreatedMonth}
              onChange={(e) => setFilterCreatedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">すべて</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month}月
                </option>
              ))}
            </select>
          </div>

          {/* ソート */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              並び順
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="createdYear-asc">作成年月（古い順）</option>
              <option value="createdYear-desc">作成年月（新しい順）</option>
              <option value="title-asc">タイトル（あ→ん）</option>
              <option value="title-desc">タイトル（ん→あ）</option>
            </select>
          </div>

          {/* 使用技術フィルター */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              使用技術
            </label>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => (
                <button
                  key={tech}
                  onClick={() => {
                    if (filterTechnologies.includes(tech)) {
                      setFilterTechnologies(
                        filterTechnologies.filter((t) => t !== tech),
                      );
                    } else {
                      setFilterTechnologies([...filterTechnologies, tech]);
                    }
                  }}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filterTechnologies.includes(tech)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* フィルタークリアボタン */}
        <div className="mt-4">
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            フィルターをクリア
          </button>
        </div>
      </div>
    </Accordion>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import Link from "next/link";
import ProductForm from "../../../components/admin/ProductForm";
import ProductFilters from "../../../components/admin/ProductFilters";
import ProductListItem from "../../../components/admin/ProductListItem";
import StatusModal from "../../../components/admin/StatusModal";
import DeployStatusModal from "../../../components/admin/DeployStatusModal";
import Pagination from "../../../components/Pagination";
import {
  useProductManagement,
  Product,
} from "../../../hooks/useProductManagement";
import { useTechnologyManagement } from "../../../hooks/useTechnologyManagement";
import { useProductFilters } from "../../../hooks/useProductFilters";

const CATEGORIES = [
  "Webアプリケーション",
  "モバイルアプリ",
  "デスクトップアプリ",
  "ツール・システム",
  "ゲーム",
  "その他",
];

const STATUSES = ["公開", "非公開"];
const DEPLOY_STATUSES = ["公開中", "未公開"];

function ProductsContent() {
  const {
    products,
    loading,
    editingProduct,
    isAddingNew,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleCancel,
    handleAddNew,
    handleQuickStatusChange,
    handleQuickDeployStatusChange,
  } = useProductManagement();

  const {
    technologies,
    newTechName,
    setNewTechName,
    isAddingTech,
    handleAddTechnology,
  } = useTechnologyManagement();

  const {
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
  } = useProductFilters(products);

  const [statusModalProduct, setStatusModalProduct] = useState<Product | null>(
    null,
  );
  const [deployStatusModalProduct, setDeployStatusModalProduct] =
    useState<Product | null>(null);

  // ページネーション用のstate
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (isAddingNew || editingProduct)) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAddingNew, editingProduct, handleCancel]);

  const filteredProducts = getFilteredAndSortedProducts();
  const safeProducts = Array.isArray(products) ? products : [];
  const availableYears = Array.from(
    new Set(safeProducts.map((p) => p.createdYear).filter(Boolean)),
  ).sort((a, b) => b! - a!);
  const availableMonths = Array.from(
    new Set(safeProducts.map((p) => p.createdMonth).filter(Boolean)),
  ).sort((a, b) => a! - b!);

  // ページネーション計算
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // フィルター変更時にページを1に戻す
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [
    filterCategory,
    filterTechnologies,
    filterStatus,
    filterDeployStatus,
    filterCreatedYear,
    filterCreatedMonth,
    sortBy,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="py-2 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="w-full sm:w-auto">
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 text-sm sm:text-base"
            >
              ← ダッシュボード
            </Link>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
              作品管理
            </h1>
          </div>
          <button
            onClick={handleAddNew}
            className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md text-sm sm:text-base"
          >
            + 新しい作品を追加
          </button>
        </div>

        {(isAddingNew || editingProduct) && (
          <ProductForm
            editingProduct={editingProduct}
            formData={formData}
            setFormData={setFormData}
            technologies={technologies}
            newTechName={newTechName}
            setNewTechName={setNewTechName}
            isAddingTech={isAddingTech}
            handleAddTechnology={handleAddTechnology}
            handleSubmit={handleSubmit}
            onCancel={handleCancel}
            categories={CATEGORIES}
            statuses={STATUSES}
            deployStatuses={DEPLOY_STATUSES}
          />
        )}

        <ProductFilters
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterDeployStatus={filterDeployStatus}
          setFilterDeployStatus={setFilterDeployStatus}
          filterCreatedYear={filterCreatedYear}
          setFilterCreatedYear={setFilterCreatedYear}
          filterCreatedMonth={filterCreatedMonth}
          setFilterCreatedMonth={setFilterCreatedMonth}
          filterTechnologies={filterTechnologies}
          setFilterTechnologies={setFilterTechnologies}
          sortBy={sortBy}
          setSortBy={setSortBy}
          categories={CATEGORIES}
          statuses={STATUSES}
          deployStatuses={DEPLOY_STATUSES}
          technologies={technologies}
          availableYears={availableYears}
          availableMonths={availableMonths}
          onClearFilters={clearFilters}
        />

        <div className="bg-white rounded-lg shadow">
          <div className="px-3 py-3 sm:px-6 sm:py-4 border-b">
            <h2 className="text-base sm:text-xl font-semibold truncate">
              作品一覧（{filteredProducts.length}件 / 全{safeProducts.length}
              件）
            </h2>
          </div>
          <div className="divide-y">
            {currentProducts.map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusClick={setStatusModalProduct}
                onDeployStatusClick={setDeployStatusModalProduct}
              />
            ))}
          </div>

          {/* ページネーション */}
          {filteredProducts.length > itemsPerPage && (
            <div className="px-3 py-4 sm:px-6 sm:py-5 border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                variant="admin"
              />
            </div>
          )}
        </div>

        {statusModalProduct && (
          <StatusModal
            product={statusModalProduct}
            statuses={STATUSES}
            onStatusChange={(productId, newStatus) => {
              handleQuickStatusChange(productId, newStatus);
              setStatusModalProduct(null);
            }}
            onClose={() => setStatusModalProduct(null)}
          />
        )}

        {deployStatusModalProduct && (
          <DeployStatusModal
            product={deployStatusModalProduct}
            deployStatuses={DEPLOY_STATUSES}
            onDeployStatusChange={(productId, newDeployStatus) => {
              handleQuickDeployStatusChange(productId, newDeployStatus);
              setDeployStatusModalProduct(null);
            }}
            onClose={() => setDeployStatusModalProduct(null)}
          />
        )}
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}

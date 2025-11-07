import { useState, useEffect, useCallback } from "react";

export interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  category?: string;
  technologies?: string[];
  status?: string;
  deployStatus?: string;
  createdYear?: number;
  createdMonth?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFilters {
  category?: string;
  technologies?: string[];
  status?: string;
  deployStatus?: string;
  createdYear?: string;
  createdMonth?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function useProducts(filters: ProductFilters = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // クエリパラメータを構築
      const params = new URLSearchParams();

      if (filters.category) params.append("category", filters.category);
      if (filters.technologies && filters.technologies.length > 0) {
        params.append("technologies", filters.technologies.join(","));
      }
      if (filters.status) params.append("status", filters.status);
      if (filters.deployStatus) params.append("deployStatus", filters.deployStatus);
      if (filters.createdYear) params.append("createdYear", filters.createdYear);
      if (filters.createdMonth) params.append("createdMonth", filters.createdMonth);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();

      setProducts(data.products || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [
    filters.category,
    filters.technologies?.join(","),
    filters.status,
    filters.deployStatus,
    filters.createdYear,
    filters.createdMonth,
    filters.sortBy,
    filters.page,
    filters.limit,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 楽観的更新をサポート
  const updateProductOptimistic = useCallback((productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
  }, []);

  const deleteProductOptimistic = useCallback((productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const restoreProducts = useCallback((previousProducts: Product[]) => {
    setProducts(previousProducts);
  }, []);

  return {
    products,
    pagination,
    loading,
    refetch: fetchProducts,
    updateProductOptimistic,
    deleteProductOptimistic,
    restoreProducts,
    setProducts, // 直接更新用（楽観的更新のロールバックなどに使用）
  };
}

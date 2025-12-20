import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth/AuthContext";

export interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  link?: string;
  githubUrl?: string;
  category?: string;
  technologies?: string[];
  status?: string;
  deployStatus?: string;
  createdYear?: number;
  createdMonth?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFormData {
  title: string;
  description: string;
  image: string;
  link: string;
  githubUrl: string;
  category: string;
  technologies: string[];
  status: string;
  deployStatus: string;
  createdYear: number;
  createdMonth: number;
}

const getEmptyFormData = (): ProductFormData => ({
  title: "",
  description: "",
  image: "",
  link: "",
  githubUrl: "",
  category: "",
  technologies: [],
  status: "公開",
  deployStatus: "未公開",
  createdYear: new Date().getFullYear(),
  createdMonth: new Date().getMonth() + 1,
});

export function useProductManagement() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(getEmptyFormData());

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const dataToSave = {
        ...formData,
        image: formData.image.startsWith("/img/product/")
          ? formData.image
          : `/img/product/${formData.image}`
      };

      if (editingProduct) {
        const response = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dataToSave),
        });

        if (response.ok) {
          await fetchProducts();
          handleCancel();
        }
      } else {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dataToSave),
        });

        if (response.ok) {
          await fetchProducts();
          handleCancel();
        }
      }
    } catch (error) {
      console.error("Failed to save product:", error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      image: product.image,
      link: product.link || "",
      githubUrl: product.githubUrl || "",
      category: product.category || "",
      technologies: product.technologies || [],
      status: product.status || "公開",
      deployStatus: product.deployStatus || "未公開",
      createdYear: product.createdYear || new Date().getFullYear(),
      createdMonth: product.createdMonth || new Date().getMonth() + 1,
    });
    setIsAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    if (!user) return;

    const previousProducts = [...products];
    setProducts(prevProducts => prevProducts.filter(p => p.id !== id));

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setProducts(previousProducts);
        alert("削除に失敗しました");
      }
    } catch (error) {
      setProducts(previousProducts);
      console.error("Failed to delete product:", error);
      alert("削除に失敗しました");
    }
  };

  const handleCancel = () => {
    setEditingProduct(null);
    setIsAddingNew(false);
    setFormData(getEmptyFormData());
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingProduct(null);
    setFormData(getEmptyFormData());
  };

  const handleQuickStatusChange = async (productId: string, newStatus: string) => {
    if (!user) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const previousProducts = [...products];
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId ? { ...p, status: newStatus } : p
      )
    );

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...product,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        setProducts(previousProducts);
        alert("公開ステータスの更新に失敗しました");
      }
    } catch (error) {
      setProducts(previousProducts);
      console.error("Failed to update status:", error);
      alert("公開ステータスの更新に失敗しました");
    }
  };

  const handleQuickDeployStatusChange = async (productId: string, newDeployStatus: string) => {
    if (!user) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const previousProducts = [...products];
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId ? { ...p, deployStatus: newDeployStatus } : p
      )
    );

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...product,
          deployStatus: newDeployStatus,
        }),
      });

      if (!response.ok) {
        setProducts(previousProducts);
        alert("デプロイ状況の更新に失敗しました");
      }
    } catch (error) {
      setProducts(previousProducts);
      console.error("Failed to update deploy status:", error);
      alert("デプロイ状況の更新に失敗しました");
    }
  };

  return {
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
  };
}

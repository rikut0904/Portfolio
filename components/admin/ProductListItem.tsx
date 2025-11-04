import React from "react";

interface Product {
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
}

interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onStatusClick: (product: Product) => void;
  onDeployStatusClick: (product: Product) => void;
}

export default function ProductListItem({
  product,
  onEdit,
  onDelete,
  onStatusClick,
  onDeployStatusClick,
}: ProductListItemProps) {
  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{product.title}</h3>
          {/* 公開ステータスバッジ（クリック可能） */}
          <button
            onClick={() => onStatusClick(product)}
            className={`px-2 py-0.5 text-xs rounded-full hover:opacity-80 ${
              product.status === "公開"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
            title="クリックして公開ステータスを変更"
          >
            {product.status || "公開"}
          </button>
          {/* デプロイ状況バッジ（クリック可能） */}
          <button
            onClick={() => onDeployStatusClick(product)}
            className={`px-2 py-0.5 text-xs rounded-full hover:opacity-80 ${
              product.deployStatus === "公開中"
                ? "bg-blue-100 text-blue-700"
                : "bg-orange-100 text-orange-700"
            }`}
            title="クリックしてデプロイ状況を変更"
          >
            {product.deployStatus || "未公開"}
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-1">{product.description}</p>
        <div className="flex flex-col gap-1 text-xs text-gray-400 mt-1">
          {product.link && product.category === "Webアプリケーション" && (
            <a
              href={product.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              🔗 {product.title}
            </a>
          )}
          <div className="flex gap-3">
            {product.image && <span>画像: {product.image}</span>}
            {product.createdYear && product.createdMonth && (
              <span>
                作成: {product.createdYear}年{product.createdMonth}月
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 ml-4">
        <button
          onClick={() => onEdit(product)}
          className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
        >
          削除
        </button>
      </div>
    </div>
  );
}

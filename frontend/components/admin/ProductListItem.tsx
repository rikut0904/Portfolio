import React from "react";

interface Product {
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
    <div className="px-3 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 gap-3 sm:gap-0">
      <div className="flex-1 min-w-0 w-full sm:w-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
            {product.title}
          </h3>
          {/* 公開ステータスバッジ（クリック可能） */}
          <button
            onClick={() => onStatusClick(product)}
            className={`px-1.5 py-0.5 sm:px-2 text-xs rounded-full hover:opacity-80 flex-shrink-0 ${
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
            className={`px-1.5 py-0.5 sm:px-2 text-xs rounded-full hover:opacity-80 flex-shrink-0 ${
              product.deployStatus === "公開中"
                ? "bg-blue-100 text-blue-700"
                : "bg-orange-100 text-orange-700"
            }`}
            title="クリックしてデプロイ状況を変更"
          >
            {product.deployStatus || "未公開"}
          </button>
        </div>
        <p className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">
          {product.description}
        </p>
        <div className="flex flex-col gap-1 text-xs text-gray-500 mt-1">
          {(product.githubUrl || product.link) && (
            <div className="flex flex-wrap gap-2">
              {product.githubUrl && (
                <a
                  href={product.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50"
                >
                  <span>GitHub</span>
                </a>
              )}
              {product.link && (
                <a
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 font-medium text-purple-700 shadow-sm hover:bg-purple-100"
                >
                  <span>Webサイト</span>
                </a>
              )}
            </div>
          )}
          <div className="flex gap-2 sm:gap-3 flex-wrap text-[11px] text-gray-400">
            {product.image && (
              <span className="truncate max-w-[150px] sm:max-w-none">
                画像: {product.image}
              </span>
            )}
            {product.createdYear && product.createdMonth && (
              <span className="flex-shrink-0">
                作成: {product.createdYear}年{product.createdMonth}月
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 sm:gap-2 w-full sm:w-auto sm:ml-4">
        <button
          onClick={() => onEdit(product)}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base"
        >
          削除
        </button>
      </div>
    </div>
  );
}

import React from "react";

interface Product {
  id: string;
  title: string;
  status?: string;
}

interface StatusModalProps {
  product: Product;
  statuses: string[];
  onStatusChange: (id: string, status: string) => void;
  onClose: () => void;
}

export default function StatusModal({
  product,
  statuses,
  onStatusChange,
  onClose,
}: StatusModalProps) {
  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      ></div>

      {/* モーダルコンテナ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        {/* モーダルコンテンツ */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 pointer-events-auto">
          <h3 className="text-xl font-semibold mb-4 text-gray-900">
            公開ステータスを変更
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            作品: <span className="font-medium">{product.title}</span>
          </p>

          <p className="text-sm text-gray-700 mb-3">
            現在のステータス:{" "}
            <span className="font-semibold">{product.status || "公開"}</span>
          </p>

          <div className="space-y-2">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => onStatusChange(product.id, status)}
                className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                  product.status === status
                    ? status === "公開"
                      ? "border-green-500 bg-green-50 text-green-900 font-semibold"
                      : "border-gray-500 bg-gray-50 text-gray-900 font-semibold"
                    : status === "公開"
                    ? "border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

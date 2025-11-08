import React from "react";

interface Product {
  id: string;
  title: string;
  deployStatus?: string;
}

interface DeployStatusModalProps {
  product: Product;
  deployStatuses: string[];
  onDeployStatusChange: (id: string, status: string) => void;
  onClose: () => void;
}

export default function DeployStatusModal({
  product,
  deployStatuses,
  onDeployStatusChange,
  onClose,
}: DeployStatusModalProps) {
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
            デプロイ状況を変更
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            作品: <span className="font-medium">{product.title}</span>
          </p>

          <p className="text-sm text-gray-700 mb-3">
            現在のステータス:{" "}
            <span className="font-semibold">
              {product.deployStatus || "未公開"}
            </span>
          </p>

          <div className="space-y-2">
            {deployStatuses.map((status) => (
              <button
                key={status}
                onClick={() => onDeployStatusChange(product.id, status)}
                className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                  product.deployStatus === status
                    ? status === "公開中"
                      ? "border-blue-500 bg-blue-50 text-blue-900 font-semibold"
                      : "border-orange-500 bg-orange-50 text-orange-900 font-semibold"
                    : status === "公開中"
                    ? "border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700"
                    : "border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700"
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

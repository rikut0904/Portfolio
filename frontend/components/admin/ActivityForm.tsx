import React from "react";

interface ActivityFormProps {
  formData: {
    title: string;
    description: string;
    image: string;
    link: string;
    status: string;
  };
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
}

export default function ActivityForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isEditing,
}: ActivityFormProps) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
        {isEditing ? "活動を編集" : "新しい活動を追加"}
      </h2>
      <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            タイトル *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            説明 *
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            画像名
          </label>
          <input
            type="text"
            value={formData.image.replace(/^\/img\/activity\//, "")}
            onChange={(e) =>
              setFormData({ ...formData, image: e.target.value })
            }
            placeholder="example.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
          />
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            画像アップロードは「画像管理」から行えます（自動的に /img/activity/
            が付加されます）
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            リンク
          </label>
          <input
            type="text"
            value={formData.link}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            公開ステータス
          </label>
          <div className="flex gap-2">
            {["公開", "非公開"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFormData({ ...formData, status })}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md border-2 text-sm sm:text-base ${
                  formData.status === status
                    ? status === "公開"
                      ? "border-green-500 bg-green-50 text-green-700 font-semibold"
                      : "border-gray-500 bg-gray-50 text-gray-700 font-semibold"
                    : status === "公開"
                      ? "border-green-200 hover:border-green-300 text-green-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base"
          >
            {isEditing ? "更新" : "追加"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 sm:px-6 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm sm:text-base"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}

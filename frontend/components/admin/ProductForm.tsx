import React from "react";

interface FormData {
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

interface ProductFormProps {
  editingProduct: Product | null;
  formData: FormData;
  setFormData: (data: FormData) => void;
  technologies: string[];
  newTechName: string;
  setNewTechName: (name: string) => void;
  isAddingTech: boolean;
  handleAddTechnology: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  categories: string[];
  statuses: string[];
  deployStatuses: string[];
}

export default function ProductForm({
  editingProduct,
  formData,
  setFormData,
  technologies,
  newTechName,
  setNewTechName,
  isAddingTech,
  handleAddTechnology,
  handleSubmit,
  onCancel,
  categories,
  statuses,
  deployStatuses,
}: ProductFormProps) {
  return (
    <>
      {/* 背景オーバーレイ */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onCancel}></div>

      {/* モーダルコンテナ */}
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* モーダルコンテンツ */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl pointer-events-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="text-2xl font-semibold">
                {editingProduct ? "作品を編集" : "新しい作品を追加"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* タイトル */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    タイトル *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                {/* 説明 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    説明 *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                {/* 画像名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    画像名
                  </label>
                  <input
                    type="text"
                    value={formData.image.replace(/^\/img\/product\//, "")}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    placeholder="example.jpg"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    画像アップロードは「画像管理」から行えます（自動的に
                    /img/product/ が付加されます）
                  </p>
                </div>

                {/* カテゴリ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    カテゴリ
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">選択してください</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* プロダクトリンク */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    プロダクトリンク
                  </label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) =>
                      setFormData({ ...formData, link: e.target.value })
                    }
                    placeholder="https://example.com"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    公開 URL がある場合は入力してください（省略可）
                  </p>
                </div>

                {/* GitHubリンク */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    GitHubリンク
                  </label>
                  <input
                    type="url"
                    value={formData.githubUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, githubUrl: e.target.value })
                    }
                    placeholder="https://github.com/username/repository"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    リポジトリがある場合は入力してください（省略可）
                  </p>
                </div>

                {/* 使用技術 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    使用技術（複数選択可）
                  </label>

                  {/* 新しい技術を追加 */}
                  <div className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={newTechName}
                      onChange={(e) => setNewTechName(e.target.value)}
                      placeholder="新しい技術を追加"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTechnology();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTechnology}
                      disabled={isAddingTech}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                    >
                      {isAddingTech ? "追加中..." : "追加"}
                    </button>
                  </div>

                  {/* 技術選択 */}
                  <div className="flex flex-wrap gap-2">
                    {technologies.map((tech) => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => {
                          if (formData.technologies.includes(tech)) {
                            setFormData({
                              ...formData,
                              technologies: formData.technologies.filter(
                                (t) => t !== tech,
                              ),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              technologies: [...formData.technologies, tech],
                            });
                          }
                        }}
                        className={`px-3 py-1 text-sm rounded-full ${
                          formData.technologies.includes(tech)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 公開ステータス */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    公開ステータス
                  </label>
                  <div className="flex gap-2">
                    {statuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, status: status })
                        }
                        className={`px-4 py-2 rounded-md border-2 ${
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

                {/* デプロイ状況 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    デプロイ状況
                  </label>
                  <div className="flex gap-2">
                    {deployStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, deployStatus: status })
                        }
                        className={`px-4 py-2 rounded-md border-2 ${
                          formData.deployStatus === status
                            ? status === "公開中"
                              ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                              : "border-orange-500 bg-orange-50 text-orange-700 font-semibold"
                            : status === "公開中"
                              ? "border-blue-200 hover:border-blue-300 text-blue-700"
                              : "border-orange-200 hover:border-orange-300 text-orange-700"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 作成年月 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      作成年
                    </label>
                    <input
                      type="number"
                      value={formData.createdYear}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          createdYear: parseInt(e.target.value),
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      作成月
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.createdMonth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          createdMonth: parseInt(e.target.value),
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* ボタン */}
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  {editingProduct ? "更新" : "追加"}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

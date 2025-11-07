import React from "react";

interface CategorizedSectionFormProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function CategorizedSectionForm({ formData, setFormData }: CategorizedSectionFormProps) {
  if (!formData.items || !Array.isArray(formData.items) || formData.items.length === 0 || formData.items[0]?.title === undefined) {
    return (
      <div>
        <p className="text-gray-500">この形式のデータは現在GUI編集に対応していません。</p>
      </div>
    );
  }

  const lists = formData.items;

  const addList = () => {
    setFormData({
      ...formData,
      items: [...lists, { title: "", items: [""] }],
    });
  };

  const updateList = (index: number, field: "title" | "items", value: any) => {
    const newLists = [...lists];
    newLists[index] = { ...newLists[index], [field]: value };
    setFormData({ ...formData, items: newLists });
  };

  const removeList = (index: number) => {
    setFormData({
      ...formData,
      items: lists.filter((_: any, i: number) => i !== index),
    });
  };

  const addItem = (listIndex: number) => {
    const newLists = [...lists];
    newLists[listIndex].items.push("");
    setFormData({ ...formData, items: newLists });
  };

  const updateItem = (listIndex: number, itemIndex: number, value: string) => {
    const newLists = [...lists];
    newLists[listIndex].items[itemIndex] = value;
    setFormData({ ...formData, items: newLists });
  };

  const removeItem = (listIndex: number, itemIndex: number) => {
    const newLists = [...lists];
    newLists[listIndex].items = newLists[listIndex].items.filter(
      (_: string, i: number) => i !== itemIndex
    );
    setFormData({ ...formData, items: newLists });
  };

  const moveListUp = (index: number) => {
    if (index === 0) return;
    const newLists = [...lists];
    [newLists[index - 1], newLists[index]] = [newLists[index], newLists[index - 1]];
    setFormData({ ...formData, items: newLists });
  };

  const moveListDown = (index: number) => {
    if (index === lists.length - 1) return;
    const newLists = [...lists];
    [newLists[index], newLists[index + 1]] = [newLists[index + 1], newLists[index]];
    setFormData({ ...formData, items: newLists });
  };

  const moveItemUp = (listIndex: number, itemIndex: number) => {
    if (itemIndex === 0) return;
    const newLists = [...lists];
    const items = [...newLists[listIndex].items];
    [items[itemIndex - 1], items[itemIndex]] = [items[itemIndex], items[itemIndex - 1]];
    newLists[listIndex].items = items;
    setFormData({ ...formData, items: newLists });
  };

  const moveItemDown = (listIndex: number, itemIndex: number) => {
    const newLists = [...lists];
    if (itemIndex === newLists[listIndex].items.length - 1) return;
    const items = [...newLists[listIndex].items];
    [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
    newLists[listIndex].items = items;
    setFormData({ ...formData, items: newLists });
  };

  return (
    <div className="space-y-6">
      {lists.map((list: any, listIndex: number) => (
        <div key={listIndex} className="border border-gray-300 rounded-lg p-2 sm:p-4 bg-gray-50">
          <div className="flex items-start gap-1 sm:gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                <div className="flex flex-col gap-0.5 sm:gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveListUp(listIndex)}
                    disabled={listIndex === 0}
                    className="p-0.5 sm:p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="上に移動"
                  >
                    <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveListDown(listIndex)}
                    disabled={listIndex === lists.length - 1}
                    className="p-0.5 sm:p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="下に移動"
                  >
                    <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <h3 className="text-xs sm:text-base font-medium whitespace-nowrap">カテゴリ</h3>
                <button
                  type="button"
                  onClick={() => removeList(listIndex)}
                  className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs sm:text-sm flex-shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="mb-2 sm:mb-3">
                <input
                  type="text"
                  value={list.title || ""}
                  onChange={(e) => updateList(listIndex, "title", e.target.value)}
                  placeholder="カテゴリ名"
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-base"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-xs sm:text-base font-medium">項目</h3>
                {list.items?.map((item: string, itemIndex: number) => (
                  <div key={itemIndex} className="flex items-center gap-1">
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItemUp(listIndex, itemIndex)}
                        disabled={itemIndex === 0}
                        className="p-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上に移動"
                      >
                        <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItemDown(listIndex, itemIndex)}
                        disabled={itemIndex === list.items.length - 1}
                        className="p-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下に移動"
                      >
                        <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateItem(listIndex, itemIndex, e.target.value)}
                      placeholder="項目"
                      className="flex-1 min-w-0 px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-base"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(listIndex, itemIndex)}
                      className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs sm:text-sm flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addItem(listIndex)}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs sm:text-base"
                >
                  + 項目を追加
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addList}
        className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base"
      >
        + カテゴリを追加
      </button>
    </div>
  );
}

import React from "react";

interface ListItem {
  title?: string;
  items: string[];
}

interface ListSectionFormProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function ListSectionForm({
  formData,
  setFormData,
}: ListSectionFormProps) {
  const lists = formData.lists || [];

  const addList = () => {
    setFormData({
      ...formData,
      lists: [...lists, { title: "", items: [""] }],
    });
  };

  const updateList = (index: number, field: "title" | "items", value: any) => {
    const newLists = [...lists];
    newLists[index] = { ...newLists[index], [field]: value };
    setFormData({ ...formData, lists: newLists });
  };

  const removeList = (index: number) => {
    setFormData({
      ...formData,
      lists: lists.filter((_: any, i: number) => i !== index),
    });
  };

  const addItem = (listIndex: number) => {
    const newLists = [...lists];
    newLists[listIndex].items.push("");
    setFormData({ ...formData, lists: newLists });
  };

  const updateItem = (listIndex: number, itemIndex: number, value: string) => {
    const newLists = [...lists];
    newLists[listIndex].items[itemIndex] = value;
    setFormData({ ...formData, lists: newLists });
  };

  const removeItem = (listIndex: number, itemIndex: number) => {
    const newLists = [...lists];
    newLists[listIndex].items = newLists[listIndex].items.filter(
      (_: string, i: number) => i !== itemIndex,
    );
    setFormData({ ...formData, lists: newLists });
  };

  return (
    <div className="space-y-6">
      {lists.map((list: ListItem, listIndex: number) => (
        <div
          key={listIndex}
          className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50"
        >
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={list.title || ""}
              onChange={(e) => updateList(listIndex, "title", e.target.value)}
              placeholder="カテゴリ名（例：情報、電気）"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
            />
            <button
              type="button"
              onClick={() => removeList(listIndex)}
              className="px-2 py-2 sm:px-3 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 flex-shrink-0 text-base sm:text-lg font-bold"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            {list.items.map((item: string, itemIndex: number) => (
              <div key={itemIndex} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) =>
                    updateItem(listIndex, itemIndex, e.target.value)
                  }
                  placeholder="項目を入力"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => removeItem(listIndex, itemIndex)}
                  className="px-2 py-1 sm:px-3 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex-shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addItem(listIndex)}
              className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm sm:text-base"
            >
              + 項目を追加
            </button>
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

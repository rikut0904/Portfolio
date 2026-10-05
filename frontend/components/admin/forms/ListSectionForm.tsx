import React from "react";

interface ListItem {
  title?: string;
  items?: Array<string | { text?: string }>;
}

interface ListSectionFormProps {
  formData: { items?: ListItem[] };
  setFormData: (data: { items?: ListItem[] }) => void;
}

const normalizeItems = (
  items: Array<string | { text?: string }> = [],
): string[] =>
  items.map((item) => (typeof item === "string" ? item : item?.text || ""));

const normalizeList = (list: ListItem) => ({
  title: list?.title || "",
  items: normalizeItems(list?.items || []),
});

type NormalizedListItem = ReturnType<typeof normalizeList>;

export default function ListSectionForm({
  formData,
  setFormData,
}: ListSectionFormProps) {
  const lists = Array.isArray(formData.items) ? formData.items : [];

  const commitLists = (
    nextLists: Array<{ title: string; items: string[] }>,
  ) => {
    setFormData({
      ...formData,
      items: nextLists.map((list) => ({
        title: list.title,
        items: list.items,
      })),
    });
  };

  const addList = () => {
    commitLists([...lists.map(normalizeList), { title: "", items: [""] }]);
  };

  const updateList = (
    index: number,
    field: "title" | "items",
    value: string | string[],
  ) => {
    const nextLists = lists.map(normalizeList);
    nextLists[index] = { ...nextLists[index], [field]: value };
    commitLists(nextLists);
  };

  const removeList = (index: number) => {
    commitLists(
      lists
        .map(normalizeList)
        .filter((_: NormalizedListItem, i: number) => i !== index),
    );
  };

  const addItem = (listIndex: number) => {
    const nextLists = lists.map(normalizeList);
    nextLists[listIndex] = {
      ...nextLists[listIndex],
      items: [...nextLists[listIndex].items, ""],
    };
    commitLists(nextLists);
  };

  const updateItem = (listIndex: number, itemIndex: number, value: string) => {
    const nextLists = lists.map(normalizeList);
    const nextItems = [...nextLists[listIndex].items];
    nextItems[itemIndex] = value;
    updateList(listIndex, "items", nextItems);
  };

  const removeItem = (listIndex: number, itemIndex: number) => {
    const nextLists = lists.map(normalizeList);
    nextLists[listIndex] = {
      ...nextLists[listIndex],
      items: nextLists[listIndex].items.filter(
        (_: string, i: number) => i !== itemIndex,
      ),
    };
    commitLists(nextLists);
  };

  return (
    <div className="space-y-6">
      {lists.map((rawList: ListItem, listIndex: number) => {
        const list = normalizeList(rawList);
        return (
          <div
            key={listIndex}
            className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50"
          >
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={list.title}
                  onChange={(e) =>
                    updateList(listIndex, "title", e.target.value)
                  }
                  placeholder="カテゴリ名（例：情報、電気）"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => removeList(listIndex)}
                  className="admin-button admin-button--danger admin-button--compact admin-button--icon"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {list.items.map((item, itemIndex: number) => (
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
                    className="admin-button admin-button--danger admin-button--compact admin-button--icon"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addItem(listIndex)}
                className="admin-button admin-button--secondary w-full"
              >
                + 項目を追加
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={addList}
        className="admin-button admin-button--primary w-full"
      >
        + カテゴリを追加
      </button>
    </div>
  );
}

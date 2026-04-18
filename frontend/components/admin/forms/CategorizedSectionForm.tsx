import React from "react";

interface LinkableText {
  text?: string;
}

interface LinkableCategory {
  title?: string;
  items?: Array<string | LinkableText>;
}

interface FlatCategorizedItem {
  category?: string;
  name?: string;
}

interface CategorizedFormData {
  items?: LinkableCategory[] | FlatCategorizedItem[];
  categories?: string[];
}

interface CategorizedSectionFormProps {
  formData: CategorizedFormData;
  setFormData: (data: CategorizedFormData) => void;
}

const normalizeEntry = (entry: string | LinkableText) =>
  typeof entry === "string" ? { text: entry } : { text: entry?.text || "" };

const normalizeGroupedLists = (lists: LinkableCategory[]): LinkableCategory[] =>
  lists.map((list) => ({
    title: list?.title || "",
    items: Array.isArray(list?.items) ? list.items.map(normalizeEntry) : [],
  }));

const normalizeFlatLists = (
  formData: CategorizedFormData,
): LinkableCategory[] => {
  if (!Array.isArray(formData.categories)) {
    return [];
  }
  return formData.categories.map((category: string) => {
    const relatedItems = Array.isArray(formData.items)
      ? (formData.items as FlatCategorizedItem[]).filter(
          (item) => item?.category === category,
        )
      : [];
    return {
      title: category,
      items: relatedItems.map((item) => ({
        text: item?.name || "",
      })),
    };
  });
};

const isLinkableCategory = (
  item: LinkableCategory | FlatCategorizedItem,
): item is LinkableCategory => "title" in item;

export default function CategorizedSectionForm({
  formData,
  setFormData,
}: CategorizedSectionFormProps) {
  const usesGroupedItems =
    Array.isArray(formData.items) &&
    (formData.items.length === 0 || isLinkableCategory(formData.items[0]));

  const lists = usesGroupedItems
    ? normalizeGroupedLists(
        Array.isArray(formData.items)
          ? (formData.items as LinkableCategory[])
          : [],
      )
    : normalizeFlatLists(formData);

  const commitLists = (nextLists: LinkableCategory[]) => {
    if (usesGroupedItems) {
      setFormData({
        ...formData,
        items: nextLists.map((list) => ({
          title: list.title || "",
          items: (list.items || []).map(normalizeEntry),
        })),
      });
      return;
    }

    setFormData({
      ...formData,
      categories: nextLists.map((list) => list.title || ""),
      items: nextLists.flatMap((list) =>
        (list.items || []).map((item) => {
          const normalized = normalizeEntry(item);
          return {
            category: list.title || "",
            name: normalized.text,
          };
        }),
      ),
    });
  };

  const addList = () => {
    commitLists([...lists, { title: "", items: [{ text: "" }] }]);
  };

  const updateList = (
    index: number,
    field: "title" | "items",
    value: string | LinkableText[],
  ) => {
    const nextLists = [...lists];
    nextLists[index] = { ...nextLists[index], [field]: value };
    commitLists(nextLists);
  };

  const removeList = (index: number) => {
    commitLists(lists.filter((_: LinkableCategory, i: number) => i !== index));
  };

  const addItem = (listIndex: number) => {
    const nextLists = [...lists];
    nextLists[listIndex] = {
      ...nextLists[listIndex],
      items: [...(nextLists[listIndex].items || []), { text: "" }],
    };
    commitLists(nextLists);
  };

  const updateItem = (listIndex: number, itemIndex: number, value: string) => {
    const nextLists = [...lists];
    const nextItems = [...(nextLists[listIndex].items || [])].map(
      normalizeEntry,
    );
    nextItems[itemIndex] = { ...nextItems[itemIndex], text: value };
    updateList(listIndex, "items", nextItems);
  };

  const removeItem = (listIndex: number, itemIndex: number) => {
    const nextLists = [...lists];
    nextLists[listIndex] = {
      ...nextLists[listIndex],
      items: (nextLists[listIndex].items || []).filter(
        (_: string | LinkableText, i: number) => i !== itemIndex,
      ),
    };
    commitLists(nextLists);
  };

  const moveListUp = (index: number) => {
    if (index === 0) return;
    const nextLists = [...lists];
    [nextLists[index - 1], nextLists[index]] = [
      nextLists[index],
      nextLists[index - 1],
    ];
    commitLists(nextLists);
  };

  const moveListDown = (index: number) => {
    if (index === lists.length - 1) return;
    const nextLists = [...lists];
    [nextLists[index], nextLists[index + 1]] = [
      nextLists[index + 1],
      nextLists[index],
    ];
    commitLists(nextLists);
  };

  const moveItemUp = (listIndex: number, itemIndex: number) => {
    if (itemIndex === 0) return;
    const nextLists = [...lists];
    const nextItems = [...(nextLists[listIndex].items || [])].map(
      normalizeEntry,
    );
    [nextItems[itemIndex - 1], nextItems[itemIndex]] = [
      nextItems[itemIndex],
      nextItems[itemIndex - 1],
    ];
    nextLists[listIndex] = { ...nextLists[listIndex], items: nextItems };
    commitLists(nextLists);
  };

  const moveItemDown = (listIndex: number, itemIndex: number) => {
    const nextLists = [...lists];
    const nextItems = [...(nextLists[listIndex].items || [])].map(
      normalizeEntry,
    );
    if (itemIndex === nextItems.length - 1) return;
    [nextItems[itemIndex], nextItems[itemIndex + 1]] = [
      nextItems[itemIndex + 1],
      nextItems[itemIndex],
    ];
    nextLists[listIndex] = { ...nextLists[listIndex], items: nextItems };
    commitLists(nextLists);
  };

  return (
    <div className="space-y-6">
      {lists.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          まだカテゴリがありません。下のボタンから追加できます。
        </div>
      )}
      {lists.map((list, listIndex: number) => (
        <div
          key={listIndex}
          className="border border-gray-300 rounded-lg p-2 sm:p-4 bg-gray-50"
        >
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
                    <svg
                      className="w-2.5 h-2.5 sm:w-4 sm:h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveListDown(listIndex)}
                    disabled={listIndex === lists.length - 1}
                    className="p-0.5 sm:p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="下に移動"
                  >
                    <svg
                      className="w-2.5 h-2.5 sm:w-4 sm:h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>

                <h3 className="text-xs sm:text-base font-medium whitespace-nowrap">
                  カテゴリ
                </h3>
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
                  onChange={(e) =>
                    updateList(listIndex, "title", e.target.value)
                  }
                  placeholder="カテゴリ名"
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-base"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-xs sm:text-base font-medium">項目</h3>
                {(list.items || []).map((rawItem, itemIndex: number) => {
                  const item = normalizeEntry(rawItem);
                  return (
                    <div
                      key={itemIndex}
                      className="rounded-md border border-gray-200 bg-white p-2"
                    >
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => moveItemUp(listIndex, itemIndex)}
                            disabled={itemIndex === 0}
                            className="p-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="上に移動"
                          >
                            <svg
                              className="w-2 h-2 sm:w-3 sm:h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItemDown(listIndex, itemIndex)}
                            disabled={
                              itemIndex === (list.items || []).length - 1
                            }
                            className="p-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="下に移動"
                          >
                            <svg
                              className="w-2 h-2 sm:w-3 sm:h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item.text || ""}
                          onChange={(e) =>
                            updateItem(listIndex, itemIndex, e.target.value)
                          }
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
                    </div>
                  );
                })}
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

import React from "react";
import { Activity } from "../../hooks/useCategoryActivities";

interface ActivityListProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onMoveUp: (activity: Activity) => void;
  onMoveDown: (activity: Activity) => void;
}

export default function ActivityList({
  activities,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow text-center text-gray-500">
        <p className="text-sm sm:text-base">まだ活動が登録されていません。</p>
        <p className="text-xs sm:text-sm mt-2">
          「新規追加」ボタンから活動を追加してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {activities.map((activity, index) => (
        <div
          key={activity.id}
          className="bg-white p-3 sm:p-6 rounded-lg shadow"
        >
          <div className="flex items-start gap-2 sm:gap-4">
            {/* 順番変更ボタン */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                onClick={() => onMoveUp(activity)}
                disabled={index === 0}
                className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                title="上に移動"
              >
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4"
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
                onClick={() => onMoveDown(activity)}
                disabled={index === activities.length - 1}
                className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                title="下に移動"
              >
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4"
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

            {/* 活動情報 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {activity.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                {activity.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {activity.status === "公開" ? (
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    公開
                  </span>
                ) : (
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                    非公開
                  </span>
                )}
              </div>
            </div>

            {/* 編集・削除ボタン */}
            <div className="flex flex-col gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => onEdit(activity)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base whitespace-nowrap"
              >
                編集
              </button>
              <button
                onClick={() => onDelete(activity)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base whitespace-nowrap"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

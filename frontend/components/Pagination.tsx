import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  variant?: "admin" | "public";
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
  variant = "admin",
}: PaginationProps) {
  // ページ番号の配列を生成（省略表示対応）
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // 表示する最大ページ数

    if (totalPages <= maxVisible + 2) {
      // ページ数が少ない場合はすべて表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // ページ数が多い場合は省略表示
      if (currentPage <= 3) {
        // 現在のページが先頭付近
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // 現在のページが末尾付近
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 現在のページが中間
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  // バリアント別のスタイル
  const buttonStyles = {
    admin: {
      base: "px-2 py-1 sm:px-3 sm:py-2 text-sm border rounded-md transition-all duration-200",
      active: "bg-blue-600 text-white border-blue-600",
      inactive: "border-gray-300 hover:bg-gray-100 hover:border-gray-400",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
    public: {
      base: "px-3 py-2 text-sm border rounded-lg transition-all duration-200 font-medium shadow-sm",
      active:
        "bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md",
      inactive:
        "border-[var(--card-border)] bg-[var(--card-background)] hover:bg-[var(--primary-light)] hover:border-[var(--primary-color)] hover:shadow-md",
      disabled:
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--card-background)] disabled:hover:border-[var(--card-border)] disabled:hover:shadow-sm",
    },
  };

  const styles = buttonStyles[variant];

  return (
    <div
      className={`flex justify-center items-center gap-1 sm:gap-2 ${className}`}
    >
      {/* 前へボタン */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${styles.base} ${styles.disabled} ${styles.inactive}`}
        aria-label="前のページ"
      >
        <span className="hidden sm:inline">前へ</span>
        <span className="sm:hidden">‹</span>
      </button>

      {/* ページ番号 */}
      <div className="flex gap-1 sm:gap-2">
        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className={`px-2 py-1 sm:px-3 sm:py-2 text-sm flex items-center ${
                  variant === "public"
                    ? "text-[var(--text-body)]"
                    : "text-gray-500"
                }`}
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`${styles.base} ${
                currentPage === pageNum ? styles.active : styles.inactive
              }`}
              aria-label={`ページ ${pageNum}`}
              aria-current={currentPage === pageNum ? "page" : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* 次へボタン */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${styles.base} ${styles.disabled} ${styles.inactive}`}
        aria-label="次のページ"
      >
        <span className="hidden sm:inline">次へ</span>
        <span className="sm:hidden">›</span>
      </button>
    </div>
  );
}

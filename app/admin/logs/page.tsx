"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import Link from "next/link";

type AdminLog = {
  id: string;
  action?: string;
  entity?: string;
  entityId?: string;
  level?: "info" | "warn" | "error";
  userEmail?: string;
  createdAt?: string;
  details?: Record<string, unknown>;
};

function LogsContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const itemsPerPage = 10;

  const fetchLogs = async (cursor: string | null) => {
    try {
      if (!user) return;
      const token = await user.getIdToken();
      const params = new URLSearchParams({ limit: String(itemsPerPage) });
      if (cursor) {
        params.set("cursor", cursor);
      }
      const response = await fetch(`/api/admin-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }
      const data = await response.json();
      setLogs(data.logs || []);
      setNextCursor(data.nextCursor || null);
      setCurrentCursor(cursor);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setCursorHistory([]);
    setCurrentCursor(null);
    setNextCursor(null);
    fetchLogs(null);
  }, [user]);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const levelBadge = (level?: AdminLog["level"]) => {
    switch (level) {
      case "warn":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
      case "error":
        return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
        <div className="mb-3 sm:mb-6">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs sm:text-sm"
          >
            ← ダッシュボード
          </Link>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 sm:mt-2">
            ログ一覧
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
            <div className="px-3 py-3 sm:px-6 sm:py-4 border-b dark:border-gray-800">
              <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100">操作ログ</h2>
            </div>
            <div className="divide-y">
              {logs.length === 0 ? (
                <div className="px-3 py-6 sm:px-6 text-sm text-gray-600 dark:text-gray-300">
                  ログはありません。
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="px-3 py-3 sm:px-6 sm:py-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {formatDate(log.createdAt)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${levelBadge(log.level)}`}>
                        {log.level || "info"}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {log.action || "-"}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">{log.entity || "-"}</span>
                      {log.entityId && (
                        <span className="text-gray-500 dark:text-gray-400">#{log.entityId}</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium text-gray-700 dark:text-gray-200">ユーザー:</span>{" "}
                      {log.userEmail || "-"}
                    </div>
                    {log.details && (
                      <pre className="mt-2 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
            {(cursorHistory.length > 0 || nextCursor) && (
              <div className="px-3 py-3 sm:px-6 sm:py-4 border-t dark:border-gray-800 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {cursorHistory.length + 1} ページ
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const previousCursor = cursorHistory[cursorHistory.length - 1] ?? null;
                      setCursorHistory((prev) => prev.slice(0, -1));
                      setLoading(true);
                      fetchLogs(previousCursor);
                    }}
                    disabled={cursorHistory.length === 0}
                    className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    前へ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!nextCursor) return;
                      setCursorHistory((prev) => [...prev, currentCursor]);
                      setLoading(true);
                      fetchLogs(nextCursor);
                    }}
                    disabled={!nextCursor}
                    className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function LogsPage() {
  return (
    <ProtectedRoute>
      <LogsContent />
    </ProtectedRoute>
  );
}

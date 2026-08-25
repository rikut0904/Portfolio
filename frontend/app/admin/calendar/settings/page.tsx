"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../../lib/auth/AuthContext";
import {
  type CalendarColorMap,
  type CalendarLabelMap,
  type CalendarPreferencesResponse,
  getCalendarColor,
  getCalendarColorStyle,
} from "../../../../lib/calendar";

function CalendarSettingsContent() {
  const { user } = useAuth();
  const [data, setData] = useState<CalendarPreferencesResponse | null>(null);
  const [colors, setColors] = useState<CalendarColorMap>({});
  const [labels, setLabels] = useState<CalendarLabelMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPreferences = async () => {
      setLoading(true);
      setError("");
      try {
        const token = user ? await user.getAuthHeader() : "";
        const res = await fetch("/api/admin/calendar/preferences", {
          headers: token ? { Authorization: token } : {},
        });
        const body = (await res.json().catch(() => ({}))) as
          CalendarPreferencesResponse | { error?: string };
        if (!res.ok) {
          throw new Error(
            body && "error" in body
              ? body.error || "取得に失敗しました"
              : "取得に失敗しました",
          );
        }
        const preferences = body as CalendarPreferencesResponse;
        setData(preferences);
        setColors(preferences.calendarColors || {});
        setLabels(preferences.calendarLabels || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    void fetchPreferences();
  }, [user]);

  const hasChanges = useMemo(() => {
    if (!data) {
      return false;
    }
    return data.calendarIds.some(
      (calendarId) =>
        (colors[calendarId] || "") !==
          (data.calendarColors[calendarId] || "") ||
        (labels[calendarId] || "") !== (data.calendarLabels[calendarId] || ""),
    );
  }, [colors, data, labels]);

  const savePreferences = async () => {
    if (!user || !data) {
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const token = await user.getAuthHeader();
      const payloadColors: CalendarColorMap = {};
      const payloadLabels: CalendarLabelMap = {};
      for (const calendarId of data.calendarIds) {
        payloadColors[calendarId] = getCalendarColor(colors[calendarId]);
        payloadLabels[calendarId] = (labels[calendarId] || "").trim();
      }
      const res = await fetch("/api/admin/calendar/preferences", {
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ colors: payloadColors, labels: payloadLabels }),
      });
      const body = (await res.json().catch(() => ({}))) as
        CalendarPreferencesResponse | { error?: string };
      if (!res.ok) {
        throw new Error(
          body && "error" in body
            ? body.error || "保存に失敗しました"
            : "保存に失敗しました",
        );
      }
      const preferences = body as CalendarPreferencesResponse;
      setData(preferences);
      setColors(preferences.calendarColors || {});
      setLabels(preferences.calendarLabels || {});
      setMessage("設定を保存しました。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="mx-auto max-w-5xl px-2 py-4 sm:px-4 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/admin/calendar"
            className="inline-block text-sm text-blue-800 hover:text-gray-900"
          >
            ← 予定管理へ戻る
          </Link>
          <button
            type="button"
            onClick={() => void savePreferences()}
            disabled={saving || !hasChanges}
            className="rounded-full bg-[var(--primary-color)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "保存中..." : "設定を保存"}
          </button>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,235,255,0.92))] shadow-[0_20px_60px_rgba(107,70,193,0.12)]">
          <div className="border-b border-[var(--card-border)] px-5 py-5 sm:px-8">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-body)]">
              Calendar Settings
            </p>
            <h1 className="mb-3 border-none pl-0">カレンダー設定</h1>
            <p className="max-w-3xl text-sm text-[var(--text-body)]">
              `calendarId`
              ごとの色と表示ラベルを管理します。予定管理画面ではここで付けた表示名と色を使います。
            </p>
          </div>

          <div className="px-4 py-5 sm:px-8">
            {loading ? (
              <div className="rounded-2xl bg-white/85 p-8 text-center text-[var(--text-body)]">
                読み込み中...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                {error}
              </div>
            ) : (
              <div className="space-y-4">
                {message ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
                    {message}
                  </div>
                ) : null}
                {data?.calendarIds.map((calendarId) => (
                  <article
                    key={calendarId}
                    className="rounded-3xl border border-[var(--card-border)] bg-white/85 p-4 shadow-sm"
                  >
                    <div className="grid gap-4 lg:grid-cols-[140px,1fr] lg:items-center">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={getCalendarColor(colors[calendarId])}
                          onChange={(event) =>
                            setColors((current) => ({
                              ...current,
                              [calendarId]: event.target.value.toUpperCase(),
                            }))
                          }
                          className="h-12 w-16 cursor-pointer rounded border border-[var(--card-border)] bg-transparent"
                        />
                        <div
                          className="rounded-full border px-3 py-2 text-xs"
                          style={getCalendarColorStyle(colors[calendarId])}
                        >
                          Preview
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
                            表示ラベル
                          </span>
                          <input
                            type="text"
                            value={labels[calendarId] || ""}
                            onChange={(event) =>
                              setLabels((current) => ({
                                ...current,
                                [calendarId]: event.target.value,
                              }))
                            }
                            placeholder="未設定なら calendarId を表示"
                            className="w-full rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3 text-sm"
                          />
                        </label>
                        <div className="rounded-2xl border border-[var(--card-border)] bg-[rgba(255,255,255,0.65)] px-4 py-3 text-xs text-[var(--text-body)]">
                          <p className="font-semibold text-[var(--text-heading)]">
                            calendarId
                          </p>
                          <p className="mt-1 break-all">{calendarId}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CalendarSettingsPage() {
  return (
    <ProtectedRoute>
      <CalendarSettingsContent />
    </ProtectedRoute>
  );
}

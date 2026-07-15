import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  BookMarked,
  Headphones,
  RotateCcw,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { getProgress, getProgressSummary } from "../services/api";
import { useLesson } from "../context/LessonContext";

const FILTERS = [
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
  { key: "all", label: "Tất cả" },
];

const DAILY_GOAL = 5; // số bài luyện tập mục tiêu / ngày

function isWithinDays(dateString, days) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / (1000 * 60 * 60 * 24);
  return diff <= days;
}

function isToday(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function scoreColor(score) {
  if (score == null) return "text-slate-400";
  if (score >= 7.5) return "text-emerald-600";
  if (score >= 6) return "text-blue-600";
  return "text-slate-500";
}

function StatPill({ icon: Icon, value, label, accent = "text-blue-600" }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 ${accent}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-bold text-slate-900">{value}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}

function HistoryRow({ item, onRetake, retaking }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-slate-900">
          {item.title || item.videoUrl || "Bài luyện tập"}
        </span>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-md bg-slate-50 px-2 py-0.5 font-medium text-slate-600">
            {item.type}
          </span>
          <span>{new Date(item.date).toLocaleDateString("vi-VN")}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className={`text-sm font-bold ${scoreColor(item.score)}`}>
          {item.score != null ? item.score.toFixed(1) : "—"}
        </span>
        <button
          onClick={() => onRetake(item)}
          disabled={retaking}
          className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
        >
          {retaking ? (
            <Loader2 size={14} className="animate-spin" strokeWidth={2} />
          ) : (
            <RotateCcw size={14} strokeWidth={2} />
          )}
          Làm lại
        </button>
      </div>
    </div>
  );
}

export default function MainDashboard() {
  const navigate = useNavigate();
  const { loadLesson } = useLesson();
  const [filter, setFilter] = useState("week");
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retakingId, setRetakingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getProgress(), getProgressSummary("week")])
      .then(([progressRows, summaryData]) => {
        setHistory(progressRows);
        setSummary(summaryData);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        setError("Không tải được dữ liệu tiến độ. Kiểm tra backend đã chạy ở :8787 chưa.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredHistory = useMemo(() => {
    if (filter === "week") return history.filter((h) => isWithinDays(h.date, 7));
    if (filter === "month") return history.filter((h) => isWithinDays(h.date, 30));
    return history;
  }, [filter, history]);

  const avgScore = useMemo(() => {
    const scored = filteredHistory.filter((h) => h.score != null);
    if (scored.length === 0) return 0;
    return scored.reduce((acc, h) => acc + h.score, 0) / scored.length;
  }, [filteredHistory]);

  const todayCount = useMemo(
    () => new Set(history.filter((h) => isToday(h.date)).map((h) => h.lessonId)).size,
    [history]
  );

  const handleRetake = async (item) => {
    if (!item.lessonId || retakingId) return;
    setRetakingId(item.lessonId);
    try {
      await loadLesson(item.lessonId);
      // Nghe -> mở lại màn hình nghe; Đọc -> mở lại trang Reading; các kỹ năng khác -> mở lại tab khai thác tương ứng
      const target =
        item.type === "Listening" ? "/listening" : item.type === "Reading" ? "/reading" : "/exploration";
      navigate(target);
    } catch (err) {
      console.error("retake error:", err);
      setError("Không mở lại được bài học này (có thể bài đã bị xoá).");
    } finally {
      setRetakingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-50">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chào bạn quay lại 👋</h1>
            <p className="mt-1 text-sm text-slate-500">Cùng xem tiến trình học hôm nay nhé.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:flex">
            <StatPill icon={Flame} value={summary?.streakDays ?? 0} label="Ngày liên tục" accent="text-orange-500" />
            <StatPill
              icon={BookMarked}
              value={summary?.wordsMastered ?? 0}
              label="Từ vựng đã lưu"
              accent="text-blue-600"
            />
            <StatPill
              icon={Headphones}
              value={(summary?.band ?? 0).toFixed(1)}
              label="Điểm nghe TB"
              accent="text-emerald-600"
            />
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Today's goal */}
        <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Mục tiêu hôm nay</h2>
            <span className="text-xs font-medium text-slate-400">
              {Math.min(todayCount, DAILY_GOAL)}/{DAILY_GOAL} bài
            </span>
          </div>

          <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${Math.min((todayCount / DAILY_GOAL) * 100, 100)}%` }}
            />
          </div>

          <button
            onClick={() => navigate("/videos")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Sparkles size={18} strokeWidth={2} />
            {todayCount === 0 ? "Chọn video & soạn bài mới" : "Soạn thêm bài luyện tập"}
          </button>
        </section>

        {/* History & Stats */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
          {/* History list */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Lịch sử luyện tập</h2>
            </div>

            <div className="mb-4 flex gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === f.key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    onRetake={handleRetake}
                    retaking={retakingId === item.lessonId}
                  />
                ))
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">
                  Chưa có bài nào trong khoảng thời gian này. Hãy soạn bài học đầu tiên!
                </p>
              )}
            </div>
          </div>

          {/* Stats widget */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-slate-500">
                <TrendingUp size={16} strokeWidth={2} />
                <span className="text-xs font-medium">Điểm trung bình</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{avgScore.toFixed(1)}</div>
              <div className="mt-1 text-xs text-slate-400">
                {filteredHistory.length} bài · {FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}
              </div>
            </div>

            <button
              onClick={() => navigate("/analytics")}
              className="flex items-center justify-between rounded-xl bg-white p-5 text-left shadow-sm transition-colors hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-900">Xem toàn bộ thống kê</span>
              <ChevronRight size={18} className="text-slate-400" strokeWidth={2} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

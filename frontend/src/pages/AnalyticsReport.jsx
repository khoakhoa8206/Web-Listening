import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Headphones,
  Clock,
  BookMarked,
  Target,
  Sparkles,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { getProgressSummary } from "../services/api";

const SKILL_LABELS = {
  Listening: "Nghe",
  Writing: "Writing",
  Reading: "Reading",
  Speaking: "Speaking",
  Vocabulary: "Vocabulary",
};

// Phần 5.4 — Heatmap đơn giản: 1 ô = 1 ngày, màu đậm dần theo số lượt luyện tập trong ngày đó.
function Heatmap({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400">No activity data yet to display heatmap.</p>;
  }
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  const colorFor = (count) => {
    if (count === 0) return "bg-slate-100";
    const ratio = count / maxCount;
    if (ratio > 0.75) return "bg-blue-700";
    if (ratio > 0.5) return "bg-pink-500";
    if (ratio > 0.25) return "bg-blue-300";
    return "bg-blue-200";
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count} session(s)`}
          className={`h-4 w-4 rounded-sm ${colorFor(d.count)}`}
        />
      ))}
    </div>
  );
}

// Phần 5.4 — Phân tích điểm yếu theo từng kỹ năng: số lượt luyện tập + điểm TB (nếu có) mỗi kỹ năng.
function SkillBreakdown({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400">No skill data available yet.</p>;
  }
  const maxSessions = Math.max(...data.map((s) => s.sessions), 1);
  return (
    <div className="space-y-3">
      {data.map((s) => (
        <div key={s.type}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">{SKILL_LABELS[s.type] || s.type}</span>
            <span className="text-slate-400">
              {s.sessions} session(s) · {s.minutes} min{s.avgScore != null ? ` · Avg ${s.avgScore}` : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-pink-400"
              style={{ width: `${(s.sessions / maxSessions) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

function KpiCard({ icon: Icon, label, value, sub, accent = "blue" }) {
  const accentClasses =
    accent === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-pink-50 text-pink-500";

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentClasses}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const max = 9; // Band score tối đa IELTS
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No listening score data yet to display chart.
      </div>
    );
  }
  return (
    <div className="flex items-end justify-between gap-2 h-48 px-1">
      {data.map((item, i) => {
        const heightPct = (item.value / max) * 100;
        const isTop = item.value === Math.max(...data.map((d) => d.value));
        return (
          <div key={`${item.label}-${i}`} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <span className="text-xs font-medium text-slate-500">{item.value.toFixed(1)}</span>
            <div className="w-full h-full flex items-end">
              <div
                className={`w-full rounded-lg transition-all ${isTop ? "bg-pink-400" : "bg-blue-100"}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsReport() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProgressSummary(activeTab)
      .then(setData)
      .catch((err) => {
        console.error("summary error:", err);
        setError("Failed to load report. Make sure the backend is running on :8787.");
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Progress Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your listening results and IELTS progress over time.
          </p>
        </div>

        {/* Tabs */}
        <div className="inline-flex bg-white border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key ? "bg-pink-400 text-white" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading || !data ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">Loading report...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={Headphones}
                label="Avg. Listening Score"
                value={`${data.band.toFixed(1)} Band`}
                sub={`Based on ${data.lessonsCompleted} practice session(s)`}
                accent="blue"
              />
              <KpiCard
                icon={Clock}
                label="Total Practice Time"
                value={`${data.minutes} min`}
                sub="Across all skills"
                accent="blue"
              />
              <KpiCard
                icon={BookMarked}
                label="Vocab Saved"
                value={`${data.wordsMastered} word(s)`}
                sub="In your personal vocabulary bank"
                accent="emerald"
              />
              <KpiCard
                icon={Target}
                label="Day Streak"
                value={`${data.streakDays} day(s)`}
                sub="Consecutive practice days"
                accent="emerald"
              />
            </div>

            {/* Chart + CTA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-900">Listening Band Trend</h2>
                  <span className="text-xs text-slate-400">Scale 1.0 – 9.0</span>
                </div>
                <BarChart data={data.chart} />
              </div>

              <div className="rounded-xl bg-pink-50 border border-blue-100 shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-400 flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">Keep Practising</h2>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {data.lessonsCompleted === 0
                    ? "You have no practice sessions yet. Select a video to let AI create your first lesson."
                    : `You've completed ${data.lessonsCompleted} practice session(s) in this period. Keep it up to improve your band score.`}
                </p>
                <button
                  onClick={() => navigate("/videos")}
                  className="mt-auto self-start px-4 py-2 rounded-lg bg-pink-400 text-white text-sm font-medium hover:bg-pink-500 transition-colors"
                >
                  Practice Now
                </button>
              </div>
            </div>

            {/* Phần 5.4 — Heatmap hoạt động + phân tích điểm yếu theo kỹ năng */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  <h2 className="text-sm font-semibold text-slate-900">Activity Heatmap</h2>
                </div>
                <Heatmap data={data.heatmap} />
              </div>

              <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-pink-500" />
                  <h2 className="text-sm font-semibold text-slate-900">By Skill</h2>
                </div>
                <SkillBreakdown data={data.skillBreakdown} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

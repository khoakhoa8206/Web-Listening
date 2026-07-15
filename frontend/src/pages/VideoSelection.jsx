import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Link2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Captions,
  Play,
  Clock,
} from "lucide-react";
import { checkTranscript, searchVideos } from "../services/api";
import { useLesson } from "../context/LessonContext";

const TOPICS = ["Tất cả", "Giáo dục", "Môi trường", "Công nghệ", "Y tế"];
const BANDS = [
  { value: "6.0", label: "Band 6.0" },
  { value: "7.0", label: "Band 7.0" },
  { value: "8.0", label: "Band 8.0+" },
];

export default function VideoSelection() {
  const navigate = useNavigate();
  const { generateLesson, status: lessonStatus, error: lessonError } = useLesson();

  const [link, setLink] = useState("");
  const [transcript, setTranscript] = useState(null); // transcript thật lấy từ backend
  const [checkStatus, setCheckStatus] = useState("idle"); // idle | checking | valid | invalid | error
  const [band, setBand] = useState("7.0"); // Phần 5.2 — band điểm mục tiêu, mặc định 7.0
  const [cooldownSec, setCooldownSec] = useState(0); // Phần 5.6 — đếm ngược cooldown chống spam tạo bài

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState("Tất cả");
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState(null);
  const [generatingId, setGeneratingId] = useState(null); // id video thư viện đang tạo bài (nếu có)

  // Gọi backend thật để kiểm tra transcript khi người dùng dán / gõ link (debounce 600ms)
  useEffect(() => {
    if (!link.trim()) {
      setCheckStatus("idle");
      setTranscript(null);
      return;
    }
    setCheckStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const { hasTranscript, transcript: t } = await checkTranscript(link);
        setTranscript(t || null);
        setCheckStatus(hasTranscript ? "valid" : "invalid");
      } catch (err) {
        console.error("checkTranscript error:", err);
        setCheckStatus("error");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [link]);

  // Tìm video THẬT trên YouTube theo từ khóa / chủ đề (debounce 500ms)
  useEffect(() => {
    setVideosLoading(true);
    setVideosError(null);
    const timer = setTimeout(async () => {
      try {
        const topicParam = activeTopic === "Tất cả" ? "" : activeTopic;
        const results = await searchVideos(searchQuery, topicParam);
        setVideos(results || []);
      } catch (err) {
        console.error("searchVideos error:", err);
        setVideosError(
          err?.response?.data?.error ||
            "Không tìm được video. Kiểm tra backend đã cấu hình YOUTUBE_API_KEY chưa."
        );
        setVideos([]);
      } finally {
        setVideosLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTopic]);

  // Phần 5.6 — đếm ngược cooldown mỗi giây khi đang trong thời gian chờ
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => setCooldownSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  // Đọc lỗi 429 (cooldown) từ backend, set đếm ngược tương ứng để disable nút tạo bài
  const handleCooldownError = (err) => {
    if (err?.response?.status === 429) {
      const retry = err.response.data?.retryAfterSec || 60;
      setCooldownSec(retry);
    }
  };

  // Bấm "AI Tự Động Soạn Bài" cho link tự nhập
  const handleGenerateFromLink = async () => {
    if (checkStatus !== "valid" || cooldownSec > 0) return;
    try {
      await generateLesson(link, transcript, "", band);
      navigate("/listening");
    } catch (err) {
      handleCooldownError(err);
    }
  };

  // Bấm 1 video tìm được -> lấy transcript thật rồi tạo bài học từ video đó
  const handleSelectLibraryVideo = async (video) => {
    if (cooldownSec > 0) return;
    setGeneratingId(video.id);
    try {
      const { hasTranscript, transcript: t } = await checkTranscript(video.url);
      if (!hasTranscript) {
        setVideosError("Video này không có phụ đề khả dụng, hãy chọn video khác.");
        return;
      }
      await generateLesson(video.url, t, activeTopic === "Tất cả" ? "" : activeTopic, band);
      navigate("/listening");
    } catch (err) {
      console.error(err);
      handleCooldownError(err);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Chọn bài học</h1>
        <p className="mb-6 text-sm text-slate-500">
          Tự nhập link bài học mới hoặc tìm video thật trên YouTube có sẵn phụ đề.
        </p>

        {/* ================= Khu vực 1: Tự nhập bài học bằng Link ================= */}
        <div className="mb-8 rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">Tự nhập bài học bằng Link</p>

          {/* Phần 5.2 — Chọn band điểm mục tiêu, AI điều chỉnh độ khó từ vựng/câu hỏi/reading */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Band mục tiêu:</span>
            {BANDS.map((b) => (
              <button
                key={b.value}
                onClick={() => setBand(b.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  band === b.value
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Dán link YouTube vào đây..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <button
              onClick={handleGenerateFromLink}
              disabled={checkStatus !== "valid" || lessonStatus === "generating" || cooldownSec > 0}
              className={`flex shrink-0 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                checkStatus === "valid" && lessonStatus !== "generating" && cooldownSec === 0
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              {lessonStatus === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang soạn bài... (có thể mất 5-15 giây)
                </>
              ) : cooldownSec > 0 ? (
                <>Đợi {cooldownSec}s để tránh spam</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                  AI Tự Động Soạn Bài
                </>
              )}
            </button>
          </div>

          {/* Trạng thái kiểm tra phụ đề */}
          {checkStatus === "checking" && (
            <div className="mt-3 flex w-fit items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang kiểm tra phụ đề...
            </div>
          )}

          {checkStatus === "valid" && (
            <div className="mt-3 flex w-fit items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Video hợp lệ (Có sẵn phụ đề - Tối ưu AI)
            </div>
          )}

          {checkStatus === "invalid" && (
            <div className="mt-3 flex w-fit items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Video này không hỗ trợ phụ đề. Vui lòng chọn video khác.
            </div>
          )}

          {checkStatus === "error" && (
            <div className="mt-3 flex w-fit items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Không kết nối được tới backend. Kiểm tra server có đang chạy ở :8787 không.
            </div>
          )}

          {lessonStatus === "error" && lessonError && (
            <div className="mt-3 flex w-fit items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Lỗi khi tạo bài: {lessonError}
            </div>
          )}
        </div>

        {/* ================= Khu vực 2: Bộ lọc thư viện ================= */}
        <div className="mb-6">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm video theo từ khóa (VD: renewable energy)..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => {
              const isActive = activeTopic === topic;
              return (
                <button
                  key={topic}
                  onClick={() => setActiveTopic(topic)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Video được tìm trực tiếp trên YouTube, ưu tiên video có phụ đề.
          </p>
        </div>

        {/* ================= Khu vực 3: Lưới video ================= */}
        {cooldownSec > 0 && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Vui lòng đợi {cooldownSec}s trước khi tạo bài học tiếp theo.
          </div>
        )}

        {videosError && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {videosError}
          </div>
        )}

        {videosLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-center shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">Đang tìm video trên YouTube...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Không tìm thấy video phù hợp. Hãy thử từ khóa hoặc chủ đề khác.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => {
              const isThisGenerating = generatingId === video.id;
              return (
                <button
                  key={video.id}
                  onClick={() => handleSelectLibraryVideo(video)}
                  disabled={generatingId !== null || cooldownSec > 0}
                  className="group text-left rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
                >
                  <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-t-xl bg-slate-100">
                    {video.thumbnail && (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 shadow-sm transition-transform group-hover:scale-105">
                      {isThisGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                      ) : (
                        <Play className="h-4 w-4 text-slate-700" fill="currentColor" />
                      )}
                    </div>

                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-xs font-semibold text-white">
                      <Captions className="h-3.5 w-3.5" />
                      CC
                    </div>

                    {video.duration && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-xs font-medium text-white">
                        <Clock className="h-3 w-3" />
                        {video.duration}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-slate-900">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                        {video.channelTitle}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

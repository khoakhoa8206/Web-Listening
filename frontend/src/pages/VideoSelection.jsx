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
  ExternalLink,
  X,
  Download,
  Save,
  RotateCcw,
} from "lucide-react";
import { checkTranscript, getTranscriptLink, searchVideos } from "../services/api";
import { useLesson } from "../context/LessonContext";

const TOPICS = ["Tất cả", "Giáo dục", "Môi trường", "Công nghệ", "Y tế"];
const BANDS = [
  { value: "6.0", label: "Band 6.0" },
  { value: "7.0", label: "Band 7.0" },
  { value: "8.0", label: "Band 8.0+" },
];
// Phần 6.2 — Số lượng câu hỏi (blank) trong dictation, độc lập với Band (Band = độ khó, cái này = số lượng)
const QUESTION_COUNTS = [
  { value: "it", label: "Ít (~15-20 câu)" },
  { value: "vua", label: "Vừa (~25-35 câu)" },
  { value: "nhieu", label: "Nhiều (~40-50 câu)" },
];

// Phần 6.1 — Trang lấy transcript thay thế, dùng khi server không tự lấy được transcript (bị chặn IP)
function buildTranscriptSiteUrl(videoId) {
  return `https://youtubetotranscript.com/transcript?v=${videoId}&current_language_code=en`;
}

export default function VideoSelection() {
  const navigate = useNavigate();
  const {
    generateLesson, status: lessonStatus, error: lessonError,
    exportLessonAsJSON, saveLessonToLocalStorage, loadLessonFromLocalStorage, hasSavedLesson,
    title: savedTitle,
  } = useLesson();

  const [link, setLink] = useState("");
  const [transcriptDraft, setTranscriptDraft] = useState(""); // transcript người dùng dán tay
  const [transcriptSiteUrl, setTranscriptSiteUrl] = useState(null); // link mở sẵn sang youtubetotranscript.com
  // idle | checking | manual (cần dán tay) | valid (auto lấy được, đã tự điền sẵn)
  const [checkStatus, setCheckStatus] = useState("idle");
  const [band, setBand] = useState("7.0"); // Phần 5.2 — band điểm mục tiêu, mặc định 7.0
  const [questionCount, setQuestionCount] = useState("vua"); // Phần 6.2 — số lượng câu hỏi, mặc định Vừa
  const [cooldownSec, setCooldownSec] = useState(0); // Phần 5.6 — đếm ngược cooldown chống spam tạo bài

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState("Tất cả");
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState(null);

  // Phần 6.1 — video đang mở modal dán transcript (từ lưới thư viện), null = không mở modal nào
  const [modalVideo, setModalVideo] = useState(null);
  const [modalTranscript, setModalTranscript] = useState("");
  const [modalChecking, setModalChecking] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Phần 6.1 — Luồng chính lấy transcript: lấy link mở sẵn sang youtubetotranscript.com cho đúng video.
  // Vẫn thử tự động lấy transcript (checkTranscript) song song, âm thầm — nếu may mắn thành công thì
  // tự điền sẵn để đỡ phải dán tay, nhưng KHÔNG bắt buộc, không chặn nút bấm nếu thất bại.
  useEffect(() => {
    if (!link.trim()) {
      setCheckStatus("idle");
      setTranscriptSiteUrl(null);
      setTranscriptDraft("");
      return;
    }
    setCheckStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const { transcriptSiteUrl: siteUrl } = await getTranscriptLink(link);
        setTranscriptSiteUrl(siteUrl);
      } catch (err) {
        console.error("getTranscriptLink error:", err);
        setTranscriptSiteUrl(null);
      }

      try {
        const { hasTranscript, transcript: t } = await checkTranscript(link);
        if (hasTranscript && t) {
          setTranscriptDraft((prev) => (prev.trim() ? prev : t));
          setCheckStatus("valid");
        } else {
          setCheckStatus("manual");
        }
      } catch (err) {
        setCheckStatus("manual");
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

  const canGenerateFromLink =
    link.trim().length > 0 &&
    transcriptDraft.trim().length > 0 &&
    lessonStatus !== "generating" &&
    cooldownSec === 0;

  // Bấm "AI Tự Động Soạn Bài" cho link tự nhập — dùng transcript đã dán tay (hoặc tự điền sẵn nếu may mắn)
  const handleGenerateFromLink = async () => {
    if (!canGenerateFromLink) return;
    try {
      await generateLesson(link, transcriptDraft, "", band, questionCount);
      navigate("/listening");
    } catch (err) {
      handleCooldownError(err);
    }
  };

  // Bấm 1 video trong lưới thư viện -> mở modal để lấy/dán transcript cho đúng video đó
  const handleSelectLibraryVideo = async (video) => {
    if (cooldownSec > 0) return;
    setModalVideo(video);
    setModalTranscript("");
    setModalError(null);
    setModalChecking(true);
    try {
      const { hasTranscript, transcript: t } = await checkTranscript(video.url);
      if (hasTranscript && t) setModalTranscript(t);
    } catch (err) {
      // im lặng — không chặn, người dùng vẫn dán tay được
    } finally {
      setModalChecking(false);
    }
  };

  const closeModal = () => {
    setModalVideo(null);
    setModalTranscript("");
    setModalError(null);
  };

  // Bấm "Tạo bài học" trong modal
  const handleModalGenerate = async () => {
    if (!modalVideo || !modalTranscript.trim() || cooldownSec > 0) return;
    setModalError(null);
    try {
      await generateLesson(
        modalVideo.url,
        modalTranscript,
        activeTopic === "Tất cả" ? "" : activeTopic,
        band,
        questionCount
      );
      navigate("/listening");
    } catch (err) {
      console.error(err);
      handleCooldownError(err);
      setModalError(err?.response?.data?.error || err.message || "Có lỗi khi tạo bài học");
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
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Band mục tiêu:</span>
            {BANDS.map((b) => (
              <button
                key={b.value}
                onClick={() => setBand(b.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  band === b.value
                    ? "bg-pink-400 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Phần 6.2 — Chọn số lượng câu hỏi (blank), độc lập với độ khó */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Số lượng câu hỏi:</span>
            {QUESTION_COUNTS.map((q) => (
              <button
                key={q.value}
                onClick={() => setQuestionCount(q.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  questionCount === q.value
                    ? "bg-pink-400 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Dán link YouTube vào đây..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-300"
            />
          </div>

          {/* Trạng thái kiểm tra + nút mở trang lấy transcript */}
          {checkStatus === "checking" && (
            <div className="mb-3 flex w-fit items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang kiểm tra video...
            </div>
          )}

          {checkStatus === "valid" && (
            <div className="mb-3 flex w-fit items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Đã tự lấy được transcript — có thể tạo bài ngay, hoặc sửa lại transcript bên dưới.
            </div>
          )}

          {(checkStatus === "manual" || checkStatus === "valid") && (
            <div className="mb-3 space-y-2">
              {transcriptSiteUrl && (
                <button
                  onClick={() => window.open(transcriptSiteUrl, "_blank", "noopener")}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Mở trang lấy transcript (youtubetotranscript.com)
                </button>
              )}
              <textarea
                value={transcriptDraft}
                onChange={(e) => setTranscriptDraft(e.target.value)}
                placeholder="Dán transcript đã copy từ trang trên vào đây..."
                rows={4}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-300"
              />
            </div>
          )}

          <button
            onClick={handleGenerateFromLink}
            disabled={!canGenerateFromLink}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors sm:w-auto ${
              canGenerateFromLink
                ? "bg-pink-400 text-white hover:bg-pink-500"
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

          {lessonStatus === "error" && lessonError && (
            <div className="mt-3 flex w-fit items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Lỗi khi tạo bài: {lessonError}
            </div>
          )}

          {/* Save buttons — chỉ hiện khi đã có bài sẵn sàng */}
          {lessonStatus === "ready" && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-pink-50 pt-4">
              <span className="text-xs font-medium text-slate-400">Lưu bài tập:</span>
              <button
                onClick={saveLessonToLocalStorage}
                className="flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                Lưu tạm (trình duyệt)
              </button>
              <button
                onClick={exportLessonAsJSON}
                className="flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Tải xuống JSON
              </button>
            </div>
          )}

          {/* Restore from localStorage */}
          {lessonStatus !== "ready" && hasSavedLesson() && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-pink-50 border border-pink-100 px-3 py-2">
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-pink-400" />
              <span className="text-xs text-slate-600">Có bài tập đã lưu.</span>
              <button
                onClick={() => { loadLessonFromLocalStorage(); navigate("/listening"); }}
                className="ml-auto text-xs font-semibold text-pink-500 hover:underline"
              >
                Tải lại →
              </button>
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
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-300"
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
                      ? "bg-pink-400 text-white"
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
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => handleSelectLibraryVideo(video)}
                disabled={cooldownSec > 0}
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
                    <Play className="h-4 w-4 text-slate-700" fill="currentColor" />
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
                    <span className="rounded-lg bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-500">
                      {video.channelTitle}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ================= Modal: lấy/dán transcript cho video trong thư viện ================= */}
      {modalVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{modalVideo.title}</h3>
              <button
                onClick={closeModal}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <a
                href={modalVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Play className="h-3.5 w-3.5" />
                Xem trên YouTube
              </a>
              <a
                href={buildTranscriptSiteUrl(modalVideo.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Lấy transcript ↗
              </a>
            </div>

            {modalChecking && (
              <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang thử tự động lấy transcript...
              </div>
            )}

            <textarea
              value={modalTranscript}
              onChange={(e) => setModalTranscript(e.target.value)}
              placeholder="Dán transcript đã copy từ trang trên vào đây..."
              rows={6}
              className="mb-3 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-300"
            />

            {modalError && (
              <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {modalError}
              </div>
            )}

            <button
              onClick={handleModalGenerate}
              disabled={!modalTranscript.trim() || lessonStatus === "generating" || cooldownSec > 0}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                modalTranscript.trim() && lessonStatus !== "generating" && cooldownSec === 0
                  ? "bg-pink-400 text-white hover:bg-pink-500"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              {lessonStatus === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang soạn bài...
                </>
              ) : cooldownSec > 0 ? (
                <>Đợi {cooldownSec}s để tránh spam</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                  Tạo bài học
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

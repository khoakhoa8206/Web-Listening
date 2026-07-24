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

const TOPICS = ["All", "Education", "Environment", "Technology", "Healthcare"];
const BANDS = [
  { value: "6.0", label: "Band 6.0" },
  { value: "7.0", label: "Band 7.0" },
  { value: "8.0", label: "Band 8.0+" },
];
// Phần 6.2 — Số lượng câu hỏi (blank) trong dictation, độc lập với Band (Band = độ khó, cái này = số lượng)
const QUESTION_COUNTS = [
  { value: "it", label: "Few (~15-20 blanks)" },
  { value: "vua", label: "Medium (~25-35 blanks)" },
  { value: "nhieu", label: "Many (~40-50 blanks)" },
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
  const [activeTopic, setActiveTopic] = useState("All");
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
        const topicParam = activeTopic === "All" ? "" : activeTopic;
        const results = await searchVideos(searchQuery, topicParam);
        setVideos(results || []);
      } catch (err) {
        console.error("searchVideos error:", err);
        setVideosError(
          err?.response?.data?.error ||
            "No videos found. Check that the backend has YOUTUBE_API_KEY configured."
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

  // Bấm "Auto-Generate Lesson with AI" cho link tự nhập — dùng transcript đã dán tay (hoặc tự điền sẵn nếu may mắn)
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

  // Bấm "Create Lesson" trong modal
  const handleModalGenerate = async () => {
    if (!modalVideo || !modalTranscript.trim() || cooldownSec > 0) return;
    setModalError(null);
    try {
      await generateLesson(
        modalVideo.url,
        modalTranscript,
        activeTopic === "All" ? "" : activeTopic,
        band,
        questionCount
      );
      navigate("/listening");
    } catch (err) {
      console.error(err);
      handleCooldownError(err);
      setModalError(err?.response?.data?.error || err.message || "An error occurred while creating the lesson");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Select a Lesson</h1>
        <p className="mb-6 text-sm text-slate-500">
          Enter a new lesson link or search for real YouTube videos with captions.
        </p>

        {/* ================= Khu vực 1: Tự nhập bài học bằng Link ================= */}
        <div className="mb-8 rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">Add Lesson by Link</p>

          {/* Phần 5.2 — Chọn band điểm mục tiêu, AI điều chỉnh độ khó từ vựng/câu hỏi/reading */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Target Band:</span>
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
            <span className="text-xs font-medium text-slate-500">Question Count:</span>
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
              placeholder="Paste YouTube link here..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-300"
            />
          </div>

          {/* Trạng thái kiểm tra + nút mở trang lấy transcript */}
          {checkStatus === "checking" && (
            <div className="mb-3 flex w-fit items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking video...
            </div>
          )}

          {checkStatus === "valid" && (
            <div className="mb-3 flex w-fit items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Transcript fetched automatically — you can generate now, or edit the transcript below.
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
                  Open transcript page (youtubetotranscript.com)
                </button>
              )}
              <textarea
                value={transcriptDraft}
                onChange={(e) => setTranscriptDraft(e.target.value)}
                placeholder="Paste the transcript copied from the page above..."
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
                Generating lesson... (may take 5–15 seconds)
              </>
            ) : cooldownSec > 0 ? (
              <>Wait {cooldownSec}s before generating again</>
            ) : (
              <>
                <Sparkles className="h-4 w-4" strokeWidth={2} />
                Auto-Generate Lesson with AI
              </>
            )}
          </button>

          {lessonStatus === "error" && lessonError && (
            <div className="mt-3 flex w-fit items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Error generating lesson: {lessonError}
            </div>
          )}

          {/* Save buttons — chỉ hiện khi đã có bài sẵn sàng */}
          {lessonStatus === "ready" && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-pink-50 pt-4">
              <span className="text-xs font-medium text-slate-400">Save lesson:</span>
              <button
                onClick={saveLessonToLocalStorage}
                className="flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                Save locally (browser)
              </button>
              <button
                onClick={exportLessonAsJSON}
                className="flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download JSON
              </button>
            </div>
          )}

          {/* Restore from localStorage */}
          {lessonStatus !== "ready" && hasSavedLesson() && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-pink-50 border border-pink-100 px-3 py-2">
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-pink-400" />
              <span className="text-xs text-slate-600">You have a saved lesson.</span>
              <button
                onClick={() => { loadLessonFromLocalStorage(); navigate("/listening"); }}
                className="ml-auto text-xs font-semibold text-pink-500 hover:underline"
              >
                Restore →
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
              placeholder="Search videos by keyword (e.g. renewable energy)..."
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
            Videos are searched directly on YouTube, prioritising those with captions.
          </p>
        </div>

        {/* ================= Khu vực 3: Lưới video ================= */}
        {cooldownSec > 0 && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Please wait {cooldownSec}s before creating the next lesson.
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
            <p className="text-sm text-slate-500">Searching YouTube for videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              No matching videos found. Try a different keyword or topic.
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
                Watch on YouTube
              </a>
              <a
                href={buildTranscriptSiteUrl(modalVideo.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Get transcript ↗
              </a>
            </div>

            {modalChecking && (
              <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Trying to fetch transcript automatically...
              </div>
            )}

            <textarea
              value={modalTranscript}
              onChange={(e) => setModalTranscript(e.target.value)}
              placeholder="Paste the transcript copied from the page above..."
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
                  Generating lesson...
                </>
              ) : cooldownSec > 0 ? (
                <>Wait {cooldownSec}s before generating again</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                  Create Lesson
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

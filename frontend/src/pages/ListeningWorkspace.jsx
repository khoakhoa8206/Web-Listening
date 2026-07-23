import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Repeat,
  Gauge,
  Rewind,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  ArrowRight,
  Volume2,
  Loader2,
  AlertTriangle,
  PlayCircle,
  ListChecks,
  Download,
  Save,
} from "lucide-react";
import { useLesson } from "../context/LessonContext";
import { saveProgress } from "../services/api";

function normalize(str) {
  return String(str).trim().toLowerCase().replace(/\s+/g, " ");
}

// Lấy YouTube video id từ nhiều dạng link khác nhau
function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Blank input
// ---------------------------------------------------------------------------

const Blank = React.forwardRef(function Blank(
  { id, answer, blankType, value, isChecked, onChange, onKeyDown, onFocus },
  ref
) {
  const isCorrect = isChecked && normalize(value) === normalize(answer);
  const isIncorrect = isChecked && normalize(value) !== normalize(answer);
  const width = Math.max(answer.length, value.length, 4) + 2;
  const isIdea = blankType === "idea";

  let stateClasses = `${isIdea ? "border-dashed" : ""} border-slate-300 bg-white text-slate-900 focus:border-pink-400`;
  if (isCorrect) stateClasses = `${isIdea ? "border-dashed" : ""} border-emerald-600 bg-emerald-50 text-emerald-700`;
  if (isIncorrect) stateClasses = `${isIdea ? "border-dashed" : ""} border-red-500 bg-red-50 text-red-600`;

  return (
    <span className="inline-flex items-center gap-1.5 align-middle mx-1" title={isIdea ? "Ý quan trọng của bài" : "Từ vựng"}>
      <input
        ref={ref}
        id={id}
        data-blank-id={id}
        type="text"
        autoComplete="off"
        spellCheck={false}
        disabled={isChecked}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, id)}
        onFocus={() => onFocus(id)}
        style={{ width: `${width}ch` }}
        className={`rounded-lg border-2 px-2 py-0.5 text-center text-sm font-semibold outline-none transition-colors disabled:cursor-not-allowed ${stateClasses}`}
      />
      {isCorrect && <CheckCircle2 size={16} className="shrink-0 text-emerald-600" strokeWidth={2.5} />}
      {isIncorrect && (
        <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap text-xs">
          <XCircle size={16} className="text-red-500" strokeWidth={2.5} />
          <span className="font-semibold text-emerald-600">{answer}</span>
        </span>
      )}
    </span>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ListeningWorkspace() {
  const navigate = useNavigate();
  const { lessonId, videoUrl, title, dictation, status, exportLessonAsJSON, saveLessonToLocalStorage } = useLesson();

  const playerRef = useRef(null);
  const ytPlayerInstance = useRef(null);
  const blankRefs = useRef({});
  const startTimeRef = useRef(null);

  const [started, setStarted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [activeSentenceId, setActiveSentenceId] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [answers, setAnswers] = useState({});
  const [isChecked, setIsChecked] = useState(false);

  // Reset trạng thái "bắt đầu" mỗi khi có bài học mới
  useEffect(() => {
    setStarted(false);
    startTimeRef.current = null;
  }, [lessonId]);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    setStarted(true);
  };

  const videoId = useMemo(() => extractYoutubeId(videoUrl), [videoUrl]);

  // Danh sách id các blank + map đáp án, tính lại mỗi khi dictation thay đổi
  const BLANK_ORDER = useMemo(() => {
    if (!dictation) return [];
    return dictation.flatMap((s) =>
      s.segments.filter((seg) => seg.type === "blank").map((seg) => seg.id)
    );
  }, [dictation]);

  const ANSWER_MAP = useMemo(() => {
    if (!dictation) return {};
    return dictation.flatMap((s) => s.segments).reduce((acc, seg) => {
      if (seg.type === "blank") acc[seg.id] = seg.answer;
      return acc;
    }, {});
  }, [dictation]);

  // Khởi tạo state answers + câu active khi dictation đã sẵn sàng
  useEffect(() => {
    if (dictation && dictation.length > 0) {
      setAnswers(Object.fromEntries(BLANK_ORDER.map((id) => [id, ""])));
      setActiveSentenceId(dictation[0].id);
      setIsChecked(false);
    }
  }, [dictation, BLANK_ORDER]);

  // -- Load YouTube IFrame API và tạo player khi đã có videoId ---------------
  useEffect(() => {
    if (!videoId || !started) return;

    function createPlayer() {
      ytPlayerInstance.current = new window.YT.Player(playerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: { onReady: () => setPlayerReady(true) },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      ytPlayerInstance.current?.destroy?.();
    };
  }, [videoId, started]);

  // -- Player controls ---------------------------------------------------
  const seekToSentence = useCallback(
    (sentenceId) => {
      const sentence = dictation?.find((s) => s.id === sentenceId);
      if (!sentence || !ytPlayerInstance.current?.seekTo) return;
      ytPlayerInstance.current.seekTo(sentence.startTime, true);
      ytPlayerInstance.current.playVideo();
    },
    [dictation]
  );

  const handleRepeatSentence = () => seekToSentence(activeSentenceId);

  const handleSetSpeed = (rate) => {
    setSpeed(rate);
    ytPlayerInstance.current?.setPlaybackRate?.(rate);
  };

  // -- Dictation logic -----------------------------------------------------
  const handleChange = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const focusBlank = (id) => {
    blankRefs.current[id]?.focus();
    blankRefs.current[id]?.select?.();
  };

  const handleKeyDown = (e, id) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const idx = BLANK_ORDER.indexOf(id);
      const nextId = BLANK_ORDER[idx + 1];
      if (nextId) focusBlank(nextId);
      else e.target.blur();
    }
  };

  const handleFocusInput = (blankId) => {
    const sentence = dictation?.find((s) =>
      s.segments.some((seg) => seg.type === "blank" && seg.id === blankId)
    );
    if (sentence) setActiveSentenceId(sentence.id);
  };

  const handleCheckAnswers = async () => {
    setIsChecked(true);
    const total = BLANK_ORDER.length;
    const correct = BLANK_ORDER.filter(
      (id) => normalize(answers[id]) === normalize(ANSWER_MAP[id])
    ).length;
    const scoreOnNine = total > 0 ? +((correct / total) * 9).toFixed(1) : 0;
    const elapsedMinutes = startTimeRef.current
      ? +((Date.now() - startTimeRef.current) / 60000).toFixed(1)
      : 0;

    try {
      await saveProgress({
        lessonId,
        type: "Listening",
        score: scoreOnNine,
        minutes: elapsedMinutes,
      });
    } catch (err) {
      console.error("saveProgress error:", err);
    }
  };

  const { correctCount, totalCount } = useMemo(() => {
    const total = BLANK_ORDER.length;
    const correct = BLANK_ORDER.filter(
      (id) => normalize(answers[id]) === normalize(ANSWER_MAP[id])
    ).length;
    return { correctCount: correct, totalCount: total };
  }, [answers, BLANK_ORDER, ANSWER_MAP]);

  const allFilled = BLANK_ORDER.length > 0 && BLANK_ORDER.every((id) => (answers[id] || "").trim().length > 0);

  // -- Trạng thái chưa có bài học nào được tạo -----------------------------
  if (status === "idle" || !dictation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl bg-white p-8 text-center shadow-sm">
          {status === "generating" ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              <p className="text-sm font-medium text-slate-700">AI đang soạn bài dictation...</p>
            </>
          ) : status === "error" ? (
            <>
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium text-slate-700">Tạo bài học thất bại.</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Bạn chưa chọn bài học nào.</p>
          )}
          <button
            onClick={() => navigate("/videos")}
            className="mt-2 rounded-lg bg-pink-400 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500"
          >
            Chọn bài học
          </button>
        </div>
      </div>
    );
  }

  // -- Bài đã sẵn sàng nhưng người dùng chưa bấm "Bắt đầu" ------------------
  if (!started) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-pink-500">
            <ListChecks className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Bài nghe đã sẵn sàng</h2>
            <p className="mt-1 text-sm text-slate-500">{title || videoUrl}</p>
          </div>
          <p className="text-sm text-slate-500">
            Bài gồm <span className="font-semibold text-slate-700">{dictation.length} đoạn</span>{" "}
            với <span className="font-semibold text-slate-700">{BLANK_ORDER.length} chỗ trống</span>.
            Thời gian làm bài sẽ được tính từ lúc bạn bấm bắt đầu.
          </p>

          {/* Nút lưu bài tập */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveLessonToLocalStorage}
              className="flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              Lưu tạm
            </button>
            <button
              onClick={exportLessonAsJSON}
              className="flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Tải xuống JSON
            </button>
          </div>
          <button
            onClick={handleStart}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-pink-400 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-500"
          >
            <PlayCircle size={18} strokeWidth={2} />
            Bắt đầu làm bài
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[420px_1fr] lg:items-start">
        {/* LEFT — Video player */}
        <aside className="lg:sticky lg:top-6">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <Volume2 size={16} strokeWidth={2} />
              <span className="text-xs font-medium">Bài nghe</span>
            </div>

            <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
              <div ref={playerRef} className="h-full w-full" />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleRepeatSentence}
                disabled={!playerReady}
                className="flex items-center justify-center gap-2 rounded-lg bg-pink-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Repeat size={16} strokeWidth={2} />
                Lặp lại câu này
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSetSpeed(0.75)}
                  disabled={!playerReady}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    speed === 0.75 ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Rewind size={14} strokeWidth={2} />
                  Giảm tốc độ (0.75x)
                </button>
                <button
                  onClick={() => handleSetSpeed(1)}
                  disabled={!playerReady}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    speed === 1 ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Gauge size={14} strokeWidth={2} />
                  Tốc độ chuẩn (1x)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Tiến độ điền từ</span>
              <span className="font-semibold text-slate-900">
                {Object.values(answers).filter((v) => (v || "").trim()).length}/{totalCount}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-pink-400 transition-all"
                style={{
                  width: `${
                    totalCount > 0
                      ? (Object.values(answers).filter((v) => (v || "").trim()).length / totalCount) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </aside>

        {/* RIGHT — Dictation area */}
        <section className="flex flex-col gap-4">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-slate-900">
              Điền từ còn thiếu (Dictation)
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              Nghe kỹ và điền từ bạn nghe được vào chỗ trống. Nhấn{" "}
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold">Enter</kbd>{" "}
              để chuyển sang ô tiếp theo.
            </p>

            {/* Phần 6.3 — Chú thích 2 loại blank: viền liền = từ vựng, viền chấm = ý quan trọng */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-4 w-8 rounded border-2 border-slate-300 bg-white" />
                Từ vựng
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-4 w-8 rounded border-2 border-dashed border-slate-300 bg-white" />
                Ý quan trọng (tái dùng được cho topic tương tự)
              </span>
            </div>

            <div className="flex flex-col gap-5">
              {dictation.map((sentence) => (
                <p
                  key={sentence.id}
                  onClick={() => setActiveSentenceId(sentence.id)}
                  className={`cursor-pointer rounded-lg p-3 text-[15px] leading-8 text-slate-700 transition-colors ${
                    activeSentenceId === sentence.id ? "bg-pink-50" : "hover:bg-slate-50"
                  }`}
                >
                  {sentence.segments.map((seg, i) =>
                    seg.type === "text" ? (
                      <span key={i}>{seg.content}</span>
                    ) : (
                      <Blank
                        key={seg.id}
                        id={seg.id}
                        answer={seg.answer}
                        blankType={seg.blankType}
                        value={answers[seg.id] || ""}
                        isChecked={isChecked}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocusInput}
                        ref={(el) => (blankRefs.current[seg.id] = el)}
                      />
                    )
                  )}
                </p>
              ))}
            </div>

            {isChecked && (
              <div className="mt-6 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">Kết quả</span>
                <span className="text-sm font-bold text-slate-900">
                  {correctCount}/{totalCount} câu đúng
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleCheckAnswers}
              disabled={!allFilled || isChecked}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ClipboardCheck size={18} strokeWidth={2} />
              Kiểm tra đáp án
            </button>

            {isChecked ? (
              <button
                onClick={() => navigate("/reading")}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-pink-400 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-500"
              >
                Luyện Reading tiếp
                <ArrowRight size={18} strokeWidth={2} />
              </button>
            ) : (
              <button
                onClick={() => navigate("/exploration")}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-pink-400 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-500"
              >
                Chuyển sang phần Luyện Ý Tưởng & Từ Vựng
                <ArrowRight size={18} strokeWidth={2} />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  Layers,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Quote,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  PenLine,
  Sparkles,
  Volume2,
  Loader2,
  AlertTriangle,
  ListTree,
  Mic,
  MicOff,
  Award,
  FileText,
} from "lucide-react";
import { useLesson } from "../context/LessonContext";
import { saveProgress, getSavedVocab, saveVocab, deleteVocab, gradeSpeaking } from "../services/api";

const TABS = [
  { id: "writing", label: "Writing Task 2 Focus", icon: Target },
  { id: "truefalse", label: "True / False / Not Given", icon: ListTree },
  { id: "vocab", label: "Từ vựng Speaking Part 2+3", icon: Layers },
  { id: "speaking", label: "Speaking Part 2 & 3", icon: Mic },
  { id: "ideas", label: "Ý tưởng & Tổng kết Topic", icon: Lightbulb },
];

export default function IELTSExploration() {
  const navigate = useNavigate();
  const {
    lessonId,
    status,
    videoUrl,
    title,
    writingQuestions,
    vocabCards,
    ideaBank,
    trueFalseQuestions,
    speakingPrompt,
  } = useLesson();
  const [activeTab, setActiveTab] = useState("writing");

  // Chưa có bài học nào được tạo / đang tạo / lỗi -> hiển thị trạng thái, không render tab rỗng
  if (status !== "ready" || !writingQuestions || !vocabCards || !ideaBank) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl bg-white p-8 text-center shadow-sm">
          {status === "generating" ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-700">AI đang soạn nội dung khai thác...</p>
            </>
          ) : status === "error" ? (
            <>
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium text-slate-700">Tạo nội dung thất bại.</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Bạn chưa chọn bài học nào.</p>
          )}
          <button
            onClick={() => navigate("/videos")}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Chọn bài học
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Khai thác IELTS</h1>
            <p className="text-sm text-slate-500">
              Chủ đề bài nghe:{" "}
              <span className="font-medium text-slate-700">{title || videoUrl || "—"}</span>
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-white p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content — dữ liệu truyền vào từ props, không còn hard-code */}
        {activeTab === "writing" && (
          <WritingFocusTab lessonId={lessonId} writingQuestions={writingQuestions} />
        )}
        {activeTab === "truefalse" && (
          <TrueFalseTab lessonId={lessonId} trueFalseQuestions={trueFalseQuestions} />
        )}
        {activeTab === "vocab" && <VocabularyTab lessonId={lessonId} vocabCards={vocabCards} />}
        {activeTab === "speaking" && <SpeakingTab lessonId={lessonId} speakingPrompt={speakingPrompt} />}
        {activeTab === "ideas" && <IdeaBankTab ideaBank={ideaBank} />}
      </div>
    </div>
  );
}

/* ------------------------- Tab 1: Writing Focus ------------------------- */

function WritingFocusTab({ lessonId, writingQuestions }) {
  const [answers, setAnswers] = useState({});
  const startTimeRef = useRef(Date.now());
  const savedRef = useRef(false);

  const handleSelect = (qId, index) => {
    if (answers[qId] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [qId]: index }));
  };

  const allAnswered = writingQuestions.every((q) => answers[q.id] !== undefined);

  // Lưu tiến độ ngay khi người dùng hoàn thành hết câu hỏi trong tab này
  useEffect(() => {
    if (!allAnswered || savedRef.current) return;
    savedRef.current = true;
    const correct = writingQuestions.filter((q) => answers[q.id] === q.correctIndex).length;
    const scoreOnNine = +((correct / writingQuestions.length) * 9).toFixed(1);
    const minutes = +((Date.now() - startTimeRef.current) / 60000).toFixed(1);
    saveProgress({ lessonId, type: "Writing", score: scoreOnNine, minutes }).catch((err) =>
      console.error("saveProgress error:", err)
    );
  }, [allAnswered, answers, lessonId, writingQuestions]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Cùng loại câu hỏi Nghe hiểu quen thuộc, nhưng lần này hãy tập trung vào{" "}
        <span className="font-medium text-slate-700">cách diễn giả xây dựng luận điểm</span> —
        đây chính là kỹ năng bạn cần cho Writing Task 2.
      </p>

      {writingQuestions.map((q) => {
        const selected = answers[q.id];
        const answered = selected !== undefined;

        return (
          <div key={q.id} className="rounded-xl bg-white p-6 shadow-sm">
            <span className="mb-3 inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
              {q.tag}
            </span>
            <p className="mb-4 font-semibold text-slate-900">{q.question}</p>

            <div className="space-y-2">
              {q.options.map((opt, idx) => {
                const isCorrect = idx === q.correctIndex;
                const isSelected = selected === idx;

                let style =
                  "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50";
                if (answered && isCorrect) {
                  style = "border-emerald-600 bg-emerald-50 text-emerald-700";
                } else if (answered && isSelected && !isCorrect) {
                  style = "border-rose-400 bg-rose-50 text-rose-600";
                } else if (answered) {
                  style = "border-slate-200 text-slate-400";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(q.id, idx)}
                    disabled={answered}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${style}`}
                  >
                    <span>{opt}</span>
                    {answered && isCorrect && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    )}
                    {answered && isSelected && !isCorrect && (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="mt-4 rounded-r-lg border-l-4 border-emerald-600 bg-emerald-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Vì sao đây là luận điểm hiệu quả
                </p>
                <p className="text-sm text-slate-700">{q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}

      {allAnswered && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Đã lưu kết quả phần Writing của bạn.
        </div>
      )}
    </div>
  );
}

/* ------------------- Tab 2: True / False / Not Given -------------------- */

function TrueFalseTab({ lessonId, trueFalseQuestions }) {
  const [answers, setAnswers] = useState({});
  const startTimeRef = useRef(Date.now());
  const savedRef = useRef(false);
  const OPTIONS = ["True", "False", "Not Given"];

  if (!trueFalseQuestions || trueFalseQuestions.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm">
        Bài học này chưa có phần True/False/Not Given.
      </p>
    );
  }

  const allAnswered = trueFalseQuestions.every((q) => answers[q.id] !== undefined);

  useEffect(() => {
    if (!allAnswered || savedRef.current) return;
    savedRef.current = true;
    const correct = trueFalseQuestions.filter((q) => answers[q.id] === q.answer).length;
    const scoreOnNine = +((correct / trueFalseQuestions.length) * 9).toFixed(1);
    const minutes = +((Date.now() - startTimeRef.current) / 60000).toFixed(1);
    saveProgress({ lessonId, type: "Reading", score: scoreOnNine, minutes }).catch((err) =>
      console.error("saveProgress error:", err)
    );
  }, [allAnswered, answers, lessonId, trueFalseQuestions]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Dựa vào nội dung bài nghe, xác định mỗi câu dưới đây là{" "}
        <span className="font-medium text-slate-700">True, False, hay Not Given</span>.
      </p>

      {trueFalseQuestions.map((q) => {
        const selected = answers[q.id];
        const answered = selected !== undefined;
        const isCorrect = answered && selected === q.answer;

        return (
          <div key={q.id} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-medium text-slate-900">{q.statement}</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.map((opt) => {
                const isSelected = selected === opt;
                let style = "border-slate-200 text-slate-600 hover:border-slate-300";
                if (answered && opt === q.answer) style = "border-emerald-600 bg-emerald-50 text-emerald-700";
                else if (answered && isSelected) style = "border-rose-400 bg-rose-50 text-rose-600";
                return (
                  <button
                    key={opt}
                    disabled={answered}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${style}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div
                className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${
                  isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                }`}
              >
                {isCorrect ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                <span>{q.explanation}</span>
              </div>
            )}
          </div>
        );
      })}

      {allAnswered && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Đã lưu kết quả phần True/False/Not Given của bạn.
        </div>
      )}
    </div>
  );
}

/* ------------------------- Tab 3: Vocabulary ------------------------- */

function VocabularyTab({ lessonId, vocabCards }) {
  const [expanded, setExpanded] = useState({});
  const [saved, setSaved] = useState({});
  const [loadingWord, setLoadingWord] = useState(null);

  // Tải danh sách từ đã lưu thật từ backend để biết từ nào đã có trong kho
  useEffect(() => {
    getSavedVocab()
      .then((rows) => {
        const map = {};
        for (const card of vocabCards) {
          if (rows.some((r) => r.word === card.word)) map[card.id] = true;
        }
        setSaved(map);
      })
      .catch((err) => console.error("getSavedVocab error:", err));
  }, [vocabCards]);

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleSave = async (card) => {
    setLoadingWord(card.id);
    try {
      if (saved[card.id]) {
        await deleteVocab(card.word);
        setSaved((prev) => ({ ...prev, [card.id]: false }));
      } else {
        await saveVocab({
          word: card.word,
          phonetic: card.phonetic,
          meaning: card.meaning,
          tip: card.tip,
          source: card.source,
          lessonId,
        });
        setSaved((prev) => ({ ...prev, [card.id]: true }));
      }
    } catch (err) {
      console.error("saveVocab error:", err);
    } finally {
      setLoadingWord(null);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Các từ vựng & collocation xuất hiện trong bài nghe — bấm{" "}
        <span className="font-medium text-slate-700">"Xem ngữ cảnh"</span> để biết cách áp dụng
        vào bài Speaking Part 2 & 3.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {vocabCards.map((card) => {
          const isExpanded = !!expanded[card.id];
          const isSaved = !!saved[card.id];
          const isLoading = loadingWord === card.id;

          return (
            <div
              key={card.id}
              className="flex flex-col rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{card.word}</h3>
                  <p className="flex items-center gap-1 text-sm text-slate-400">
                    <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
                    {card.phonetic}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                  Part 2+3
                </span>
              </div>

              <p className="mb-3 text-sm text-slate-700">{card.meaning}</p>

              <button
                onClick={() => toggleExpand(card.id)}
                className="mb-3 flex items-center gap-1 self-start text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {isExpanded ? "Ẩn ngữ cảnh" : "Xem ngữ cảnh"}
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {isExpanded && (
                <div className="mb-4 space-y-2">
                  <div className="flex gap-2 rounded-lg bg-slate-50 p-3">
                    <Quote className="h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-sm italic text-slate-600">{card.source}</p>
                  </div>
                  <div className="rounded-r-lg border-l-4 border-blue-600 bg-blue-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Gợi ý Speaking
                    </p>
                    <p className="text-sm text-slate-700">{card.tip}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => toggleSave(card)}
                disabled={isLoading}
                className={`mt-auto flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                  isSaved ? "bg-emerald-50 text-emerald-700" : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSaved ? (
                  <>
                    <BookmarkCheck className="h-4 w-4" strokeWidth={2} />
                    Đã lưu vào kho từ vựng
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" strokeWidth={2} />
                    Lưu vào kho từ vựng
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Phần 5.5: Speaking chấm bằng AI (Web Speech API ghi + nhận dạng, Gemini chấm) ---------- */

function SpeakingRecorder({ promptText, part }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const [supported] = useState(!!SpeechRecognition);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const startRecording = () => {
    if (!supported) return;
    setError(null);
    setResult(null);
    setTranscript("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        finalText += e.results[i][0].transcript + " ";
      }
      setTranscript(finalText.trim());
    };
    recognition.onerror = (e) => {
      console.error("SpeechRecognition error:", e.error);
      setError("Không nhận dạng được giọng nói. Kiểm tra quyền truy cập micro của trình duyệt.");
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const handleGrade = async () => {
    if (!transcript.trim()) return;
    setGrading(true);
    setError(null);
    try {
      const data = await gradeSpeaking(promptText, transcript, part);
      setResult(data);
    } catch (err) {
      console.error("gradeSpeaking error:", err);
      setError(err?.response?.data?.error || "Lỗi khi chấm điểm Speaking. Thử lại sau.");
    } finally {
      setGrading(false);
    }
  };

  if (!supported) {
    return (
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        Trình duyệt hiện tại không hỗ trợ nhận dạng giọng nói (Web Speech API) — hãy thử Chrome trên
        máy tính để dùng tính năng chấm Speaking bằng AI.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
          >
            <Mic size={14} strokeWidth={2} />
            Bắt đầu nói
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            <MicOff size={14} strokeWidth={2} />
            Dừng ghi ({transcript.split(" ").filter(Boolean).length} từ)
          </button>
        )}

        {transcript && !recording && (
          <button
            onClick={handleGrade}
            disabled={grading}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {grading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                AI đang chấm...
              </>
            ) : (
              <>
                <Award size={14} strokeWidth={2} />
                Chấm điểm bằng AI
              </>
            )}
          </button>
        )}
      </div>

      {transcript && (
        <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{transcript}</p>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertTriangle size={13} />
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-lg bg-emerald-50 p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <Award size={16} className="text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800">Band ước tính: {result.band}</span>
          </div>
          {result.feedback && <p className="mb-2 text-xs text-slate-700">{result.feedback}</p>}
          {result.strengths?.length > 0 && (
            <div className="mb-1.5 text-xs text-slate-700">
              <span className="font-semibold text-emerald-700">Điểm mạnh: </span>
              {result.strengths.join("; ")}
            </div>
          )}
          {result.improvements?.length > 0 && (
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-amber-700">Cần cải thiện: </span>
              {result.improvements.join("; ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------- Tab 4: Speaking ------------------------- */

function SpeakingTab({ lessonId, speakingPrompt }) {
  const [done, setDone] = useState(false);
  const startTimeRef = useRef(Date.now());

  if (!speakingPrompt?.part2) {
    return (
      <p className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm">
        Bài học này chưa có phần Speaking.
      </p>
    );
  }

  const handleDone = () => {
    if (done) return;
    setDone(true);
    const minutes = +((Date.now() - startTimeRef.current) / 60000).toFixed(1);
    saveProgress({ lessonId, type: "Speaking", score: null, minutes }).catch((err) =>
      console.error("saveProgress error:", err)
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <span className="mb-3 inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
          Speaking Part 2
        </span>
        <p className="mb-3 font-semibold text-slate-900">{speakingPrompt.part2.cueCard}</p>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {speakingPrompt.part2.bullets?.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        <div className="rounded-r-lg border-l-4 border-emerald-600 bg-emerald-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Đoạn mẫu tham khảo
          </p>
          <p className="text-sm text-slate-700">{speakingPrompt.part2.sampleOutline}</p>
        </div>

        <SpeakingRecorder promptText={speakingPrompt.part2.cueCard} part="Part 2" />
      </div>

      {speakingPrompt.part3?.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <span className="mb-3 inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
            Speaking Part 3
          </span>
          <div className="space-y-3">
            {speakingPrompt.part3.map((q, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">{q.question}</p>
                <p className="mt-1 text-xs text-slate-500">{q.tip}</p>
                <SpeakingRecorder promptText={q.question} part="Part 3" />
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleDone}
        disabled={done}
        className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {done ? (
          <>
            <CheckCircle2 size={18} strokeWidth={2} />
            Đã lưu tiến độ Speaking
          </>
        ) : (
          "Tôi đã luyện tập xong phần này"
        )}
      </button>
    </div>
  );
}

/* ------------------------- Tab 5: Idea Bank ------------------------- */

function IdeaBankTab({ ideaBank }) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500">
        Tổng hợp ý tưởng theo từng Topic Writing Task 2 — trích từ bài nghe, kèm cách áp dụng và
        câu mẫu hoàn chỉnh.
      </p>

      {ideaBank.map((group) => (
        <div key={group.topic}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">{group.topic}</h2>
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {group.ideas.length} ý tưởng
            </span>
          </div>

          <div className="space-y-4">
            {group.ideas.map((idea, idx) => (
              <div key={idx} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex gap-2 rounded-lg bg-slate-50 p-3">
                  <Quote className="h-4 w-4 shrink-0 text-slate-400" />
                  <p className="text-sm italic text-slate-700">{idea.en}</p>
                </div>

                <div className="mb-3 rounded-r-lg border-l-4 border-blue-600 bg-blue-50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Cách áp dụng vào bài viết
                  </p>
                  <p className="text-sm text-slate-700">{idea.application}</p>
                </div>

                <div className="rounded-r-lg border-l-4 border-emerald-600 bg-emerald-50 p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <PenLine className="h-3.5 w-3.5 text-emerald-700" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Câu mẫu Writing
                    </p>
                  </div>
                  <p className="text-sm text-slate-700">{idea.sample}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Phần 6.3 — Đề Writing Task 2 + dàn ý chi tiết, sinh riêng cho từng topic trong ideaBank */}
          {group.task2Question && group.task2Outline && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-700" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Đề Writing Task 2 (bám sát nội dung video)
                </p>
              </div>
              <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-900">
                {group.task2Question}
              </p>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dàn ý gợi ý
              </p>
              <p className="mb-3 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Thesis: </span>
                {group.task2Outline.thesis}
              </p>

              <div className="space-y-3">
                {group.task2Outline.bodyParagraphs?.map((p, pIdx) => (
                  <div key={pIdx} className="rounded-r-lg border-l-4 border-slate-300 bg-slate-50 p-3">
                    <p className="mb-1 text-sm font-semibold text-slate-900">
                      Luận điểm {pIdx + 1}: {p.mainPoint}
                    </p>
                    <p className="mb-1 text-sm text-slate-700">{p.explanation}</p>
                    <p className="text-sm italic text-slate-600">Ví dụ: {p.example}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

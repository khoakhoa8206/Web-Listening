import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Quote,
  Sparkles,
  Volume2,
  Loader2,
  AlertTriangle,
  FileText,
  PenLine,
  CheckCircle2,
  Tag,
  Link2,
  BookOpen,
} from "lucide-react";
import { useLesson } from "../context/LessonContext";
import { getSavedVocab, saveVocab, deleteVocab } from "../services/api";

// Chỉ giữ 2 tab: Ý tưởng + Tổng kết
const TABS = [
  { id: "ideas", label: "Ý tưởng", icon: Lightbulb },
  { id: "vocab", label: "Tổng kết", icon: Layers },
];

export default function IELTSExploration() {
  const navigate = useNavigate();
  const { status, videoUrl, title, vocabCards, ideaBank } = useLesson();
  const [activeTab, setActiveTab] = useState("ideas");

  if (status !== "ready" || !vocabCards || !ideaBank) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl bg-white p-8 text-center shadow-sm">
          {status === "generating" ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
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
            className="mt-2 rounded-lg bg-pink-400 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500"
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
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-400">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Khai thác IELTS</h1>
            <p className="text-sm text-slate-500">
              Bài nghe:{" "}
              <span className="font-medium text-slate-700">{title || videoUrl || "—"}</span>
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="mb-6 flex gap-2 rounded-xl bg-white p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-pink-400 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "ideas" && <IdeaBankTab ideaBank={ideaBank} />}
        {activeTab === "vocab" && <VocabSummaryTab vocabCards={vocabCards} />}
      </div>
    </div>
  );
}

/* ==================== Tab 1: Ý tưởng (3 đề Writing Task 2 + dàn bài đầy đủ) ==================== */

function IdeaBankTab({ ideaBank }) {
  return (
    <div className="space-y-10">
      <p className="text-sm text-slate-500">
        Ý tưởng Writing Task 2 thực tế rút từ bài nghe — mỗi topic có{" "}
        <span className="font-medium text-slate-700">3 đề bài</span> kèm dàn bài đầy đủ.
      </p>

      {ideaBank.map((group) => (
        <div key={group.topic}>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">
              {group.topic}
            </h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Ý tưởng gốc từ video */}
          {group.ideas?.length > 0 && (
            <div className="mb-6 space-y-3">
              {group.ideas.map((idea, idx) => (
                <div key={idx} className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="mb-3 flex gap-2 rounded-lg bg-slate-50 p-3">
                    <Quote className="h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-sm italic text-slate-700">{idea.en}</p>
                  </div>
                  <div className="mb-3 rounded-r-lg border-l-4 border-pink-400 bg-pink-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-pink-600">
                      Cách áp dụng vào bài viết
                    </p>
                    <p className="text-sm text-slate-700">{idea.application}</p>
                  </div>
                  <div className="rounded-r-lg border-l-4 border-emerald-500 bg-emerald-50 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      <PenLine className="h-3.5 w-3.5" /> Câu mẫu Writing
                    </p>
                    <p className="text-sm text-slate-700">{idea.sample}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3 đề Writing Task 2 */}
          {(group.task2Questions || (group.task2Question ? [{ question: group.task2Question, task2Outline: group.task2Outline }] : [])).map(
            (item, qIdx) => (
              <Task2Card key={qIdx} item={item} index={qIdx} />
            )
          )}
        </div>
      ))}
    </div>
  );
}

function Task2Card({ item, index }) {
  const [open, setOpen] = useState(index === 0);
  const outline = item.task2Outline;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header — đề bài */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-600">
          {index + 1}
        </span>
        <p className="flex-1 text-sm font-semibold text-slate-900">{item.question}</p>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {open && outline && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
          {/* Thesis */}
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              Luận điểm chính (Thesis)
            </p>
            <p className="text-sm text-slate-800 font-medium">{outline.thesis}</p>
          </div>

          {/* Body paragraphs */}
          {outline.bodyParagraphs?.map((para, pIdx) => (
            <div
              key={pIdx}
              className="rounded-r-lg border-l-4 border-pink-300 bg-pink-50 p-4 space-y-2"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-pink-600">
                Đoạn thân bài {pIdx + 1}
              </p>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-0.5">📌 Luận điểm</p>
                <p className="text-sm text-slate-800">{para.mainPoint}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-0.5">💡 Giải thích</p>
                <p className="text-sm text-slate-700">{para.explanation}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-0.5">📖 Ví dụ</p>
                <p className="text-sm italic text-slate-700">{para.example}</p>
              </div>

              {para.realWorld && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-0.5">🌍 Liên hệ thực tế</p>
                  <p className="text-sm text-slate-700">{para.realWorld}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== Tab 2: Tổng kết (Vocab nâng cao với đầy đủ context) ==================== */

function VocabSummaryTab({ vocabCards }) {
  const { lessonId } = useLesson();
  const [expanded, setExpanded] = useState({});
  const [saved, setSaved] = useState({});
  const [loadingWord, setLoadingWord] = useState(null);

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

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

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

  // Phát âm bằng Web Speech API
  const speak = (word) => {
    if (!window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = "en-US";
    utt.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  };

  const WORD_TYPE_COLORS = {
    "topic-vocab": "bg-blue-50 text-blue-600",
    "phrasal verb": "bg-amber-50 text-amber-700",
    "collocation": "bg-emerald-50 text-emerald-700",
    "idiom": "bg-purple-50 text-purple-700",
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Từ vựng & cụm từ từ bài nghe — bao gồm loại từ, chủ đề áp dụng, ví dụ thực tế, và gợi ý
        dùng trong <span className="font-medium text-slate-700">Writing & Speaking</span>.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {vocabCards.map((card) => {
          const isExpanded = !!expanded[card.id];
          const isSaved = !!saved[card.id];
          const isLoading = loadingWord === card.id;
          const typeColor =
            WORD_TYPE_COLORS[card.wordType?.toLowerCase()] || "bg-slate-100 text-slate-600";

          return (
            <div
              key={card.id}
              className="flex flex-col rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Word header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{card.word}</h3>
                  <button
                    onClick={() => speak(card.word)}
                    title="Nghe phát âm"
                    className="mt-0.5 flex items-center gap-1 text-sm text-slate-400 hover:text-pink-500 transition-colors"
                  >
                    <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>{card.phonetic}</span>
                  </button>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {card.wordType && (
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${typeColor}`}>
                      {card.wordType}
                    </span>
                  )}
                  {card.topic && (
                    <span className="flex items-center gap-1 rounded-lg bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-500">
                      <Tag className="h-3 w-3" />
                      {card.topic}
                    </span>
                  )}
                </div>
              </div>

              <p className="mb-3 text-sm font-medium text-slate-700">{card.meaning}</p>

              {/* Expand button */}
              <button
                onClick={() => toggleExpand(card.id)}
                className="mb-3 flex items-center gap-1 self-start text-xs font-medium text-pink-500 hover:text-pink-600"
              >
                {isExpanded ? "Ẩn chi tiết" : "Xem chi tiết"}
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {isExpanded && (
                <div className="mb-4 space-y-2.5">
                  {/* Câu ví dụ thực tế */}
                  {card.example && (
                    <div className="flex gap-2 rounded-lg bg-slate-50 p-3">
                      <Quote className="h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="mb-0.5 text-xs font-semibold text-slate-500">Ví dụ thực tế</p>
                        <p className="text-sm italic text-slate-700">{card.example}</p>
                      </div>
                    </div>
                  )}

                  {/* Câu gốc trong transcript */}
                  {card.source && (
                    <div className="flex gap-2 rounded-lg bg-amber-50 p-3">
                      <BookOpen className="h-4 w-4 shrink-0 text-amber-500" />
                      <div>
                        <p className="mb-0.5 text-xs font-semibold text-amber-700">Câu gốc trong bài</p>
                        <p className="text-sm italic text-slate-600">{card.source}</p>
                      </div>
                    </div>
                  )}

                  {/* Collocations */}
                  {card.collocations?.length > 0 && (
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="mb-1.5 text-xs font-semibold text-blue-700">
                        Collocations liên quan
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {card.collocations.map((c, i) => (
                          <span
                            key={i}
                            className="rounded-md border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Writing & Speaking */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {card.writingUse && (
                      <div className="rounded-r-lg border-l-4 border-emerald-500 bg-emerald-50 p-3">
                        <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                          <PenLine className="h-3.5 w-3.5" /> Writing
                        </p>
                        <p className="text-xs text-slate-700">{card.writingUse}</p>
                      </div>
                    )}
                    {card.speakingUse && (
                      <div className="rounded-r-lg border-l-4 border-pink-400 bg-pink-50 p-3">
                        <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-pink-600">
                          <Link2 className="h-3.5 w-3.5" /> Speaking
                        </p>
                        <p className="text-xs text-slate-700">{card.speakingUse}</p>
                      </div>
                    )}
                  </div>

                  {/* Tip chung */}
                  {card.tip && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">💡 Tip: </span>
                        {card.tip}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Save button */}
              <button
                onClick={() => toggleSave(card)}
                disabled={isLoading}
                className={`mt-auto flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                  isSaved
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-pink-400 text-white hover:bg-pink-500"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSaved ? (
                  <>
                    <BookmarkCheck className="h-4 w-4" strokeWidth={2} /> Đã lưu
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" strokeWidth={2} /> Lưu vào kho từ vựng
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

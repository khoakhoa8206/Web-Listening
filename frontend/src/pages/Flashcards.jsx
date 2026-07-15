import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  AlertTriangle,
  PartyPopper,
  BookMarked,
} from "lucide-react";
import { getDueVocab, reviewVocab } from "../services/api";

// Trang ôn từ vựng kiểu spaced-repetition (Leitner box). Chỉ hiện những từ ĐẾN HẠN ôn lại
// (next_review <= hôm nay). Trả lời đúng -> lên box tiếp theo (ôn lại xa hơn). Trả lời sai ->
// quay về box 1 (ôn lại sớm, ngay ngày mai).
export default function Flashcards() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    getDueVocab()
      .then(setCards)
      .catch((err) => {
        console.error("getDueVocab error:", err);
        setError("Không tải được danh sách từ cần ôn. Kiểm tra backend đã chạy chưa.");
      })
      .finally(() => setLoading(false));
  }, []);

  const current = cards[index];
  const total = cards.length;

  const handleAnswer = async (correct) => {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await reviewVocab(current.word, correct);
    } catch (err) {
      console.error("reviewVocab error:", err);
    } finally {
      setSubmitting(false);
      setDoneCount((c) => c + 1);
      setFlipped(false);
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Layers className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Ôn từ vựng</h1>
            <p className="text-sm text-slate-500">
              {loading ? "Đang tải..." : total > 0 ? `${doneCount}/${total} từ đến hạn ôn hôm nay` : "Không có từ nào đến hạn"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">Đang tải thẻ ôn tập...</p>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-10 text-center shadow-sm">
            <PartyPopper className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-slate-700">
              Không còn từ nào đến hạn ôn hôm nay. Quay lại sau nhé!
            </p>
            <button
              onClick={() => navigate("/vocab")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <BookMarked size={16} strokeWidth={2} />
              Xem kho từ vựng
            </button>
          </div>
        ) : !current ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-10 text-center shadow-sm">
            <PartyPopper className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-slate-700">
              Xong hết {total} từ đến hạn hôm nay! Làm tốt lắm.
            </p>
            <button
              onClick={() => navigate("/vocab")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <BookMarked size={16} strokeWidth={2} />
              Xem kho từ vựng
            </button>
          </div>
        ) : (
          <>
            {/* Thanh tiến độ */}
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${(doneCount / total) * 100}%` }}
              />
            </div>

            {/* Thẻ flashcard */}
            <button
              onClick={() => setFlipped((f) => !f)}
              className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              {!flipped ? (
                <>
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                    Box {current.box || 1}
                  </span>
                  <p className="text-2xl font-bold text-slate-900">{current.word}</p>
                  {current.phonetic && <p className="text-sm text-slate-400">{current.phonetic}</p>}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                    <RotateCw className="h-3.5 w-3.5" />
                    Bấm để xem nghĩa
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-slate-900">{current.word}</p>
                  {current.meaning && <p className="text-sm text-slate-700">{current.meaning}</p>}
                  {current.source && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm italic text-slate-600">
                      {current.source}
                    </p>
                  )}
                </>
              )}
            </button>

            {/* Đáp án */}
            {flipped && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleAnswer(false)}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  <ThumbsDown size={16} strokeWidth={2} />
                  Chưa nhớ
                </button>
                <button
                  onClick={() => handleAnswer(true)}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <ThumbsUp size={16} strokeWidth={2} />
                  Đã nhớ
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

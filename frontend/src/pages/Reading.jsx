import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpenText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useLesson } from "../context/LessonContext";
import { saveProgress } from "../services/api";

const TF_OPTIONS = ["True", "False", "Not Given"];

export default function Reading() {
  const navigate = useNavigate();
  const { lessonId, status, title, readingPassage } = useLesson();
  const [answers, setAnswers] = useState({});
  const startTimeRef = useRef(Date.now());
  const savedRef = useRef(false);

  const questions = readingPassage?.questions || [];

  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every((q) => answers[q.id] !== undefined),
    [answers, questions]
  );

  useEffect(() => {
    if (!allAnswered || savedRef.current || !lessonId) return;
    savedRef.current = true;
    const correct = questions.filter((q) => {
      const given = answers[q.id];
      return q.type === "mcq" ? given === q.correctIndex : given === q.answer;
    }).length;
    const scoreOnNine = +((correct / questions.length) * 9).toFixed(1);
    const minutes = +((Date.now() - startTimeRef.current) / 60000).toFixed(1);
    saveProgress({ lessonId, type: "Reading", score: scoreOnNine, minutes }).catch((err) =>
      console.error("saveProgress error:", err)
    );
  }, [allAnswered, answers, lessonId, questions]);

  // -- Trạng thái chưa có bài học / chưa có readingPassage -----------------
  if (status !== "ready" || !readingPassage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl bg-white p-8 text-center shadow-sm">
          {status === "generating" ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-700">AI đang soạn bài đọc...</p>
            </>
          ) : status === "error" ? (
            <>
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium text-slate-700">Tạo bài đọc thất bại.</p>
            </>
          ) : status === "ready" && !readingPassage ? (
            <p className="text-sm text-slate-500">
              Bài học này chưa có phần Reading (có thể được tạo trước khi tính năng này ra mắt).
            </p>
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

  const correctCount = questions.filter((q) => {
    const given = answers[q.id];
    return q.type === "mcq" ? given === q.correctIndex : given === q.answer;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <BookOpenText className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Luyện Reading</h1>
            <p className="text-sm text-slate-500">
              Dựa trên chủ đề: <span className="font-medium text-slate-700">{title || "—"}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Đoạn văn */}
          <div className="rounded-xl bg-white p-6 shadow-sm lg:sticky lg:top-20 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <h2 className="mb-4 text-lg font-bold text-slate-900">{readingPassage.title}</h2>
            <div className="space-y-4">
              {readingPassage.paragraphs?.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-slate-700">
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* Câu hỏi */}
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Trả lời các câu hỏi dưới đây chỉ dựa vào đoạn văn bên trái.
            </p>

            {questions.map((q, idx) => {
              if (q.type === "mcq") {
                const selected = answers[q.id];
                const answered = selected !== undefined;
                return (
                  <div key={q.id} className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="mb-3 text-sm font-medium text-slate-900">
                      {idx + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options?.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correctIndex;
                        const isSelected = selected === oIdx;
                        let style =
                          "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50";
                        if (answered && isCorrect) style = "border-emerald-600 bg-emerald-50 text-emerald-700";
                        else if (answered && isSelected && !isCorrect) style = "border-rose-400 bg-rose-50 text-rose-600";
                        else if (answered) style = "border-slate-200 text-slate-400";
                        return (
                          <button
                            key={oIdx}
                            disabled={answered}
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oIdx }))}
                            className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${style}`}
                          >
                            <span>{opt}</span>
                            {answered && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                            {answered && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-rose-500" />}
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
                      <div className="mt-3 rounded-r-lg border-l-4 border-emerald-600 bg-emerald-50 p-3">
                        <p className="text-sm text-slate-700">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              }

              // true_false_notgiven
              const selected = answers[q.id];
              const answered = selected !== undefined;
              const isCorrect = answered && selected === q.answer;
              return (
                <div key={q.id} className="rounded-xl bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-medium text-slate-900">
                    {idx + 1}. {q.statement}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TF_OPTIONS.map((opt) => {
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
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã lưu kết quả Reading của bạn.
                </span>
                <span>
                  {correctCount}/{questions.length} câu đúng
                </span>
              </div>
            )}

            <button
              onClick={() => navigate("/exploration")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Sang phần Khai thác (Writing/Từ vựng/Speaking)
              <ArrowRight size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

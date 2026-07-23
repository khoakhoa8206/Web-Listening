import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookMarked,
  Search,
  Trash2,
  Volume2,
  Quote,
  Loader2,
  AlertTriangle,
  Sparkles,
  Download,
  Layers,
} from "lucide-react";
import { getSavedVocab, deleteVocab } from "../services/api";

// Phần 5.3 — Xuất từ vựng ra CSV/Anki để học ngoài app. Làm hoàn toàn ở client (không cần backend).
function downloadTextFile(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportVocabCsv(vocab) {
  const header = ["word", "phonetic", "meaning", "tip", "source"];
  const lines = [header.join(",")];
  for (const v of vocab) {
    lines.push(header.map((k) => csvEscape(v[k])).join(","));
  }
  downloadTextFile("vocab_kho_tu_vung.csv", lines.join("\n"), "text/csv");
}

// Anki hỗ trợ import file .txt phân tách bằng Tab, cột 1 = Front, cột 2 = Back.
function exportVocabAnki(vocab) {
  const lines = vocab.map((v) => {
    const front = v.word || "";
    const back = [v.meaning, v.phonetic ? `(${v.phonetic})` : "", v.tip ? `Gợi ý: ${v.tip}` : ""]
      .filter(Boolean)
      .join("<br>")
      .replace(/\t/g, " ");
    return `${front.replace(/\t/g, " ")}\t${back}`;
  });
  downloadTextFile("vocab_anki_deck.txt", lines.join("\n"), "text/plain");
}

export default function VocabBank() {
  const navigate = useNavigate();
  const [vocab, setVocab] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [deletingWord, setDeletingWord] = useState(null);

  useEffect(() => {
    setLoading(true);
    getSavedVocab()
      .then(setVocab)
      .catch((err) => {
        console.error("getSavedVocab error:", err);
        setError("Không tải được kho từ vựng. Kiểm tra backend đã chạy ở :8787 chưa.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vocab;
    return vocab.filter(
      (v) =>
        v.word?.toLowerCase().includes(q) ||
        v.meaning?.toLowerCase().includes(q)
    );
  }, [vocab, query]);

  const handleDelete = async (word) => {
    setDeletingWord(word);
    try {
      await deleteVocab(word);
      setVocab((prev) => prev.filter((v) => v.word !== word));
    } catch (err) {
      console.error("deleteVocab error:", err);
    } finally {
      setDeletingWord(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-400">
              <BookMarked className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Kho từ vựng của bạn</h1>
              <p className="text-sm text-slate-500">
                {loading ? "Đang tải..." : `${vocab.length} từ đã lưu từ các bài học`}
              </p>
            </div>
          </div>

          {!loading && vocab.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate("/flashcards")}
                className="flex items-center gap-1.5 rounded-lg bg-pink-400 px-3 py-2 text-xs font-semibold text-white hover:bg-pink-500"
              >
                <Layers size={14} strokeWidth={2} />
                Ôn từ (Flashcard)
              </button>
              <button
                onClick={() => exportVocabCsv(vocab)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Download size={14} strokeWidth={2} />
                Xuất CSV
              </button>
              <button
                onClick={() => exportVocabAnki(vocab)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Download size={14} strokeWidth={2} />
                Xuất Anki
              </button>
            </div>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo từ hoặc nghĩa..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-300"
          />
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
            <p className="text-sm text-slate-500">Đang tải kho từ vựng...</p>
          </div>
        ) : vocab.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Bạn chưa lưu từ vựng nào. Vào tab "Từ vựng" trong 1 bài học và bấm "Lưu vào kho từ
              vựng" để thêm.
            </p>
            <button
              onClick={() => navigate("/videos")}
              className="flex items-center gap-2 rounded-lg bg-pink-400 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500"
            >
              <Sparkles size={16} strokeWidth={2} />
              Bắt đầu 1 bài học
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
            Không tìm thấy từ nào khớp với "{query}".
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((v) => (
              <div key={v.word} className="flex flex-col rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{v.word}</h3>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        Box {v.box || 1}
                      </span>
                    </div>
                    {v.phonetic && (
                      <p className="flex items-center gap-1 text-sm text-slate-400">
                        <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
                        {v.phonetic}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(v.word)}
                    disabled={deletingWord === v.word}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    title="Bỏ lưu từ này"
                  >
                    {deletingWord === v.word ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                </div>

                {v.meaning && <p className="mb-3 text-sm text-slate-700">{v.meaning}</p>}

                {v.source && (
                  <div className="mb-2 flex gap-2 rounded-lg bg-slate-50 p-3">
                    <Quote className="h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-sm italic text-slate-600">{v.source}</p>
                  </div>
                )}

                {v.tip && (
                  <div className="rounded-r-lg border-l-4 border-pink-400 bg-pink-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-pink-600">
                      Gợi ý Speaking
                    </p>
                    <p className="text-sm text-slate-700">{v.tip}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Volume2, BookMarked, X, AlertTriangle } from "lucide-react";
import { saveVocab } from "../services/api";
import { useLesson } from "../context/LessonContext";
import { useHighlight } from "../hooks/useHighlight";
import HighlightToolbar from "../components/HighlightToolbar";

// Gọi Gemini backend để lấy thông tin một từ
async function fetchWordInfo(word) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL || "http://localhost:8787"}/api/news/word-info`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word }),
    }
  );
  return res.json();
  // Trả về: { phonetic, meaning, example }
}

// Gọi Gemini backend để fetch + clean bài báo từ URL
async function fetchArticleFromUrl(url) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL || "http://localhost:8787"}/api/news/fetch-article`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }
  );
  return res.json();
  // Trả về: { title, text }
}

// Token hóa văn bản thành mảng {id, text, isWord}
function tokenize(text) {
  const parts = text.split(/(\s+|[.,!?;:"'()[\]{}<>—–-]+)/);
  return parts
    .filter((p) => p.length > 0)
    .map((p, i) => ({
      id: i,
      text: p,
      isWord: /^[a-zA-Z''-]{2,}$/.test(p),
    }));
}

export default function NewsReader() {
  const navigate = useNavigate();
  const { lessonId } = useLesson();

  const [articleTitle, setArticleTitle] = useState("");
  const [words, setWords] = useState([]); // mảng token: { id, text, isWord }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Popup hover
  const [popup, setPopup] = useState(null); // null | { word, x, y, loading, data }
  const popupRef = useRef(null);
  const hoverTimer = useRef(null);

  // Highlight (Yêu cầu 3)
  const articleRef = useRef(null);
  const [articleSlug, setArticleSlug] = useState("draft");
  const { highlights, addHighlight } = useHighlight(`highlights_news_${articleSlug}`);

  // Xử lý nội dung bài báo từ sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("news_draft");

    async function loadArticle() {
      if (!raw) {
        setError("Không có bài báo nào. Vui lòng quay lại và chọn bài.");
        setLoading(false);
        return;
      }
      const draft = JSON.parse(raw);

      try {
        let title = draft.source || "Bài báo";
        let text = draft.rawText || "";

        if (draft.isUrl) {
          const result = await fetchArticleFromUrl(draft.source);
          title = result.title || draft.source;
          text = result.text || "";
        }

        setArticleTitle(title);
        setArticleSlug(title.slice(0, 30).replace(/\s+/g, "_") || "draft");
        // Token hóa: tách thành từ và ký tự đặc biệt
        setWords(tokenize(text));
      } catch {
        setError("Không thể tải bài báo. Thử dán nội dung trực tiếp.");
      } finally {
        setLoading(false);
      }
    }
    loadArticle();
  }, []);

  // Hover vào từ → hiện popup sau 300ms
  const handleWordHover = useCallback((e, word) => {
    clearTimeout(hoverTimer.current);
    const rect = e.target.getBoundingClientRect();
    hoverTimer.current = setTimeout(async () => {
      setPopup({ word, x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY + 8, loading: true, data: null });
      try {
        const data = await fetchWordInfo(word);
        setPopup((prev) => prev?.word === word ? { ...prev, loading: false, data } : prev);
      } catch {
        setPopup((prev) => prev?.word === word ? { ...prev, loading: false, data: null } : prev);
      }
    }, 300);
  }, []);

  const handleWordLeave = useCallback(() => {
    clearTimeout(hoverTimer.current);
  }, []);

  // Phát âm từ bằng Web Speech API
  function speak(word) {
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = "en-US";
    speechSynthesis.speak(utt);
  }

  // Lưu từ vào VocabBank
  async function handleSaveWord(wordData) {
    try {
      await saveVocab({
        word: wordData.word,
        phonetic: wordData.data?.phonetic || "",
        meaning: wordData.data?.meaning || "",
        tip: wordData.data?.example || "",
        source: articleTitle,
        lessonId: lessonId || null,
      });
      setPopup(null);
    } catch (err) {
      console.error("saveVocab error:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
        <span className="ml-3 text-slate-600">Đang tải bài báo...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-slate-600">{error}</p>
        <button onClick={() => navigate("/videos?news=1")} className="rounded-lg bg-pink-400 px-4 py-2 text-sm text-white">
          ← Quay lại chọn bài
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-pink-400">📰 News</span>
            <h1 className="mt-1 text-xl font-bold text-slate-800">{articleTitle}</h1>
          </div>
          <button
            onClick={() => navigate("/videos")}
            className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
          >
            ← Chọn bài khác
          </button>
        </div>

        {/* Hướng dẫn */}
        <p className="mb-6 rounded-xl bg-pink-50 px-4 py-3 text-sm text-pink-700">
          💡 Di chuột vào một từ và dừng lại — popup nghĩa sẽ hiện ra. Bạn có thể phát âm và lưu từ vào kho từ vựng. Bôi đen đoạn văn để highlight.
        </p>

        {/* Highlight toolbar + Nội dung bài báo */}
        <HighlightToolbar
          containerRef={articleRef}
          onHighlight={({ text, color }) => addHighlight({ text, color })}
        />
        <div ref={articleRef} className="rounded-2xl bg-white p-6 shadow-sm text-base leading-8 text-slate-700 select-text relative">
          {words.map((token) => {
            if (!token.isWord) {
              return <span key={token.id}>{token.text}</span>;
            }
            const isHighlighted = highlights.find((h) =>
              h.text.toLowerCase().includes(token.text.toLowerCase())
            );
            return (
              <span
                key={token.id}
                style={isHighlighted ? { backgroundColor: isHighlighted.color } : {}}
                className={`cursor-pointer rounded hover:bg-pink-100 hover:text-pink-700 transition-colors px-0.5`}
                onMouseEnter={(e) => handleWordHover(e, token.text)}
                onMouseLeave={handleWordLeave}
              >
                {token.text}
              </span>
            );
          })}
        </div>

        {/* Liên kết sang các tính năng khác (giống listening) */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => navigate("/reading")} className="rounded-xl border border-pink-200 px-4 py-2 text-sm text-pink-600 hover:bg-pink-50">
            📝 Reading
          </button>
          <button onClick={() => navigate("/exploration")} className="rounded-xl border border-pink-200 px-4 py-2 text-sm text-pink-600 hover:bg-pink-50">
            🔭 Explore
          </button>
          <button onClick={() => navigate("/vocab")} className="rounded-xl border border-pink-200 px-4 py-2 text-sm text-pink-600 hover:bg-pink-50">
            📚 Vocabulary
          </button>
        </div>
      </div>

      {/* Popup hover */}
      {popup && (
        <div
          ref={popupRef}
          style={{ position: "absolute", left: popup.x, top: popup.y, transform: "translateX(-50%)", zIndex: 1000 }}
          className="w-72 rounded-2xl bg-white shadow-xl border border-pink-100 p-4"
          onMouseEnter={() => clearTimeout(hoverTimer.current)}
          onMouseLeave={() => setPopup(null)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800 text-base">{popup.word}</span>
            <button onClick={() => setPopup(null)}><X size={16} className="text-slate-400" /></button>
          </div>

          {popup.loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tra...
            </div>
          ) : popup.data ? (
            <>
              {popup.data.phonetic && (
                <p className="text-sm text-slate-400 mb-1">{popup.data.phonetic}</p>
              )}
              {popup.data.meaning && (
                <p className="text-sm text-slate-700 mb-2">{popup.data.meaning}</p>
              )}
              {popup.data.example && (
                <p className="text-xs italic text-slate-400 mb-3">"{popup.data.example}"</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => speak(popup.word)}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200"
                >
                  <Volume2 size={13} /> Phát âm
                </button>
                <button
                  onClick={() => handleSaveWord(popup)}
                  className="flex items-center gap-1 rounded-lg bg-pink-400 px-3 py-1.5 text-xs text-white hover:bg-pink-500"
                >
                  <BookMarked size={13} /> Lưu từ
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Không tra được từ này.</p>
          )}
        </div>
      )}
    </div>
  );
}
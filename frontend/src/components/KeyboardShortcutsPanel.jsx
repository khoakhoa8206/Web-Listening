import { useState, useEffect } from "react";
import { Keyboard, X } from "lucide-react";

const LABELS = {
  togglePlay: "Tạm dừng / Phát",
  prevSentence: "Lùi về câu trước",
  nextSentence: "Tiến sang câu tiếp",
};

export default function KeyboardShortcutsPanel({ shortcuts, onUpdate, onReset }) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(null); // action đang chờ phím

  function formatKey(key) {
    if (key === " " || key === "Space") return "[ Space ]";
    if (key === "ArrowLeft") return "[ ← ]";
    if (key === "ArrowRight") return "[ → ]";
    if (key === "ArrowUp") return "[ ↑ ]";
    if (key === "ArrowDown") return "[ ↓ ]";
    return `[ ${key} ]`;
  }

  useEffect(() => {
    if (!listening) return;
    function handleKeyCapture(e) {
      e.preventDefault();
      e.stopPropagation();
      const key = e.key === " " ? "Space" : e.key;
      onUpdate(listening, key);
      setListening(null);
    }
    window.addEventListener("keydown", handleKeyCapture, true);
    return () => window.removeEventListener("keydown", handleKeyCapture, true);
  }, [listening, onUpdate]);

  return (
    <>
      {/* Nút mở panel */}
      <button
        onClick={() => setOpen(true)}
        title="Cài đặt phím tắt"
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:border-pink-300 hover:text-pink-500 transition-colors"
      >
        <Keyboard size={15} /> Phím tắt
      </button>

      {/* Modal cài đặt */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-96 rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Keyboard size={18} /> Cài đặt phím tắt
              </h3>
              <button onClick={() => { setOpen(false); setListening(null); }}>
                <X size={18} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Click vào ô phím, sau đó bấm phím bạn muốn gán.
            </p>

            <div className="flex flex-col gap-3">
              {Object.entries(LABELS).map(([action, label]) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{label}</span>
                  <button
                    onClick={() => setListening(action)}
                    className={`min-w-[110px] rounded-lg border-2 px-3 py-1.5 text-sm font-mono font-semibold transition-all ${
                      listening === action
                        ? "border-pink-400 bg-pink-50 text-pink-600 animate-pulse"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-pink-300"
                    }`}
                  >
                    {listening === action ? "Bấm phím..." : formatKey(shortcuts[action])}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => { onReset(); }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Đặt lại mặc định
              </button>
              <button
                onClick={() => { setOpen(false); setListening(null); }}
                className="rounded-xl bg-pink-400 px-5 py-2 text-sm text-white hover:bg-pink-500"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
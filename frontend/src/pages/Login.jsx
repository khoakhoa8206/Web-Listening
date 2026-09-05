import { useState } from "react";

const ALLOWED_USERS = ["Hoagttho1411", "Lytran202"];
export const USER_STORAGE_KEY = "app_current_user";

export default function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const trimmed = name.trim();
    const match = ALLOWED_USERS.find(u => u.toLowerCase() === trimmed.toLowerCase());
    if (match) {
      localStorage.setItem(USER_STORAGE_KEY, match);
      onLogin(match);
    } else {
      setError("Tên không đúng. Vui lòng thử lại.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-slate-100">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-8 flex flex-col gap-5">
        <div className="text-center">
          <div className="text-4xl mb-2">🎧</div>
          <h1 className="text-2xl font-bold text-slate-800">IELTS Listening</h1>
          <p className="text-sm text-slate-400 mt-1">Nhập tên để vào ứng dụng</p>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tên người dùng</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Nhập tên của bạn..."
            autoFocus
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-pink-400 focus:outline-none"
          />
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full rounded-xl bg-pink-400 py-2.5 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50 transition-colors"
        >
          Vào ứng dụng →
        </button>
      </div>
    </div>
  );
}
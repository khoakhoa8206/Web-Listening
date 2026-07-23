import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { LessonProvider, useLesson } from "./context/LessonContext";
import MainDashboard from "./pages/MainDashboard";
import VideoSelection from "./pages/VideoSelection";
import ListeningWorkspace from "./pages/ListeningWorkspace";
import Reading from "./pages/Reading";
import IELTSExploration from "./pages/IELTSExploration";
import AnalyticsReport from "./pages/AnalyticsReport";
import VocabBank from "./pages/VocabBank";
import Flashcards from "./pages/Flashcards";
import LoadingScreen from "./components/LoadingScreen";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/videos", label: "Chọn bài học" },
  { to: "/listening", label: "Luyện nghe" },
  { to: "/reading", label: "Đọc" },
  { to: "/exploration", label: "Khai thác" },
  { to: "/vocab", label: "Từ vựng" },
  { to: "/flashcards", label: "Ôn từ" },
  { to: "/analytics", label: "Báo cáo" },
];

function AppInner() {
  const { status, saveToast } = useLesson();

  return (
    <>
      {status === "generating" && <LoadingScreen />}

      {/* Save toast notification */}
      {saveToast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            saveToast === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {saveToast === "success" ? (
            <><CheckCircle2 className="h-4 w-4" /> Đã lưu bài tập thành công!</>
          ) : (
            <><AlertTriangle className="h-4 w-4" /> Lưu thất bại, thử lại nhé.</>
          )}
        </div>
      )}

      <nav className="sticky top-0 z-40 flex flex-wrap gap-1 bg-white px-4 py-2 shadow-sm border-b border-pink-100">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-pink-400 text-white"
                  : "text-slate-600 hover:bg-pink-50 hover:text-pink-500"
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/videos" element={<VideoSelection />} />
        <Route path="/listening" element={<ListeningWorkspace />} />
        <Route path="/reading" element={<Reading />} />
        <Route path="/exploration" element={<IELTSExploration />} />
        <Route path="/vocab" element={<VocabBank />} />
        <Route path="/flashcards" element={<Flashcards />} />
        <Route path="/analytics" element={<AnalyticsReport />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <LessonProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </LessonProvider>
  );
}

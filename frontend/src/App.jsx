import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { LessonProvider } from "./context/LessonContext";
import MainDashboard from "./pages/MainDashboard";
import VideoSelection from "./pages/VideoSelection";
import ListeningWorkspace from "./pages/ListeningWorkspace";
import Reading from "./pages/Reading";
import IELTSExploration from "./pages/IELTSExploration";
import AnalyticsReport from "./pages/AnalyticsReport";
import VocabBank from "./pages/VocabBank";
import Flashcards from "./pages/Flashcards";

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

export default function App() {
  return (
    <LessonProvider>
      <BrowserRouter>
        <nav className="sticky top-0 z-50 flex gap-1 bg-white px-4 py-2 shadow-sm">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
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
      </BrowserRouter>
    </LessonProvider>
  );
}

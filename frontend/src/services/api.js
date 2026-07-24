import axios from "axios";

// Ở local dev, tạo frontend/.env với VITE_API_URL=http://localhost:8787 nếu muốn override.
// Khi deploy Netlify, set biến VITE_API_URL trong Site settings -> Environment variables
// (vd: https://ielts-backend.onrender.com — KHÔNG kèm /api, phần /api được thêm ở dưới).
const API_HOST = import.meta.env.VITE_API_URL || "http://localhost:8787";
const baseURL = `${API_HOST.replace(/\/+$/, "")}/api`;

const api = axios.create({ baseURL });

// Mã PIN tuỳ chọn (chỉ có tác dụng nếu backend có set APP_PIN) — lưu ở localStorage sau khi người
// dùng nhập lần đầu, tự động đính kèm vào các request tốn quota (tạo bài học, tìm video).
const PIN_STORAGE_KEY = "ielts_app_pin";

api.interceptors.request.use((config) => {
  const pin = localStorage.getItem(PIN_STORAGE_KEY);
  if (pin) config.headers["x-app-pin"] = pin;
  return config;
});

// Nếu backend từ chối vì thiếu/sai PIN, hỏi người dùng 1 lần rồi tự thử lại request đó.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;
    if (status === 401 && original && !original._pinRetried) {
      const entered = window.prompt("Nhập mã PIN để tiếp tục (do người quản trị app cấp):");
      if (entered) {
        localStorage.setItem(PIN_STORAGE_KEY, entered.trim());
        original._pinRetried = true;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

// Kiểm tra 1 link YouTube có phụ đề (transcript) hay không — chỉ dùng làm fallback âm thầm
// (hay bị lỗi do YouTube chặn IP server), KHÔNG còn là điều kiện bắt buộc để tạo bài.
export const checkTranscript = (url) =>
  api.post("/videos/check-transcript", { url }).then((r) => r.data);
// -> { hasTranscript: boolean, transcript?: string }

// Phần 6.1 — Luồng chính để lấy transcript: lấy videoId + link mở sẵn sang youtubetotranscript.com
// (người dùng tự bấm Copy bên đó rồi dán ngược lại vào app)
export const getTranscriptLink = (url) =>
  api.get("/videos/transcript-link", { params: { url } }).then((r) => r.data);
// -> { videoId, transcriptSiteUrl }

// Tìm video THẬT trên YouTube theo từ khóa / chủ đề (thay cho thư viện mẫu)
export const searchVideos = (q, topic) =>
  api.get("/videos/search", { params: { q, topic } }).then((r) => r.data.videos);

// Sinh TOÀN BỘ bài học (dictation + writing + vocab + idea bank + true/false + reading + speaking) từ 1 lần gọi Gemini
// questionCount: "it" | "vua" | "nhieu" — số lượng blank trong dictation, độc lập với band (độ khó)
export const generateLesson = (videoUrl, transcript, topic, band, questionCount) =>
  api
    .post("/lessons/generate", { videoUrl, transcript, topic, band, questionCount })
    .then((r) => r.data);

// Lấy lại 1 bài học đã tạo trước đó (dùng cho nút "Làm lại", không gọi lại Gemini)
export const getLesson = (lessonId) => api.get(`/lessons/${lessonId}`).then((r) => r.data);

// Lưu tiến độ làm bài (điểm, thời gian, loại kỹ năng) sau khi hoàn thành 1 phần bài học
export const saveProgress = (payload) =>
  api.post("/progress/save", payload).then((r) => r.data);
// payload: { lessonId, type, score, minutes }

// Lấy lịch sử tiến độ (thật) cho MainDashboard / AnalyticsReport
export const getProgress = () => api.get("/progress").then((r) => r.data);

// Lấy số liệu tổng hợp (band trung bình, streak, số phút, ...) theo khoảng thời gian
export const getProgressSummary = (range = "week") =>
  api.get("/progress/summary", { params: { range } }).then((r) => r.data);

// Kho từ vựng đã lưu
export const getSavedVocab = () => api.get("/vocab").then((r) => r.data);
export const saveVocab = (payload) => api.post("/vocab/save", payload).then((r) => r.data);
export const deleteVocab = (word) => api.delete(`/vocab/${encodeURIComponent(word)}`).then((r) => r.data);

// Phần 5.1 — Flashcard ôn từ vựng kiểu Leitner box (spaced repetition)
export const getDueVocab = () => api.get("/vocab/due").then((r) => r.data);
export const reviewVocab = (word, correct) =>
  api.post("/vocab/review", { word, correct }).then((r) => r.data);

// Phần 5.5 — Speaking chấm bằng AI (transcript từ Web Speech API -> Gemini chấm theo band descriptor)
export const gradeSpeaking = (promptText, transcript, part) =>
  api.post("/speaking/grade", { promptText, transcript, part }).then((r) => r.data);

export default api;

// Cold start ping — kiểm tra xem server có sẵn sàng chưa
export const pingHealth = () =>
  api.get("/health", { timeout: 5000 }).then((r) => r.data);

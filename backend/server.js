import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import videos from "./routes/videos.js";
import lessons from "./routes/lessons.js";
import progress from "./routes/progress.js";
import vocab from "./routes/vocab.js";
import speaking from "./routes/speaking.js";
import { initDb } from "./db.js";

dotenv.config();
const app = express();

// Render/Netlify chạy sau reverse proxy — cần trust proxy để req.ip lấy đúng IP thật của client
// (dùng cho cooldown chống spam tạo bài ở routes/lessons.js), không phải IP nội bộ của proxy.
app.set("trust proxy", 1);

// Chỉ cho phép domain Netlify thật của frontend gọi vào (không dùng "*" khi đã deploy công khai).
// FRONTEND_URL có thể chứa nhiều domain, phân tách bằng dấu phẩy (vd: domain chính + preview deploy).
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Riêng route /api/videos/cache-transcript được gọi từ chính trang youtube.com
// (qua bookmarklet — xem backend/BOOKMARKLET.html), nên cần mở CORS cho youtube.com
// CHỈ ở route này. Route này vẫn được khoá bằng PREFETCH_TOKEN nên vẫn an toàn.
const YOUTUBE_ORIGINS = ["https://www.youtube.com", "https://m.youtube.com"];

app.use(
  cors((req, callback) => {
    const isBookmarkletRoute = req.path === "/api/videos/cache-transcript";
    const extraOrigins = isBookmarkletRoute ? YOUTUBE_ORIGINS : [];
    callback(null, {
      origin(origin, cb) {
        // Cho phép request không có Origin (vd: curl, health check) và các domain trong danh sách.
        if (!origin || allowedOrigins.includes(origin) || extraOrigins.includes(origin)) {
          return cb(null, true);
        }
        cb(new Error("Domain không được phép (CORS)."));
      },
    });
  })
);
app.use(express.json());

app.use("/api/videos", videos);
app.use("/api/lessons", lessons);
app.use("/api/progress", progress);
app.use("/api/vocab", vocab);
app.use("/api/speaking", speaking);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Trả lỗi CORS (và các lỗi khác lọt tới đây) dạng JSON gọn, không lộ stack trace ra ngoài.
app.use((err, req, res, next) => {
  if (err?.message === "Domain không được phép (CORS).") {
    return res.status(403).json({ error: err.message });
  }
  console.error("Lỗi không xác định:", err);
  res.status(500).json({ error: "Đã có lỗi xảy ra ở server." });
});

const PORT = process.env.PORT || 8787;

// Kết nối + kiểm tra schema Postgres trước khi nhận request, để lỗi cấu hình DB hiện ngay ở log
// khởi động thay vì rơi vào request đầu tiên của người dùng.
initDb()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Backend chạy tại http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Không khởi tạo được database, dừng server:", err.message);
    process.exit(1);
  });

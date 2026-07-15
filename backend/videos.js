import { Router } from "express";
import { fetchTranscript, extractVideoId, searchVideos } from "../services/youtube.js";
import { requirePin } from "../middleware/requirePin.js";
import { getTranscriptCache, saveTranscriptCache } from "../services/transcriptCache.js";

const router = Router();

// Cache tìm kiếm YouTube trong bộ nhớ (theo topic/query), TTL vài giờ, để tránh hết quota free
// (~100 request/ngày) khi nhiều người dùng cùng chọn 1 chủ đề. Reset khi restart/redeploy —
// chấp nhận được vì mục tiêu chỉ là giảm tải trong 1 phiên chạy, không cần bền vững.
const SEARCH_CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 giờ
const searchCache = new Map(); // key -> { videos, expiresAt }

function getCached(key) {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return hit.videos;
}

function setCached(key, videos) {
  searchCache.set(key, { videos, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
}

// GET /api/videos/search?topic=Môi trường&q=climate change
// Tìm video THẬT trên YouTube, ưu tiên video có phụ đề, để hiện trong thư viện.
router.get("/search", requirePin, async (req, res) => {
  const { q = "", topic = "" } = req.query;

  const topicKeywordMap = {
    "Giáo dục": "education",
    "Môi trường": "environment climate",
    "Công nghệ": "technology",
    "Y tế": "healthcare medicine",
  };

  const baseQuery = q?.trim() || topicKeywordMap[topic] || "IELTS listening topics";
  const query = `${baseQuery} IELTS listening english lecture`;
  const cacheKey = query.toLowerCase();

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ videos: cached, cached: true });
  }

  try {
    const videos = await searchVideos(query, { maxResults: 12 });
    setCached(cacheKey, videos);
    res.json({ videos });
  } catch (err) {
    console.error("Lỗi /videos/search:", err.message);
    res.status(500).json({ error: err.message || "Không tìm được video." });
  }
});

// POST /api/videos/check-transcript { url }
// Lấy transcript THẬT của video qua youtube-transcript, không còn dữ liệu mẫu.
// Thứ tự ưu tiên: (1) cache bền vững trong Postgres — được nạp sẵn từ máy cá nhân
// qua route /cache-transcript bên dưới; (2) tự gọi YouTube trực tiếp (chỉ có tác dụng
// khi chạy local hoặc khi đã cấu hình YT_PROXY_URL, vì IP của Render bị YouTube chặn).
router.post("/check-transcript", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Thiếu url trong request body." });
  }

  const videoId = extractVideoId(url);

  if (videoId) {
    try {
      const dbCached = await getTranscriptCache(videoId);
      if (dbCached) {
        return res.json({ ...dbCached, source: "cache" });
      }
    } catch (err) {
      console.error("Lỗi đọc transcript_cache:", err.message);
      // Không chặn luồng chính nếu DB lỗi — vẫn thử fetch trực tiếp bên dưới.
    }
  }

  const { hasTranscript, transcript, error } = await fetchTranscript(url);

  if (videoId && hasTranscript) {
    saveTranscriptCache(videoId, url, hasTranscript, transcript).catch((err) =>
      console.error("Lỗi lưu transcript_cache:", err.message)
    );
  }

  if (!hasTranscript && error) {
    // Trả kèm gợi ý cho frontend: có thể do IP server bị YouTube chặn, cần nạp
    // transcript thủ công từ máy cá nhân qua script backend/scripts/prefetch-transcript.js
    return res.json({
      hasTranscript,
      transcript,
      hint:
        "Không lấy được transcript từ server (có thể do IP bị YouTube chặn). " +
        "Hãy chạy script backend/scripts/prefetch-transcript.js trên máy cá nhân để nạp transcript vào cache.",
    });
  }

  res.json({ hasTranscript, transcript });
});

// POST /api/videos/cache-transcript { url, transcript, hasTranscript }
// Route nội bộ để NẠP transcript đã lấy sẵn từ máy cá nhân (chạy script
// backend/scripts/prefetch-transcript.js) vào cache bền vững trong Postgres.
// Bảo vệ bằng header x-prefetch-token khớp với biến môi trường PREFETCH_TOKEN.
// Nếu chưa set PREFETCH_TOKEN, route này bị khoá hoàn toàn (an toàn theo mặc định).
router.post("/cache-transcript", async (req, res) => {
  const expectedToken = process.env.PREFETCH_TOKEN;
  if (!expectedToken) {
    return res.status(403).json({
      error: "Route bị khoá: chưa set biến môi trường PREFETCH_TOKEN trên server.",
    });
  }
  if (req.header("x-prefetch-token") !== expectedToken) {
    return res.status(401).json({ error: "Sai hoặc thiếu x-prefetch-token." });
  }

  const { url, transcript, hasTranscript } = req.body;
  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: "URL không hợp lệ, không lấy được videoId." });
  }

  try {
    await saveTranscriptCache(videoId, url, !!hasTranscript, transcript || null);
    res.json({ ok: true, videoId });
  } catch (err) {
    console.error("Lỗi /videos/cache-transcript:", err.message);
    res.status(500).json({ error: "Không lưu được vào cache." });
  }
});

export default router;

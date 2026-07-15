import { Router } from "express";
import { fetchTranscript, searchVideos } from "../services/youtube.js";
import { requirePin } from "../middleware/requirePin.js";

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
router.post("/check-transcript", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Thiếu url trong request body." });
  }

  const { hasTranscript, transcript } = await fetchTranscript(url);
  res.json({ hasTranscript, transcript });
});

export default router;

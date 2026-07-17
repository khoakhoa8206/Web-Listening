import { Router } from "express";
import { fetchTranscript, searchVideos, extractVideoId, buildTranscriptSiteUrl } from "../services/youtube.js";
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

// GET /api/videos/transcript-link?url=...
// Phần 6.1 — Luồng chính để lấy transcript (không phụ thuộc server tự scrape YouTube):
// trả về videoId + link mở sẵn sang youtubetotranscript.com cho đúng video đó.
router.get("/transcript-link", requirePin, (req, res) => {
  const { url } = req.query;
  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: "Không nhận diện được video ID từ link này." });
  }
  res.json({ videoId, transcriptSiteUrl: buildTranscriptSiteUrl(videoId) });
});

// POST /api/videos/check-transcript { url }
// Thử tự động lấy transcript qua youtube-transcript (âm thầm, không bắt buộc). Hay bị chặn IP khi
// deploy nên KHÔNG còn là điều kiện bắt buộc để tạo bài — chỉ là "thử vận may", nếu lỗi thì frontend
// sẽ chuyển sang luồng chính: mở /transcript-link rồi cho người dùng dán transcript tay.
router.post("/check-transcript", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Thiếu url trong request body." });
  }

  const { hasTranscript, transcript } = await fetchTranscript(url);
  res.json({ hasTranscript, transcript });
});

export default router;

import { Router } from "express";
import { randomUUID } from "crypto";
import { generateFullLesson } from "../services/gemini.js";
import { fetchVideoTitle } from "../services/youtube.js";
import { requirePin } from "../middleware/requirePin.js";
import pool from "../db.js";

const router = Router();

const KNOWN_WORDS_LIMIT = 150; // giới hạn số từ đưa vào prompt để tránh prompt quá dài

// Chuẩn hoá từ vựng: lowercase + trim (đồng nhất với routes/vocab.js)
function normalizeWord(w) {
  return String(w || "").trim().toLowerCase();
}

// Lấy danh sách từ đã lưu để tránh Gemini sinh trùng từ trong vocabCards.
// Nếu danh sách quá dài, ưu tiên lọc theo topic của bài học liên quan (join qua lesson_id),
// nếu vẫn còn ngắn hoặc không có topic phù hợp thì lấy N từ gần nhất.
async function getKnownWords(topic) {
  const { rows: allRows } = await pool.query("SELECT word FROM saved_vocab");
  const allWords = [...new Set(allRows.map((r) => normalizeWord(r.word)).filter(Boolean))];

  if (allWords.length <= KNOWN_WORDS_LIMIT) return allWords;

  if (topic) {
    const { rows: topicRows } = await pool.query(
      `SELECT sv.word FROM saved_vocab sv
       JOIN lessons l ON l.id = sv.lesson_id
       WHERE l.topic = $1
       ORDER BY sv.saved_at DESC`,
      [topic]
    );
    const topicWords = [...new Set(topicRows.map((r) => normalizeWord(r.word)).filter(Boolean))];
    if (topicWords.length > 0) return topicWords.slice(0, KNOWN_WORDS_LIMIT);
  }

  // Fallback: lấy N từ được lưu gần nhất
  const { rows: recentRows } = await pool.query(
    "SELECT word FROM saved_vocab ORDER BY saved_at DESC LIMIT $1",
    [KNOWN_WORDS_LIMIT]
  );
  return [...new Set(recentRows.map((r) => normalizeWord(r.word)).filter(Boolean))];
}

// Phần 5.6 — Giới hạn tốc độ tạo bài (cooldown), tránh spam quota Gemini/YouTube do bấm nhầm/spam.
// Đơn giản theo IP, lưu trong bộ nhớ (đủ dùng cho app quy mô nhỏ; reset khi restart server).
const GENERATE_COOLDOWN_MS = 60 * 1000; // 60 giây giữa 2 lần tạo bài
const lastGenerateAt = new Map(); // ip -> timestamp

function generateCooldown(req, res, next) {
  const key = req.ip || "unknown";
  const last = lastGenerateAt.get(key);
  const now = Date.now();
  if (last && now - last < GENERATE_COOLDOWN_MS) {
    const retryAfterSec = Math.ceil((GENERATE_COOLDOWN_MS - (now - last)) / 1000);
    res.set("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      error: `Vui lòng đợi ${retryAfterSec}s trước khi tạo bài học tiếp theo (tránh spam quota AI).`,
      retryAfterSec,
    });
  }
  lastGenerateAt.set(key, now);
  next();
}

// POST /api/lessons/generate  { videoUrl, transcript, topic?, band? }
// -> { lessonId, title, dictation, writingQuestions, vocabCards, ideaBank, trueFalseQuestions, speakingPrompt, readingPassage }
router.post("/generate", requirePin, generateCooldown, async (req, res) => {
  const { videoUrl, transcript, topic, band } = req.body;

  if (!videoUrl || !transcript) {
    return res.status(400).json({ error: "Thiếu videoUrl hoặc transcript trong request body." });
  }

  try {
    const knownWords = await getKnownWords(topic);

    const [lesson, title] = await Promise.all([
      generateFullLesson(transcript, videoUrl, knownWords, band),
      fetchVideoTitle(videoUrl),
    ]);
    const id = randomUUID();

    await pool.query(
      `INSERT INTO lessons (id, video_url, title, topic, dictation_json, exploration_json, reading_json, band_target)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        videoUrl,
        title || videoUrl,
        topic || null,
        JSON.stringify(lesson.dictation),
        JSON.stringify({
          writingQuestions: lesson.writingQuestions,
          vocabCards: lesson.vocabCards,
          ideaBank: lesson.ideaBank,
          trueFalseQuestions: lesson.trueFalseQuestions,
          speakingPrompt: lesson.speakingPrompt,
        }),
        JSON.stringify(lesson.readingPassage || null),
        band || null,
      ]
    );

    res.json({
      lessonId: id,
      title: title || videoUrl,
      dictation: lesson.dictation,
      writingQuestions: lesson.writingQuestions,
      vocabCards: lesson.vocabCards,
      ideaBank: lesson.ideaBank,
      trueFalseQuestions: lesson.trueFalseQuestions,
      speakingPrompt: lesson.speakingPrompt,
      readingPassage: lesson.readingPassage || null,
    });
  } catch (err) {
    console.error("Lỗi /lessons/generate:", err.message);
    res.status(500).json({ error: err.message || "Lỗi không xác định khi gọi Gemini." });
  }
});

// GET /api/lessons/:id -> lấy lại 1 bài học đã tạo trước đó (dùng cho nút "Làm lại")
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM lessons WHERE id = $1", [req.params.id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: "Không tìm thấy bài học." });

    let exploration = {};
    try {
      exploration = JSON.parse(row.exploration_json || "{}");
    } catch {
      exploration = {};
    }

    let readingPassage = null;
    try {
      readingPassage = row.reading_json ? JSON.parse(row.reading_json) : null;
    } catch {
      readingPassage = null;
    }

    res.json({
      lessonId: row.id,
      videoUrl: row.video_url,
      title: row.title || row.video_url,
      dictation: JSON.parse(row.dictation_json || "[]"),
      writingQuestions: exploration.writingQuestions || [],
      vocabCards: exploration.vocabCards || [],
      ideaBank: exploration.ideaBank || [],
      trueFalseQuestions: exploration.trueFalseQuestions || [],
      speakingPrompt: exploration.speakingPrompt || null,
      readingPassage,
    });
  } catch (err) {
    console.error("Lỗi GET /lessons/:id:", err.message);
    res.status(500).json({ error: "Lỗi khi truy vấn database." });
  }
});

export default router;

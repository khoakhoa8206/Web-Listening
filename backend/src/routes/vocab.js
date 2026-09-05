import { Router } from "express";
import pool from "../db.js";
const router = Router();

// Lấy username từ header x-username (frontend tự gắn sau khi login).
function getUsername(req) {
  return req.headers["x-username"] || "Hoagttho1411";
}

// GET /api/vocab -> toàn bộ từ vựng đã lưu của user hiện tại (kho từ vựng cá nhân)
router.get("/", async (req, res) => {
  try {
    const username = getUsername(req);
    const { rows } = await pool.query(
      "SELECT * FROM saved_vocab WHERE username = $1 ORDER BY saved_at DESC",
      [username]
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi GET /vocab:", err.message);
    res.status(500).json({ error: "Lỗi khi truy vấn database." });
  }
});

// Chuẩn hoá từ vựng: lowercase + trim, để "Environment" và "environment" được coi là cùng 1 từ
function normalizeWord(w) {
  return String(w || "").trim().toLowerCase();
}

// Leitner box: box càng cao, khoảng cách tới lần ôn tiếp theo càng dài.
const BOX_INTERVAL_DAYS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };

// GET /api/vocab/due -> các từ đến hạn ôn tập (dùng cho trang Flashcard)
router.get("/due", async (req, res) => {
  try {
    const username = getUsername(req);
    const { rows } = await pool.query(
      `SELECT * FROM saved_vocab WHERE username = $1 AND next_review <= NOW() ORDER BY next_review ASC LIMIT 30`,
      [username]
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi GET /vocab/due:", err.message);
    res.status(500).json({ error: "Lỗi khi truy vấn database." });
  }
});

// POST /api/vocab/review { word, correct: boolean } -> cập nhật Leitner box + lịch ôn tiếp theo
router.post("/review", async (req, res) => {
  const { word, correct } = req.body;
  const normalizedWord = normalizeWord(word);
  if (!normalizedWord) return res.status(400).json({ error: "Thiếu word." });

  try {
    const username = getUsername(req);
    const { rows } = await pool.query(
      "SELECT box FROM saved_vocab WHERE word = $1 AND username = $2",
      [normalizedWord, username]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy từ này trong kho." });

    const currentBox = rows[0].box || 1;
    // Trả lời đúng -> lên box tiếp theo (tối đa 5). Trả lời sai -> quay về box 1 (ôn lại sớm).
    const nextBox = correct ? Math.min(currentBox + 1, 5) : 1;
    const intervalDays = BOX_INTERVAL_DAYS[nextBox];

    await pool.query(
      `UPDATE saved_vocab SET box = $1, next_review = NOW() + make_interval(days => $2) WHERE word = $3 AND username = $4`,
      [nextBox, intervalDays, normalizedWord, username]
    );
    res.json({ ok: true, box: nextBox, nextReviewInDays: intervalDays });
  } catch (err) {
    console.error("Lỗi POST /vocab/review:", err.message);
    res.status(500).json({ error: "Lỗi khi cập nhật tiến độ ôn tập." });
  }
});

// POST /api/vocab/save { word, phonetic, meaning, tip, source, lessonId }
router.post("/save", async (req, res) => {
  const { word, phonetic, meaning, tip, source, lessonId } = req.body;
  if (!word) return res.status(400).json({ error: "Thiếu word." });

  const normalizedWord = normalizeWord(word);
  if (!normalizedWord) return res.status(400).json({ error: "word không hợp lệ." });

  try {
    const username = getUsername(req);
    // Ưu tiên update đúng từ của chính user đang lưu (không đè data của user khác).
    const updated = await pool.query(
      `UPDATE saved_vocab SET phonetic=$2, meaning=$3, tip=$4, source=$5, lesson_id=$6
       WHERE word = $1 AND username = $7`,
      [normalizedWord, phonetic || null, meaning || null, tip || null, source || null, lessonId || null, username]
    );
    if (updated.rowCount === 0) {
      // Chưa có -> insert mới. Nếu trùng word (do user khác đã lưu trước) thì bỏ qua im lặng
      // để không chiếm mất từ của người kia.
      await pool.query(
        `INSERT INTO saved_vocab (word, phonetic, meaning, tip, source, lesson_id, username)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (word) DO NOTHING`,
        [normalizedWord, phonetic || null, meaning || null, tip || null, source || null, lessonId || null, username]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Lỗi POST /vocab/save:", err.message);
    res.status(500).json({ error: "Lỗi khi lưu từ vựng." });
  }
});

// DELETE /api/vocab/:word -> bỏ lưu 1 từ (chỉ xoá được từ của chính user đang gọi)
router.delete("/:word", async (req, res) => {
  try {
    const username = getUsername(req);
    await pool.query(
      "DELETE FROM saved_vocab WHERE word = $1 AND username = $2",
      [normalizeWord(req.params.word), username]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Lỗi DELETE /vocab/:word:", err.message);
    res.status(500).json({ error: "Lỗi khi xoá từ vựng." });
  }
});

export default router;

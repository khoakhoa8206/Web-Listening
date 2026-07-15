import { Router } from "express";
import pool from "../db.js";
const router = Router();

// POST /api/progress/save { lessonId, type, score, minutes }
// type: "Listening" | "Writing" | "Reading" | "Vocabulary" | "Speaking"
router.post("/save", async (req, res) => {
  const { lessonId, type, score, minutes } = req.body;
  if (lessonId === undefined) {
    return res.status(400).json({ error: "Thiếu lessonId." });
  }
  try {
    await pool.query(
      "INSERT INTO progress (lesson_id, type, score, minutes) VALUES ($1,$2,$3,$4)",
      [lessonId, type || "Listening", score ?? null, minutes ?? 0]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Lỗi POST /progress/save:", err.message);
    res.status(500).json({ error: "Lỗi khi lưu tiến độ." });
  }
});

// GET /api/progress -> lịch sử làm bài thật, kèm tiêu đề video (join lessons)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.lesson_id AS "lessonId", p.type, p.score, p.minutes, p.date,
              l.title, l.video_url AS "videoUrl", l.topic
       FROM progress p
       LEFT JOIN lessons l ON l.id = p.lesson_id
       ORDER BY p.date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Lỗi GET /progress:", err.message);
    res.status(500).json({ error: "Lỗi khi truy vấn database." });
  }
});

// GET /api/progress/summary?range=week|month|all
// Tính sẵn các số liệu cho Dashboard / Báo cáo từ dữ liệu THẬT, không còn số mock.
router.get("/summary", async (req, res) => {
  const range = req.query.range || "week";
  const days = range === "week" ? 7 : range === "month" ? 30 : 36500;

  try {
    const { rows } = await pool.query(
      `SELECT p.*, l.title, l.video_url AS "videoUrl"
       FROM progress p LEFT JOIN lessons l ON l.id = p.lesson_id
       WHERE p.date >= NOW() - make_interval(days => $1::int)
       ORDER BY p.date ASC`,
      [days]
    );

    const listeningRows = rows.filter((r) => r.type === "Listening" && r.score != null);
    const avgScore =
      listeningRows.length > 0
        ? listeningRows.reduce((s, r) => s + Number(r.score), 0) / listeningRows.length
        : 0;

    const totalMinutes = rows.reduce((s, r) => s + Number(r.minutes || 0), 0);
    const { rows: vocabCountRows } = await pool.query("SELECT COUNT(*) AS c FROM saved_vocab");
    const vocabCount = Number(vocabCountRows[0].c);

    // Chuỗi ngày liên tục có ít nhất 1 lượt luyện tập (tính đến hôm nay)
    const { rows: dateRows } = await pool.query(
      `SELECT DISTINCT date(date) AS d FROM progress ORDER BY d DESC`
    );
    const allDates = dateRows.map((r) => r.d.toISOString().slice(0, 10));
    let streakDays = 0;
    let cursor = new Date();
    for (const d of allDates) {
      const cursorStr = cursor.toISOString().slice(0, 10);
      if (d === cursorStr) {
        streakDays += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    // Nhóm điểm Listening theo ngày để vẽ biểu đồ
    const chartMap = {};
    for (const r of listeningRows) {
      const day = new Date(r.date).toISOString().slice(0, 10);
      if (!chartMap[day]) chartMap[day] = [];
      chartMap[day].push(Number(r.score));
    }
    const chart = Object.entries(chartMap).map(([day, scores]) => ({
      label: day.slice(5), // MM-DD
      value: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
    }));

    // Phần 5.4 — Phân tích điểm yếu theo từng kỹ năng: số lượt + điểm TB (nếu có score) mỗi loại.
    const skillMap = {};
    for (const r of rows) {
      const type = r.type || "Listening";
      if (!skillMap[type]) skillMap[type] = { sessions: 0, minutes: 0, scoreSum: 0, scoreCount: 0 };
      skillMap[type].sessions += 1;
      skillMap[type].minutes += Number(r.minutes || 0);
      if (r.score != null) {
        skillMap[type].scoreSum += Number(r.score);
        skillMap[type].scoreCount += 1;
      }
    }
    const skillBreakdown = Object.entries(skillMap).map(([type, s]) => ({
      type,
      sessions: s.sessions,
      minutes: Math.round(s.minutes),
      avgScore: s.scoreCount > 0 ? +(s.scoreSum / s.scoreCount).toFixed(1) : null,
    }));

    // Phần 5.4 — Heatmap: số lượt luyện tập mỗi ngày trong khoảng thời gian đang xem.
    const heatmapMap = {};
    for (const r of rows) {
      const day = new Date(r.date).toISOString().slice(0, 10);
      heatmapMap[day] = (heatmapMap[day] || 0) + 1;
    }
    const heatmap = Object.entries(heatmapMap).map(([date, count]) => ({ date, count }));

    res.json({
      band: +avgScore.toFixed(1),
      minutes: Math.round(totalMinutes),
      wordsMastered: vocabCount,
      lessonsCompleted: rows.length,
      streakDays,
      chart,
      skillBreakdown,
      heatmap,
    });
  } catch (err) {
    console.error("Lỗi GET /progress/summary:", err.message);
    res.status(500).json({ error: "Lỗi khi truy vấn database." });
  }
});

export default router;

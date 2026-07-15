import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  Thiếu DATABASE_URL trong backend/.env — cần connection string Postgres (Neon.tech hoặc Supabase) để chạy backend."
  );
}

const isLocalDb = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "");

// Neon/Supabase yêu cầu SSL; rejectUnauthorized: false vì free tier dùng chứng chỉ tự ký qua pooler.
// Kết nối tới Postgres local (dev/test) thì tắt SSL vì local thường không bật SSL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !isLocalDb ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Lỗi không mong muốn từ Postgres pool:", err.message);
});

// Migrate an toàn: chỉ thêm cột nếu chưa tồn tại (tương đương ensureColumn cũ của better-sqlite3)
async function ensureColumn(table, column, definition) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Gọi 1 lần khi server khởi động — tạo bảng nếu chưa có + migrate cột mới cho DB cũ.
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      video_url TEXT,
      title TEXT,
      topic TEXT,
      dictation_json TEXT,
      exploration_json TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress (
      id SERIAL PRIMARY KEY,
      lesson_id TEXT,
      type TEXT DEFAULT 'Listening',
      score REAL,
      minutes REAL,
      date TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_vocab (
      word TEXT PRIMARY KEY,
      phonetic TEXT,
      meaning TEXT,
      tip TEXT,
      source TEXT,
      lesson_id TEXT,
      saved_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Cột được thêm ở các phần sau — migrate an toàn, không phá dữ liệu cũ.
  await ensureColumn("lessons", "title", "TEXT");
  await ensureColumn("lessons", "topic", "TEXT");
  await ensureColumn("lessons", "reading_json", "TEXT");
  await ensureColumn("progress", "type", "TEXT DEFAULT 'Listening'");

  // Phần 5.1 — Flashcard ôn từ vựng kiểu Leitner box (spaced repetition).
  // box: 1..5 (box càng cao thì càng lâu mới ôn lại). next_review: lần ôn tiếp theo được lịch.
  await ensureColumn("saved_vocab", "box", "INTEGER DEFAULT 1");
  await ensureColumn("saved_vocab", "next_review", "TIMESTAMPTZ DEFAULT NOW()");

  // Phần 5.2 — Band điểm mục tiêu chọn khi tạo bài (6.0 / 7.0 / 8.0+), lưu lại để tham khảo sau.
  await ensureColumn("lessons", "band_target", "TEXT");

  console.log("✅ Đã kết nối Postgres và kiểm tra schema.");
}

export default pool;

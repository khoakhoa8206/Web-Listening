import pool from "../db.js";

// Cache transcript bền vững trong Postgres (Neon), khác với cache tạm trong bộ nhớ
// ở youtube.js (cache bộ nhớ mất khi Render restart/deploy lại; cache này thì không).
export async function getTranscriptCache(videoId) {
  const { rows } = await pool.query(
    `SELECT video_id, url, has_transcript, transcript FROM transcript_cache WHERE video_id = $1`,
    [videoId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return { hasTranscript: row.has_transcript, transcript: row.transcript };
}

export async function saveTranscriptCache(videoId, url, hasTranscript, transcript) {
  await pool.query(
    `INSERT INTO transcript_cache (video_id, url, has_transcript, transcript, fetched_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (video_id)
     DO UPDATE SET url = $2, has_transcript = $3, transcript = $4, fetched_at = NOW()`,
    [videoId, url, hasTranscript, transcript]
  );
}

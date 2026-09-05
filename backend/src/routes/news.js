import { Router } from "express";
import multer from "multer";
import { generateContentWithRetry } from "../services/gemini.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/news/word-info { word } -> { phonetic, meaning, example }
// Tra nghĩa một từ cho popup hover trong trang NewsReader.
router.post("/word-info", async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "Thiếu word" });

  try {
    const prompt = `For the English word "${word}", return ONLY a JSON object with these fields:
{
  "phonetic": "IPA phonetic transcription",
  "meaning": "Vietnamese meaning, 1-2 short sentences",
  "example": "One simple English example sentence using the word"
}
No markdown, no explanation, just the JSON.`;

    const response = await generateContentWithRetry({
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const raw = response.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/g, "").trim();
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error("word-info error:", err.message);
    res.status(500).json({ error: "Không tra được từ." });
  }
});

// POST /api/news/fetch-article { url } -> { title, text }
// Fetch HTML bài báo từ URL rồi dùng Gemini extract title + nội dung sạch.
router.post("/fetch-article", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Thiếu url" });

  try {
    const htmlRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsReader/1.0)" },
    });
    if (!htmlRes.ok) {
      return res.status(422).json({ error: `Trang web trả về mã lỗi ${htmlRes.status}.` });
    }
    const html = await htmlRes.text();

    const prompt = `Extract the article title and main body text from this HTML.
Return ONLY a JSON: {"title": "...", "text": "full article text with paragraphs separated by newlines"}
No markdown. HTML:
${html.slice(0, 15000)}`;

    const response = await generateContentWithRetry({
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const raw = response.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/g, "").trim();
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error("fetch-article error:", err.message);
    res.status(500).json({ error: "Không fetch được bài báo." });
  }
});

// POST /api/news/parse-file (multipart: file) -> { text }
// Parse nội dung từ file PDF/DOCX/TXT người dùng upload.
router.post("/parse-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Thiếu file." });
    const { originalname, buffer, mimetype } = req.file;
    let text = "";

    const name = String(originalname || "").toLowerCase();

    if (mimetype === "application/pdf" || name.endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (mimetype.includes("word") || name.endsWith(".docx") || name.endsWith(".doc")) {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      text = buffer.toString("utf-8");
    }

    res.json({ text });
  } catch (err) {
    console.error("parse-file error:", err.message);
    res.status(500).json({ error: "Không đọc được file." });
  }
});

export default router;
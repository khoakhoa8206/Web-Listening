import { Router } from "express";
import { gradeSpeakingAnswer } from "../services/gemini.js";
import { requirePin } from "../middleware/requirePin.js";

const router = Router();

// POST /api/speaking/grade { promptText, transcript, part }
// promptText: cue card hoặc câu hỏi Part 3 người học đang trả lời
// transcript: văn bản do trình duyệt tự nhận dạng giọng nói (Web Speech API) từ câu trả lời của người học
// -> { band, feedback, strengths, improvements }
router.post("/grade", requirePin, async (req, res) => {
  const { promptText, transcript, part } = req.body;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: "Không có transcript câu trả lời để chấm." });
  }

  try {
    const result = await gradeSpeakingAnswer(promptText, transcript, part);
    res.json(result);
  } catch (err) {
    console.error("Lỗi /speaking/grade:", err.message);
    res.status(500).json({ error: err.message || "Lỗi khi chấm điểm Speaking." });
  }
});

export default router;

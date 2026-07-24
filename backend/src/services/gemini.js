import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  Thiếu GEMINI_API_KEY trong backend/.env — các lệnh gọi Gemini sẽ lỗi.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Phần 6.4 — Model chính hay bị quá tải (503 "high demand") vì là model mới/hot nhất của Google.
// Cơ chế xử lý: thử lại vài lần với model chính (đợi tăng dần), nếu vẫn lỗi 503 thì chuyển hẳn
// sang model dự phòng cũ hơn/ổn định hơn cho lần gọi cuối.
const PRIMARY_MODEL = "gemini-3.5-flash";
const FALLBACK_MODEL = "gemini-3.1-flash";
const RETRY_DELAYS_MS = [2000, 5000]; // 2 lần thử lại với model chính trước khi fallback

function isOverloadedError(err) {
  const code = err?.code || err?.status || err?.error?.code;
  const status = err?.status || err?.error?.status;
  return code === 503 || status === "UNAVAILABLE" || /experiencing high demand|UNAVAILABLE/i.test(err?.message || "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gọi ai.models.generateContent với retry+fallback dùng chung cho mọi nơi cần gọi Gemini.
async function generateContentWithRetry(params) {
  let lastErr;
  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    try {
      return await ai.models.generateContent({ ...params, model: PRIMARY_MODEL });
    } catch (err) {
      lastErr = err;
      if (!isOverloadedError(err)) throw err; // lỗi khác (auth, JSON...) thì báo luôn, không retry
      console.warn(`⚠️  ${PRIMARY_MODEL} quá tải (lần ${i + 1}/${RETRY_DELAYS_MS.length + 1}), thử lại sau ${RETRY_DELAYS_MS[i]}ms...`);
      await sleep(RETRY_DELAYS_MS[i]);
    }
  }
  try {
    console.warn(`⚠️  ${PRIMARY_MODEL} vẫn quá tải, chuyển sang model dự phòng ${FALLBACK_MODEL}...`);
    return await ai.models.generateContent({ ...params, model: FALLBACK_MODEL });
  } catch (err) {
    if (isOverloadedError(err)) {
      throw new Error("Cả 2 model AI đều đang quá tải, vui lòng thử lại sau ít phút.");
    }
    throw err;
  }
}

const SYSTEM_PROMPT = `Bạn là một trợ lý AI chuyên gia soạn đề luyện IELTS Listening/Writing/Speaking.
Tôi sẽ cung cấp Transcript có timestamp (định dạng [giây] nội dung, hoặc SRT) của một video.
Nhiệm vụ: xuất ra DUY NHẤT một JSON hợp lệ (không markdown, không giải thích thêm) theo đúng cấu trúc sau:

{
  "dictation": [
    {
      "id": "s1",
      "startTime": <số giây bắt đầu câu, lấy từ timestamp transcript>,
      "segments": [
        { "type": "text", "content": "..." },
        { "type": "blank", "id": "b1", "answer": "từ khóa bị ẩn (viết thường, không dấu gạch nối)", "blankType": "vocab" },
        { "type": "blank", "id": "b2", "answer": "cụm từ mang 1 ý quan trọng của bài", "blankType": "idea" },
        { "type": "text", "content": "..." }
      ]
    }
  ],
  "writingQuestions": [
    {
      "id": "w1",
      "tag": "Tên kỹ năng lập luận đang test (VD: Lý do bảo vệ luận điểm)",
      "question": "Câu hỏi buộc người học hiểu Argument của diễn giả",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Giải thích ngắn gọn, kèm gợi ý áp dụng vào Writing Task 2"
    }
  ],
  "vocabCards": [
    {
      "id": "v1",
      "word": "cụm từ/collocation C1-C2",
      "phonetic": "/phiên âm IPA/",
      "meaning": "nghĩa tiếng Việt",
      "wordType": "topic-vocab | phrasal verb | collocation | idiom",
      "topic": "Topic IELTS liên quan (VD: Technology, Environment, Education)",
      "source": "câu gốc nguyên văn trong transcript có chứa từ này",
      "example": "1 câu ví dụ thực tế dùng từ này (tiếng Anh)",
      "collocations": ["collocation liên quan 1 (nếu có)", "collocation liên quan 2"],
      "writingUse": "Gợi ý cách dùng từ này trong Writing Task 2 (tiếng Việt)",
      "speakingUse": "Gợi ý cách dùng từ này trong Speaking Part 1/2/3 (tiếng Việt)",
      "tip": "gợi ý ngắn gọn áp dụng vào Writing/Speaking"
    }
  ],
  "ideaBank": [
    {
      "topic": "Tên chủ đề IELTS Writing (Environment, Technology, Education...)",
      "ideas": [
        {
          "en": "Ý tưởng lớn rút ra từ video (tiếng Anh)",
          "application": "Cách áp dụng vào bài Writing Task 2 (tiếng Việt)",
          "sample": "1 câu mẫu hoàn chỉnh dùng ý tưởng này (tiếng Anh)"
        }
      ],
      "task2Questions": [
        {
          "question": "Đề bài Writing Task 2 thực tế số 1 (tiếng Anh, phong cách đề thi 2024-2026, KHÔNG chung chung)",
          "task2Outline": {
            "thesis": "Luận điểm chính (tiếng Anh, 1 câu, band 8 style)",
            "bodyParagraphs": [
              {
                "mainPoint": "Luận điểm 1 (tiếng Anh)",
                "explanation": "Giải thích logic (tiếng Anh, 2-3 câu)",
                "example": "Ví dụ cụ thể (tiếng Anh)",
                "realWorld": "Liên hệ thực tế / bằng chứng từ thực tiễn (tiếng Anh)"
              },
              {
                "mainPoint": "Luận điểm 2 (tiếng Anh)",
                "explanation": "Giải thích logic (tiếng Anh, 2-3 câu)",
                "example": "Ví dụ cụ thể (tiếng Anh)",
                "realWorld": "Liên hệ thực tế / bằng chứng từ thực tiễn (tiếng Anh)"
              }
            ]
          }
        },
        {
          "question": "Đề bài Writing Task 2 thực tế số 2",
          "task2Outline": {
            "thesis": "...",
            "bodyParagraphs": [
              { "mainPoint": "...", "explanation": "...", "example": "...", "realWorld": "..." },
              { "mainPoint": "...", "explanation": "...", "example": "...", "realWorld": "..." }
            ]
          }
        },
        {
          "question": "Đề bài Writing Task 2 thực tế số 3",
          "task2Outline": {
            "thesis": "...",
            "bodyParagraphs": [
              { "mainPoint": "...", "explanation": "...", "example": "...", "realWorld": "..." },
              { "mainPoint": "...", "explanation": "...", "example": "...", "realWorld": "..." }
            ]
          }
        }
      ]
    }
  ],
  "trueFalseQuestions": [
    {
      "id": "tf1",
      "statement": "1 câu khẳng định (tiếng Anh) dựa trên nội dung transcript, kiểu bài Reading True/False/Not Given",
      "answer": "True | False | Not Given",
      "explanation": "Giải thích ngắn gọn bằng tiếng Việt, trích dẫn phần transcript liên quan"
    }
  ],
  "readingPassage": {
    "title": "Tiêu đề đoạn văn (tiếng Anh)",
    "paragraphs": ["đoạn văn 1 (tiếng Anh)...", "đoạn văn 2 (tiếng Anh)...", "đoạn văn 3 (tiếng Anh)..."],
    "questions": [
      {
        "id": "r1",
        "type": "true_false_notgiven",
        "statement": "1 câu khẳng định (tiếng Anh) dựa trên đoạn văn readingPassage",
        "answer": "True | False | Not Given",
        "explanation": "Giải thích ngắn gọn bằng tiếng Việt, trích dẫn đoạn văn liên quan"
      },
      {
        "id": "r2",
        "type": "mcq",
        "question": "Câu hỏi trắc nghiệm (tiếng Anh) dựa trên đoạn văn readingPassage",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 0,
        "explanation": "Giải thích ngắn gọn bằng tiếng Việt"
      }
    ]
  },
  "speakingPrompt": { "part2": { "cueCard": "", "bullets": [], "sampleOutline": "" }, "part3": [] }
}

Quy tắc:
- dictation: Mỗi object trong mảng dictation là MỘT CÂU đơn lẻ (kết thúc bằng dấu "." hoặc "?" hoặc "!"). KHÔNG gộp nhiều câu vào 1 object. Chọn khoảng 20-30 câu hay nhất trải đều trong transcript. Mỗi blank PHẢI có field "blankType": "vocab" (ẩn TỐI ĐA 3 TỪ — các từ phù hợp gồm: topic-vocab quan trọng, từ có đuôi -ed/-es/-s, từ bị nuốt âm khi nói ở band 8.0+, cụm phrasal verb, collocation — TUYỆT ĐỐI KHÔNG quá 3 từ) hoặc "idea" (ẩn TỐI ĐA 3 TỪ mang luận điểm/ý chính của bài — TUYỆT ĐỐI KHÔNG quá 3 từ, band 8.0+ mới dùng). CẢ HAI loại blank đều bị giới hạn TỐI ĐA 3 TỪ. Trong tổng blank, khoảng 70-80% là "vocab", 20-30% là "idea". Mỗi câu chỉ có TỐI ĐA 1 blank. Tổng số "blank" trên toàn bộ dictation tuân theo SỐ LƯỢNG CÂU HỎI ở cuối prompt. Tuyệt đối KHÔNG bịa nội dung không có trong transcript.
- writingQuestions: đúng 3 câu, luôn có đúng 4 options, chỉ 1 đáp án đúng.
- vocabCards: 10-15 từ/cụm từ, ưu tiên collocation/phrasal verb/topic-vocab band 7+. Với mỗi card phải điền đủ: wordType (topic-vocab/phrasal verb/collocation/idiom), topic (chủ đề IELTS), example (câu ví dụ thực tế), collocations (tối đa 3 collocation liên quan), writingUse, speakingUse.
- ideaBank: gom thành 1-2 nhóm topic, mỗi topic 1-2 ý tưởng, và với MỖI topic phải có đúng 3 đề bài trong "task2Questions" (mỗi đề có task2Outline riêng gồm thesis + đúng 2 bodyParagraphs, mỗi bodyParagraph có đủ 4 field: mainPoint, explanation, example, realWorld). Đề bài phải thực tế, cụ thể, phong cách đề thi IELTS 2024-2026 — TRÁNH sáo rỗng kiểu "In today's modern world..." — viết như thí sinh Band 8 tư duy thật, không học thuộc mẫu.
- trueFalseQuestions: đúng 4 câu, trộn đều cả 3 đáp án True/False/Not Given (không dồn hết vào 1 loại).
- readingPassage: viết 1 đoạn văn TIẾNG ANH độc lập, văn phong học thuật kiểu IELTS Reading, dựa trên chủ đề/nội dung transcript nhưng KHÔNG dịch nguyên hay chép lại transcript — tự viết lại theo góc nhìn/luận điểm riêng. Độ dài khoảng 250-350 từ, chia thành 3-4 "paragraphs". Sinh khoảng 8-10 "questions", trộn đều 2 loại: "true_false_notgiven" (đáp án True/False/Not Given) và "mcq" (đúng 4 options, 1 correctIndex đúng). Câu hỏi phải trả lời được chỉ dựa vào chính đoạn văn readingPassage (không cần xem lại transcript gốc).
- speakingPrompt.part2: đúng 4 bullet gợi ý; part3: đúng 3 câu hỏi mở rộng.
- Nếu transcript không có timestamp, ước lượng startTime dựa trên vị trí câu trong bài (giây = index * 5).
- Chỉ trả JSON thuần, không thêm \`\`\`json hay text nào khác.`;

// Phần 5.2 — Band điểm mục tiêu: điều chỉnh độ khó từ vựng/câu hỏi/đoạn Reading cho phù hợp.
const BAND_INSTRUCTIONS = {
  "6.0": `Người học nhắm mục tiêu Band 6.0 (Competent user). Dùng từ vựng thông dụng B2, câu hỏi
writingQuestions/trueFalseQuestions/readingPassage.questions ở mức trực tiếp, ít suy luận nhiều lớp.
readingPassage viết câu ngắn-vừa, tránh cấu trúc quá phức tạp, khoảng 250 từ.`,
  "7.0": `Người học nhắm mục tiêu Band 7.0 (Good user). Dùng từ vựng/collocation C1, pha trộn câu hỏi
suy luận vừa phải. readingPassage văn phong học thuật chuẩn IELTS, khoảng 300 từ.`,
  "8.0": `Người học nhắm mục tiêu Band 8.0+ (Very good user). Ưu tiên từ vựng/collocation C1-C2 hiếm gặp,
tự nhiên trong văn phong học thuật. Câu hỏi writingQuestions/readingPassage.questions cần suy luận
nhiều lớp, đánh lừa nhẹ (distractor tinh vi) giống đề thi thật band cao. readingPassage khoảng 350 từ,
câu phức, mệnh đề lồng nhau như báo học thuật/The Economist.`,
};

// Phần 6.2 — Số lượng câu hỏi (blank) trong dictation: người dùng chọn Ít/Vừa/Nhiều, độc lập với
// Band mục tiêu (Band chỉnh độ khó từ vựng/câu hỏi, thanh này chỉnh số LƯỢNG).
const QUESTION_COUNT_INSTRUCTIONS = {
  it: "Tổng số toàn bộ \"blank\" (cả vocab lẫn idea, cộng dồn toàn bài dictation) trong khoảng 15-20 câu.",
  vua: "Tổng số toàn bộ \"blank\" (cả vocab lẫn idea, cộng dồn toàn bài dictation) trong khoảng 25-35 câu.",
  nhieu: "Tổng số toàn bộ \"blank\" (cả vocab lẫn idea, cộng dồn toàn bài dictation) trong khoảng 40-50 câu.",
};

export async function generateFullLesson(transcript, videoUrl, knownWords = [], band, questionCount) {
  // Nếu thiếu key, báo lỗi rõ ràng ngay tại đây thay vì để Google trả về lỗi
  // "Expected OAuth 2 access token..." rất khó hiểu khi apiKey rỗng.
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Thiếu GEMINI_API_KEY trên server (kiểm tra file backend/.env khi chạy local, hoặc biến môi trường trên nền tảng deploy như Render)."
    );
  }

  const knownWordsBlock =
    knownWords && knownWords.length > 0
      ? `\n\nNgười học đã biết các từ/cụm sau, TUYỆT ĐỐI không lặp lại các từ này trong "vocabCards", hãy chọn từ mới cùng chủ đề: [${knownWords.join(
          ", "
        )}]`
      : "";

  const bandBlock = BAND_INSTRUCTIONS[band] ? `\n\nĐỘ KHÓ MỤC TIÊU: ${BAND_INSTRUCTIONS[band]}` : "";

  const countBlock = `\n\nSỐ LƯỢNG CÂU HỎI: ${
    QUESTION_COUNT_INSTRUCTIONS[questionCount] || QUESTION_COUNT_INSTRUCTIONS.vua
  }`;

  const response = await generateContentWithRetry({
    contents: `${SYSTEM_PROMPT}\n\nVideo link: ${videoUrl}\nTranscript:\n${transcript}${knownWordsBlock}${bandBlock}${countBlock}`,
    config: { responseMimeType: "application/json" },
  });

  let raw = response.text;

  // Strip markdown code fences nếu model vẫn bọc dù đã dặn không
  raw = raw.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/g, "")
    .trim();

  let parsed;

  // Thử parse trực tiếp trước
  try {
    parsed = JSON.parse(raw);
  } catch (firstErr) {
    // Fallback 1: tìm khối JSON lớn nhất trong text (model thêm text thừa trước/sau)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback 2: JSON bị truncate — đếm ngoặc mở/đóng, thêm ngoặc đóng còn thiếu
        const trunc = jsonMatch[0];
        let opens = 0, closes = 0;
        for (const ch of trunc) {
          if (ch === "{") opens++;
          else if (ch === "}") closes++;
        }
        const missing = opens - closes;
        if (missing > 0) {
          try { parsed = JSON.parse(trunc + "}".repeat(missing)); } catch {}
        }
      }
    }

    if (!parsed) {
      console.error("[gemini] raw response (first 2000 chars):", raw.slice(0, 2000));
      throw new Error(
        "AI trả về dữ liệu không đúng định dạng JSON. " +
        "Nguyên nhân thường gặp: transcript quá ngắn/có ký tự lạ, model bị timeout, hoặc response bị cắt. " +
        "Thử lại, hoặc rút ngắn transcript nếu quá dài."
      );
    }
  }

  // Validate tối thiểu để frontend không bị crash nếu thiếu field
  const required = [
    "dictation",
    "writingQuestions",
    "vocabCards",
    "ideaBank",
    "trueFalseQuestions",
    "speakingPrompt",
    "readingPassage",
  ];
  for (const key of required) {
    if (!parsed[key]) throw new Error(`Thiếu field "${key}" trong kết quả AI trả về.`);
  }

  return parsed;
}

// Phần 5.5 — Speaking chấm bằng AI: nhận transcript câu trả lời nói (đã được trình duyệt nhận dạng
// giọng nói qua Web Speech API) và chấm theo IELTS Speaking band descriptor.
const SPEAKING_GRADE_PROMPT = `Bạn là giám khảo IELTS Speaking. Tôi sẽ đưa đề bài (cue card Part 2 hoặc
câu hỏi Part 3) và bản chuyển văn bản (transcript) câu trả lời nói của thí sinh (được nhận dạng tự động
nên có thể có lỗi chính tả nhỏ do speech-to-text, hãy bỏ qua lỗi chính tả rõ ràng do nhận dạng sai, tập
trung đánh giá nội dung/ngữ pháp/từ vựng thật sự).

Chấm theo 4 tiêu chí IELTS Speaking band descriptor (Fluency & Coherence, Lexical Resource, Grammatical
Range & Accuracy, Pronunciation - với Pronunciation chỉ đánh giá gián tiếp qua cách dùng từ/cấu trúc câu
vì không có audio thật). Xuất ra DUY NHẤT JSON hợp lệ, không markdown, theo đúng cấu trúc:

{
  "band": <số band tổng thể ước tính, ví dụ 6.5>,
  "criteria": {
    "fluencyCoherence": <band lẻ, ví dụ 6.0>,
    "lexicalResource": <band lẻ>,
    "grammaticalRange": <band lẻ>
  },
  "strengths": ["điểm mạnh 1 (tiếng Việt, ngắn gọn)", "điểm mạnh 2"],
  "improvements": ["điểm cần cải thiện 1 (tiếng Việt, cụ thể, kèm ví dụ sửa nếu có)", "điểm cần cải thiện 2"],
  "feedback": "Nhận xét tổng quan ngắn gọn (2-3 câu, tiếng Việt)"
}

Chỉ trả JSON thuần, không thêm text hay \`\`\`json nào khác.`;

export async function gradeSpeakingAnswer(promptText, transcript, part) {
  const response = await generateContentWithRetry({
    contents: `${SPEAKING_GRADE_PROMPT}\n\nĐề bài (${part || "Speaking"}): ${promptText || "(không rõ đề bài)"}\n\nTranscript câu trả lời của thí sinh:\n${transcript}`,
    config: { responseMimeType: "application/json" },
  });

  let raw = response.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Gemini trả về JSON không hợp lệ (grade speaking):", raw);
    throw new Error("AI trả về dữ liệu không đúng định dạng khi chấm Speaking. Thử lại.");
  }
}

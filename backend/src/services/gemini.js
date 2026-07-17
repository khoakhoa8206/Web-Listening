import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  Thiếu GEMINI_API_KEY trong backend/.env — các lệnh gọi Gemini sẽ lỗi.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
        { "type": "blank", "id": "b1", "answer": "từ khóa bị ẩn", "blankType": "vocab" },
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
      "source": "câu gốc nguyên văn trong transcript có chứa từ này",
      "tip": "gợi ý câu trả lời mẫu Speaking Part 2 hoặc 3 có dùng từ này"
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
      "task2Question": "1 đề bài Writing Task 2 (tiếng Anh), cụ thể/nuanced theo phong cách đề thi 2026, gắn chặt với đúng luận điểm của video (KHÔNG phải dạng chung chung dễ áp template kiểu 'Is technology good or bad')",
      "task2Outline": {
        "thesis": "Luận điểm chính trả lời thẳng câu hỏi task2Question (tiếng Anh, 1 câu)",
        "bodyParagraphs": [
          {
            "mainPoint": "Luận điểm 1 (tiếng Anh)",
            "explanation": "Giải thích logic cho luận điểm 1 (tiếng Anh, 2-3 câu)",
            "example": "Ví dụ cụ thể lấy cảm hứng từ nội dung video (tiếng Anh)"
          },
          {
            "mainPoint": "Luận điểm 2 (tiếng Anh)",
            "explanation": "Giải thích logic cho luận điểm 2 (tiếng Anh, 2-3 câu)",
            "example": "Ví dụ cụ thể lấy cảm hứng từ nội dung video (tiếng Anh)"
          }
        ]
      }
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
  "speakingPrompt": {
    "part2": {
      "cueCard": "Describe a ... (đề bài Speaking Part 2 liên quan chủ đề video, đúng format cue card IELTS)",
      "bullets": ["gợi ý 1", "gợi ý 2", "gợi ý 3", "gợi ý 4"],
      "sampleOutline": "1 đoạn mẫu ngắn (4-5 câu, tiếng Anh) trả lời cue card trên, có dùng ít nhất 1 từ trong vocabCards"
    },
    "part3": [
      { "question": "1 câu hỏi Speaking Part 3 mở rộng chủ đề (tiếng Anh)", "tip": "Gợi ý hướng trả lời ngắn (tiếng Việt)" }
    ]
  }
}

Quy tắc:
- dictation: chọn khoảng 7-10 đoạn hay nhất trong transcript, mỗi đoạn 3-5 câu gộp thành 1 object. Mỗi blank PHẢI có field "blankType": "vocab" (ẩn 1 từ/collocation quan trọng) hoặc "idea" (ẩn 1 cụm 3-8 từ mang 1 luận điểm/ý chính có thể tái sử dụng ở đề khác cùng chủ đề, để người học vừa nghe vừa nhớ ý). Trong tổng số blank, khoảng 60-70% là "vocab", 30-40% là "idea" — không dồn hết vào 1 loại. Tổng số "blank" trên toàn bộ dictation tuân theo SỐ LƯỢNG CÂU HỎI ở cuối prompt. Chia đều và tự nhiên số blank qua các đoạn, KHÔNG dồn nhiều blank vào 1-2 câu liền kề gây khó đọc (mỗi câu chỉ nên có tối đa 1 blank, trừ khi câu đó đủ dài). Nếu transcript quá ngắn để tạo đủ số lượng yêu cầu một cách có nghĩa (không lặp ý, không gượng ép), được phép tạo ít hơn — ưu tiên chất lượng và tính tự nhiên hơn là cố đạt đủ số lượng, và tuyệt đối KHÔNG bịa thêm nội dung không có trong transcript.
- writingQuestions: đúng 3 câu, luôn có đúng 4 options, chỉ 1 đáp án đúng.
- vocabCards: 10-15 từ/cụm từ, ưu tiên collocation tự nhiên hay gặp trong band 7+.
- ideaBank: gom thành 1-2 nhóm topic, mỗi topic 1-2 ý tưởng, và với MỖI topic phải có đúng 1 "task2Question" + 1 "task2Outline" (thesis + đúng 2 bodyParagraphs). Đề bài "task2Question" và toàn bộ "task2Outline" phải TRÁNH các câu mở bài/luận điểm sáo rỗng kiểu "In today's modern world...", "It is a well-known fact that..." — viết như 1 thí sinh Band 8 thật sự tư duy dựa trên nội dung video, không phải học thuộc mẫu có sẵn.
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

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `${SYSTEM_PROMPT}\n\nVideo link: ${videoUrl}\nTranscript:\n${transcript}${knownWordsBlock}${bandBlock}${countBlock}`,
    config: { responseMimeType: "application/json" },
  });

  let raw = response.text;

  // Phòng trường hợp model vẫn bọc ```json ... ``` dù đã dặn không làm vậy
  raw = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Gemini trả về JSON không hợp lệ:", raw);
    throw new Error("AI trả về dữ liệu không đúng định dạng JSON. Thử lại hoặc kiểm tra transcript đầu vào.");
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
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
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

# Phần 5 — Đã hoàn thành

## 5.1 Flashcard ôn từ vựng (Leitner spaced-repetition)
- DB: `saved_vocab` thêm cột `box` (1-5) và `next_review`.
- Backend: `GET /api/vocab/due` (từ đến hạn ôn), `POST /api/vocab/review` (đúng → lên box, ôn xa
  hơn; sai → về box 1, ôn lại sớm). Lịch ôn theo box: 1→1 ngày, 2→2 ngày, 3→4 ngày, 4→7 ngày, 5→14 ngày.
- Frontend: trang mới `/flashcards` (menu "Ôn từ") — lật thẻ xem nghĩa, bấm "Đã nhớ / Chưa nhớ".
  Có nút vào từ trang Kho từ vựng.

## 5.2 Chọn band điểm mục tiêu
- `VideoSelection.jsx`: chọn Band 6.0 / 7.0 / 8.0+ trước khi tạo bài (mặc định 7.0).
- Gemini nhận thêm chỉ dẫn độ khó theo band (từ vựng, độ phức tạp câu hỏi, độ dài/văn phong Reading).
- Lưu `band_target` vào bảng `lessons` để tham khảo sau.

## 5.3 Xuất từ vựng CSV / Anki
- Trang Kho từ vựng có nút "Xuất CSV" và "Xuất Anki" — xuất toàn bộ client-side, không cần backend.
- File Anki dạng .txt tab-separated (Front\tBack), import trực tiếp vào Anki qua File → Import.

## 5.4 Heatmap hoạt động + phân tích theo kỹ năng
- `GET /api/progress/summary` trả thêm `heatmap` (số lượt/ngày) và `skillBreakdown` (số lượt, phút,
  điểm TB mỗi kỹ năng: Listening/Writing/Reading/Speaking/Vocabulary).
- Trang Báo cáo hiển thị heatmap dạng lưới ô màu + thanh bar phân tích điểm yếu theo kỹ năng.

## 5.5 Speaking chấm bằng AI
- Ghi âm + nhận dạng giọng nói ngay trong trình duyệt qua Web Speech API (`SpeechRecognition`),
  không cần upload audio lên server — chỉ gửi transcript văn bản.
- Backend mới: `POST /api/speaking/grade` — Gemini chấm theo IELTS Speaking band descriptor
  (Fluency & Coherence, Lexical Resource, Grammatical Range), trả về band ước tính + điểm mạnh/cần
  cải thiện.
- Có ở cả Speaking Part 2 (cue card) và từng câu Part 3.
- Chỉ hoạt động trên trình duyệt hỗ trợ Web Speech API (Chrome desktop khuyến nghị); trình duyệt
  không hỗ trợ sẽ hiện thông báo thay vì lỗi.

## 5.6 Giới hạn tốc độ tạo bài (cooldown)
- Backend: `POST /api/lessons/generate` giới hạn 60 giây/lần theo IP (in-memory, đủ dùng cho app
  quy mô nhỏ). Vượt giới hạn trả `429` kèm `retryAfterSec`.
- Frontend: nút "AI Tự Động Soạn Bài" tự disable + đếm ngược khi đang trong cooldown, không cần
  người dùng tự đoán vì sao bị chặn.
- Đã bật `trust proxy` ở `server.js` để lấy đúng IP thật khi chạy sau proxy của Render.

## 5.7 Loading state & Error boundary
- Thêm `ErrorBoundary` bọc toàn bộ app (`main.jsx`) — lỗi render bất ngờ ở bất kỳ trang nào sẽ hiện
  màn hình lỗi thân thiện + nút "Về trang chủ" thay vì màn hình trắng.
- Nút tạo bài học hiện rõ "có thể mất 5-15 giây" trong lúc chờ Gemini, thay vì chỉ spinner mơ hồ.

---

## Cột DB mới (tự động migrate an toàn qua `ensureColumn`, không cần chạy tay)
- `saved_vocab.box`, `saved_vocab.next_review`
- `lessons.band_target`

Không cần thêm biến môi trường mới — mọi route mới đều tái dùng `GEMINI_API_KEY` và `APP_PIN` đã có.

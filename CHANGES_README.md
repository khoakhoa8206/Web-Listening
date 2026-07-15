# Những gì đã sửa

## 1. Xoá hết mock data
- `MainDashboard.jsx`: bỏ `STATS`, `TODAY_LESSONS`, `HISTORY` giả — giờ gọi `GET /api/progress` và `GET /api/progress/summary`.
- `AnalyticsReport.jsx`: bỏ `REPORT_DATA` giả — gọi `GET /api/progress/summary?range=...`.
- `VideoSelection.jsx`: bỏ `MOCK_VIDEOS` — gọi `GET /api/videos/search` để tìm video **thật** trên YouTube.
- `backend/routes/videos.js`: bỏ `MOCK_TRANSCRIPT` — dùng thư viện `youtube-transcript` để lấy phụ đề thật.
- Đã xoá `backend/data/app.db` cũ (có 2 lesson test) để bạn bắt đầu sạch.

## 2. Bài đã làm giờ được lưu thật
- Bảng `progress` có thêm cột `type` (Listening/Writing/Reading/Speaking).
- Mỗi phần bài học (nghe điền từ, Writing MCQ, True/False, Speaking) tự gọi `saveProgress()` khi bạn làm xong phần đó — không chỉ mỗi phần nghe như trước.
- "Lưu vào kho từ vựng" ở tab Từ vựng giờ gọi API thật (`/api/vocab`), lưu vào bảng `saved_vocab` (bảng này đã có sẵn trong DB nhưng trước đó chưa được nối route/API).
- Dashboard & Báo cáo đọc lại đúng những gì bạn đã lưu, không còn số liệu bịa.

## 3. AI tìm video & soạn bài phù hợp
- `backend/src/services/youtube.js` (mới): tìm video thật qua YouTube Data API v3, lọc theo chủ đề bạn chọn (Giáo dục/Môi trường/Công nghệ/Y tế) + ưu tiên video có phụ đề.
- **Cần thêm `YOUTUBE_API_KEY` vào `backend/.env`** (lấy free tại Google Cloud Console → bật "YouTube Data API v3" → tạo API key). Nếu thiếu key, trang "Chọn bài học" sẽ báo lỗi rõ ràng thay vì hiện video giả.
- Lấy transcript thật (không mock) qua thư viện `youtube-transcript`.
- Lấy tiêu đề video thật qua YouTube oEmbed (không cần key) để hiển thị đúng tên video thay vì URL.

## 4. Đa dạng dạng bài + biết khi nào bắt đầu
- Gemini giờ soạn thêm **True/False/Not Given** (kiểu Reading) và **Speaking Part 2 + Part 3** (cue card + câu mẫu + câu hỏi mở rộng), ngoài Dictation, Writing MCQ, Vocab, Idea Bank sẵn có.
- `ListeningWorkspace.jsx`: thêm màn hình **"Bắt đầu làm bài"** rõ ràng trước khi video/bài tập hiện ra — thời gian làm bài (`minutes`) được tính từ lúc bấm nút này, không còn số `1` cứng như trước.
- Mỗi tab trong "Khai thác IELTS" tự báo khi bạn hoàn thành + lưu tiến độ với đúng loại kỹ năng.

# Cần làm trước khi chạy

```bash
cd backend && npm install
cd ../frontend && npm install
cd .. && npm install   # nếu bạn dùng script concurrently ở gốc
```

Thêm vào `backend/.env`:
```
GEMINI_API_KEY=...        # đã có sẵn
YOUTUBE_API_KEY=...        # THÊM MỚI — bắt buộc để tìm video thật
PORT=8787
```

Sau đó chạy như bình thường (`npm run dev` ở gốc, hoặc chạy riêng backend/frontend).

# Cập nhật thêm (lần 2)

## 5. Nút "Làm lại" giờ mở đúng bài đã làm
- Trước: bấm "Làm lại" chỉ đá về trang "Chọn bài học" (vì chưa nối logic thật).
- Giờ: thêm `GET /api/lessons/:id` ở backend để lấy lại đúng nội dung bài đã lưu (không gọi lại Gemini, không tốn quota). Bấm "Làm lại" sẽ mở thẳng vào bài — Nghe thì vào `/listening`, Writing/Reading/Speaking thì vào `/exploration` đúng tab đó.

## 6. Trang "Kho từ vựng" (mới)
- Tính năng lưu từ vựng đã có sẵn trước đó (nút "Lưu vào kho từ vựng" ở tab Từ vựng) nhưng **chưa có nơi xem lại toàn bộ** — đó là lý do bạn không thấy.
- Đã thêm trang mới `/vocab` (menu "Từ vựng" trên thanh điều hướng): liệt kê toàn bộ từ đã lưu, có ô tìm kiếm theo từ/nghĩa, và nút xoá từng từ.

- YouTube Data API free quota ~100 search request/ngày — đủ dùng cá nhân nhưng nếu deploy công khai nên cache kết quả tìm kiếm.
- `youtube-transcript` lấy phụ đề qua trang YouTube công khai, không dùng API chính thức — một số video có thể bị chặn tuỳ khu vực/thời điểm; nếu lỗi, hãy thử video khác.
- "Mục tiêu hôm nay" hiện đơn giản là đếm số bài đã làm thật trong ngày / mục tiêu 5 (đổi hằng số `DAILY_GOAL` trong `MainDashboard.jsx` nếu muốn khác).

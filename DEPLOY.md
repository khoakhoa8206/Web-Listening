# Deploy: Netlify (frontend) + Render (backend) + Neon (Postgres)

## 0. Vì sao phải đổi DB (đã làm ở 4.1)

App trước đây dùng SQLite file (`backend/data/app.db`) qua `better-sqlite3`. Trên Render Web Service,
filesystem **không persistent** giữa các lần deploy/restart (trừ khi trả phí Persistent Disk) — file
`.db` sẽ mất dữ liệu bất cứ lúc nào server khởi động lại. Đã chuyển toàn bộ `db.js` + 4 route
(`lessons.js`, `vocab.js`, `progress.js`, `videos.js`) sang **Postgres** (`pg`, bất đồng bộ,
`$1,$2...` placeholder) — dùng được với Neon.tech hoặc Supabase, cả hai đều có free tier bền vững.
Đã test end-to-end với 1 Postgres cục bộ: tạo bảng, migrate cột mới, save/get/delete vocab, save/get
progress, tính summary — tất cả hoạt động đúng.

---

## 1. Tạo Postgres miễn phí (Neon.tech)

1. Vào https://neon.tech, đăng ký, tạo 1 Project mới.
2. Vào project → lấy **Connection string** dạng:
   `postgresql://user:password@ep-xxxx.neon.tech/dbname?sslmode=require`
3. Không cần chạy migration tay — `initDb()` trong `backend/src/db.js` tự tạo bảng + thêm cột còn thiếu
   mỗi khi server khởi động (an toàn, không phá dữ liệu cũ).

(Muốn dùng Supabase thay Neon cũng được — chỉ cần lấy đúng connection string Postgres, code không đổi.)

---

## 2. Deploy Backend lên Render

1. Push code lên GitHub (nhớ kiểm tra `.env` **không** nằm trong git — đã có `.gitignore` chặn sẵn,
   chỉ `backend/.env.example` là được commit).
2. Trên Render dashboard → **New → Web Service** → connect repo.
3. Cấu hình:
   - **Root Directory**: `backend`
   - **Build command**: `npm install`
   - **Start command**: `npm start` (đã có script `"start": "node src/server.js"` trong `package.json`)
4. Thêm **Environment Variables**:
   | Key | Giá trị |
   |---|---|
   | `GEMINI_API_KEY` | key thật của bạn |
   | `YOUTUBE_API_KEY` | key thật của bạn |
   | `DATABASE_URL` | connection string Neon ở bước 1 |
   | `FRONTEND_URL` | domain Netlify (thêm ở bước 3, có thể để tạm `http://localhost:5173` rồi sửa lại sau) |
   | `APP_PIN` | (tuỳ chọn) 1 mã PIN để chặn spam — xem mục 4 |
   | `PORT` | không cần set, Render tự cấp |
5. Deploy. Kiểm tra log thấy `✅ Đã kết nối Postgres và kiểm tra schema.` và
   `✅ Backend chạy tại http://0.0.0.0:<port>` là backend đã sống. Test nhanh:
   `https://<tên-service>.onrender.com/api/health` → phải trả `{"ok":true}`.

---

## 3. Deploy Frontend lên Netlify

1. Trên Netlify → **Add new site → Import from Git** → chọn repo.
2. Cấu hình (đã có sẵn trong `frontend/netlify.toml`, Netlify sẽ tự đọc):
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
3. Thêm **Environment variable**: `VITE_API_URL` = `https://<tên-service>.onrender.com`
   (KHÔNG kèm `/api` ở cuối — code tự thêm).
4. Deploy. `frontend/public/_redirects` (`/* /index.html 200`) đã có sẵn nên refresh trang con
   (`/listening`, `/reading`, ...) không bị lỗi 404 của react-router.
5. Sau khi có domain Netlify thật (vd `https://ielts-abc.netlify.app`), quay lại Render → cập nhật
   `FRONTEND_URL` thành domain này → redeploy backend để CORS chỉ cho phép đúng domain đó
   (không còn để `*`).

---

## 4. Bảo vệ chi phí/quota khi public (đã làm ở 4.4)

- **YouTube quota** (~100 request/ngày): `backend/src/routes/videos.js` đã cache kết quả tìm kiếm
  theo query trong bộ nhớ, TTL 3 giờ — nhiều người chọn cùng 1 chủ đề trong 3 giờ sẽ dùng lại cache
  thay vì gọi lại YouTube API. Cache reset khi Render restart/redeploy (chấp nhận được vì mục tiêu
  chỉ giảm tải trong 1 phiên).
- **Gemini quota/chi phí**: thêm middleware `requirePin` (`backend/src/middleware/requirePin.js`),
  áp dụng cho `POST /api/lessons/generate` và `GET /api/videos/search` — 2 route tốn quota nhất.
  - Nếu **không set** `APP_PIN` trong env → middleware bỏ qua hoàn toàn (dùng khi test/dev, hoặc bạn
    chấp nhận public hoàn toàn).
  - Nếu **có set** `APP_PIN` (vd `APP_PIN=8386`) → mọi request tới 2 route trên phải kèm header
    `x-app-pin` đúng giá trị, nếu không sẽ nhận `401`.
  - Frontend (`frontend/src/services/api.js`) đã xử lý sẵn: khi gặp `401`, tự `window.prompt()` hỏi
    PIN 1 lần, lưu vào `localStorage`, và tự động gửi kèm cho các lần gọi sau — không cần sửa gì
    thêm ở UI.

---

## 5. Test sau deploy (đã tự test được phần local, cần bạn test lại trên môi trường thật)

Mình đã tự chạy được các bước sau trên máy (Postgres cục bộ + Node) và xác nhận hoạt động đúng:
- `initDb()` tạo bảng + migrate cột mới thành công.
- `POST/GET/DELETE /api/vocab` — chuẩn hoá từ (không phân biệt hoa/thường) hoạt động đúng.
- `POST/GET /api/progress` + `GET /api/progress/summary` — tính đúng streak/minutes/band.
- CORS chặn đúng domain lạ (trả JSON lỗi gọn, không lộ stack trace).
- `APP_PIN` chặn đúng 401 khi thiếu/sai PIN trên 2 route tốn quota.
- `npm run build` ở frontend chạy sạch, `VITE_API_URL` được build đúng vào bundle, `_redirects` có
  trong thư mục `dist`.

Việc mình **không tự làm được** (cần môi trường thật của bạn): gọi Gemini/YouTube API thật (cần key
thật + mạng ngoài không có trong sandbox của mình), và test trên Render/Netlify thật. Sau khi deploy,
bạn tự chạy full luồng: chọn video → tạo bài (Gemini + YouTube thật) → làm Listening/Reading/
Writing/Speaking → lưu vocab → xem Dashboard/Báo cáo → **restart service trên Render** (Manual Deploy
→ Restart) → xác nhận dữ liệu vẫn còn nguyên (chứng tỏ Postgres hoạt động đúng, không còn phụ thuộc
file cục bộ).

// Middleware bảo vệ các route tốn quota (Gemini / YouTube Data API) khi app được deploy công khai.
// Nếu không set APP_PIN trong biến môi trường, middleware bỏ qua hoàn toàn (phù hợp dev local).
// Frontend gửi PIN qua header "x-app-pin".
export function requirePin(req, res, next) {
  const pin = process.env.APP_PIN;
  if (!pin) return next();

  if (req.header("x-app-pin") !== pin) {
    return res.status(401).json({ error: "Sai hoặc thiếu mã PIN truy cập." });
  }
  next();
}

import React, { useState, useEffect } from "react";

const QUOTES = [
  "Mỗi lần thất bại là một bước để tiến lên.",
  "Kiên nhẫn là chìa khóa của mọi thành công.",
  "Hôm nay bạn làm việc khó nhất, hôm sau sẽ dễ hơn.",
  "Không bao giờ quá muộn để bắt đầu lại.",
  "Thành công không đến từ nơi khác, nó đến từ nỗ lực của bạn.",
  "Bạn không thể thay đổi quá khứ, nhưng bạn có thể tạo nên tương lai.",
  "Mỗi lần nghe là một bước gần hơn đến mục tiêu.",
  "Hãy tập trung vào tiến bộ, không phải hoàn hảo.",
  "Sự kiên trì là bí quyết thắng lợi.",
  "Khi muốn từ bỏ, hãy nhớ lý do bạn bắt đầu.",
  "Từng giây học là từng giây đầu tư cho tương lai.",
  "Bạn có khả năng làm được những điều tuyệt vời hơn bạn nghĩ.",
  "Không cái gì là quá khó, chỉ cần bạn sẵn sàng nỗ lực.",
  "Từng lỗi là một cơ hội học tập.",
  "Hôm nay công việc khó, nhưng hôm sau bạn sẽ cảm thấy tự hào.",
  "Thành công chỉ là tổng của những nỗ lực nhỏ hàng ngày.",
  "Bạn đang làm tốt hơn bạn nghĩ.",
  "Đặt mục tiêu cao, nhưng hành động từng bước nhỏ.",
  "Kỹ năng nghe không phụ thuộc vào tài năng, mà phụ thuộc vào luyện tập.",
  "Mỗi bài tập là một cơ hội để bạn trở nên giỏi hơn.",
  "Every failure is a step closer to success.",
  "Patience is the key to mastery.",
  "Today's hard work is tomorrow's victory.",
  "It's never too late to start again.",
  "Success comes from effort, not luck.",
  "You can't change the past, but you can create your future.",
  "Every listening session brings you closer to your goal.",
  "Focus on progress, not perfection.",
  "Consistency is the secret to success.",
  "When you want to quit, remember why you started.",
  "Every second of study is an investment in your future.",
  "You're capable of more than you think.",
  "Nothing is too hard when you're willing to work for it.",
  "Every mistake is an opportunity to learn.",
  "Today is hard, but tomorrow you'll feel proud.",
  "Success is just the sum of small daily efforts.",
  "You're doing better than you believe.",
  "Dream big, but take small steps.",
  "Listening skills come from practice, not talent.",
  "Every exercise is a chance to become better.",
];

export default function LoadingScreen() {
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50">
      {/* Seedling icon animation */}
      <div className="mb-8 flex flex-col items-center">
        <div
          style={{
            animation: "spin 2s linear infinite",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            fill="none"
            className="h-16 w-16"
          >
            <circle cx="24" cy="24" r="22" stroke="#f9a8d4" strokeWidth="3" strokeDasharray="8 4" />
            <path d="M24 38 L24 22" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
            <path d="M24 30 C24 30 16 27 15 19 C15 19 23 18 24 26" fill="#4ade80" />
            <path d="M24 25 C24 25 32 21 34 13 C34 13 25 13 24 22" fill="#86efac" />
          </svg>
        </div>

        <p className="mt-4 text-sm font-semibold tracking-widest text-pink-400 uppercase">
          AI đang soạn bài{dots}
        </p>
      </div>

      {/* Quote card */}
      <div className="mx-4 max-w-sm rounded-2xl border border-pink-100 bg-white/80 px-7 py-5 shadow-sm text-center backdrop-blur-sm">
        <span className="mb-2 block text-2xl text-pink-200">"</span>
        <p className="text-sm leading-relaxed text-slate-600 italic">{quote}</p>
        <span className="mt-1 block text-2xl text-pink-200">"</span>
      </div>

      <p className="mt-6 text-xs text-pink-300">Có thể mất 5–15 giây, vui lòng chờ nhé 🌱</p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

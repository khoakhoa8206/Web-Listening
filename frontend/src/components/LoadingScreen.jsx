import React, { useState, useEffect } from "react";

const QUOTES = [
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
  "The expert in anything was once a beginner.",
  "Don't watch the clock; do what it does. Keep going.",
  "Hard work beats talent when talent doesn't work hard.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
];

// Spinning cat SVG (CSS animation)
function SpinningCat() {
  return (
    <div style={{ animation: "catSpin 1.2s linear infinite", display: "inline-block" }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 80 80"
        fill="none"
        className="h-20 w-20"
      >
        {/* Body */}
        <ellipse cx="40" cy="48" rx="18" ry="20" fill="#f9a8d4" />
        {/* Head */}
        <circle cx="40" cy="28" r="16" fill="#fecdd3" />
        {/* Ears */}
        <polygon points="26,16 20,4 33,12" fill="#fecdd3" />
        <polygon points="54,16 60,4 47,12" fill="#fecdd3" />
        {/* Inner ears */}
        <polygon points="27,15 22,7 32,13" fill="#fbcfe8" />
        <polygon points="53,15 58,7 48,13" fill="#fbcfe8" />
        {/* Eyes */}
        <ellipse cx="33" cy="27" rx="3.5" ry="4" fill="#1e293b" />
        <ellipse cx="47" cy="27" rx="3.5" ry="4" fill="#1e293b" />
        <circle cx="34.2" cy="25.8" r="1.2" fill="white" />
        <circle cx="48.2" cy="25.8" r="1.2" fill="white" />
        {/* Nose */}
        <ellipse cx="40" cy="32" rx="2" ry="1.5" fill="#f472b6" />
        {/* Mouth */}
        <path d="M37 33.5 Q40 36 43 33.5" stroke="#f472b6" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Whiskers */}
        <line x1="20" y1="31" x2="35" y2="32" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
        <line x1="20" y1="34" x2="35" y2="33.5" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
        <line x1="45" y1="32" x2="60" y2="31" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
        <line x1="45" y1="33.5" x2="60" y2="34" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
        {/* Tail */}
        <path d="M58 55 Q72 50 68 65 Q64 72 58 65" stroke="#f9a8d4" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Paws */}
        <ellipse cx="29" cy="66" rx="7" ry="5" fill="#fecdd3" />
        <ellipse cx="51" cy="66" rx="7" ry="5" fill="#fecdd3" />
      </svg>
    </div>
  );
}

export default function LoadingScreen({ mode = "generating" }) {
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const isColdStart = mode === "coldstart";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50">
      {/* Cat animation */}
      <div className="mb-6 flex flex-col items-center">
        <SpinningCat />
        <p className="mt-5 text-sm font-semibold tracking-widest text-pink-400 uppercase">
          {isColdStart
            ? `Server is waking up${dots}`
            : `AI is preparing your lesson${dots}`}
        </p>
      </div>

      {/* Quote card */}
      <div className="mx-4 max-w-sm rounded-2xl border border-pink-100 bg-white/80 px-7 py-5 shadow-sm text-center backdrop-blur-sm">
        <span className="mb-2 block text-2xl text-pink-200">"</span>
        <p className="text-sm leading-relaxed text-slate-600 italic">{QUOTES[quoteIdx]}</p>
        <span className="mt-1 block text-2xl text-pink-200">"</span>
      </div>

      <p className="mt-6 text-xs text-pink-300">
        {isColdStart
          ? "The server is cold-starting, this may take 20–40 seconds 🐱"
          : "This may take 5–15 seconds, please wait 🐱"}
      </p>

      <style>{`
        @keyframes catSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

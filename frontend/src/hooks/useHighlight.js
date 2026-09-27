import { useState, useEffect, useCallback } from "react";

// storageKey = "highlights_<lessonId hoặc articleSlug>"
// Mỗi highlight = { id, start, end, color } — start/end là vị trí ký tự trong textContent của container.
export function useHighlight(storageKey) {
  const [highlights, setHighlights] = useState(() => {
    try {
      // Bỏ highlight kiểu cũ (lưu theo text, không có vị trí)
      return JSON.parse(localStorage.getItem(storageKey) || "[]").filter((h) => h.start != null);
    } catch {
      return [];
    }
  });

  // Lưu mỗi khi highlights thay đổi
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(highlights));
    }
  }, [highlights, storageKey]);

  // Không giới hạn số lần tô; tô đè lên vùng cũ thì màu mới thắng. color = null → xóa màu.
  const addHighlight = useCallback((h) => {
    setHighlights((prev) => [...prev, { ...h, id: Date.now() }]);
  }, []);

  const removeHighlight = useCallback((id) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const clearAll = useCallback(() => setHighlights([]), []);

  return { highlights, addHighlight, removeHighlight, clearAll };
}

// Màu tại vị trí pos (highlight mới nhất phủ pos thắng), null nếu không tô.
export function colorAt(highlights, pos) {
  for (let i = highlights.length - 1; i >= 0; i--) {
    const h = highlights[i];
    if (pos >= h.start && pos < h.end) return h.color;
  }
  return null;
}

// Cắt text (bắt đầu tại vị trí offset trong container) thành các đoạn liền màu.
export function splitByColor(text, offset, highlights) {
  const parts = [];
  for (let i = 0; i < text.length; i++) {
    const color = colorAt(highlights, offset + i);
    const last = parts[parts.length - 1];
    if (last && last.color === color) last.text += text[i];
    else parts.push({ text: text[i], color });
  }
  return parts;
}

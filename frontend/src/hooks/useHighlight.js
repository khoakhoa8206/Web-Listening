import { useState, useEffect, useCallback } from "react";

// storageKey = "highlights_<lessonId hoặc articleSlug>"
export function useHighlight(storageKey) {
  const [highlights, setHighlights] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
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

  // Thêm highlight mới: { id, text, color, startOffset, endOffset, containerPath }
  const addHighlight = useCallback((highlightData) => {
    setHighlights((prev) => {
      // Tránh trùng lặp cùng đoạn text
      if (prev.some((h) => h.text === highlightData.text && h.startOffset === highlightData.startOffset)) {
        return prev;
      }
      return [...prev, { ...highlightData, id: Date.now() }];
    });
  }, []);

  const removeHighlight = useCallback((id) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const clearAll = useCallback(() => setHighlights([]), []);

  return { highlights, addHighlight, removeHighlight, clearAll };
}
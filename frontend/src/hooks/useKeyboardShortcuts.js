import { useState, useEffect } from "react";

const DEFAULT_SHORTCUTS = {
  togglePlay: "Space",
  prevSentence: "ArrowLeft",
  nextSentence: "ArrowRight",
};

const STORAGE_KEY = "listening_keyboard_shortcuts";

export function useKeyboardShortcuts() {
  const [shortcuts, setShortcuts] = useState(() => {
    try {
      return { ...DEFAULT_SHORTCUTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  }, [shortcuts]);

  const updateShortcut = (action, key) => {
    setShortcuts((prev) => ({ ...prev, [action]: key }));
  };

  const resetShortcuts = () => setShortcuts(DEFAULT_SHORTCUTS);

  return { shortcuts, updateShortcut, resetShortcuts };
}
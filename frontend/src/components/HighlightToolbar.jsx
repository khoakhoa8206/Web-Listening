import { useState, useCallback, useRef, useEffect } from "react";

const COLORS = [
  { name: "Vàng", value: "#fef08a" },
  { name: "Xanh lá", value: "#bbf7d0" },
  { name: "Xanh dương", value: "#bfdbfe" },
  { name: "Hồng", value: "#fbcfe8" },
  { name: "Cam", value: "#fed7aa" },
];

// Component hiện floating toolbar khi user bôi đen text
export default function HighlightToolbar({ containerRef, onHighlight }) {
  const [toolbar, setToolbar] = useState(null); // { x, y, selectedText, range }
  const toolbarRef = useRef(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setToolbar(null);
      return;
    }
    const text = sel.toString().trim();
    const range = sel.getRangeAt(0);

    // Chỉ hiện toolbar nếu selection nằm trong container
    if (containerRef.current && !containerRef.current.contains(range.commonAncestorContainer)) {
      setToolbar(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    setToolbar({
      x: rect.left + rect.width / 2,
      y: rect.top - 48,
      selectedText: text,
      range,
    });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  if (!toolbar) return null;

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        left: toolbar.x,
        top: toolbar.y,
        transform: "translateX(-50%)",
        zIndex: 999,
      }}
      className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 shadow-lg px-2 py-1.5"
      onMouseDown={(e) => e.preventDefault()} // giữ selection
    >
      <span className="text-xs text-slate-400 mr-1">Highlight:</span>
      {COLORS.map((c) => (
        <button
          key={c.value}
          title={c.name}
          onClick={() => {
            onHighlight({ text: toolbar.selectedText, color: c.value });
            window.getSelection()?.removeAllRanges();
            setToolbar(null);
          }}
          style={{ background: c.value }}
          className="h-5 w-5 rounded-full border border-slate-300 hover:scale-110 transition-transform"
        />
      ))}
      <button
        onClick={() => setToolbar(null)}
        className="ml-1 text-slate-400 hover:text-slate-600 text-xs"
      >✕</button>
    </div>
  );
}
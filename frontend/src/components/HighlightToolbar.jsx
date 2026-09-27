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
  const [custom, setCustom] = useState("#fca5a5");

  const handleMouseUp = useCallback((e) => {
    if (toolbarRef.current?.contains(e.target)) return; // bấm trong toolbar (vd: ô chọn màu) thì giữ nguyên
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);

    // Chỉ hiện toolbar nếu selection nằm trong container
    if (!containerRef.current || !containerRef.current.contains(range.commonAncestorContainer)) {
      setToolbar(null);
      return;
    }

    // Vị trí ký tự của vùng chọn trong textContent của container
    const pre = document.createRange();
    pre.selectNodeContents(containerRef.current);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;

    const rect = range.getBoundingClientRect();
    setToolbar({
      x: rect.left + rect.width / 2,
      y: rect.top - 48,
      start,
      end: start + range.toString().length,
    });
  }, [containerRef]);

  const apply = (color) => {
    onHighlight({ start: toolbar.start, end: toolbar.end, color });
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
  };

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
          onClick={() => apply(c.value)}
          style={{ background: c.value }}
          className="h-5 w-5 rounded-full border border-slate-300 hover:scale-110 transition-transform"
        />
      ))}
      <input
        type="color"
        title="Chọn màu khác"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
      />
      <button
        title="Tô màu vừa chọn"
        onClick={() => apply(custom)}
        style={{ background: custom }}
        className="h-5 w-5 rounded-full border-2 border-slate-500 hover:scale-110 transition-transform"
      />
      <button
        title="Xóa màu"
        onClick={() => apply(null)}
        className="ml-1 rounded border border-slate-200 px-1.5 text-xs text-slate-500 hover:text-red-500"
      >Xóa</button>
      <button
        onClick={() => setToolbar(null)}
        className="ml-1 text-slate-400 hover:text-slate-600 text-xs"
      >✕</button>
    </div>
  );
}
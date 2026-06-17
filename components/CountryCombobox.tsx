"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/countries";

// 國家/地區可搜尋下拉：固定清單（教育部國別代碼），可用中文／英文／代碼搜尋；
// 也允許自由輸入（清單外的地區仍可手動填寫）。
export default function CountryCombobox({ value, onChange, className }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.zh.toLowerCase().includes(s) ||
        c.en.toLowerCase().includes(s) ||
        c.code.toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <div className="relative" ref={boxRef}>
      <input
        className={className ?? "inp"}
        value={value}
        placeholder="輸入國名搜尋（中／英／代碼）"
        onFocus={() => { setQ(""); setOpen(true); }}
        onChange={(e) => { onChange(e.target.value); setQ(e.target.value); setOpen(true); }}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-white shadow-lg text-sm">
          {list.length === 0 && (
            <div className="px-3 py-2 text-gray-400">查無符合的國家，可直接輸入文字</div>
          )}
          {list.map((c) => (
            <button
              type="button"
              key={c.code + c.zh}
              onMouseDown={(e) => { e.preventDefault(); onChange(c.zh); setOpen(false); }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100"
            >
              <span>{c.zh}</span>
              <span className="text-xs text-gray-400">{c.en} · {c.continent}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";

type LogEntry = { id: string; turn: number; text: string; playerId: 0 | 1 };

interface Props {
  entries: LogEntry[];
  side: "left" | "right";    // left = blue (0), right = red (1)
  title?: string;
  maxItems?: number;
  storageKey?: string;
  className?: string;         // optional extra class from parent container
}

const TEAM = {
  0: { name: "Blue", text: "text-blue-700", border: "border-blue-600" },
  1: { name: "Red",  text: "text-red-700",  border: "border-red-600"  },
} as const;

export default function CombatLogPanel({
  entries,
  side,
  title,
  maxItems = 18,
  storageKey,
  className = "",
}: Props) {
  const playerId: 0 | 1 = side === "left" ? 0 : 1;
  const listRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (!storageKey) return false;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(collapsed));
    } catch {}
  }, [collapsed, storageKey]);

  const filtered = useMemo(
    () => entries.filter((e) => e.playerId === playerId).slice(-maxItems),
    [entries, playerId, maxItems]
  );

  useEffect(() => {
    if (collapsed) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered.length, collapsed]);

  return (
    <div
      className={[
        "absolute bottom-4 w-[330px] max-h-[190px] overflow-hidden bg-white/95",
        "border border-black rounded-lg shadow-[2px_3px_0_rgba(0,0,0,0.2)]",
        "flex flex-col",
        side === "left" ? "left-4" : "right-4",
        className,
      ].join(" ")}
    >
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black bg-white/90">
        <div className="font-bold text-sm">
          {title ?? `${TEAM[playerId].name} Actions`}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] opacity-70">{filtered.length}</span>
          <button
            type="button"
            onClick={() => setCollapsed((s) => !s)}
            className="text-[11px] border border-black rounded-md px-2 py-0.5 bg-white hover:bg-gray-100 active:translate-y-[1px]"
            aria-label={collapsed ? "Show log" : "Hide log"}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div ref={listRef} className="overflow-y-auto px-3 py-2">
          {filtered.length === 0 ? (
            <div className="text-xs opacity-60">No events yet.</div>
          ) : (
            filtered.map((e) => (
              <div
                key={e.id}
                className={[
                  "text-xs leading-snug mb-1.5 pl-2",
                  "border-l-4",
                  TEAM[playerId].text,
                  TEAM[playerId].border,
                ].join(" ")}
              >
                <strong className="text-black">Turn {e.turn}:</strong> {e.text}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

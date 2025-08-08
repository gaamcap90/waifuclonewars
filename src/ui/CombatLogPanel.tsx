import React, { useEffect, useMemo, useRef, useState } from "react";

type LogEntry = { id: string; turn: number; text: string; playerId: 0 | 1 };

interface Props {
  entries: LogEntry[];
  side: "left" | "right"; // left = playerId 0 (blue), right = playerId 1 (red)
  title?: string;
  maxItems?: number;
  storageKey?: string; // optional localStorage key for collapsed state
}

const TEAM = {
  0: { name: "Blue", cls: "player1" },
  1: { name: "Red", cls: "player2" },
} as const;

export default function CombatLogPanel({
  entries,
  side,
  title,
  maxItems = 18,
  storageKey,
}: Props) {
  const playerId: 0 | 1 = side === "left" ? 0 : 1;
  const colorText = playerId === 0 ? "text-player1" : "text-player2";
  const colorBorder = playerId === 0 ? "border-player1" : "border-player2";

  const defaultCollapsed = false;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (!storageKey) return defaultCollapsed;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : defaultCollapsed;
    } catch {
      return defaultCollapsed;
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

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (collapsed) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered.length, collapsed]);

  return (
    <div
      className={[
        "absolute z-20",
        side === "left" ? "left-4 bottom-4" : "right-4 bottom-4",
        "w-80 max-h-48 overflow-hidden",
        "bg-card text-foreground",
        "border border-foreground rounded-md shadow-sm",
        "flex flex-col",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-foreground bg-card/90">
        <div className="font-bold text-sm">{title ?? `${TEAM[playerId].name} Actions`}</div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-70">{filtered.length}</span>
          <button
            type="button"
            onClick={() => setCollapsed((s) => !s)}
            className="text-xs px-2 py-1 rounded-md border border-foreground bg-background hover:bg-muted transition"
            aria-label={collapsed ? "Show log" : "Hide log"}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div ref={listRef} className="overflow-y-auto px-3 py-2 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-xs opacity-60">No events yet.</div>
          ) : (
            filtered.map((e) => (
              <div key={e.id} className={["text-xs leading-tight pl-2 border-l-4", colorText, colorBorder].join(" ")}> 
                <strong className="text-foreground">Turn {e.turn}:</strong> {e.text}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

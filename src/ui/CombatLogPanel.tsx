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
  0: {
    name: "Blue",
    accent: "rgba(96,165,250,0.8)",
    accentDim: "rgba(96,165,250,0.25)",
    accentBorder: "rgba(96,165,250,0.45)",
    headerBg: "rgba(30,58,138,0.35)",
    barColor: "rgba(96,165,250,0.6)",
  },
  1: {
    name: "Red",
    accent: "rgba(248,113,113,0.8)",
    accentDim: "rgba(248,113,113,0.25)",
    accentBorder: "rgba(248,113,113,0.45)",
    headerBg: "rgba(127,29,29,0.35)",
    barColor: "rgba(248,113,113,0.6)",
  },
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
  const team = TEAM[playerId];

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
        "absolute bottom-4 z-50 w-[300px] overflow-hidden",
        "flex flex-col",
        side === "left" ? "left-4" : "right-4",
        className,
      ].join(" ")}
      style={{
        background: "rgba(4,2,18,0.92)",
        border: `1px solid ${team.accentBorder}`,
        borderRadius: 12,
        boxShadow: `0 4px 24px rgba(0,0,0,0.55), 0 0 12px ${team.accentDim}`,
        fontFamily: "'Orbitron', sans-serif",
        maxHeight: collapsed ? undefined : 190,
      }}
    >
      {/* header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: team.headerBg,
          borderBottom: collapsed ? undefined : `1px solid ${team.accentBorder}`,
        }}
      >
        <div
          className="font-semibold tracking-widest uppercase"
          style={{ fontSize: 10, color: team.accent, letterSpacing: "0.12em" }}
        >
          {title ?? `${team.name} Actions`}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-1.5 py-0.5 font-bold"
            style={{
              fontSize: 9,
              background: team.accentDim,
              color: team.accent,
              border: `1px solid ${team.accentBorder}`,
            }}
          >
            {filtered.length}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((s) => !s)}
            className="transition-colors"
            style={{
              fontSize: 9,
              padding: "2px 8px",
              borderRadius: 6,
              border: `1px solid ${team.accentBorder}`,
              background: team.accentDim,
              color: team.accent,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.08em",
            }}
            aria-label={collapsed ? "Show log" : "Hide log"}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div
          ref={listRef}
          className="overflow-y-auto px-3 py-2 space-y-1.5"
          style={{ maxHeight: 145 }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                fontSize: 10,
                color: "rgba(148,163,184,0.5)",
                fontFamily: "inherit",
                letterSpacing: "0.06em",
                paddingTop: 4,
              }}
            >
              No events yet.
            </div>
          ) : (
            filtered.map((e) => (
              <div
                key={e.id}
                className="flex gap-2 items-baseline"
                style={{ fontSize: 10, lineHeight: 1.5 }}
              >
                <span
                  className="shrink-0 font-bold"
                  style={{
                    color: team.accent,
                    letterSpacing: "0.06em",
                    fontSize: 9,
                  }}
                >
                  T{e.turn}
                </span>
                <span
                  style={{
                    borderLeft: `2px solid ${team.barColor}`,
                    paddingLeft: 6,
                    color: "rgba(203,213,225,0.85)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {e.text}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

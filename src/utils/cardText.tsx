import React from "react";

// Splits card description text into colored tokens.
// Numbers (optionally prefixed by ~ or suffixed by %, x, ×) → green.
// Stat keywords → their UI colors.
const SPLIT_RE = /(~?\d+(?:\.\d+)?[x×%]?|Might|Power|Defense|DEF|HP|AoE)/g;
const NUMERIC_RE = /^~?\d+(?:\.\d+)?[x×%]?$/;

const KEYWORD_COLOR: Record<string, string> = {
  Might:   '#fbbf24',
  Power:   '#c084fc',
  Defense: '#60a5fa',
  DEF:     '#60a5fa',
  HP:      '#f87171',
  AoE:     '#67e8f9',
};

export function CardDesc({ text }: { text: string }) {
  const parts = text.split(SPLIT_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (KEYWORD_COLOR[part])
          return <span key={i} style={{ color: KEYWORD_COLOR[part], fontWeight: 600 }}>{part}</span>;
        if (NUMERIC_RE.test(part))
          return <span key={i} style={{ color: '#4ade80', fontWeight: 700 }}>{part}</span>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

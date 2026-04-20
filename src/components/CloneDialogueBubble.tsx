// Clone dialogue speech bubble — positioned above a character's hex tile.
// Classic speech bubble shape with rounded corners and a tail pointing down.

import type { CharacterId } from '@/types/roguelike';

const HEX_SIZE = 50;
const HEX_W = HEX_SIZE * 2;
const HEX_H = Math.sqrt(3) * HEX_SIZE;

function hexCenter(q: number, r: number, ox: number, oy: number) {
  const x = HEX_SIZE * (1.5 * q) + ox + HEX_W / 2;
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r) + oy + HEX_H / 2;
  return { x, y };
}

export interface ActiveDialogue {
  id: string;
  characterId: CharacterId;
  characterName: string;
  text: string;
  position: { q: number; r: number };
  color: string;
  voiceKey?: string; // e.g. 'napoleon_kill_2' → /audio/voices/napoleon/napoleon_kill_2.mp3
}

interface Props {
  dialogue: ActiveDialogue;
  offsetX: number;
  offsetY: number;
}

export default function CloneDialogueBubble({ dialogue, offsetX, offsetY }: Props) {
  const c = hexCenter(dialogue.position.q, dialogue.position.r, offsetX, offsetY);
  const bg = 'rgba(8, 6, 24, 0.94)';

  return (
    <div
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y - 85,
        transform: 'translateX(-50%)',
        zIndex: 160,
        pointerEvents: 'none',
        animation: 'dialogue-in 0.3s ease-out, dialogue-out 0.4s ease-in 2.6s forwards',
      }}
    >
      {/* Bubble */}
      <div
        style={{
          background: bg,
          border: `1.5px solid ${dialogue.color}88`,
          borderRadius: 14,
          padding: '6px 12px',
          maxWidth: 210,
          minWidth: 60,
          boxShadow: `0 0 16px ${dialogue.color}20, 0 4px 14px rgba(0,0,0,0.7)`,
          position: 'relative',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontFamily: "'Orbitron', sans-serif",
            fontStyle: 'italic',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.4,
            textAlign: 'center',
          }}
        >
          {dialogue.text}
        </div>
      </div>
      {/* Speech bubble tail */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width="16" height="10" viewBox="0 0 16 10" style={{ display: 'block' }}>
          <path
            d="M0,0 L8,10 L16,0"
            fill={bg}
            stroke={`${dialogue.color}88`}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Cover the top border where tail meets bubble */}
          <rect x="1" y="0" width="14" height="2" fill={bg} />
        </svg>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useT } from "@/i18n";

interface EscapeMenuProps {
  onSaveQuit: () => void;
  onResign: () => void;
  onContinue: () => void;
}

type ConfirmAction = null | 'save' | 'resign';

const EscapeMenu = ({ onSaveQuit, onResign, onContinue }: EscapeMenuProps) => {
  const { t } = useT();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const handleConfirm = () => {
    if (confirmAction === 'save') onSaveQuit();
    if (confirmAction === 'resign') onResign();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(2,4,14,0.82)", backdropFilter: "blur(6px)" }}>
      <div
        className="relative flex flex-col"
        style={{
          width: 370,
          background: "rgba(2,4,14,0.96)",
          border: "1px solid rgba(34,211,238,0.18)",
          borderRadius: 14,
          boxShadow: "0 0 60px rgba(34,211,238,0.10), 0 0 0 1px rgba(167,139,250,0.07)",
          padding: "32px 28px 28px",
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-8 right-8"
          style={{
            height: 2,
            borderRadius: 99,
            background: "linear-gradient(to right, transparent, rgba(34,211,238,0.7), transparent)",
          }}
        />

        {confirmAction ? (
          /* ── Confirmation view ────────────────────────────────── */
          <>
            <p
              className="font-orbitron font-black text-center mb-4"
              style={{
                fontSize: "1.05rem",
                letterSpacing: "0.22em",
                color: confirmAction === 'resign' ? '#fca5a5' : '#e2e8f0',
                textShadow: confirmAction === 'resign'
                  ? '0 0 20px rgba(239,68,68,0.35)'
                  : '0 0 20px rgba(34,211,238,0.35)',
                textTransform: "uppercase",
              }}
            >
              {t.game.escMenu.confirmTitle}
            </p>

            <p
              className="text-center mb-8"
              style={{
                fontSize: "0.78rem",
                lineHeight: 1.6,
                color: "#94a3b8",
              }}
            >
              {confirmAction === 'save'
                ? t.game.escMenu.saveQuitDesc
                : t.game.escMenu.resignDesc}
            </p>

            <div className="flex gap-3">
              <MenuButton
                onClick={() => setConfirmAction(null)}
                icon="←"
                label={t.game.escMenu.cancel}
                accent="#64748b"
                flex
              />
              <MenuButton
                onClick={handleConfirm}
                icon={confirmAction === 'resign' ? '⚑' : '✓'}
                label={t.game.escMenu.yes}
                accent={confirmAction === 'resign' ? '#ef4444' : '#22d3ee'}
                danger={confirmAction === 'resign'}
                flex
              />
            </div>
          </>
        ) : (
          /* ── Main menu view ──────────────────────────────────── */
          <>
            <p
              className="font-orbitron font-black text-center mb-8"
              style={{
                fontSize: "1.05rem",
                letterSpacing: "0.22em",
                color: "#e2e8f0",
                textShadow: "0 0 20px rgba(34,211,238,0.35)",
                textTransform: "uppercase",
              }}
            >
              {t.game.escMenu.title}
            </p>

            <div className="flex flex-col gap-2">
              <MenuButton
                onClick={onContinue}
                icon="▶"
                label={t.game.escMenu.continue}
                accent="#22d3ee"
              />

              <MenuButton
                onClick={() => setConfirmAction('save')}
                icon="💾"
                label={t.game.escMenu.saveQuit}
                accent="#a78bfa"
              />

              <div
                className="my-2"
                style={{ height: 1, background: "rgba(255,255,255,0.07)", borderRadius: 99 }}
              />

              <MenuButton
                onClick={() => setConfirmAction('resign')}
                icon="⚑"
                label={t.game.escMenu.resign}
                accent="#ef4444"
                danger
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface MenuButtonProps {
  onClick: () => void;
  icon: string;
  label: string;
  accent: string;
  danger?: boolean;
  flex?: boolean;
}

const MenuButton = ({ onClick, icon, label, accent, danger, flex }: MenuButtonProps) => {
  const [hov, setHov] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="relative text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150"
      style={{
        flex: flex ? 1 : undefined,
        background: hov
          ? danger ? "rgba(239,68,68,0.10)" : `rgba(34,211,238,0.07)`
          : "transparent",
        border: `1px solid ${hov ? accent + "55" : "rgba(255,255,255,0.06)"}`,
        transition: "background 0.15s, border-color 0.15s",
        justifyContent: flex ? 'center' : undefined,
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 3,
          height: hov ? "60%" : "0%",
          background: accent,
          boxShadow: hov ? `0 0 8px ${accent}` : "none",
          transition: "height 0.15s, box-shadow 0.15s",
        }}
      />

      <span className="text-base w-5 text-center shrink-0 select-none">{icon}</span>

      <span
        className="font-orbitron font-semibold"
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.15em",
          color: hov ? (danger ? "#fca5a5" : "#e2e8f0") : (danger ? "#f87171" : "#94a3b8"),
          transform: hov ? "translateX(4px)" : "translateX(0)",
          transition: "color 0.15s, transform 0.15s",
          display: "inline-block",
        }}
      >
        {label}
      </span>
    </button>
  );
};

export default EscapeMenu;

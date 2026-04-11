import React from "react";
import { createPortal } from "react-dom";
import { Icon, GameState } from "@/types/game";
import { Crosshair, Sword, Heart } from "lucide-react";
import HPBar from "./HPBar";
import { useBuffCalculation } from "@/hooks/useBuffCalculation";
import { calcEffectiveStats } from "@/combat/buffs";
import { useT } from "@/i18n";
import { getCharacterPortrait } from "@/utils/portraits";

interface CharacterDetailPopupProps {
  character: Icon;
  gameState: GameState;
  onClose: () => void;
  position: { x: number; y: number };
}

const CharacterDetailPopup = ({ character, gameState, onClose, position }: CharacterDetailPopupProps) => {
  const { t } = useT();
  React.useEffect(() => {
    const handle = () => onClose();
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [onClose]);

  const { calculateBuffedStats } = useBuffCalculation();
  const buffedStats = calculateBuffedStats(character, gameState);
  const eff = calcEffectiveStats(gameState, character);

  const baseMight   = character.stats.might;
  const basePower   = character.stats.power;
  const baseDefense = character.stats.defense;

  const homeBaseMightBonus    = buffedStats.isOnHomeBase ? (baseMight   * 20) / 100 : 0;
  const homeBasePowerBonus    = buffedStats.isOnHomeBase ? (basePower   * 20) / 100 : 0;
  const homeBaseDefenseBonus  = buffedStats.isOnHomeBase ? (baseDefense * 20) / 100 : 0;
  const forestDefenseBonus    = buffedStats.isOnForest && !character.name.includes("Napoleon")
    ? (baseDefense * 25) / 100 : 0;
  const napoleonForestRange   = character.name.includes("Napoleon") && buffedStats.isOnForest;

  const fmt = (v: number) => (v % 1 === 0 ? v.toString() : v.toFixed(1));

  // Debuff display names pulled from translated card names
  const debuffLabel = (type: string): string => {
    const map: Record<string, string> = {
      mud_throw:   `🐾 ${t.cards.shared_mud_throw?.name ?? 'Mud Throw'}`,
      rooted:      `🌿 ${(t.cards as any).shared_entangle?.name ?? 'Rooted'}`,
      armor_break: `🔩 ${t.cards.shared_armor_break?.name ?? 'Armor Break'}`,
      silence:     `🤫 ${t.cards.shared_silence?.name ?? 'Silence'}`,
      poison:      `☠️ ${t.cards.shared_poison_dart?.name ?? 'Poison'}`,
      stun:        `⚡ Stun`,
      taunted:     `📢 Taunt`,
    };
    return map[type] ?? type;
  };

  const passiveText = (() => {
    if (character.name.includes("Napoleon"))
      return `${t.characters.napoleon.passive.name}: ${t.characters.napoleon.passive.desc}${napoleonForestRange ? ` (${t.game.popup.active})` : ""}`;
    if (character.name.includes("Genghis"))
      return `${t.characters.genghis.passive.name}: ${t.characters.genghis.passive.desc}${(character.passiveStacks ?? 0) > 0 ? ` ${character.passiveStacks}/3 stacks.` : ""}`;
    if (character.name.includes("Da Vinci"))
      return `${t.characters.davinci.passive.name}: ${t.characters.davinci.passive.desc}`;
    if (character.name.includes("Leonidas"))
      return `${t.characters.leonidas.passive.name}: ${t.characters.leonidas.passive.desc}${(character.passiveStacks ?? 0) > 0 ? ` ${character.passiveStacks}/3 stacks.` : ""}`;
    if (character.name.includes("Sun-sin"))
      return `${t.characters.sunsin.passive.name}: ${t.characters.sunsin.passive.desc} — ${t.characters.sunsin.passive.waterDesc}`;
    return character.passive ?? t.game.popup.noPassive;
  })();

  const portrait = getCharacterPortrait(character.name);

  const HERO_NAMES = ["Napoleon", "Genghis", "Da Vinci", "Leonidas", "Sun-sin", "Beethoven", "Huang"];
  const hasPassive = HERO_NAMES.some(n => character.name.includes(n)) || !!character.passive;

  const isBlue       = character.playerId === 0;
  const teamBorder   = isBlue ? "rgba(60,100,220,0.60)" : "rgba(220,60,60,0.60)";
  const teamAccent   = isBlue ? "#60a5fa" : "#f87171";
  const teamGradient = isBlue
    ? "linear-gradient(90deg, rgba(37,60,180,0.35) 0%, transparent 80%)"
    : "linear-gradient(90deg, rgba(180,37,37,0.35) 0%, transparent 80%)";

  const POPUP_W = 256;
  const clampedX = typeof window !== "undefined"
    ? Math.max(POPUP_W / 2 + 8, Math.min(position.x, window.innerWidth - POPUP_W / 2 - 8))
    : position.x;

  // Role display
  const roleIcon = character.role === "dps_ranged" ? <Crosshair className="w-3 h-3" />
                 : character.role === "dps_melee"  ? <Sword className="w-3 h-3" />
                 : character.role === "support"    ? <Heart className="w-3 h-3" />
                 : character.role === "tank"       ? <span className="text-[10px]">🛡</span>
                 : character.role === "hybrid"     ? <span className="text-[10px]">🌊</span>
                 : null;
  const roleLabel = character.role ? (t.roles as Record<string, string>)[character.role] ?? character.role : null;

  return createPortal(
    <div
      className="fixed z-50 pointer-events-auto"
      style={{ left: clampedX, top: position.y + 8, transform: "translate(-50%, 0)" }}
      onClick={e => e.stopPropagation()}
    >
      <div
        className="rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: POPUP_W,
          background: "linear-gradient(180deg, rgba(8,4,28,0.98) 0%, rgba(4,2,16,0.98) 100%)",
          border: `1px solid ${teamBorder}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.60), 0 0 20px ${isBlue ? "rgba(37,60,180,0.15)" : "rgba(160,20,20,0.15)"}`,
        }}
      >
        {/* Header */}
        <div className="px-3 py-2.5 flex items-center gap-3" style={{ background: teamGradient, borderBottom: `1px solid ${teamBorder}` }}>
          <div
            className="w-12 h-12 rounded-full overflow-hidden shrink-0"
            style={{ border: `2px solid ${teamAccent}88`, boxShadow: `0 0 8px ${teamAccent}40` }}
          >
            {portrait ? (
              <img src={portrait} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white"
                style={{ background: isBlue ? "rgba(37,99,235,0.9)" : "rgba(185,28,28,0.9)" }}>
                {character.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-orbitron font-bold text-sm text-white truncate">{character.name}</div>
            {roleLabel && (
              <div className="flex items-center gap-1 mt-0.5" style={{ color: teamAccent }}>
                {roleIcon}
                <span className="text-[10px]">{roleLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-3 py-2.5 space-y-2.5">
          {/* HP */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-orbitron text-[10px] text-slate-500 tracking-wider">HP</span>
              <span className="font-mono text-[11px] text-slate-300">{Math.floor(character.stats.hp)}/{character.stats.maxHp}</span>
            </div>
            <HPBar currentHP={character.stats.hp} maxHP={character.stats.maxHp} size="medium" />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {/* Might */}
            <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
              <div className="font-orbitron text-[9px] text-slate-500 tracking-wider">{t.archives.statLabels.might.toUpperCase()}</div>
              <div className="font-bold text-red-400">{Math.floor(eff.might)}</div>
              {(homeBaseMightBonus > 0 || buffedStats.cardBuffAtk > 0) && (
                <div className="text-[9px] text-slate-500 mt-0.5">
                  {homeBaseMightBonus   > 0 && `+${fmt(homeBaseMightBonus)} base `}
                  {buffedStats.cardBuffAtk > 0 && <span className="text-yellow-400">+{buffedStats.cardBuffAtk} card</span>}
                </div>
              )}
            </div>
            {/* Power */}
            <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.20)" }}>
              <div className="font-orbitron text-[9px] text-slate-500 tracking-wider">{t.archives.statLabels.power.toUpperCase()}</div>
              <div className="font-bold text-blue-400">{Math.floor(eff.power)}</div>
              {homeBasePowerBonus > 0 && (
                <div className="text-[9px] text-slate-500 mt-0.5">
                  {homeBasePowerBonus  > 0 && `+${fmt(homeBasePowerBonus)} base`}
                </div>
              )}
            </div>
            {/* Defense */}
            <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)" }}>
              <div className="font-orbitron text-[9px] text-slate-500 tracking-wider">{t.archives.statLabels.defense.toUpperCase()}</div>
              <div className="font-bold text-emerald-400">{Math.floor(eff.defense)}</div>
              {(homeBaseDefenseBonus > 0 || forestDefenseBonus > 0 || buffedStats.cardBuffDef > 0) && (
                <div className="text-[9px] text-slate-500 mt-0.5">
                  {homeBaseDefenseBonus > 0 && `+${fmt(homeBaseDefenseBonus)} base `}
                  {forestDefenseBonus   > 0 && `+${fmt(forestDefenseBonus)} forest `}
                  {buffedStats.cardBuffDef > 0 && <span className="text-yellow-400">+{buffedStats.cardBuffDef} card</span>}
                </div>
              )}
            </div>
            {/* Range */}
            <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)" }}>
              <div className="font-orbitron text-[9px] text-slate-500 tracking-wider">{t.game.popup.range.toUpperCase()}</div>
              <div className="font-bold text-yellow-400">
                {napoleonForestRange ? 3 : (character.name.includes("Napoleon") || character.name.includes("Da Vinci")) ? 2 : 1}
              </div>
              {napoleonForestRange && <div className="text-[9px] text-green-400 mt-0.5">{t.game.popup.forestBonus}</div>}
            </div>
          </div>

          {/* Bloodlust / Phalanx stacks */}
          {(character.passiveStacks ?? 0) > 0 && (
            <div className="rounded-lg px-2 py-1.5 text-[11px]"
              style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
              {character.name.includes("Genghis") && (
                <span className="text-red-300">
                  🩸 {t.characters.genghis.passive.name} ×{character.passiveStacks} ({t.game.popup.mightBonus.replace('{n}', String((character.passiveStacks ?? 0) * 15))})
                </span>
              )}
              {character.name.includes("Leonidas") && (
                <span className="text-amber-300">
                  🛡 {t.characters.leonidas.passive.name} ×{character.passiveStacks} ({t.game.popup.defBonus.replace('{n}', String((character.passiveStacks ?? 0) * 8))})
                </span>
              )}
            </div>
          )}

          {/* Active debuffs */}
          {(character.debuffs ?? []).length > 0 && (
            <div>
              <div className="font-orbitron text-[9px] text-red-400 tracking-wider mb-1">{t.game.popup.debuffs}</div>
              <div className="flex flex-col gap-1">
                {character.debuffs!.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded px-2 py-0.5 text-[10px]"
                    style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <span className="text-slate-300">{debuffLabel(d.type)}</span>
                    <span className="text-slate-500 font-mono">{t.game.popup.turns.replace('{n}', String(d.turnsRemaining))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passive — only shown for heroes with a defined passive */}
          {hasPassive && (
            <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)" }}>
              <div className="font-orbitron text-[9px] text-purple-400 tracking-wider mb-0.5">{t.game.popup.passive.toUpperCase()}</div>
              <div className="text-[10px] text-slate-400 leading-relaxed">{passiveText}</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CharacterDetailPopup;

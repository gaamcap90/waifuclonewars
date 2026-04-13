import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GameState, Card as GameCard, Icon } from "@/types/game";
import HPBar from "./HPBar";
import CharacterDetailPopup from "./CharacterDetailPopup";
import RespawnUI from "./RespawnUI";
import CardHand from "./CardHand";
import { Undo2 } from "lucide-react";
import { TurnQueueBar } from "./TurnQueueBar";
import { calcEffectiveStats } from "@/combat/buffs";
import { useT } from "@/i18n";
import { getCharacterPortrait } from "@/utils/portraits";
import type { EnemyAbilityDef } from "@/types/roguelike";

interface RunItemSlot {
  icon: string;
  name: string;
  description: string;
}

interface HorizontalGameUIProps {
  gameState: GameState;
  onEndTurn: () => void;
  onUndoMovement: () => void;
  onPlayCard: (card: GameCard, executorId: string) => void;
  onSelectIcon: (iconId: string) => void;
  hoveredTile?: any;
  currentTurnTimer: number;
  runItemsByCharacter?: Record<string, RunItemSlot[]>;
  onToggleHideUI?: () => void;
  onCardHoverRange?: (range: number | null) => void;
  onCardHoverExecutorId?: (id: string | null) => void;
  onEnemyAbilityHoverRange?: (val: { iconId: string; range: number } | null) => void;
}

const HorizontalGameUI = ({
  gameState,
  onEndTurn,
  onUndoMovement,
  onPlayCard,
  onSelectIcon,
  hoveredTile,
  currentTurnTimer,
  runItemsByCharacter,
  onCardHoverRange,
  onCardHoverExecutorId,
  onToggleHideUI,
  onEnemyAbilityHoverRange,
}: HorizontalGameUIProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<{ id: string; position: { x: number; y: number } } | null>(null);
  const [hoveredCardCost, setHoveredCardCost] = useState<number | null>(null);
  const [abilityTooltip, setAbilityTooltip] = useState<{ ab: EnemyAbilityDef; icon: Icon; rect: DOMRect } | null>(null);
  const [pinnedAbilityRange, setPinnedAbilityRange] = useState<{ iconId: string; abilityId: string; range: number } | null>(null);

  const { t } = useT();
  const extGameState = gameState as any;
  const selectedIconId: string | undefined = extGameState.selectedIcon;
  const targetingActive = Boolean(gameState.targetingMode);

  useEffect(() => {
    const onGlobalClose = () => setSelectedCharacter(null);
    window.addEventListener("closeCharacterPopup", onGlobalClose);
    return () => window.removeEventListener("closeCharacterPopup", onGlobalClose);
  }, []);

  /* ── Pill button ── */
  const Pill = ({
    selected, disabled, children, onClick,
  }: { selected?: boolean; disabled?: boolean; children: React.ReactNode; onClick?: () => void }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 whitespace-nowrap text-sm font-semibold",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:-translate-y-0.5 active:translate-y-0",
      ].join(" ")}
      style={{
        background: selected ? "rgba(250,180,0,0.22)" : "rgba(255,255,255,0.05)",
        borderColor: selected ? "rgba(250,180,0,0.60)" : "rgba(255,255,255,0.12)",
        color: selected ? "#fbbf24" : "#94a3b8",
        boxShadow: selected ? "0 0 10px rgba(250,180,0,0.20)" : "none",
      }}
    >
      {children}
    </button>
  );

  /* ── Base HP bar ── */
  const BaseHPBar = ({ pid }: { pid: 0 | 1 }) => {
    const hp = gameState.baseHealth[pid];
    const maxHp = 150;
    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    const barColor = pct > 60 ? '#22c55e'
      : pct > 35 ? '#eab308'
      : pct > 20 ? '#f97316'
      : '#ef4444';
    const glowColor = pct > 60 ? 'rgba(34,197,94,0.55)'
      : pct > 35 ? 'rgba(234,179,8,0.55)'
      : pct > 20 ? 'rgba(249,115,22,0.55)'
      : 'rgba(239,68,68,0.55)';
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-orbitron text-[10px] tracking-wider text-slate-500">{t.game.base}</span>
          <span className="font-mono text-[10px] text-slate-500">{hp}/{maxHp}</span>
        </div>
        <div className="h-1.5 w-full rounded-full relative overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${pct <= 20 ? 'hp-critical-flicker' : ''}`}
            style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 5px ${glowColor}` }}
          />
        </div>
      </div>
    );
  };

  /* ── Global mana bar ── */
  const GlobalManaBar = ({ pid }: { pid: 0 | 1 }) => {
    const extState = gameState as any;
    const mana: number = extState.globalMana?.[pid] ?? 0;
    const maxMana: number = extState.globalMaxMana?.[pid] ?? 5;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-orbitron text-[10px] tracking-wider text-blue-400/60">{t.game.mana}</span>
          <span className="font-mono text-[10px] text-blue-300/50">{mana}/{maxMana}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: maxMana }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-colors"
              style={{
                background: i < mana ? "#60a5fa" : "rgba(255,255,255,0.08)",
                boxShadow: i < mana ? "0 0 4px rgba(96,165,250,0.55)" : "none",
              }} />
          ))}
        </div>
      </div>
    );
  };

  /* ── Debuff pill meta ── */
  const DEBUFF_META: Record<string, { icon: string; color: string }> = {
    mud_throw:   { icon: "🐾", color: "bg-yellow-900/80 border-yellow-600/60 text-yellow-200" },
    rooted:      { icon: "🌿", color: "bg-green-900/80 border-green-600/60 text-green-200" },
    blinded:     { icon: "💥", color: "bg-yellow-900/80 border-yellow-600/60 text-yellow-100" },
    taunted:     { icon: "📢", color: "bg-red-900/80 border-red-600/60 text-red-200" },
    armor_break: { icon: "🔩", color: "bg-orange-900/80 border-orange-600/60 text-orange-200" },
    silence:     { icon: "🤫", color: "bg-purple-900/80 border-purple-600/60 text-purple-200" },
    poison:      { icon: "☠️", color: "bg-green-900/80 border-green-600/60 text-green-200" },
    stun:        { icon: "⚡", color: "bg-cyan-900/80 border-cyan-600/60 text-cyan-200" },
    bleed:       { icon: "🩸", color: "bg-red-900/80 border-red-600/60 text-red-200" },
  };

  /* ── Character row ── */
  const CharacterRow = ({ icon, teamColor, canSelect }: { icon: Icon; teamColor: "blue" | "red"; canSelect: boolean }) => {
    const portrait = getCharacterPortrait(icon.name);
    const isSelected = icon.id === selectedIconId;
    const eff = calcEffectiveStats(gameState, icon);
    const borderHex = teamColor === "blue" ? "#3b82f6" : "#ef4444";
    const bgFill = teamColor === "blue" ? "rgba(37,99,235,0.9)" : "rgba(185,28,28,0.9)";

    // Death flash
    const prevAliveRef = useRef(icon.isAlive);
    const [flashDeath, setFlashDeath] = useState(false);
    useEffect(() => {
      if (prevAliveRef.current && !icon.isAlive) {
        setFlashDeath(true);
        setTimeout(() => setFlashDeath(false), 700);
      }
      prevAliveRef.current = icon.isAlive;
    }, [icon.isAlive]);

    const passiveDesc = (() => {
      if (icon.name.includes("Napoleon")) return t.characters.napoleon.passive.desc;
      if (icon.name.includes("Genghis"))  return t.characters.genghis.passive.desc;
      if (icon.name.includes("Da Vinci"))   return t.characters.davinci.passive.desc;
      if (icon.name.includes("Leonidas"))   return t.characters.leonidas.passive.desc;
      if (icon.name.includes("Beethoven"))  return t.characters.beethoven.passive.desc;
      if (icon.name.includes("Huang"))      return t.characters.huang.passive.desc;
      if (icon.name === "Combat Drone")     return t.game.hud.combatDronePassive;
      if (icon.name === "Terracotta Archer" || icon.name === "Terracotta Warrior" || icon.name === "Terracotta Cavalry") return "Terracotta unit — expires after 3 turns.";
      if (icon.name.includes("Sun-sin")) {
        const terrainType = (gameState as any).board?.find((tile: any) => tile.coordinates.q === icon.position.q && tile.coordinates.r === icon.position.r)?.terrain.type;
        return (terrainType === 'lake' || terrainType === 'river') ? t.characters.sunsin.passive.waterDesc : t.characters.sunsin.passive.desc;
      }
      return icon.passive ?? "";
    })();

    return (
      <div
        className="relative flex items-start gap-2 px-2 py-1.5 rounded-lg border transition-all overflow-hidden"
        style={{
          background: isSelected ? "rgba(100,70,0,0.28)" : icon.isAlive ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.12)",
          borderColor: isSelected ? "rgba(250,180,0,0.45)" : icon.isAlive ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.04)",
          boxShadow: icon.isAlive && !isSelected ? "inset 0 1px 0 rgba(255,255,255,0.06)" : undefined,
          opacity: icon.isAlive ? 1 : 0.50,
          cursor: canSelect && icon.isAlive && icon.playerId === 0 ? "pointer" : "default",
        }}
        onClick={() => { if (canSelect && icon.isAlive && icon.playerId === 0) onSelectIcon(icon.id); }}
      >
        {flashDeath && (
          <div className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ animation: 'anim-row-death-flash 0.7s ease-out forwards' }} />
        )}
        {/* Portrait */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canSelect && icon.isAlive) onSelectIcon(icon.id);
            // Toggle: click same portrait again closes the popup
            if (selectedCharacter?.id === icon.id) { setSelectedCharacter(null); return; }
            const rect = e.currentTarget.getBoundingClientRect();
            setSelectedCharacter({ id: icon.id, position: { x: rect.left + rect.width / 2, y: rect.bottom } });
          }}
          className="w-9 h-9 rounded-full overflow-hidden shrink-0 transition-all"
          style={{
            border: `2px solid ${isSelected ? "rgba(250,180,0,0.70)" : borderHex + "77"}`,
            boxShadow: isSelected ? "0 0 8px rgba(250,180,0,0.40)" : "none",
            cursor: icon.isAlive ? "pointer" : "default",
            filter: !icon.isAlive ? "grayscale(1)" : icon.terracottaControlled ? "sepia(0.8) saturate(0.6) hue-rotate(10deg)" : "none",
          }}
          title={`${icon.name} — click for details`}
        >
          {portrait ? (
            <img src={portrait} alt={icon.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: bgFill }}>
              {icon.name === "Combat Drone" ? "⚙" : icon.name.charAt(0)}
            </div>
          )}
        </button>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-200 truncate">{icon.name}</span>
            {isSelected && <span className="text-[9px] text-amber-400 shrink-0 font-orbitron">{t.game.hud.activeUnit}</span>}
            {!icon.isAlive && (
              <span
                className="text-[9px] shrink-0"
                style={{
                  color: icon.respawnTurns === 1 ? "#f87171" : "#64748b",
                  animation: icon.respawnTurns === 1 ? "pulse 0.8s ease-in-out infinite" : undefined,
                  fontWeight: icon.respawnTurns === 1 ? "bold" : undefined,
                }}>
                {icon.respawnTurns > 0 ? `💀 ${icon.respawnTurns}t` : "💀"}
              </span>
            )}
          </div>

          {icon.isAlive && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <HPBar currentHP={icon.stats.hp} maxHP={icon.stats.maxHp} size="small" />
              <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                {Math.floor(icon.stats.hp)}/{icon.stats.maxHp}
              </span>
            </div>
          )}

          {icon.isAlive && (
            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
              <span className="text-red-400 font-semibold">{t.game.atk} {Math.floor(eff.might)}</span>
              <span className="text-blue-400 font-semibold">{t.game.pwr} {Math.floor(eff.power)}</span>
              <span className="text-emerald-400 font-semibold">{t.game.def} {Math.floor(eff.defense)}</span>
              {icon.stats.moveRange !== undefined && (
                <span className="text-slate-500">{t.game.mov} {icon.stats.moveRange}</span>
              )}
            </div>
          )}

          {icon.isAlive && (() => {
            const pills: React.ReactNode[] = [];
            if ((icon.cardBuffAtk ?? 0) > 0)
              pills.push(<span key="atk" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-orange-900/70 border-orange-600/60 text-orange-200">⚔+{icon.cardBuffAtk}</span>);
            if ((icon.cardBuffDef ?? 0) > 0)
              pills.push(<span key="def" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-blue-900/70 border-blue-600/60 text-blue-200">🛡+{icon.cardBuffDef}</span>);
            if (icon.name.includes("Genghis") && (icon.passiveStacks ?? 0) > 0)
              pills.push(<span key="stacks" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-red-900/70 border-red-600/60 text-red-200">🩸×{icon.passiveStacks}</span>);
            if (icon.name.includes("Leonidas") && (icon.passiveStacks ?? 0) > 0)
              pills.push(<span key="phalanx" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-amber-900/70 border-amber-600/60 text-amber-200">🛡×{icon.passiveStacks}</span>);
            if (icon.name.includes("Sun-sin")) {
              const terrainType = (gameState as any).board?.find((tile: any) => tile.coordinates.q === icon.position.q && tile.coordinates.r === icon.position.r)?.terrain.type;
              if (terrainType === 'lake' || terrainType === 'river') pills.push(<span key="turtle" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-cyan-900/80 border-cyan-600/60 text-cyan-200">{t.game.turtle}</span>);
            }
            for (const d of icon.debuffs ?? []) {
              const meta = DEBUFF_META[d.type] ?? { icon: "❓", color: "bg-gray-800 border-gray-600 text-gray-300" };
              pills.push(<span key={`${d.type}-${d.turnsRemaining}`} className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] ${meta.color}`}>{meta.icon}{d.turnsRemaining}t</span>);
            }
            return pills.length > 0 ? <div className="flex flex-wrap gap-0.5 mt-0.5">{pills}</div> : null;
          })()}

          {/* Passive — only show for player characters, not enemies */}
          {icon.playerId === 0 && (
            <div className="text-[10px] text-slate-600 mt-0.5 truncate" title={passiveDesc}>
              ✨ {passiveDesc}
            </div>
          )}

          {/* Enemy ability cooldowns — one row per ability with hover tooltip */}
          {icon.playerId === 1 && icon.isAlive && (() => {
            const abilities = (icon as any).enemyAbilities as EnemyAbilityDef[] | undefined;
            const cooldowns: Record<string, number> = (icon as any).enemyAbilityCooldowns ?? {};
            if (!abilities?.length) return null;
            const visibleAbs = abilities.filter(ab => (cooldowns[ab.id] ?? 0) < 999);
            if (!visibleAbs.length) return null;
            return (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {visibleAbs.map(ab => {
                  const cd = cooldowns[ab.id] ?? 0;
                  const isReady = cd === 0;
                  const isWarn = cd === 1;
                  const bg = isReady ? "rgba(160,16,16,0.90)" : isWarn ? "rgba(120,55,0,0.85)" : "rgba(18,12,35,0.80)";
                  const border = isReady ? "rgba(239,68,68,0.85)" : isWarn ? "rgba(251,146,60,0.80)" : "rgba(80,60,110,0.45)";
                  const col = isReady ? "#fca5a5" : isWarn ? "#fdba74" : "#7c8da8";
                  const lbl = isReady ? "NOW" : `${cd}t`;
                  const isPinned = pinnedAbilityRange?.iconId === icon.id && pinnedAbilityRange?.abilityId === ab.id;
                  return (
                    <div key={ab.id}
                      onMouseEnter={(e) => {
                        setAbilityTooltip({ ab, icon, rect: e.currentTarget.getBoundingClientRect() });
                        const range = ab.effect?.range ?? ab.effect?.dashRange ?? 1;
                        onEnemyAbilityHoverRange?.({ iconId: icon.id, range });
                      }}
                      onMouseLeave={() => {
                        setAbilityTooltip(null);
                        // Keep the range visible if this ability is pinned
                        if (pinnedAbilityRange?.iconId === icon.id && pinnedAbilityRange?.abilityId === ab.id) return;
                        if (!pinnedAbilityRange) onEnemyAbilityHoverRange?.(null);
                        else onEnemyAbilityHoverRange?.({ iconId: pinnedAbilityRange.iconId, range: pinnedAbilityRange.range });
                      }}
                      onClick={() => {
                        const range = ab.effect?.range ?? ab.effect?.dashRange ?? 1;
                        if (isPinned) {
                          setPinnedAbilityRange(null);
                          onEnemyAbilityHoverRange?.(null);
                        } else {
                          setPinnedAbilityRange({ iconId: icon.id, abilityId: ab.id, range });
                          onEnemyAbilityHoverRange?.({ iconId: icon.id, range });
                        }
                      }}
                    >
                      <div
                        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border w-full select-none"
                        style={{
                          cursor: 'pointer',
                          background: bg, border: `1px solid ${isPinned ? 'rgba(34,211,238,0.9)' : border}`, color: col,
                          boxShadow: isPinned ? "0 0 8px rgba(34,211,238,0.55)" : isReady ? "0 0 6px rgba(239,68,68,0.35)" : undefined,
                          animation: isReady ? "pulse 1.4s ease-in-out infinite" : undefined,
                        }}>
                        <span style={{ fontSize: 11 }}>{ab.icon}</span>
                        <span className="font-orbitron text-[9px] font-bold flex-1 truncate" style={{ color: col }}>{ab.name}</span>
                        <span className="font-orbitron font-black text-[9px] shrink-0 ml-auto"
                          style={{ color: isReady ? "#f87171" : col, textShadow: isReady ? "0 0 5px rgba(239,68,68,0.7)" : "none" }}>
                          {lbl}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {(() => {
            const nameKey = icon.name.includes("Napoleon") ? "napoleon"
              : icon.name.includes("Genghis") ? "genghis"
              : icon.name.includes("Da Vinci") ? "davinci"
              : icon.name.includes("Leonidas") ? "leonidas"
              : icon.name.includes("Sun-sin") ? "sunsin"
              : null;
            const items = nameKey ? runItemsByCharacter?.[nameKey]?.filter(Boolean) : null;
            if (!items?.length) return null;
            return (
              <div className="flex gap-0.5 mt-0.5 flex-wrap">
                {items.map((item, i) => (
                  <div key={i} className="relative group">
                    <span className="text-sm cursor-default">{item.icon}</span>
                    <div className="absolute bottom-full left-0 mb-1.5 z-50 hidden group-hover:block pointer-events-none w-44">
                      <div className="rounded-lg px-3 py-2 shadow-2xl text-[10px]"
                        style={{ background: "rgba(4,2,22,0.97)", border: "1px solid rgba(120,60,200,0.65)", boxShadow: "0 0 12px rgba(100,30,180,0.35), 0 4px 16px rgba(0,0,0,0.8)" }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base leading-none">{item.icon}</span>
                          <span className="font-bold text-purple-200 text-[11px] leading-tight">{item.name}</span>
                        </div>
                        <div className="text-slate-400 leading-snug break-words">{item.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  const extState = gameState as any;
  const objective: string | undefined = extState.encounterObjective;
  const showBases = !extState.isRoguelikeRun || extState.encounterObjective === 'destroy_base';
  const survivalTarget: number = extState.survivalTurnsTarget ?? 0;
  const spawnInterval: number = extState.spawnInterval ?? 0;
  const objLabel = objective ? (t.game.objectives as Record<string, string>)[objective] ?? objective : null;

  /* ── Terrain hover panel data ── */
  const TERRAIN_INFO: Record<string, { emoji: string; label: string; bg: string; border: string; lines: string[] }> = {
    forest:       { emoji: "🔮", bg: "rgba(30,10,50,0.92)",  border: "rgba(130,40,200,0.60)", label: t.terrain.forest.label,       lines: [...t.terrain.forest.lines] },
    mountain:     { emoji: "🌋", bg: "rgba(20,18,18,0.92)",  border: "rgba(80,70,70,0.60)",   label: t.terrain.mountain.label,     lines: [...t.terrain.mountain.lines] },
    river:        { emoji: "🏞", bg: "rgba(5,22,55,0.92)",   border: "rgba(40,80,160,0.60)",  label: t.terrain.river.label,        lines: [...t.terrain.river.lines] },
    lake:         { emoji: "🌊", bg: "rgba(3,12,45,0.92)",   border: "rgba(20,50,130,0.60)",  label: t.terrain.lake.label,         lines: [...t.terrain.lake.lines] },
    desert:       { emoji: "🏜", bg: "rgba(45,30,5,0.92)",   border: "rgba(160,100,20,0.60)", label: t.terrain.desert.label,       lines: [...t.terrain.desert.lines] },
    snow:         { emoji: "❄",  bg: "rgba(15,22,38,0.92)",  border: "rgba(140,190,230,0.55)", label: t.terrain.snow.label,        lines: [...t.terrain.snow.lines] },
    ice:          { emoji: "🧊", bg: "rgba(10,25,50,0.92)",  border: "rgba(80,160,210,0.60)", label: t.terrain.ice.label,          lines: [...t.terrain.ice.lines] },
    ruins:        { emoji: "🏚", bg: "rgba(20,18,28,0.92)",  border: "rgba(90,70,120,0.60)",  label: t.terrain.ruins.label,        lines: [...t.terrain.ruins.lines] },
    mana_crystal: { emoji: "💎", bg: "rgba(20,5,40,0.92)",   border: "rgba(100,40,180,0.60)", label: t.terrain.mana_crystal.label, lines: [...t.terrain.mana_crystal.lines] },
    base: { emoji: "🏰", bg: "rgba(25,20,5,0.92)", border: "rgba(160,120,20,0.60)", label: t.terrain.base.label, lines: [...t.terrain.base.lines] },
  };

  return (
    <>
      {/* TOP: Turn bar + objective */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
        <div className="pointer-events-auto">
          <TurnQueueBar gameState={gameState} onEndTurn={onEndTurn} currentTurnTimer={currentTurnTimer} />
        </div>
        {objLabel && (
          <div className="pointer-events-none flex items-center gap-2 rounded-full px-4 py-1"
            style={{
              background: "rgba(4,2,18,0.90)",
              border: "1px solid rgba(80,50,140,0.45)",
              boxShadow: "0 2px 12px rgba(80,50,140,0.15)",
            }}>
            <span className="font-orbitron text-[11px] text-slate-300 tracking-wide">{objLabel}</span>
            {objective === 'survive' && survivalTarget > 0 && (
              <span className="font-orbitron text-[11px] font-bold text-amber-400 ml-1">
                {t.game.turnsLeft.replace('{n}', String(Math.max(0, survivalTarget - gameState.currentTurn + 1)))}
              </span>
            )}
            {objective === 'onslaught' && spawnInterval > 0 && (
              <span className="font-orbitron text-[11px] font-bold text-red-400 ml-1">
                {t.game.nextWave.replace('{n}', String(spawnInterval - ((gameState.currentTurn - 1) % spawnInterval)))}
              </span>
            )}
          </div>
        )}
        {/* Arena Event banner */}
        {extGameState.arenaEvent && (
          <div className="pointer-events-none flex items-center gap-2 rounded-lg px-4 py-1.5 animate-pulse"
            style={{
              background: "rgba(60,10,10,0.95)",
              border: "1px solid rgba(220,80,20,0.70)",
              boxShadow: "0 0 18px rgba(220,80,20,0.35)",
            }}>
            <span className="text-lg">{extGameState.arenaEvent.icon}</span>
            <div className="flex flex-col">
              <span className="font-orbitron text-[11px] font-bold tracking-widest" style={{ color: "#fb923c" }}>
                {t.game.arenaEvent} {extGameState.arenaEvent.name.toUpperCase()}
              </span>
              <span className="text-[10px] text-orange-200/80">{extGameState.arenaEvent.description}</span>
            </div>
          </div>
        )}

        {/* Persistent incoming-event warnings (flood / fire countdowns) */}
        {(() => {
          const floodCD = (extGameState as any).pendingFloodCountdown as number | undefined;
          const fireCD  = (extGameState as any).pendingFireCountdown  as number | undefined;
          const floodActive = !!(extGameState as any).floodActive;
          const fireActive  = !!(extGameState as any).forestFireActive;
          const warnings: React.ReactNode[] = [];

          if (floodCD !== undefined && floodCD > 0) {
            warnings.push(
              <div key="flood-warn" className="pointer-events-none flex items-center gap-2 rounded-lg px-3 py-1 animate-pulse"
                style={{ background: "rgba(0,30,70,0.95)", border: "1px solid rgba(30,140,220,0.70)" }}>
                <span className="text-base">🌊</span>
                <span className="font-orbitron text-[10px] font-bold text-cyan-300">
                  {t.game.hud.alienTide.replace('{n}', String(floodCD))}
                </span>
              </div>
            );
          } else if (floodActive) {
            warnings.push(
              <div key="flood-active" className="pointer-events-none flex items-center gap-2 rounded-lg px-3 py-1"
                style={{ background: "rgba(0,20,50,0.90)", border: "1px solid rgba(30,100,180,0.50)" }}>
                <span className="text-base">🌊</span>
                <span className="font-orbitron text-[10px] text-cyan-500">{t.game.hud.floodActive}</span>
              </div>
            );
          }

          if (fireCD !== undefined && fireCD > 0) {
            warnings.push(
              <div key="fire-warn" className="pointer-events-none flex items-center gap-2 rounded-lg px-3 py-1 animate-pulse"
                style={{ background: "rgba(70,20,0,0.95)", border: "1px solid rgba(220,100,20,0.80)" }}>
                <span className="text-base">🔥</span>
                <span className="font-orbitron text-[10px] font-bold text-orange-300">
                  {t.game.hud.forestFire.replace('{n}', String(fireCD))}
                </span>
              </div>
            );
          } else if (fireActive) {
            warnings.push(
              <div key="fire-active" className="pointer-events-none flex items-center gap-2 rounded-lg px-3 py-1"
                style={{ background: "rgba(50,15,0,0.90)", border: "1px solid rgba(180,70,10,0.50)" }}>
                <span className="text-base">🔥</span>
                <span className="font-orbitron text-[10px] text-orange-500">{t.game.hud.fireSpreading}</span>
              </div>
            );
          }

          return warnings.length > 0 ? <div className="flex flex-col gap-1">{warnings}</div> : null;
        })()}
      </div>

      {/* LEFT PLAYER PANEL */}
      <div className="absolute top-16 left-3 pointer-events-auto z-10">
        <div className="w-[280px] rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(8,4,28,0.96) 0%, rgba(4,2,16,0.96) 100%)",
            border: "1px solid rgba(60,100,220,0.50)",
            boxShadow: "0 4px 24px rgba(20,40,160,0.18), inset 0 1px 0 rgba(80,120,255,0.08)",
          }}>
          <div className="px-3 py-2 flex items-center gap-2"
            style={{
              background: "linear-gradient(90deg, rgba(37,60,180,0.35) 0%, transparent 80%)",
              borderBottom: "1px solid rgba(60,100,220,0.28)",
            }}>
            <div className="w-1.5 h-4 rounded-full bg-blue-400 shrink-0"
              style={{ boxShadow: "0 0 6px rgba(96,165,250,0.80)" }} />
            <span className="font-orbitron text-[11px] tracking-widest text-blue-300 truncate">
              {gameState.players[0].name}
            </span>
          </div>
          <div className="space-y-2 px-3 pb-3 pt-2">
            {showBases && <BaseHPBar pid={0} />}
            <div className="space-y-1 pt-1">
              {gameState.players[0].icons.map(icon => (
                <CharacterRow key={icon.id} icon={icon} teamColor="blue" canSelect={gameState.activePlayerId === 0} />
              ))}
            </div>
          </div>
        </div>

        {/* Terrain tooltip */}
        {hoveredTile && hoveredTile.terrain.type !== 'plain' && hoveredTile.terrain.type !== 'spawn' && (() => {
          const info = TERRAIN_INFO[hoveredTile.terrain.type as string];
          if (!info) return null;
          return (
            <div className="mt-1.5 rounded-lg px-3 py-2"
              style={{ background: info.bg, border: `1px solid ${info.border}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{info.emoji}</span>
                <span className="font-orbitron text-[11px] text-slate-200 tracking-wide">{info.label}</span>
              </div>
              {info.lines.map((l, i) => (
                <div key={i} className="text-[10px] text-slate-400 leading-snug">{l}</div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* RIGHT PLAYER PANEL + ENEMY ABILITY HUD */}
      <div className="absolute top-16 right-3 pointer-events-auto z-10 flex flex-col gap-2">
        <div className="w-[280px] rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(28,4,8,0.96) 0%, rgba(16,2,4,0.96) 100%)",
            border: "1px solid rgba(220,60,60,0.50)",
            boxShadow: "0 4px 24px rgba(160,20,20,0.18), inset 0 1px 0 rgba(255,80,80,0.08)",
          }}>
          <div className="px-3 py-2 flex items-center gap-2"
            style={{
              background: "linear-gradient(90deg, rgba(180,37,37,0.35) 0%, transparent 80%)",
              borderBottom: "1px solid rgba(220,60,60,0.28)",
            }}>
            <div className="w-1.5 h-4 rounded-full bg-red-400 shrink-0"
              style={{ boxShadow: "0 0 6px rgba(248,113,113,0.80)" }} />
            <span className="font-orbitron text-[11px] tracking-widest text-red-300 truncate">
              {gameState.players[1].name}
            </span>
          </div>
          <div className="px-3 pb-3 pt-2">
            {showBases && <BaseHPBar pid={1} />}
            {(gameState as any).gameMode !== 'singleplayer' && <GlobalManaBar pid={1} />}
            <div className="space-y-1 pt-1 overflow-y-auto pr-0.5" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              {gameState.players[1].icons.map(icon => (
                <CharacterRow key={icon.id} icon={icon} teamColor="red" canSelect={gameState.activePlayerId === 1} />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
        <div className="min-w-[720px] rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(8,4,28,0.97) 0%, rgba(4,2,16,0.97) 100%)",
            border: "1px solid rgba(80,50,140,0.60)",
            boxShadow: "0 -2px 24px rgba(80,50,140,0.18), 0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(120,80,200,0.08)",
          }}>
          {/* Active character header */}
          <div className="flex items-center gap-3 px-4 py-2.5"
            style={{ borderBottom: "1px solid rgba(80,50,140,0.30)", background: "rgba(10,5,25,0.40)" }}>
            {(() => {
              const pid = gameState.activePlayerId;
              const aliveIcons = gameState.players[pid]?.icons.filter(i => i.isAlive) ?? [];
              const displayIcon = aliveIcons.find(i => i.id === selectedIconId) ?? aliveIcons[0] ?? null;
              const portrait = getCharacterPortrait(displayIcon?.name);
              return (
                <>
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0"
                    style={{ border: "2px solid rgba(250,180,0,0.60)", boxShadow: "0 0 10px rgba(250,180,0,0.22)" }}>
                    {portrait ? (
                      <img src={portrait} alt={displayIcon?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-200"
                        style={{ background: "rgba(80,60,120,0.80)" }}>
                        {displayIcon?.name?.charAt(0) ?? "?"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] font-orbitron tracking-widest text-slate-500">{t.game.activeUnit}</div>
                    <div className="font-orbitron text-sm font-bold text-slate-100">{displayIcon?.name ?? "—"}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {/* Movement pips */}
                    {(() => {
                      const displayOnRiver = displayIcon?.name.includes("Sun-sin") &&
                        (gameState as any).board?.find((t: any) => t.coordinates.q === displayIcon.position.q && t.coordinates.r === displayIcon.position.r)?.terrain.type === 'river';
                      const base = displayOnRiver ? 1 : (displayIcon?.stats.moveRange ?? 2);
                      const current = displayIcon?.stats.movement ?? 0;
                      const totalPips = Math.max(base, current);
                      return (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <span className="text-base">🦶</span>
                          <div>
                            <div className="text-[9px] font-orbitron tracking-wider text-slate-500 leading-none mb-0.5">MOV</div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPips }).map((_, i) => (
                                <div key={i} className="w-2.5 h-2.5 rounded-full border-2 transition-colors"
                                  style={{
                                    background: i < current ? (i < base ? "#34d399" : "#fbbf24") : "rgba(255,255,255,0.08)",
                                    borderColor: i < current ? (i < base ? "#6ee7b7" : "#fde68a") : "rgba(255,255,255,0.12)",
                                    boxShadow: i < current ? (i < base ? "0 0 4px rgba(52,211,153,0.50)" : "0 0 4px rgba(251,191,36,0.50)") : "none",
                                  }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Card usage pips */}
                    {(() => {
                      const cardsUsed = displayIcon?.cardsUsedThisTurn ?? 0;
                      const maxCards = 3;
                      return (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <span className="text-base">🃏</span>
                          <div>
                            <div className="text-[9px] font-orbitron tracking-wider text-slate-500 leading-none mb-0.5">CARDS</div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: maxCards }).map((_, i) => (
                                <div key={i} className="w-2.5 h-2.5 rounded-full border-2 transition-colors"
                                  style={{
                                    background: i < cardsUsed ? "#fbbf24" : "rgba(255,255,255,0.08)",
                                    borderColor: i < cardsUsed ? "#fde68a" : "rgba(255,255,255,0.12)",
                                    boxShadow: i < cardsUsed ? "0 0 4px rgba(251,191,36,0.50)" : "none",
                                  }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Mana pips with optional card cost preview */}
                    {(() => {
                      const pid = gameState.activePlayerId;
                      const mana: number = (gameState as any).globalMana?.[pid] ?? 0;
                      const maxMana: number = (gameState as any).globalMaxMana?.[pid] ?? 5;
                      const cost = hoveredCardCost;
                      const afterMana = cost !== null ? mana - cost : null;
                      return (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                          style={{
                            background: "rgba(10,20,50,0.60)",
                            border: cost !== null && cost > mana
                              ? "1px solid rgba(239,68,68,0.55)"
                              : "1px solid rgba(96,165,250,0.25)",
                            transition: "border-color 0.15s",
                          }}>
                          <span className="text-base">💧</span>
                          <div>
                            <div className="flex items-center gap-1 leading-none mb-0.5">
                              <span className="text-[9px] font-orbitron tracking-wider text-blue-400/70">MANA</span>
                              {cost !== null && (
                                <span className="text-[9px] font-bold ml-1"
                                  style={{ color: cost > mana ? "#f87171" : "#fbbf24" }}>
                                  -{cost}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: maxMana }).map((_, i) => {
                                const filled = i < mana;
                                const willSpend = afterMana !== null && i >= afterMana && i < mana;
                                return (
                                  <div key={i} className="w-2.5 h-2.5 rounded-full border-2 transition-all"
                                    style={{
                                      background: willSpend ? "rgba(251,191,36,0.60)" : filled ? "#60a5fa" : "rgba(255,255,255,0.08)",
                                      borderColor: willSpend ? "#fde68a" : filled ? "#93c5fd" : "rgba(255,255,255,0.12)",
                                      boxShadow: willSpend ? "0 0 4px rgba(251,191,36,0.55)" : filled ? "0 0 4px rgba(96,165,250,0.50)" : "none",
                                    }} />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <Pill disabled={!displayIcon?.movedThisTurn || !!displayIcon?.cardUsedThisTurn} onClick={onUndoMovement}>
                      <Undo2 className="h-4 w-4" />
                      Undo
                    </Pill>
                    {/* Hide UI toggle */}
                    {onToggleHideUI && (
                      <button
                        onClick={onToggleHideUI}
                        title="Hide UI (H)"
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.10)",
                          color: "rgba(148,163,184,0.70)",
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        👁
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Card hand */}
          <div className="px-4 py-3">
            {(() => {
              const pid = gameState.activePlayerId;
              const hand = extState.hands?.[pid];
              const deck = extState.decks?.[pid];
              const activeIcons = gameState.players[pid]?.icons.filter(i => i.isAlive) ?? [];
              const executor = activeIcons.find(i => i.id === selectedIconId) ?? activeIcons[0] ?? null;
              const allPlayerCards = [...(hand?.cards ?? []), ...(deck?.drawPile ?? []), ...(deck?.discardPile ?? [])];
              const exhaustedUltimates = ["napoleon_final_salvo", "genghis_riders_fury", "davinci_vitruvian_guardian"].filter(
                defId => !allPlayerCards.some(c => c.definitionId === defId)
              );
              return (
                <div className="space-y-2">
                  {targetingActive && (
                    <div className="text-[11px] font-orbitron tracking-wider text-slate-500">
                      TARGETING — click a target on the board or press <strong className="text-slate-300">ESC</strong> to cancel
                    </div>
                  )}
                  {hand && (
                    <CardHand
                      cards={hand.cards}
                      drawPileCards={deck?.drawPile ?? []}
                      discardPileCards={deck?.discardPile ?? []}
                      executor={executor}
                      activeIcons={activeIcons}
                      cardLockActive={gameState.cardLockActive}
                      drawPileSize={deck?.drawPile.length ?? 0}
                      discardPileSize={deck?.discardPile.length ?? 0}
                      globalMana={(gameState as any).globalMana?.[pid] ?? 0}
                      exhaustedUltimates={exhaustedUltimates}
                      onPlayCard={onPlayCard}
                      onCardHover={(cost) => setHoveredCardCost(cost)}
                      onCardHoverRange={onCardHoverRange}
                      onCardHoverExecutorId={onCardHoverExecutorId}
                      gameState={gameState}
                    />
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Character Detail Popup */}
      {selectedCharacter && (() => {
        const character = gameState.players.flatMap(p => p.icons).find(icon => icon.id === selectedCharacter.id);
        if (!character) return null;
        return (
          <CharacterDetailPopup
            character={character}
            gameState={gameState}
            onClose={() => setSelectedCharacter(null)}
            position={selectedCharacter.position}
          />
        );
      })()}

      {/* Enemy ability hover tooltip portal */}
      {abilityTooltip && createPortal((() => {
        const { ab, icon, rect } = abilityTooltip;
        const cooldowns: Record<string, number> = (icon as any).enemyAbilityCooldowns ?? {};
        const cd = cooldowns[ab.id] ?? 0;
        const isReady = cd === 0;
        const isWarn = cd === 1;
        const activeDebuffs = icon.debuffs ?? [];
        const DEBUFF_NAMES: Record<string, string> = {
          mud_throw: "Slowed", rooted: "Rooted", armor_break: "Armor Break",
          silence: "Silenced", poison: "Poisoned", stun: "Stunned", bleed: "Bleeding",
          blinded: "Blinded", taunted: "Taunted",
        };

        const top = Math.min(rect.bottom + 6, window.innerHeight - 200);
        const left = Math.max(8, rect.left - 200);
        return (
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{ top, left, width: 220 }}
          >
            <div className="rounded-lg px-3 py-2.5 shadow-2xl"
              style={{
                background: "rgba(4,2,18,0.97)",
                border: isReady ? "1px solid rgba(239,68,68,0.75)" : isWarn ? "1px solid rgba(251,146,60,0.70)" : "1px solid rgba(80,50,140,0.55)",
                boxShadow: isReady ? "0 0 18px rgba(239,68,68,0.30)" : "0 4px 18px rgba(0,0,0,0.70)",
              }}>
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 18 }}>{ab.icon}</span>
                <div>
                  <div className="font-orbitron text-[11px] font-bold text-slate-100">{ab.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: isReady ? "rgba(239,68,68,0.25)" : isWarn ? "rgba(251,146,60,0.20)" : "rgba(80,60,110,0.30)",
                        color: isReady ? "#f87171" : isWarn ? "#fdba74" : "#7c8da8",
                        border: `1px solid ${isReady ? "rgba(239,68,68,0.50)" : isWarn ? "rgba(251,146,60,0.45)" : "rgba(80,60,110,0.35)"}`,
                      }}>
                      {isReady ? "READY NOW" : `CD ${cd}t`}
                    </span>
                    {ab.cooldown > 0 && (
                      <span className="text-[9px] text-slate-600">/ {ab.cooldown}t cooldown</span>
                    )}
                  </div>
                </div>
              </div>
              {/* Description */}
              <div className="text-[10px] text-slate-300 leading-relaxed mb-2">{ab.description}</div>
              {/* Trigger hint */}
              {ab.triggerCondition === 'low_hp' && ab.hpThreshold && (
                <div className="text-[9px] text-amber-400/80 mb-1.5">⚠ Triggers below {Math.round(ab.hpThreshold * 100)}% HP</div>
              )}
              {ab.oncePerFight && (
                <div className="text-[9px] text-purple-400/80 mb-1.5">★ Once per fight</div>
              )}
              {/* Active debuffs on this enemy */}
              {activeDebuffs.length > 0 && (
                <div className="mt-1.5 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-[9px] font-orbitron text-slate-500 mb-1">ACTIVE EFFECTS</div>
                  <div className="flex flex-wrap gap-1">
                    {activeDebuffs.map((d, i) => {
                      const meta = DEBUFF_META[d.type] ?? { icon: "❓", color: "bg-gray-800 border-gray-600 text-gray-300" };
                      const name = DEBUFF_NAMES[d.type] ?? d.type;
                      return (
                        <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] ${meta.color}`}>
                          {meta.icon} {name} {d.turnsRemaining}t
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })(), document.body)}
    </>
  );
};

export default HorizontalGameUI;

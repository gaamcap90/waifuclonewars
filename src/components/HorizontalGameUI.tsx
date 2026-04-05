import React, { useState, useEffect } from "react";
import { GameState, Card as GameCard, Icon } from "@/types/game";
import HPBar from "./HPBar";
import CharacterDetailPopup from "./CharacterDetailPopup";
import RespawnUI from "./RespawnUI";
import CardHand from "./CardHand";
import { Undo2 } from "lucide-react";
import { TurnQueueBar } from "./TurnQueueBar";
import { calcEffectiveStats } from "@/combat/buffs";

const getCharacterPortrait = (name: string | undefined | null) => {
  if (!name) return null;
  if (name.includes("Napoleon")) return "/art/napoleon_portrait.png";
  if (name.includes("Genghis"))  return "/art/genghis_portrait.png";
  if (name.includes("Da Vinci")) return "/art/davinci_portrait.png";
  if (name.includes("Leonidas")) return "/art/leonidas_portrait.png";
  if (name.includes("Sun-sin"))  return "/art/sunsin_portrait.jpg";
  return null;
};

interface RunItemSlot {
  icon: string;
  name: string;
  description: string;
}

interface HorizontalGameUIProps {
  gameState: GameState;
  onBasicAttack: () => void;
  onUseAbility: (abilityId: string) => void;
  onEndTurn: () => void;
  onUndoMovement: () => void;
  onRespawn: (iconId: string) => void;
  onPlayCard: (card: GameCard, executorId: string) => void;
  onSelectIcon: (iconId: string) => void;
  hoveredTile?: any;
  currentTurnTimer: number;
  runItemsByCharacter?: Record<string, RunItemSlot[]>;
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
}: HorizontalGameUIProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<{ id: string; position: { x: number; y: number } } | null>(null);

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
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-orbitron text-[10px] tracking-wider text-slate-500">BASE</span>
          <span className="font-mono text-[10px] text-slate-500">{hp}/{maxHp}</span>
        </div>
        <div className="h-1.5 w-full rounded-full relative overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="absolute inset-y-0 left-0 rounded-full bg-red-500 transition-all"
            style={{ width: `${pct}%`, boxShadow: "0 0 5px rgba(239,68,68,0.55)" }} />
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
          <span className="font-orbitron text-[10px] tracking-wider text-blue-400/60">MANA</span>
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
    demoralize:  { icon: "💔", color: "bg-rose-900/80 border-rose-600/60 text-rose-200" },
    armor_break: { icon: "🔩", color: "bg-orange-900/80 border-orange-600/60 text-orange-200" },
    silence:     { icon: "🤫", color: "bg-purple-900/80 border-purple-600/60 text-purple-200" },
    poison:      { icon: "☠️", color: "bg-green-900/80 border-green-600/60 text-green-200" },
  };

  /* ── Character row ── */
  const CharacterRow = ({ icon, teamColor, canSelect }: { icon: Icon; teamColor: "blue" | "red"; canSelect: boolean }) => {
    const portrait = getCharacterPortrait(icon.name);
    const isSelected = icon.id === selectedIconId;
    const eff = calcEffectiveStats(gameState, icon);
    const borderHex = teamColor === "blue" ? "#3b82f6" : "#ef4444";
    const bgFill = teamColor === "blue" ? "rgba(37,99,235,0.9)" : "rgba(185,28,28,0.9)";

    const passiveDesc = (() => {
      if (icon.name.includes("Napoleon")) return "Vantage Point: Forest→Range 3, no DEF bonus";
      if (icon.name.includes("Genghis"))  return "Bloodlust: Kill→+15 Might+1 Mana (×3 max)";
      if (icon.name.includes("Da Vinci")) return "Tinkerer: No ability used→draw +1 card";
      if (icon.name === "Combat Drone")   return "Mechanical unit (expires in 2 turns)";
      if (icon.name.includes("Sun-sin")) {
        const onRiver = (gameState as any).board?.find((t: any) => t.coordinates.q === icon.position.q && t.coordinates.r === icon.position.r)?.terrain.type === 'river';
        return onRiver ? "🐢 Turtle Ship — +40% Might, +30% DEF, −40% Power, Range 3" : "Turtle Ship: Enter water for Turtle Ship form";
      }
      return icon.passive ?? "";
    })();

    return (
      <div
        className="flex items-start gap-2 px-2 py-1.5 rounded-lg border transition-all"
        style={{
          background: isSelected ? "rgba(100,70,0,0.28)" : icon.isAlive ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.10)",
          borderColor: isSelected ? "rgba(250,180,0,0.45)" : icon.isAlive ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
          opacity: icon.isAlive ? 1 : 0.50,
        }}
      >
        {/* Portrait */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canSelect && icon.isAlive) onSelectIcon(icon.id);
            const rect = e.currentTarget.getBoundingClientRect();
            setSelectedCharacter({ id: icon.id, position: { x: rect.left + rect.width / 2, y: rect.bottom } });
          }}
          className="w-9 h-9 rounded-full overflow-hidden shrink-0 transition-all"
          style={{
            border: `2px solid ${isSelected ? "rgba(250,180,0,0.70)" : borderHex + "77"}`,
            boxShadow: isSelected ? "0 0 8px rgba(250,180,0,0.40)" : "none",
            cursor: icon.isAlive ? "pointer" : "default",
            filter: icon.isAlive ? "none" : "grayscale(1)",
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
            {isSelected && <span className="text-[9px] text-amber-400 shrink-0 font-orbitron">◀ ACTIVE</span>}
            {!icon.isAlive && (
              <span className="text-[9px] text-slate-500 shrink-0">
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
              <span className="text-red-400 font-semibold">ATK {Math.floor(eff.might)}</span>
              <span className="text-blue-400 font-semibold">PWR {Math.floor(eff.power)}</span>
              <span className="text-emerald-400 font-semibold">DEF {Math.floor(eff.defense)}</span>
              {icon.stats.movement !== undefined && (
                <span className="text-slate-500">MOV {icon.stats.movement}</span>
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
              const onRiver = (gameState as any).board?.find((t: any) => t.coordinates.q === icon.position.q && t.coordinates.r === icon.position.r)?.terrain.type === 'river';
              if (onRiver) pills.push(<span key="turtle" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] bg-cyan-900/80 border-cyan-600/60 text-cyan-200">🐢 TURTLE</span>);
            }
            for (const d of icon.debuffs ?? []) {
              const meta = DEBUFF_META[d.type] ?? { icon: "❓", color: "bg-gray-800 border-gray-600 text-gray-300" };
              pills.push(<span key={`${d.type}-${d.turnsRemaining}`} className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] ${meta.color}`}>{meta.icon}{d.turnsRemaining}t</span>);
            }
            return pills.length > 0 ? <div className="flex flex-wrap gap-0.5 mt-0.5">{pills}</div> : null;
          })()}

          <div className="text-[10px] text-slate-600 mt-0.5 truncate" title={passiveDesc}>
            ✨ {passiveDesc}
          </div>

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
                    <span className="text-sm cursor-default" title={`${item.name}: ${item.description}`}>{item.icon}</span>
                    <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover:block pointer-events-none">
                      <div className="rounded px-2 py-1.5 text-[10px] whitespace-nowrap shadow-xl max-w-[180px]"
                        style={{ background: "rgba(4,2,18,0.96)", border: "1px solid rgba(80,50,140,0.50)" }}>
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-slate-400 text-wrap">{item.description}</div>
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
  const OBJECTIVE_LABELS: Record<string, string> = {
    defeat_all:   '⚔️ Defeat All Enemies',
    destroy_base: '🏰 Destroy the Enemy Base',
    survive:      '🛡️ Survive',
    onslaught:    '🌊 Onslaught — Hold the Line',
  };
  const objLabel = objective ? OBJECTIVE_LABELS[objective] ?? objective : null;

  /* ── Terrain hover panel data ── */
  const TERRAIN_INFO: Record<string, { emoji: string; label: string; bg: string; border: string; lines: string[] }> = {
    forest:       { emoji: "🌲", label: "Forest",       bg: "rgba(10,30,10,0.92)",  border: "rgba(34,90,34,0.60)",   lines: ["+25% Defense", "Movement costs 2/hex", "Napoleon: Range 3"] },
    mountain:     { emoji: "⛰️", label: "Mountain",     bg: "rgba(20,18,18,0.92)",  border: "rgba(80,70,70,0.60)",   lines: ["Impassable"] },
    river:        { emoji: "🌊", label: "River",        bg: "rgba(5,15,40,0.92)",   border: "rgba(30,60,140,0.60)",  lines: ["Impassable", "Lethal if displaced onto it"] },
    mana_crystal: { emoji: "💎", label: "Mana Crystal", bg: "rgba(20,5,40,0.92)",   border: "rgba(100,40,180,0.60)", lines: ["Impassable", "+1 or +2 Mana at end of turn"] },
    beast_camp:   {
      emoji: "🐗", label: "Beast Camp", bg: "rgba(30,15,5,0.92)", border: "rgba(140,70,20,0.60)",
      lines: (() => {
        const camps = (gameState as any).objectives?.beastCamps;
        if (!camps) return ["Defeat for +15% Might & Power"];
        const idx = hoveredTile?.coordinates?.q === -2 ? 0 : 1;
        return camps.defeated?.[idx]
          ? ["✅ Defeated — buffs active"]
          : [`HP: ${camps.hp?.[idx] ?? 0}/${camps.maxHp ?? 100}`, "Defeat for +15% Might & Power"];
      })(),
    },
    base: { emoji: "🏰", label: "Base", bg: "rgba(25,20,5,0.92)", border: "rgba(160,120,20,0.60)", lines: ["+20% Might, Power & Defense"] },
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
                {Math.max(0, survivalTarget - gameState.currentTurn + 1)} turns left
              </span>
            )}
            {objective === 'onslaught' && spawnInterval > 0 && (
              <span className="font-orbitron text-[11px] font-bold text-red-400 ml-1">
                next wave in {spawnInterval - ((gameState.currentTurn - 1) % spawnInterval)} turns
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
                ARENA EVENT: {extGameState.arenaEvent.name.toUpperCase()}
              </span>
              <span className="text-[10px] text-orange-200/80">{extGameState.arenaEvent.description}</span>
            </div>
          </div>
        )}
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
            <GlobalManaBar pid={0} />
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

      {/* RIGHT PLAYER PANEL */}
      <div className="absolute top-16 right-3 pointer-events-auto z-10">
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
          <div className="space-y-2 px-3 pb-3 pt-2">
            {showBases && <BaseHPBar pid={1} />}
            {(gameState as any).gameMode !== 'singleplayer' && <GlobalManaBar pid={1} />}
            <div className="space-y-1 pt-1">
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
                    <div className="text-[9px] font-orbitron tracking-widest text-slate-500">ACTIVE UNIT</div>
                    <div className="font-orbitron text-sm font-bold text-slate-100">{displayIcon?.name ?? "—"}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {/* Movement pips */}
                    {(() => {
                      const base = displayIcon?.stats.moveRange ?? 2;
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
                    <Pill disabled={!displayIcon?.movedThisTurn || !!displayIcon?.cardUsedThisTurn} onClick={onUndoMovement}>
                      <Undo2 className="h-4 w-4" />
                      Undo
                    </Pill>
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
    </>
  );
};

export default HorizontalGameUI;

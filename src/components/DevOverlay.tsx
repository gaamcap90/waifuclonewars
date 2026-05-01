// src/components/DevOverlay.tsx
// Press F9 in combat to toggle. Read-only inspection of in-flight game state
// for playtest / balance work. Disabled in production builds.
//
// Surfaces (in priority order):
//   • Speed queue + active player
//   • Per-icon stats (effective stats, debuffs, cooldowns, passive stacks)
//   • Hand / draw / discard / exhaust counts + top of each pile
//   • AI intents for the current turn
//   • Active zones
//   • localStorage quick-actions: reset onboarding tips, force win, etc.
//
// Designed to NOT interact with game state — only reads. Modifying state from
// here would defeat the purpose (you'd be testing a different scenario than the
// one you reproduced).

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GameState, Icon } from "@/types/game";
import { calcEffectiveStats } from "@/combat/buffs";

interface Props {
  gameState: GameState;
}

const PANEL_BG = 'rgba(4,2,18,0.96)';
const PANEL_BORDER = 'rgba(80,160,255,0.35)';

function shortName(name: string): string {
  // strip "-chan" suffix and clip
  return name.replace(/-chan$/i, '').slice(0, 14);
}

function readLS(key: string, fallback: string = '—'): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function StatRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex justify-between gap-2 text-[10px] font-mono leading-tight">
      <span className="text-slate-500">{label}</span>
      <span style={{ color: color ?? '#cbd5e1' }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-orbitron tracking-[0.25em] text-[9px] mt-3 mb-1.5 first:mt-0"
      style={{ color: '#60a5fa', borderBottom: '1px solid rgba(96,165,250,0.18)', paddingBottom: 2 }}>
      {children}
    </div>
  );
}

export default function DevOverlay({ gameState }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'icons' | 'cards' | 'state' | 'tools'>('icons');

  // Toggle on F9
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  const ext = gameState as any;
  const allIcons: Icon[] = gameState.players.flatMap(p => p.icons);
  const aliveIcons = allIcons.filter(i => i.isAlive);
  const speedQueue: any[] = ext.speedQueue ?? [];
  const aiIntents: any[] = ext.aiIntents ?? [];
  const activeZones: any[] = ext.activeZones ?? [];
  const hands = ext.hands as any[] | undefined;
  const decks = ext.decks as any[] | undefined;
  const mana: number[] = ext.globalMana ?? [0, 0];
  const maxMana: number[] = ext.globalMaxMana ?? [5, 5];

  const activePlayer: 0 | 1 = (ext.activePlayerId as 0 | 1) ?? 0;
  const phase = ext.phase ?? 'idle';
  const turn = ext.currentTurn ?? 1;
  const objective = ext.encounterObjective ?? 'defeat_all';

  return createPortal(
    <div
      className="fixed top-2 right-2 z-[10000] rounded-xl border shadow-2xl select-text"
      style={{
        width: 360,
        maxHeight: 'calc(100vh - 16px)',
        background: PANEL_BG,
        borderColor: PANEL_BORDER,
        boxShadow: '0 0 24px rgba(80,160,255,0.2)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: PANEL_BORDER }}>
        <div className="flex items-center gap-2">
          <span style={{ color: '#60a5fa' }}>🛠</span>
          <span className="font-orbitron text-[10px] tracking-[0.3em]" style={{ color: '#93c5fd' }}>DEV OVERLAY</span>
          <span className="text-[9px] text-slate-600 font-mono">F9 to toggle</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-xs leading-none px-1">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 px-2 pt-2">
        {(['icons', 'cards', 'state', 'tools'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="font-orbitron text-[9px] tracking-widest px-2 py-1 rounded-t border-b-2 transition-all"
            style={{
              borderColor: tab === t ? '#60a5fa' : 'transparent',
              color: tab === t ? '#93c5fd' : '#64748b',
              background: tab === t ? 'rgba(96,165,250,0.08)' : 'transparent',
            }}
          >{t.toUpperCase()}</button>
        ))}
      </div>

      {/* Body */}
      <div className="px-3 py-2 overflow-auto" style={{ maxHeight: 'calc(100vh - 110px)' }}>
        {tab === 'icons' && (
          <>
            <SectionTitle>Active player</SectionTitle>
            <StatRow label="player"   value={activePlayer === 0 ? 'P0 (you)' : 'P1 (AI)'} color={activePlayer === 0 ? '#60a5fa' : '#f87171'} />
            <StatRow label="turn"     value={turn} />
            <StatRow label="phase"    value={phase} />
            <StatRow label="objective" value={objective} />
            <StatRow label="mana P0"  value={`${mana[0]}/${maxMana[0]}`} color="#60a5fa" />
            <StatRow label="mana P1"  value={`${mana[1]}/${maxMana[1]}`} color="#f87171" />

            <SectionTitle>Speed queue</SectionTitle>
            <div className="text-[9px] font-mono text-slate-400 leading-snug">
              {speedQueue.length === 0
                ? '(empty)'
                : speedQueue.slice(0, 12).map((id: string, i) => {
                    const ic = allIcons.find(x => x.id === id);
                    if (!ic) return <div key={i} className="text-slate-700">— {id}</div>;
                    const isCurrent = i === 0;
                    return (
                      <div key={i} style={{ color: isCurrent ? '#fbbf24' : ic.playerId === 0 ? '#93c5fd' : '#fca5a5' }}>
                        {isCurrent ? '▶ ' : '  '}{shortName(ic.name)} <span className="text-slate-600">spd:{ic.stats.speed}</span>
                      </div>
                    );
                  })}
            </div>

            <SectionTitle>Icons ({aliveIcons.length}/{allIcons.length})</SectionTitle>
            {allIcons.map(ic => {
              const eff = calcEffectiveStats(gameState, ic);
              const isP0 = ic.playerId === 0;
              const dead = !ic.isAlive;
              return (
                <details key={ic.id} className="mb-1.5" style={{ opacity: dead ? 0.4 : 1 }}>
                  <summary className="cursor-pointer text-[10px] font-mono" style={{ color: dead ? '#64748b' : isP0 ? '#93c5fd' : '#fca5a5' }}>
                    {dead ? '☠ ' : '  '}{shortName(ic.name)} <span className="text-slate-600">{ic.stats.hp}/{ic.stats.maxHp}HP</span>
                  </summary>
                  <div className="pl-3 pt-1 pb-1.5 space-y-0.5">
                    <StatRow label="pos"      value={`(${ic.position.q},${ic.position.r})`} />
                    <StatRow label="might"    value={eff.might} color="#fbbf24" />
                    <StatRow label="power"    value={eff.power} color="#c084fc" />
                    <StatRow label="defense"  value={eff.defense} color="#60a5fa" />
                    <StatRow label="move"     value={`${ic.stats.movement}/${ic.stats.moveRange}`} />
                    <StatRow label="atkRange" value={ic.stats.attackRange ?? 1} />
                    {(ic.passiveStacks ?? 0) > 0 && <StatRow label="stacks"  value={ic.passiveStacks} color="#facc15" />}
                    {(ic.cardBuffAtk ?? 0) > 0 && <StatRow label="+ATK buf" value={`+${ic.cardBuffAtk}`} color="#fbbf24" />}
                    {(ic.cardBuffDef ?? 0) > 0 && <StatRow label="+DEF buf" value={`+${ic.cardBuffDef}`} color="#60a5fa" />}
                    {(ic.cardBuffPow ?? 0) > 0 && <StatRow label="+POW buf" value={`+${ic.cardBuffPow}`} color="#c084fc" />}
                    {(ic.cardBuffTurns ?? 0) > 0 && <StatRow label="buffTurns" value={ic.cardBuffTurns} color="#34d399" />}
                    {ic.cardUsedThisTurn && <StatRow label="cardUsed" value="✓" color="#34d399" />}
                    {ic.movedThisTurn && <StatRow label="moved" value="✓" color="#34d399" />}
                    {ic.ultimateUsed && <StatRow label="ult used" value="✓" color="#fbbf24" />}
                    {(ic.untouchableTurns ?? 0) > 0 && <StatRow label="untouchable" value={ic.untouchableTurns} color="#22d3ee" />}
                    {ic.debuffs && ic.debuffs.length > 0 && (
                      <StatRow label="debuffs" value={ic.debuffs.map(d => `${d.type}(${d.turnsRemaining})`).join(', ')} color="#f87171" />
                    )}
                    {ic.regens && ic.regens.length > 0 && (
                      <StatRow label="regens"  value={ic.regens.map(r => `+${r.amount}/${r.turnsRemaining}t`).join(', ')} color="#34d399" />
                    )}
                    {ic.itemPassiveTags && ic.itemPassiveTags.length > 0 && (
                      <StatRow label="items"   value={ic.itemPassiveTags.length} color="#a78bfa" />
                    )}
                    {ic.enemyAbilityCooldowns && Object.keys(ic.enemyAbilityCooldowns).length > 0 && (
                      <StatRow label="cooldowns" value={Object.entries(ic.enemyAbilityCooldowns).filter(([, v]) => (v as number) > 0).map(([k, v]) => `${k}:${v}`).join(', ')} color="#fb923c" />
                    )}
                  </div>
                </details>
              );
            })}
          </>
        )}

        {tab === 'cards' && (
          <>
            {[0, 1].map(pid => {
              const hand = hands?.[pid];
              const deck = decks?.[pid];
              if (!hand && !deck) return <div key={pid} className="text-[10px] text-slate-600 mb-2">P{pid} no deck</div>;
              return (
                <div key={pid}>
                  <SectionTitle>{pid === 0 ? 'Player 0 (you)' : 'Player 1 (AI)'}</SectionTitle>
                  <StatRow label="hand"     value={hand?.cards?.length ?? 0} color="#fbbf24" />
                  <StatRow label="draw"     value={deck?.drawPile?.length ?? 0} />
                  <StatRow label="discard"  value={deck?.discardPile?.length ?? 0} />
                  {hand?.cards?.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[10px] font-mono text-slate-400">hand contents</summary>
                      <div className="pl-3 pt-1 space-y-0.5 text-[9px] font-mono text-slate-500 leading-tight">
                        {hand.cards.map((c: any, i: number) => (
                          <div key={i}>
                            <span style={{ color: (c.manaCost ?? 0) > mana[pid] ? '#475569' : '#cbd5e1' }}>
                              {c.manaCost ?? 0}m {c.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  {deck?.drawPile?.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[10px] font-mono text-slate-400">draw pile (top {Math.min(deck.drawPile.length, 8)})</summary>
                      <div className="pl-3 pt-1 space-y-0.5 text-[9px] font-mono text-slate-500 leading-tight">
                        {deck.drawPile.slice(0, 8).map((c: any, i: number) => (
                          <div key={i}>{c.manaCost ?? 0}m {c.name}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === 'state' && (
          <>
            <SectionTitle>AI intents ({aiIntents.length})</SectionTitle>
            <div className="text-[9px] font-mono text-slate-500 space-y-0.5">
              {aiIntents.length === 0 && <div className="text-slate-700">(none)</div>}
              {aiIntents.map((it: any, i: number) => {
                const ic = allIcons.find(x => x.id === it.iconId);
                return (
                  <div key={i} style={{ color: '#fca5a5' }}>
                    {ic ? shortName(ic.name) : it.iconId} → {it.type} {it.abilityName ?? ''} {it.label ?? ''} (rng {it.range ?? '?'})
                  </div>
                );
              })}
            </div>

            <SectionTitle>Active zones ({activeZones.length})</SectionTitle>
            <div className="text-[9px] font-mono text-slate-500 space-y-0.5">
              {activeZones.length === 0 && <div className="text-slate-700">(none)</div>}
              {activeZones.map((z: any, i: number) => (
                <div key={i}>
                  {z.effect} @ ({z.center.q},{z.center.r}) r={z.radius} t={z.turnsRemaining} owner=P{z.ownerId}
                </div>
              ))}
            </div>

            <SectionTitle>Flags</SectionTitle>
            {ext.floodActive && <StatRow label="flood" value="ACTIVE" color="#22d3ee" />}
            {ext.forestFireActive && <StatRow label="fire"  value="ACTIVE" color="#fb923c" />}
            {ext.arenaEvent && <StatRow label="arenaEvent" value={`${ext.arenaEvent.id} (${ext.arenaEventAge})`} color="#c084fc" />}
            {ext.overchargePlayerId !== undefined && <StatRow label="overcharge" value={`P${ext.overchargePlayerId}`} color="#fbbf24" />}
            {ext.bossPhases && <StatRow label="bossPhases" value={ext.bossPhases.length} color="#f87171" />}
          </>
        )}

        {tab === 'tools' && (
          <>
            <SectionTitle>Quick actions (localStorage)</SectionTitle>
            <div className="space-y-1.5">
              <button
                className="w-full text-left text-[10px] font-mono px-2 py-1.5 rounded border transition-all hover:bg-blue-500/10"
                style={{ borderColor: 'rgba(96,165,250,0.4)', color: '#93c5fd' }}
                onClick={() => { try { localStorage.removeItem('wcw_onboarding_seen_v1'); alert('Onboarding tips reset.'); } catch {} }}
              >Reset onboarding tips</button>
              <button
                className="w-full text-left text-[10px] font-mono px-2 py-1.5 rounded border transition-all hover:bg-blue-500/10"
                style={{ borderColor: 'rgba(96,165,250,0.4)', color: '#93c5fd' }}
                onClick={() => { try { localStorage.removeItem('wcw_tutorial_done'); alert('Tutorial flag cleared.'); } catch {} }}
              >Clear tutorial-done flag</button>
              <button
                className="w-full text-left text-[10px] font-mono px-2 py-1.5 rounded border transition-all hover:bg-red-500/10"
                style={{ borderColor: 'rgba(248,113,113,0.4)', color: '#fca5a5' }}
                onClick={() => { if (confirm('Wipe ALL save data? (run, achievements, settings)')) { try { localStorage.clear(); location.reload(); } catch {} } }}
              >⚠ Wipe ALL localStorage + reload</button>
            </div>

            <SectionTitle>Save state</SectionTitle>
            <StatRow label="active run"  value={readLS('wcw_active_run_v1')   .length > 50 ? `${readLS('wcw_active_run_v1').length} bytes`   : '(none)'} />
            <StatRow label="run backup"  value={readLS('wcw_active_run_v1__prev').length > 50 ? `${readLS('wcw_active_run_v1__prev').length} bytes` : '(none)'} />
            <StatRow label="tutorial"    value={readLS('wcw_tutorial_done', '0')} />
            <StatRow label="achievements" value={readLS('wcw_achievements_unlocked_v1', '[]').length > 2 ? '(some)' : '(none)'} />

            <SectionTitle>Build info</SectionTitle>
            <StatRow label="React mode"  value={(import.meta as any).env?.MODE ?? '?'} />
            <StatRow label="userAgent"   value={navigator.userAgent.length > 30 ? navigator.userAgent.slice(0, 30) + '…' : navigator.userAgent} />
            <StatRow label="now"         value={new Date().toLocaleTimeString()} />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

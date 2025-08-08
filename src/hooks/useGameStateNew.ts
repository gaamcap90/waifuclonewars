import { useState, useCallback, useEffect } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType } from "@/types/game";
import { toast } from "sonner";

// TURN/COMBAT HELPERS (external)
import {
  initSpeedQueue,
  isRoundBoundary,                  // keep using, but we’ll also detect boundary during skip
  countAlliesAdjacentToCrystal,
  findFreeSpawnTile,
  hexDistance,
} from "@/engine/turnEngine";
import { resolveBasicAttackDamage, resolveAbilityDamage } from "@/combat/resolver";
import { calcEffectiveStats } from "@/combat/buffs";

/* =========================
   Board / Icons init
   ========================= */

const tileKey = (q: number, r: number) => `${q},${r}`;
const getId = (x: any): string => (typeof x === "string" ? x : x?.id ?? "");

type Qr = { q: number; r: number };
type MoveStep = { from: Coordinates; to: Coordinates; cost: number };

function movementCostForTile(tile: HexTile): number {
  if (tile.terrain.effects.movementModifier === -999) return Infinity; // impassable
  if (tile.terrain.type === "forest") return 2;                         // ALWAYS 2 in forests
  return 1;                                                              // plains/spawn/etc
}
function neighborsAxial({ q, r }: Qr): Qr[] {
  return [
    { q: q + 1, r: r },
    { q: q + 1, r: r - 1 },
    { q: q, r: r - 1 },
    { q: q - 1, r: r },
    { q: q - 1, r: r + 1 },
    { q: q, r: r + 1 },
  ];
}
/** Dijkstra (costs: plain=1, forest=2). Blocks impassables and occupied hexes. */
function reachableWithCosts(
  board: HexTile[],
  start: Qr,
  maxBudget: number,
  occupiedKeys: Set<string>
): Map<string, number> {
  const byKey = new Map(board.map((t) => [tileKey(t.coordinates.q, t.coordinates.r), t]));
  const dist = new Map<string, number>();
  const pq: Array<{ key: string; cost: number }> = [];

  const startKey = tileKey(start.q, start.r);
  dist.set(startKey, 0);
  pq.push({ key: startKey, cost: 0 });

  while (pq.length) {
    let minI = 0;
    for (let i = 1; i < pq.length; i++) if (pq[i].cost < pq[minI].cost) minI = i;
    const { key, cost } = pq.splice(minI, 1)[0];
    if (cost > (dist.get(key) ?? Infinity)) continue;

    const [qStr, rStr] = key.split(",");
    const pos = { q: parseInt(qStr, 10), r: parseInt(rStr, 10) };

    for (const nb of neighborsAxial(pos)) {
      const nbKey = tileKey(nb.q, nb.r);
      const nbTile = byKey.get(nbKey);
      if (!nbTile) continue;

      if (nbKey !== startKey && occupiedKeys.has(nbKey)) continue; // can move OUT of start
      const step = movementCostForTile(nbTile);
      if (!isFinite(step)) continue;

      const newCost = cost + step;
      if (newCost > maxBudget) continue;

      if (newCost < (dist.get(nbKey) ?? Infinity)) {
        dist.set(nbKey, newCost);
        pq.push({ key: nbKey, cost: newCost });
      }
    }
  }
  dist.delete(startKey);
  return dist;
}

const getTerrainForPosition = (q: number, r: number): TerrainType => {
  if (q === 0 && r === 0) return { type: "mana_crystal", effects: { movementModifier: -999 } };
  if ((q === -6 && r === 5) || (q === 6 && r === -5)) return { type: "base", effects: { movementModifier: -999 } };
  if (
    (q >= -6 && q <= -4 && r >= 3 && r <= 5) ||
    (q >= 4 && q <= 6 && r >= -5 && r <= -3)
  ) return { type: "spawn", effects: {} };
  if ((q === -2 && r === 2) || (q === 2 && r === -2)) return { type: "beast_camp", effects: { movementModifier: -999 } };
  if (Math.abs(q) >= 6 || Math.abs(r) >= 6 || Math.abs(q + r) >= 6)
    return { type: "mountain", effects: { rangeBonus: true, blocksLineOfSight: true, movementModifier: -999 } };
  if ((Math.abs(q + r) === 3 && Math.abs(q) <= 2) || (q === 0 && Math.abs(r) === 4))
    return { type: "river", effects: { movementModifier: -999 } };

  const isForest =
    (q >= -4 && q <= -2 && r >= 0 && r <= 2) ||
    (q >= 2 && q <= 4 && r >= -2 && r <= 0) ||
    (q >= -1 && q <= 1 && r >= -3 && r <= -1) ||
    (q >= -1 && q <= 1 && r >= 1 && r <= 3);
  if (isForest) return { type: "forest", effects: { dodgeBonus: true, stealthBonus: true } };

  return { type: "plain", effects: {} };
};

const createInitialBoard = (): HexTile[] => {
  const board: HexTile[] = [];
  for (let q = -7; q <= 7; q++) {
    const r1 = Math.max(-7, -q - 7);
    const r2 = Math.min(7, -q + 7);
    for (let r = r1; r <= r2; r++) {
      board.push({
        coordinates: { q, r },
        terrain: getTerrainForPosition(q, r),
        highlighted: false,
        selectable: false,
      });
    }
  }
  return board;
};

const createInitialIcons = (): Icon[] => {
  const iconTemplates = [
    {
      name: "Napoleon-chan",
      role: "dps_ranged" as const,
      stats: { hp: 100, maxHp: 100, moveRange: 2, speed: 6, might: 70, power: 60, defense: 15, movement: 2 },
      abilities: [
        { id: "1", name: "Artillery Barrage", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Deals 48 damage.", damage: 48 },
        { id: "2", name: "Grande Armée", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Summons phantom soldiers. +20% damage to all allies for 3 turns.", damage: 0 },
        { id: "ultimate", name: "Final Salvo", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Deal 30 damage in a 3-tile line", damage: 30 },
      ],
      passive: "Tactical Genius: +1 movement range when commanding from high ground",
    },
    {
      name: "Genghis-chan",
      role: "dps_melee" as const,
      stats: { hp: 120, maxHp: 120, moveRange: 2, speed: 8, might: 50, power: 40, defense: 25, movement: 2 },
      abilities: [
        { id: "1", name: "Mongol Charge", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Rush attack through enemies. Deals 48 damage.", damage: 48 },
        { id: "2", name: "Horde Tactics", manaCost: 5, cooldown: 0, currentCooldown: 0, range: 1, description: "Teleport behind target. Deals 60 damage + fear effect.", damage: 60 },
        { id: "ultimate", name: "Rider's Fury", manaCost: 7, cooldown: 0, currentCooldown: 0, range: 2, description: "ULTIMATE: Charge through up to 3 enemies, dealing 24 damage each", damage: 24 },
      ],
      passive: "Conqueror's Fury: +15% damage for each enemy defeated this match",
    },
    {
      name: "Da Vinci-chan",
      role: "support" as const,
      stats: { hp: 80, maxHp: 80, moveRange: 2, speed: 4, might: 35, power: 50, defense: 20, movement: 2 },
      abilities: [
        { id: "1", name: "Flying Machine", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Teleport to any hex + gain aerial view for 2 turns.", damage: 0 },
        { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Heals 45 HP + shields allies from next attack.", healing: 45 },
        { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons a 2-turn drone that auto-attacks nearby enemies", damage: 0 },
      ],
      passive: "Renaissance Mind: Gains +1 mana when casting spells near mana crystals",
    },
  ];

  const icons: Icon[] = [];
  const player1Spawns = [{ q: -4, r: 3 }, { q: -4, r: 2 }, { q: -3, r: 3 }];
  const player2Spawns = [{ q: 4, r: -3 }, { q: 4, r: -2 }, { q: 3, r: -3 }];

  for (let playerId = 0; playerId < 2; playerId++) {
    iconTemplates.forEach((template, index) => {
      const spawns = playerId === 0 ? player1Spawns : player2Spawns;
      icons.push({
        id: `${playerId}-${index}`,
        ...template,
        position: spawns[index],
        playerId,
        isAlive: true,
        respawnTurns: 0,
        actionTaken: false,
        movedThisTurn: false,
        hasUltimate: true,
        ultimateUsed: false,
      });
    });
  }
  return icons;
};

/* =========================
   Hook
   ========================= */

type ExtState = GameState & { movementStack: Record<string, MoveStep[]> };

const useGameState = (gameMode: "singleplayer" | "multiplayer" = "singleplayer") => {
  const [gameState, setGameState] = useState<ExtState>(() => {
    const initialIcons = createInitialIcons();
    const queueRaw = initSpeedQueue(initialIcons) as any[];
    const speedQueue: string[] = queueRaw.map((e) => getId(e)); // normalize to ids

    return {
      currentTurn: 1,
      activeIconId: speedQueue[0],
      phase: "combat",
      players: [
        { id: 0, name: "Player 1", icons: initialIcons.filter((i) => i.playerId === 0), color: "blue", isAI: false },
        { id: 1, name: gameMode === "singleplayer" ? "Znyxorgan AI" : "Player 2", icons: initialIcons.filter((i) => i.playerId === 1), color: "red", isAI: gameMode === "singleplayer" },
      ],
      board: createInitialBoard(),
      globalMana: [15, 15],
      turnTimer: 20,
      speedQueue,
      queueIndex: 0,
      objectives: {
        manaCrystal: { controlled: false },
        beastCamps: { hp: [75, 75], maxHp: 75, defeated: [false, false] },
      },
      teamBuffs: { mightBonus: [0, 0], powerBonus: [0, 0] },
      baseHealth: [5, 5],
      matchTimer: 600,
      gameMode,
      movementStack: {},
    } as ExtState;
  });

  const [currentTurnTimer, setCurrentTurnTimer] = useState(20);

  /* =========================
     ESC → toggle Menu
     ========================= */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGameState((prev) => {
          if (prev.phase === "victory" || prev.phase === "defeat") return prev;
          return { ...prev, phase: prev.phase === "menu" ? "combat" : ("menu" as any) };
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* =========================
     Turn timer
     ========================= */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTurnTimer((prev) => {
        if (prev <= 1) {
          endTurn();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.activeIconId]);

  useEffect(() => setCurrentTurnTimer(20), [gameState.activeIconId]);

  /* =========================
     AI — deterministic & synchronous (no targetingMode)
     Runs shortly after the AI becomes active.
     ========================= */
  useEffect(() => {
    if (gameState.gameMode !== "singleplayer" || gameState.phase !== "combat") return;

    const active = gameState.players.flatMap((p) => p.icons).find((i) => i.id === gameState.activeIconId);
    const isAI = !!active && active.playerId === 1 && active.isAlive;
    if (!isAI) return;

    const t = setTimeout(() => {
      setGameState((prev) => {
        const state = { ...prev } as ExtState;
        const me = state.players.flatMap((p) => p.icons).find((i) => i.id === state.activeIconId);
        if (!me || !me.isAlive || me.playerId !== 1) return prev;

        // Helper getters
        const enemyTeam = 0;
        const enemies = state.players[enemyTeam].icons.filter((i) => i.isAlive);

        const basicRange = (me.name === "Napoleon-chan" || me.name === "Da Vinci-chan") ? 2 : 1;

        const canBasicNow = () =>
          enemies.find((e) => hexDistance(me.position, e.position) <= basicRange);

        const canAbilityNow = () => {
          // pick a damaging ability that is affordable and in range (prefer lethal)
          let choice: { abilityId: string; target: Icon } | null = null;
          let lethal: { abilityId: string; target: Icon; dmg: number } | null = null;

          for (const ab of me.abilities) {
            const manaOk = state.globalMana[me.playerId] >= ab.manaCost;
            if (!manaOk) continue;

            const isDamage =
              typeof ab.damage === "number" && ab.damage > 0;

            if (!isDamage) continue;

            for (const e of enemies) {
              if (hexDistance(me.position, e.position) <= ab.range) {
                const dmg = ab.damage > 0 ? ab.damage : resolveAbilityDamage(state, me, e, 1.0);
                if (e.stats.hp - dmg <= 0) {
                  lethal = { abilityId: ab.id, target: e, dmg };
                } else if (!choice) {
                  choice = { abilityId: ab.id, target: e };
                }
              }
            }
            if (lethal) break;
          }
          return lethal ?? choice;
        };

        // --- 1) Try ability (prefer lethal) ---
        const abPick = canAbilityNow();
        if (abPick) {
          const { abilityId, target } = abPick;
          const ab = me.abilities.find((a) => a.id === abilityId)!;

          let dmg = ab.damage && ab.damage > 0
            ? ab.damage
            : resolveAbilityDamage(state, me, target, 1.0);

          // Apply damage
          state.players = state.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => {
              if (ic.id !== target.id) return ic;
              const newHp = Math.max(0, ic.stats.hp - dmg);
              return {
                ...ic,
                stats: { ...ic.stats, hp: newHp },
                isAlive: newHp > 0,
                respawnTurns: newHp > 0 ? ic.respawnTurns : 3,
              };
            }),
          }));

          // Consume mana & mark action
          state.globalMana = state.globalMana.map((m, idx) =>
            idx === me.playerId ? Math.max(0, m - ab.manaCost) : m
          ) as any;

          state.players = state.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) =>
              ic.id === me.id ? { ...ic, actionTaken: true, ultimateUsed: ic.ultimateUsed || abilityId === "ultimate" } : ic
            ),
          }));

          return state;
        }

        // --- 2) Try basic attack ---
        const basicTarget = canBasicNow();
        if (basicTarget && !me.actionTaken) {
          const damage = resolveBasicAttackDamage(state, me, basicTarget);

          state.players = state.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => {
              if (ic.id !== basicTarget.id) return ic;
              const newHp = Math.max(0, ic.stats.hp - damage);
              return {
                ...ic,
                stats: { ...ic.stats, hp: newHp },
                isAlive: newHp > 0,
                respawnTurns: newHp > 0 ? ic.respawnTurns : 3,
              };
            }),
          }));

          state.players = state.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => (ic.id === me.id ? { ...ic, actionTaken: true } : ic)),
          }));

          return state;
        }

        // --- 3) Move once (terrain aware) toward closest enemy, and if after move can attack, do so ---
        if (!me.movedThisTurn && me.stats.movement > 0 && enemies.length) {
          const budget = Math.min(me.stats.movement, me.stats.moveRange);
          const occupied = new Set(
            state.players
              .flatMap((p) => p.icons)
              .filter((ic) => ic.isAlive && ic.id !== me.id)
              .map((ic) => tileKey(ic.position.q, ic.position.r))
          );
          const costMap = reachableWithCosts(state.board, me.position, budget, occupied);
          if (costMap.size > 0) {
            // pick tile minimizing raw hex distance to nearest enemy; tie-break: cheaper cost
            let best: { coord: Coordinates; cost: number; score: number } | null = null;
            for (const [key, cost] of costMap.entries()) {
              const [qStr, rStr] = key.split(",");
              const cand: Coordinates = { q: parseInt(qStr, 10), r: parseInt(rStr, 10) };
              let minD = Infinity;
              for (const e of enemies) {
                const d = hexDistance(cand, e.position);
                if (d < minD) minD = d;
              }
              if (!best || minD < best.score || (minD === best.score && cost < best.cost)) {
                best = { coord: cand, cost, score: minD };
              }
            }

            if (best) {
              const from = { ...me.position };
              const to = best.coord;
              const spent = best.cost;

              // move
              state.players = state.players.map((p) => ({
                ...p,
                icons: p.icons.map((ic) =>
                  ic.id === me.id
                    ? {
                        ...ic,
                        position: to,
                        movedThisTurn: true,
                        stats: { ...ic.stats, movement: Math.max(0, ic.stats.movement - spent) },
                      }
                    : ic
                ),
              }));

              // after move, see if basic attack is now possible
              const meAfter = state.players.flatMap((p) => p.icons).find((i) => i.id === me.id)!;
              const tgtAfter = state.players[enemyTeam].icons
                .filter((i) => i.isAlive)
                .find((e) => hexDistance(meAfter.position, e.position) <= basicRange);

              if (tgtAfter && !meAfter.actionTaken) {
                const damage = resolveBasicAttackDamage(state, meAfter, tgtAfter);
                state.players = state.players.map((p) => ({
                  ...p,
                  icons: p.icons.map((ic) => {
                    if (ic.id !== tgtAfter.id) return ic;
                    const newHp = Math.max(0, ic.stats.hp - damage);
                    return {
                      ...ic,
                      stats: { ...ic.stats, hp: newHp },
                      isAlive: newHp > 0,
                      respawnTurns: newHp > 0 ? ic.respawnTurns : 3,
                    };
                  }),
                }));
                state.players = state.players.map((p) => ({
                  ...p,
                  icons: p.icons.map((ic) => (ic.id === meAfter.id ? { ...ic, actionTaken: true } : ic)),
                }));
              }
              return state;
            }
          }
        }

        // --- 4) Nothing else → end turn happens via timer below ---
        return state;
      });

      // End the AI turn if it spent its action or cannot act
      setTimeout(() => {
        setGameState((prev) => {
          const me = prev.players.flatMap((p) => p.icons).find((i) => i.id === prev.activeIconId);
          if (!me || me.playerId !== 1) return prev;
          // If action is taken OR no movement left / already moved and no target reachable → end
          const enemies = prev.players[0].icons.filter((i) => i.isAlive);
          const basicRange = (me.name === "Napoleon-chan" || me.name === "Da Vinci-chan") ? 2 : 1;
          const hasBasicNow = enemies.some((e) => hexDistance(me.position, e.position) <= basicRange);
          const canStillAct = !me.actionTaken && (hasBasicNow || me.stats.movement > 0);
          if (canStillAct) return prev;
          return prev; // endTurn called outside setState to avoid nested reducers
        });
        endTurn();
      }, 10);
    }, 150);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.activeIconId, gameState.phase, gameState.gameMode]);

  /* =========================
     Input handlers
     ========================= */

  const selectTile = useCallback((coordinates: Coordinates) => {
    setGameState((prev) => {
      const state = { ...prev } as ExtState;
      const activeIcon = state.players.flatMap((p) => p.icons).find((i) => i.id === state.activeIconId);
      if (!activeIcon) return prev;

      // Prevent controlling AI in singleplayer
      if (state.gameMode === "singleplayer" && activeIcon.playerId === 1) return prev;

      // Targeting path removed from this hook for determinism.
      // Movement or selection only.

      const clickedIcon = state.players
        .flatMap((p) => p.icons)
        .find((i) => i.isAlive && i.position.q === coordinates.q && i.position.r === coordinates.r);

      if (clickedIcon && clickedIcon.id === state.activeIconId) {
        return { ...state, selectedIcon: clickedIcon.id };
      }

      const destinationTile = state.board.find((t) => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
      if (!destinationTile) return prev;
      if (destinationTile.terrain.effects.movementModifier === -999) return prev; // impassable

      const occupied = state.players
        .flatMap((p) => p.icons)
        .some((ic) => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r);
      if (occupied) return prev;

      // terrain-aware move (plain=1, forest=2) within movement & moveRange
      const budget = Math.min(activeIcon.stats.movement, activeIcon.stats.moveRange);
      const occupiedKeys = new Set(
        state.players
          .flatMap((p) => p.icons)
          .filter((ic) => ic.isAlive && ic.id !== activeIcon.id)
          .map((ic) => tileKey(ic.position.q, ic.position.r))
      );
      const costMap = reachableWithCosts(state.board, activeIcon.position, budget, occupiedKeys);
      const destKey = tileKey(coordinates.q, coordinates.r);
      const moveCost = costMap.get(destKey);
      if (moveCost === undefined) return prev; // not reachable this turn

      const from = { ...activeIcon.position };

      // Move and push to movement stack for undo
      const movementStack = { ...(state.movementStack ?? {}) };
      const stack = movementStack[activeIcon.id] ?? [];
      stack.push({ from, to: coordinates, cost: moveCost });
      movementStack[activeIcon.id] = stack;

      state.players = state.players.map((p) => ({
        ...p,
        icons: p.icons.map((ic) =>
          ic.id === activeIcon.id
            ? {
                ...ic,
                position: coordinates,
                movedThisTurn: true,
                stats: { ...ic.stats, movement: Math.max(0, ic.stats.movement - moveCost) },
              }
            : ic
        ),
      }));
      state.movementStack = movementStack;

      return state;
    });
  }, []);

  const useAbility = useCallback((abilityId: string) => {
    setGameState((prev) => {
      const state = { ...prev } as ExtState;
      const me = state.players.flatMap((p) => p.icons).find((i) => i.id === state.activeIconId);
      if (!me || me.actionTaken) return prev;

      const ability = me.abilities.find((a) => a.id === abilityId);
      if (!ability) return prev;
      if (abilityId === "ultimate" && me.ultimateUsed) return prev;

      if (state.globalMana[me.playerId] < ability.manaCost) {
        toast.error("Not enough mana!");
        return prev;
      }

      // Simple manual targeting: prefer enemy in range; otherwise camp/base in range
      const enemies = state.players[(me.playerId === 0 ? 1 : 0)].icons.filter((i) => i.isAlive);
      let targetIcon: Icon | undefined;
      for (const e of enemies) {
        if (hexDistance(me.position, e.position) <= ability.range) {
          targetIcon = e;
          break;
        }
      }

      let updatedState = state;

      if (typeof (ability as any).healing === "number" && (ability as any).healing > 0) {
        // heal ally in range (lowest hp% first)
        const allies = state.players[me.playerId].icons
          .filter((i) => i.isAlive && hexDistance(me.position, i.position) <= ability.range)
          .sort((a, b) => a.stats.hp / a.stats.maxHp - b.stats.hp / b.stats.maxHp);
        if (!allies.length) {
          toast.error("No ally in range to heal.");
          return prev;
        }
        const healTarget = allies[0];
        const heal = (ability as any).healing as number;
        updatedState.players = updatedState.players.map((p) => ({
          ...p,
          icons: p.icons.map((ic) =>
            ic.id === healTarget.id ? { ...ic, stats: { ...ic.stats, hp: Math.min(ic.stats.maxHp, ic.stats.hp + heal) } } : ic
          ),
        }));
      } else if (typeof ability.damage === "number" && ability.damage > 0) {
        if (targetIcon) {
          const dmg = ability.damage > 0 ? ability.damage : resolveAbilityDamage(updatedState, me, targetIcon, 1.0);
          updatedState.players = updatedState.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) =>
              ic.id === targetIcon!.id
                ? {
                    ...ic,
                    stats: { ...ic.stats, hp: Math.max(0, ic.stats.hp - dmg) },
                    isAlive: ic.stats.hp - dmg > 0,
                    respawnTurns: ic.stats.hp - dmg > 0 ? ic.respawnTurns : 3,
                  }
                : ic
            ),
          }));
        } else {
          // ENV: base/camp in range → Power vs 0
          const envDamage = Math.max(0.1, calcEffectiveStats(updatedState, me).power);
          const inRange = (q: number, r: number) => hexDistance(me.position, { q, r }) <= ability.range;

          if (inRange(-6, 5)) {
            updatedState.baseHealth = [Math.max(0, updatedState.baseHealth[0] - envDamage), updatedState.baseHealth[1]];
          } else if (inRange(6, -5)) {
            updatedState.baseHealth = [updatedState.baseHealth[0], Math.max(0, updatedState.baseHealth[1] - envDamage)];
          } else {
            const camps: Coordinates[] = [{ q: -2, r: 2 }, { q: 2, r: -2 }];
            for (let idx = 0; idx < camps.length; idx++) {
              const c = camps[idx];
              if (inRange(c.q, c.r) && !updatedState.objectives.beastCamps.defeated[idx]) {
                const newHp = Math.max(0, updatedState.objectives.beastCamps.hp[idx] - envDamage);
                const hpArr = [...updatedState.objectives.beastCamps.hp];
                const defArr = [...updatedState.objectives.beastCamps.defeated];
                hpArr[idx] = newHp;

                if (newHp <= 0 && !defArr[idx]) {
                  defArr[idx] = true;
                  updatedState.board = updatedState.board.map((t) =>
                    t.coordinates.q === c.q && t.coordinates.r === c.r
                      ? { ...t, terrain: { type: "plain", effects: {} } }
                      : t
                  );
                  const newM = [...updatedState.teamBuffs.mightBonus];
                  const newP = [...updatedState.teamBuffs.powerBonus];
                  newM[me.playerId] = Math.min((newM[me.playerId] ?? 0) + 15, 30);
                  newP[me.playerId] = Math.min((newP[me.playerId] ?? 0) + 15, 30);
                  updatedState.teamBuffs = { mightBonus: newM, powerBonus: newP };
                  toast.success("Beast Camp defeated! Team gains +15% Might and Power!");
                }

                updatedState.objectives = {
                  ...updatedState.objectives,
                  beastCamps: { ...updatedState.objectives.beastCamps, hp: hpArr, defeated: defArr },
                };
                break;
              }
            }
          }
        }
      } else {
        // non-damaging, non-heal ability: just consume mana
      }

      // consume mana, mark action
      updatedState.globalMana = updatedState.globalMana.map((m, idx) =>
        idx === me.playerId ? Math.max(0, m - ability.manaCost) : m
      ) as any;
      updatedState.players = updatedState.players.map((p) => ({
        ...p,
        icons: p.icons.map((ic) =>
          ic.id === me.id ? { ...ic, actionTaken: true, ultimateUsed: ic.ultimateUsed || abilityId === "ultimate" } : ic
        ),
      }));

      return updatedState;
    });
  }, []);

  const basicAttack = useCallback(() => {
    setGameState((prev) => {
      const me = prev.players.flatMap((p) => p.icons).find((i) => i.id === prev.activeIconId);
      if (!me || me.actionTaken) return prev;
      if (prev.gameMode === "singleplayer" && me.playerId === 1) return prev;

      const range = me.name === "Napoleon-chan" || me.name === "Da Vinci-chan" ? 2 : 1;
      const enemies = prev.players[(me.playerId === 0 ? 1 : 0)].icons.filter((i) => i.isAlive);
      const target = enemies.find((e) => hexDistance(me.position, e.position) <= range);
      if (!target) return prev;

      const damage = resolveBasicAttackDamage(prev, me, target);
      const players = prev.players.map((p) => ({
        ...p,
        icons: p.icons.map((ic) => {
          if (ic.id !== target.id) return ic;
          const newHp = Math.max(0, ic.stats.hp - damage);
          return {
            ...ic,
            stats: { ...ic.stats, hp: newHp },
            isAlive: newHp > 0,
            respawnTurns: newHp > 0 ? ic.respawnTurns : 3,
          };
        }),
      }));
      const players2 = players.map((p) => ({
        ...p,
        icons: p.icons.map((ic) => (ic.id === me.id ? { ...ic, actionTaken: true } : ic)),
      }));
      return { ...prev, players: players2 };
    });
  }, []);

  /* =========================
     End Turn — robust boundary handling while skipping dead entries
     ========================= */
  const endTurn = useCallback(() => {
    setCurrentTurnTimer(20);
    setGameState((prev) => {
      if (!prev.speedQueue.length) return prev;

      // 1) reset only current icon & clear its movement stack
      const movementStack = { ...(prev.movementStack ?? {}) };
      movementStack[prev.activeIconId] = []; // clear undo stack at end of this unit’s turn

      const resetPlayers = prev.players.map((player) => ({
        ...player,
        icons: player.icons.map((ic) =>
          ic.id === prev.activeIconId
            ? {
                ...ic,
                actionTaken: false,
                movedThisTurn: false,
                stats: { ...ic.stats, movement: ic.stats.moveRange },
              }
            : ic
        ),
      }));

      // 2) compute the *first* next index
      const len = prev.speedQueue.length;
      const nextIndexRaw = (prev.queueIndex + 1) % len;

      // 3) Determine if we cross a round boundary while skipping dead entries.
      //    We mark boundary if we *ever* hit index 0 during the skip scan.
      let boundaryCrossed = nextIndexRaw === 0;
      let scanIdx = nextIndexRaw;
      let guard = 0;

      const scanAlive = (playersArr = resetPlayers) => {
        while (guard++ < len) {
          const id = prev.speedQueue[scanIdx];
          const ic = playersArr.flatMap((p) => p.icons).find((x) => x.id === id);
          if (ic?.isAlive) break;
          scanIdx = (scanIdx + 1) % len;
          if (scanIdx === 0) boundaryCrossed = true;
        }
      };
      scanAlive(resetPlayers);

      // 4) If boundary crossed at any point, apply round boundary (mana + respawn tick + auto-respawn),
      //    then re-select next living from index 0 forward.
      let playersAfter = resetPlayers;
      let mana = [...prev.globalMana];
      let turnNum = prev.currentTurn;

      if (boundaryCrossed) {
        // Mana: +1 baseline + adjacency (cap GAIN to 4). Also cap pool to 20.
        mana = mana.map((m, pid) => {
          const adj = countAlliesAdjacentToCrystal({ ...prev, players: playersAfter } as GameState, pid);
          const gain = Math.min(4, 1 + adj);
          return Math.min(20, m + gain);
        });

        // Respawn tick ONCE per round, then auto-respawn anyone at 0
        playersAfter = playersAfter.map((player) => ({
          ...player,
          icons: player.icons.map((ic) =>
            !ic.isAlive && ic.respawnTurns > 0 ? { ...ic, respawnTurns: ic.respawnTurns - 1 } : ic
          ),
        }));

        playersAfter = playersAfter.map((player) => ({
          ...player,
          icons: player.icons.map((ic) => {
            if (!ic.isAlive && ic.respawnTurns <= 0) {
              const free = findFreeSpawnTile(prev.board, { ...prev, players: playersAfter } as GameState, player.id);
              if (free) {
                return {
                  ...ic,
                  isAlive: true,
                  position: free,
                  stats: { ...ic.stats, hp: ic.stats.maxHp, movement: 0 },
                  respawnTurns: 0,
                };
              }
            }
            return ic;
          }),
        }));

        turnNum = prev.currentTurn + 1;

        // After boundary, start scanning from index 0
        scanIdx = 0;
        guard = 0;
        scanAlive(playersAfter);
      }

      // 5) Apply the chosen active index
      const nextActiveId = prev.speedQueue[scanIdx];

      // 6) victory conditions
      const baseHealth = [...prev.baseHealth];
      const p1Alive = playersAfter[0].icons.some((ic) => ic.isAlive);
      const p2Alive = playersAfter[1].icons.some((ic) => ic.isAlive);

      let newPhase = prev.phase;
      let winner = prev.winner;

      if (!p1Alive && p2Alive) {
        newPhase = "defeat";
        winner = 1;
      } else if (!p2Alive && p1Alive) {
        newPhase = "victory";
        winner = 0;
      } else if (baseHealth[0] <= 0) {
        newPhase = "defeat";
        winner = 1;
      } else if (baseHealth[1] <= 0) {
        newPhase = "victory";
        winner = 0;
      }

      return {
        ...prev,
        players: playersAfter,
        movementStack,
        globalMana: mana,
        queueIndex: scanIdx,
        activeIconId: nextActiveId,
        currentTurn: turnNum,
        selectedIcon: undefined,
        targetingMode: undefined, // we don't rely on this for AI anymore
        phase: newPhase,
        winner,
      };
    });
  }, []);

  // Keep these for your UI
  const selectIcon = useCallback((iconId: string) => {
    setGameState((prev) => ({ ...prev, selectedIcon: iconId }));
  }, []);

  const respawnCharacter = useCallback((iconId: string, coordinates: Coordinates) => {
    setGameState((prev) => {
      const icon = prev.players.flatMap((p) => p.icons).find((i) => i.id === iconId);
      if (!icon || icon.isAlive || icon.respawnTurns > 0) return prev;

      const tile = prev.board.find((t) => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
      if (!tile || tile.terrain.type !== "spawn") return prev;

      const occupied = prev.players
        .flatMap((p) => p.icons)
        .some((i) => i.isAlive && i.position.q === coordinates.q && i.position.r === coordinates.r);
      if (occupied) return prev;

      return {
        ...prev,
        players: prev.players.map((p) => ({
          ...p,
          icons: p.icons.map((i) =>
            i.id === iconId
              ? {
                  ...i,
                  isAlive: true,
                  position: coordinates,
                  stats: { ...i.stats, hp: i.stats.maxHp, movement: 0 },
                  respawnTurns: 0,
                }
              : i
          ),
        })),
      };
    });
  }, []);

  /* =========================
     Undo movement — last step only (refund exact cost, forest=2)
     ========================= */
  const undoMovement = useCallback(() => {
    setGameState((prev) => {
      const state = { ...prev } as ExtState;
      const me = state.players.flatMap((p) => p.icons).find((i) => i.id === state.activeIconId);
      if (!me) return prev;

      const stack = (state.movementStack?.[me.id] ?? []).slice();
      if (!stack.length) return prev;

      const last = stack.pop()!;
      state.movementStack = { ...(state.movementStack ?? {}), [me.id]: stack };

      state.players = state.players.map((p) => ({
        ...p,
        icons: p.icons.map((ic) =>
          ic.id === me.id
            ? {
                ...ic,
                position: last.from,
                movedThisTurn: stack.length > 0, // if stack empty, you fully undone movement
                stats: { ...ic.stats, movement: Math.min(ic.stats.moveRange, ic.stats.movement + last.cost) },
              }
            : ic
        ),
      }));
      return state;
    });
  }, []);

  const startRespawnPlacement = useCallback((iconId: string) => {
    setGameState((prev) => {
      const icon = prev.players.flatMap((p) => p.icons).find((i) => i.id === iconId);
      if (!icon || icon.isAlive || icon.respawnTurns > 0) return prev;

      const activeIcon = prev.players.flatMap((p) => p.icons).find((i) => i.id === prev.activeIconId);
      if (activeIcon?.playerId !== icon.playerId) {
        toast.error("You can only respawn on your turn!");
        return prev;
      }
      return { ...prev, respawnPlacement: iconId };
    });
  }, []);

  const toggleMenu = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase === "victory" || prev.phase === "defeat") return prev;
      return { ...prev, phase: prev.phase === "menu" ? "combat" : ("menu" as any) };
    });
  }, []);

  return {
    gameState,
    selectTile,
    useAbility,
    endTurn,
    basicAttack,
    respawnCharacter,
    currentTurnTimer,
    selectIcon,
    undoMovement,          // now actually undoes last step and refunds movement
    startRespawnPlacement,
    toggleMenu,            // ESC also toggles this internally
  };
};

export default useGameState;







import { useState, useCallback, useEffect } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType } from "@/types/game";
import { toast } from "sonner";

// TURN/COMBAT HELPERS (external)
import {
  initSpeedQueue,
  isRoundBoundary, // kept for compatibility
  countAlliesAdjacentToCrystal,
  findFreeSpawnTile,
  hexDistance,
} from "@/engine/turnEngine";
import { resolveBasicAttackDamage, resolveAbilityDamage } from "@/combat/resolver";
import { calcEffectiveStats } from "@/combat/buffs";

/* =========================
   Constants
   ========================= */

const AI_THINK_MS = 500; // delay before AI begins acting
const AI_END_TURN_MS = 450; // delay before ending AI turn after acting

/* =========================
   Small helpers
   ========================= */

type Qr = { q: number; r: number };
type MoveStep = { from: Coordinates; to: Coordinates; cost: number };
type LogEntry = { id: string; turn: number; text: string; playerId: 0 | 1 };

const tileKey = (q: number, r: number) => `${q},${r}`;

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());
}
function pushLog(state: any, text: string, playerId: number) {
  const pid: 0 | 1 = playerId === 0 ? 0 : 1;
  const max = 40;
  const log: LogEntry[] = state.combatLog ?? [];
  const next = [...log, { id: makeId(), turn: state.currentTurn, text, playerId: pid }];
  state.combatLog = next.slice(-max);
}

function movementCostForTile(tile: HexTile): number {
  if (tile.terrain.effects.movementModifier === -999) return Infinity; // impassable
  if (tile.terrain.type === "forest") return 2; // ALWAYS 2
  return 1;
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

      if (nbKey !== startKey && occupiedKeys.has(nbKey)) continue;
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

/** Normalize a speedQueue into an array of string icon IDs. */
function normalizeSpeedQueue(q: any, icons: Icon[]): string[] {
  if (!Array.isArray(q)) return icons.map((i) => i.id);
  return q
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "id" in item) return (item as any).id as string;
      return String(item || "");
    })
    .filter((id) => typeof id === "string" && id.length > 0);
}

/* =========================
   Board / Icons init
   ========================= */

const getTerrainForPosition = (q: number, r: number): TerrainType => {
  if (q === 0 && r === 0) return { type: "mana_crystal", effects: { movementModifier: -999 } };
  if ((q === -6 && r === 5) || (q === 6 && r === -5)) return { type: "base", effects: { movementModifier: -999 } };
  if (
    (q >= -6 && q <= -4 && r >= 3 && r <= 5) ||
    (q >= 4 && q <= 6 && r >= -5 && r <= -3)
  )
    return { type: "spawn", effects: {} };
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
        {
          id: "1",
          name: "Flying Machine",
          manaCost: 4,
          cooldown: 0,
          currentCooldown: 0,
          range: 4,
          description: "Teleport to any hex + gain aerial view for 2 turns.",
          damage: 0,
          targetMode: "hex" as any, // NEW: hex-target ability
        },
        { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Heals 45 HP + shields allies from next attack.", healing: 45 },
        { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons a 2-turn drone that auto-attacks nearby enemies", damage: 0 },
      ],
      passive: "Renaissance Mind: Gains +1 mana when casting spells near mana crystals",
    },
  ];

  const icons: Icon[] = [];
  const p1 = [{ q: -4, r: 3 }, { q: -4, r: 2 }, { q: -3, r: 3 }];
  const p2 = [{ q: 4, r: -3 }, { q: 4, r: -2 }, { q: 3, r: -3 }];

  for (let pid = 0; pid < 2; pid++) {
    iconTemplates.forEach((t, i) => {
      const spawns = pid === 0 ? p1 : p2;
      icons.push({
        id: `${pid}-${i}`,
        ...t,
        position: spawns[i],
        playerId: pid,
        isAlive: true,
        respawnTurns: 0,
        cardUsedThisTurn: false,
        movedThisTurn: false,
        hasUltimate: true,
        ultimateUsed: false,
        hasRespawned: false,
        justRespawned: false
      });
    });
  }
  return icons;
};

/* =========================
   Hook
   ========================= */

type ExtState = GameState & {
  movementStack: Record<string, MoveStep[]>;
  menuOpen: boolean;
  combatLog: LogEntry[];
};
function buildIconsFromSelection(selected: any[]): Icon[] {
  const p1Spawns = [{ q: -4, r: 3 }, { q: -4, r: 2 }, { q: -3, r: 3 }];
  const p2Spawns = [{ q: 4, r: -3 }, { q: 4, r: -2 }, { q: 3, r: -3 }];

  const toIcon = (template: any, pid: number, idx: number): Icon => ({
    id: `${pid}-${idx}`,
    name: template.name,
    role: template.role,
    stats: {
      hp: template.stats.hp,
      maxHp: template.stats.hp,
      moveRange: 2,
      speed: template.role === "dps_melee" ? 8 : template.role === "dps_ranged" ? 6 : 4,
      might: template.stats.might,
      power: template.stats.power ?? 50,
      defense: template.role === "support" ? 20 : template.role === "dps_melee" ? 25 : 15,
      movement: 2,
    },
    abilities: getAbilitiesForCharacter(template.name),
    passive: getPassiveForCharacter(template.name),
    position: (pid === 0 ? p1Spawns : p2Spawns)[idx],
    playerId: pid,
    isAlive: true,
    respawnTurns: 0,
    cardUsedThisTurn: false,
    movedThisTurn: false,
    hasUltimate: true,
    ultimateUsed: false,
    hasRespawned: false,
    justRespawned: false,
  });

  const icons: Icon[] = [];
  selected.forEach((char, i) => {
    icons.push(toIcon(char, 0, i));
    icons.push(toIcon(char, 1, i));
  });
  return icons;
}

function getAbilitiesForCharacter(name: string) {
  if (name.includes("Napoleon")) return [
    { id: "1", name: "Artillery Barrage", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Deals 48 damage.", damage: 48 },
    { id: "2", name: "Grande Armée", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "+20% damage to all allies for 3 turns.", damage: 0 },
    { id: "ultimate", name: "Final Salvo", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Deal 30 damage in a 3-tile line", damage: 30 },
  ];
  if (name.includes("Genghis")) return [
    { id: "1", name: "Mongol Charge", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Rush attack. Deals 48 damage.", damage: 48 },
    { id: "2", name: "Horde Tactics", manaCost: 5, cooldown: 0, currentCooldown: 0, range: 1, description: "Deals 60 damage + fear effect.", damage: 60 },
    { id: "ultimate", name: "Rider's Fury", manaCost: 7, cooldown: 0, currentCooldown: 0, range: 2, description: "ULTIMATE: 24 damage to up to 3 enemies", damage: 24 },
  ];
  return [
    { id: "1", name: "Flying Machine", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Teleport to any hex.", damage: 0, targetMode: "hex" as any },
    { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Heals 45 HP.", healing: 45 },
    { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons attack drone", damage: 0 },
  ];
}

function getPassiveForCharacter(name: string) {
  if (name.includes("Napoleon")) return "Tactical Genius: +1 movement range from high ground";
  if (name.includes("Genghis")) return "Conqueror's Fury: +15% damage per enemy defeated";
  return "Renaissance Mind: +1 mana near mana crystals";
}

const useGameState = (gameMode: "singleplayer" | "multiplayer" = "singleplayer", selectedCharacters?: any[]) => {
  const [gameState, setGameState] = useState<ExtState>(() => {
    const initialIcons = selectedCharacters && selectedCharacters.length === 3
      ? buildIconsFromSelection(selectedCharacters)
      : createInitialIcons();
    const speedQueueRaw = initSpeedQueue(initialIcons);
    const speedQueue = normalizeSpeedQueue(speedQueueRaw, initialIcons);

    return {
      currentTurn: 1,
      activePlayerId: 0,
      cardLockActive: false,
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
      teamBuffs: { mightBonus: [0, 0], powerBonus: [0, 0], homeBaseBonus: [0, 0] },
      baseHealth: [5, 5],
      matchTimer: 600,
      gameMode,
      movementStack: {},
      menuOpen: false,
      combatLog: [],
    } as ExtState;
  });

  const [currentTurnTimer, setCurrentTurnTimer] = useState(20);

  /* =========================
     ESC overlay (does NOT change phase)
     ========================= */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGameState((prev) => ({ ...prev, menuOpen: !prev.menuOpen }));
      }
    };
    document.addEventListener("keydown", onKeyDown, { passive: true });
    return () => document.removeEventListener("keydown", onKeyDown);
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
     AI — deterministic & synchronous (no targetingMode for AI)
     ========================= */
  useEffect(() => {
    if (gameState.gameMode !== "singleplayer") return;

    if (gameState.activePlayerId !== 1) return;
    const aiIcons = gameState.players[1].icons.filter(i => i.isAlive);
    if (!aiIcons.length) return;

    const t = setTimeout(() => {
      setGameState((prev) => {
        const state = { ...prev } as ExtState;

        const allIcons = state.players.flatMap((p) => p.icons);
        const normalizedQueue = normalizeSpeedQueue(state.speedQueue, allIcons);
        if (normalizedQueue !== state.speedQueue) (state as any).speedQueue = normalizedQueue;

        const aiIcons = state.players[1].icons.filter(i => i.isAlive);
        if (!aiIcons.length) return prev;
        const ai = aiIcons[0]; // act with first available icon for now

        const enemyTeam = 0;
        const enemies = state.players[enemyTeam].icons.filter((i) => i.isAlive);
        const basicRange = ai.name === "Napoleon-chan" || ai.name === "Da Vinci-chan" ? 2 : 1;

        const pickAbility = () => {
          let best: { ab: any; target: Icon; lethal: boolean } | null = null;
          for (const ab of ai.abilities as any[]) {
            if (state.globalMana[ai.playerId] < (ab.manaCost ?? 0)) continue;
            const isDmg = typeof ab.damage === "number" && ab.damage > 0;
            if (!isDmg) continue;
            for (const e of enemies) {
              if (hexDistance(ai.position, e.position) <= ab.range) {
                const dmg = ab.damage > 0 ? ab.damage : resolveAbilityDamage(state, ai, e, 1.0);
                const lethal = e.stats.hp - dmg <= 0;
                if (lethal) return { ab, target: e, lethal: true };
                if (!best) best = { ab, target: e, lethal: false };
              }
            }
          }
          return best;
        };

        // 1) Lethal ability > best ability
        const abPick = pickAbility();
        if (abPick) {
          const { ab, target } = abPick;
          const dmg = ab.damage > 0 ? ab.damage : resolveAbilityDamage(state, ai, target, 1.0);

          state.players = state.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => {
              if (ic.id !== target.id) return ic;
              const newHp = Math.max(0, ic.stats.hp - dmg);
              return {
                ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : (ic.hasRespawned ? -1 : 3)
              };
            }),
          }));

          state.globalMana = state.globalMana.map((m, idx) => (idx === ai.playerId ? Math.max(0, m - (ab.manaCost ?? 0)) : m)) as any;

          state.players = state.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => (ic.id === ai.id ? { ...ic, actionTaken: true, ultimateUsed: ic.ultimateUsed || ab.id === "ultimate" } : ic)),
          }));

          pushLog(state, `${ai.name} cast ${ab.name} on ${target.name} for ${dmg.toFixed(0)} dmg`, ai.playerId);
          return state;
        }

        // 2) Basic if in range
        const basicTarget = enemies.find((e) => hexDistance(ai.position, e.position) <= basicRange);
        if (basicTarget && !ai.actionTaken) {
          const dmg = resolveBasicAttackDamage(state, ai, basicTarget);
          state.players = state.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => {
              if (ic.id !== basicTarget.id) return ic;
              const newHp = Math.max(0, ic.stats.hp - dmg);
              return {
                ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : (ic.hasRespawned ? -1 : 3)
              };
            }),
          }));
          state.players = state.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => (ic.id === ai.id ? { ...ic, actionTaken: true } : ic)),
          }));
          pushLog(state, `${ai.name} basic-attacked ${basicTarget.name} for ${dmg.toFixed(0)} dmg`, ai.playerId);
          return state;
        }

        // 3) Move toward nearest enemy (terrain-aware), then try basic
        if (!ai.movedThisTurn && ai.stats.movement > 0 && enemies.length) {
          const budget = Math.min(ai.stats.movement, ai.stats.moveRange);
          const occupied = new Set(
            state.players.flatMap((p) => p.icons).filter((ic) => ic.isAlive && ic.id !== ai.id).map((ic) => tileKey(ic.position.q, ic.position.r))
          );
          const costMap = reachableWithCosts(state.board, ai.position, budget, occupied);
          if (costMap.size) {
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
              state.players = state.players.map((p) => ({
                ...p,
                icons: p.icons.map((ic) =>
                  ic.id === ai.id
                    ? {
                      ...ic,
                      position: best!.coord,
                      movedThisTurn: true,
                      stats: { ...ic.stats, movement: Math.max(0, ic.stats.movement - best!.cost) },
                    }
                    : ic
                ),
              }));

              const aiAfter = state.players.flatMap((p) => p.icons).find((i) => i.id === ai.id)!;
              const tgtAfter = state.players[enemyTeam].icons
                .filter((i) => i.isAlive)
                .find((e) => hexDistance(aiAfter.position, e.position) <= basicRange);
              if (tgtAfter && !aiAfter.actionTaken) {
                const dmg = resolveBasicAttackDamage(state, aiAfter, tgtAfter);
                state.players = state.players.map((p) => ({
                  ...p,
                  icons: p.icons.map((ic) => {
                    if (ic.id !== tgtAfter.id) return ic;
                    const newHp = Math.max(0, ic.stats.hp - dmg);
                    return {
                      ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : (ic.hasRespawned ? -1 : 3)
                    };
                  }),
                }));
                state.players = state.players.map((p) => ({
                  ...p,
                  icons: p.icons.map((ic) => (ic.id === aiAfter.id ? { ...ic, actionTaken: true } : ic)),
                }));
                pushLog(state, `${aiAfter.name} basic-attacked ${tgtAfter.name} for ${dmg.toFixed(0)} dmg`, aiAfter.playerId);
              }
              return state;
            }
          }
        }
        return state;
      });

      setTimeout(() => endTurn(), AI_END_TURN_MS);
    }, AI_THINK_MS);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.activeIconId, gameState.gameMode]);

  /* =========================
     Input handlers (PLAYER targeting)
     ========================= */

  const selectTile = useCallback((coordinates: Coordinates) => {
    setGameState((prev) => {
      const state = { ...prev } as ExtState;
      const me = state.players.flatMap((p) => p.icons).find((i) => i.id === state.activeIconId);
      if (!me) return prev;

      if (state.gameMode === "singleplayer" && me.playerId === 1) return prev;

      // Targeting path
      if (state.targetingMode) {
        const { range, abilityId } = state.targetingMode;
        if (hexDistance(me.position, coordinates) > range) return prev;

        const targetIcon = state.players
          .flatMap((p) => p.icons)
          .find((ic) => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r);

        let updated = state as ExtState;
        let updatedBaseHealth = [...state.baseHealth];
        let updatedObjectives = { ...state.objectives };

        const isOwnBase =
          (me.playerId === 0 && coordinates.q === -6 && coordinates.r === 5) ||
          (me.playerId === 1 && coordinates.q === 6 && coordinates.r === -5);

        // Lookup ability (if any)
        const ability = me.abilities.find((a) => a.id === abilityId);

        // HEX target abilities (e.g., teleport)
        if (ability && (ability as any).targetMode === "hex") {
          const tile = state.board.find(
            (t) => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r
          );
          const blocked =
            !tile ||
            tile.terrain.effects.movementModifier === -999 ||
            state.players.flatMap((p) => p.icons).some((ic) => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r);
          if (blocked) {
            toast.error("Can't teleport there!");
            return prev;
          }

          updated.players = updated.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => (ic.id === me.id ? { ...ic, position: coordinates, movedThisTurn: true } : ic)),
          }));

          const manaCost = ability.manaCost || 0;
          updated.globalMana = updated.globalMana.map((m, idx) => (idx === me.playerId ? Math.max(0, m - manaCost) : m)) as any;

          updated.players = updated.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => (ic.id === me.id ? { ...ic, actionTaken: true } : ic)),
          }));

          pushLog(updated, `${me.name} used ${ability.name} to teleport`, me.playerId);
          return {
            ...updated,
            baseHealth: updatedBaseHealth,
            objectives: updatedObjectives,
            targetingMode: undefined,
            cardLockActive: true,
          };
        }

        // BASIC ATTACK
        if (abilityId === "basic_attack") {
          if (targetIcon) {
            if (targetIcon.playerId === me.playerId) {
              toast.error("Cannot attack your own character!");
              return prev;
            }
            const dmg = resolveBasicAttackDamage(updated, me, targetIcon);
            pushLog(updated, `${me.name} basic-attacked ${targetIcon.name} for ${dmg.toFixed(0)} dmg`, me.playerId);

            updated.players = updated.players.map((player) => ({
              ...player,
              icons: player.icons.map((ic) =>
                ic.id !== targetIcon.id
                  ? ic
                  : {
                    ...ic,
                    stats: { ...ic.stats, hp: Math.max(0, ic.stats.hp - dmg) },
                    isAlive: ic.stats.hp - dmg > 0,
                    respawnTurns: ic.stats.hp - dmg > 0 ? ic.respawnTurns : (ic.hasRespawned ? -1 : 3),
                  }
              ),
            }));
          } else {
            if (isOwnBase) {
              toast.error("Cannot attack your own base!");
              return prev;
            }
            const envDamage = Math.max(0.1, calcEffectiveStats(updated, me).might);

            const isBase =
              (coordinates.q === -6 && coordinates.r === 5) ||
              (coordinates.q === 6 && coordinates.r === -5);
            if (isBase) {
              const enemyId = me.playerId === 0 ? 1 : 0;
              updatedBaseHealth[enemyId] = Math.max(0, state.baseHealth[enemyId] - envDamage);
              pushLog(updated, `${me.name} hit the enemy base for ${envDamage.toFixed(0)} dmg`, me.playerId);
            } else {
              const campIndex = coordinates.q === -2 && coordinates.r === 2 ? 0 : coordinates.q === 2 && coordinates.r === -2 ? 1 : -1;
              if (campIndex !== -1 && !state.objectives.beastCamps.defeated[campIndex]) {
                const newHp = Math.max(0, state.objectives.beastCamps.hp[campIndex] - envDamage);
                const hpArr = [...state.objectives.beastCamps.hp];
                const defArr = [...state.objectives.beastCamps.defeated];
                hpArr[campIndex] = newHp;
                pushLog(updated, `${me.name} hit a beast camp for ${envDamage.toFixed(0)} dmg`, me.playerId);

                if (newHp <= 0 && !defArr[campIndex]) {
                  defArr[campIndex] = true;
                  updated.board = updated.board.map((tile) =>
                    tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
                      ? { ...tile, terrain: { type: "plain", effects: {} } }
                      : tile
                  );
                  const newM = [...updated.teamBuffs.mightBonus];
                  const newP = [...updated.teamBuffs.powerBonus];
                  newM[me.playerId] = Math.min((newM[me.playerId] ?? 0) + 15, 30);
                  newP[me.playerId] = Math.min((newP[me.playerId] ?? 0) + 15, 30);
                  updated.teamBuffs = { mightBonus: newM, powerBonus: newP, homeBaseBonus: updated.teamBuffs.homeBaseBonus ?? [0, 0] };
                  toast.success("Beast Camp defeated! Team gains +15% Might and Power!");
                  pushLog(updated, `Beast camp defeated! Team +15% Might & Power`, me.playerId);
                }
                updatedObjectives = { ...updatedObjectives, beastCamps: { ...updatedObjectives.beastCamps, hp: hpArr, defeated: defArr } };
              } else {
                toast.error("No target to attack!");
                return prev;
              }
            }
          }
        } else {
          // ABILITY path (unit/env or heal)
          if (!ability) return prev;

          if (typeof (ability as any).healing === "number" && (ability as any).healing > 0) {
            if (!targetIcon || targetIcon.playerId !== me.playerId) {
              toast.error("Healing can only target allies!");
              return prev;
            }
            const heal = (ability as any).healing as number;
            updated.players = updated.players.map((player) => ({
              ...player,
              icons: player.icons.map((ic) =>
                ic.id !== targetIcon.id
                  ? ic
                  : { ...ic, stats: { ...ic.stats, hp: Math.min(ic.stats.maxHp, ic.stats.hp + heal) } }
              ),
            }));
            pushLog(updated, `${me.name} cast ${ability.name} on ${targetIcon.name}, healing ${heal} HP`, me.playerId);
          } else if (typeof (ability as any).damage === "number") {
            if (targetIcon) {
              const dmg = (ability as any).damage > 0 ? (ability as any).damage : resolveAbilityDamage(updated, me, targetIcon, 1.0);
              updated.players = updated.players.map((player) => ({
                ...player,
                icons: player.icons.map((ic) =>
                  ic.id !== targetIcon.id
                    ? ic
                    : {
                      ...ic,
                      stats: { ...ic.stats, hp: Math.max(0, ic.stats.hp - dmg) },
                      isAlive: ic.stats.hp - dmg > 0,
                      respawnTurns: ic.stats.hp - dmg > 0 ? ic.respawnTurns : (ic.hasRespawned ? -1 : 3),
                    }
                ),
              }));
              pushLog(updated, `${me.name} cast ${ability.name} on ${targetIcon.name} for ${dmg.toFixed(0)} dmg`, me.playerId);
            } else {
              if (isOwnBase) {
                toast.error("Cannot attack your own base!");
                return prev;
              }
              const envDamage = Math.max(0.1, calcEffectiveStats(updated, me).power);

              const isBase =
                (coordinates.q === -6 && coordinates.r === 5) ||
                (coordinates.q === 6 && coordinates.r === -5);
              if (isBase) {
                const enemyId = me.playerId === 0 ? 1 : 0;
                updatedBaseHealth[enemyId] = Math.max(0, state.baseHealth[enemyId] - envDamage);
                pushLog(updated, `${me.name} used ${ability.name} on the enemy base for ${envDamage.toFixed(0)} dmg`, me.playerId);
              } else {
                const campIndex = coordinates.q === -2 && coordinates.r === 2 ? 0 : coordinates.q === 2 && coordinates.r === -2 ? 1 : -1;
                if (campIndex !== -1 && !state.objectives.beastCamps.defeated[campIndex]) {
                  const newHp = Math.max(0, state.objectives.beastCamps.hp[campIndex] - envDamage);
                  const hpArr = [...state.objectives.beastCamps.hp];
                  const defArr = [...state.objectives.beastCamps.defeated];
                  hpArr[campIndex] = newHp;
                  pushLog(updated, `${me.name} used ${ability.name} on a camp for ${envDamage.toFixed(0)} dmg`, me.playerId);

                  if (newHp <= 0 && !defArr[campIndex]) {
                    defArr[campIndex] = true;
                    updated.board = updated.board.map((tile) =>
                      tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
                        ? { ...tile, terrain: { type: "plain", effects: {} } }
                        : tile
                    );
                    const newM = [...updated.teamBuffs.mightBonus];
                    const newP = [...updated.teamBuffs.powerBonus];
                    newM[me.playerId] = Math.min((newM[me.playerId] ?? 0) + 15, 30);
                    newP[me.playerId] = Math.min((newP[me.playerId] ?? 0) + 15, 30);
                    updated.teamBuffs = { mightBonus: newM, powerBonus: newP, homeBaseBonus: updated.teamBuffs.homeBaseBonus ?? [0, 0] };
                    toast.success("Beast Camp defeated! Team gains +15% Might and Power!");
                    pushLog(updated, `Beast camp defeated! Team +15% Might & Power`, me.playerId);
                  }
                  updatedObjectives = { ...updatedObjectives, beastCamps: { ...updatedObjectives.beastCamps, hp: hpArr, defeated: defArr } };
                } else {
                  toast.error("No target to hit!");
                  return prev;
                }
              }
            }

            if (ability.id === "ultimate") {
              updated.players = updated.players.map((p) => ({
                ...p,
                icons: p.icons.map((ic) => (ic.id === me.id ? { ...ic, ultimateUsed: true } : ic)),
              }));
            }
          } else {
            // non-dmg, non-heal handled as "cast" / buff skills if you add them later
          }
        }

        // Consume mana if ability (not basic) and mark actionTaken
        const manaCost =
          state.targetingMode.abilityId === "basic_attack"
            ? 0
            : me.abilities.find((a) => a.id === state.targetingMode.abilityId)?.manaCost || 0;

        updated.players = updated.players.map((p) => ({
          ...p,
          icons: p.icons.map((ic) => (ic.id === me.id ? { ...ic, actionTaken: true } : ic)),
        }));
        updated.globalMana = updated.globalMana.map((m, idx) => (idx === me.playerId ? Math.max(0, m - manaCost) : m)) as any;

        return {
          ...updated,
          baseHealth: updatedBaseHealth,
          objectives: updatedObjectives,
          targetingMode: undefined,
        };
      }

      // No targeting → selection or movement
      const clicked = state.players.flatMap((p) => p.icons).find(
        (i) => i.isAlive && i.position.q === coordinates.q && i.position.r === coordinates.r
      );
      if (clicked && clicked.id === state.activeIconId) {
        return { ...state, selectedIcon: clicked.id };
      }

      const dest = state.board.find((t) => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
      if (!dest) return prev;
      if (dest.terrain.effects.movementModifier === -999) return prev;

      const occupied = state.players.flatMap((p) => p.icons).some(
        (ic) => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
      );
      if (occupied) return prev;

      const budget = Math.min(me.stats.movement, me.stats.moveRange);
      const occupiedKeys = new Set(
        state.players.flatMap((p) => p.icons).filter((ic) => ic.isAlive && ic.id !== me.id).map((ic) => tileKey(ic.position.q, ic.position.r))
      );
      const costMap = reachableWithCosts(state.board, me.position, budget, occupiedKeys);
      const destKey = tileKey(coordinates.q, coordinates.r);
      const moveCost = costMap.get(destKey);
      if (moveCost === undefined) return prev;

      const from = { ...me.position };
      const movementStack = { ...(state.movementStack ?? {}) };
      const stack = movementStack[me.id] ?? [];
      stack.push({ from, to: coordinates, cost: moveCost });
      movementStack[me.id] = stack;
      if (state.cardLockActive) return prev;
      state.players = state.players.map((p) => ({
        ...p,
        icons: p.icons.map((ic) =>
          ic.id === me.id
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
      const me = prev.players.flatMap((p) => p.icons).find((i) => i.id === prev.activeIconId);
      if (!me || me.actionTaken) return prev;
      if (prev.gameMode === "singleplayer" && me.playerId === 1) return prev;

      // Toggle off if already targeting this ability for this icon
      if (prev.targetingMode?.abilityId === abilityId && prev.targetingMode.iconId === me.id) {
        return { ...prev, targetingMode: undefined };
      }

      const ability = me.abilities.find((a) => a.id === abilityId);
      if (!ability) return prev;
      if (abilityId === "ultimate" && me.ultimateUsed) return prev;

      if (prev.globalMana[me.playerId] < (ability.manaCost ?? 0)) {
        toast.error("Not enough mana!");
        return prev;
      }

      return { ...prev, targetingMode: { abilityId, iconId: me.id, range: ability.range } };
    });
  }, []);

  const basicAttack = useCallback(() => {
    setGameState((prev) => {
      const me = prev.players.flatMap((p) => p.icons).find((i) => i.id === prev.activeIconId);
      if (!me || me.actionTaken) return prev;
      if (prev.gameMode === "singleplayer" && me.playerId === 1) return prev;

      // Toggle off if already targeting basic for this icon
      if (prev.targetingMode?.abilityId === "basic_attack" && prev.targetingMode.iconId === me.id) {
        return { ...prev, targetingMode: undefined };
      }

      const range = me.name === "Napoleon-chan" || me.name === "Da Vinci-chan" ? 2 : 1;
      return { ...prev, targetingMode: { abilityId: "basic_attack", iconId: me.id, range } };
    });
  }, []);

  /* =========================
     End Turn — robust boundary + respawn at boundary only
     ========================= */
  const endTurn = useCallback(() => {
    setCurrentTurnTimer(20);
    setGameState((prev) => {
      const nextPlayer: 0 | 1 = prev.activePlayerId === 0 ? 1 : 0;

      // Reset all icons for the player who just ended
      const resetPlayers = prev.players.map((player) => ({
        ...player,
        icons: player.icons.map((ic) =>
          ic.playerId === prev.activePlayerId
            ? {
              ...ic,
              movedThisTurn: false,
              cardUsedThisTurn: false,
              stats: { ...ic.stats, movement: ic.stats.moveRange },
            }
            : ic
        ),
      }));

      // Mana refill for the player whose turn is starting
      const mana = [...prev.globalMana] as [number, number];
      const adj = countAlliesAdjacentToCrystal(
        { ...prev, players: resetPlayers } as GameState,
        nextPlayer
      );
      mana[nextPlayer] = Math.min(20, mana[nextPlayer] + Math.min(4, 1 + adj));

      // Respawn tick (once per full round, when player 0's turn starts)
      let playersAfter = resetPlayers;
      if (nextPlayer === 0) {
        playersAfter = playersAfter.map((player) => ({
          ...player,
          icons: player.icons.map((ic) =>
            !ic.isAlive && ic.respawnTurns > 0
              ? { ...ic, respawnTurns: ic.respawnTurns - 1 }
              : ic
          ),
        }));

        playersAfter = playersAfter.map((player) => ({
          ...player,
          icons: player.icons.map((ic) => {
            if (!ic.isAlive && ic.respawnTurns <= 0 && !ic.hasRespawned) {
              const free = findFreeSpawnTile(
                prev.board,
                { ...prev, players: playersAfter } as GameState,
                player.id
              );
              if (free) {
                return {
                  ...ic,
                  isAlive: true,
                  hasRespawned: true,
                  justRespawned: true,
                  position: free,
                  stats: { ...ic.stats, hp: ic.stats.maxHp, movement: 0 },
                  respawnTurns: 0,
                };
              }
            }
            return ic;
          }),
        }));
      }

      // Victory check
      const p0Alive = playersAfter[0].icons.some((ic) => ic.isAlive);
      const p1Alive = playersAfter[1].icons.some((ic) => ic.isAlive);
      let newPhase = prev.phase;
      let winner = prev.winner;
      if (!p0Alive) { newPhase = "defeat"; winner = 1; }
      else if (!p1Alive) { newPhase = "victory"; winner = 0; }
      if (prev.baseHealth[0] <= 0) { newPhase = "defeat"; winner = 1; }
      if (prev.baseHealth[1] <= 0) { newPhase = "victory"; winner = 0; }

      return {
        ...prev,
        players: playersAfter,
        activePlayerId: nextPlayer,
        cardLockActive: false,
        globalMana: mana,
        currentTurn: nextPlayer === 0 ? prev.currentTurn + 1 : prev.currentTurn,
        selectedIcon: undefined,
        targetingMode: undefined,
        movementStack: {},
        phase: newPhase,
        winner,
      };
    });
  }, []);

  turnNum = prev.currentTurn + 1;

  // after boundary, choose first living icon from 0
  nextIdx = 0;
  guard = 0;
  while (guard++ < len) {
    const id = normalizedQueue[nextIdx];
    const ic = playersAfter.flatMap((p) => p.icons).find((x) => x.id === id);
    if (ic?.isAlive) break;
    nextIdx = (nextIdx + 1) % len;
  }
}

const nextActiveId = normalizedQueue[nextIdx];

// victory conditions
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
  speedQueue: normalizedQueue,
  globalMana: mana,
  queueIndex: nextIdx,
  activeIconId: nextActiveId,
  currentTurn: turnNum,
  selectedIcon: undefined,
  targetingMode: undefined,
  phase: newPhase,
  winner,
};
    });
  }, []);

// Keep these for UI
const selectIcon = useCallback((iconId: string) => {
  setGameState((prev) => ({ ...prev, selectedIcon: iconId }));
}, []);

const respawnCharacter = useCallback((iconId: string, coordinates: Coordinates) => {
  setGameState((prev) => {
    const icon = prev.players.flatMap((p) => p.icons).find((i) => i.id === iconId);
    if (!icon || icon.isAlive || icon.respawnTurns > 0) return prev;

    const tile = prev.board.find((t) => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
    if (!tile || tile.terrain.type !== "spawn") return prev;

    const occupied = prev.players.flatMap((p) => p.icons).some((i) => i.isAlive && i.position.q === coordinates.q && i.position.r === coordinates.r);
    if (occupied) return prev;

    return {
      ...prev,
      players: prev.players.map((p) => ({
        ...p,
        icons: p.icons.map((i) =>
          i.id === iconId
            ? { ...i, isAlive: true, position: coordinates, stats: { ...i.stats, hp: i.stats.maxHp, movement: 0 }, respawnTurns: 0 }
            : i
        ),
      })),
    };
  });
}, []);

/* =========================
   Undo movement — last step only
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
            movedThisTurn: stack.length > 0,
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

    const me = prev.players.flatMap((p) => p.icons).find((i) => i.id === prev.activeIconId);
    if (me?.playerId !== icon.playerId) {
      toast.error("You can only respawn on your turn!");
      return prev;
    }
    return { ...prev, respawnPlacement: iconId };
  });
}, []);

const toggleMenu = useCallback(() => {
  setGameState((prev) => ({ ...prev, menuOpen: !prev.menuOpen }));
}, []);

const goToMainMenu = useCallback(() => {
  setGameState((prev) => ({ ...prev, menuOpen: false, phase: "menu" as any }));
}, []);

const resetGame = useCallback(() => {
  setGameState(() => {
    const initialIcons = createInitialIcons();
    const speedQueueRaw = initSpeedQueue(initialIcons);
    const speedQueue = normalizeSpeedQueue(speedQueueRaw, initialIcons);
    return {
      currentTurn: 1,
      activeIconId: speedQueue[0] ?? initialIcons[0].id,
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
      teamBuffs: { mightBonus: [0, 0], powerBonus: [0, 0], homeBaseBonus: [0, 0] },
      baseHealth: [5, 5],
      matchTimer: 600,
      gameMode,
      movementStack: {},
      menuOpen: false,
      combatLog: [],
    } as ExtState;
  });
}, [gameMode]);

// Cancel targeting helper
const cancelTargeting = useCallback(() => {
  setGameState(prev =>
    prev.targetingMode ? { ...prev, targetingMode: undefined } : prev
  );
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
  undoMovement,
  startRespawnPlacement,
  toggleMenu,
  goToMainMenu,
  resetGame,
  cancelTargeting,
};
};

export default useGameState;










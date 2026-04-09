import { useState, useCallback, useEffect, useRef } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType, Card, Hand, Deck, AIIntent, Debuff, Zone } from "@/types/game";
import type { CharacterRunState, EncounterDef, FightObjective, EnemyAbilityDef } from "@/types/roguelike";
import { buildDeckForTeam, drawCards, buildDeckFromIds, CARD_DEFS, instantiateCard } from "@/data/cards";
import { toast } from "sonner";
import { getT } from "@/i18n";
import { seededRng as rngFromSeed } from "@/utils/rng";

// TURN/COMBAT HELPERS (external)
import {
  initSpeedQueue,
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

/**
 * Given a caster origin and a target hex, determine the axial hex-line direction
 * and return all hexes on that line up to `range` steps from origin.
 * Returns null if the target is not aligned to any of the 6 axial directions.
 */
function getLineHexes(from: Qr, to: Qr, range: number): Qr[] | null {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  if (dq === 0 && dr === 0) return null;

  let uq: number, ur: number;
  if (dr === 0 && dq !== 0)          { uq = dq > 0 ? 1 : -1; ur = 0; }
  else if (dq === 0 && dr !== 0)     { uq = 0; ur = dr > 0 ? 1 : -1; }
  else if (dq + dr === 0)            { uq = dq > 0 ? 1 : -1; ur = dr > 0 ? 1 : -1; }
  else return null; // not on a hex axis

  const hexes: Qr[] = [];
  for (let i = 1; i <= range; i++) hexes.push({ q: from.q + i * uq, r: from.r + i * ur });
  return hexes;
}

/** Snap any hex offset to the nearest axial direction and return the line hexes. */
function snapToLineHexes(from: Qr, to: Qr, range: number): Qr[] {
  const exact = getLineHexes(from, to, range);
  if (exact) return exact;
  // Snap: find the axial direction that minimizes angle to (dq, dr)
  const dirs: Qr[] = [
    { q: 1, r: 0 }, { q: -1, r: 0 },
    { q: 0, r: 1 }, { q: 0, r: -1 },
    { q: 1, r: -1 }, { q: -1, r: 1 },
  ];
  const dq = to.q - from.q, dr = to.r - from.r;
  // dot-product proxy: pick direction with highest (dq*uq + dr*ur)
  const best = dirs.reduce((b, d) => (dq * d.q + dr * d.r) > (dq * b.q + dr * b.r) ? d : b);
  const hexes: Qr[] = [];
  for (let i = 1; i <= range; i++) hexes.push({ q: from.q + i * best.q, r: from.r + i * best.r });
  return hexes;
}

/**
 * Returns true if there is a mountain tile strictly between `from` and `to`
 * on the same axial hex line (dq=0, dr=0, or dq+dr=0).
 * Returns false if they are not on the same axial line.
 */
function hasLineMountain(board: HexTile[], from: Qr, to: Qr): boolean {
  const dq = to.q - from.q, dr = to.r - from.r;
  if (dq === 0 && dr === 0) return false;
  let uq: number, ur: number;
  if (dr === 0 && dq !== 0)      { uq = dq > 0 ? 1 : -1; ur = 0; }
  else if (dq === 0 && dr !== 0) { uq = 0; ur = dr > 0 ? 1 : -1; }
  else if (dq + dr === 0)        { uq = dq > 0 ? 1 : -1; ur = dr > 0 ? 1 : -1; }
  else return false; // not on a hex axial line — no blocking
  const steps = Math.max(Math.abs(dq), Math.abs(dr));
  for (let i = 1; i < steps; i++) {
    const hq = from.q + i * uq, hr = from.r + i * ur;
    const tile = board.find(t => t.coordinates.q === hq && t.coordinates.r === hr);
    if (tile?.terrain.type === 'mountain') return true;
  }
  return false;
}

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

function movementCostForTile(tile: HexTile, allowRiver?: boolean): number {
  if (tile.terrain.effects.movementModifier === -999) {
    if (allowRiver && tile.terrain.type === 'river') return 1; // Turtle Ship
    return Infinity;
  }
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
  occupiedKeys: Set<string>,
  allowRiver?: boolean,
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
      const step = movementCostForTile(nbTile, allowRiver);
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
  // Mountains — pushed to flanks and outer edges (distance ≥ 4 from center)
  const mtn = new Set([
    // Near-center boulders for variety (distance 4)
    '-1,-3','1,3',
    // Flank clusters (distance 4)
    '-4,2','-4,3','4,-2','4,-3',
    '-5,1','-5,2','5,-1','5,-2',
    // Top/bottom edge caps
    '0,-6','-1,-6','1,-6','0,6','1,6','-1,6',
    // Side edge caps
    '-6,2','-6,3','6,-2','6,-3',
    // Diagonal edge corners
    '2,-5','3,-5','-2,5','-3,5',
    // Far edges
    '-7,2','-7,3','-7,4','7,-2','7,-3','7,-4',
    // Scatter (distance 5+)
    '-5,-1','5,1',
    '-1,-5','1,5',
    '-4,-1','4,1',
  ]);
  const key = `${q},${r}`;
  if (mtn.has(key))
    return { type: "mountain", effects: { rangeBonus: true, blocksLineOfSight: true, movementModifier: -999 } };

  // Rivers — middle ring (distance 3) + 2 scenic center tiles
  // Removed (2,-2),(2,-1),(-2,2),(-2,1) — distance-2 tiles that blocked main center corridors
  const river = new Set([
    '1,-3','3,-2',          // right-side (distance 3)
    '-1,3','-3,2',          // left-side (distance 3)
    '-1,-2','-2,-1',        // upper-left trickle (distance 3)
    '1,2','2,1',            // lower-right trickle (distance 3)
    '0,-2','0,2',           // scenic water above/below crystal (non-blocking)
  ]);
  if (river.has(key))
    return { type: "river", effects: { movementModifier: -999 } as any };

  // Forest — traversable cover throughout center
  const forest = new Set([
    '-4,0','-3,0','-4,1','-3,1','-5,0','-5,1', // left-center cluster
    '4,0','3,0','4,-1','3,-1','5,0','5,-1',      // right-center cluster
    '-1,-1','-1,-2','-2,-2',                      // upper-center patch
    '1,1','1,2','2,2',                            // lower-center patch
    '-1,1','-2,1','-2,0',                         // left of crystal
    '1,-1','2,-1','2,0',                          // right of crystal
  ]);
  if (forest.has(key))
    return { type: "forest", effects: { dodgeBonus: true, stealthBonus: true } };

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

// ── Random map generator ──────────────────────────────────────────────────────

function getRandomTerrainForPosition(q: number, r: number, forestSet: Set<string>, riverSet: Set<string>, mountainSet: Set<string>): TerrainType {
  const key = `${q},${r}`;
  if (q === 0 && r === 0)              return { type: "mana_crystal", effects: { movementModifier: -999 } };
  if ((q === -6 && r === 5) || (q === 6 && r === -5)) return { type: "base", effects: { movementModifier: -999 } };
  if ((q >= -6 && q <= -4 && r >= 3 && r <= 5) || (q >= 4 && q <= 6 && r >= -5 && r <= -3))
    return { type: "spawn", effects: {} };
  if (mountainSet.has(key)) return { type: "mountain", effects: { rangeBonus: true, blocksLineOfSight: true, movementModifier: -999 } };
  if (riverSet.has(key)) return { type: "river", effects: { movementModifier: -999 } as any };
  if (forestSet.has(key)) return { type: "forest", effects: { dodgeBonus: true, stealthBonus: true } };
  return { type: "plain", effects: {} };
}

function generateRandomBattleBoard(seed: number): HexTile[] {
  const rng = rngFromSeed(seed);
  const FOREST_PATTERNS: [number,number][][] = [
    [[0,0],[1,0],[0,1],[1,-1]], [[0,0],[0,1],[1,-1],[-1,1]],
    [[0,0],[1,0],[1,-1],[0,-1]], [[0,0],[-1,1],[0,1],[1,0]],
    [[0,0],[1,0],[0,1]], [[0,0],[-1,1],[0,-1]],
  ];
  const FOREST_ANCHORS: {q:number,r:number}[] = [
    {q:-3,r:1},{q:-2,r:1},{q:-3,r:2},{q:3,r:-1},{q:2,r:-1},{q:3,r:-2},
    {q:-1,r:-2},{q:0,r:-2},{q:1,r:-2},{q:-1,r:2},{q:0,r:2},{q:1,r:2},
    {q:-4,r:1},{q:4,r:-1},{q:-1,r:3},{q:1,r:-3},{q:-2,r:-1},{q:2,r:1},
    {q:-3,r:0},{q:3,r:0},{q:0,r:3},{q:0,r:-3},
  ];
  const RIVER_OPTIONS: {q:number,r:number}[][] = [
    // Replaced center-zone river options (distance ≤ 2) with distance-3+ options
    [{q:2,r:-3},{q:1,r:-3}],[{q:-2,r:3},{q:-1,r:3}],
    [{q:3,r:-3},{q:3,r:-2}],[{q:-3,r:3},{q:-3,r:2}],
    [{q:-2,r:-1},{q:-3,r:-1}],[{q:2,r:1},{q:3,r:1}],
    [{q:-1,r:-2},{q:0,r:-3}],[{q:1,r:2},{q:0,r:3}],
  ];

  const numClusters = 6 + Math.floor(rng() * 4); // 6–9 forest clusters
  const shuffledAnchors = [...FOREST_ANCHORS].sort(() => rng() - 0.5);
  const forestSet = new Set<string>();
  for (let c = 0; c < numClusters && c < shuffledAnchors.length; c++) {
    const a = shuffledAnchors[c];
    const pat = FOREST_PATTERNS[Math.floor(rng() * FOREST_PATTERNS.length)];
    for (const [dq, dr] of pat) {
      const fq = a.q + dq, fr = a.r + dr;
      forestSet.add(`${fq},${fr}`);
    }
  }

  const numRivers = 4 + Math.floor(rng() * 4); // 4–7 river segments
  const shuffledRivers = [...RIVER_OPTIONS].sort(() => rng() - 0.5);
  const riverSet = new Set<string>();
  for (let rv = 0; rv < numRivers; rv++) {
    for (const pos of shuffledRivers[rv]) riverSet.add(`${pos.q},${pos.r}`);
  }

  // Mountain clusters — pushed to flanks (distance ≥ 4 from center)
  const MOUNTAIN_ANCHORS: {q:number,r:number}[] = [
    {q:4,r:-1},{q:-4,r:1},{q:4,r:-2},{q:-4,r:2},
    {q:2,r:2},{q:-2,r:-2},{q:2,r:-4},{q:-2,r:4},
    {q:4,r:-3},{q:-4,r:3},{q:5,r:-2},{q:-5,r:2},
    {q:3,r:-4},{q:-3,r:4},{q:1,r:-4},{q:-1,r:4},
    {q:0,r:-4},{q:0,r:4},
  ];
  const MOUNTAIN_PATTERNS: [number,number][][] = [
    [[0,0]],                     // single boulder
    [[0,0],[1,0]],               // 2-hex row
    [[0,0],[0,1]],               // 2-hex col
    [[0,0],[1,-1]],              // 2-hex diagonal
    [[0,0],[1,0],[0,1]],         // 3-hex L
  ];
  const numMountains = 7 + Math.floor(rng() * 4); // 7–10 clusters (more since no border ring)
  const shuffledMtnAnchors = [...MOUNTAIN_ANCHORS].sort(() => rng() - 0.5);
  const mountainSet = new Set<string>();
  for (let m = 0; m < numMountains && m < shuffledMtnAnchors.length; m++) {
    const a = shuffledMtnAnchors[m];
    const pat = MOUNTAIN_PATTERNS[Math.floor(rng() * MOUNTAIN_PATTERNS.length)];
    for (const [dq, dr] of pat) {
      const hq = a.q + dq, hr = a.r + dr;
      // Don't place on crystal, bases, or spawn zones
      const onCrystal = hq === 0 && hr === 0;
      const onBase = (hq === -6 && hr === 5) || (hq === 6 && hr === -5);
      const onSpawn = (hq >= -6 && hq <= -4 && hr >= 3 && hr <= 5) || (hq >= 4 && hq <= 6 && hr >= -5 && hr <= -3);
      if (!onCrystal && !onBase && !onSpawn) mountainSet.add(`${hq},${hr}`);
    }
  }

  const board: HexTile[] = [];
  for (let q = -7; q <= 7; q++) {
    const r1 = Math.max(-7, -q - 7);
    const r2 = Math.min(7, -q + 7);
    for (let r = r1; r <= r2; r++) {
      board.push({ coordinates: { q, r }, terrain: getRandomTerrainForPosition(q, r, forestSet, riverSet, mountainSet), highlighted: false, selectable: false });
    }
  }
  return board;
}

// ── Enemy icon builder from encounter ────────────────────────────────────────

function buildEnemyIconsFromEncounter(encounter: EncounterDef, scaleFactor = 1.0): Icon[] {
  const p2Spawns = [
    { q: 4, r: -3 }, { q: 5, r: -3 }, { q: 4, r: -4 },
    { q: 5, r: -4 }, { q: 6, r: -3 }, { q: 6, r: -4 },
    { q: 4, r: -5 }, { q: 5, r: -5 },
  ];
  const icons: Icon[] = [];
  let spawnIdx = 0;
  // Count how many times each template name appears so we can assign unique letters globally
  const nameCount: Record<string, number> = {};
  for (const t of encounter.enemies) nameCount[t.name] = (nameCount[t.name] ?? 0) + t.count;
  const nameIdx: Record<string, number> = {};
  for (const template of encounter.enemies) {
    for (let c = 0; c < template.count && spawnIdx < p2Spawns.length; c++, spawnIdx++) {
      nameIdx[template.name] = (nameIdx[template.name] ?? 0);
      const label = nameCount[template.name] > 1 ? ` ${String.fromCharCode(65 + nameIdx[template.name]++)}` : '';
      const sc = (v: number) => Math.round(v * scaleFactor);
      icons.push({
        id: `1-${template.id}-${spawnIdx}`,
        name: `${template.name}${label}`,
        role: template.ai === 'ranged' ? 'dps_ranged' : template.ai === 'defensive' ? 'tank' : 'dps_melee',
        stats: {
          hp: sc(template.stats.hp), maxHp: sc(template.stats.maxHp),
          moveRange: template.stats.moveRange, speed: 6,
          might: sc(template.stats.might), power: sc(template.stats.power),
          defense: sc(template.stats.defense),
          movement: template.stats.moveRange,
          mana: 0, maxMana: 0,
        },
        abilities: [],
        passive: '',
        position: p2Spawns[spawnIdx],
        playerId: 1, isAlive: true, respawnTurns: 0,
        cardUsedThisTurn: false, movedThisTurn: false,
        hasUltimate: false, ultimateUsed: false,
        hasRespawned: false, justRespawned: false,
        enemyAbilities: (template.abilities ?? []) as EnemyAbilityDef[],
        enemyAbilityCooldowns: {},
        portrait: template.portrait,
        enemyDescription: template.description,
      });
    }
  }
  return icons;
}

const createInitialIcons = (): Icon[] => {
  const iconTemplates = [
    {
      name: "Napoleon-chan",
      role: "dps_ranged" as const,
      stats: { hp: 100, maxHp: 100, moveRange: 2, speed: 6, might: 70, power: 60, defense: 15, movement: 2 },
      abilities: [
        { id: "1", name: "Artillery Barrage", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Deals 48 damage.", damage: 0 },
        { id: "2", name: "Grande Armée", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "Summons phantom soldiers. +20% damage to all allies for 3 turns.", damage: 0 },
        { id: "ultimate", name: "Final Salvo", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Deal 30 damage in a 3-tile line", damage: 0 },
      ],
      passive: "Tactical Genius: +1 movement range when commanding from high ground",
    },
    {
      name: "Genghis-chan",
      role: "dps_melee" as const,
      stats: { hp: 120, maxHp: 120, moveRange: 2, speed: 8, might: 50, power: 40, defense: 25, movement: 2 },
      abilities: [
        { id: "1", name: "Mongol Charge", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "48 damage at range 3 + Bleed (16 HP/turn, 2 turns).", damage: 0, powerMult: 1.2, bleedMult: 0.4 },
        { id: "2", name: "Horde Tactics", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "20 dmg per enemy × enemy count to ALL in range 2.", damage: 0, scalingAoE: true, perEnemyMult: 0.5 },
        { id: "ultimate", name: "Rider's Fury", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 5, description: "ULTIMATE: 40 damage on a line. Doubled if target <50% HP.", damage: 0, powerMult: 1.0, executeDouble: true },
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
          manaCost: 2,
          cooldown: 0,
          currentCooldown: 0,
          range: 4,
          description: "Teleport to any hex + gain aerial view for 2 turns.",
          damage: 0,
          targetMode: "hex" as any, // NEW: hex-target ability
        },
        { id: "2", name: "Masterpiece", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "Heals 45 HP + shields allies from next attack.", healing: 45 },
        { id: "ultimate", name: "Vitruvian Guardian", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons a 2-turn drone that auto-attacks nearby enemies", damage: 0 },
      ],
      passive: "Renaissance Mind: Gains +1 mana when casting spells near mana crystals",
    },
    {
      name: "Huang-chan",
      role: "controller" as const,
      stats: { hp: 90, maxHp: 90, moveRange: 2, speed: 5, might: 30, power: 55, defense: 25, movement: 2 },
      abilities: [
        { id: "1", name: "Terracotta Legion", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "Summon a random Terracotta Warrior (Archer: range 2 — or Melee: range 1) on a target hex. Lasts 2 turns.", damage: 0, summonTerracotta: true },
        { id: "2", name: "First Emperor's Command", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 1, description: "Summon a Terracotta Cavalry (scales with your stats) adjacent to you. Lasts 2 turns. Gain free Cavalry Charge card in hand.", damage: 0, summonCavalry: true },
        { id: "ultimate", name: "Eternal Army", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Control a non-boss enemy for 2 turns.", damage: 0, controlEnemy: true, controlDuration: 2 },
      ],
      passive: "Imperial Command: Cannot play Basic Attack cards. Guaranteed 1 Basic Attack card drawn each turn (for Terracotta units). Terracotta units may only use Basic Attacks.",
    },
  ];

  const icons: Icon[] = [];
  const p1 = [{ q: -4, r: 3 }, { q: -5, r: 3 }, { q: -4, r: 4 }, { q: -5, r: 4 }];
  const p2 = [{ q: 4, r: -3 }, { q: 5, r: -3 }, { q: 4, r: -4 }, { q: 5, r: -4 }];

  for (let pid = 0; pid < 2; pid++) {
    iconTemplates.forEach((t, i) => {
      const spawns = pid === 0 ? p1 : p2;
      icons.push({
        id: `${pid}-${i}`,
        ...t,
        stats: { ...t.stats, mana: 3, maxMana: 3 },
        position: spawns[i],
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
  hands: [Hand, Hand];
  decks: [Deck, Deck];
  cardTargetingMode?: { card: Card; executorId: string };
  encounterObjective: FightObjective;
  survivalTurnsTarget: number;  // 0 if not survive
  spawnInterval: number;        // 0 if not onslaught
  isRoguelikeRun: boolean;
  arenaEvent?: import('@/types/game').ArenaEventDef | null;
  phaseBanner?: { enemyName: string; abilityName: string; icon: string } | null;
};

/** Remove `card` from `playerId`'s hand and put it in discard (no mid-turn replacement draw). */
function consumeCardFromHand(state: ExtState, card: Card, playerId: number): ExtState {
  const pid = playerId as 0 | 1;
  const isUltimate = card.type === "ultimate";
  const hand = { ...state.hands[pid], cards: state.hands[pid].cards.filter(c => c.id !== card.id) };
  // Ultimates are exhausted (removed from game), non-ultimates go to discard
  const deck = isUltimate
    ? { ...state.decks[pid] }
    : { ...state.decks[pid], discardPile: [...state.decks[pid].discardPile, card] };

  const hands: [Hand, Hand] = [state.hands[0], state.hands[1]];
  const decks: [Deck, Deck] = [state.decks[0], state.decks[1]];
  hands[pid] = hand;
  decks[pid] = deck;
  return { ...state, hands, decks };
}
function buildIconsFromSelection(selected: any[], runChars?: CharacterRunState[]): Icon[] {
  const p1Spawns = [
    { q: -4, r: 3 }, { q: -5, r: 3 }, { q: -4, r: 4 },
    { q: -5, r: 4 }, { q: -6, r: 3 }, { q: -6, r: 4 },
    { q: -4, r: 5 }, { q: -5, r: 5 },
  ];
  const p2Spawns = [
    { q: 4, r: -3 }, { q: 5, r: -3 }, { q: 4, r: -4 },
    { q: 5, r: -4 }, { q: 6, r: -3 }, { q: 6, r: -4 },
    { q: 4, r: -5 }, { q: 5, r: -5 },
  ];

  const toIcon = (template: any, pid: number, idx: number): Icon => {
    // Apply roguelike run state overrides for player 0 only (AI always starts fresh)
    const runChar = pid === 0 ? runChars?.find((c) => c.id === template.id) : undefined;
    const statBonus = runChar?.statBonuses ?? { hp: 0, might: 0, power: 0, defense: 0 };
    // Sum item stat bonuses (Iron Gauntlets +8 Might, Vitality Shard +25 HP, etc.)
    const itemBonus = runChar?.items?.reduce((acc, item) => {
      if (!item?.statBonus) return acc;
      return {
        hp:      acc.hp      + (item.statBonus.hp      ?? 0),
        might:   acc.might   + (item.statBonus.might   ?? 0),
        power:   acc.power   + (item.statBonus.power   ?? 0),
        defense: acc.defense + (item.statBonus.defense ?? 0),
      };
    }, { hp: 0, might: 0, power: 0, defense: 0 }) ?? { hp: 0, might: 0, power: 0, defense: 0 };
    // Collect all passive tags from equipped items
    const itemPassiveTags = runChar?.items
      ?.filter(Boolean)
      .map(item => item!.passiveTag)
      .filter((t): t is string => !!t) ?? [];
    // move_plus_1: add +1 to base movement range
    const movePlusOne = itemPassiveTags.includes('move_plus_1') ? 1 : 0;
    const baseDefense = template.role === "support" ? 20 : template.role === "dps_melee" ? 25 : template.role === "tank" ? 35 : template.role === "controller" ? 25 : 15;
    const maxHpWithItems = (runChar ? runChar.maxHp : template.stats.hp) + itemBonus.hp;
    // If character was at full HP before the item, scale up currentHp too (item heals to new max)
    const baseHp = runChar
      ? (runChar.currentHp >= runChar.maxHp ? maxHpWithItems : runChar.currentHp)
      : template.stats.hp;
    const maxHp = maxHpWithItems;

    return {
      id: `${pid}-${idx}`,
      name: template.name,
      role: template.role,
      stats: {
        hp:        baseHp,
        maxHp:     maxHp,
        moveRange: (template.role === "tank" || template.role === "controller" ? 2 : 3) + movePlusOne,
        speed:     template.role === "dps_melee" ? 8 : template.role === "dps_ranged" ? 6 : template.role === "tank" ? 3 : 4,
        might:     template.stats.might + (statBonus.might ?? 0) + itemBonus.might,
        power:     (template.stats.power ?? 50) + (statBonus.power ?? 0) + itemBonus.power,
        defense:   baseDefense + (statBonus.defense ?? 0) + itemBonus.defense,
        movement:  (template.role === "tank" || template.role === "controller" ? 2 : 3) + movePlusOne,
        mana: 3,
        maxMana: 3,
      },
      abilities: getAbilitiesForCharacter(template.name),
      passive:   getPassiveForCharacter(template.name),
      position:  (pid === 0 ? p1Spawns : p2Spawns)[idx],
      playerId:  pid,
      isAlive:   true,
      respawnTurns: 0,
      cardUsedThisTurn: false,
      movedThisTurn:    false,
      hasUltimate:      true,
      ultimateUsed:     false,
      hasRespawned:     false,
      justRespawned:    false,
      itemPassiveTags:  itemPassiveTags.length > 0 ? itemPassiveTags : undefined,
      voidArmorUsed:    false,
      firstHitNegated:  false,
      firstAbilityUsed: false,
    };
  };

  const icons: Icon[] = [];
  selected.forEach((char, i) => {
    icons.push(toIcon(char, 0, i));
    icons.push(toIcon(char, 1, i));
  });
  return icons;
}

function getAbilitiesForCharacter(name: string) {
  if (name.includes("Napoleon")) return [
    { id: "1", name: "Artillery Barrage", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Power×1.4 damage.", damage: 0, powerMult: 1.4 },
    { id: "2", name: "Grande Armée", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "+20% Might & Power to all allies for 2 turns.", damage: 0 },
    { id: "ultimate", name: "Final Salvo", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 4, description: "ULTIMATE: 3 hits of Power×0.7 on random enemies", damage: 0, powerMult: 0.7 },
  ];
  if (name.includes("Genghis")) return [
    { id: "1", name: "Mongol Charge", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "Rush attack. Power×1.2 damage + Bleed (Power×0.4/turn, 2 turns).", damage: 0, powerMult: 1.2, bleedMult: 0.4 },
    { id: "2", name: "Horde Tactics", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "Power×0.5 per enemy in range 2 to ALL enemies in range 2.", damage: 0, scalingAoE: true, perEnemyMult: 0.5 },
    { id: "ultimate", name: "Rider's Fury", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 5, description: "ULTIMATE: Power×1 to all enemies in a line. Doubled if target <50% HP.", damage: 0, powerMult: 1.0, executeDouble: true },
  ];
  if (name.includes("Da Vinci")) return [
    { id: "1", name: "Flying Machine", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 999, description: "Teleport to any hex (unlimited range).", damage: 0, targetMode: "hex" as any },
    { id: "2", name: "Masterpiece", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Heals 45 HP to an ally.", healing: 45 },
    { id: "ultimate", name: "Vitruvian Guardian", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons attack drone", damage: 0 },
  ];
  if (name.includes("Leonidas")) return [
    { id: "1", name: "Shield Bash", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 1, description: "Power×1.5 damage + Armor Break.", damage: 0, powerMult: 1.5 },
    { id: "2", name: "Spartan Wall", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "+20 Defense to all nearby allies.", damage: 0, teamDefBuff: 20 },
    { id: "ultimate", name: "THIS IS SPARTA!", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Power×2 damage + Demoralize nearby.", damage: 0, powerMult: 2.0 },
  ];
  if (name.includes("Beethoven")) return [
    { id: "1", name: "Schallwelle",  manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "Sonic wave — Power×0.5 dmg on a line, pushes each enemy 2 tiles back.", damage: 0, powerMult: 0.5 },
    { id: "2", name: "Freudenspur", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 1, description: "Place resonance zone (7 tiles). Allies on zone gain +2 Movement at turn start. Lasts 2 turns.", damage: 0 },
    { id: "ultimate", name: "Götterfunken", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Stun all enemies within range 3 for 1 turn.", damage: 0 },
  ];
  if (name.includes("Sun-sin")) return [
    { id: "1", name: "Hwajeon / Ramming Speed", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "Land: Power×1.2 at range 3, Poison. Water: Might×2.0 range 1.", damage: 0, powerMult: 1.2 },
    { id: "2", name: "Naval Command / Broadside", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Land: +15% Might/Power to all allies. Water: Power×0.7 AoE range 3.", damage: 0 },
    { id: "ultimate", name: "Chongtong Barrage", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 5, description: "ULTIMATE: Land: charge 3 hexes. Water: Power×2.5 target + Power×1.2 adjacents.", damage: 0, powerMult: 2.5 },
  ];
  if (name.includes("Huang")) return [
    { id: "1", name: "Terracotta Legion", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "Summon Terracotta Archer (Might×1.5, Def×1) or Warrior (Might×1, Def×1) on target hex. HP 40, Power 0. Lasts 1 turn.", damage: 0, summonTerracotta: true },
    { id: "2", name: "First Emperor's Command", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 1, description: "Summon Terracotta Cavalry (Might×1.5, Def×1.5, Power×1) adjacent to you. HP 60, Move 3. Lasts 2 turns. Gain free Cavalry Charge.", damage: 0, summonCavalry: true },
    { id: "ultimate", name: "Eternal Army", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Control a non-boss enemy for 2 turns.", damage: 0, controlEnemy: true, controlDuration: 2 },
  ];
  // fallback (shouldn't be reached)
  return [
    { id: "1", name: "Flying Machine", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 999, description: "Teleport to any hex (unlimited range).", damage: 0, targetMode: "hex" as any },
    { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 3, description: "Heals 45 HP to an ally.", healing: 45 },
    { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons attack drone", damage: 0 },
  ];
}

function getPassiveForCharacter(name: string) {
  if (name.includes("Napoleon")) return "Vantage Point: On a forest tile, basic attack range becomes 3";
  if (name.includes("Genghis")) return "Bloodlust: Each kill grants +15 Might and restores 1 Mana (up to 3×)";
  if (name.includes("Da Vinci")) return "Tinkerer: Draw +1 card at turn start if no exclusive ability was used last turn";
  if (name.includes("Leonidas")) return "Phalanx: Each turn adjacent to an ally, gain +8 Defense (stacks up to 3 turns)";
  if (name.includes("Sun-sin")) return "Turtle Ship: Can enter water tiles. On water: +40% Might, +30% DEF, −40% Power, Move 1, Range 3";
  if (name.includes("Beethoven")) return "Taubheit: Cannot be pushed or displaced while playing an ability card";
  if (name.includes("Huang"))    return "Imperial Command: Cannot play Basic Attack cards. Guaranteed at least 1 Basic Attack card is drawn each turn (for Terracotta units to use). Terracotta units may only use Basic Attack cards.";
  return "";
}

/* =========================
   AI helpers
   ========================= */

/** Simple buff/utility actions the AI can combine with its main attack. */
/** Beast camp coordinates */
const BEAST_CAMPS: Qr[] = [{ q: 0, r: -4 }, { q: 0, r: 4 }];

/** Compute what each alive AI icon intends to do (shown during player's turn).
 *  Each character may push 1 buff intent + 1 attack/ability intent (max 2 per icon). */
function computeAIIntents(state: ExtState): AIIntent[] {
  const intents: AIIntent[] = [];
  const enemies = state.players[0].icons.filter(i => i.isAlive);

  for (const ai of state.players[1].icons.filter(i => i.isAlive)) {
    const basicRange = ai.name.includes("Napoleon") || ai.name.includes("Da Vinci") ? 2 : 1;
    let mainIntentSet = false;

    // --- 1. Try a damaging ability ---
    for (const ab of (ai.abilities as any[])) {
      if (ab.id === "ultimate" && ai.ultimateUsed) continue;
      const isPowerMult = ab.powerMult !== undefined;
      const isDmg  = (typeof ab.damage === "number" && ab.damage > 0) || isPowerMult;
      const isHeal = typeof ab.healing === "number" && ab.healing > 0;

      if (isDmg && enemies.some(e => hexDistance(ai.position, e.position) <= ab.range)) {
        const nearestEnemy = enemies.find(e => hexDistance(ai.position, e.position) <= ab.range)!;
        const atkStats = calcEffectiveStats(state, ai);
        const estDmg = isPowerMult
          ? Math.floor(atkStats.power * ab.powerMult)
          : ab.damage;
        intents.push({ iconId: ai.id, type: 'ability', abilityName: ab.name,
          label: String(Math.round(estDmg)), damage: estDmg, range: ab.range });
        mainIntentSet = true;
        break;
      } else if (isHeal) {
        const needsHeal = state.players[1].icons.filter(
          ic => ic.isAlive && hexDistance(ai.position, ic.position) <= ab.range && ic.stats.hp < ic.stats.maxHp * 0.75
        );
        if (needsHeal.length > 0) {
          intents.push({ iconId: ai.id, type: 'heal', abilityName: ab.name,
            label: `+${ab.healing}`, healing: ab.healing, range: ab.range });
          mainIntentSet = true;
          break;
        }
      }
    }

    // --- 2. Basic attack if no ability ---
    if (!mainIntentSet) {
      const inRange = enemies.find(e =>
        hexDistance(ai.position, e.position) <= basicRange &&
        !hasLineMountain(state.board, ai.position, e.position)
      );
      if (inRange) {
        const atkStats = calcEffectiveStats(state, ai);
        const dmg = Math.floor(atkStats.might);
        intents.push({ iconId: ai.id, type: 'attack', abilityName: 'Basic Attack',
          label: String(dmg), damage: dmg, range: basicRange });
        mainIntentSet = true;
      }
    }

    // --- 3. Player base attack if no enemies in range (beast camps are allied — AI ignores them) ---
    if (!mainIntentSet) {
      const playerBase: Qr = { q: -6, r: 5 };
      if (hexDistance(ai.position, playerBase) <= basicRange && state.baseHealth[0] > 0) {
        const dmg = Math.max(1, ai.stats.might);
        intents.push({ iconId: ai.id, type: 'attack', abilityName: 'Attack Base',
          label: String(Math.round(dmg)), damage: dmg, range: basicRange });
        mainIntentSet = true;
      }
    }

    // --- 4. Show upcoming ability countdowns (abilities on cooldown) ---
    const cooldowns = ai.enemyAbilityCooldowns ?? {};
    for (const ab of (ai.abilities as any[])) {
      const cd = cooldowns[ab.id] ?? 0;
      if (cd > 0) {
        intents.push({
          iconId: ai.id,
          type: 'upcoming_ability',
          abilityName: ab.name,
          label: String(cd),
          range: ab.range ?? ab.effect?.range ?? 2,
          turnsUntilReady: cd,
        });
      }
    }
  }
  return intents;
}

/** Execute enemy boss/elite abilities for one AI icon at the start of its turn. */
function executeEnemyAbilities(s: ExtState, aiId: string): ExtState {
  const ai = s.players[1].icons.find(i => i.id === aiId);
  if (!ai || !ai.isAlive) return s;

  const abilities = (ai.enemyAbilities ?? []) as EnemyAbilityDef[];
  if (!abilities.length) return s;

  const playerIcons = () => s.players[0].icons.filter(i => i.isAlive);
  const cooldowns = ai.enemyAbilityCooldowns ?? {};
  let abilitiesUsed = 0;
  const MAX_ABILITIES_PER_TURN = 2;

  for (const ab of abilities) {
    if (abilitiesUsed >= MAX_ABILITIES_PER_TURN) break;

    // Check cooldown
    if ((cooldowns[ab.id] ?? 0) > 0) continue;

    // Check trigger condition
    if (ab.triggerCondition === 'low_hp') {
      const hpPct = ai.stats.hp / ai.stats.maxHp;
      if (hpPct > (ab.hpThreshold ?? 0.5)) continue;
    }

    // Check if there are valid targets
    const hasTargets = playerIcons().length > 0;
    if (!hasTargets) continue;

    const effect = ab.effect;

    if (effect.type === 'buff_self') {
      s = {
        ...s,
        players: s.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => {
            if (ic.id !== aiId) return ic;
            return {
              ...ic,
              cardBuffAtk: (ic.cardBuffAtk ?? 0) + (effect.mightBonus ?? 0),
              cardBuffDef: (ic.cardBuffDef ?? 0) + (effect.defenseBonus ?? 0),
            };
          }),
        })),
      };
      pushLog(s, `${ai.name} used ${ab.name}!`, 1);
      abilitiesUsed++;
    } else if (effect.type === 'heal_self') {
      const currentAi = s.players[1].icons.find(i => i.id === aiId)!;
      const newHp = Math.min(currentAi.stats.maxHp, currentAi.stats.hp + (effect.amount ?? 0));
      s = {
        ...s,
        players: s.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== aiId ? ic : { ...ic, stats: { ...ic.stats, hp: newHp } }),
        })),
      };
      pushLog(s, `${ai.name} used ${ab.name}, healing ${effect.amount} HP!`, 1);
      abilitiesUsed++;
    } else if (effect.type === 'aoe_damage') {
      const currentAi = s.players[1].icons.find(i => i.id === aiId)!;
      const inRange = playerIcons().filter(e => hexDistance(currentAi.position, e.position) <= (effect.range ?? 2));
      if (!inRange.length) continue;
      // singleTarget: only hit the nearest enemy (Champion's Strike)
      const targets = (effect as any).singleTarget
        ? [inRange.sort((a, b) => hexDistance(currentAi.position, a.position) - hexDistance(currentAi.position, b.position))[0]]
        : inRange;
      const dmg = effect.damage ?? Math.round(calcEffectiveStats(s, currentAi).might * (effect.multiplier ?? 1.0));
      for (const t of targets) {
        const newHp = Math.round(Math.max(0, t.stats.hp - dmg));
        s = {
          ...s,
          players: s.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== t.id ? ic : {
              ...ic,
              stats: { ...ic.stats, hp: newHp },
              isAlive: newHp > 0,
              respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
            }),
          })),
        };
      }
      pushLog(s, `${ai.name} used ${ab.name} for ${dmg} dmg to ${targets.length} target(s)!`, 1);
      abilitiesUsed++;
    } else if (effect.type === 'debuff_enemies') {
      const currentAi = s.players[1].icons.find(i => i.id === aiId)!;
      const targets = playerIcons().filter(e => hexDistance(currentAi.position, e.position) <= (effect.range ?? 2));
      if (!targets.length) continue;
      for (const t of targets) {
        s = {
          ...s,
          players: s.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => {
              if (ic.id !== t.id) return ic;
              const newDebuffs = [...(ic.debuffs ?? []), {
                type: effect.debuffType as any,
                magnitude: effect.magnitude ?? 0,
                turnsRemaining: effect.duration ?? 2,
              }];
              return { ...ic, debuffs: newDebuffs };
            }),
          })),
        };
      }
      pushLog(s, `${ai.name} used ${ab.name} on ${targets.length} target(s)!`, 1);
      abilitiesUsed++;
    } else if (effect.type === 'damage_all_enemies') {
      const dmg = effect.damage ?? 0;
      const targets = playerIcons();
      if (!targets.length) continue;
      for (const t of targets) {
        const newHp = Math.round(Math.max(0, t.stats.hp - dmg));
        s = {
          ...s,
          players: s.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== t.id ? ic : {
              ...ic,
              stats: { ...ic.stats, hp: newHp },
              isAlive: newHp > 0,
              respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
            }),
          })),
        };
      }
      pushLog(s, `${ai.name} used ${ab.name} — ${dmg} damage to ALL enemies!`, 1);
      abilitiesUsed++;
    } else if (effect.type === 'dash_attack') {
      const currentAi = s.players[1].icons.find(i => i.id === aiId)!;
      const sorted = playerIcons().sort((a, b) =>
        hexDistance(currentAi.position, a.position) - hexDistance(currentAi.position, b.position)
      );
      const target = sorted[0];
      if (!target) continue;
      // Find a free adjacent hex to teleport next to the target (include dead to avoid reusing their tile)
      const occupied = new Set(
        s.players.flatMap(p => p.icons)
          .filter(ic => ic.id !== aiId)
          .map(ic => `${ic.position.q},${ic.position.r}`)
      );
      const neighbors = [
        { q: target.position.q + 1, r: target.position.r - 1 },
        { q: target.position.q + 1, r: target.position.r },
        { q: target.position.q, r: target.position.r + 1 },
        { q: target.position.q - 1, r: target.position.r + 1 },
        { q: target.position.q - 1, r: target.position.r },
        { q: target.position.q, r: target.position.r - 1 },
      ].filter(p => {
        if (occupied.has(`${p.q},${p.r}`)) return false;
        const tile = s.board.find(t => t.coordinates.q === p.q && t.coordinates.r === p.r);
        return tile && tile.terrain.effects.movementModifier !== -999;
      });
      // Sort by closest to attacker, then pick the first that is still free at the moment of placement
      const sortedNeighbors = [...neighbors].sort(
        (a, b) => hexDistance(a, currentAi.position) - hexDistance(b, currentAi.position)
      );
      const dest = sortedNeighbors.find(nb =>
        !s.players.flatMap(p => p.icons).some(ic =>
          ic.isAlive && ic.id !== aiId && ic.position.q === nb.q && ic.position.r === nb.r
        )
      );
      if (dest && hexDistance(currentAi.position, dest) <= (effect.dashRange ?? 5)) {
        // Teleport the AI icon
        s = {
          ...s,
          players: s.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== aiId ? ic : {
              ...ic, position: dest, movedThisTurn: true,
            }),
          })),
        };
        // Hit the target (apply attacker might × multiplier, then subtract target defense)
        const updatedAi = s.players[1].icons.find(i => i.id === aiId)!;
        const rawDmg = calcEffectiveStats(s, updatedAi).might * (effect.multiplier ?? 1.5);
        const dmg = Math.round(Math.max(0.1, rawDmg - calcEffectiveStats(s, target).defense));
        const newHp = Math.round(Math.max(0, target.stats.hp - dmg));
        s = {
          ...s,
          players: s.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== target.id ? ic : {
              ...ic,
              stats: { ...ic.stats, hp: newHp },
              isAlive: newHp > 0,
              respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
            }),
          })),
        };
        pushLog(s, `${ai.name} used ${ab.name} on ${target.name} for ${dmg} dmg!`, 1);
        abilitiesUsed++;
      } else continue;
    }

    // Set cooldown after use
    const newCooldown = ab.oncePerFight ? 999 : ab.cooldown;
    s = {
      ...s,
      players: s.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== aiId ? ic : {
          ...ic,
          enemyAbilityCooldowns: { ...(ic.enemyAbilityCooldowns ?? {}), [ab.id]: newCooldown },
        }),
      })),
    };
    // Phase announcement: once-per-fight low_hp triggers = boss phase change
    if (ab.oncePerFight && ab.triggerCondition === 'low_hp') {
      s = { ...s, phaseBanner: { enemyName: ai.name, abilityName: ab.name, icon: ab.icon } };
    }
  }

  return s;
}

/** Execute AI turn: ALL alive AI icons move + act. Returns updated state (aiIntents cleared). */
function executeAITurn(state: ExtState): ExtState {
  let s = { ...state } as ExtState;
  const intents: AIIntent[] = (s as any).aiIntents ?? [];

  for (const aiOrig of state.players[1].icons.filter(i => i.isAlive)) {
    // Execute boss/elite abilities at the start of each enemy's turn
    s = executeEnemyAbilities(s, aiOrig.id);
    let ai = s.players[1].icons.find(i => i.id === aiOrig.id);
    if (!ai || !ai.isAlive) continue;

    const basicRange = ai.name.includes("Napoleon") || ai.name.includes("Da Vinci") ? 2 : 1;
    const enemies = () => s.players[0].icons.filter(i => i.isAlive);
    const iconIntents = intents.filter(i => i.iconId === aiOrig.id);

    // --- Main action intent (skip buff/upcoming intents) ---
    const mainIntent = iconIntents.find(i => i.type !== 'buff' && i.type !== 'upcoming_ability');

    if (mainIntent?.type === 'ability' || mainIntent?.type === 'heal') {
      ai = s.players[1].icons.find(i => i.id === aiOrig.id)!;
      const ab = (ai.abilities as any[]).find(a => a.name === mainIntent.abilityName);
      if (ab && !(ab.id === "ultimate" && ai.ultimateUsed)) {
        if (typeof ab.healing === "number" && ab.healing > 0) {
          const ally = s.players[1].icons
            .filter(ic => ic.isAlive && hexDistance(ai!.position, ic.position) <= ab.range)
            .sort((a, b) => (a.stats.hp / a.stats.maxHp) - (b.stats.hp / b.stats.maxHp))[0];
          if (ally) {
            s.players = s.players.map(p => ({
              ...p, icons: p.icons.map(ic => ic.id !== ally.id ? ic : {
                ...ic, stats: { ...ic.stats, hp: Math.round(Math.min(ic.stats.maxHp, ic.stats.hp + ab.healing)) },
              }),
            }));
            s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true, ultimateUsed: ic.ultimateUsed || ab.id === "ultimate" } : ic) }));
            pushLog(s, `${ai.name} cast ${ab.name} on ${ally.name}, healing ${ab.healing} HP`, 1);
          }
        } else if (typeof ab.damage === "number") {
          const target = enemies().find(e => hexDistance(ai!.position, e.position) <= ab.range);
          if (target) {
            const dmg = ab.damage > 0 ? ab.damage : resolveAbilityDamage(s, ai, target, (ab as any).powerMult ?? 1.0);
            const newHp = Math.round(Math.max(0, target.stats.hp - dmg));
            s.players = s.players.map(p => ({
              ...p, icons: p.icons.map(ic => ic.id !== target.id ? ic : {
                ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
              }),
            }));
            s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true, ultimateUsed: ic.ultimateUsed || ab.id === "ultimate" } : ic) }));
            pushLog(s, `${ai.name} cast ${ab.name} on ${target.name} for ${dmg.toFixed(0)} dmg`, 1);
          }
        }
      }
    } else if (mainIntent?.type === 'attack') {
      ai = s.players[1].icons.find(i => i.id === aiOrig.id)!;
      if (!ai.cardUsedThisTurn) {
        if (mainIntent.abilityName === 'Attack Base') {
          const PLAYER_BASE_INTENT: Qr = { q: -6, r: 5 };
          if (hexDistance(ai.position, PLAYER_BASE_INTENT) <= basicRange && s.baseHealth[0] > 0) {
            const dmg = Math.max(0.1, calcEffectiveStats(s, ai).might);
            const newBases = [...s.baseHealth];
            newBases[0] = Math.max(0, newBases[0] - dmg);
            s.baseHealth = newBases as [number, number];
            s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
            pushLog(s, `${ai.name} attacked player base for ${dmg.toFixed(0)} dmg`, 1);
          }
        } else {
          // Basic attack on enemy
          const target = enemies().find(e =>
            hexDistance(ai!.position, e.position) <= basicRange &&
            !hasLineMountain(s.board, ai!.position, e.position)
          );
          if (target) {
            const dmg = resolveBasicAttackDamage(s, ai, target);
            const newHp = Math.round(Math.max(0, target.stats.hp - dmg));
            s.players = s.players.map(p => ({
              ...p, icons: p.icons.map(ic => ic.id !== target.id ? ic : {
                ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
              }),
            }));
            s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
            pushLog(s, `${ai.name} basic-attacked ${target.name} for ${dmg.toFixed(0)} dmg`, 1);
          }
        }
      }
    }

    // --- Movement for every AI icon ---
    ai = s.players[1].icons.find(i => i.id === aiOrig.id)!;
    if (!ai || !ai.isAlive || ai.movedThisTurn || ai.stats.movement <= 0) continue;

    // Targets: enemies > beast camps > player base
    const PLAYER_BASE: Qr = { q: -6, r: 5 };
    const allTargets: { position: Qr }[] = [
      ...enemies().map(e => ({ position: e.position })),
      // Beast camps are on the AI's side — skip them as movement targets
      { position: PLAYER_BASE },
    ];
    if (!allTargets.length) continue;

    const budget = Math.min(ai.stats.movement, ai.stats.moveRange);
    const occupied = new Set(
      s.players.flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.id !== ai!.id)
        .map(ic => tileKey(ic.position.q, ic.position.r))
    );
    const allowRiver = ai.name.includes("Sun-sin");
    const costMap = reachableWithCosts(s.board, ai.position, budget, occupied, allowRiver);
    if (!costMap.size) continue;

    let best: { coord: Coordinates; score: number } | null = null;
    for (const [key] of costMap.entries()) {
      const [qStr, rStr] = key.split(",");
      const cand: Coordinates = { q: parseInt(qStr, 10), r: parseInt(rStr, 10) };
      let minD = Infinity;
      for (const t of allTargets) { const d = hexDistance(cand, t.position); if (d < minD) minD = d; }
      if (!best || minD < best.score) best = { coord: cand, score: minD };
    }
    if (best) {
      // Final live check: ensure no alive icon already occupies best.coord (guards against race conditions)
      const destTaken = s.players.flatMap(p => p.icons).some(ic =>
        ic.isAlive && ic.id !== ai!.id && ic.position.q === best!.coord.q && ic.position.r === best!.coord.r
      );
      if (destTaken) continue;
      s.players = s.players.map(p => ({
        ...p, icons: p.icons.map(ic => ic.id === ai!.id ? {
          ...ic, position: best!.coord, movedThisTurn: true, stats: { ...ic.stats, movement: 0 },
        } : ic),
      }));

      // Post-move attack: enemies > base
      ai = s.players[1].icons.find(i => i.id === aiOrig.id)!;
      if (!ai.cardUsedThisTurn) {
        const target = enemies().find(e => hexDistance(ai!.position, e.position) <= basicRange);
        if (target) {
          const dmg = resolveBasicAttackDamage(s, ai, target);
          const newHp = Math.round(Math.max(0, target.stats.hp - dmg));
          s.players = s.players.map(p => ({
            ...p, icons: p.icons.map(ic => ic.id !== target.id ? ic : {
              ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
            }),
          }));
          s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
          pushLog(s, `${ai.name} attacked ${target.name} for ${dmg.toFixed(0)} dmg`, 1);
        } else if (hexDistance(ai.position, PLAYER_BASE) <= basicRange && s.baseHealth[0] > 0) {
          const dmg = Math.max(0.1, calcEffectiveStats(s, ai).might);
          const newBases = [...s.baseHealth];
          newBases[0] = Math.max(0, newBases[0] - dmg);
          s.baseHealth = newBases as [number, number];
          s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
          pushLog(s, `${ai.name} attacked player base for ${dmg.toFixed(0)} dmg`, 1);
        }
      }
    }
  }

  // ── Controlled enemy units (Huang-chan Eternal Army): simple AI ──────────────
  // These units now have playerId === 0 but terracottaControlled === true.
  // They act during the AI turn: move toward + attack nearest enemy (player 1 unit).
  for (const ctrlUnit of s.players[0].icons.filter(ic => ic.isAlive && ic.terracottaControlled)) {
    const attackRange = ctrlUnit.role === "dps_ranged" ? 2 : 1;
    const enemiesForCtrl = s.players[1].icons.filter(ic => ic.isAlive);
    if (!enemiesForCtrl.length) continue;

    // Move toward nearest enemy
    if (!ctrlUnit.movedThisTurn && ctrlUnit.stats.movement > 0) {
      const budget = Math.min(ctrlUnit.stats.movement, ctrlUnit.stats.moveRange);
      const ctrlOccupied = new Set(s.players.flatMap(p => p.icons).filter(ic => ic.isAlive && ic.id !== ctrlUnit.id).map(ic => tileKey(ic.position.q, ic.position.r)));
      const ctrlCosts = reachableWithCosts(s.board, ctrlUnit.position, budget, ctrlOccupied, false);
      if (ctrlCosts.size) {
        let ctrlBest: { coord: Coordinates; score: number } | null = null;
        for (const [key] of ctrlCosts.entries()) {
          const [qStr, rStr] = key.split(",");
          const cand: Coordinates = { q: parseInt(qStr, 10), r: parseInt(rStr, 10) };
          const minD = Math.min(...enemiesForCtrl.map(e => hexDistance(cand, e.position)));
          if (!ctrlBest || minD < ctrlBest.score) ctrlBest = { coord: cand, score: minD };
        }
        if (ctrlBest) {
          const destTaken = s.players.flatMap(p => p.icons).some(ic => ic.isAlive && ic.id !== ctrlUnit.id && ic.position.q === ctrlBest!.coord.q && ic.position.r === ctrlBest!.coord.r);
          if (!destTaken) {
            s.players = s.players.map(p => ({
              ...p, icons: p.icons.map(ic => ic.id === ctrlUnit.id ? { ...ic, position: ctrlBest!.coord, movedThisTurn: true, stats: { ...ic.stats, movement: 0 } } : ic),
            }));
          }
        }
      }
    }

    // Attack nearest enemy if in range
    const refreshed = s.players[0].icons.find(ic => ic.id === ctrlUnit.id);
    if (refreshed && !refreshed.cardUsedThisTurn) {
      const ctrlTarget = enemiesForCtrl.find(e => hexDistance(refreshed.position, e.position) <= attackRange);
      if (ctrlTarget) {
        const ctrlStats = calcEffectiveStats(s, refreshed);
        const tgtStats = calcEffectiveStats(s, ctrlTarget);
        const ctrlDmg = Math.max(1, ctrlStats.might - tgtStats.defense);
        const newHp = Math.round(Math.max(0, ctrlTarget.stats.hp - ctrlDmg));
        s.players = s.players.map(p => ({
          ...p, icons: p.icons.map(ic => ic.id !== ctrlTarget.id ? ic : { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 }),
        }));
        s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === refreshed.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
        pushLog(s, `[Controlled] ${refreshed.name} attacked ${ctrlTarget.name} for ${ctrlDmg.toFixed(0)} dmg`, 0);
      }
    }
  }

  return { ...s, aiIntents: [] };
}

/** Apply all kill-triggered passives and item effects after a kill. */
function applyKillPassives(s: ExtState, killerId: string, victimWasAlive: boolean, victimIsNowDead: boolean): ExtState {
  if (!victimWasAlive || !victimIsNowDead) return s;
  const killer = s.players.flatMap(p => p.icons).find(i => i.id === killerId);
  if (!killer) return s;

  // Genghis Bloodlust: +15 Might stack, +1 mana (up to 3 stacks)
  if (killer.name.includes("Genghis")) {
    const stacks = killer.passiveStacks ?? 0;
    if (stacks < 3) {
      const newStacks = stacks + 1;
      s.players = s.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== killerId ? ic : { ...ic, passiveStacks: newStacks }),
      }));
      const newMana = [...s.globalMana] as [number, number];
      newMana[killer.playerId] = Math.min(5, newMana[killer.playerId] + 1);
      s.globalMana = newMana;
      pushLog(s, `${killer.name} Bloodlust! ${newStacks}/3 stacks (+15 Might, +1 Mana)`, killer.playerId);
    }
  }

  // Battle Drum (draw_2_on_kill): draw 2 cards for killer's player
  if (killer.itemPassiveTags?.includes('draw_2_on_kill') || killer.itemPassiveTags?.includes('draw_on_kill')) {
    const drawCount = killer.itemPassiveTags?.includes('draw_2_on_kill') ? 2 : 1;
    const pid = killer.playerId as 0 | 1;
    const hand = (s as any).hands?.[pid];
    const deck = (s as any).decks?.[pid];
    if (hand && deck) {
      const { drawn, newDraw, newDiscard } = drawCards(deck.drawPile, deck.discardPile, drawCount);
      (s as any).hands = [...((s as any).hands ?? [null, null])];
      (s as any).decks = [...((s as any).decks ?? [null, null])];
      (s as any).hands[pid] = { ...hand, cards: [...hand.cards, ...drawn] };
      (s as any).decks[pid] = { drawPile: newDraw, discardPile: newDiscard };
      if (drawn.length > 0) pushLog(s, `${killer.name} Battle Drum: drew ${drawn.length} card(s)!`, pid);
    }
  }

  // Soul Ember (on_kill_heal_15): restore 15 HP to killer
  if (killer.itemPassiveTags?.includes('on_kill_heal_15')) {
    s.players = s.players.map(p => ({
      ...p,
      icons: p.icons.map(ic => {
        if (ic.id !== killerId || !ic.isAlive) return ic;
        const healed = Math.min(ic.stats.maxHp, ic.stats.hp + 15);
        pushLog(s, `${ic.name} Soul Ember: +15 HP on kill`, ic.playerId);
        return { ...ic, stats: { ...ic.stats, hp: healed } };
      }),
    }));
  }

  // Znyxorga's Eye (next_2_cards_free_on_kill): next 2 cards cost 0 mana
  if (killer.itemPassiveTags?.includes('next_2_cards_free_on_kill') || killer.itemPassiveTags?.includes('next_card_free_on_kill')) {
    const freeCount = killer.itemPassiveTags?.includes('next_2_cards_free_on_kill') ? 2 : 1;
    s.players = s.players.map(p => ({
      ...p,
      icons: p.icons.map(ic => ic.id !== killerId ? ic : { ...ic, freeCardsLeft: (ic.freeCardsLeft ?? 0) + freeCount }),
    }));
    pushLog(s, `${killer.name} Znyxorga's Eye: next ${freeCount} card(s) are FREE!`, killer.playerId);
  }

  // War Trophy (on_kill_might_power_plus3): permanently +3 Might and +3 Power
  if (killer.itemPassiveTags?.includes('on_kill_might_power_plus3')) {
    s.players = s.players.map(p => ({
      ...p,
      icons: p.icons.map(ic => {
        if (ic.id !== killerId || !ic.isAlive) return ic;
        pushLog(s, `${ic.name} War Trophy: +3 Might, +3 Power!`, ic.playerId);
        return { ...ic, stats: { ...ic.stats, might: ic.stats.might + 3, power: ic.stats.power + 3, maxMight: (ic.stats as any).maxMight ? (ic.stats as any).maxMight + 3 : undefined } };
      }),
    }));
  }

  return s;
}

// Keep old name as alias for backward-compat call sites not yet renamed
/**
 * Apply damage to an icon, respecting Void Armor (once_survive_lethal).
 * Returns updated icon with hp/isAlive/voidArmorUsed adjusted.
 */
function applyDmgToIcon(ic: Icon, dmg: number, s: ExtState, logFn?: (msg: string) => void): Icon {
  // Diamond Shell: negate the first damaging hit each fight
  if (dmg > 0 && !ic.firstHitNegated && ic.itemPassiveTags?.includes('negate_first_hit')) {
    if (logFn) logFn(`${ic.name} Diamond Shell: first hit negated!`);
    return { ...ic, firstHitNegated: true };
  }
  // Turtle Hull: Yi Sun-sin takes 20% less damage from all sources
  if (dmg > 0 && ic.itemPassiveTags?.includes('sunsin_dmg_reduce_20pct')) {
    dmg = Math.floor(dmg * 0.80);
  }
  const rawHp = Math.max(0, ic.stats.hp - dmg);
  // Void Armor: once per fight, survive a lethal hit at 1 HP
  if (rawHp <= 0 && !ic.voidArmorUsed && ic.itemPassiveTags?.includes('once_survive_lethal')) {
    if (logFn) logFn(`${ic.name} Void Armor: survived lethal blow at 1 HP!`);
    return { ...ic, stats: { ...ic.stats, hp: 1 }, isAlive: true, voidArmorUsed: true, respawnTurns: ic.respawnTurns };
  }
  return {
    ...ic,
    stats: { ...ic.stats, hp: rawHp },
    isAlive: rawHp > 0,
    respawnTurns: rawHp > 0 ? ic.respawnTurns : 4,
  };
}

const useGameState = (gameMode: "singleplayer" | "multiplayer" = "singleplayer", selectedCharacters?: any[]) => {
  const [gameState, setGameState] = useState<ExtState>(() => {
    const initialIcons = selectedCharacters && selectedCharacters.length === 3
      ? buildIconsFromSelection(selectedCharacters)
      : createInitialIcons();
    const speedQueueRaw = initSpeedQueue(initialIcons);
    const speedQueue = normalizeSpeedQueue(speedQueueRaw, initialIcons);

    const p0Names = initialIcons.filter(i => i.playerId === 0).map(i => i.name);
    const p1Names = initialIcons.filter(i => i.playerId === 1).map(i => i.name);
    const buildHand = (names: string[]): [Hand, Deck] => {
      const allCards = buildDeckForTeam(names);
      const drawn = allCards.slice(0, 7);
      const remaining = allCards.slice(7);
      return [{ cards: drawn, maxSize: 7 }, { drawPile: remaining, discardPile: [] }];
    };
    const [hand0, deck0] = buildHand(p0Names);
    const [hand1, deck1] = buildHand(p1Names);

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
      globalMana: [5, 5],
      globalMaxMana: [5, 5],
      turnTimer: 20,
      speedQueue,
      queueIndex: 0,
      objectives: {
        manaCrystal: { controlled: false },
        beastCamps: { hp: [0, 0], maxHp: 75, defeated: [true, true] },
      },
      teamBuffs: { mightBonus: [0, 0], powerBonus: [0, 0], homeBaseBonus: [0, 0] },
      baseHealth: [150, 150],
      matchTimer: 600,
      gameMode,
      movementStack: {},
      menuOpen: false,
      combatLog: [],
      hands: [hand0, hand1],
      decks: [deck0, deck1],
      encounterObjective: 'defeat_all',
      survivalTurnsTarget: 0,
      spawnInterval: 0,
      isRoguelikeRun: false,
    } as ExtState;
  });

  // Keep a ref to always have current selectedCharacters in callbacks without stale closures
  const selectedCharactersRef = useRef<any[] | undefined>(selectedCharacters);
  useEffect(() => { selectedCharactersRef.current = selectedCharacters; }, [selectedCharacters]);

  const currentTurnTimer = 0; // timer disabled — player ends turn manually

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
     Sync gameMode into state when parent arg changes (e.g. switching singleplayer ↔ multiplayer)
     ========================= */
  useEffect(() => {
    setGameState((prev) => {
      if (prev.gameMode === gameMode) return prev;
      return {
        ...prev,
        gameMode,
        players: prev.players.map((p, i) =>
          i === 1
            ? { ...p, name: gameMode === "singleplayer" ? "Znyxorgan AI" : "Player 2", isAI: gameMode === "singleplayer" }
            : p
        ),
      };
    });
  }, [gameMode]);

  /* =========================
     Sync selectedCharacters into state when a new game starts
     ========================= */
  useEffect(() => {
    if (!selectedCharacters || selectedCharacters.length !== 3) return;
    setGameState((prev) => {
      const initialIcons = buildIconsFromSelection(selectedCharacters);
      const speedQueueRaw = initSpeedQueue(initialIcons);
      const speedQueue = normalizeSpeedQueue(speedQueueRaw, initialIcons);
      const p0Names = initialIcons.filter((i) => i.playerId === 0).map((i) => i.name);
      const p1Names = initialIcons.filter((i) => i.playerId === 1).map((i) => i.name);
      const buildHand = (names: string[]): [Hand, Deck] => {
        const allCards = buildDeckForTeam(names);
        return [{ cards: allCards.slice(0, 7), maxSize: 7 }, { drawPile: allCards.slice(7), discardPile: [] }];
      };
      const [hand0, deck0] = buildHand(p0Names);
      const [hand1, deck1] = buildHand(p1Names);
      return {
        ...prev,
        currentTurn: 1,
        activePlayerId: 0 as const,
        cardLockActive: false,
        phase: "combat",
        players: [
          { id: 0, name: "Player 1", icons: initialIcons.filter((i) => i.playerId === 0), color: "blue", isAI: false },
          { id: 1, name: gameMode === "singleplayer" ? "Znyxorgan AI" : "Player 2", icons: initialIcons.filter((i) => i.playerId === 1), color: "red", isAI: gameMode === "singleplayer" },
        ],
        board: createInitialBoard(),
        globalMana: [5, 5],
        globalMaxMana: [5, 5],
        turnTimer: 20,
        speedQueue,
        queueIndex: 0,
        objectives: { manaCrystal: { controlled: false }, beastCamps: { hp: [0, 0], maxHp: 75, defeated: [true, true] } },
        teamBuffs: { mightBonus: [0, 0], powerBonus: [0, 0], homeBaseBonus: [0, 0] },
        baseHealth: [150, 150],
        matchTimer: 600,
        gameMode,
        movementStack: {},
        menuOpen: false,
        combatLog: [],
        hands: [hand0, hand1],
        decks: [deck0, deck1],
        aiIntents: [],
        encounterObjective: 'defeat_all',
        survivalTurnsTarget: 0,
        spawnInterval: 0,
        isRoguelikeRun: false,
      } as ExtState;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCharacters]);

  /* =========================
     AI — Step 1: compute intents at START of player's turn (shown as badges all turn)
     ========================= */
  useEffect(() => {
    if (gameState.gameMode !== "singleplayer") return;
    if (gameState.activePlayerId !== 0) return;
    // Compute and store AI intents + beast camp intents
    setGameState((prev) => {
      const intents = computeAIIntents(prev as ExtState);
      return { ...prev, aiIntents: intents };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.activePlayerId, gameState.gameMode]);

  /* =========================
     AI — Step 2: execute on AI's turn (all characters act)
     ========================= */
  useEffect(() => {
    if (gameState.gameMode !== "singleplayer") return;
    if (gameState.activePlayerId !== 1) return;
    const aiIcons = gameState.players[1].icons.filter(i => i.isAlive);

    // No alive AI units (e.g. all enemies dead mid-destroy_base) — skip turn immediately
    if (!aiIcons.length) {
      const t = setTimeout(() => endTurn(), AI_THINK_MS);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setGameState((prev) => executeAITurn(prev as ExtState));
      setTimeout(() => endTurn(), AI_END_TURN_MS);
    }, AI_THINK_MS);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.activePlayerId, gameState.gameMode]);

  /* =========================
     Immediate victory check — fires after any state change that kills a unit
     Doesn't wait for End Turn — victory triggers the moment the last enemy falls.
     ========================= */
  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    const ext = gameState as unknown as ExtState;
    const p0Alive = gameState.players[0].icons.some(ic => ic.isAlive);
    const p1Alive = gameState.players[1].icons.some(ic => ic.isAlive);
    if (!p0Alive) {
      setGameState(prev => prev.phase === 'playing' ? { ...prev, phase: 'defeat' as any, winner: 1 } : prev);
    } else if (!p1Alive && ext.encounterObjective !== 'destroy_base') {
      setGameState(prev => prev.phase === 'playing' ? { ...prev, phase: 'victory' as any, winner: 0 } : prev);
    }
  }, [gameState.players]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Immediate survive victory — fires as soon as currentTurn exceeds the target */
  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    const ext = gameState as unknown as ExtState;
    if (ext.encounterObjective === 'survive' && ext.survivalTurnsTarget > 0) {
      if (gameState.currentTurn > ext.survivalTurnsTarget && gameState.players[0].icons.some(ic => ic.isAlive)) {
        setGameState(prev => prev.phase === 'playing' ? { ...prev, phase: 'victory' as any, winner: 0 } : prev);
      }
    }
  }, [gameState.currentTurn]); // eslint-disable-line react-hooks/exhaustive-deps

  /* =========================
     Input handlers (PLAYER targeting)
     ========================= */

  const selectTile = useCallback((coordinates: Coordinates) => {
    setGameState((prev) => {
      const state = { ...prev } as ExtState;

      // ── Card targeting path ──────────────────────────────────────────────────
      if (state.cardTargetingMode) {
        const { card, executorId } = state.cardTargetingMode;
        const executor = state.players.flatMap(p => p.icons).find(i => i.id === executorId);
        if (!executor || !executor.isAlive) return { ...state, cardTargetingMode: undefined };

        // Use targetingMode.range — it was set correctly in playCard (respects char-specific basic attack range)
        const range = state.targetingMode?.range ?? card.effect.range ?? 3;
        if (hexDistance(executor.position, coordinates) > range) {
          toast.error(getT().messages.outOfRange);
          return prev;
        }

        const targetIcon = state.players.flatMap(p => p.icons).find(
          ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
        );

        let updated = { ...state } as ExtState;
        let updatedBaseHealth = [...state.baseHealth];
        let updatedObjectives = { ...state.objectives };

        // ── Vitruvian Guardian: drone summon ──────────────────────────────────
        if (card.definitionId === "davinci_vitruvian_guardian") {
          const occupied = updated.players.flatMap(p => p.icons).some(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (occupied) { toast.error(getT().messages.tileOccupied); return prev; }

          const dronePower = executor.stats.power;
          const droneHp   = Math.round(dronePower * 1.5);
          const droneMight = Math.round(dronePower * 1.0);
          const droneDef   = Math.round(dronePower * 0.6);
          const drone: Icon = {
            id: `drone_${makeId()}`,
            name: "Combat Drone",
            role: "dps_melee",
            stats: {
              hp: droneHp, maxHp: droneHp,
              moveRange: 2, speed: 5,
              might: droneMight, power: dronePower, defense: droneDef,
              movement: 2, mana: 3, maxMana: 3,
            },
            abilities: [],
            passive: "Mechanical",
            position: coordinates,
            playerId: executor.playerId,
            isAlive: true,
            respawnTurns: 0,
            cardUsedThisTurn: false,
            movedThisTurn: false,
            hasUltimate: false,
            ultimateUsed: true,
          };
          updated.players = updated.players.map(p =>
            p.id !== executor.playerId ? p : { ...p, icons: [...p.icons, drone] }
          );
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const newMana = [...updated.globalMana] as [number, number];
            newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
            updated.globalMana = newMana;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1 }),
          }));
          pushLog(updated, `${executor.name} summoned a Combat Drone!`, executor.playerId);
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Flying Machine card teleport ──────────────────────────────────────
        if (card.effect.teleport) {
          const tile = state.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          const blocked =
            !tile ||
            tile.terrain.effects.movementModifier === -999 ||
            state.players.flatMap(p => p.icons).some(ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r);
          if (blocked) { toast.error(getT().messages.cantTeleport); return prev; }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : {
              ...ic, position: coordinates, movedThisTurn: true,
              abilityUsedThisTurn: true,
            }),
          }));
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const newMana = [...updated.globalMana] as [number, number];
            newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
            updated.globalMana = newMana;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1 }),
          }));
          pushLog(updated, `${executor.name} used ${card.name} to teleport!`, executor.playerId);
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Huang-chan: Terracotta Summon ─────────────────────────────────────
        if (card.effect.summonTerracotta) {
          const occupied = updated.players.flatMap(p => p.icons).some(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (occupied) { toast.error(getT().messages.tileOccupied); return prev; }
          const tile = state.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          if (!tile || tile.terrain.effects.movementModifier === -999) { toast.error(getT().messages.cantTeleport); return prev; }
          const isArcher = Math.random() < 0.5;
          const exStats = calcEffectiveStats(updated, executor);
          const terracottaUnit: Icon = {
            id: `terracotta_${makeId()}`,
            name: isArcher ? "Terracotta Archer" : "Terracotta Warrior",
            role: isArcher ? "dps_ranged" : "dps_melee",
            stats: {
              hp: 40 + (card.effect.summonHpBonus ?? 0), maxHp: 40 + (card.effect.summonHpBonus ?? 0),
              moveRange: 2, speed: 4,
              might: isArcher ? Math.round(exStats.might * 1.5) : exStats.might,
              power: 0,
              defense: exStats.defense,
              movement: 2, mana: 0, maxMana: 0,
              attackRange: isArcher ? 2 : 1,
            },
            abilities: [], passive: "Terracotta",
            position: coordinates, playerId: executor.playerId,
            isAlive: true, respawnTurns: 0,
            cardUsedThisTurn: false, movedThisTurn: false,
            hasUltimate: false, ultimateUsed: true,
            droneExpiresTurn: state.currentTurn + 2,
          };
          updated.players = updated.players.map(p =>
            p.id !== executor.playerId ? p : { ...p, icons: [...p.icons, terracottaUnit] }
          );
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const newMana = [...updated.globalMana] as [number, number];
            newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
            updated.globalMana = newMana;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          pushLog(updated, `${executor.name} summoned a ${terracottaUnit.name}!`, executor.playerId);
          // Inject 1 Basic Attack card so the terracotta unit can use it
          const baDef = CARD_DEFS.find((d: any) => d.definitionId === 'shared_basic_attack');
          if (baDef) {
            const baCard = instantiateCard(baDef as any);
            const baHandArr = (updated as any).hands;
            const baPid = executor.playerId as 0 | 1;
            if (baHandArr?.[baPid]) {
              (updated as any).hands = [...baHandArr];
              (updated as any).hands[baPid] = { ...baHandArr[baPid], cards: [...baHandArr[baPid].cards, baCard] };
            }
          }
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Huang-chan: First Emperor's Command (Cavalry summon) ──────────────
        if (card.effect.summonCavalry) {
          const occupied = updated.players.flatMap(p => p.icons).some(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (occupied) { toast.error(getT().messages.tileOccupied); return prev; }
          const tile = state.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          if (!tile || tile.terrain.effects.movementModifier === -999) { toast.error(getT().messages.cantTeleport); return prev; }
          const cavStats = calcEffectiveStats(updated, executor);
          const cavalryUnit: Icon = {
            id: `terracotta_cav_${makeId()}`,
            name: "Terracotta Cavalry",
            role: "dps_melee",
            stats: {
              hp: 60, maxHp: 60,
              moveRange: 3, speed: 7,
              might: Math.round(cavStats.might * 1.5) + (card.effect.cavalryMightBonus ?? 0),
              power: cavStats.power,
              defense: Math.round(cavStats.defense * 1.5),
              movement: 3, mana: 0, maxMana: 0,
              attackRange: 1,
            },
            abilities: [], passive: "Terracotta",
            position: coordinates, playerId: executor.playerId,
            isAlive: true, respawnTurns: 0,
            cardUsedThisTurn: false, movedThisTurn: false,
            hasUltimate: false, ultimateUsed: true,
            droneExpiresTurn: state.currentTurn + 2,
          };
          updated.players = updated.players.map(p =>
            p.id !== executor.playerId ? p : { ...p, icons: [...p.icons, cavalryUnit] }
          );
          // Inject free Cavalry Charge card into caster's hand
          const cpid = executor.playerId as 0 | 1;
          const chargeDef = CARD_DEFS.find((d: any) => d.definitionId === 'huang_cavalry_charge');
          if (chargeDef) {
            const chargeCard = { ...instantiateCard(chargeDef), manaCost: 0 };
            const handArr = (updated as any).hands;
            if (handArr?.[cpid]) {
              (updated as any).hands = [...handArr];
              (updated as any).hands[cpid] = { ...handArr[cpid], cards: [...handArr[cpid].cards, chargeCard] };
            }
          }
          if (card.manaCost > 0) {
            const pid2 = executor.playerId as 0 | 1;
            const newMana = [...updated.globalMana] as [number, number];
            newMana[pid2] = Math.max(0, newMana[pid2] - card.manaCost);
            updated.globalMana = newMana;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          pushLog(updated, `${executor.name} summoned Terracotta Cavalry + free Cavalry Charge!`, executor.playerId);
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Huang-chan: Eternal Army (control enemy) ──────────────────────────
        if (card.effect.controlEnemy) {
          const targetIcon = state.players.flatMap(p => p.icons).find(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (!targetIcon || targetIcon.playerId === executor.playerId) {
            toast.error(getT().messages.mustTargetEnemy);
            return prev;
          }
          const isBossTarget = targetIcon.name.includes("Iron Wall") || targetIcon.name.includes("Twin Terror") ||
            targetIcon.name.includes("Terror Alpha") || targetIcon.name.includes("Terror Beta") ||
            targetIcon.name.includes("Znyxorga");
          if (isBossTarget) {
            toast.error("Cannot control a boss or mini-boss unit!");
            return prev;
          }
          if (targetIcon.terracottaControlled) {
            toast.error("This unit is already controlled!");
            return prev;
          }
          const controlDuration = card.effect.controlDuration ?? 2;
          // Move the target icon to the player's team (change playerId)
          const originalPlayerId = targetIcon.playerId;
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic =>
              ic.id !== targetIcon.id ? ic : {
                ...ic,
                terracottaControlled: true,
                controlledByPlayer: executor.playerId,
                controlExpiresTurn: state.currentTurn + controlDuration,
                playerId: executor.playerId,
              }
            ),
          }));
          if (card.manaCost > 0) {
            const pid3 = executor.playerId as 0 | 1;
            const newMana = [...updated.globalMana] as [number, number];
            newMana[pid3] = Math.max(0, newMana[pid3] - card.manaCost);
            updated.globalMana = newMana;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          pushLog(updated, `${executor.name} ETERNAL ARMY — ${targetIcon.name} is now under your control for ${controlDuration} turns!`, executor.playerId);
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Hwajeon water variant (Power×2.0 at range 1) ─────────────────────
        if (card.definitionId === "sunsin_hwajeon" && state.targetingMode?.abilityId === "sunsin_hwajeon_water") {
          const targetIcon = state.players.flatMap(p => p.icons).find(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (!targetIcon || targetIcon.playerId === executor.playerId) { toast.error(getT().messages.mustTargetEnemy); return prev; }
          if (hexDistance(executor.position, coordinates) > 1) { toast.error(getT().messages.outOfRange); return prev; }
          const atkStats = calcEffectiveStats(updated, executor);
          const defStats = calcEffectiveStats(updated, targetIcon);
          const dmg = Math.max(0.1, atkStats.power * 2.0 - defStats.defense);
          const newHp = Math.max(0, targetIcon.stats.hp - dmg);
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
              ...ic,
              stats: { ...ic.stats, hp: Math.round(newHp) },
              isAlive: newHp > 0,
              respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
            }),
          }));
          // Pushback 1 hex
          if (newHp > 0) {
            const DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
            const dq = targetIcon.position.q - executor.position.q;
            const dr = targetIcon.position.r - executor.position.r;
            const dir = DIRS.reduce((best, d) => (dq*d.q + dr*d.r) > (dq*best.q + dr*best.r) ? d : best);
            const pushPos = { q: targetIcon.position.q + dir.q, r: targetIcon.position.r + dir.r };
            const pushTile = updated.board.find(t => t.coordinates.q === pushPos.q && t.coordinates.r === pushPos.r);
            const pushBlocked = !pushTile || pushTile.terrain.effects.movementModifier === -999 ||
              updated.players.flatMap(p => p.icons).some(ic => ic.isAlive && ic.position.q === pushPos.q && ic.position.r === pushPos.r);
            if (!pushBlocked) {
              const drowned = pushTile?.terrain.type === 'river';
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                  ...ic,
                  position: drowned ? ic.position : pushPos,
                  isAlive: !drowned,
                  respawnTurns: drowned ? 4 : ic.respawnTurns,
                }),
              }));
            }
          }
          pushLog(updated, `${executor.name} Ramming Speed hit ${targetIcon.name} for ${dmg.toFixed(0)} dmg`, executor.playerId);
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, abilityUsedThisTurn: true }),
          }));
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Freudenspur zone placement — player clicked a tile to center the zone ──
        if (state.targetingMode?.abilityId === "freudenspur_zone") {
          const card = state.cardTargetingMode!.card;
          const zone: Zone = {
            center: coordinates,
            radius: 1,
            effect: 'moveBonus',
            magnitude: card.effect.moveBonus ?? 2,
            ownerId: executor.playerId,
            turnsRemaining: card.effect.zoneDuration ?? 2,
          };
          updated = { ...updated, activeZones: [...(updated.activeZones ?? []), zone] } as ExtState;
          // Crescendo passive stack
          if (executor.name.includes("Beethoven")) {
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== executorId ? ic : {
                ...ic, passiveStacks: Math.min(8, (ic.passiveStacks ?? 0) + 1),
              }),
            }));
            const stacks = Math.min(8, (executor.passiveStacks ?? 0) + 1);
            pushLog(updated, `${executor.name} Crescendo: ${stacks}/8 (+${stacks * 3} Power)`, executor.playerId);
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, abilityUsedThisTurn: true }),
          }));
          updated = consumeCardFromHand(updated, card, executor.playerId);
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const newMana = [...updated.globalMana] as [number, number];
            newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
            updated.globalMana = newMana;
          }
          pushLog(updated, `${executor.name} plays Freudenspur — resonance zone active for ${zone.turnsRemaining} turns!`, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Naval Repairs (land) — heal allies in target area ─────────────────
        if (state.targetingMode?.abilityId === "naval_repairs") {
          const range = card.effect.range ?? 2;
          const healNow = card.effect.healPerTurn ?? 10;
          const allIcons = updated.players.flatMap(p => p.icons);
          const alliesInRange = allIcons.filter(
            ic => ic.isAlive && ic.playerId === executor.playerId && hexDistance(coordinates, ic.position) <= range
          );
          if (alliesInRange.length === 0) { toast.error(getT().messages.noAlliesInArea); return prev; }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => {
              if (!alliesInRange.find(a => a.id === ic.id)) return ic;
              const healedHp = Math.min(ic.stats.maxHp, ic.stats.hp + healNow);
              return {
                ...ic,
                stats: { ...ic.stats, hp: healedHp },
                regens: [...(ic.regens ?? []), { amount: healNow, turnsRemaining: 1 }],
              };
            }),
          }));
          pushLog(updated, `${executor.name} Naval Repairs healed ${alliesInRange.length} unit(s) for ${healNow} HP (+${healNow} next turn)`, executor.playerId);
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, abilityUsedThisTurn: true }),
          }));
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Chongtong Barrage land charge ─────────────────────────────────────
        if (state.targetingMode?.abilityId === "chongtong_charge") {
          const HEX_DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
          const rawDq = coordinates.q - executor.position.q;
          const rawDr = coordinates.r - executor.position.r;
          const chargeDir = HEX_DIRS.reduce((best, d) => {
            const dot = rawDq * d.q + rawDr * d.r;
            const bestDot = rawDq * best.q + rawDr * best.r;
            return dot > bestDot ? d : best;
          });
          // Perpendicular side push helpers
          const rotCW  = (dq: number, dr: number) => ({ q: -dr,    r: dq + dr });
          const rotCCW = (dq: number, dr: number) => ({ q: dq + dr, r: -dq   });
          let currentPos = { ...executor.position };
          const maxSteps = card.effect.chargeDist ?? 3;
          for (let step = 0; step < maxSteps; step++) {
            const nextPos = { q: currentPos.q + chargeDir.q, r: currentPos.r + chargeDir.r };
            const nextTile = updated.board.find(t => t.coordinates.q === nextPos.q && t.coordinates.r === nextPos.r);
            if (!nextTile || nextTile.terrain.effects.movementModifier === -999) break;
            // Check for enemy at next pos
            const allIcons = updated.players.flatMap(p => p.icons);
            const enemyAtNext = allIcons.find(
              ic => ic.isAlive && ic.playerId !== executor.playerId && ic.position.q === nextPos.q && ic.position.r === nextPos.r
            );
            if (enemyAtNext) {
              const atkStats = calcEffectiveStats(updated, executor);
              const defStats = calcEffectiveStats(updated, enemyAtNext);
              const dmg = Math.max(0.1, atkStats.power * 1.0 - defStats.defense);
              const newHp = Math.max(0, enemyAtNext.stats.hp - dmg);
              // Determine side push direction
              const cwDir = rotCW(chargeDir.q, chargeDir.r);
              const ccwDir = rotCCW(chargeDir.q, chargeDir.r);
              const cwPos  = { q: nextPos.q + cwDir.q,  r: nextPos.r + cwDir.r  };
              const ccwPos = { q: nextPos.q + ccwDir.q, r: nextPos.r + ccwDir.r };
              const freshIcons = updated.players.flatMap(p => p.icons);
              const isFreePos = (pos: {q:number,r:number}) => {
                const tile = updated.board.find(t => t.coordinates.q === pos.q && t.coordinates.r === pos.r);
                return tile && tile.terrain.effects.movementModifier !== -999 &&
                  !freshIcons.some(ic => ic.isAlive && ic.position.q === pos.q && ic.position.r === pos.r);
              };
              const pushPos = isFreePos(cwPos) ? cwPos : isFreePos(ccwPos) ? ccwPos : null;
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => {
                  if (ic.id !== enemyAtNext.id) return ic;
                  if (pushPos) {
                    const pushTile = updated.board.find(t => t.coordinates.q === pushPos.q && t.coordinates.r === pushPos.r);
                    const drowned = pushTile?.terrain.type === 'river';
                    return {
                      ...ic,
                      position: drowned ? ic.position : pushPos,
                      stats: { ...ic.stats, hp: Math.round(newHp) },
                      isAlive: newHp > 0 && !drowned,
                      respawnTurns: (newHp <= 0 || drowned) ? 4 : ic.respawnTurns,
                    };
                  }
                  return { ...ic, stats: { ...ic.stats, hp: Math.round(newHp) }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 };
                }),
              }));
              pushLog(updated, `${executor.name} charged through ${enemyAtNext.name} for ${dmg.toFixed(0)} dmg`, executor.playerId);
            }
            currentPos = nextPos;
          }
          // Move Sun-sin to final charge position
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : {
              ...ic, position: currentPos, movedThisTurn: true, cardUsedThisTurn: true, ultimateUsed: true, abilityUsedThisTurn: true,
            }),
          }));
          pushLog(updated, `${executor.name} Chongtong Barrage charged!`, executor.playerId);
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Debuff cards ──────────────────────────────────────────────────────
        if (card.effect.debuffType) {
          const targetIcon = state.players.flatMap(p => p.icons).find(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (!targetIcon || targetIcon.playerId === executor.playerId) {
            toast.error(getT().messages.mustTargetEnemy);
            return prev;
          }
          const range = card.effect.range ?? 2;
          if (hexDistance(executor.position, coordinates) > range) {
            toast.error(getT().messages.outOfRange);
            return prev;
          }

          // If card also has powerMult (e.g. Shield Bash), deal damage first
          let wasAlive = targetIcon.isAlive;
          let newHp = targetIcon.stats.hp;
          if (card.effect.powerMult !== undefined) {
            const atkStats = calcEffectiveStats(updated, executor);
            const defStats = calcEffectiveStats(updated, targetIcon);
            const dmg = Math.max(0.1, atkStats.power * card.effect.powerMult - defStats.defense);
            newHp = Math.round(Math.max(0, targetIcon.stats.hp - dmg));
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
              }),
            }));
            updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0);
            pushLog(updated, `${executor.name} ${card.name}: ${dmg.toFixed(0)} dmg to ${targetIcon.name}`, executor.playerId);
          }

          // Apply primary debuff (only if target survived)
          if (newHp > 0) {
            const debuff: Debuff = {
              type: card.effect.debuffType,
              magnitude: card.effect.debuffMagnitude ?? 0,
              turnsRemaining: card.effect.debuffDuration ?? 2,
            };
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                ...ic, debuffs: [...(ic.debuffs ?? []), debuff],
              }),
            }));
            pushLog(updated, `${executor.name} applied ${debuff.type} to ${targetIcon.name}`, executor.playerId);

            // Spartan Shield item passive: also push + stun target for 1 turn
            if (executor.itemPassiveTags?.includes('leonidas_bash_push_stun')) {
              // Push 1 hex away
              const DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
              const dq = targetIcon.position.q - executor.position.q;
              const dr = targetIcon.position.r - executor.position.r;
              const dir = DIRS.reduce((best, d) => (dq*d.q + dr*d.r) > (dq*best.q + dr*best.r) ? d : best);
              const pushed = updated.players.flatMap(p => p.icons).find(ic => ic.id === targetIcon.id);
              if (pushed?.isAlive) {
                const dest = { q: pushed.position.q + dir.q, r: pushed.position.r + dir.r };
                const destTile = updated.board.find(t => t.coordinates.q === dest.q && t.coordinates.r === dest.r);
                const occupied = updated.players.flatMap(p => p.icons).some(ic => ic.id !== pushed.id && ic.isAlive && ic.position.q === dest.q && ic.position.r === dest.r);
                if (destTile && !occupied && destTile.terrain.effects.movementModifier !== -999 && destTile.terrain.type !== 'river') {
                  updated.players = updated.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== pushed.id ? ic : { ...ic, position: dest }) }));
                  pushLog(updated, `${pushed.name} was knocked back by Spartan Shield!`, executor.playerId);
                }
              }
              // Stun for 1 turn
              const stunDebuff: Debuff = { type: 'stun', magnitude: 0, turnsRemaining: 1 };
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                  ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'stun'), stunDebuff],
                }),
              }));
              pushLog(updated, `${targetIcon.name} is STUNNED for 1 turn!`, executor.playerId);
            }
          }

          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const newMana = [...updated.globalMana] as [number, number];
            newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
            updated.globalMana = newMana;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1 }),
          }));
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // Helper: compute damage for a card hit on a target
        const computeCardDamage = (tgt: typeof targetIcon) => {
          const executorTile = state.board.find(t => t.coordinates.q === executor.position.q && t.coordinates.r === executor.position.r);
          const terrainMult = 1 + (executorTile ? (card.terrainBonus?.[executorTile.terrain.type] ?? 0) : 0);
          if (card.effect.damageType === 'atk') {
            return resolveBasicAttackDamage(updated, executor, tgt ?? null);
          }
          if (card.effect.powerMult !== undefined) {
            const atkStats = calcEffectiveStats(updated, executor);
            const defStats = tgt ? calcEffectiveStats(updated, tgt) : { defense: 0 };
            const raw = atkStats.power * card.effect.powerMult * terrainMult - defStats.defense;
            return Math.max(0.1, raw);
          }
          return Math.max(0.1, (card.effect.damage ?? 1) * terrainMult);
        };

        if (card.effect.damage !== undefined || card.effect.powerMult !== undefined) {
          const isOwnBase =
            (executor.playerId === 0 && coordinates.q === -6 && coordinates.r === 5) ||
            (executor.playerId === 1 && coordinates.q === 6 && coordinates.r === -5);

          // Multi-target: allEnemiesInRange
          if (card.effect.allEnemiesInRange) {
            const range = card.effect.range ?? 2;
            const enemies = updated.players
              .flatMap(p => p.icons)
              .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range);
            if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
            for (const enemy of enemies) {
              const dmg = computeCardDamage(enemy);
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
                  ...ic,
                  stats: { ...ic.stats, hp: Math.round(Math.max(0, ic.stats.hp - dmg)) },
                  isAlive: ic.stats.hp - dmg > 0,
                  respawnTurns: ic.stats.hp - dmg > 0 ? ic.respawnTurns : 4,
                }),
              }));
              pushLog(updated, `${executor.name} ${card.name} hit ${enemy.name} for ${dmg.toFixed(0)} dmg`, executor.playerId);
            }
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true }),
            }));
            if (card.manaCost > 0) {
              const pid = executor.playerId as 0 | 1;
              const newMana = [...updated.globalMana] as [number, number];
              newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
              updated.globalMana = newMana;
            }
            updated = consumeCardFromHand(updated, card, executor.playerId);
            return { ...updated, baseHealth: updatedBaseHealth, objectives: updatedObjectives, cardTargetingMode: undefined, targetingMode: undefined };
          }

          // Line target: player clicked a direction hex — hit all enemies on that line
          if (card.effect.lineTarget) {
            const range = card.effect.range ?? 4;
            const lineHexes = snapToLineHexes(executor.position, coordinates, range);
            const lineKeys = new Set(lineHexes.map(h => tileKey(h.q, h.r)));
            const enemies = updated.players
              .flatMap(p => p.icons)
              .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && lineKeys.has(tileKey(ic.position.q, ic.position.r)));
            if (enemies.length === 0) { toast.error(getT().messages.noEnemiesOnLine); return prev; }
            for (const enemy of enemies) {
              let dmg = computeCardDamage(enemy);
              // executeDouble: double damage if target is below 50% HP
              if (card.effect.executeDouble && enemy.stats.hp < enemy.stats.maxHp * 0.5) {
                dmg = dmg * 2;
              }
              const newEnemyHp = Math.round(Math.max(0, enemy.stats.hp - dmg));
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
                  ...ic,
                  stats: { ...ic.stats, hp: newEnemyHp },
                  isAlive: newEnemyHp > 0,
                  respawnTurns: newEnemyHp > 0 ? ic.respawnTurns : 4,
                }),
              }));
              const executeLabel = card.effect.executeDouble && enemy.stats.hp < enemy.stats.maxHp * 0.5 ? " (EXECUTE×2)" : "";
              pushLog(updated, `${executor.name} ${card.name} hit ${enemy.name} for ${dmg.toFixed(0)} dmg${executeLabel}`, executor.playerId);
              // Khan's Seal: stun each hit enemy for 1 turn
              if (newEnemyHp > 0 && executor.itemPassiveTags?.includes('genghis_fury_stun')) {
                const stunDebuff: Debuff = { type: 'stun', magnitude: 0, turnsRemaining: 1 };
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
                    ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'stun'), stunDebuff],
                  }),
                }));
                pushLog(updated, `${enemy.name} STUNNED by Khan's Seal!`, executor.playerId);
              }
              // Schallwelle pushback: push each hit enemy along the wave direction
              if (card.effect.pushback && newEnemyHp > 0) {
                const DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
                const dq = enemy.position.q - executor.position.q;
                const dr = enemy.position.r - executor.position.r;
                const dir = DIRS.reduce((best, d) =>
                  (dq * d.q + dr * d.r) > (dq * best.q + dr * best.r) ? d : best
                );
                for (let step = 0; step < card.effect.pushback; step++) {
                  const pushed = updated.players.flatMap(p => p.icons).find(ic => ic.id === enemy.id);
                  if (!pushed || !pushed.isAlive) break;
                  const dest = { q: pushed.position.q + dir.q, r: pushed.position.r + dir.r };
                  const destTile = updated.board.find(t => t.coordinates.q === dest.q && t.coordinates.r === dest.r);
                  const isOccupied = updated.players.flatMap(p => p.icons).some(
                    ic => ic.id !== pushed.id && ic.isAlive && ic.position.q === dest.q && ic.position.r === dest.r
                  );
                  if (!destTile || isOccupied) break;
                  updated.players = updated.players.map(p => ({
                    ...p, icons: p.icons.map(ic => ic.id !== pushed.id ? ic : { ...ic, position: dest }),
                  }));
                }
                pushLog(updated, `${enemy.name} pushed back by Schallwelle!`, executor.playerId);
              }
            }
            // Beethoven Crescendo passive
            if (executor.name.includes("Beethoven") && card.exclusiveTo === "Beethoven") {
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== executorId ? ic : {
                  ...ic, passiveStacks: Math.min(8, (ic.passiveStacks ?? 0) + 1),
                }),
              }));
              const stacks = Math.min(8, (executor.passiveStacks ?? 0) + 1);
              pushLog(updated, `${executor.name} Crescendo: ${stacks}/8 (+${stacks * 3} Power)`, executor.playerId);
            }
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1 }),
            }));
            if (card.manaCost > 0) {
              const pid = executor.playerId as 0 | 1;
              const newMana = [...updated.globalMana] as [number, number];
              newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
              updated.globalMana = newMana;
            }
            updated = consumeCardFromHand(updated, card, executor.playerId);
            return { ...updated, baseHealth: updatedBaseHealth, objectives: updatedObjectives, cardTargetingMode: undefined, targetingMode: undefined };
          }

          const finalDmg = computeCardDamage(targetIcon);
          const multiHit = card.effect.multiHit ?? 1;

          if (targetIcon) {
            if (targetIcon.playerId === executor.playerId) {
              toast.error(getT().messages.cantAttackOwn);
              return prev;
            }
            // Apply multiHit
            let totalDmg = 0;
            let currentHp = targetIcon.stats.hp;
            for (let hit = 0; hit < multiHit; hit++) {
              const hitDmg = computeCardDamage(targetIcon);
              totalDmg += hitDmg;
              currentHp = Math.max(0, currentHp - hitDmg);
            }
            const wasAlive = targetIcon.isAlive;
            // Apply Void Armor on final accumulated damage
            const voidTarget = updated.players.flatMap(p => p.icons).find(i => i.id === targetIcon.id)!;
            const survivedVoid = !voidTarget.voidArmorUsed && voidTarget.itemPassiveTags?.includes('once_survive_lethal') && currentHp <= 0;
            const newHp = survivedVoid ? 1 : currentHp;
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                ...ic,
                stats: { ...ic.stats, hp: newHp },
                isAlive: newHp > 0,
                respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
                voidArmorUsed: survivedVoid ? true : ic.voidArmorUsed,
              }),
            }));
            if (survivedVoid) pushLog(updated, `${targetIcon.name} Void Armor: survived lethal blow at 1 HP!`, targetIcon.playerId);
            updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0);
            const hitLabel = multiHit > 1 ? `${multiHit}×${(totalDmg/multiHit).toFixed(0)}` : totalDmg.toFixed(0);
            pushLog(updated, `${executor.name} played ${card.name} on ${targetIcon.name} for ${hitLabel} dmg`, executor.playerId);

            // Pushback: knock target away from executor
            if (card.effect.pushback && newHp > 0) {
              const DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
              const dq = targetIcon.position.q - executor.position.q;
              const dr = targetIcon.position.r - executor.position.r;
              const dir = DIRS.reduce((best, d) =>
                (dq * d.q + dr * d.r) > (dq * best.q + dr * best.r) ? d : best
              );
              for (let step = 0; step < card.effect.pushback; step++) {
                const pushed = updated.players.flatMap(p => p.icons).find(ic => ic.id === targetIcon.id);
                if (!pushed || !pushed.isAlive) break;
                const dest = { q: pushed.position.q + dir.q, r: pushed.position.r + dir.r };
                const destTile = updated.board.find(t => t.coordinates.q === dest.q && t.coordinates.r === dest.r);
                const isOccupied = updated.players.flatMap(p => p.icons).some(
                  ic => ic.id !== pushed.id && ic.isAlive && ic.position.q === dest.q && ic.position.r === dest.r
                );
                if (!destTile || isOccupied) break;
                if (destTile.terrain.type === 'river') {
                  updated.players = updated.players.map(p => ({
                    ...p,
                    icons: p.icons.map(ic => ic.id !== pushed.id ? ic : {
                      ...ic, position: dest, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4,
                    }),
                  }));
                  pushLog(updated, `${pushed.name} was knocked into the river!`, executor.playerId);
                  break;
                }
                if (destTile.terrain.effects.movementModifier === -999) break; // impassable (mountain, base)
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== pushed.id ? ic : { ...ic, position: dest }),
                }));
                pushLog(updated, `${pushed.name} was pushed back!`, executor.playerId);
              }
            }
            // bleedMult: apply bleed debuff after single-target damage (Mongol Charge)
            if (card.effect.bleedMult !== undefined && newHp > 0) {
              const atkStats = calcEffectiveStats(updated, executor);
              const bleedDmg = Math.round(atkStats.power * card.effect.bleedMult);
              const bleedDebuff: Debuff = { type: 'bleed', magnitude: bleedDmg, turnsRemaining: card.effect.debuffDuration ?? 2 };
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                  ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'bleed'), bleedDebuff],
                }),
              }));
              pushLog(updated, `${targetIcon.name} is Bleeding — ${bleedDmg} HP/turn for ${card.effect.debuffDuration ?? 2} turns`, executor.playerId);
            }
            // aoeDemoralize: apply Demoralize to all enemies adjacent to the primary target (THIS IS SPARTA!)
            if (card.effect.aoeDemoralize) {
              const adjacentEnemies = updated.players
                .flatMap(p => p.icons)
                .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && ic.id !== targetIcon.id && hexDistance(ic.position, targetIcon.position) <= 1);
              const demoDebuff: Debuff = { type: 'demoralize', magnitude: 50, turnsRemaining: 1 };
              for (const adj of adjacentEnemies) {
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== adj.id ? ic : {
                    ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'demoralize'), demoDebuff],
                  }),
                }));
                pushLog(updated, `${adj.name} is Demoralized by THIS IS SPARTA! (1 turn)`, executor.playerId);
              }
            }
          } else {
            if (isOwnBase) { toast.error(getT().messages.cantAttackOwnBase); return prev; }
            const isBase = (coordinates.q === -6 && coordinates.r === 5) || (coordinates.q === 6 && coordinates.r === -5);
            if (isBase) {
              const enemyId = executor.playerId === 0 ? 1 : 0;
              updatedBaseHealth[enemyId] = Math.max(0, state.baseHealth[enemyId] - finalDmg);
              pushLog(updated, `${executor.name} played ${card.name} on enemy base for ${finalDmg.toFixed(0)} dmg`, executor.playerId);
            } else {
              const campIdx = coordinates.q === 0 && coordinates.r === -4 ? 0 : coordinates.q === 0 && coordinates.r === 4 ? 1 : -1;
              if (campIdx !== -1 && executor.playerId !== 0) { toast.error(getT().messages.noTarget); return prev; }
              if (campIdx !== -1 && !state.objectives.beastCamps.defeated[campIdx]) {
                const hpArr = [...state.objectives.beastCamps.hp];
                const defArr = [...state.objectives.beastCamps.defeated];
                hpArr[campIdx] = Math.max(0, hpArr[campIdx] - finalDmg);
                pushLog(updated, `${executor.name} played ${card.name} on camp for ${finalDmg.toFixed(0)} dmg`, executor.playerId);
                if (hpArr[campIdx] <= 0) {
                  defArr[campIdx] = true;
                  updated.board = updated.board.map(tile =>
                    tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
                      ? { ...tile, terrain: { type: "plain", effects: {} } } : tile
                  );
                  const nm = [...updated.teamBuffs.mightBonus];
                  const np = [...updated.teamBuffs.powerBonus];
                  nm[executor.playerId] = Math.min((nm[executor.playerId] ?? 0) + 15, 30);
                  np[executor.playerId] = Math.min((np[executor.playerId] ?? 0) + 15, 30);
                  updated.teamBuffs = { ...updated.teamBuffs, mightBonus: nm, powerBonus: np };
                  toast.success(getT().messages.beastCampDefeated);
                }
                updatedObjectives = { ...updatedObjectives, beastCamps: { ...updatedObjectives.beastCamps, hp: hpArr, defeated: defArr } };
              } else { toast.error(getT().messages.noTarget); return prev; }
            }
          }
        }

        if ((card.effect.healing !== undefined || card.effect.healingMult !== undefined) && !card.effect.selfCast) {
          if (!targetIcon || targetIcon.playerId !== executor.playerId) {
            toast.error(getT().messages.healingAlliesOnly);
            return prev;
          }
          const healAmount = card.effect.healingMult !== undefined
            ? Math.round(calcEffectiveStats(updated, executor).power * card.effect.healingMult)
            : (card.effect.healing ?? 0);
          const newHp = Math.min(targetIcon.stats.maxHp, targetIcon.stats.hp + healAmount);
          // Poison is removed on heal
          const newDebuffs = (targetIcon.debuffs ?? []).filter(d => d.type !== 'poison');
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
              ...ic, stats: { ...ic.stats, hp: newHp }, debuffs: newDebuffs,
            }),
          }));
          pushLog(updated, `${executor.name} played ${card.name} on ${targetIcon.name}, healing ${healAmount} HP`, executor.playerId);
        }

        // Deduct mana from global pool
        if (card.manaCost > 0) {
          const pid = executor.playerId as 0 | 1;
          const newMana = [...updated.globalMana] as [number, number];
          newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
          updated.globalMana = newMana;
        }

        // Set cardUsedThisTurn on executor + increment 3-card counter
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== executorId ? ic : {
            ...ic,
            cardUsedThisTurn: true,
            cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1,
          }),
        }));
        updated = consumeCardFromHand(updated, card, executor.playerId);
        return { ...updated, baseHealth: updatedBaseHealth, objectives: updatedObjectives, cardTargetingMode: undefined, targetingMode: undefined };
      }

      // Use selectedIcon as the active mover/caster; fall back to first alive on active player's team
      const me = state.players[state.activePlayerId]?.icons.find(
        i => (i.id === state.selectedIcon || !state.selectedIcon) && i.isAlive
      ) ?? state.players[state.activePlayerId]?.icons.find(i => i.isAlive);
      if (!me) return prev;

      if (state.gameMode === "singleplayer" && me.playerId === 1) return prev;

      // Targeting path
      if (state.targetingMode) {
        // Use the iconId stored in targetingMode as the caster
        const caster = state.players.flatMap(p => p.icons).find(i => i.id === state.targetingMode!.iconId) ?? me;
        const { range, abilityId } = state.targetingMode;
        if (hexDistance(caster.position, coordinates) > range) return prev;
        if (hasLineMountain(state.board, caster.position, coordinates)) {
          toast.error(getT().messages.mountainBlocksLOS);
          return prev;
        }

        const targetIcon = state.players
          .flatMap((p) => p.icons)
          .find((ic) => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r);

        let updated = state as ExtState;
        let updatedBaseHealth = [...state.baseHealth];
        let updatedObjectives = { ...state.objectives };

        const isOwnBase =
          (caster.playerId === 0 && coordinates.q === -6 && coordinates.r === 5) ||
          (caster.playerId === 1 && coordinates.q === 6 && coordinates.r === -5);

        // Lookup ability (if any)
        const ability = caster.abilities.find((a) => a.id === abilityId);

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
            toast.error(getT().messages.cantTeleport);
            return prev;
          }

          updated.players = updated.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => (ic.id === caster.id ? { ...ic, position: coordinates, movedThisTurn: true } : ic)),
          }));

          const manaCost = ability.manaCost || 0;
          updated.globalMana = updated.globalMana.map((m, idx) => (idx === caster.playerId ? Math.max(0, m - manaCost) : m)) as any;

          updated.players = updated.players.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => (ic.id === caster.id ? { ...ic, cardUsedThisTurn: true } : ic)),
          }));

          pushLog(updated, `${caster.name} used ${ability.name} to teleport`, caster.playerId);
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
            if (targetIcon.playerId === caster.playerId) {
              toast.error(getT().messages.cantAttackOwn2);
              return prev;
            }
            const dmg = resolveBasicAttackDamage(updated, caster, targetIcon);
            pushLog(updated, `${caster.name} basic-attacked ${targetIcon.name} for ${dmg.toFixed(0)} dmg`, caster.playerId);

            const wasAlive = targetIcon.isAlive;
            updated.players = updated.players.map((player) => ({
              ...player,
              icons: player.icons.map((ic) =>
                ic.id !== targetIcon.id ? ic
                  : applyDmgToIcon(ic, dmg, updated, msg => pushLog(updated, msg, caster.playerId))
              ),
            }));
            const updatedTarget = updated.players.flatMap(p => p.icons).find(i => i.id === targetIcon.id);
            const newBasicHp = updatedTarget?.stats.hp ?? 0;
            updated = applyKillPassives(updated, caster.id, wasAlive, newBasicHp <= 0);
          } else {
            if (isOwnBase) {
              toast.error(getT().messages.cantAttackOwnBase2);
              return prev;
            }
            const envDamage = Math.max(0.1, calcEffectiveStats(updated, caster).might);

            const isBase =
              (coordinates.q === -6 && coordinates.r === 5) ||
              (coordinates.q === 6 && coordinates.r === -5);
            if (isBase) {
              const enemyId = caster.playerId === 0 ? 1 : 0;
              updatedBaseHealth[enemyId] = Math.max(0, state.baseHealth[enemyId] - envDamage);
              pushLog(updated, `${caster.name} hit the enemy base for ${envDamage.toFixed(0)} dmg`, caster.playerId);
            } else {
              const campIndex = coordinates.q === 0 && coordinates.r === -4 ? 0 : coordinates.q === 0 && coordinates.r === 4 ? 1 : -1;
              if (campIndex !== -1 && caster.playerId !== 0) { return prev; }
              if (campIndex !== -1 && !state.objectives.beastCamps.defeated[campIndex]) {
                const newHp = Math.max(0, state.objectives.beastCamps.hp[campIndex] - envDamage);
                const hpArr = [...state.objectives.beastCamps.hp];
                const defArr = [...state.objectives.beastCamps.defeated];
                hpArr[campIndex] = newHp;
                pushLog(updated, `${caster.name} hit a beast camp for ${envDamage.toFixed(0)} dmg`, caster.playerId);

                if (newHp <= 0 && !defArr[campIndex]) {
                  defArr[campIndex] = true;
                  updated.board = updated.board.map((tile) =>
                    tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
                      ? { ...tile, terrain: { type: "plain", effects: {} } }
                      : tile
                  );
                  const newM = [...updated.teamBuffs.mightBonus];
                  const newP = [...updated.teamBuffs.powerBonus];
                  newM[caster.playerId] = Math.min((newM[caster.playerId] ?? 0) + 15, 30);
                  newP[caster.playerId] = Math.min((newP[caster.playerId] ?? 0) + 15, 30);
                  updated.teamBuffs = { mightBonus: newM, powerBonus: newP, homeBaseBonus: updated.teamBuffs.homeBaseBonus ?? [0, 0] };
                  toast.success(getT().messages.beastCampDefeated2);
                  pushLog(updated, `Beast camp defeated! Team +15% Might & Power`, caster.playerId);
                }
                updatedObjectives = { ...updatedObjectives, beastCamps: { ...updatedObjectives.beastCamps, hp: hpArr, defeated: defArr } };
              } else {
                toast.error(getT().messages.noTargetToAttack);
                return prev;
              }
            }
          }
        } else {
          // ABILITY path (unit/env or heal)
          if (!ability) return prev;

          if ((ability as any).teamDefBuff && typeof (ability as any).teamDefBuff === 'number') {
            // Team defense buff (e.g. Spartan Wall)
            const buffVal = (ability as any).teamDefBuff as number;
            updated.players = updated.players.map((p, pid) => {
              if (pid !== caster.playerId) return p;
              return {
                ...p,
                icons: p.icons.map(ic => {
                  if (!ic.isAlive) return ic;
                  if (hexDistance(caster.position, ic.position) > (ability.range ?? 2) && ic.id !== caster.id) return ic;
                  return { ...ic, cardBuffDef: (ic.cardBuffDef ?? 0) + buffVal };
                }),
              };
            });
            pushLog(updated, `${caster.name} used ${ability.name} — +${buffVal} DEF to nearby allies!`, caster.playerId);
          } else if (typeof (ability as any).healing === "number" && (ability as any).healing > 0) {
            if (!targetIcon || targetIcon.playerId !== caster.playerId) {
              toast.error(getT().messages.healingAlliesOnly2);
              return prev;
            }
            const heal = (ability as any).healing as number;
            updated.players = updated.players.map((player) => ({
              ...player,
              icons: player.icons.map((ic) =>
                ic.id !== targetIcon.id
                  ? ic
                  : { ...ic, stats: { ...ic.stats, hp: Math.round(Math.min(ic.stats.maxHp, ic.stats.hp + heal)) } }
              ),
            }));
            pushLog(updated, `${caster.name} cast ${ability.name} on ${targetIcon.name}, healing ${heal} HP`, caster.playerId);
          } else if ((ability as any).scalingAoE) {
            // Horde Tactics: Power × perEnemyMult × enemyCount to ALL enemies in range
            const perEnemyMult = (ability as any).perEnemyMult as number ?? 0.5;
            const casterStats = calcEffectiveStats(updated, caster);
            const enemiesInRange = updated.players
              .flatMap(p => p.icons)
              .filter(ic => ic.isAlive && ic.playerId !== caster.playerId && hexDistance(caster.position, ic.position) <= (ability.range ?? 2));
            const enemyCount = enemiesInRange.length;
            if (enemyCount === 0) { toast.error(getT().messages.noTargetToHit); return prev; }
            const scaledMult = perEnemyMult * enemyCount;
            for (const enemy of enemiesInRange) {
              const enemyStats = calcEffectiveStats(updated, enemy);
              const dmg = Math.max(0.1, casterStats.power * scaledMult - enemyStats.defense);
              updated.players = updated.players.map(player => ({
                ...player,
                icons: player.icons.map(ic =>
                  ic.id !== enemy.id ? ic : {
                    ...ic,
                    stats: { ...ic.stats, hp: Math.round(Math.max(0, ic.stats.hp - dmg)) },
                    isAlive: ic.stats.hp - dmg > 0,
                    respawnTurns: ic.stats.hp - dmg > 0 ? ic.respawnTurns : 4,
                  }
                ),
              }));
              pushLog(updated, `${caster.name} Horde Tactics hit ${enemy.name} for ${dmg.toFixed(0)} dmg (${enemyCount} targets × ${perEnemyMult})`, caster.playerId);
            }
          } else if ((ability as any).summonTerracotta) {
            // ── Huang-chan Ability 1: Terracotta Legion ──────────────────────────
            const occupied = updated.players.flatMap(p => p.icons).some(
              ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
            );
            if (occupied) { toast.error(getT().messages.tileOccupied); return prev; }
            const tile = updated.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
            if (!tile || tile.terrain.effects.movementModifier === -999) { toast.error(getT().messages.cantTeleport); return prev; }
            const isArcher = Math.random() < 0.5;
            const casterStats = calcEffectiveStats(updated, caster);
            const terracottaUnit: Icon = {
              id: `terracotta_${makeId()}`,
              name: isArcher ? "Terracotta Archer" : "Terracotta Warrior",
              role: isArcher ? "dps_ranged" : "dps_melee",
              stats: {
                hp: 40, maxHp: 40,
                moveRange: 2, speed: 4,
                might: isArcher ? Math.round(casterStats.might * 1.5) : casterStats.might,
                power: 0,
                defense: casterStats.defense,
                movement: 2, mana: 0, maxMana: 0,
                attackRange: isArcher ? 2 : 1,
              },
              abilities: [],
              passive: "Terracotta",
              position: coordinates,
              playerId: caster.playerId,
              isAlive: true,
              respawnTurns: 0,
              cardUsedThisTurn: false,
              movedThisTurn: false,
              hasUltimate: false,
              ultimateUsed: true,
              droneExpiresTurn: updated.currentTurn + 2,
            };
            updated.players = updated.players.map(p =>
              p.id !== caster.playerId ? p : { ...p, icons: [...p.icons, terracottaUnit] }
            );
            pushLog(updated, `${caster.name} summoned a ${terracottaUnit.name}!`, caster.playerId);
            // Inject 1 Basic Attack card so the terracotta unit can use it
            const baDef2 = CARD_DEFS.find((d: any) => d.definitionId === 'shared_basic_attack');
            if (baDef2) {
              const baCard2 = instantiateCard(baDef2 as any);
              const baHandArr2 = (updated as any).hands;
              const baPid2 = caster.playerId as 0 | 1;
              if (baHandArr2?.[baPid2]) {
                (updated as any).hands = [...baHandArr2];
                (updated as any).hands[baPid2] = { ...baHandArr2[baPid2], cards: [...baHandArr2[baPid2].cards, baCard2] };
              }
            }
          } else if ((ability as any).summonCavalry) {
            // ── Huang-chan Ability 2: First Emperor's Command ────────────────────
            const occupied = updated.players.flatMap(p => p.icons).some(
              ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
            );
            if (occupied) { toast.error(getT().messages.tileOccupied); return prev; }
            const tile = updated.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
            if (!tile || tile.terrain.effects.movementModifier === -999) { toast.error(getT().messages.cantTeleport); return prev; }
            const cavCasterStats = calcEffectiveStats(updated, caster);
            const cavalryUnit: Icon = {
              id: `terracotta_cav_${makeId()}`,
              name: "Terracotta Cavalry",
              role: "dps_melee",
              stats: {
                hp: 60, maxHp: 60,
                moveRange: 3, speed: 7,
                might: Math.round(cavCasterStats.might * 1.5),
                power: cavCasterStats.power,
                defense: Math.round(cavCasterStats.defense * 1.5),
                movement: 3, mana: 0, maxMana: 0,
                attackRange: 1,
              },
              abilities: [],
              passive: "Terracotta",
              position: coordinates,
              playerId: caster.playerId,
              isAlive: true,
              respawnTurns: 0,
              cardUsedThisTurn: false,
              movedThisTurn: false,
              hasUltimate: false,
              ultimateUsed: true,
              droneExpiresTurn: updated.currentTurn + 2,
            };
            updated.players = updated.players.map(p =>
              p.id !== caster.playerId ? p : { ...p, icons: [...p.icons, cavalryUnit] }
            );
            // Inject free Cavalry Charge card into caster's hand
            const pid = caster.playerId as 0 | 1;
            const chargeDef = CARD_DEFS.find((d: any) => d.definitionId === 'huang_cavalry_charge');
            if (chargeDef) {
              const chargeCard = { ...instantiateCard(chargeDef), manaCost: 0 };
              const handArr = (updated as any).hands;
              if (handArr?.[pid]) {
                (updated as any).hands = [...handArr];
                (updated as any).hands[pid] = { ...handArr[pid], cards: [...handArr[pid].cards, chargeCard] };
              }
            }
            pushLog(updated, `${caster.name} summoned Terracotta Cavalry and gained a free Cavalry Charge!`, caster.playerId);
          } else if ((ability as any).controlEnemy) {
            // ── Huang-chan Ultimate: Eternal Army ────────────────────────────────
            if (!targetIcon || targetIcon.playerId === caster.playerId) {
              toast.error(getT().messages.mustTargetEnemy);
              return prev;
            }
            // Exclude bosses and named mini-bosses (Iron Wall, Twin Terror, Znyxorga)
            const isBossTarget = targetIcon.name.includes("Iron Wall") || targetIcon.name.includes("Twin Terror") ||
              targetIcon.name.includes("Terror Alpha") || targetIcon.name.includes("Terror Beta") ||
              targetIcon.name.includes("Znyxorga");
            if (isBossTarget) {
              toast.error("Cannot control a boss or mini-boss unit!");
              return prev;
            }
            if (targetIcon.terracottaControlled) {
              toast.error("This unit is already controlled!");
              return prev;
            }
            const controlDuration = (ability as any).controlDuration ?? 2;
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic =>
                ic.id !== targetIcon.id ? ic : {
                  ...ic,
                  terracottaControlled: true,
                  controlledByPlayer: caster.playerId,
                  controlExpiresTurn: updated.currentTurn + controlDuration,
                  // Switch playerId so it acts with player's team
                  playerId: caster.playerId,
                }
              ),
            }));
            updated.players = updated.players.map((p) => ({
              ...p,
              icons: p.icons.map((ic) => (ic.id === caster.id ? { ...ic, ultimateUsed: true } : ic)),
            }));
            pushLog(updated, `${caster.name} ETERNAL ARMY — ${targetIcon.name} is now under your control for ${controlDuration} turns!`, caster.playerId);
          } else if (typeof (ability as any).damage === "number") {
            if (targetIcon) {
              let dmg = (ability as any).damage > 0 ? (ability as any).damage : resolveAbilityDamage(updated, caster, targetIcon, (ability as any).powerMult ?? 1.0);
              // Rider's Fury execute: double damage if target below 50% HP
              if ((ability as any).executeDouble && targetIcon.stats.hp < targetIcon.stats.maxHp * 0.5) {
                dmg *= 2;
                pushLog(updated, `EXECUTE! ${targetIcon.name} below 50% HP — Rider's Fury damage doubled!`, caster.playerId);
              }
              updated.players = updated.players.map((player) => ({
                ...player,
                icons: player.icons.map((ic) =>
                  ic.id !== targetIcon.id
                    ? ic
                    : {
                      ...ic,
                      stats: { ...ic.stats, hp: Math.round(Math.max(0, ic.stats.hp - dmg)) },
                      isAlive: ic.stats.hp - dmg > 0,
                      respawnTurns: ic.stats.hp - dmg > 0 ? ic.respawnTurns : 4,
                    }
                ),
              }));
              pushLog(updated, `${caster.name} cast ${ability.name} on ${targetIcon.name} for ${dmg.toFixed(0)} dmg`, caster.playerId);
              // Mongol Charge bleed: apply bleed debuff after damage
              if ((ability as any).bleedMult !== undefined) {
                const bleedDmg = Math.round(calcEffectiveStats(updated, caster).power * (ability as any).bleedMult);
                const bleedDebuff = { type: 'bleed' as const, magnitude: bleedDmg, turnsRemaining: 2 };
                updated.players = updated.players.map(player => ({
                  ...player,
                  icons: player.icons.map(ic =>
                    ic.id !== targetIcon.id ? ic : {
                      ...ic,
                      debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'bleed'), bleedDebuff],
                    }
                  ),
                }));
                pushLog(updated, `${targetIcon.name} is Bleeding — ${bleedDmg} HP per turn for 2 turns`, caster.playerId);
              }
            } else {
              if (isOwnBase) {
                toast.error(getT().messages.cantAttackOwnBase2);
                return prev;
              }
              const envDamage = Math.max(0.1, calcEffectiveStats(updated, caster).power);

              const isBase =
                (coordinates.q === -6 && coordinates.r === 5) ||
                (coordinates.q === 6 && coordinates.r === -5);
              if (isBase) {
                const enemyId = caster.playerId === 0 ? 1 : 0;
                updatedBaseHealth[enemyId] = Math.max(0, state.baseHealth[enemyId] - envDamage);
                pushLog(updated, `${caster.name} used ${ability.name} on the enemy base for ${envDamage.toFixed(0)} dmg`, caster.playerId);
              } else {
                const campIndex = coordinates.q === 0 && coordinates.r === -4 ? 0 : coordinates.q === 0 && coordinates.r === 4 ? 1 : -1;
                if (campIndex !== -1 && caster.playerId !== 0) { return prev; }
                if (campIndex !== -1 && !state.objectives.beastCamps.defeated[campIndex]) {
                  const newHp = Math.max(0, state.objectives.beastCamps.hp[campIndex] - envDamage);
                  const hpArr = [...state.objectives.beastCamps.hp];
                  const defArr = [...state.objectives.beastCamps.defeated];
                  hpArr[campIndex] = newHp;
                  pushLog(updated, `${caster.name} used ${ability.name} on a camp for ${envDamage.toFixed(0)} dmg`, caster.playerId);

                  if (newHp <= 0 && !defArr[campIndex]) {
                    defArr[campIndex] = true;
                    updated.board = updated.board.map((tile) =>
                      tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
                        ? { ...tile, terrain: { type: "plain", effects: {} } }
                        : tile
                    );
                    const newM = [...updated.teamBuffs.mightBonus];
                    const newP = [...updated.teamBuffs.powerBonus];
                    newM[caster.playerId] = Math.min((newM[caster.playerId] ?? 0) + 15, 30);
                    newP[caster.playerId] = Math.min((newP[caster.playerId] ?? 0) + 15, 30);
                    updated.teamBuffs = { mightBonus: newM, powerBonus: newP, homeBaseBonus: updated.teamBuffs.homeBaseBonus ?? [0, 0] };
                    toast.success(getT().messages.beastCampDefeated2);
                    pushLog(updated, `Beast camp defeated! Team +15% Might & Power`, caster.playerId);
                  }
                  updatedObjectives = { ...updatedObjectives, beastCamps: { ...updatedObjectives.beastCamps, hp: hpArr, defeated: defArr } };
                } else {
                  toast.error(getT().messages.noTargetToHit);
                  return prev;
                }
              }
            }

            if (ability.id === "ultimate") {
              updated.players = updated.players.map((p) => ({
                ...p,
                icons: p.icons.map((ic) => (ic.id === caster.id ? { ...ic, ultimateUsed: true } : ic)),
              }));
            }
          } else {
            // non-dmg, non-heal handled as "cast" / buff skills if you add them later
          }
        }

        // Consume mana if ability (not basic) and mark action used
        const manaCost =
          state.targetingMode.abilityId === "basic_attack"
            ? 0
            : caster.abilities.find((a) => a.id === state.targetingMode.abilityId)?.manaCost || 0;

        updated.players = updated.players.map((p) => ({
          ...p,
          icons: p.icons.map((ic) => (ic.id === caster.id ? { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1 } : ic)),
        }));
        updated.globalMana = updated.globalMana.map((m, idx) => (idx === caster.playerId ? Math.max(0, m - manaCost) : m)) as any;

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
      if (clicked && clicked.playerId === state.activePlayerId) {
        return { ...state, selectedIcon: clicked.id };
      }

      const dest = state.board.find((t) => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
      if (!dest) return prev;
      if (dest.terrain.effects.movementModifier === -999) {
        // Sun-sin (Turtle Ship passive) can enter river tiles
        if (me.name.includes("Sun-sin") && dest.terrain.type === 'river') {
          // allow — don't return
        } else {
          return prev;
        }
      }

      // Block movement onto tiles occupied by alive icons only
      const occupied = state.players.flatMap((p) => p.icons).some(
        (ic) => ic.isAlive && ic.id !== me.id && ic.position.q === coordinates.q && ic.position.r === coordinates.r
      );
      if (occupied) return prev;

      // Sun-sin already on a river: cap movement budget to 1 (Turtle Ship passive)
      const alreadyOnRiver = me.name.includes("Sun-sin") &&
        state.board.find(t => t.coordinates.q === me.position.q && t.coordinates.r === me.position.r)?.terrain.type === 'river';
      const effectiveMovement = alreadyOnRiver ? Math.min(1, me.stats.movement) : me.stats.movement;
      const budget = Math.min(effectiveMovement, me.stats.moveRange);
      const occupiedKeys = new Set(
        state.players.flatMap((p) => p.icons)
          // Only alive icons block movement; dead units free their tile immediately
          .filter((ic) => ic.id !== me.id && ic.isAlive)
          .map((ic) => tileKey(ic.position.q, ic.position.r))
      );
      const allowRiver = me.name.includes("Sun-sin");
      const costMap = reachableWithCosts(state.board, me.position, budget, occupiedKeys, allowRiver);
      const destKey = tileKey(coordinates.q, coordinates.r);
      const moveCost = costMap.get(destKey);
      if (moveCost === undefined) return prev;

      const from = { ...me.position };
      const movementStack = { ...(state.movementStack ?? {}) };
      const stack = movementStack[me.id] ?? [];
      stack.push({ from, to: coordinates, cost: moveCost });
      movementStack[me.id] = stack;
      if (me.justRespawned) return prev; // Can't move on turn they spawn
      const landingOnRiver = me.name.includes("Sun-sin") && dest.terrain.type === 'river';
      const landingOnLand  = me.name.includes("Sun-sin") && dest.terrain.type !== 'river';
      state.players = state.players.map((p) => ({
        ...p,
        icons: p.icons.map((ic) =>
          ic.id === me.id
            ? {
              ...ic,
              position: coordinates,
              movedThisTurn: true,
              stats: {
                ...ic.stats,
                // Sun-sin: cap remaining movement to 1 when stepping onto river, restore to moveRange when leaving
                movement: (() => {
                  const zoneBonus = (state.activeZones ?? []).find(
                    z => z.ownerId === me.playerId && hexDistance(coordinates, z.center) <= z.radius
                  )?.magnitude ?? 0;
                  return landingOnRiver
                    ? Math.min(1, Math.max(0, ic.stats.movement - moveCost))
                    : Math.max(0, ic.stats.movement - moveCost + zoneBonus);
                })(),
              },
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
      // Use selectedIcon if set, else first alive on active player's team
      const me = prev.players[prev.activePlayerId]?.icons.find(
        i => (prev.selectedIcon ? i.id === prev.selectedIcon : true) && i.isAlive
      ) ?? prev.players[prev.activePlayerId]?.icons.find(i => i.isAlive);
      if (!me || me.cardUsedThisTurn) return prev;
      if (prev.gameMode === "singleplayer" && me.playerId === 1) return prev;

      // Toggle off if already targeting this ability for this icon
      if (prev.targetingMode?.abilityId === abilityId && prev.targetingMode.iconId === me.id) {
        return { ...prev, targetingMode: undefined };
      }

      const ability = me.abilities.find((a) => a.id === abilityId);
      if (!ability) return prev;
      if (abilityId === "ultimate" && me.ultimateUsed) return prev;

      if (prev.globalMana[me.playerId] < (ability.manaCost ?? 0)) {
        toast.error(getT().messages.notEnoughMana);
        return prev;
      }

      return { ...prev, targetingMode: { abilityId, iconId: me.id, range: ability.range } };
    });
  }, []);

  const basicAttack = useCallback(() => {
    setGameState((prev) => {
      const me = prev.players[prev.activePlayerId]?.icons.find(
        i => (prev.selectedIcon ? i.id === prev.selectedIcon : true) && i.isAlive
      ) ?? prev.players[prev.activePlayerId]?.icons.find(i => i.isAlive);
      if (!me || me.cardUsedThisTurn) return prev;
      if (prev.gameMode === "singleplayer" && me.playerId === 1) return prev;

      // Toggle off if already targeting basic for this icon
      if (prev.targetingMode?.abilityId === "basic_attack" && prev.targetingMode.iconId === me.id) {
        return { ...prev, targetingMode: undefined };
      }

      // Napoleon Vantage Point passive: basic attack range 3 on forest (no DEF bonus trade-off)
      const onForest = prev.board.find(t => t.coordinates.q === me.position.q && t.coordinates.r === me.position.r)?.terrain.type === "forest";
      const onRiver = prev.board.find(t => t.coordinates.q === me.position.q && t.coordinates.r === me.position.r)?.terrain.type === "river";
      const isRanged = me.name.includes("Napoleon") || me.name.includes("Da Vinci");
      const range = me.name.includes("Napoleon") && onForest ? 3
        : me.name.includes("Sun-sin") && onRiver ? 3
        : isRanged ? 2
        : (me.stats.attackRange ?? 1);
      return { ...prev, targetingMode: { abilityId: "basic_attack", iconId: me.id, range } };
    });
  }, []);

  /* =========================
     End Turn — robust boundary + respawn at boundary only
     ========================= */
  const endTurn = useCallback(() => {
    setGameState((prev) => {
      const nextPlayer: 0 | 1 = prev.activePlayerId === 0 ? 1 : 0;

      // Crystal adjacency helper
      const crystalTile = prev.board.find(t => t.terrain.type === "mana_crystal");
      const hexDistFn = (a: {q:number;r:number}, b: {q:number;r:number}) => {
        const ax = a.q, az = a.r, ay = -ax - az;
        const bx = b.q, bz = b.r, by = -bx - bz;
        return (Math.abs(ax-bx) + Math.abs(ay-by) + Math.abs(az-bz)) / 2;
      };

      // Reset icons for the player who just ended + clear buffs for starting player
      const resetPlayers = prev.players.map((player) => ({
        ...player,
        icons: player.icons.map((ic) => {
          if (ic.playerId === prev.activePlayerId) {
            return {
              ...ic,
              movedThisTurn: false,
              cardUsedThisTurn: false,
              cardsUsedThisTurn: 0,
              justRespawned: false,
            };
          }
          if (ic.playerId === nextPlayer) {
            // Starting player: clear buffs, reset movement (account for mud_throw debuff)
            const mudThrow = ic.debuffs?.find(d => d.type === 'mud_throw');
            const moveReduction = mudThrow ? mudThrow.magnitude : 0;
            // Demoralize: 50% chance to freeze unit (no movement, no card plays)
            const isDemoralized = ic.isAlive && ic.debuffs?.some(d => d.type === 'demoralize');
            const demoSkip = isDemoralized && Math.random() < 0.5;
            if (demoSkip) pushLog(prev as any, `${ic.name} is Demoralized — frozen this turn! (cannot move or play cards)`, nextPlayer);
            // Stun: guaranteed full freeze (no movement, no cards, no actions)
            const isStunned = ic.isAlive && ic.debuffs?.some(d => d.type === 'stun');
            if (isStunned) pushLog(prev as any, `${ic.name} is STUNNED — cannot act this turn!`, nextPlayer);
            // Sun-sin Turtle Ship: on river tile, movement capped at 1
            const sunsinOnRiver = ic.name.includes("Sun-sin") && ic.isAlive &&
              prev.board.find(t => t.coordinates.q === ic.position.q && t.coordinates.r === ic.position.r)?.terrain.type === 'river';
            const frozen = demoSkip || isStunned;
            // Freudenspur zone bonus at turn start (lifts water cap for Sun-sin when in zone)
            const sunsinZoneBonus = (sunsinOnRiver && !frozen)
              ? (prev.activeZones ?? []).reduce((sum, z) => {
                  if (z.ownerId === nextPlayer && ic.isAlive && hexDistance(ic.position, z.center) <= z.radius) {
                    return sum + z.magnitude;
                  }
                  return sum;
                }, 0)
              : 0;
            const baseMove = frozen ? 0 : Math.max(0, ic.stats.moveRange - moveReduction);
            const finalMove = baseMove;
            return {
              ...ic,
              cardBuffAtk: 0,
              cardBuffDef: 0,
              cardsUsedThisTurn: frozen ? 3 : 0,
              movedThisTurn: frozen ? true : false,
              stats: { ...ic.stats, movement: sunsinOnRiver ? Math.min(1 + sunsinZoneBonus, finalMove + sunsinZoneBonus) : finalMove },
            };
          }
          return ic;
        }),
      }));

      // Global mana refill for next player — base 5, +1 if any ally adjacent to crystal, +2 if all allies adjacent
      const nextPlayerIcons = resetPlayers.find(p => p.id === nextPlayer)?.icons.filter(ic => ic.isAlive) ?? [];
      const crystalAdjCount = crystalTile
        ? nextPlayerIcons.filter(ic => hexDistFn(ic.position, crystalTile.coordinates) === 1).length
        : 0;
      const crystalBonus = crystalAdjCount === nextPlayerIcons.length && nextPlayerIcons.length > 0 ? 2 : crystalAdjCount > 0 ? 1 : 0;
      const nextMana = 5 + crystalBonus;
      const mana = [...prev.globalMana] as [number, number];
      mana[nextPlayer] = nextMana;
      const maxMana = [...(prev.globalMaxMana ?? [5, 5])] as [number, number];
      maxMana[nextPlayer] = nextMana;

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
            // Respawn if: dead, countdown at 0, base still alive
            if (!ic.isAlive && ic.respawnTurns === 0) {
              // In roguelike runs: player 0 characters never respawn (permadeath)
              if ((prev as ExtState).isRoguelikeRun && player.id === 0) return ic;
              // Enemies only respawn in destroy_base objective
              if (player.id === 1 && (prev as ExtState).encounterObjective !== 'destroy_base') return ic;
              const baseAlive = (prev.baseHealth[player.id] ?? 0) > 0;
              if (!baseAlive) return ic;
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
                  respawnTurns: -1, // sentinel: already handled
                };
              }
            }
            return ic;
          }),
        }));
      }

      // River kill: any character standing on a river tile at end of turn drowns (Sun-sin is immune)
      let boardAfter = [...prev.board];
      let floodIsActive = !!(prev as any).floodActive;
      let laserGridStruckIds: string[] = [];
      let forestFireIsActive = !!(prev as any).forestFireActive;
      let burningForestTiles: string[] = [...((prev as any).burningForestTiles ?? [])];
      let pendingLaserTiles: string[] = [...((prev as any).pendingLaserTiles ?? [])];
      let pendingFloodCountdown: number | undefined = (prev as any).pendingFloodCountdown as number | undefined;
      let pendingFireCountdown: number | undefined = (prev as any).pendingFireCountdown as number | undefined;
      let pendingFireStartTile: string | undefined = (prev as any).pendingFireStartTile as string | undefined;
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive) return ic;
          const tile = boardAfter.find(t => t.coordinates.q === ic.position.q && t.coordinates.r === ic.position.r);
          if (tile?.terrain.type === 'river' && !ic.name.includes("Sun-sin")) {
            pushLog({ ...prev, players: playersAfter } as any, `${ic.name} drowned in the river!`, ic.playerId);
            return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 };
          }
          return ic;
        }),
      }));

      // Remove expired drones / terracotta warriors (droneExpiresTurn used for both)
      const newCurrentTurn = nextPlayer === 0 ? prev.currentTurn + 1 : prev.currentTurn;
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.filter(ic => !ic.droneExpiresTurn || ic.droneExpiresTurn > newCurrentTurn),
      }));

      // Expire controlled enemy units (Eternal Army) — return them to enemy team
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.terracottaControlled) return ic;
          if (ic.controlExpiresTurn !== undefined && ic.controlExpiresTurn <= newCurrentTurn) {
            // Return to enemy (player 1 in singleplayer)
            const originalPlayer = ic.controlledByPlayer === 0 ? 1 : 0;
            pushLog(prev as any, `${ic.name} breaks free from Eternal Army control!`, originalPlayer);
            return {
              ...ic,
              terracottaControlled: false,
              controlledByPlayer: undefined,
              controlExpiresTurn: undefined,
              playerId: originalPlayer,
            };
          }
          return ic;
        }),
      }));

      // ── Arena Events (single-player runs only, starting turn 3, ~35% chance per round) ──
      const extPrevArena = prev as ExtState;
      // Carry previous event forward for 2 endTurn cycles so the banner persists through the AI turn
      const prevArenaEvent = (extPrevArena as any).arenaEvent ?? null;
      const prevArenaEventAge: number = (extPrevArena as any).arenaEventAge ?? 0;
      let arenaEvent: import('@/types/game').ArenaEventDef | null =
        (prevArenaEvent && prevArenaEventAge < 2) ? prevArenaEvent : null;
      let arenaEventAge: number = arenaEvent ? prevArenaEventAge + 1 : 0;
      let gravityCrushSaved: Record<string, number> | undefined = (extPrevArena as any).gravityCrushSaved;

      // Restore movement stats when gravity_crush expires
      if (prevArenaEvent?.id === 'gravity_crush' && prevArenaEventAge >= 2 && gravityCrushSaved) {
        playersAfter = playersAfter.map(p => ({
          ...p,
          icons: p.icons.map(ic => {
            const origRange = gravityCrushSaved![ic.id];
            if (origRange === undefined) return ic;
            return { ...ic, stats: { ...ic.stats, moveRange: origRange, movement: origRange } };
          }),
        }));
        gravityCrushSaved = undefined;
      }
      if (extPrevArena.isRoguelikeRun && nextPlayer === 0 && newCurrentTurn >= 3) {
        // Tick down flood/fire countdowns and activate when they reach 0
        if (pendingFloodCountdown !== undefined && pendingFloodCountdown > 0) {
          pendingFloodCountdown--;
          if (pendingFloodCountdown === 0) {
            floodIsActive = true;
            pendingFloodCountdown = undefined;
            pushLog(prev as any, `🌊 ALIEN TIDE HAS BEGUN — river tiles will spread each turn!`, 0);
          } else {
            pushLog(prev as any, `🌊 ALIEN TIDE WARNING — flooding begins in ${pendingFloodCountdown} turn(s)!`, 0);
          }
        }
        if (pendingFireCountdown !== undefined && pendingFireCountdown > 0) {
          pendingFireCountdown--;
          if (pendingFireCountdown === 0) {
            forestFireIsActive = true;
            if (pendingFireStartTile) burningForestTiles = [pendingFireStartTile];
            pendingFireStartTile = undefined;
            pendingFireCountdown = undefined;
            pushLog(prev as any, `🔥 FOREST FIRE HAS IGNITED — fire will spread each turn!`, 0);
          } else {
            pushLog(prev as any, `🔥 FOREST FIRE WARNING — ignition in ${pendingFireCountdown} turn(s)! Move off forest tiles!`, 0);
          }
        }

        // Fire pending laser tiles from last turn's warning
        if (pendingLaserTiles.length > 0) {
          const struckIds: string[] = [];
          playersAfter = playersAfter.map(p => ({
            ...p,
            icons: p.icons.map(ic => {
              if (!ic.isAlive) return ic;
              const key = `${ic.position.q},${ic.position.r}`;
              if (!pendingLaserTiles.includes(key)) return ic;
              const newHp = Math.max(0, ic.stats.hp - 40); // pure damage, ignores DEF
              struckIds.push(ic.id);
              pushLog(prev as any, `⚡ ${ic.name} is struck by the Laser Grid! (−40 pure dmg)`, ic.playerId);
              if (newHp <= 0) return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 };
              return { ...ic, stats: { ...ic.stats, hp: newHp } };
            }),
          }));
          if (struckIds.length > 0) laserGridStruckIds = struckIds;
          pendingLaserTiles = []; // clear warning
        }

        if (Math.random() < 0.35) {
          const ALL_EVENTS: import('@/types/game').ArenaEventDef[] = [
            { id: 'gravity_surge', name: 'Gravity Surge',  icon: '🌀', description: 'Gravitational anomaly! All units gain +2 Movement this round.' },
            { id: 'mana_surge',    name: 'Mana Surge',     icon: '💎', description: 'Mana wells overflow! Both teams gain +2 bonus mana.' },
            { id: 'forest_fire',   name: 'Forest Fire',    icon: '🔥', description: '⚠ INCOMING in 2 turns — a forest tile will ignite and spread 50%/turn. Units on burning forest take 30 pure damage. Permanent!' },
            { id: 'laser_grid',    name: 'Laser Grid',     icon: '⚡', description: 'Znyxorga targets 10 random tiles — marked in gold. NEXT TURN those tiles fire 40 pure damage. Move your units now!' },
            { id: 'alien_tide',    name: 'Alien Tide',     icon: '🌊', description: '⚠ INCOMING in 2 turns — river tiles will spread 50%/turn. Move off low ground. Permanent!' },
            { id: 'gravity_well',  name: 'Gravity Well',   icon: '⬇️', description: 'A gravity well forms at the center! All units are pulled 2 hexes toward the arena\'s heart.' },
            { id: 'gravity_crush', name: 'Gravity Crush',  icon: '🪨', description: 'Intense gravity crushes the arena! All unit movement is halved this round.' },
          ];
          // Don't roll events that are already active or already pending
          const eligibleEvents = ALL_EVENTS.filter(e => {
            if (e.id === 'alien_tide' && (floodIsActive || pendingFloodCountdown !== undefined)) return false;
            if (e.id === 'forest_fire' && (forestFireIsActive || pendingFireCountdown !== undefined)) return false;
            return true;
          });
          if (eligibleEvents.length === 0) { /* all permanent events already active */ }
          else {
          arenaEvent = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
          arenaEventAge = 0; // Reset age so new event stays visible for 2 full turns
          pushLog(prev as any, `🌌 ARENA EVENT: ${arenaEvent.name} — ${arenaEvent.description}`, 0);

          if (arenaEvent.id === 'gravity_surge') {
            playersAfter = playersAfter.map(p => ({
              ...p,
              icons: p.icons.map(ic => !ic.isAlive ? ic : {
                ...ic, stats: { ...ic.stats, movement: ic.stats.movement + 2 },
              }),
            }));
          } else if (arenaEvent.id === 'mana_surge') {
            mana[0] = Math.min(10, mana[0] + 2);
            mana[1] = Math.min(10, mana[1] + 2);
            maxMana[0] = Math.max(maxMana[0], mana[0]);
            maxMana[1] = Math.max(maxMana[1], mana[1]);
          } else if (arenaEvent.id === 'forest_fire') {
            // Pick the starting tile now (shown as warning on board) but fire starts in 2 turns
            const forestTiles = boardAfter.filter(t => t.terrain.type === 'forest');
            if (forestTiles.length > 0) {
              const startTile = forestTiles[Math.floor(Math.random() * forestTiles.length)];
              pendingFireStartTile = `${startTile.coordinates.q},${startTile.coordinates.r}`;
              pendingFireCountdown = 2;
            }
          } else if (arenaEvent.id === 'laser_grid') {
            // Pick 10 random non-impassable tiles as warning targets (damage fires next turn)
            const candidateTiles = boardAfter.filter(t =>
              t.terrain.type !== 'mountain' &&
              t.terrain.effects.movementModifier !== -999
            );
            const shuffled = [...candidateTiles].sort(() => Math.random() - 0.5);
            const targets = shuffled.slice(0, Math.min(10, shuffled.length));
            pendingLaserTiles = targets.map(t => `${t.coordinates.q},${t.coordinates.r}`);
            pushLog(prev as any, `⚡ LASER GRID WARNING: 10 tiles targeted — damage fires NEXT turn! Move units off marked tiles!`, 0);
          } else if (arenaEvent.id === 'alien_tide') {
            // Start 2-turn countdown before flood activates
            pendingFloodCountdown = 2;
          } else if (arenaEvent.id === 'gravity_well') {
            // Pull all alive icons 2 hexes toward center (0,0)
            const allAliveIds = new Set(playersAfter.flatMap(p => p.icons).filter(ic => ic.isAlive).map(ic => ic.id));
            // Helper: hex distance from origin
            const hdist = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
            // Helper: find neighbor 1 step closer to (0,0)
            const pullStep = (q: number, r: number): { q: number; r: number } => {
              if (q === 0 && r === 0) return { q, r };
              const dirs = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
              const cur = hdist(q, r);
              const best = dirs.reduce<{q:number;r:number}|null>((b, d) => {
                const nq = q + d.q, nr = r + d.r;
                const nd = hdist(nq, nr);
                if (nd >= cur) return b;
                return !b || nd < hdist(q + b.q, r + b.r) ? d : b;
              }, null);
              return best ? { q: q + best.q, r: r + best.r } : { q, r };
            };
            // Move each icon 2 steps (two separate pulls, re-check occupancy each step)
            for (let step = 0; step < 2; step++) {
              const occupiedPos = new Map<string, string>(); // key → iconId
              playersAfter.flatMap(p => p.icons).filter(ic => ic.isAlive).forEach(ic => {
                occupiedPos.set(tileKey(ic.position.q, ic.position.r), ic.id);
              });
              playersAfter = playersAfter.map(p => ({
                ...p,
                icons: p.icons.map(ic => {
                  if (!ic.isAlive || !allAliveIds.has(ic.id)) return ic;
                  const dest = pullStep(ic.position.q, ic.position.r);
                  const destKey = tileKey(dest.q, dest.r);
                  const destTile = prev.board.find(t => t.coordinates.q === dest.q && t.coordinates.r === dest.r);
                  // Don't pull into impassable terrain (mountains, bases, crystals) or occupied hexes
                  if (!destTile) return ic;
                  const impassable = destTile.terrain.effects.movementModifier === -999 ||
                    destTile.terrain.type === 'mountain';
                  if (impassable) return ic;
                  const blockedBy = occupiedPos.get(destKey);
                  if (blockedBy && blockedBy !== ic.id) return ic;
                  // River → drown
                  if (destTile.terrain.type === 'river') {
                    pushLog(prev as any, `${ic.name} is pulled into the river by the Gravity Well!`, ic.playerId);
                    return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 };
                  }
                  occupiedPos.set(destKey, ic.id);
                  return { ...ic, position: dest };
                }),
              }));
            }
          } else if (arenaEvent.id === 'gravity_crush') {
            const crushSave: Record<string, number> = {};
            playersAfter.forEach(p => p.icons.forEach(ic => { if (ic.isAlive) crushSave[ic.id] = ic.stats.moveRange; }));
            playersAfter = playersAfter.map(p => ({
              ...p,
              icons: p.icons.map(ic => !ic.isAlive ? ic : {
                ...ic, stats: {
                  ...ic.stats,
                  movement: Math.max(1, Math.floor(ic.stats.movement / 2)),
                  moveRange: Math.max(1, Math.floor(ic.stats.moveRange / 2)),
                },
              }),
            }));
            gravityCrushSaved = crushSave;
          }
          } // end if (eligibleEvents.length > 0)
        } // end if (Math.random() < 0.35)
      } // end arena events block

      // Onslaught / Survive: spawn a new enemy every spawnInterval turns
      const extPrev = prev as ExtState;
      if ((extPrev.encounterObjective === 'onslaught' || extPrev.encounterObjective === 'survive') && extPrev.spawnInterval > 0 && nextPlayer === 0) {
        if (newCurrentTurn % extPrev.spawnInterval === 0) {
          const p2Spawns = [
            { q: 4, r: -3 }, { q: 5, r: -3 }, { q: 4, r: -4 },
            { q: 5, r: -4 }, { q: 6, r: -3 }, { q: 6, r: -4 },
            { q: 4, r: -5 }, { q: 5, r: -5 },
          ];
          const freeSpawn = p2Spawns.find(pos =>
            !playersAfter.flatMap(p => p.icons).some(ic => ic.isAlive && ic.position.q === pos.q && ic.position.r === pos.r)
          );
          if (freeSpawn) {
            const aliveEnemies = playersAfter[1].icons.filter(i => i.isAlive);
            const template = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            if (template) {
              const newEnemy: Icon = {
                ...template,
                id: `1-wave-${newCurrentTurn}-${Math.random().toString(36).slice(2)}`,
                position: freeSpawn,
                stats: { ...template.stats, hp: template.stats.maxHp, movement: template.stats.moveRange },
                isAlive: true, respawnTurns: 0, movedThisTurn: true, cardUsedThisTurn: true,
              };
              playersAfter = playersAfter.map(p => p.id !== 1 ? p : { ...p, icons: [...p.icons, newEnemy] });
              pushLog(prev as any, `Onslaught! A new enemy has arrived!`, 1);
            }
          }
        }
      }

      // destroy_base: enemy base fires at ALL player characters with LoS every 3 turns
      if (extPrev.encounterObjective === 'destroy_base' && nextPlayer === 0 && newCurrentTurn % 3 === 0) {
        const BASE_Q = 6, BASE_R = -5;
        // Hex LoS: cast line from base to target; mountain in between = blocked
        const hasLoS = (tq: number, tr: number): boolean => {
          const dist = Math.max(Math.abs(tq - BASE_Q), Math.abs(tr - BASE_R), Math.abs((tq + tr) - (BASE_Q + BASE_R)));
          if (dist <= 1) return true;
          for (let i = 1; i < dist; i++) {
            const t = i / dist;
            const lq = Math.round(BASE_Q + (tq - BASE_Q) * t);
            const lr = Math.round(BASE_R + (tr - BASE_R) * t);
            const tile = boardAfter.find(bt => bt.coordinates.q === lq && bt.coordinates.r === lr);
            if (tile?.terrain.type === 'mountain') return false;
          }
          return true;
        };
        const bombarded: string[] = [];
        playersAfter = playersAfter.map(p => {
          if (p.id !== 0) return p;
          return {
            ...p,
            icons: p.icons.map(ic => {
              if (!ic.isAlive) return ic;
              if (!hasLoS(ic.position.q, ic.position.r)) return ic;
              const totalDef = (ic.stats.defense ?? 0) + (ic.cardBuffDef ?? 0);
              const dmg = Math.max(1, 40 - totalDef);
              const newHp = Math.round(Math.max(0, ic.stats.hp - dmg));
              bombarded.push(`${ic.name} (−${dmg})`);
              pushLog(prev as any, `Enemy Base fires! ${ic.name} takes ${dmg} damage!`, 1);
              return { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 };
            }),
          };
        });
        if (bombarded.length > 0) {
          toast.error(`🔴 Enemy Base fires! ${bombarded.join(', ')}`);
        }
      }

      // Alien Tide flood spreading — every turn flood is active, adjacent tiles have 50% to become river
      if (floodIsActive && nextPlayer === 0) {
        const HEX_DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
        const PROTECTED = new Set(['base','mana_crystal','spawn','beast_camp']);
        const riverKeys = new Set(boardAfter.filter(t => t.terrain.type === 'river').map(t => `${t.coordinates.q},${t.coordinates.r}`));
        const newRiverKeys = new Set<string>();
        for (const tile of boardAfter) {
          const k = `${tile.coordinates.q},${tile.coordinates.r}`;
          if (riverKeys.has(k) || PROTECTED.has(tile.terrain.type)) continue;
          const adjacentToRiver = HEX_DIRS.some(d => riverKeys.has(`${tile.coordinates.q + d.q},${tile.coordinates.r + d.r}`));
          if (adjacentToRiver && Math.random() < 0.5) newRiverKeys.add(k);
        }
        if (newRiverKeys.size > 0) {
          boardAfter = boardAfter.map(t =>
            newRiverKeys.has(`${t.coordinates.q},${t.coordinates.r}`)
              ? { ...t, terrain: { type: 'river' as const, effects: { movementModifier: -999 } } }
              : t
          );
          // Drown units caught on newly flooded tiles (Sun-sin immune)
          playersAfter = playersAfter.map(p => ({
            ...p,
            icons: p.icons.map(ic => {
              if (!ic.isAlive || !newRiverKeys.has(`${ic.position.q},${ic.position.r}`)) return ic;
              if (ic.name.includes("Sun-sin")) return ic;
              pushLog(prev as any, `🌊 ${ic.name} was engulfed by the rising flood!`, ic.playerId);
              return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 };
            }),
          }));
          pushLog(prev as any, `🌊 Alien Tide: flood spreads to ${newRiverKeys.size} more tile(s)!`, 0);
        }
      }

      // Forest Fire spreading — every turn fire is active, adjacent forest tiles have 50% chance to catch fire
      if (forestFireIsActive && nextPlayer === 0 && burningForestTiles.length > 0) {
        const HEX_DIRS_F = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
        const burningSet = new Set(burningForestTiles);
        const newBurning: string[] = [];
        for (const tile of boardAfter) {
          const k = `${tile.coordinates.q},${tile.coordinates.r}`;
          if (burningSet.has(k) || tile.terrain.type !== 'forest') continue;
          const adjacentToBurning = HEX_DIRS_F.some(d => burningSet.has(`${tile.coordinates.q + d.q},${tile.coordinates.r + d.r}`));
          if (adjacentToBurning && Math.random() < 0.5) newBurning.push(k);
        }
        if (newBurning.length > 0) {
          newBurning.forEach(k => burningSet.add(k));
          pushLog(prev as any, `🔥 Forest Fire spreads to ${newBurning.length} more tile(s)!`, 0);
        }
        burningForestTiles = [...burningSet];

        // Units on burning forest tiles take 30 pure damage (ignores DEF)
        playersAfter = playersAfter.map(p => ({
          ...p,
          icons: p.icons.map(ic => {
            if (!ic.isAlive) return ic;
            const key = `${ic.position.q},${ic.position.r}`;
            if (!burningSet.has(key)) return ic;
            const newHp = Math.max(0, ic.stats.hp - 30);
            pushLog(prev as any, `🔥 ${ic.name} takes 30 fire damage (burning forest)!`, ic.playerId);
            if (newHp <= 0) return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 };
            return { ...ic, stats: { ...ic.stats, hp: newHp } };
          }),
        }));
      }

      // Victory check — all characters of a team simultaneously defeated = instant game over
      const p0Alive = playersAfter[0].icons.some((ic) => ic.isAlive);
      const p1Alive = playersAfter[1].icons.some((ic) => ic.isAlive);
      let newPhase = prev.phase;
      let winner = prev.winner;
      if (!p0Alive) { newPhase = "defeat";  winner = 1; }
      else if (!p1Alive && extPrev.encounterObjective !== 'destroy_base') { newPhase = "victory"; winner = 0; }
      if (prev.baseHealth[0] <= 0) { newPhase = "defeat";  winner = 1; }
      if (prev.baseHealth[1] <= 0) { newPhase = "victory"; winner = 0; }
      // Survive objective: win once enough turns have passed
      if (extPrev.encounterObjective === 'survive' && extPrev.survivalTurnsTarget > 0) {
        if (newCurrentTurn > extPrev.survivalTurnsTarget && p0Alive) { newPhase = "victory"; winner = 0; }
      }

      // Tick bleed damage before debuff duration decrement
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive || !ic.debuffs?.length) return ic;
          const bleed = ic.debuffs.find(d => d.type === 'bleed');
          if (!bleed) return ic;
          const newHp = Math.max(0, ic.stats.hp - bleed.magnitude);
          return { ...ic, stats: { ...ic.stats, hp: Math.round(newHp) }, isAlive: newHp > 0 };
        }),
      }));

      // Tick down debuffs on all icons (every turn end; expire at 0)
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.debuffs?.length) return ic;
          const newDebuffs = ic.debuffs
            .map(d => ({ ...d, turnsRemaining: d.turnsRemaining - 1 }))
            .filter(d => d.turnsRemaining > 0);
          return { ...ic, debuffs: newDebuffs };
        }),
      }));

      // Tick down active zones (Freudenspur) — every turn transition
      const updatedActiveZones: Zone[] = (prev.activeZones ?? [])
        .map(z => ({ ...z, turnsRemaining: z.turnsRemaining - 1 }))
        .filter(z => z.turnsRemaining > 0);

      // Process regen buffs (Naval Repairs): apply heal, then tick down
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive || !ic.regens?.length) return ic;
          const totalHeal = ic.regens.reduce((sum, r) => sum + r.amount, 0);
          const healedHp = Math.min(ic.stats.maxHp, ic.stats.hp + totalHeal);
          const newRegens = ic.regens
            .map(r => ({ ...r, turnsRemaining: r.turnsRemaining - 1 }))
            .filter(r => r.turnsRemaining > 0);
          return { ...ic, stats: { ...ic.stats, hp: healedHp }, regens: newRegens };
        }),
      }));

      // Arena Medkit passive (regen_low_hp): heal 20 HP at turn start if below 40% HP
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive || ic.playerId !== nextPlayer) return ic;
          if (!ic.itemPassiveTags?.includes('regen_low_hp')) return ic;
          if (ic.stats.hp >= ic.stats.maxHp * 0.4) return ic;
          const healed = Math.min(ic.stats.maxHp, ic.stats.hp + 20);
          pushLog(prev as any, `${ic.name} Arena Medkit: +20 HP (low HP)`, nextPlayer);
          return { ...ic, stats: { ...ic.stats, hp: healed } };
        }),
      }));

      // Tick enemy ability cooldowns (decrement by 1, min 0)
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (ic.playerId !== 1 || !ic.enemyAbilityCooldowns) return ic;
          const ticked: Record<string, number> = {};
          for (const [k, v] of Object.entries(ic.enemyAbilityCooldowns)) {
            ticked[k] = Math.max(0, v - 1);
          }
          return { ...ic, enemyAbilityCooldowns: ticked };
        }),
      }));

      // Leonidas Phalanx passive: update stacks at the start of nextPlayer's turn
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.name.includes("Leonidas") || !ic.isAlive || ic.playerId !== nextPlayer) return ic;
          const allies = p.icons.filter(a => a.id !== ic.id && a.isAlive);
          const isAdjacentToAlly = allies.some(a => hexDistance(ic.position, a.position) === 1);
          const currentStacks = ic.passiveStacks ?? 0;
          const newStacks = isAdjacentToAlly ? Math.min(3, currentStacks + 1) : 0;
          if (newStacks !== currentStacks) {
            pushLog(prev as any, `${ic.name} Phalanx: ${newStacks} stack(s) (+${newStacks * 8} DEF)`, nextPlayer);
          }
          return { ...ic, passiveStacks: newStacks };
        }),
      }));

      // Cards: discard ending player's hand, draw fresh hand for next player
      const prevState = prev as ExtState;
      let hands = prevState.hands ? [...prevState.hands] as [Hand, Hand] : undefined;
      let decks = prevState.decks ? [...prevState.decks] as [Deck, Deck] : undefined;
      if (hands && decks) {
        const endPid = prev.activePlayerId;
        // Discard ending player's remaining hand
        const endHand = hands[endPid];
        const endDeck = decks[endPid];
        hands[endPid] = { ...endHand, cards: [] };
        decks[endPid] = { ...endDeck, discardPile: [...endDeck.discardPile, ...endHand.cards] };

        // Da Vinci Tinkerer passive: draw +1 card if Da Vinci is alive and didn't use an exclusive ability
        const daVinciNextPlayer = playersAfter[nextPlayer]?.icons.find(
          ic => ic.isAlive && ic.name.includes("Da Vinci") && !ic.abilityUsedThisTurn
        );
        // Warlord's Grimoire: any alive icon on the next team has draw_plus_3
        const grimoireBonus = playersAfter[nextPlayer]?.icons.some(
          ic => ic.isAlive && ic.itemPassiveTags?.includes('draw_plus_3')
        ) ? 3 : 0;
        const extraDraw = (daVinciNextPlayer ? 1 : 0) + grimoireBonus;

        // Reset abilityUsedThisTurn for the next player AFTER Da Vinci check
        playersAfter = playersAfter.map((p, pid) =>
          pid !== nextPlayer ? p : {
            ...p,
            icons: p.icons.map(ic => ({ ...ic, abilityUsedThisTurn: false })),
          }
        );

        // Draw fresh hand for next player (discard old, then draw)
        const startHand = hands[nextPlayer];
        const startDeck = decks[nextPlayer];
        const deckWithOld = { ...startDeck, discardPile: [...startDeck.discardPile, ...startHand.cards] };
        const drawCount = startHand.maxSize + extraDraw;
        const { drawn, newDraw, newDiscard } = drawCards(deckWithOld.drawPile, deckWithOld.discardPile, drawCount);
        let finalDrawn = drawn;
        let finalDraw = newDraw;
        let finalDiscard = newDiscard;
        // ── Huang Imperial Command guarantees ────────────────────────────────────
        const nextIcons = playersAfter.find(p => p.id === nextPlayer)?.icons ?? [];
        const hasHuang = nextIcons.some(ic => ic.isAlive && ic.name.includes("Huang"));
        if (hasHuang) {
          // 1) Guarantee ≥1 Basic Attack in hand (for Terracotta units)
          if (!finalDrawn.some(c => c.definitionId === 'shared_basic_attack')) {
            const fromDrawIdx = finalDraw.findIndex(c => c.definitionId === 'shared_basic_attack');
            const fromDiscardIdx = finalDiscard.findIndex(c => c.definitionId === 'shared_basic_attack');
            if (fromDrawIdx !== -1) {
              const card = finalDraw[fromDrawIdx];
              finalDraw = finalDraw.filter((_, i) => i !== fromDrawIdx);
              finalDrawn = [card, ...finalDrawn];
            } else if (fromDiscardIdx !== -1) {
              const card = finalDiscard[fromDiscardIdx];
              finalDiscard = finalDiscard.filter((_, i) => i !== fromDiscardIdx);
              finalDrawn = [card, ...finalDrawn];
            }
          }

          // 2) Guarantee Terracotta Legion in hand as an EXTRA card, until it is used for the first time.
          //    "Used for the first time" = a copy has entered the discard pile (was played).
          //    Check the full discard (deckWithOld includes previous discard + old hand).
          const legionInHand = finalDrawn.some(c => c.definitionId === 'huang_terracotta_summon');
          const legionEverUsed = deckWithOld.discardPile.some(c => c.definitionId === 'huang_terracotta_summon');
          if (!legionInHand && !legionEverUsed) {
            // Pull from draw pile first; otherwise inject a fresh instance
            const fromDrawIdx = finalDraw.findIndex(c => c.definitionId === 'huang_terracotta_summon');
            if (fromDrawIdx !== -1) {
              const card = finalDraw[fromDrawIdx];
              finalDraw = finalDraw.filter((_, i) => i !== fromDrawIdx);
              finalDrawn = [card, ...finalDrawn];
            } else {
              const def = CARD_DEFS.find((d: any) => d.definitionId === 'huang_terracotta_summon');
              if (def) finalDrawn = [instantiateCard(def as any), ...finalDrawn];
            }
          }
        }
        hands[nextPlayer] = { ...startHand, cards: finalDrawn };
        decks[nextPlayer] = { drawPile: finalDraw, discardPile: finalDiscard };
      }

      return {
        ...prev,
        board: boardAfter,
        players: playersAfter,
        activePlayerId: nextPlayer,
        cardLockActive: false,
        cardTargetingMode: undefined,
        globalMana: mana,
        globalMaxMana: maxMana,
        currentTurn: newCurrentTurn,
        selectedIcon: undefined,
        targetingMode: undefined,
        movementStack: {},
        phase: newPhase,
        winner,
        arenaEvent,
        arenaEventAge,
        gravityCrushSaved,
        floodActive: floodIsActive,
        laserGridStruckIds,
        forestFireActive: forestFireIsActive,
        burningForestTiles,
        pendingLaserTiles,
        pendingFloodCountdown,
        pendingFireCountdown,
        pendingFireStartTile,
        activeZones: updatedActiveZones,
        ...(hands && { hands }),
        ...(decks && { decks }),
      } as ExtState;
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
   Play a card
   ========================= */
const playCard = useCallback((card: Card, executorId: string) => {
  setGameState((prev) => {
    const state = { ...prev } as ExtState;
    const executor = state.players.flatMap(p => p.icons).find(i => i.id === executorId);
    if (!executor || !executor.isAlive) return prev;
    if (executor.playerId !== state.activePlayerId) return prev;
    if (state.gameMode === "singleplayer" && executor.playerId === 1) return prev;
    if (executor.justRespawned) {
      toast.error(getT().messages.justRespawned);
      return prev;
    }
    if ((executor.cardsUsedThisTurn ?? 0) >= 3) {
      toast.error(getT().messages.cardLimitReached);
      return prev;
    }
    if (card.exclusiveTo && !executor.name.includes(card.exclusiveTo)) {
      toast.error(getT().messages.wrongCharacter.replace('{name}', card.exclusiveTo ?? ''));
      return prev;
    }
    if ((state.globalMana[executor.playerId] ?? 0) < card.manaCost) {
      toast.error(getT().messages.notEnoughMana);
      return prev;
    }

    // Huang-chan Imperial Command: cannot play Basic Attack cards
    if (executor.name.includes("Huang") && card.definitionId === "shared_basic_attack") {
      toast.error("Huang-chan cannot play Basic Attack cards!");
      return prev;
    }

    // Terracotta unit card restrictions
    if (executor.name.includes("Terracotta")) {
      const isCavalry = executor.name.includes("Cavalry");
      const allowed = card.definitionId === "shared_basic_attack" ||
        (isCavalry && card.definitionId === "huang_cavalry_charge");
      if (!allowed) {
        toast.error("Terracotta units can only use Basic Attack cards!");
        return prev;
      }
    }

    // Vitruvian Guardian → drone placement targeting
    if (card.definitionId === "davinci_vitruvian_guardian") {
      const range = card.effect.range ?? 3;
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "summon_drone", iconId: executorId, range },
      };
    }

    // Huang-chan Terracotta summon cards → hex placement targeting
    if (card.effect.summonTerracotta) {
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "summon_terracotta", iconId: executorId, range: card.effect.range ?? 3 },
      };
    }
    if (card.effect.summonCavalry) {
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "summon_cavalry", iconId: executorId, range: card.effect.range ?? 4 },
      };
    }
    // Huang-chan Eternal Army → target an enemy unit
    if (card.effect.controlEnemy) {
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "control_enemy", iconId: executorId, range: card.effect.range ?? 3 },
      };
    }

    // Flying Machine card → teleport targeting (unlimited range)
    if (card.effect.teleport) {
      const range = card.effect.range ?? 999;
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "card_teleport", iconId: executorId, range },
      };
    }

    // ── Sun-sin dual-form card overrides ─────────────────────────────────────
    const executorTileType = state.board.find(t => t.coordinates.q === executor.position.q && t.coordinates.r === executor.position.r)?.terrain.type;
    const sunsinOnRiver = executor.name.includes("Sun-sin") && executorTileType === 'river';

    // Hwajeon water variant: Power×2.0 at range 1 (instead of 1.2 at range 3)
    if (card.definitionId === "sunsin_hwajeon" && sunsinOnRiver) {
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "sunsin_hwajeon_water", iconId: executorId, range: 1 },
      };
    }

    // Naval Repairs (land) → select a target tile; on water → Broadside AoE (handled below as allEnemiesInRange)
    if (card.effect.healZone && !sunsinOnRiver) {
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "naval_repairs", iconId: executorId, range: 8 },
      };
    }
    // Naval Repairs on water → swap to Broadside behavior immediately
    if (card.effect.healZone && sunsinOnRiver) {
      let updated = { ...state } as ExtState;
      const range = 3;
      const enemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range
      );
      if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      for (const enemy of enemies) {
        const atkStats = calcEffectiveStats(updated, executor);
        const defStats = calcEffectiveStats(updated, enemy);
        const dmg = Math.max(0.1, atkStats.power * 0.7 - defStats.defense);
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic,
            stats: { ...ic.stats, hp: Math.round(Math.max(0, ic.stats.hp - dmg)) },
            isAlive: ic.stats.hp - dmg > 0,
            respawnTurns: ic.stats.hp - dmg > 0 ? ic.respawnTurns : 4,
          }),
        }));
        pushLog(updated, `${executor.name} Broadside hit ${enemy.name} for ${dmg.toFixed(0)} dmg`, executor.playerId);
      }
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - card.manaCost);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }

    // Chongtong land → line charge targeting; water → allEnemiesInRange handled in general path below
    if (card.definitionId === "sunsin_chongtong" && !sunsinOnRiver) {
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "chongtong_charge", iconId: executorId, range: card.effect.chargeDist ?? 3 },
      };
    }

    // Mend self-cast → immediately heal executor
    if (card.effect.selfCast && card.effect.healing) {
      let updated = { ...state } as ExtState;
      const newHp = Math.min(executor.stats.maxHp, executor.stats.hp + card.effect.healing);
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, stats: { ...ic.stats, hp: newHp } }),
      }));
      pushLog(updated, `${executor.name} played ${card.name}, healing ${card.effect.healing} HP`, executor.playerId);
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const newMana = [...updated.globalMana] as [number, number];
        newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
        updated.globalMana = newMana;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }

    // Freudenspur — enter targeting mode: player picks a tile, zone placed at that tile (radius 1)
    if (card.effect.moveZone) {
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "freudenspur_zone", iconId: executorId, range: card.effect.range ?? 3 },
      };
    }

    // Damage / healing / single-target powerMult → enter targeting mode
    const needsTarget =
      card.effect.damage !== undefined ||
      ((card.effect.healing !== undefined || card.effect.healingMult !== undefined) && !card.effect.selfCast) ||
      (card.effect.powerMult !== undefined && !card.effect.allEnemiesInRange && !card.effect.lineTarget && !card.effect.randomTargets) ||
      (card.effect.debuffType !== undefined && !card.effect.allEnemiesInRange);

    if (needsTarget) {
      const isBasicAttack = card.definitionId === "shared_basic_attack";
      const napoleonOnForest = executor.name.includes("Napoleon") && executorTileType === 'forest';
      const attackRange = napoleonOnForest ? 3
        : executor.name.includes("Napoleon") || executor.name.includes("Da Vinci") ? 2
        : (sunsinOnRiver) ? 3
        : (executor.stats.attackRange ?? 1);
      const cardRange = card.effect.range ?? (isBasicAttack ? attackRange : 3);

      if (isBasicAttack) {
        // Consume card + mana immediately, then use the simple targetingMode path (avoids cardTargetingMode complexity)
        let updated = { ...state } as ExtState;
        if (card.manaCost > 0) {
          const pid = executor.playerId as 0 | 1;
          const newMana = [...updated.globalMana] as [number, number];
          newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
          updated.globalMana = newMana;
        }
        updated = consumeCardFromHand(updated, card, executor.playerId);
        return { ...updated, targetingMode: { abilityId: "basic_attack", iconId: executorId, range: cardRange, cardRefund: { card, manaRefund: card.manaCost } } };
      }

      const targetingMode = {
        abilityId: card.definitionId,
        iconId: executorId,
        range: cardRange,
      };
      return { ...state, cardTargetingMode: { card, executorId }, targetingMode };
    }

    // Immediate effects
    let updated = { ...state } as ExtState;

    if (card.effect.moveBonus) {
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : {
          ...ic,
          stats: { ...ic.stats, movement: ic.stats.movement + card.effect.moveBonus! },
        }),
      }));
      pushLog(updated, `${executor.name} played ${card.name} (+${card.effect.moveBonus} MOV)`, executor.playerId);
    } else if (card.effect.atkBonus || card.effect.defBonus) {
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : {
          ...ic,
          cardBuffAtk: (ic.cardBuffAtk ?? 0) + (card.effect.atkBonus ?? 0),
          cardBuffDef: (ic.cardBuffDef ?? 0) + (card.effect.defBonus ?? 0),
        }),
      }));
      pushLog(updated, `${executor.name} played ${card.name}`, executor.playerId);
    } else if (card.effect.teamDefBuff) {
      const buffVal = card.effect.teamDefBuff;
      updated.players = updated.players.map((p, pid) => {
        if (pid !== executor.playerId) return p;
        return {
          ...p,
          icons: p.icons.map(ic => {
            if (!ic.isAlive) return ic;
            if (ic.id !== executorId && hexDistance(executor.position, ic.position) > (card.effect.range ?? 2)) return ic;
            return { ...ic, cardBuffDef: (ic.cardBuffDef ?? 0) + buffVal };
          }),
        };
      });
      pushLog(updated, `${executor.name} played ${card.name} — +${buffVal} DEF to nearby allies!`, executor.playerId);
    } else if (card.effect.teamDmgPct) {
      const pid = executor.playerId;
      const nm = [...updated.teamBuffs.mightBonus];
      const np = [...updated.teamBuffs.powerBonus];
      nm[pid] = Math.min((nm[pid] ?? 0) + card.effect.teamDmgPct, 60);
      np[pid] = Math.min((np[pid] ?? 0) + card.effect.teamDmgPct, 60);
      updated.teamBuffs = { ...updated.teamBuffs, mightBonus: nm, powerBonus: np };
      pushLog(updated, `${executor.name} played ${card.name} (+${card.effect.teamDmgPct}% team dmg)`, executor.playerId);
    } else if (card.effect.powerMult && card.effect.allEnemiesInRange && !card.effect.debuffType) {
      // AoE: fires immediately (no directional target needed)
      const range = card.effect.range ?? 2;
      const executorTile = state.board.find(t => t.coordinates.q === executor.position.q && t.coordinates.r === executor.position.r);
      const terrainMult = 1 + (executorTile ? (card.terrainBonus?.[executorTile.terrain.type] ?? 0) : 0);
      const enemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range
      );
      if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      for (const enemy of enemies) {
        const atkStats = calcEffectiveStats(updated, executor);
        const defStats = calcEffectiveStats(updated, enemy);
        const dmg = Math.max(0.1, atkStats.power * card.effect.powerMult! * terrainMult - defStats.defense);
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic,
            stats: { ...ic.stats, hp: Math.round(Math.max(0, ic.stats.hp - dmg)) },
            isAlive: ic.stats.hp - dmg > 0,
            respawnTurns: ic.stats.hp - dmg > 0 ? ic.respawnTurns : 4,
          }),
        }));
        pushLog(updated, `${executor.name} ${card.name} hit ${enemy.name} for ${dmg.toFixed(0)} dmg`, executor.playerId);
      }
      // falls through to mana deduction + consumeCard below
    } else if (card.effect.scalingAoE) {
      // Horde Tactics: damage = power × perEnemyMult × number of enemies in range (immediate, no targeting)
      const range = card.effect.range ?? 2;
      const perEnemyMult = card.effect.perEnemyMult ?? 0.5;
      const atkStats = calcEffectiveStats(updated, executor);
      const enemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range
      );
      if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      const totalDmgPerHit = Math.round(atkStats.power * perEnemyMult * enemies.length);
      for (const enemy of enemies) {
        const defStats = calcEffectiveStats(updated, enemy);
        const dmg = Math.max(1, totalDmgPerHit - defStats.defense);
        const newEnemyHp = Math.round(Math.max(0, enemy.stats.hp - dmg));
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic,
            stats: { ...ic.stats, hp: newEnemyHp },
            isAlive: newEnemyHp > 0,
            respawnTurns: newEnemyHp > 0 ? ic.respawnTurns : 4,
          }),
        }));
        pushLog(updated, `${executor.name} ${card.name} hit ${enemy.name} for ${dmg} dmg (×${enemies.length})`, executor.playerId);
        updated = applyKillPassives(updated, executorId, enemy.isAlive, enemy.stats.hp - dmg <= 0);
      }
      // falls through to mana deduction + consumeCard below
    } else if (card.effect.powerMult && card.effect.lineTarget) {
      // Line target: requires player to click a direction hex — enter targeting mode
      const cardRange = card.effect.range ?? 5;
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: card.definitionId, iconId: executorId, range: cardRange },
      };
    } else if (card.effect.allEnemiesInRange && card.effect.debuffType) {
      // Götterfunken: AoE stun (optionally with damage) — hits all enemies in range
      const range = card.effect.range ?? 3;
      const enemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range
      );
      if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      const aoeDebuff: Debuff = {
        type: card.effect.debuffType,
        magnitude: card.effect.debuffMagnitude ?? 0,
        turnsRemaining: card.effect.debuffDuration ?? 1,
      };
      for (const enemy of enemies) {
        if (card.effect.powerMult) {
          const atkStats = calcEffectiveStats(updated, executor);
          const defStats = calcEffectiveStats(updated, enemy);
          const dmg = Math.max(0.1, atkStats.power * card.effect.powerMult - defStats.defense);
          const newEnemyHp = Math.round(Math.max(0, enemy.stats.hp - dmg));
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
              ...ic,
              stats: { ...ic.stats, hp: newEnemyHp },
              isAlive: newEnemyHp > 0,
              respawnTurns: newEnemyHp > 0 ? ic.respawnTurns : 4,
            }),
          }));
        }
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== aoeDebuff.type), aoeDebuff],
          }),
        }));
      }
      pushLog(updated, `${executor.name} Götterfunken — ${enemies.length} enem${enemies.length !== 1 ? 'ies' : 'y'} STUNNED!`, executor.playerId);
      // Beethoven Crescendo passive
      if (executor.name.includes("Beethoven") && card.exclusiveTo === "Beethoven") {
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== executorId ? ic : {
            ...ic, passiveStacks: Math.min(8, (ic.passiveStacks ?? 0) + 1),
          }),
        }));
        const stacks = Math.min(8, (executor.passiveStacks ?? 0) + 1);
        pushLog(updated, `${executor.name} Crescendo: ${stacks}/8 (+${stacks * 3} Power)`, executor.playerId);
      }
      // falls through to mana deduction + consumeCard below
    } else if (card.effect.randomTargets && card.effect.powerMult) {
      // Final Salvo: fire multiHit random hits at enemies within range (no targeting click needed)
      const range = card.effect.range ?? 4;
      const hits = card.effect.multiHit ?? 3;
      const enemiesInRange = updated.players
        .flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range);
      if (enemiesInRange.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      for (let h = 0; h < hits; h++) {
        // Refresh enemy list each hit (targets may have died)
        const aliveEnemies = updated.players
          .flatMap(p => p.icons)
          .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range);
        if (!aliveEnemies.length) break;
        const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        const atkStats = calcEffectiveStats(updated, executor);
        const defStats = calcEffectiveStats(updated, target);
        const dmg = Math.max(0.1, atkStats.power * card.effect.powerMult - defStats.defense);
        const wasAlive = target.isAlive;
        const newHp = Math.round(Math.max(0, target.stats.hp - dmg));
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== target.id ? ic : {
            ...ic,
            stats: { ...ic.stats, hp: newHp },
            isAlive: newHp > 0,
            respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
          }),
        }));
        updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0);
        pushLog(updated, `${executor.name} ${card.name} hit ${target.name} for ${dmg.toFixed(0)} dmg`, executor.playerId);
      }
      // falls through to mana deduction + consumeCard below
    }
    else if (card.effect.swapCount) {
      const pid = executor.playerId as 0 | 1;
      const swapN = card.effect.swapCount;
      const hand = updated.hands[pid];
      const deck = updated.decks[pid];
      // Pick swapN random cards from current hand (excluding this card)
      const available = hand.cards.filter(c => c.id !== card.id);
      const toDiscard = available.sort(() => Math.random() - 0.5).slice(0, Math.min(swapN, available.length));
      const remaining = hand.cards.filter(c => c.id !== card.id && !toDiscard.some(d => d.id === c.id));
      const newDiscard = [...deck.discardPile, card, ...toDiscard];
      const { drawn, newDraw, newDiscard: nd } = drawCards(deck.drawPile, newDiscard, toDiscard.length);
      const newHands = [...updated.hands] as [Hand, Hand];
      const newDecks = [...updated.decks] as [Deck, Deck];
      newHands[pid] = { ...hand, cards: [...remaining, ...drawn] };
      newDecks[pid] = { drawPile: newDraw, discardPile: nd };
      updated.hands = newHands;
      updated.decks = newDecks;
      pushLog(updated, `${executor.name} played ${card.name} (swapped ${toDiscard.length} cards)`, executor.playerId);
      // Don't call consumeCardFromHand since we handled it above
      if (card.manaCost > 0) {
        const pid2 = executor.playerId as 0 | 1;
        const newMana2 = [...updated.globalMana] as [number, number];
        newMana2[pid2] = Math.max(0, newMana2[pid2] - card.manaCost);
        updated.globalMana = newMana2;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1 }),
      }));
      return { ...updated };
    }

    // Deduct mana from global pool — check for free-card passives first
    const isExclusiveAbility = card.exclusiveTo !== null && card.type !== "buff" && card.type !== "movement";
    const execRefreshed = updated.players.flatMap(p => p.icons).find(i => i.id === executorId);
    const cardIsFreeDueToNextFree = execRefreshed?.nextCardFree === true || (execRefreshed?.freeCardsLeft ?? 0) > 0;
    const cardIsFreeDueToFirstAbility = isExclusiveAbility && execRefreshed?.itemPassiveTags?.includes('first_ability_free') && !execRefreshed?.firstAbilityUsed;
    const effectiveCost = (cardIsFreeDueToNextFree || cardIsFreeDueToFirstAbility) ? 0 : card.manaCost;
    if (effectiveCost > 0) {
      const pid = executor.playerId as 0 | 1;
      const newMana = [...updated.globalMana] as [number, number];
      newMana[pid] = Math.max(0, newMana[pid] - effectiveCost);
      updated.globalMana = newMana;
    }
    if (cardIsFreeDueToNextFree) pushLog(updated, `${executor.name} Znyxorga's Eye: card played FREE!`, executor.playerId);
    if (cardIsFreeDueToFirstAbility) pushLog(updated, `${executor.name} Gladiator's Brand: first ability FREE!`, executor.playerId);

    // Mark executor as having used a card this turn; track count for 3-card limit
    if (card.type !== "movement") {
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : {
          ...ic,
          cardUsedThisTurn: true,
          cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1,
          abilityUsedThisTurn: isExclusiveAbility ? true : ic.abilityUsedThisTurn,
          nextCardFree: cardIsFreeDueToNextFree ? false : ic.nextCardFree,
          freeCardsLeft: cardIsFreeDueToNextFree && (ic.freeCardsLeft ?? 0) > 0 ? ic.freeCardsLeft! - 1 : ic.freeCardsLeft,
          firstAbilityUsed: isExclusiveAbility ? true : ic.firstAbilityUsed,
        }),
      }));
    }
    updated = consumeCardFromHand(updated, card, executor.playerId);
    return { ...updated };
  });
}, []);

/* =========================
   Undo movement — last step only
   ========================= */
const undoMovement = useCallback(() => {
  setGameState((prev) => {
    const state = { ...prev } as ExtState;
    const me = state.players[state.activePlayerId]?.icons.find(
      i => (state.selectedIcon ? i.id === state.selectedIcon : true) && i.isAlive
    ) ?? state.players[state.activePlayerId]?.icons.find(i => i.isAlive);
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

    if (icon.playerId !== prev.activePlayerId) {
      toast.error(getT().messages.respawnOwnTurn);
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

const startBattle = useCallback((
  runChars?: CharacterRunState[],
  deckCardIds?: string[],
  encounter?: EncounterDef | null,
  mapSeed?: number,
  isRoguelikeRun?: boolean,
  battleCount?: number,
  upgradedCardDefIds?: string[],
) => {
  const sel = selectedCharactersRef.current;
  if (!sel || sel.length === 0) return;
  setGameState(() => {
    // Player 0 icons — exclude permanently dead chars
    const aliveSelected = runChars
      ? sel.filter(s => (runChars.find(c => c.id === s.id)?.currentHp ?? 1) > 0)
      : sel;
    const p0Icons = buildIconsFromSelection(aliveSelected, runChars).filter(i => i.playerId === 0);
    // Player 1 icons — from encounter (roguelike) or mirror player (standard)
    // Progressive difficulty: +3% per roguelike battle, capped at +60%
    const scaleFactor = (isRoguelikeRun && battleCount != null)
      ? Math.min(1.60, 1 + battleCount * 0.03)
      : 1.0;
    const p1Icons = encounter
      ? buildEnemyIconsFromEncounter(encounter, scaleFactor)
      : buildIconsFromSelection(sel, runChars).filter(i => i.playerId === 1);
    const allIcons = [...p0Icons, ...p1Icons];

    const speedQueueRaw = initSpeedQueue(allIcons);
    const speedQueue    = normalizeSpeedQueue(speedQueueRaw, allIcons);
    const p0Names = p0Icons.map(i => i.name);
    const p1Names = p1Icons.map(i => i.name);
    const upgradedSet = upgradedCardDefIds ? new Set(upgradedCardDefIds) : undefined;
    const buildHand = (names: string[], ids?: string[]): [Hand, Deck] => {
      const allCards = ids ? buildDeckFromIds(ids, upgradedSet) : buildDeckForTeam(names);
      const handSizeBonus = (runChars ?? []).reduce((sum, c) => {
        return sum + c.items.filter(Boolean).reduce((s, item) => {
          if (item?.passiveTag === 'hand_size_plus_1') return s + 1;
          if (item?.passiveTag === 'hand_size_plus_2') return s + 2;
          if (item?.passiveTag === 'draw_plus_3') return s + 3;
          return s;
        }, 0);
      }, 0);
      const maxSize = 7 + handSizeBonus;
      return [{ cards: allCards.slice(0, maxSize), maxSize }, { drawPile: allCards.slice(maxSize), discardPile: [] }];
    };
    const [hand0, deck0] = buildHand(p0Names, deckCardIds);
    const [hand1, deck1] = buildHand(p1Names);
    // Use random map for first battle (when mapSeed provided), else standard map
    const rawBoard = mapSeed != null ? generateRandomBattleBoard(mapSeed) : createInitialBoard();
    const rogueObjective = (encounter?.objective ?? 'defeat_all') as FightObjective;
    // In roguelike: spawn tiles are always plain (no respawn zones). Base tiles are plain too,
    // unless the objective is destroy_base (where the base is the actual combat target).
    const board = isRoguelikeRun
      ? rawBoard.map(tile => {
          if (tile.terrain.type === 'spawn') return { ...tile, terrain: { type: 'plain' as const, effects: {} } };
          if (tile.terrain.type === 'base' && rogueObjective !== 'destroy_base') return { ...tile, terrain: { type: 'plain' as const, effects: {} } };
          return tile;
        })
      : rawBoard;
    return {
      currentTurn: 1,
      activePlayerId: 0 as const,
      cardLockActive: false,
      phase: "combat",
      players: [
        { id: 0, name: "Player 1",                                                icons: p0Icons, color: "blue", isAI: false },
        { id: 1, name: gameMode === "singleplayer" ? "Znyxorgan AI" : "Player 2", icons: p1Icons, color: "red",  isAI: gameMode === "singleplayer" },
      ],
      board,
      globalMana:   [5, 5],
      globalMaxMana:[5, 5],
      turnTimer:    20,
      speedQueue,
      queueIndex:   0,
      objectives: {
        manaCrystal: { controlled: false },
        beastCamps: { hp: [75, 75], maxHp: 75, defeated: [false, false] },
      },
      teamBuffs:   { mightBonus: [0, 0], powerBonus: [0, 0], homeBaseBonus: [0, 0] },
      baseHealth:  [150, 150],
      matchTimer:  600,
      gameMode,
      movementStack: {},
      menuOpen:    false,
      combatLog:   [],
      hands:       [hand0, hand1],
      decks:       [deck0, deck1],
      aiIntents:   [],
      encounterObjective: (encounter?.objective ?? 'defeat_all') as FightObjective,
      survivalTurnsTarget: encounter?.survivalTurns ?? 0,
      spawnInterval: encounter?.spawnInterval ?? 0,
      isRoguelikeRun: isRoguelikeRun ?? false,
    } as ExtState;
  });
}, [gameMode]);

const resetGame = useCallback(() => {
  startBattle(); // Full reset at base HP, no run overrides
}, [startBattle]);

// Cancel targeting helper
const cancelTargeting = useCallback(() => {
  setGameState(prev => {
    const refund = prev.targetingMode?.cardRefund;
    if (refund) {
      const icon = prev.players.flatMap(p => p.icons).find(i => i.id === prev.targetingMode!.iconId);
      if (icon) {
        const pid = icon.playerId as 0 | 1;
        const newMana = [...prev.globalMana] as [number, number];
        newMana[pid] = Math.min(prev.globalMaxMana[pid], newMana[pid] + refund.manaRefund);
        const hand = { ...prev.hands[pid], cards: [...prev.hands[pid].cards, refund.card] };
        const hands: [Hand, Hand] = [prev.hands[0], prev.hands[1]];
        hands[pid] = hand;
        return { ...prev, globalMana: newMana, hands, targetingMode: undefined, cardTargetingMode: undefined };
      }
    }
    return { ...prev, targetingMode: undefined, cardTargetingMode: undefined };
  });
}, []);

return {
  gameState,
  selectTile,
  useAbility,
  endTurn,
  basicAttack,
  playCard,
  respawnCharacter,
  currentTurnTimer,
  selectIcon,
  undoMovement,
  startRespawnPlacement,
  toggleMenu,
  goToMainMenu,
  startBattle,
  resetGame,
  cancelTargeting,
};
};

export default useGameState;










import { useState, useCallback, useEffect, useRef } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType, Card, Hand, Deck, AIIntent, Debuff, Zone } from "@/types/game";
import type { CharacterRunState, EncounterDef, FightObjective, EnemyAbilityDef } from "@/types/roguelike";
import { buildDeckForTeam, drawCards, buildDeckFromIds, CARD_DEFS, instantiateCard } from "@/data/cards";
import { toast } from "sonner";
import { getT } from "@/i18n";
import { seededRng as rngFromSeed } from "@/utils/rng";
import {
  tileKey, neighborsAxial, movementCostForTile, reachableWithCosts,
  type Qr,
} from "@/utils/movement";

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

type MoveStep = { from: Coordinates; to: Coordinates; cost: number; movementBefore: number };
type LogEntry = { id: string; turn: number; text: string; playerId: 0 | 1 };

// tileKey, neighborsAxial, movementCostForTile, reachableWithCosts imported from @/utils/movement

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
  const N = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
  for (let i = 1; i < N; i++) {
    const t = i / N;
    const fq = from.q + dq * t, fr = from.r + dr * t;
    const fs = -(fq + fr);
    let rq = Math.round(fq), rr = Math.round(fr), rs = Math.round(fs);
    const eq = Math.abs(rq - fq), er = Math.abs(rr - fr), es = Math.abs(rs - fs);
    if (eq > er && eq > es) rq = -rr - rs;
    else if (er > es) rr = -rq - rs;
    const tile = board.find(t => t.coordinates.q === rq && t.coordinates.r === rr);
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
  if ((q === -5 && r === 4) || (q === 5 && r === -4)) return { type: "base", effects: { movementModifier: -999 } };
  if (
    (q >= -5 && q <= -3 && r >= 3 && r <= 5) ||
    (q >= 3 && q <= 5 && r >= -5 && r <= -3)
  )
    return { type: "spawn", effects: {} };
  // Mountains — flanks and boundary only; (-4,3)/(4,-3) removed to keep
  // spawn-approach corridors clear for both sides.
  const mtn = new Set([
    // Near-center boulders (radius 4)
    '-1,-3','1,3',
    // Flank obstacles (radius 4)
    '-4,2','4,-2',
    // Edge mountains (radius 5), away from spawn-approach corridors
    '-5,1','-5,2','5,-1','5,-2',
    // Diagonal flanks (radius 5)
    '-4,-1','4,1',
    '2,-5','-2,5',
  ]);
  const key = `${q},${r}`;
  if (mtn.has(key))
    return { type: "mountain", effects: { movementModifier: -999 } };

  // Lakes — impassable deep water (Yi Sun-sin can cross; passable "river" only on random maps)
  const lake = new Set([
    '1,-3','3,-2',          // right-side (distance 3)
    '-1,3','-3,2',          // left-side (distance 3)
    '-1,-2','-2,-1',        // upper-left trickle (distance 3)
    '1,2','2,1',            // lower-right trickle (distance 3)
    '0,-2','0,2',           // scenic water above/below crystal
  ]);
  if (lake.has(key))
    return { type: "lake", effects: { movementModifier: -999 } as any };

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
  for (let q = -5; q <= 5; q++) {
    const r1 = Math.max(-5, -q - 5);
    const r2 = Math.min(5, -q + 5);
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

function getRandomTerrainForPosition(
  q: number, r: number,
  forestSet: Set<string>, riverSet: Set<string>, mountainSet: Set<string>,
  desertSet: Set<string>, snowSet: Set<string>, iceSet: Set<string>,
  lakeSet: Set<string>, ruinsSet: Set<string>,
): TerrainType {
  const key = `${q},${r}`;
  if (q === 0 && r === 0) {
    if (ruinsSet.has("0,0"))           return { type: "ruins",        effects: {} };
    return                                      { type: "mana_crystal", effects: { movementModifier: -999 } };
  }
  if ((q === -5 && r === 4) || (q === 5 && r === -4)) return { type: "base", effects: { movementModifier: -999 } };
  if ((q >= -5 && q <= -3 && r >= 3 && r <= 5) || (q >= 3 && q <= 5 && r >= -5 && r <= -3))
    return { type: "spawn", effects: {} };
  // Strategic ruins — check before other cover terrain so they always appear
  if (ruinsSet.has(key))   return { type: "ruins",    effects: {} };
  if (mountainSet.has(key)) return { type: "mountain", effects: { movementModifier: -999 } };
  if (lakeSet.has(key))    return { type: "lake",     effects: { movementModifier: -999 } as any };
  if (riverSet.has(key))   return { type: "river",    effects: {} };           // passable shallow water — costs 2 (1 for Sun-sin)
  if (iceSet.has(key))     return { type: "ice",      effects: {} };           // passable, cost 1
  if (desertSet.has(key))  return { type: "desert",   effects: {} };           // cost 2 (handled in movementCostForTile)
  if (snowSet.has(key))    return { type: "snow",     effects: {} };           // cost 2
  if (forestSet.has(key))  return { type: "forest",   effects: { dodgeBonus: true, stealthBonus: true } };
  return { type: "plain", effects: {} };
}

function generateRandomBattleBoard(seed: number, act: 1 | 2 | 3 = 1): HexTile[] {
  const rng = rngFromSeed(seed);

  // Shared cover-terrain patterns / anchors (forest in Act 1, desert in Act 2, snow in Act 3)
  const TERRAIN_PATTERNS: [number,number][][] = [
    [[0,0],[1,0],[0,1],[1,-1]], [[0,0],[0,1],[1,-1],[-1,1]],
    [[0,0],[1,0],[1,-1],[0,-1]], [[0,0],[-1,1],[0,1],[1,0]],
    [[0,0],[1,0],[0,1]], [[0,0],[-1,1],[0,-1]],
  ];
  const TERRAIN_ANCHORS: {q:number,r:number}[] = [
    {q:-3,r:1},{q:-2,r:1},{q:-3,r:2},{q:3,r:-1},{q:2,r:-1},{q:3,r:-2},
    {q:-1,r:-2},{q:0,r:-2},{q:1,r:-2},{q:-1,r:2},{q:0,r:2},{q:1,r:2},
    {q:-4,r:1},{q:4,r:-1},{q:-1,r:3},{q:1,r:-3},{q:-2,r:-1},{q:2,r:1},
    {q:-3,r:0},{q:3,r:0},{q:0,r:3},{q:0,r:-3},
  ];

  // Act 1: Naturalistic watershed pairs — rivers (passable, cost 2) flow into adjacent lakes (impassable).
  // Each watershed has a 3-tile lake with a clear river path leading into it.
  const ACT1_WATERSHEDS: { lake: {q:number,r:number}[]; river: {q:number,r:number}[] }[] = [
    // W1: South lake cluster — river crosses from center into bottom basin
    { lake: [{q:-1,r:4},{q:0,r:4},{q:-2,r:4}],
      river: [{q:-1,r:3},{q:0,r:3},{q:0,r:2},{q:1,r:2}] },
    // W2: North lake cluster — mirror
    { lake: [{q:1,r:-4},{q:0,r:-4},{q:2,r:-4}],
      river: [{q:1,r:-3},{q:0,r:-3},{q:0,r:-2},{q:-1,r:-2}] },
    // W3: West L-shaped lake — river flows from center-right
    { lake: [{q:-4,r:2},{q:-4,r:1},{q:-3,r:2}],
      river: [{q:-3,r:1},{q:-2,r:1},{q:-2,r:2},{q:-1,r:2}] },
    // W4: East L-shaped lake — mirror
    { lake: [{q:4,r:-2},{q:4,r:-1},{q:3,r:-2}],
      river: [{q:3,r:-1},{q:2,r:-1},{q:2,r:-2},{q:1,r:-2}] },
    // W5: Southwest bay — long river from northeast into southwest basin
    { lake: [{q:-2,r:4},{q:-1,r:4},{q:-2,r:3}],
      river: [{q:-1,r:3},{q:0,r:3},{q:0,r:2},{q:1,r:1}] },
    // W6: Northeast bay — mirror
    { lake: [{q:2,r:-4},{q:1,r:-4},{q:2,r:-3}],
      river: [{q:1,r:-3},{q:0,r:-3},{q:0,r:-2},{q:-1,r:-1}] },
    // W7: West edge lake — river winds inward from center
    { lake: [{q:-5,r:2},{q:-4,r:2},{q:-5,r:1}],
      river: [{q:-4,r:1},{q:-3,r:1},{q:-3,r:0},{q:-2,r:0}] },
    // W8: East edge lake — mirror
    { lake: [{q:5,r:-2},{q:4,r:-2},{q:5,r:-1}],
      river: [{q:4,r:-1},{q:3,r:-1},{q:3,r:0},{q:2,r:0}] },
    // W9: Northwest 3-tile lake, river from south
    { lake: [{q:-4,r:0},{q:-4,r:1},{q:-3,r:0}],
      river: [{q:-3,r:1},{q:-2,r:1},{q:-2,r:2},{q:-1,r:2}] },
    // W10: Southeast 3-tile lake, mirror
    { lake: [{q:4,r:0},{q:4,r:-1},{q:3,r:0}],
      river: [{q:3,r:-1},{q:2,r:-1},{q:2,r:-2},{q:1,r:-2}] },
  ];

  // Act 2 lake positions: isolated desert oases, no rivers (2-3 tile clusters)
  const ACT2_OASES: {q:number,r:number}[][] = [
    [{q:-4,r:2},{q:-4,r:1},{q:-3,r:2}], [{q:4,r:-2},{q:4,r:-1},{q:3,r:-2}],
    [{q:-1,r:4},{q:0,r:4},{q:-2,r:4}],  [{q:1,r:-4},{q:0,r:-4},{q:2,r:-4}],
    [{q:-3,r:0},{q:-3,r:1}],            [{q:3,r:0},{q:3,r:-1}],
    [{q:-2,r:3},{q:-1,r:3}],            [{q:2,r:-3},{q:1,r:-3}],
    [{q:-5,r:2},{q:-4,r:2}],            [{q:5,r:-2},{q:4,r:-2}],
  ];

  // Act 3 lake positions: frozen lakes amid the snowfield (rivers are frozen = ice, passable)
  const ACT3_LAKES: {q:number,r:number}[][] = [
    [{q:-4,r:2}], [{q:4,r:-2}], [{q:-1,r:4}], [{q:1,r:-4}],
    [{q:-5,r:2}], [{q:5,r:-2}], [{q:-4,r:0}], [{q:4,r:0}],
  ];
  // Ice tiles (frozen rivers) — the old RIVER_OPTIONS positions, now passable cost-1 terrain
  const ICE_OPTIONS: {q:number,r:number}[][] = [
    [{q:2,r:-3},{q:1,r:-3}],[{q:-2,r:3},{q:-1,r:3}],
    [{q:3,r:-3},{q:3,r:-2}],[{q:-3,r:3},{q:-3,r:2}],
    [{q:-2,r:-1},{q:-3,r:-1}],[{q:2,r:1},{q:3,r:1}],
    [{q:-1,r:-2},{q:0,r:-3}],[{q:1,r:2},{q:0,r:3}],
  ];
  // Mountain clusters — flanks only (distance ≥ 3 from center)
  const MOUNTAIN_ANCHORS: {q:number,r:number}[] = [
    {q:4,r:-1},{q:-4,r:1},{q:4,r:-2},{q:-4,r:2},
    {q:2,r:2},{q:-2,r:-2},{q:2,r:-4},{q:-2,r:4},
    {q:4,r:-3},{q:-4,r:3},{q:5,r:-2},{q:-5,r:2},
    {q:3,r:-4},{q:-3,r:4},{q:1,r:-4},{q:-1,r:4},
    {q:0,r:-4},{q:0,r:4},
  ];
  const MOUNTAIN_PATTERNS: [number,number][][] = [
    [[0,0]], [[0,0],[1,0]], [[0,0],[0,1]], [[0,0],[1,-1]], [[0,0],[1,0],[0,1]],
  ];
  // Ruins pairs — opposite sides of the central area, always 2 tiles
  const RUINS_PAIRS: {q:number,r:number}[][] = [
    [{q:-2,r:1},{q:2,r:-1}],
    [{q:-1,r:2},{q:1,r:-2}],
    [{q:-2,r:-1},{q:2,r:1}],
    [{q:-3,r:2},{q:3,r:-2}],
  ];

  // ── Mountains (same for all acts) ──────────────────────────────────────────
  const numMountains = 7 + Math.floor(rng() * 4);
  const shuffledMtnAnchors = [...MOUNTAIN_ANCHORS].sort(() => rng() - 0.5);
  const mountainSet = new Set<string>();
  for (let m = 0; m < numMountains && m < shuffledMtnAnchors.length; m++) {
    const a = shuffledMtnAnchors[m];
    const pat = MOUNTAIN_PATTERNS[Math.floor(rng() * MOUNTAIN_PATTERNS.length)];
    for (const [dq, dr] of pat) {
      const hq = a.q + dq, hr = a.r + dr;
      const onCrystal = hq === 0 && hr === 0;
      const onBase = (hq === -5 && hr === 4) || (hq === 5 && hr === -4);
      const onSpawn = (hq >= -5 && hq <= -3 && hr >= 3 && hr <= 5) || (hq >= 3 && hq <= 5 && hr >= -5 && hr <= -3);
      if (!onCrystal && !onBase && !onSpawn) mountainSet.add(`${hq},${hr}`);
    }
  }

  // ── Biome sets (populated per act) ─────────────────────────────────────────
  const forestSet  = new Set<string>();
  const riverSet   = new Set<string>();
  const desertSet  = new Set<string>();
  const snowSet    = new Set<string>();
  const iceSet     = new Set<string>();
  const lakeSet    = new Set<string>();

  const numClusters = 6 + Math.floor(rng() * 4); // 6–9 clusters
  const shuffledAnchors = [...TERRAIN_ANCHORS].sort(() => rng() - 0.5);

  function fillClusters(target: Set<string>) {
    for (let c = 0; c < numClusters && c < shuffledAnchors.length; c++) {
      const a = shuffledAnchors[c];
      const pat = TERRAIN_PATTERNS[Math.floor(rng() * TERRAIN_PATTERNS.length)];
      for (const [dq, dr] of pat) target.add(`${a.q + dq},${a.r + dr}`);
    }
  }

  if (act === 1) {
    // ── Act 1: Forest + naturalistic river-lake watersheds ────────────────
    // Watersheds: rivers (passable, cost 2) flow into lakes (impassable)
    fillClusters(forestSet);
    const numWatersheds = 2 + Math.floor(rng() * 3); // 2–4 watersheds per map
    const shuffledWS = [...ACT1_WATERSHEDS].sort(() => rng() - 0.5);
    for (let w = 0; w < numWatersheds && w < shuffledWS.length; w++) {
      const ws = shuffledWS[w];
      for (const pos of ws.lake) lakeSet.add(`${pos.q},${pos.r}`);
      for (const pos of ws.river) riverSet.add(`${pos.q},${pos.r}`);
    }
    // Rivers can't override lakes (priority handled in getRandomTerrainForPosition)

  } else if (act === 2) {
    // ── Act 2: Desert dominant + isolated lake oases, no rivers ──────────
    fillClusters(desertSet);
    const numOases = 2 + Math.floor(rng() * 2); // 2–3 oases
    const shuffledOases = [...ACT2_OASES].sort(() => rng() - 0.5);
    for (let o = 0; o < numOases && o < shuffledOases.length; o++)
      for (const pos of shuffledOases[o]) lakeSet.add(`${pos.q},${pos.r}`);

  } else {
    // ── Act 3: Snow + frozen lakes + ice patches (frozen river crossings) ─
    fillClusters(snowSet);
    const numLakes = 1 + Math.floor(rng() * 2); // 1–2 frozen lakes
    const numIce   = 4 + Math.floor(rng() * 4); // 4–7 ice (frozen river) patches
    const shuffledLakes = [...ACT3_LAKES].sort(() => rng() - 0.5);
    const shuffledIce   = [...ICE_OPTIONS].sort(()  => rng() - 0.5);
    for (let lk = 0; lk < numLakes && lk < shuffledLakes.length; lk++)
      for (const pos of shuffledLakes[lk]) lakeSet.add(`${pos.q},${pos.r}`);
    for (let ic = 0; ic < numIce && ic < shuffledIce.length; ic++)
      for (const pos of shuffledIce[ic]) iceSet.add(`${pos.q},${pos.r}`);
  }

  // ── Ruins — always 1 pair in strategic center-flanking positions ────────────
  const ruinsSet  = new Set<string>();
  const ruinsPair = RUINS_PAIRS[Math.floor(rng() * RUINS_PAIRS.length)];
  for (const pos of ruinsPair) {
    const k = `${pos.q},${pos.r}`;
    // Ruins can't overwrite fixed tiles or impassable water/mountains
    if (!mountainSet.has(k) && !riverSet.has(k) && !lakeSet.has(k) && !iceSet.has(k))
      ruinsSet.add(k);
  }
  // ~50% chance: replace the center Mana Crystal with a Ruins tile
  if (rng() < 0.5) ruinsSet.add("0,0");

  // ── Build board ─────────────────────────────────────────────────────────────
  const board: HexTile[] = [];
  for (let q = -5; q <= 5; q++) {
    const r1 = Math.max(-5, -q - 5);
    const r2 = Math.min(5, -q + 5);
    for (let r = r1; r <= r2; r++) {
      board.push({
        coordinates: { q, r },
        terrain: getRandomTerrainForPosition(q, r, forestSet, riverSet, mountainSet, desertSet, snowSet, iceSet, lakeSet, ruinsSet),
        highlighted: false, selectable: false,
      });
    }
  }
  return board;
}

// ── Enemy icon builder from encounter ────────────────────────────────────────

function buildEnemyIconsFromEncounter(encounter: EncounterDef, scaleFactor = 1.0): Icon[] {
  const p2Spawns = [
    { q: 4, r: -3 }, { q: 5, r: -3 }, { q: 4, r: -4 },
    { q: 5, r: -4 }, { q: 3, r: -3 }, { q: 3, r: -4 },
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
      stats: { hp: 100, maxHp: 100, moveRange: 2, speed: 6, might: 60, power: 65, defense: 15, movement: 2 },
      abilities: [
        { id: "1", name: "Artillery Barrage", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Deals 48 damage.", damage: 0 },
        { id: "2", name: "Grande Armée", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "Summons phantom soldiers. +20% damage to all allies for 3 turns.", damage: 0 },
        { id: "ultimate", name: "Final Salvo", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Deal 30 damage in a 3-tile line", damage: 0 },
      ],
      passive: "Tactical Genius: +1 movement at turn start while standing on a vantage tile (Forest or Ruins)",
    },
    {
      name: "Genghis-chan",
      role: "dps_melee" as const,
      stats: { hp: 120, maxHp: 120, moveRange: 2, speed: 8, might: 55, power: 50, defense: 25, movement: 2 },
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
      stats: { hp: 85, maxHp: 85, moveRange: 2, speed: 4, might: 35, power: 50, defense: 20, movement: 2 },
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
      stats: { hp: 90, maxHp: 90, moveRange: 2, speed: 5, might: 35, power: 55, defense: 25, movement: 2 },
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
  baseMaxHealth?: number[];
  arenaEvent?: import('@/types/game').ArenaEventDef | null;
  phaseBanner?: { enemyName: string; abilityName: string; icon: string } | null;
  /** Tutorial scripted hands per player-0 turn (index 0 = initial deal). */
  tutorialHandScript?: string[][];
  /** How many times player 0 has drawn a fresh hand (starts at 0). */
  tutorialPlayerTurnIdx: number;
  /** Most recent lethal hit on a player character — used on defeat to show who killed us. */
  lastPlayerCasualty?: { victimName: string; killerName: string; sourceName: string; damage: number };
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
    { q: -5, r: 4 }, { q: -3, r: 3 }, { q: -3, r: 4 },
    { q: -4, r: 5 }, { q: -5, r: 5 },
  ];
  const p2Spawns = [
    { q: 4, r: -3 }, { q: 5, r: -3 }, { q: 4, r: -4 },
    { q: 5, r: -4 }, { q: 3, r: -3 }, { q: 3, r: -4 },
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
        hp:          acc.hp          + (item.statBonus.hp          ?? 0),
        might:       acc.might       + (item.statBonus.might       ?? 0),
        power:       acc.power       + (item.statBonus.power       ?? 0),
        defense:     acc.defense     + (item.statBonus.defense     ?? 0),
        attackRange: acc.attackRange + (item.statBonus.attackRange ?? 0),
      };
    }, { hp: 0, might: 0, power: 0, defense: 0, attackRange: 0 }) ?? { hp: 0, might: 0, power: 0, defense: 0, attackRange: 0 };
    // Collect all passive tags from equipped items
    const itemPassiveTags = runChar?.items
      ?.filter(Boolean)
      .map(item => item!.passiveTag)
      .filter((t): t is string => !!t) ?? [];
    // move_plus_1: add +1 to base movement range
    const movePlusOne = itemPassiveTags.filter(t => t === 'move_plus_1').length;
    // swift_wraps_burst: +1 permanent move + extra +2 on the first turn (first-turn bonus baked into 'movement' only, permanent added to 'moveRange')
    const hasSwiftWraps = itemPassiveTags.includes('swift_wraps_burst');
    const swiftWrapsPermanent = hasSwiftWraps ? 1 : 0;
    const swiftWrapsBurst = hasSwiftWraps ? 2 : 0;
    const baseDefense = template.role === "support" ? 20 : template.role === "dps_melee" ? 25 : template.role === "tank" ? 35 : template.role === "controller" ? 25 : template.role === "hybrid" ? 20 : 15;
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
        moveRange: (template.role === "tank" || template.role === "controller" ? 2 : 3) + movePlusOne + swiftWrapsPermanent,
        speed:     template.role === "dps_melee" ? 8 : template.role === "dps_ranged" ? 6 : template.role === "tank" ? 3 : 4,
        attackRange: (template.name.includes("Mansa") || template.name.includes("Tesla") ? 3
                   : (template.name.includes("Picasso") || template.role === "dps_ranged") ? 2
                   : (template.name.includes("Sun-sin") && itemPassiveTags.includes('sig_sunsin_turtle_helm')) ? 2
                   : 1) + itemBonus.attackRange,
        might:     template.stats.might + (statBonus.might ?? 0) + itemBonus.might,
        power:     (template.stats.power ?? 50) + (statBonus.power ?? 0) + itemBonus.power,
        defense:   baseDefense + (statBonus.defense ?? 0) + itemBonus.defense,
        movement:  (template.role === "tank" || template.role === "controller" ? 2 : 3) + movePlusOne + swiftWrapsPermanent + swiftWrapsBurst,
        mana: 3,
        maxMana: 3,
      },
      abilities: getAbilitiesForCharacter(template.name),
      passive:   getPassiveForCharacter(template.name, runChar?.level ?? 1),
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
      level:            runChar?.level ?? 1,
      itemPassiveTags:  itemPassiveTags.length > 0 ? itemPassiveTags : undefined,
      voidArmorUsed:    false,
      firstHitNegated:  false,
      firstAbilityUsed: false,
      // Restore persisted passive stacks (Genghis Bloodlust; Musashi Battle Scar with scar_persist item)
      passiveStacks: (() => {
        if (template.name?.includes('Genghis')) return runChar?.passiveStacks ?? 0;
        if (template.name?.includes('Musashi')) {
          const base = itemPassiveTags.includes('musashi_scar_persist') ? (runChar?.passiveStacks ?? 0) : 0;
          return itemPassiveTags.includes('sig_musashi_niten_scrolls') ? Math.max(base, 2) : base;
        }
        return 0;
      })(),
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
    { id: "2", name: "Horde Tactics", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "Power×0.7 per enemy in range 2 to ALL enemies in range 2.", damage: 0, scalingAoE: true, perEnemyMult: 0.7 },
    { id: "ultimate", name: "Rider's Fury", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 5, description: "ULTIMATE: Power×1.5 to all enemies in a line. Doubled if target <40% HP.", damage: 0, powerMult: 1.5, executeDouble: true },
  ];
  if (name.includes("Da Vinci")) return [
    { id: "1", name: "Flying Machine", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 999, description: "Teleport to any hex (unlimited range).", damage: 0, targetMode: "hex" as any },
    { id: "2", name: "Masterpiece", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Heals 45 HP to an ally.", healing: 45 },
    { id: "ultimate", name: "Vitruvian Guardian", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons attack drone", damage: 0 },
  ];
  if (name.includes("Leonidas")) return [
    { id: "1", name: "Shield Bash", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 1, description: "Power×1.8 damage + Armor Break (−25% DEF, 2t) + counter-stance (+20 DEF this turn).", damage: 0, powerMult: 1.8 },
    { id: "2", name: "Spartan Wall", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "+20 Defense to all nearby allies.", damage: 0, teamDefBuff: 20 },
    { id: "ultimate", name: "THIS IS SPARTA!", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Power×2.5 damage + Root adjacent enemies 2t.", damage: 0, powerMult: 2.5 },
  ];
  if (name.includes("Beethoven")) return [
    { id: "1", name: "Schallwelle",  manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "Sonic wave — Power×0.8 dmg on a line, pushes each enemy 2 tiles back.", damage: 0, powerMult: 0.8 },
    { id: "2", name: "Freudenspur", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 1, description: "Place resonance zone (7 tiles). Allies on zone gain +2 Movement at turn start. Lasts 2 turns.", damage: 0 },
    { id: "ultimate", name: "Götterfunken", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Power×1.0 dmg to all enemies in range 3. Stuns them for 1 turn.", damage: 0, powerMult: 1.0 },
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
  if (name.includes("Nelson")) return [
    { id: "1", name: "Crossing the T", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 5, description: "Line shot — ~65 dmg to 1st target, ~40 to 2nd, ~26 to 3rd+.", damage: 0, lineScaling: true, powerMult: 1.0 },
    { id: "2", name: "Kiss Me Hardy", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 4, description: "Charge up to 4 hexes — each enemy in path takes ~55 dmg and is pushed sideways.", damage: 0, chargeLinePushSide: true, chargeDmgMult: 0.85 },
    { id: "ultimate", name: "Trafalgar Square", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 4, description: "ULTIMATE: ~130 dmg to one target. If target dies, ~50 dmg to all adjacent enemies.", damage: 0, powerMult: 2.0 },
  ];
  if (name.includes("Hannibal")) return [
    { id: "1", name: "Alpine March", manaCost: 1, cooldown: 0, currentCooldown: 0, range: 6, description: "Use before moving. Charge up to 6 hexes — enemies in path take ~Might×0.5 dmg and are pushed sideways. Consumes all movement.", damage: 0, chargeMove: true, chargeDist: 6 },
    { id: "2", name: "Double Envelopment", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "~55 dmg to target + ~28 dmg to all adjacent enemies.", damage: 0, chargeAndPull: true, chargeAndPullHitMult: 1.1, chargeAndPullArrivalMult: 0.55 },
    { id: "ultimate", name: "War Elephant", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 1, description: "ULTIMATE: Summon War Elephant — HP 120, Might 70, Def 20, Move 2. Basic attacks only. Lasts 2 turns.", damage: 0, summonWarElephant: true },
  ];
  if (name.includes("Picasso")) return [
    { id: "1", name: "Guernica", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 2, description: "~70 dmg to ALL enemies in range 2. Applies Armor Break (−25% DEF, 2t) to all hit.", damage: 0, powerMult: 1.0, allEnemiesInRange: true },
    { id: "2", name: "Cubist Mirror", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 4, description: "Swap positions with target in range 4. If enemy: deal ~35 dmg on swap.", damage: 0, swapEnemyAlly: true, powerMult: 0.5 },
    { id: "ultimate", name: "Blue Period", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 0, description: "ULTIMATE: Scramble all units to random positions. Heal all allies for 60 HP, +20 DEF until next turn.", damage: 0, scrambleAll: true, healing: 60 },
  ];
  if (name.includes("Teddy")) return [
    { id: "1", name: "Speak Softly", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 2, description: "All enemies in range 2 Taunted — must target Teddy. Teddy gains +30 DEF until her next turn.", damage: 0, globalTauntRange: 2 },
    { id: "2", name: "Big Stick", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 1, description: "~78 Might dmg at range 1. +50% bonus (~117) if target is Stunned or Taunted.", damage: 0, mightMult: 1.3, executeVsDebuffed: true },
    { id: "ultimate", name: "Rough Riders' Rally", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 5, description: "ULTIMATE: Allies gain +25 Might, +2 Move for 2 turns. Teddy gains +45 Might and teleports range 5.", damage: 0, selfMightBonus: 45, selfTeleportAnywhere: 5 },
  ];
  if (name.includes("Mansa")) return [
    { id: "1", name: "Salt Road", manaCost: 1, cooldown: 0, currentCooldown: 0, range: 3, description: "Place a 7-hex mana zone. Allies starting their turn on it restore 1 Mana. Lasts 2 turns.", damage: 0, manaZone: true },
    { id: "2", name: "Hajj of Gold", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 0, description: "Heal all allies for 20% of max HP. All allies gain +10 Power for 2 turns.", damage: 0, hajjOfGold: true, hajjHealPct: 0.2 },
    { id: "ultimate", name: "Mansa's Bounty", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 0, description: "ULTIMATE: Golden Stasis — all units (allies and enemies) are frozen for 1 turn.", damage: 0, mansaBounty: true },
  ];
  if (name.includes("Vel'thar")) return [
    { id: "1", name: "Toba's Fury", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 1, description: "Melee strike ~64 dmg. At 2+ Bottleneck stacks: applies Armor Break.", damage: 0, powerMult: 1.1, armorBreakAtStacks: 2 },
    { id: "2", name: "Last Ember", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 2, description: "Bottleneck active: heal 25 HP + +15 DEF 1t. Else: ~50 AoE dmg range 2.", damage: 0, powerMult: 1.0, lastRites: true, selfHealIfLost: 25, selfDefenseIfLost: 15 },
    { id: "ultimate", name: "Humanity's Last Light", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "ULTIMATE: ~87 AoE dmg range 2. Vel'thar heals 30 HP. Scales with Bottleneck Power boost.", damage: 0, powerMult: 1.5, humanitysLastLight: true, selfHeal: 30 },
  ];
  if (name.includes("Musashi")) return [
    { id: "1", name: "Ichi no Tachi", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 1, description: "~36 dmg. Places Duel 2t. If Dueled: ~63 dmg + Bleed.", damage: 0, powerMult: 0.8, duelApply: true, duelPowerMult: 1.4, duelBleed: true },
    { id: "2", name: "Niten Ichi-ryu", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 1, description: "Strike twice ~32 each. Both apply Bleed. If Dueled: refresh Duel + ~22 splash.", damage: 0, powerMult: 0.7, multiHit: 2, bleedOnHit: true, duelRefresh: true, duelSplashMult: 0.5 },
    { id: "ultimate", name: "Book of Five Rings", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "ULTIMATE: Duel all enemies in range 2. Deal ~38 dmg each. Duel bonus +35% → +65% this round.", damage: 0, powerMult: 0.85, bookOfFiveRings: true, applyDuelAll: true, duelBonusBoost: 65 },
  ];
  if (name.includes("Cleopatra")) return [
    { id: "1", name: "Asp's Kiss", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "~46 dmg at range 3. Reduce target Power by −15 for 3 turns.", damage: 0, powerMult: 0.7, powerReduction: 15, powerReductionDuration: 3 },
    { id: "2", name: "Royal Decree", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "Dual-use. Enemy: Charm 1t + Poison. Ally: +20 Might, +10 DEF for 2 turns.", damage: 0, royalDecree: true, charm: true, allyMightBonus: 20, allyDefBonus: 10, allyBuffTurns: 2 },
    { id: "ultimate", name: "Eternal Kingdom", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 2, description: "ULTIMATE: Stun + Poison ALL enemies range 2 for 1t. Cleopatra Untouchable 1t.", damage: 0, eternalKingdom: true, untouchable: 1 },
  ];
  if (name.includes("Tesla")) return [
    { id: "1", name: "Arc Bolt", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "~72 dmg at range 3. At Voltage ≥3: chains to ALL adjacent enemies for ~40 each.", damage: 0, powerMult: 0.9, chainAllAdjacent: true, chainThreshold: 3, chainPct: 0.5 },
    { id: "2", name: "Coil Surge", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 3, description: "Place Tesla Coil zone on tile (range 3). Enemies there: −20 DEF + Stun 1t. Lasts 3t. Costs 1 Voltage.", damage: 0, coilZone: true, coilDuration: 3, coilDefPenalty: 20, voltageCost: 1 },
    { id: "ultimate", name: "Death Ray", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 6, description: "ULTIMATE: Requires ≥1 Voltage. Line range 6 — ~40 per stack, 50% falloff. Consumes all Voltage.", damage: 0, deathRay: true, lineTarget: true, voltageRequired: 1, voltagePerStackMult: 0.5, chainFalloffPct: 0.5 },
  ];
  if (name.includes("Shaka")) return [
    { id: "1", name: "The Horns", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 2, description: "Charge at target (up to 2 tiles), ~24 dmg. Knock sideways. Water: lethal. Mountain: Stun 1t.", damage: 0, powerMult: 0.6, chargeHorns: true, chargePushSideways: true, waterKill: true, mountainStun: true },
    { id: "2", name: "Chest Strike", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 1, description: "~27 dmg at range 1. Push back 1 tile. Armor Break.", damage: 0, powerMult: 0.7, pushBack: 1, debuffType: 'armor_break', debuffMagnitude: 35, debuffDuration: 2 },
    { id: "ultimate", name: "Impondo Zankomo", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 1, description: "ULTIMATE: ~19 dmg to ALL adjacent enemies. Adjacent allies +35 DEF, Shaka +50 DEF for 2t.", damage: 0, powerMult: 0.5, impondo: true, aoeAdjacent: true, allyDefBonus: 35, selfDefBonus: 50, defTurns: 2 },
  ];
  // fallback (shouldn't be reached)
  return [
    { id: "1", name: "Flying Machine", manaCost: 2, cooldown: 0, currentCooldown: 0, range: 999, description: "Teleport to any hex (unlimited range).", damage: 0, targetMode: "hex" as any },
    { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 3, description: "Heals 45 HP to an ally.", healing: 45 },
    { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons attack drone", damage: 0 },
  ];
}

function getPassiveForCharacter(name: string, level: number = 1) {
  if (name.includes("Napoleon")) {
    const dmg = 5 + 2 * (level - 1);
    return `Mitraille: At the start of Napoleon's turn, all enemies within range 2 take ${dmg} pure damage (ignores Defense). Scales with level: 5 + 2 per level (current: ${dmg} at lvl ${level}).`;
  }
  if (name.includes("Genghis")) {
    const cap = 2 + Math.floor(level / 2);
    return `Bloodlust: Each kill grants +12 Might and restores 1 Mana. Stack cap scales with level: 2 + ⌊level/2⌋ (current cap: ${cap} at lvl ${level}).`;
  }
  if (name.includes("Da Vinci")) return "Tinkerer: Draw +1 extra card at the start of each turn. Draws +1 additional card if the Combat Drone is alive.";
  if (name.includes("Leonidas")) {
    const defPerStack = 6 + level;
    return `Phalanx: Each turn adjacent to an ally, gain ${defPerStack} Defense per stack (up to 3 stacks, max +${defPerStack * 3} DEF). Scales with level: 6 + level (current: ${defPerStack} per stack at lvl ${level}).`;
  }
  if (name.includes("Sun-sin")) return "Turtle Ship: Can enter lake tiles. On water: +35% Might, +30% DEF, −40% Power, Range 3. On lake only: Move 1.";
  if (name.includes("Beethoven")) return "Crescendo: Each Beethoven ability card played grants +2 Power (stacks up to 15×, max +30 Power). Stack resets between fights.";
  if (name.includes("Huang"))    return "Imperial Command: Cannot play Basic Attack cards. Guaranteed at least 1 Basic Attack card is drawn each turn (for Terracotta units to use). Terracotta units may only use Basic Attack cards.";
  if (name.includes("Nelson"))   return "One Eye, One Hand: Nelson cannot be Silenced. The first hit she takes each fight is negated entirely.";
  if (name.includes("Hannibal")) {
    const pct = (30 + 2 * level).toFixed(0);
    return `Cannae: When Hannibal attacks a flanked enemy (ally adjacent to target), deal +${pct}% bonus damage. Scales with level: 30% + 2% per level (current: +${pct}% at lvl ${level}). Works on basic attacks and card attacks.`;
  }
  if (name.includes("Picasso")) {
    const interval = level >= 7 ? 2 : 3;
    return `Fractured Perspective: Every ${interval}${level >= 7 ? 'nd' : 'rd'} card Picasso plays this battle costs 0 mana${level >= 7 ? ' (lvl 7+ bonus active)' : ` (triggers every 2nd card at lvl 7+)`}. Counter persists across turns.`;
  }
  if (name.includes("Teddy")) {
    const mightPerKill = 8 + level;
    return `Bully!: Each kill grants Teddy +${mightPerKill} Might (stacks up to 3×, max +${mightPerKill * 3} Might). Scales with level: 8 + level (current: +${mightPerKill} per kill at lvl ${level}). Cannot trigger from Terracotta or drone kills.`;
  }
  if (name.includes("Mansa")) {
    const costReduction = level >= 6 ? 2 : 1;
    return `Treasury: After each battle, earn bonus gold equal to Mansa's Power% (60 Power = +60% more gold). Ability cards cost ${costReduction} less Mana${level >= 6 ? ' (lvl 6+ bonus active)' : ` (cost 2 less at lvl 6+)`}.`;
  }
  if (name.includes("Vel'thar")) {
    const perStack = 3 + 2 * level;
    return `Bottleneck: When a player character ally dies, Vel'thar gains +${perStack} Might and +${perStack} Power (scales: +5 at L1, +19 at L8). Stacks indefinitely, battle scope only. Does not trigger on summons or drones.`;
  }
  if (name.includes("Musashi")) {
    const perStack = Math.ceil(level / 2);
    return `Battle Scar: Each time Musashi takes damage, gain +${perStack} Might permanently for this battle (cap: 3 stacks, max +${perStack * 3} Might). Scales: +1 at L1, +4 at L8. Resets on fight end.`;
  }
  if (name.includes("Cleopatra")) {
    const moveNote = level >= 5 ? " Also reduces target Move by 1." : " At level 5: also reduces target Move by 1.";
    return `Asp's Venom: Basic attacks apply Poison (−8 Might and −5 Defense per turn, 3 turns, stacks up to 3).${moveNote}`;
  }
  if (name.includes("Tesla")) return "Voltage: Gain 1 stack when NOT moving on your turn. Lose 1 stack when you move (max 5). At 5 stacks (Overloaded): next basic attack or ability costs 0 Mana, deals +50% damage, and Stuns the target 1 turn. Consumed on use.";
  if (name.includes("Shaka")) {
    const defBonus = 9 + level;
    return `Isigodlo (Formation): Adjacent allies gain +${defBonus} Defense while Shaka lives (scales: +10 at L1, +17 at L8). Shaka deals +20% damage when attacking from the flank.`;
  }
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
    // Skip intents for stunned units — they cannot act
    if (ai.debuffs?.some(d => d.type === 'stun')) continue;

    const aiBlinded = ai.debuffs?.some(d => d.type === 'blinded') ?? false;
    const basicRange = aiBlinded ? 1
      : ai.name.includes("Napoleon") || ai.name.includes("Da Vinci") || ai.name.includes("Beethoven") ? 2 : 1;
    let mainIntentSet = false;

    // Sorted copies used for smarter target selection:
    // abilities aim at lowest-HP enemy (creates urgency / counterplay), basic attacks at nearest.
    const enemiesByHp   = [...enemies].sort((a, b) => a.stats.hp - b.stats.hp);
    const enemiesByDist = [...enemies].sort((a, b) => hexDistance(ai.position, a.position) - hexDistance(ai.position, b.position));

    // --- 1. Try a damaging ability ---
    for (const ab of (ai.abilities as any[])) {
      if (ab.id === "ultimate" && ai.ultimateUsed) continue;
      const isPowerMult = ab.powerMult !== undefined;
      const isDmg  = (typeof ab.damage === "number" && ab.damage > 0) || isPowerMult;
      const isHeal = typeof ab.healing === "number" && ab.healing > 0;

      if (isDmg && enemiesByHp.some(e => hexDistance(ai.position, e.position) <= ab.range)) {
        // Target the lowest-HP enemy in range — most threatening, but player can move them away
        const target = enemiesByHp.find(e => hexDistance(ai.position, e.position) <= ab.range)!;
        const atkStats = calcEffectiveStats(state, ai);
        const estDmg = isPowerMult
          ? Math.floor(atkStats.power * ab.powerMult)
          : ab.damage;
        intents.push({ iconId: ai.id, type: 'ability', abilityName: ab.name,
          label: String(Math.round(estDmg)), damage: estDmg, range: ab.range, targetId: target.id });
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
      // Target the nearest enemy with LoS; tiebreak by lowest HP
      const inRange = enemiesByDist.find(e =>
        hexDistance(ai.position, e.position) <= basicRange &&
        !hasLineMountain(state.board, ai.position, e.position)
      );
      if (inRange) {
        const atkStats = calcEffectiveStats(state, ai);
        const targetDef = calcEffectiveStats(state, inRange).defense;
        const dmg = Math.max(0, Math.floor(atkStats.might - targetDef));
        intents.push({ iconId: ai.id, type: 'attack', abilityName: 'Basic Attack',
          label: String(dmg), damage: dmg, range: basicRange, targetId: inRange.id });
        mainIntentSet = true;
      }
    }

    // --- 3. Player base attack if no enemies in range (destroy_base objective only) ---
    if (!mainIntentSet && (state as any).encounterObjective === 'destroy_base') {
      const playerBase: Qr = { q: -5, r: 4 };
      if (hexDistance(ai.position, playerBase) <= basicRange && state.baseHealth[0] > 0) {
        // Base attack: flat 30 + 25% of attacker Might (mirrors enemy base symmetry, no run-away scaling).
        const dmg = Math.max(1, 30 + Math.floor(ai.stats.might * 0.25));
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

    // --- 5. New-format enemyAbilities (EnemyAbilityDef with nested effect) ---
    if (!mainIntentSet) {
      const enemyAbs = (ai as any).enemyAbilities as import('@/types/roguelike').EnemyAbilityDef[] | undefined ?? [];
      for (const ab of enemyAbs) {
        const cd = cooldowns[ab.id] ?? 0;
        if (cd > 0) continue; // on cooldown — handled in cooldown badges below
        const e = ab.effect;
        const range = e.range ?? 2;
        const isDmg = e.type === 'aoe_damage' || e.type === 'damage_all_enemies' || e.type === 'dash_attack';
        const isHeal = e.type === 'heal_self';
        if (isDmg && enemiesByHp.some(en => hexDistance(ai.position, en.position) <= range)) {
          const atkStats = calcEffectiveStats(state, ai);
          const atkStat = e.useMight ? atkStats.might : atkStats.power;
          const rawDmg = e.damage ?? atkStat * (e.multiplier ?? 1.0);
          const abilityTarget = enemiesByHp.find(en => hexDistance(ai.position, en.position) <= range)!;
          const nearestDef = calcEffectiveStats(state, abilityTarget).defense;
          const estDmg = Math.max(0, Math.round(rawDmg - nearestDef));
          intents.push({ iconId: ai.id, type: 'ability', abilityName: ab.name,
            label: String(estDmg), damage: estDmg, range, targetId: abilityTarget.id });
          mainIntentSet = true;
          break;
        } else if (isHeal) {
          intents.push({ iconId: ai.id, type: 'heal', abilityName: ab.name,
            label: `+${e.amount ?? '?'}`, healing: e.amount, range });
          mainIntentSet = true;
          break;
        }
      }
    }
    // Cooldown badges for new-format abilities
    for (const ab of ((ai as any).enemyAbilities as import('@/types/roguelike').EnemyAbilityDef[] | undefined ?? [])) {
      const cd = cooldowns[ab.id] ?? 0;
      if (cd > 0) {
        intents.push({ iconId: ai.id, type: 'upcoming_ability', abilityName: ab.name,
          label: String(cd), range: ab.effect?.range ?? 2, turnsUntilReady: cd });
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
      const targets = effect.singleTarget
        ? [inRange.sort((a, b) => hexDistance(currentAi.position, a.position) - hexDistance(currentAi.position, b.position))[0]]
        : inRange;
      // Power by default for multiplier abilities; useMight flag for Might-based (e.g. Champion's Strike)
      const aiStatsCur = calcEffectiveStats(s, currentAi);
      const rawBase = effect.damage != null
        ? effect.damage
        : Math.round((effect.useMight ? aiStatsCur.might : aiStatsCur.power) * (effect.multiplier ?? 1.0));
      const logDmg: number[] = [];
      for (const t of targets) {
        const tDef = calcEffectiveStats(s, t).defense;
        const dmg = Math.round(Math.max(1, rawBase - tDef));
        logDmg.push(dmg);
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
        if (newHp <= 0 && t.playerId === 0 && !t.isDecoy) {
          s.lastPlayerCasualty = { victimName: t.name, killerName: ai.name, sourceName: ab.name, damage: dmg };
        }
      }
      const avgDmg = logDmg.length ? Math.round(logDmg.reduce((a, b) => a + b, 0) / logDmg.length) : 0;
      pushLog(s, `${ai.name} used ${ab.name} for ~${avgDmg} dmg to ${targets.length} target(s)!`, 1);
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
      // trueDamage: environmental/cosmic ability bypasses DEF (Arena Collapse, Emperor's Verdict)
      const baseDmg = effect.damage ?? 0;
      const targets = playerIcons();
      if (!targets.length) continue;
      for (const t of targets) {
        const dmg = effect.trueDamage ? baseDmg : Math.round(Math.max(1, baseDmg - calcEffectiveStats(s, t).defense));
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
        if (newHp <= 0 && t.playerId === 0 && !t.isDecoy) {
          s.lastPlayerCasualty = { victimName: t.name, killerName: ai.name, sourceName: ab.name, damage: dmg };
        }
      }
      const label = effect.trueDamage ? `${baseDmg} TRUE dmg` : `~${baseDmg} dmg (DEF applies)`;
      pushLog(s, `${ai.name} used ${ab.name} — ${label} to ALL!`, 1);
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
        if (newHp <= 0 && target.playerId === 0 && !target.isDecoy) {
          s.lastPlayerCasualty = { victimName: target.name, killerName: ai.name, sourceName: ab.name, damage: dmg };
        }
        pushLog(s, `${ai.name} used ${ab.name} on ${target.name} for ${dmg} dmg!`, 1);
        abilitiesUsed++;
      } else continue;
    } else if (effect.type === 'melee_debuff') {
      // Melee hit on nearest target in range, then apply a debuff
      const currentAi = s.players[1].icons.find(i => i.id === aiId)!;
      const meleeRange = effect.range ?? 1;
      const inRange = playerIcons().filter(e => hexDistance(currentAi.position, e.position) <= meleeRange);
      if (!inRange.length) continue;
      const target = inRange.sort((a, b) => hexDistance(currentAi.position, a.position) - hexDistance(currentAi.position, b.position))[0];
      const aiStatsMD = calcEffectiveStats(s, currentAi);
      const rawDmgMD = aiStatsMD.might * (effect.multiplier ?? 1.0);
      const dmgMD = Math.round(Math.max(1, rawDmgMD - calcEffectiveStats(s, target).defense));
      const newHpMD = Math.round(Math.max(0, target.stats.hp - dmgMD));
      s = {
        ...s,
        players: s.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => {
            if (ic.id !== target.id) return ic;
            const withHp = { ...ic, stats: { ...ic.stats, hp: newHpMD }, isAlive: newHpMD > 0, respawnTurns: newHpMD > 0 ? ic.respawnTurns : 4 };
            if (!effect.debuffType) return withHp;
            return { ...withHp, debuffs: [...(ic.debuffs ?? []), { type: effect.debuffType as any, magnitude: effect.magnitude ?? 0, turnsRemaining: effect.duration ?? 1 }] };
          }),
        })),
      };
      const debuffLabel = effect.debuffType ? ` + ${effect.debuffType}` : '';
      pushLog(s, `${ai.name} used ${ab.name} on ${target.name} for ${dmgMD} dmg${debuffLabel}!`, 1);
      abilitiesUsed++;
    } else if (effect.type === 'pull_attack') {
      // Pull the closest target in range toward the attacker, then strike
      const currentAi = s.players[1].icons.find(i => i.id === aiId)!;
      const attackRange = effect.range ?? 3;
      const inRange = playerIcons().filter(e => hexDistance(currentAi.position, e.position) <= attackRange);
      if (!inRange.length) continue;
      const target = inRange.sort((a, b) => hexDistance(currentAi.position, a.position) - hexDistance(currentAi.position, b.position))[0];
      // Pull: move target up to pullRange hexes closer to attacker
      const pullSteps = effect.pullRange ?? 2;
      const hexDirs = [{ q: 1, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: -1, r: 1 }];
      const occupiedPA = new Set(s.players.flatMap(p => p.icons).filter(ic => ic.isAlive && ic.id !== target.id).map(ic => `${ic.position.q},${ic.position.r}`));
      let pulled = target.position;
      for (let step = 0; step < pullSteps; step++) {
        const curDist = hexDistance(pulled, currentAi.position);
        if (curDist <= 1) break;
        const nextStep = hexDirs
          .map(d => ({ q: pulled.q + d.q, r: pulled.r + d.r }))
          .filter(p => !occupiedPA.has(`${p.q},${p.r}`))
          .filter(p => { const tile = s.board.find(t => t.coordinates.q === p.q && t.coordinates.r === p.r); return tile && tile.terrain.effects.movementModifier !== -999; })
          .sort((a, b) => hexDistance(a, currentAi.position) - hexDistance(b, currentAi.position))[0];
        if (!nextStep || hexDistance(nextStep, currentAi.position) >= curDist) break;
        pulled = nextStep;
      }
      if (pulled.q !== target.position.q || pulled.r !== target.position.r) {
        s = { ...s, players: s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== target.id ? ic : { ...ic, position: pulled }) })) };
      }
      // Strike after pull
      const updatedTarget = s.players[0].icons.find(i => i.id === target.id) ?? target;
      const aiStatsPA = calcEffectiveStats(s, currentAi);
      const rawDmgPA = aiStatsPA.power * (effect.multiplier ?? 0.8);
      const dmgPA = Math.round(Math.max(1, rawDmgPA - calcEffectiveStats(s, updatedTarget).defense));
      const newHpPA = Math.round(Math.max(0, updatedTarget.stats.hp - dmgPA));
      s = {
        ...s,
        players: s.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== target.id ? ic : {
            ...ic,
            stats: { ...ic.stats, hp: newHpPA },
            isAlive: newHpPA > 0,
            respawnTurns: newHpPA > 0 ? ic.respawnTurns : 4,
          }),
        })),
      };
      pushLog(s, `${ai.name} pulled ${target.name} closer and struck for ${dmgPA} dmg!`, 1);
      abilitiesUsed++;
    } else if (effect.type === 'copy_attack') {
      // Copy nearest player's Might, then strike that player with it
      const currentAi = s.players[1].icons.find(i => i.id === aiId)!;
      const sorted = playerIcons().sort((a, b) => hexDistance(currentAi.position, a.position) - hexDistance(currentAi.position, b.position));
      const target = sorted[0];
      if (!target) continue;
      // Imitate: deal 0.5× copied Might + 0.5× copied Power, minus target's defense
      const targetStats = calcEffectiveStats(s, target);
      const rawDmgCA = Math.round(targetStats.might * 0.5 + targetStats.power * 0.5);
      const dmgCA = Math.round(Math.max(1, rawDmgCA - targetStats.defense));
      const newHpCA = Math.round(Math.max(0, target.stats.hp - dmgCA));
      s = {
        ...s,
        players: s.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== target.id ? ic : {
            ...ic,
            stats: { ...ic.stats, hp: newHpCA },
            isAlive: newHpCA > 0,
            respawnTurns: newHpCA > 0 ? ic.respawnTurns : 4,
          }),
        })),
      };
      pushLog(s, `${ai.name} mimics ${target.name} and strikes for ${dmgCA} dmg!`, 1);
      abilitiesUsed++;
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
    // Stun: skip all actions for this enemy this turn
    const preStunCheck = s.players[1].icons.find(i => i.id === aiOrig.id);
    if (preStunCheck?.debuffs?.some(d => d.type === 'stun')) {
      pushLog(s, `${aiOrig.name} is STUNNED — cannot act!`, 1);
      continue;
    }
    // Charmed: attacks nearest alive ally instead of player
    if (preStunCheck?.debuffs?.some(d => d.type === 'charmed')) {
      const charmedIcon = preStunCheck!;
      const nearestAlly = s.players[1].icons
        .filter(ic => ic.isAlive && ic.id !== charmedIcon.id && hexDistance(charmedIcon.position, ic.position) <= (charmedIcon.stats.attackRange ?? 1))
        .sort((a, b) => hexDistance(charmedIcon.position, a.position) - hexDistance(charmedIcon.position, b.position))[0];
      if (nearestAlly) {
        const dmg = resolveBasicAttackDamage(s, charmedIcon, nearestAlly);
        const newHp = Math.round(Math.max(0, nearestAlly.stats.hp - dmg));
        s.players = s.players.map(p => ({
          ...p, icons: p.icons.map(ic => ic.id !== nearestAlly.id ? ic : {
            ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
          }),
        }));
        s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === charmedIcon.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
        pushLog(s, `${charmedIcon.name} is CHARMED — attacked ally ${nearestAlly.name} for ${dmg.toFixed(0)} dmg!`, 1);
      } else {
        pushLog(s, `${charmedIcon.name} is CHARMED — no ally in range to attack.`, 1);
      }
      continue; // skip normal AI logic
    }
    // Silence: skip ability execution but allow basic attack
    const isSilenced = preStunCheck?.debuffs?.some(d => d.type === 'silence') ?? false;
    // Execute boss/elite abilities at the start of each enemy's turn
    if (!isSilenced) s = executeEnemyAbilities(s, aiOrig.id);
    let ai = s.players[1].icons.find(i => i.id === aiOrig.id);
    if (!ai || !ai.isAlive) continue;

    const aiIsBlinded = ai.debuffs?.some(d => d.type === 'blinded') ?? false;
    const basicRange = aiIsBlinded ? 1
      : ai.name.includes("Napoleon") || ai.name.includes("Da Vinci") || ai.name.includes("Beethoven") ? 2 : 1;
    const enemies = () => s.players[0].icons.filter(i => i.isAlive);
    const iconIntents = intents.filter(i => i.iconId === aiOrig.id);

    // --- Main action intent (skip buff/upcoming intents) ---
    const mainIntent = iconIntents.find(i => i.type !== 'buff' && i.type !== 'upcoming_ability');

    if ((mainIntent?.type === 'ability' || mainIntent?.type === 'heal') && !isSilenced) {
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
    } else if (mainIntent?.type === 'attack' || (isSilenced && mainIntent?.type === 'ability')) {
      // Silenced enemies fall back to basic attack even if intent was ability
      ai = s.players[1].icons.find(i => i.id === aiOrig.id)!;
      if (!ai.cardUsedThisTurn) {
        if (mainIntent?.abilityName === 'Attack Base' && (s as any).encounterObjective === 'destroy_base') {
          const PLAYER_BASE_INTENT: Qr = { q: -5, r: 4 };
          if (hexDistance(ai.position, PLAYER_BASE_INTENT) <= basicRange && s.baseHealth[0] > 0) {
            // Base attack: flat 30 + 25% of attacker Might. Mirrors intent calc above so the badge number matches reality.
            const dmg = Math.max(1, 30 + Math.floor(ai.stats.might * 0.25));
            const newBases = [...s.baseHealth];
            newBases[0] = Math.max(0, newBases[0] - dmg);
            s.baseHealth = newBases as [number, number];
            s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
            pushLog(s, `${ai.name} attacked player base for ${dmg.toFixed(0)} dmg`, 1);
          }
        } else {
          // Basic attack — if taunted, MUST attack the taunter; skip entirely if taunter is out of range
          const preMoveAiTaunt = ai.debuffs?.find(d => d.type === 'taunted');
          const preMoveAiTaunter = preMoveAiTaunt?.sourceIconId
            ? s.players[0].icons.find(ic => ic.id === preMoveAiTaunt.sourceIconId && ic.isAlive && hexDistance(ai!.position, ic.position) <= basicRange && !hasLineMountain(s.board, ai!.position, ic.position))
            : null;
          // If taunted but taunter not reachable, do not attack anyone
          const target = preMoveAiTaunt
            ? preMoveAiTaunter   // taunted: only the taunter, or null (skip attack)
            : enemies().find(e => hexDistance(ai!.position, e.position) <= basicRange && !hasLineMountain(s.board, ai!.position, e.position));
          if (target) {
            const dmg = resolveBasicAttackDamage(s, ai, target);
            const newHp = Math.round(Math.max(0, target.stats.hp - dmg));
            if (newHp === Math.round(target.stats.hp)) {
              s.pendingZeroHitPositions = [...(s.pendingZeroHitPositions ?? []), target.position];
            }
            s.players = s.players.map(p => ({
              ...p, icons: p.icons.map(ic => ic.id !== target.id ? ic : {
                ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
              }),
            }));
            s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
            pushLog(s, `${ai.name} basic-attacked ${target.name} for ${dmg.toFixed(0)} dmg`, 1);
            // Record defeat cause if this basic attack just killed a player character
            if (newHp <= 0 && target.playerId === 0 && !target.isDecoy) {
              s.lastPlayerCasualty = { victimName: target.name, killerName: ai.name, sourceName: 'Basic Attack', damage: Math.round(dmg) };
            }
            // Decoy explosion: if target is a decoy and just died, explode
            if (newHp <= 0 && target.isDecoy && (target.decoyExplosionDmg ?? 0) > 0) {
              const explosionDmg = target.decoyExplosionDmg!;
              const explosionRange = target.decoyExplosionRange ?? 2;
              const nearbyEnemies = s.players.flatMap(p => p.icons).filter(
                ic => ic.isAlive && ic.playerId !== target.playerId && hexDistance(ic.position, target.position) <= explosionRange
              );
              for (const enemy of nearbyEnemies) {
                const eHp = Math.max(0, enemy.stats.hp - explosionDmg);
                s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
                  ...ic, stats: { ...ic.stats, hp: eHp }, isAlive: eHp > 0, respawnTurns: eHp > 0 ? ic.respawnTurns : 4,
                }) }));
              }
              if (nearbyEnemies.length > 0) pushLog(s, `Decoy EXPLODES for ${explosionDmg} dmg (${nearbyEnemies.length} enemies hit)!`, target.playerId);
            }
          }
        }
      }
    }

    // --- Movement for every AI icon ---
    ai = s.players[1].icons.find(i => i.id === aiOrig.id)!;
    if (!ai || !ai.isAlive || ai.movedThisTurn || ai.stats.movement <= 0 || ai.debuffs?.some(d => d.type === 'rooted')) continue;

    // Targets: enemies > beast camps > player base
    // If this AI unit is taunted, it must move toward the taunter only
    const PLAYER_BASE: Qr = { q: -5, r: 4 };
    const tauntDebuff = ai.debuffs?.find(d => d.type === 'taunted');
    const tauntSource = tauntDebuff?.sourceIconId
      ? s.players[0].icons.find(ic => ic.id === tauntDebuff.sourceIconId && ic.isAlive)
      : null;
    const allTargets: { position: Qr }[] = tauntSource
      ? [{ position: tauntSource.position }]
      : [
          ...enemies().map(e => ({ position: e.position })),
          // Beast camps are on the AI's side — skip them as movement targets
          { position: PLAYER_BASE },
        ];
    if (!allTargets.length) continue;

    const budget = Math.min(ai.stats.movement, ai.stats.moveRange);
    // Enemy allies (other AI icons) are passable transit tiles; player icons are hard blocks
    const aiEnemyKeys = new Set(
      s.players[0].icons
        .filter(ic => ic.isAlive)
        .map(ic => tileKey(ic.position.q, ic.position.r))
    );
    const aiAllyKeys = new Set(
      s.players[1].icons
        .filter(ic => ic.isAlive && ic.id !== ai!.id)
        .map(ic => tileKey(ic.position.q, ic.position.r))
    );
    const allowLakeAI = ai.name.includes("Sun-sin");
    const costMap = reachableWithCosts(s.board, ai.position, budget, aiEnemyKeys, allowLakeAI, aiAllyKeys);
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

      // Post-move attack: enemies > base (taunted units must target the taunter)
      ai = s.players[1].icons.find(i => i.id === aiOrig.id)!;
      if (!ai.cardUsedThisTurn) {
        const postMoveTaunt = ai.debuffs?.find(d => d.type === 'taunted');
        const postMoveTaunter = postMoveTaunt?.sourceIconId
          ? s.players[0].icons.find(ic => ic.id === postMoveTaunt.sourceIconId && ic.isAlive && hexDistance(ai!.position, ic.position) <= basicRange)
          : null;
        // If taunted, only attack the taunter — don't fall back to any other target
        const target = postMoveTaunt
          ? postMoveTaunter
          : enemies().find(e => hexDistance(ai!.position, e.position) <= basicRange);
        if (target) {
          const dmg = resolveBasicAttackDamage(s, ai, target);
          const newHp = Math.round(Math.max(0, target.stats.hp - dmg));
          if (newHp === Math.round(target.stats.hp)) {
            s.pendingZeroHitPositions = [...(s.pendingZeroHitPositions ?? []), target.position];
          }
          s.players = s.players.map(p => ({
            ...p, icons: p.icons.map(ic => ic.id !== target.id ? ic : {
              ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
            }),
          }));
          s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
          pushLog(s, `${ai.name} attacked ${target.name} for ${dmg.toFixed(0)} dmg`, 1);
          if (newHp <= 0 && target.playerId === 0 && !target.isDecoy) {
            s.lastPlayerCasualty = { victimName: target.name, killerName: ai.name, sourceName: 'Basic Attack', damage: Math.round(dmg) };
          }
        } else if (!(s as any).isRoguelikeRun && hexDistance(ai.position, PLAYER_BASE) <= basicRange && s.baseHealth[0] > 0) {
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
      // Controlled units treat enemy (p1) icons as hard blocks; other p0 icons as transit
      const ctrlBlockedKeys = new Set(s.players[1].icons.filter(ic => ic.isAlive).map(ic => tileKey(ic.position.q, ic.position.r)));
      const ctrlAllyKeys = new Set(s.players[0].icons.filter(ic => ic.isAlive && ic.id !== ctrlUnit.id).map(ic => tileKey(ic.position.q, ic.position.r)));
      const ctrlCosts = reachableWithCosts(s.board, ctrlUnit.position, budget, ctrlBlockedKeys, false, ctrlAllyKeys);
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
function applyKillPassives(s: ExtState, killerId: string, victimWasAlive: boolean, victimIsNowDead: boolean, victimId?: string): ExtState {
  if (!victimWasAlive || !victimIsNowDead) return s;
  const killer = s.players.flatMap(p => p.icons).find(i => i.id === killerId);
  if (!killer) return s;
  const victim = victimId ? s.players.flatMap(p => p.icons).find(i => i.id === victimId) : undefined;

  // Track kill blows for post-combat XP (player 0 kills of enemies only)
  if (killer.playerId === 0) {
    const kbMap: Record<string, number> = (s as any).playerKillBlows ?? {};
    (s as any).playerKillBlows = { ...kbMap, [killer.name]: (kbMap[killer.name] ?? 0) + 1 };
    // Log every enemy kill by name for achievement tracking (counts respawned kills too)
    if (victim && victim.playerId === 1) {
      (s as any).killedEnemyNameLog = [...((s as any).killedEnemyNameLog ?? []), victim.name];
    }
  }

  // Genghis Bloodlust: +12 Might stack, +1 mana (cap 3, or uncapped with Eternal Steppe).
  // Eternal Steppe also grants +1 moveRange per stack but is HARD-CAPPED at +3 to prevent runaway scaling.
  if (killer.name.includes("Genghis")) {
    const stacks = killer.passiveStacks ?? 0;
    const hasEternalSteppe = killer.itemPassiveTags?.includes('sig_genghis_uncapped_bloodlust');
    const levelCap = 2 + Math.floor((killer.level ?? 1) / 2);
    const maxStacks = hasEternalSteppe ? 999 : levelCap;
    if (stacks < maxStacks) {
      const newStacks = stacks + 1;
      const ETERNAL_STEPPE_MOVE_CAP = 3;
      const grantsMoveBonus = hasEternalSteppe && newStacks <= ETERNAL_STEPPE_MOVE_CAP;
      s.players = s.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== killerId ? ic : {
          ...ic,
          passiveStacks: newStacks,
          // Eternal Steppe: +1 moveRange per stack, capped at +3 total.
          stats: grantsMoveBonus ? { ...ic.stats, moveRange: ic.stats.moveRange + 1, movement: ic.stats.movement + 1 } : ic.stats,
        }),
      }));
      const newMana = [...s.globalMana] as [number, number];
      newMana[killer.playerId] = Math.min(5, newMana[killer.playerId] + 1);
      s.globalMana = newMana;
      const moveLabel = hasEternalSteppe
        ? (grantsMoveBonus ? `, +1 Move (${newStacks}/${ETERNAL_STEPPE_MOVE_CAP})` : ', Move at cap')
        : '';
      const label = hasEternalSteppe ? `${newStacks} stacks (+12 Might${moveLabel}, +1 Mana)` : `${newStacks}/${maxStacks} stacks (+12 Might, +1 Mana)`;
      pushLog(s, `${killer.name} Bloodlust! ${label}`, killer.playerId);
    }
  }

  // Teddy Bully!: each kill grants +10 Might (cap 3). Bull Moose Heart: also +10 Defense per stack
  if (killer.name.includes("Teddy")) {
    const stacks = killer.passiveStacks ?? 0;
    const victimName = victim?.name ?? '';
    const isMinorUnit = victimName.includes("Terracotta") || victimName.includes("Drone") || victimName.includes("drone") || victimName.includes("War Elephant");
    const hasBullMoose = killer.itemPassiveTags?.includes('sig_teddy_bull_moose');
    const bullyBonus = 8 + (killer.level ?? 1);
    if (stacks < 3 && !isMinorUnit) {
      const newStacks = stacks + 1;
      s.players = s.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== killerId ? ic : {
          ...ic,
          passiveStacks: newStacks,
          stats: {
            ...ic.stats,
            might: ic.stats.might + bullyBonus,
            defense: hasBullMoose ? ic.stats.defense + 10 : ic.stats.defense,
          },
        }),
      }));
      const label = hasBullMoose ? `${newStacks}/3 stacks (+${bullyBonus} Might, +10 DEF)` : `${newStacks}/3 stacks (+${bullyBonus} Might)`;
      pushLog(s, `${killer.name} Bully! ${label}`, killer.playerId);
    }
  }

  // Vel'thar Bottleneck: when a player 0 character (not summon/decoy) dies, all Vel'thar on same team gain +1 stack
  if (victim && victim.playerId === 0) {
    const isMinorUnit = victim.name.includes("Drone") || victim.name.includes("Decoy") || victim.name.includes("Terracotta") || victim.name.includes("Cavalry");
    if (!isMinorUnit) {
      const veltharAllies = s.players
        .flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.playerId === 0 && ic.name.includes("Vel'thar") && ic.id !== victim.id);
      for (const vel of veltharAllies) {
        const newStacks = (vel.passiveStacks ?? 0) + 1;
        s.players = s.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== vel.id ? ic : { ...ic, passiveStacks: newStacks }),
        }));
        const lvl = vel.level ?? 1;
        const perStack = 3 + 2 * lvl;
        pushLog(s, `${vel.name} Bottleneck — ${newStacks} stack(s) (+${perStack} Might & Power per stack)`, vel.playerId);
      }
      // Survivor's Totem DR is handled passively in applyDamageToIcon — no ally-death trigger needed
    }
  }

  // Battle Drum (draw_2_on_kill): draw 2 cards for killer's player
  const draw2Count = killer.itemPassiveTags?.filter(t => t === 'draw_2_on_kill').length ?? 0;
  const draw1Count = killer.itemPassiveTags?.filter(t => t === 'draw_on_kill').length ?? 0;
  if (draw2Count > 0 || draw1Count > 0) {
    const drawCount = draw2Count * 2 + draw1Count * 1;
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

  // Soul Ember (on_kill_heal_15): restore 20 HP to killer per ember
  const soulEmberCount = killer.itemPassiveTags?.filter(t => t === 'on_kill_heal_15').length ?? 0;
  if (soulEmberCount > 0) {
    s.players = s.players.map(p => ({
      ...p,
      icons: p.icons.map(ic => {
        if (ic.id !== killerId || !ic.isAlive) return ic;
        const healAmt = 20 * soulEmberCount;
        const healed = Math.min(ic.stats.maxHp, ic.stats.hp + healAmt);
        pushLog(s, `${ic.name} Soul Ember: +${healAmt} HP on kill`, ic.playerId);
        return { ...ic, stats: { ...ic.stats, hp: healed } };
      }),
    }));
  }

  const eye1Count = killer.itemPassiveTags?.filter(t => t === 'next_card_free_on_kill').length ?? 0;
  if (eye1Count > 0) {
    s.players = s.players.map(p => ({
      ...p,
      icons: p.icons.map(ic => ic.id !== killerId ? ic : { ...ic, freeCardsLeft: (ic.freeCardsLeft ?? 0) + eye1Count }),
    }));
    pushLog(s, `${killer.name} Znyxorga's Eye: next ${eye1Count} card(s) are FREE!`, killer.playerId);
  }

  // War Trophy (on_kill_might_power_plus3): permanently +2 Might and +2 Power per trophy (cap: 5 stacks per holder → +10/+10)
  const warTrophyCount = killer.itemPassiveTags?.filter(t => t === 'on_kill_might_power_plus3').length ?? 0;
  if (warTrophyCount > 0) {
    s.players = s.players.map(p => ({
      ...p,
      icons: p.icons.map(ic => {
        if (ic.id !== killerId || !ic.isAlive) return ic;
        const curStacks = ic.warTrophyStacks ?? 0;
        if (curStacks >= 5) return ic; // cap reached
        const bonus = 2 * warTrophyCount;
        pushLog(s, `${ic.name} War Trophy: +${bonus} Might, +${bonus} Power! (${curStacks + 1}/5)`, ic.playerId);
        return { ...ic, stats: { ...ic.stats, might: ic.stats.might + bonus, power: ic.stats.power + bonus }, warTrophyStacks: curStacks + 1 };
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
  // Diamond Shell / Nelson One Eye, One Hand: negate the first damaging hit each fight
  if (dmg > 0 && !ic.firstHitNegated && (ic.name.includes("Nelson") || ic.itemPassiveTags?.includes('negate_first_hit'))) {
    const label = ic.name.includes("Nelson") ? "One Eye, One Hand" : "Diamond Shell";
    if (logFn) logFn(`${ic.name} ${label}: first hit negated!`);
    return { ...ic, firstHitNegated: true };
  }
  // Turtle Hull: Yi Sun-sin takes 20% less damage from all sources
  if (dmg > 0 && ic.itemPassiveTags?.includes('sunsin_dmg_reduce_20pct')) {
    dmg = Math.floor(dmg * 0.80);
  }
  // Survivor's Totem: Vel'thar takes 35% less damage at or below 40% HP
  if (dmg > 0 && ic.name.includes("Vel'thar") && ic.itemPassiveTags?.includes('velthar_low_hp_resilience')) {
    if (ic.stats.hp / ic.stats.maxHp <= 0.40) {
      dmg = Math.round(dmg * 0.65);
      if (logFn) logFn(`${ic.name} Survivor's Totem — 35% DR (low HP)!`);
    }
  }
  const rawHp = Math.max(0, ic.stats.hp - dmg);
  // Void Armor: once per fight, survive a lethal hit at 1 HP
  if (rawHp <= 0 && !ic.voidArmorUsed && ic.itemPassiveTags?.includes('once_survive_lethal')) {
    if (logFn) logFn(`${ic.name} Void Armor: survived lethal blow at 1 HP!`);
    return { ...ic, stats: { ...ic.stats, hp: 1 }, isAlive: true, voidArmorUsed: true, respawnTurns: ic.respawnTurns };
  }
  // Bull Moose Heart (Teddy): same survive-lethal pattern
  if (rawHp <= 0 && !ic.voidArmorUsed && ic.itemPassiveTags?.includes('sig_teddy_bull_moose')) {
    if (logFn) logFn(`${ic.name} Bull Moose Heart: refused to fall! (1 HP)`);
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
     Immediate victory check — fires the moment the last enemy (or last ally) dies.
     Uses alive-count numbers as deps so React's Object.is() reliably catches 1→0.
     Killing all enemies wins regardless of objective type.
     ========================= */
  useEffect(() => {
    if (gameState.phase !== 'combat') return;
    const ext = gameState as unknown as ExtState;
    const p0Alive = gameState.players[0].icons.some(ic => ic.isAlive);
    const p1Alive = gameState.players[1].icons.some(ic => ic.isAlive);
    if (!p0Alive) {
      setGameState(prev => prev.phase === 'combat' ? { ...prev, phase: 'defeat' as any, winner: 1 } : prev);
    } else if (!p1Alive && ext.encounterObjective !== 'destroy_base') {
      // destroy_base: killing all enemies does NOT end the fight — you must destroy the base

      // Multi-phase boss: if phases remain, spawn the next wave instead of triggering victory
      const remainingPhases = (ext as any).bossPhases as import('@/types/roguelike').EnemyTemplate[][] | undefined;
      if (remainingPhases && remainingPhases.length > 0) {
        setGameState(prev => {
          if (prev.phase !== 'combat') return prev;
          const phases = (prev as any).bossPhases as import('@/types/roguelike').EnemyTemplate[][];
          if (!phases || phases.length === 0) {
            return { ...prev, phase: 'victory' as any, winner: 0 };
          }
          const nextPhaseEnemies = phases[0];
          const phasesLeft = phases.slice(1);
          const scaleFactor: number = (prev as any).bossPhaseScaleFactor ?? 1.0;
          const phaseNum: number = ((prev as any).currentBossPhase ?? 1) + 1;
          const total: number = (prev as any).totalBossPhases ?? 4;

          const newEnemyIcons = buildEnemyIconsFromEncounter(
            { enemies: nextPhaseEnemies } as import('@/types/roguelike').EncounterDef,
            scaleFactor,
          );
          const allIcons = [...prev.players[0].icons, ...newEnemyIcons];
          const newSpeedQueue = initSpeedQueue(allIcons);

          const enemyNames = nextPhaseEnemies.map((e: import('@/types/roguelike').EnemyTemplate) => e.name).join(' & ');
          const phaseMsg = `⚡ PHASE ${phaseNum}/${total} — ${enemyNames} enter the arena!`;

          return {
            ...prev,
            players: [
              prev.players[0],
              { ...prev.players[1], icons: newEnemyIcons },
            ],
            speedQueue: newSpeedQueue,
            queueIndex: 0,
            activePlayerId: 0 as const,
            // Refill player mana for the new phase
            globalMana: [prev.globalMaxMana[0], prev.globalMana[1]],
            bossPhases: phasesLeft,
            currentBossPhase: phaseNum,
            aiIntents: [],
            combatLog: [...((prev as any).combatLog ?? []), { message: phaseMsg, turn: prev.currentTurn }],
          } as any;
        });
      } else {
        setGameState(prev => prev.phase === 'combat' ? { ...prev, phase: 'victory' as any, winner: 0 } : prev);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState.players[0].icons.filter(ic => ic.isAlive).length,
    gameState.players[1].icons.filter(ic => ic.isAlive).length,
  ]);

  /* Immediate destroy_base victory — fires the moment base health hits 0 mid-turn,
     no End Turn press required.
     Use individual number deps (not array ref) so React's Object.is() reliably
     detects the 150 → 0 transition on every render. */
  useEffect(() => {
    if (gameState.phase !== 'combat') return;
    const bh = gameState.baseHealth;
    if (!bh || bh.length < 2) return;
    if (bh[1] <= 0) {
      setGameState(prev => prev.phase === 'combat' ? { ...prev, phase: 'victory' as any, winner: 0 } : prev);
    } else if (bh[0] <= 0 && !(gameState as any).isRoguelikeRun) {
      setGameState(prev => prev.phase === 'combat' ? { ...prev, phase: 'defeat' as any, winner: 1 } : prev);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.baseHealth[0], gameState.baseHealth[1]]);

  /* Immediate survive victory — fires as soon as currentTurn exceeds the target */
  useEffect(() => {
    if (gameState.phase !== 'combat') return;
    const ext = gameState as unknown as ExtState;
    if (ext.encounterObjective === 'survive' && ext.survivalTurnsTarget > 0) {
      if (gameState.currentTurn > ext.survivalTurnsTarget && gameState.players[0].icons.some(ic => ic.isAlive)) {
        setGameState(prev => prev.phase === 'combat' ? { ...prev, phase: 'victory' as any, winner: 0 } : prev);
      }
    }
  }, [gameState.currentTurn]); // eslint-disable-line react-hooks/exhaustive-deps

  /* =========================
     Input handlers (PLAYER targeting)
     ========================= */

  const selectTile = useCallback((coordinates: Coordinates) => {
    setGameState((prev) => {
      let state = { ...prev } as ExtState;

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
        // Mountains block line-of-sight for ranged attacks (adjacent attacks can always hit)
        if (hexDistance(executor.position, coordinates) > 1 && hasLineMountain(state.board, executor.position, coordinates)) {
          toast.error("Mountains block line of sight!");
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
          const codexHpBonus = executor.itemPassiveTags?.includes('sig_davinci_codex') ? 30 : 0;
          const droneHp   = Math.round(dronePower * 1.8) + codexHpBonus;
          const droneMight = Math.round(dronePower * 1.2);
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

        // ── Decoy placement ───────────────────────────────────────────────────
        if (card.effect.placeDecoy) {
          const occupied = updated.players.flatMap(p => p.icons).some(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          const tile = updated.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          if (occupied || !tile || tile.terrain.effects.movementModifier === -999) {
            toast.error(getT().messages.tileOccupied);
            return prev;
          }
          const decoyHp = card.effect.decoyHp ?? 30;
          const decoyUnit: Icon = {
            id: `decoy_${makeId()}`,
            name: "Decoy",
            role: "tank",
            stats: {
              hp: decoyHp, maxHp: decoyHp,
              moveRange: 0, speed: 1,
              might: 0, power: 0, defense: 0,
              movement: 0, mana: 0, maxMana: 0,
            },
            abilities: [],
            passive: "Decoy",
            position: coordinates,
            playerId: executor.playerId,
            isAlive: true,
            respawnTurns: 0,
            cardUsedThisTurn: true,
            movedThisTurn: true,
            hasUltimate: false,
            ultimateUsed: true,
            isDecoy: true,
            decoyExplosionDmg: card.effect.decoyExplosion ?? 20,
            decoyExplosionRange: card.effect.decoyRange ?? 2,
          };
          updated.players = updated.players.map(p =>
            p.id !== executor.playerId ? p : { ...p, icons: [...p.icons, decoyUnit] }
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
          pushLog(updated, `${executor.name} placed a Decoy (${decoyHp} HP)!`, executor.playerId);
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Flying Machine card teleport ──────────────────────────────────────
        if (card.effect.teleport) {
          const tile = state.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          if (!tile || tile.terrain.effects.movementModifier === -999) { toast.error(getT().messages.cantTeleport); return prev; }
          // Aerial Lens: if executor has davinci_machine_swap, can swap with an ally instead of blocking
          const allIcons = state.players.flatMap(p => p.icons);
          const allyOnTarget = allIcons.find(ic => ic.isAlive && ic.id !== executorId && ic.playerId === executor.playerId && ic.position.q === coordinates.q && ic.position.r === coordinates.r);
          const enemyOnTarget = allIcons.find(ic => ic.isAlive && ic.playerId !== executor.playerId && ic.position.q === coordinates.q && ic.position.r === coordinates.r);
          const hasSwap = executor.itemPassiveTags?.includes('davinci_machine_swap');
          if (enemyOnTarget) { toast.error(getT().messages.cantTeleport); return prev; }
          if (allyOnTarget && !hasSwap) { toast.error(getT().messages.cantTeleport); return prev; }
          const fromPos = { ...executor.position };
          if (allyOnTarget && hasSwap) {
            // Swap Da Vinci and the ally
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => {
                if (ic.id === executorId) return { ...ic, position: coordinates, movedThisTurn: true, abilityUsedThisTurn: true };
                if (ic.id === allyOnTarget.id) return { ...ic, position: fromPos, movedThisTurn: true };
                return ic;
              }),
            }));
            pushLog(updated, `${executor.name} swaps with ${allyOnTarget.name} via Flying Machine!`, executor.playerId);
          } else {
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== executorId ? ic : {
                ...ic, position: coordinates, movedThisTurn: true, abilityUsedThisTurn: true,
              }),
            }));
            pushLog(updated, `${executor.name} used ${card.name} to teleport!`, executor.playerId);
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

        // ── Jump card — teleport to target tile, consuming 1 movement ────────
        if (card.effect.jump) {
          const occupied = updated.players.flatMap(p => p.icons).some(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (occupied) { toast.error(getT().messages.tileOccupied); return prev; }
          const tile = state.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          if (!tile || tile.terrain.effects.movementModifier === -999) { toast.error(getT().messages.cantTeleport); return prev; }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : {
              ...ic,
              position: coordinates,
              movedThisTurn: true,
              stats: { ...ic.stats, movement: Math.max(0, ic.stats.movement - 1) },
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
          pushLog(updated, `${executor.name} jumped to (${coordinates.q},${coordinates.r})!`, executor.playerId);
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
          const terraKilnBonus = executor.itemPassiveTags?.includes('huang_terra_buff');
          const hasJadeSeal = executor.itemPassiveTags?.includes('sig_huang_jade_seal');
          const jadeSealMult = hasJadeSeal ? 1.2 : 1.0; // +20% stats with Jade Seal
          const jadeSealTurns = hasJadeSeal ? 2 : 0;     // +2 turns duration
          const terracottaUnit: Icon = {
            id: `terracotta_${makeId()}`,
            name: isArcher ? "Terracotta Archer" : "Terracotta Warrior",
            role: isArcher ? "dps_ranged" : "dps_melee",
            stats: {
              hp: Math.round((40 + (card.effect.summonHpBonus ?? 0) + (terraKilnBonus ? 20 : 0)) * jadeSealMult),
              maxHp: Math.round((40 + (card.effect.summonHpBonus ?? 0) + (terraKilnBonus ? 20 : 0)) * jadeSealMult),
              moveRange: 2, speed: 4,
              might: Math.round(((isArcher ? Math.round(exStats.might * 1.5) : exStats.might) + (terraKilnBonus ? 10 : 0)) * jadeSealMult),
              power: 0,
              defense: Math.round(exStats.defense * jadeSealMult),
              movement: 0, mana: 0, maxMana: 0,
              attackRange: isArcher ? 2 : 1,
            },
            abilities: [], passive: "Terracotta",
            position: coordinates, playerId: executor.playerId,
            isAlive: true, respawnTurns: 0,
            cardUsedThisTurn: false, movedThisTurn: true,
            hasUltimate: false, ultimateUsed: true,
            droneExpiresTurn: state.currentTurn + 2 + jadeSealTurns,
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
          const cavKilnBonus = executor.itemPassiveTags?.includes('huang_terra_buff');
          const cavJadeSeal = executor.itemPassiveTags?.includes('sig_huang_jade_seal');
          const cavJM = cavJadeSeal ? 1.2 : 1.0;
          const cavJT = cavJadeSeal ? 2 : 0;
          const cavalryUnit: Icon = {
            id: `terracotta_cav_${makeId()}`,
            name: "Terracotta Cavalry",
            role: "dps_melee",
            stats: {
              hp: Math.round((60 + (cavKilnBonus ? 20 : 0)) * cavJM), maxHp: Math.round((60 + (cavKilnBonus ? 20 : 0)) * cavJM),
              moveRange: 3, speed: 7,
              might: Math.round((Math.round(cavStats.might * 1.5) + (card.effect.cavalryMightBonus ?? 0) + (cavKilnBonus ? 10 : 0)) * cavJM),
              power: cavStats.power,
              defense: Math.round(Math.round(cavStats.defense * 1.5) * cavJM),
              movement: 0, mana: 0, maxMana: 0,
              attackRange: 1,
            },
            abilities: [], passive: "Terracotta",
            position: coordinates, playerId: executor.playerId,
            isAlive: true, respawnTurns: 0,
            cardUsedThisTurn: false, movedThisTurn: true,
            hasUltimate: false, ultimateUsed: true,
            droneExpiresTurn: state.currentTurn + 2 + cavJT,
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
          const controlDuration = (card.effect.controlDuration ?? 2) + (executor.itemPassiveTags?.includes('huang_control_extend') ? 1 : 0);
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
              const drowned = pushTile?.terrain.type === 'lake';
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
          // Immediately apply movement bonus to allies currently inside the zone
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => {
              if (!ic.isAlive || ic.playerId !== executor.playerId) return ic;
              const dist = hexDistance(ic.position, zone.center);
              if (dist > zone.radius) return ic;
              return { ...ic, stats: { ...ic.stats, moveRange: ic.stats.moveRange + zone.magnitude } };
            }),
          }));
          // Crescendo passive stack
          if (executor.name.includes("Beethoven")) {
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== executorId ? ic : {
                ...ic, passiveStacks: Math.min(15, (ic.passiveStacks ?? 0) + 1),
              }),
            }));
            const stacks = Math.min(15, (executor.passiveStacks ?? 0) + 1);
            pushLog(updated, `${executor.name} Crescendo: ${stacks}/15 (+${stacks * 2} Power)`, executor.playerId);
            // Resonant Crystal: Power×0.25 to all adjacent enemies after any Beethoven ability
            if (executor.itemPassiveTags?.includes('beethoven_resonance_aoe')) {
              const freshExec = updated.players.flatMap(p => p.icons).find(ic => ic.id === executorId) ?? executor;
              const atkStats = calcEffectiveStats(updated, freshExec);
              const adjacent = updated.players
                .flatMap(p => p.icons)
                .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= 1);
              for (const adj of adjacent) {
                const defStats = calcEffectiveStats(updated, adj);
                const dmg = Math.max(0, Math.round(atkStats.power * 0.25 - defStats.defense));
                if (dmg > 0) {
                  const newHp = Math.max(0, adj.stats.hp - dmg);
                  updated.players = updated.players.map(p => ({
                    ...p,
                    icons: p.icons.map(ic => ic.id !== adj.id ? ic : { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 }),
                  }));
                }
              }
              if (adjacent.length > 0) pushLog(updated, `${executor.name} Resonant Crystal — resonance wave hits ${adjacent.length} adjacent enem${adjacent.length !== 1 ? 'ies' : 'y'}!`, executor.playerId);
            }
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
          // Admiral's Banner (sunsin_naval_def_aura): also grants +30 DEF to healed allies
          if (executor.itemPassiveTags?.includes('sunsin_naval_def_aura')) {
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => {
                if (!alliesInRange.find(a => a.id === ic.id)) return ic;
                return { ...ic, cardBuffDef: (ic.cardBuffDef ?? 0) + 30 };
              }),
            }));
            pushLog(updated, `Admiral's Banner: allies in area gain +30 DEF this turn!`, executor.playerId);
          }
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
                    const drowned = pushTile?.terrain.type === 'lake';
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

        // ── Nelson: Crossing the T — line shot with scaling damage ───────────
        if (state.targetingMode?.abilityId === "line_scaling") {
          const range = (card.effect.range ?? 5) + (executor.itemPassiveTags?.includes('nelson_crossing_extend') ? 1 : 0);
          const lineHexes = snapToLineHexes(executor.position, coordinates, range);
          const lineKeys = new Set(lineHexes.map(h => tileKey(h.q, h.r)));
          const enemies = updated.players
            .flatMap(p => p.icons)
            .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && lineKeys.has(tileKey(ic.position.q, ic.position.r)))
            .sort((a, b) => hexDistance(a.position, executor.position) - hexDistance(b.position, executor.position));
          if (enemies.length === 0) { toast.error(getT().messages.noEnemiesOnLine); return prev; }
          const atkStats = calcEffectiveStats(updated, executor);
          // Each successive target takes 65% of the previous hit (no decay with Victory's Pennant)
          const hasVictoryPennant = executor.itemPassiveTags?.includes('sig_nelson_no_decay');
          let mult = card.effect.powerMult ?? 1.0;
          for (const enemy of enemies) {
            const defStats = calcEffectiveStats(updated, enemy);
            const dmg = Math.max(0.1, atkStats.power * mult - defStats.defense);
            const newHp = Math.round(Math.max(0, enemy.stats.hp - dmg));
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
                ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
              }),
            }));
            updated = applyKillPassives(updated, executorId, enemy.isAlive, newHp <= 0, enemy.id);
            pushLog(updated, `${executor.name} Crossing the T hit ${enemy.name} for ${dmg.toFixed(0)} dmg`, executor.playerId);
            if (!hasVictoryPennant) mult *= 0.65; // decay unless Victory's Pennant
          }
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Hannibal: Alpine March — directed charge move, ignores terrain cost ─
        if (state.targetingMode?.abilityId === "charge_move") {
          // Must be used before spending any movement
          if (executor.movedThisTurn) {
            toast.error("Alpine March must be used before moving!");
            return prev;
          }
          const HEX_DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
          const rotCW  = (dq: number, dr: number) => ({ q: -dr,     r: dq + dr });
          const rotCCW = (dq: number, dr: number) => ({ q: dq + dr, r: -dq    });
          const rawDq = coordinates.q - executor.position.q;
          const rawDr = coordinates.r - executor.position.r;
          const chargeDir = HEX_DIRS.reduce((best, d) => {
            const dot = rawDq * d.q + rawDr * d.r;
            return dot > (rawDq * best.q + rawDr * best.r) ? d : best;
          });
          const maxSteps = card.effect.chargeDist ?? 6;
          let currentPos = { ...executor.position };
          const marchStats = calcEffectiveStats(updated, executor);
          for (let step = 0; step < maxSteps; step++) {
            const nextPos = { q: currentPos.q + chargeDir.q, r: currentPos.r + chargeDir.r };
            const nextTile = updated.board.find(t => t.coordinates.q === nextPos.q && t.coordinates.r === nextPos.r);
            if (!nextTile || nextTile.terrain.effects.movementModifier === -999) break; // off-map or impassable mountain/lake
            // Stop at friendly
            const friendlyHere = updated.players.flatMap(p => p.icons).some(
              ic => ic.isAlive && ic.playerId === executor.playerId && ic.position.q === nextPos.q && ic.position.r === nextPos.r
            );
            if (friendlyHere) break;
            // Enemy in path — trample: deal damage + push sideways, then continue
            const enemyHere = updated.players.flatMap(p => p.icons).find(
              ic => ic.isAlive && ic.playerId !== executor.playerId && ic.position.q === nextPos.q && ic.position.r === nextPos.r
            );
            if (enemyHere) {
              const defStats = calcEffectiveStats(updated, enemyHere);
              const trampleMult = card.effect.chargeTrampleMult ?? 0.5;
              const trampleDmg = Math.max(0, Math.floor(marchStats.might * trampleMult) - defStats.defense);
              // Push sideways — try CW then CCW
              const cwDir = rotCW(chargeDir.q, chargeDir.r);
              const ccwDir = rotCCW(chargeDir.q, chargeDir.r);
              const cwDest  = { q: nextPos.q + cwDir.q,  r: nextPos.r + cwDir.r  };
              const ccwDest = { q: nextPos.q + ccwDir.q, r: nextPos.r + ccwDir.r };
              const occupiedKeys = new Set(updated.players.flatMap(p => p.icons)
                .filter(ic => ic.isAlive && ic.id !== enemyHere.id)
                .map(ic => `${ic.position.q}:${ic.position.r}`));
              const cwTileFree  = updated.board.some(t => t.coordinates.q === cwDest.q  && t.coordinates.r === cwDest.r  && t.terrain.effects.movementModifier !== -999) && !occupiedKeys.has(`${cwDest.q}:${cwDest.r}`);
              const ccwTileFree = updated.board.some(t => t.coordinates.q === ccwDest.q && t.coordinates.r === ccwDest.r && t.terrain.effects.movementModifier !== -999) && !occupiedKeys.has(`${ccwDest.q}:${ccwDest.r}`);
              const pushDest = cwTileFree ? cwDest : ccwTileFree ? ccwDest : null;
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => {
                  if (ic.id !== enemyHere.id) return ic;
                  const newHp = Math.max(0, ic.stats.hp - trampleDmg);
                  if (newHp <= 0) return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 };
                  return { ...ic, stats: { ...ic.stats, hp: newHp }, position: pushDest ?? ic.position };
                }),
              }));
              pushLog(updated, `⚔ ${executor.name} trampled ${enemyHere.name} — ${trampleDmg} dmg${pushDest ? ', pushed aside' : ''}!`, executor.playerId);
            }
            currentPos = nextPos;
          }
          // Move Hannibal to final position and consume all remaining movement
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : {
              ...ic, position: currentPos, movedThisTurn: true, cardUsedThisTurn: true,
              cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1,
              stats: { ...ic.stats, movement: 0 },
            }),
          }));
          pushLog(updated, `${executor.name} Alpine March — crossed the terrain!`, executor.playerId);
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Nelson: Kiss Me Hardy — charge in line, push enemies sideways ─────
        if (state.targetingMode?.abilityId === "charge_line_push") {
          const HEX_DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
          const rawDq = coordinates.q - executor.position.q;
          const rawDr = coordinates.r - executor.position.r;
          const chargeDir = HEX_DIRS.reduce((best, d) => {
            const dot = rawDq * d.q + rawDr * d.r;
            return dot > (rawDq * best.q + rawDr * best.r) ? d : best;
          });
          const rotCW  = (dq: number, dr: number) => ({ q: -dr,    r: dq + dr });
          const rotCCW = (dq: number, dr: number) => ({ q: dq + dr, r: -dq   });
          const maxSteps = card.effect.chargeDist ?? 4;
          const dmgMult = card.effect.chargeDmgMult ?? 0.85;
          let currentPos = { ...executor.position };
          const atkStats = calcEffectiveStats(updated, executor);
          for (let step = 0; step < maxSteps; step++) {
            const nextPos = { q: currentPos.q + chargeDir.q, r: currentPos.r + chargeDir.r };
            const nextTile = updated.board.find(t => t.coordinates.q === nextPos.q && t.coordinates.r === nextPos.r);
            if (!nextTile || nextTile.terrain.effects.movementModifier === -999) break;
            const enemyAtNext = updated.players.flatMap(p => p.icons).find(
              ic => ic.isAlive && ic.playerId !== executor.playerId && ic.position.q === nextPos.q && ic.position.r === nextPos.r
            );
            if (enemyAtNext) {
              const defStats = calcEffectiveStats(updated, enemyAtNext);
              const dmg = Math.max(0.1, atkStats.power * dmgMult - defStats.defense);
              const newHp = Math.max(0, enemyAtNext.stats.hp - dmg);
              // Side push (perpendicular)
              const cwDir = rotCW(chargeDir.q, chargeDir.r);
              const ccwDir = rotCCW(chargeDir.q, chargeDir.r);
              const cwPos  = { q: nextPos.q + cwDir.q,  r: nextPos.r + cwDir.r  };
              const ccwPos = { q: nextPos.q + ccwDir.q, r: nextPos.r + ccwDir.r };
              const allIcons = updated.players.flatMap(p => p.icons);
              const isFree = (pos: {q:number,r:number}) => {
                const t = updated.board.find(b => b.coordinates.q === pos.q && b.coordinates.r === pos.r);
                return t && t.terrain.effects.movementModifier !== -999 &&
                  !allIcons.some(ic => ic.isAlive && ic.position.q === pos.q && ic.position.r === pos.r);
              };
              const pushPos = isFree(cwPos) ? cwPos : isFree(ccwPos) ? ccwPos : null;
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => {
                  if (ic.id !== enemyAtNext.id) return ic;
                  const dest = pushPos ?? nextPos;
                  const destTile = updated.board.find(t => t.coordinates.q === dest.q && t.coordinates.r === dest.r);
                  const drowned = destTile?.terrain.type === 'lake' && pushPos !== null;
                  return { ...ic, position: drowned ? ic.position : dest, stats: { ...ic.stats, hp: Math.round(newHp) }, isAlive: newHp > 0 && !drowned, respawnTurns: (newHp <= 0 || drowned) ? 4 : ic.respawnTurns };
                }),
              }));
              updated = applyKillPassives(updated, executorId, enemyAtNext.isAlive, newHp <= 0, enemyAtNext.id);
              pushLog(updated, `${executor.name} Kiss Me Hardy hit ${enemyAtNext.name} for ${dmg.toFixed(0)} dmg, pushed sideways`, executor.playerId);
            }
            currentPos = nextPos;
          }
          // Move Nelson to final charge position
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : {
              ...ic, position: currentPos, movedThisTurn: true, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true,
            }),
          }));
          pushLog(updated, `${executor.name} Kiss Me Hardy charged!`, executor.playerId);
          // Hardy's Coat: +25 DEF for 2 turns after Kiss Me Hardy
          if (executor.itemPassiveTags?.includes('nelson_hardy_coat')) {
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== executorId ? ic : {
                ...ic, passiveStacks: 2, cardBuffDef: (ic.cardBuffDef ?? 0) + 25,
              }),
            }));
            pushLog(updated, `${executor.name} Hardy's Coat: +25 DEF for 2 turns!`, executor.playerId);
          }
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Hannibal: War Elephant summon ─────────────────────────────────────
        if (state.targetingMode?.abilityId === "summon_war_elephant") {
          const occupied = updated.players.flatMap(p => p.icons).some(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          const tile = updated.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          if (occupied || !tile || tile.terrain.effects.movementModifier === -999) {
            toast.error(getT().messages.tileOccupied); return prev;
          }
          const elephantHpBonus = executor.itemPassiveTags?.includes('hannibal_elephant_buff') ? 40 : 0;
          const elephantMightBonus = executor.itemPassiveTags?.includes('hannibal_elephant_buff') ? 20 : 0;
          const hasCarthageOath = executor.itemPassiveTags?.includes('sig_hannibal_carthage');
          const elephant: Icon = {
            id: `elephant_${makeId()}`,
            name: "War Elephant",
            role: "tank" as any,
            stats: { hp: 120 + elephantHpBonus, maxHp: 120 + elephantHpBonus, moveRange: 2, speed: 3, might: 70 + elephantMightBonus, power: 0, defense: 20, movement: 0, mana: 0, maxMana: 0, attackRange: 1 },
            abilities: [],
            passive: "War Beast: basic attacks only",
            position: coordinates,
            playerId: executor.playerId,
            isAlive: true,
            respawnTurns: 0,
            cardUsedThisTurn: false,
            movedThisTurn: true,
            hasUltimate: false,
            ultimateUsed: true,
            droneExpiresTurn: (updated as any).currentTurn + (hasCarthageOath ? 3 : 2),
          };
          updated.players = updated.players.map(p =>
            p.id !== executor.playerId ? p : { ...p, icons: [...p.icons, elephant] }
          );
          // Inject a Basic Attack card for the elephant to use
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
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          const elephantDur = hasCarthageOath ? 3 : 2;
          pushLog(updated, `${executor.name} summons a War Elephant (HP 120, Might 70, Def 20)! Lasts ${elephantDur} turns.`, executor.playerId);
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Hannibal: Double Envelopment — hit target + AoE adjacent enemies ──
        if (state.targetingMode?.abilityId === "charge_and_pull") {
          const target = updated.players.flatMap(p => p.icons).find(
            ic => ic.isAlive && ic.playerId !== executor.playerId && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (!target) { toast.error(getT().messages.mustTargetEnemy); return prev; }
          const atkStats = calcEffectiveStats(updated, executor);
          const defStats = calcEffectiveStats(updated, target);
          // Check for Cannae flanking bonus
          const allies = updated.players.flatMap(p => p.icons).filter(ic => ic.isAlive && ic.playerId === executor.playerId && ic.id !== executorId);
          const isFlanked = allies.some(a => hexDistance(a.position, target.position) === 1);
          const cannaeLvlMult = isFlanked ? (1.3 + 0.02 * (executor.level ?? 1)) : 1.0;
          const hitMult = (card.effect.chargeAndPullHitMult ?? 1.1) * cannaeLvlMult;
          const primaryDmg = Math.max(0.1, atkStats.power * hitMult - defStats.defense);
          const primaryHp = Math.round(Math.max(0, target.stats.hp - primaryDmg));
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== target.id ? ic : {
              ...ic, stats: { ...ic.stats, hp: primaryHp }, isAlive: primaryHp > 0, respawnTurns: primaryHp > 0 ? ic.respawnTurns : 4,
            }),
          }));
          updated = applyKillPassives(updated, executorId, target.isAlive, primaryHp <= 0, target.id);
          if (isFlanked) pushLog(updated, `${executor.name} Cannae — flanked! +40% dmg`, executor.playerId);
          pushLog(updated, `${executor.name} Double Envelopment: ${primaryDmg.toFixed(0)} dmg to ${target.name}`, executor.playerId);
          // AoE to adjacent enemies
          const adjMult = card.effect.chargeAndPullArrivalMult ?? 0.55;
          const adjRange = card.effect.chargeAndPullArrivalRange ?? 1;
          const adjEnemies = updated.players.flatMap(p => p.icons).filter(
            ic => ic.isAlive && ic.playerId !== executor.playerId && ic.id !== target.id && hexDistance(ic.position, target.position) <= adjRange
          );
          for (const adj of adjEnemies) {
            const adjDef = calcEffectiveStats(updated, adj);
            const adjDmg = Math.max(0.1, atkStats.power * adjMult - adjDef.defense);
            const adjHp = Math.round(Math.max(0, adj.stats.hp - adjDmg));
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== adj.id ? ic : {
                ...ic, stats: { ...ic.stats, hp: adjHp }, isAlive: adjHp > 0, respawnTurns: adjHp > 0 ? ic.respawnTurns : 4,
              }),
            }));
            updated = applyKillPassives(updated, executorId, adj.isAlive, adjHp <= 0, adj.id);
            pushLog(updated, `${executor.name} Double Envelopment AoE: ${adjDmg.toFixed(0)} to ${adj.name}`, executor.playerId);
          }
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Picasso: Cubist Mirror — swap positions, deal dmg if enemy ────────
        if (state.targetingMode?.abilityId === "swap_target") {
          const swapTarget = updated.players.flatMap(p => p.icons).find(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (!swapTarget) { toast.error("No unit on that tile!"); return prev; }
          if (swapTarget.id === executorId) { toast.error("Can't swap with yourself!"); return prev; }
          const fromPos = { ...executor.position };
          const toPos = { ...swapTarget.position };
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => {
              if (ic.id === executorId) return { ...ic, position: toPos, movedThisTurn: true };
              if (ic.id === swapTarget.id) return { ...ic, position: fromPos };
              return ic;
            }),
          }));
          // Deal damage if enemy
          if (swapTarget.playerId !== executor.playerId && card.effect.powerMult) {
            const atkStats = calcEffectiveStats(updated, executor);
            const defStats = calcEffectiveStats(updated, swapTarget);
            const dmg = Math.max(0.1, atkStats.power * card.effect.powerMult - defStats.defense);
            const newHp = Math.round(Math.max(0, swapTarget.stats.hp - dmg));
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== swapTarget.id ? ic : {
                ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
              }),
            }));
            updated = applyKillPassives(updated, executorId, swapTarget.isAlive, newHp <= 0, swapTarget.id);
            pushLog(updated, `${executor.name} Cubist Mirror: swapped with ${swapTarget.name}, dealt ${dmg.toFixed(0)} dmg!`, executor.playerId);
          } else {
            pushLog(updated, `${executor.name} Cubist Mirror: swapped with ${swapTarget.name}!`, executor.playerId);
          }
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Tesla: Coil Surge — place Tesla Coil zone ─────────────────────────
        if (state.targetingMode?.abilityId === "coil_zone") {
          const tile = updated.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          if (!tile || tile.terrain.effects.movementModifier === -999) { toast.error("Can't place zone there!"); return prev; }
          const coilZone: Zone = {
            center: coordinates,
            radius: 0,
            effect: 'teslaCoil',
            magnitude: card.effect.coilDefPenalty ?? 20,
            ownerId: executor.playerId,
            turnsRemaining: card.effect.coilDuration ?? 3,
            coilStun: card.effect.coilStun ?? true,
          };
          updated = { ...updated, activeZones: [...(updated.activeZones ?? []), coilZone] } as ExtState;
          // Consume voltage cost up-front
          const voltageCost = card.effect.voltageCost ?? 1;
          if (voltageCost > 0) {
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, passiveStacks: Math.max(0, (ic.passiveStacks ?? 0) - voltageCost) }),
            }));
          }
          // Deduct mana
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          pushLog(updated, `${executor.name} Coil Surge — Tesla Coil active for ${coilZone.turnsRemaining} turns${voltageCost > 0 ? ` (−${voltageCost} Voltage)` : ''}`, executor.playerId);
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Mansa: Salt Road — place mana zone ────────────────────────────────
        if (state.targetingMode?.abilityId === "mana_zone") {
          const tile = updated.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          if (!tile || tile.terrain.effects.movementModifier === -999) { toast.error("Can't place zone there!"); return prev; }
          const zone: Zone = {
            center: coordinates,
            radius: 1,
            effect: 'manaRegen',
            magnitude: 1,
            ownerId: executor.playerId,
            turnsRemaining: card.effect.zoneDuration ?? 2,
          };
          updated = { ...updated, activeZones: [...(updated.activeZones ?? []), zone] } as ExtState;
          // Mansa Treasury: ability cards cost 1 less mana; 2 less at level 6+ (or with Mali Coffers)
          const saltRoadDiscount = executor.name.includes("Mansa") && card.definitionId?.startsWith("mansa_")
            ? (executor.itemPassiveTags?.includes('mansa_discount_2') || (executor.level ?? 1) >= 6 ? 2 : 1)
            : 0;
          const effectiveSaltRoadCost = Math.max(1, card.manaCost - saltRoadDiscount);
          if (effectiveSaltRoadCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - effectiveSaltRoadCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          pushLog(updated, `${executor.name} Salt Road — mana zone active for ${zone.turnsRemaining} turns!`, executor.playerId);
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
            updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0, targetIcon.id);
            pushLog(updated, `${executor.name} ${card.name}: ${dmg.toFixed(0)} dmg to ${targetIcon.name}`, executor.playerId);
          }

          // Apply primary debuff (only if target survived)
          if (newHp > 0) {
            const debuff: Debuff = {
              type: card.effect.debuffType,
              magnitude: card.effect.debuffMagnitude ?? 0,
              turnsRemaining: card.effect.debuffDuration ?? 2,
              ...(card.effect.debuffType === 'taunted' ? { sourceIconId: executorId } : {}),
            };
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                ...ic, debuffs: [...(ic.debuffs ?? []), debuff],
              }),
            }));
            pushLog(updated, `${executor.name} applied ${debuff.type} to ${targetIcon.name}`, executor.playerId);

            // Taunt: grant executor a defense bonus for the taunt duration (matches debuff)
            if (card.effect.debuffType === 'taunted' && card.effect.tauntDefBonus) {
              const tauntTurns = card.effect.debuffDuration ?? 2;
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== executorId ? ic : {
                  ...ic,
                  cardBuffDef: (ic.cardBuffDef ?? 0) + card.effect.tauntDefBonus!,
                  cardBuffTurns: tauntTurns > 1 ? Math.max(ic.cardBuffTurns ?? 0, tauntTurns) : (ic.cardBuffTurns ?? 0),
                }),
              }));
              pushLog(updated, `${executor.name} taunts! +${card.effect.tauntDefBonus} DEF for ${tauntTurns} turn${tauntTurns !== 1 ? 's' : ''}`, executor.playerId);
            }

            // Shield Bash counter-stance: grants Leonidas +15 DEF until his next turn
            if (card.definitionId === 'leonidas_shield_bash') {
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== executorId ? ic : {
                  ...ic, cardBuffDef: (ic.cardBuffDef ?? 0) + 20,
                }),
              }));
              pushLog(updated, `${executor.name} counter-stance: +20 DEF this turn`, executor.playerId);
            }

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
                if (destTile && !occupied && destTile.terrain.effects.movementModifier !== -999) {
                  updated.players = updated.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== pushed.id ? ic : { ...ic, position: dest }) }));
                  pushLog(updated, `${pushed.name} was knocked back by Spartan Shield!`, executor.playerId);
                }
              }
              // Spartan Shield item: stun target for 1 turn
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

        // ── Cleopatra: Royal Decree — dual-use (enemy: Charm+Poison; ally: +Might+DEF) ──
        if (card.effect.royalDecree) {
          if (!targetIcon) { toast.error(getT().messages.noTarget); return prev; }
          if (targetIcon.playerId === executor.playerId) {
            // Ally target: grant +Might and +DEF buff for `allyBuffTurns` of the owner's turns (default 2)
            const mightBonus = card.effect.allyMightBonus ?? 20;
            const defBonus = card.effect.allyDefBonus ?? 10;
            const buffTurns = card.effect.allyBuffTurns ?? 2;
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                ...ic,
                cardBuffAtk: (ic.cardBuffAtk ?? 0) + mightBonus,
                cardBuffDef: (ic.cardBuffDef ?? 0) + defBonus,
                cardBuffTurns: Math.max(ic.cardBuffTurns ?? 0, buffTurns),
              }),
            }));
            pushLog(updated, `${executor.name} Royal Decree — ${targetIcon.name} gains +${mightBonus} Might and +${defBonus} DEF for ${buffTurns} turns!`, executor.playerId);
          } else {
            // Enemy target: Charm (1 turn, 2 with Eye of Ra) + Poison
            const charmTurns = executor.itemPassiveTags?.includes('sig_cleopatra_eye_of_ra') ? 2 : 1;
            const charmDebuff: Debuff = { type: 'charmed', magnitude: 0, turnsRemaining: charmTurns };
            const poisonDebuff: Debuff = { type: 'poison', magnitude: 8, turnsRemaining: 3 };
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                ...ic,
                debuffs: [
                  ...(ic.debuffs ?? []).filter(d => d.type !== 'charmed' && d.type !== 'poison'),
                  charmDebuff,
                  poisonDebuff,
                ],
              }),
            }));
            pushLog(updated, `${executor.name} Royal Decree — ${targetIcon.name} CHARMED & POISONED!`, executor.playerId);
          }
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Shaka: The Horns — charge to target, deal damage, push enemy sideways ──
        if (card.effect.chargeHorns) {
          if (!targetIcon || targetIcon.playerId === executor.playerId) { toast.error(getT().messages.noTarget); return prev; }
          const dq = targetIcon.position.q - executor.position.q;
          const dr = targetIcon.position.r - executor.position.r;
          // Charge executor adjacent to target (move 1 step toward target)
          const chargeRange = card.effect.range ?? 2;
          const dist = hexDistance(executor.position, targetIcon.position);
          const targetTile = updated.board.find(t => t.coordinates.q === targetIcon.position.q && t.coordinates.r === targetIcon.position.r);
          const isWater = targetTile?.terrain.type === 'lake' || targetTile?.terrain.type === 'river';
          const isMountain = (targetTile?.terrain.effects.movementModifier ?? 0) === -999;
          // Determine landing tile (one step back from target in charge direction)
          const norm = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
          const stepQ = norm > 0 ? Math.round(dq / norm) : 0;
          const stepR = norm > 0 ? Math.round(dr / norm) : 0;
          const landQ = dist > 1 ? targetIcon.position.q - stepQ : executor.position.q;
          const landR = dist > 1 ? targetIcon.position.r - stepR : executor.position.r;
          const landOccupied = updated.players.flatMap(p => p.icons).some(ic => ic.id !== executorId && ic.isAlive && ic.position.q === landQ && ic.position.r === landR);
          if (!landOccupied && dist > 1 && chargeRange >= dist) {
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, position: { q: landQ, r: landR }, movedThisTurn: true }),
            }));
          }
          if (isMountain && card.effect.mountainStun) {
            // Stun instead of damage
            const stunDebuff: Debuff = { type: 'stun', magnitude: 0, turnsRemaining: 1 };
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'stun'), stunDebuff],
              }),
            }));
            pushLog(updated, `${executor.name} The Horns — charged into mountain, ${targetIcon.name} is STUNNED!`, executor.playerId);
          } else {
            // Deal damage
            const atkStats = calcEffectiveStats(updated, executor);
            const defStats = calcEffectiveStats(updated, targetIcon);
            const dmg = Math.max(0.1, atkStats.power * (card.effect.powerMult ?? 0.6) - defStats.defense);
            const wasAlive = targetIcon.isAlive;
            const newHp = Math.round(Math.max(0, targetIcon.stats.hp - dmg));
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
              }),
            }));
            updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0, targetIcon.id);
            pushLog(updated, `${executor.name} The Horns — charged ${targetIcon.name} for ${dmg.toFixed(0)} dmg!`, executor.playerId);
            // Assegai: Horns also knocks back 1 adjacent enemy 1 hex in the charge direction
            if (executor.itemPassiveTags?.includes('shaka_horns_splash') && newHp > 0) {
              const splashEnemy = updated.players.flatMap(p => p.icons).find(
                ic => ic.isAlive && ic.playerId !== executor.playerId && ic.id !== targetIcon.id && hexDistance(ic.position, targetIcon.position) <= 1
              );
              if (splashEnemy) {
                const splashDest = { q: splashEnemy.position.q + stepQ, r: splashEnemy.position.r + stepR };
                const splashTile = updated.board.find(t => t.coordinates.q === splashDest.q && t.coordinates.r === splashDest.r);
                const splashOcc = updated.players.flatMap(p => p.icons).some(ic => ic.id !== splashEnemy.id && ic.isAlive && ic.position.q === splashDest.q && ic.position.r === splashDest.r);
                if (splashTile && !splashOcc && splashTile.terrain.effects.movementModifier !== -999) {
                  updated.players = updated.players.map(p => ({
                    ...p,
                    icons: p.icons.map(ic => ic.id !== splashEnemy.id ? ic : { ...ic, position: splashDest }),
                  }));
                  pushLog(updated, `${executor.name} Assegai — ${splashEnemy.name} knocked back!`, executor.playerId);
                }
              }
            }
            // Sideways push: knock target perpendicular to charge direction
            if (card.effect.chargePushSideways && newHp > 0) {
              const HEX_DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
              const perpDirs = HEX_DIRS.filter(d => d.q * stepQ + d.r * stepR === 0); // perpendicular to charge
              const pushed = updated.players.flatMap(p => p.icons).find(ic => ic.id === targetIcon.id);
              if (pushed && pushed.isAlive) {
                const sideDir = perpDirs.find(d => {
                  const dest = { q: pushed.position.q + d.q, r: pushed.position.r + d.r };
                  const destTile = updated.board.find(t => t.coordinates.q === dest.q && t.coordinates.r === dest.r);
                  const occupied = updated.players.flatMap(p => p.icons).some(ic => ic.id !== pushed.id && ic.isAlive && ic.position.q === dest.q && ic.position.r === dest.r);
                  return destTile && !occupied;
                }) ?? perpDirs[0];
                if (sideDir) {
                  const dest = { q: pushed.position.q + sideDir.q, r: pushed.position.r + sideDir.r };
                  const destTile = updated.board.find(t => t.coordinates.q === dest.q && t.coordinates.r === dest.r);
                  if (destTile) {
                    const pushIntoWater = card.effect.waterKill && (destTile.terrain.type === 'lake' || destTile.terrain.type === 'river');
                    if (pushIntoWater) {
                      updated.players = updated.players.map(p => ({
                        ...p,
                        icons: p.icons.map(ic => ic.id !== pushed.id ? ic : {
                          ...ic, position: dest, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4,
                        }),
                      }));
                      pushLog(updated, `${pushed.name} was knocked into the water — INSTANT KILL!`, executor.playerId);
                    } else if (destTile.terrain.effects.movementModifier !== -999) {
                      updated.players = updated.players.map(p => ({
                        ...p,
                        icons: p.icons.map(ic => ic.id !== pushed.id ? ic : { ...ic, position: dest }),
                      }));
                      pushLog(updated, `${pushed.name} was knocked sideways by The Horns!`, executor.playerId);
                    }
                  }
                }
              }
            }
          }
          if (card.manaCost > 0) {
            const pid = executor.playerId as 0 | 1;
            const nm = [...updated.globalMana] as [number, number];
            nm[pid] = Math.max(0, nm[pid] - card.manaCost);
            updated.globalMana = nm;
          }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
          }));
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // Helper: compute damage for a card hit on a target
        const computeCardDamage = (tgt: typeof targetIcon) => {
          const executorTile = state.board.find(t => t.coordinates.q === executor.position.q && t.coordinates.r === executor.position.r);
          const terrainMult = 1 + (executorTile ? (card.terrainBonus?.[executorTile.terrain.type] ?? 0) : 0);
          // Berserker's Mark: +15% damage when executor is below 50% HP
          const berserkerMult = executor.itemPassiveTags?.includes('berserker_mark') && executor.stats.hp < executor.stats.maxHp * 0.5 ? 1.15 : 1;
          // Retribution: damage = (maxHp - currentHp) * retributionMult (ignores defense)
          if (card.effect.retributionMult !== undefined) {
            const missingHp = executor.stats.maxHp - executor.stats.hp;
            return Math.max(0.1, missingHp * card.effect.retributionMult * terrainMult * berserkerMult);
          }
          if (card.effect.damageType === 'atk') {
            if (card.effect.mightMult !== undefined) {
              const atkStats = calcEffectiveStats(updated, executor);
              const defStats = tgt ? calcEffectiveStats(updated, tgt) : { defense: 0 };
              let baseDmg = Math.max(0.1, atkStats.might * card.effect.mightMult * terrainMult - (defStats.defense ?? 0));
              // Carry a Bigger Stick: +20 flat Might damage bonus
              if (card.definitionId === 'teddy_big_stick' && executor.itemPassiveTags?.includes('teddy_big_stick_range2')) baseDmg += 20;
              // Big Stick executeVsDebuffed: +50% bonus damage if target is Stunned or Taunted
              if (card.effect.executeVsDebuffed && tgt) {
                const isDebuffed = (tgt.debuffs ?? []).some(d => d.type === 'stun' || d.type === 'taunted');
                if (isDebuffed) baseDmg *= 1.5;
              }
              return baseDmg * berserkerMult;
            }
            const baseAtk = resolveBasicAttackDamage(updated, executor, tgt ?? null);
            return baseAtk * berserkerMult;
          }
          if (card.effect.powerMult !== undefined) {
            const atkStats = calcEffectiveStats(updated, executor);
            const defStats = tgt ? calcEffectiveStats(updated, tgt) : { defense: 0 };
            const raw = atkStats.power * card.effect.powerMult * terrainMult - defStats.defense;
            return Math.max(0.1, raw) * berserkerMult;
          }
          return Math.max(0.1, (card.effect.damage ?? 1) * terrainMult) * berserkerMult;
        };

        if (card.effect.damage !== undefined || card.effect.powerMult !== undefined || card.effect.mightMult !== undefined || card.effect.retributionMult !== undefined) {
          const isOwnBase =
            (executor.playerId === 0 && coordinates.q === -5 && coordinates.r === 4) ||
            (executor.playerId === 1 && coordinates.q === 5 && coordinates.r === -4);

          // Multi-target: allEnemiesInRange
          if (card.effect.allEnemiesInRange) {
            const range = card.effect.range ?? 2;
            const enemies = updated.players
              .flatMap(p => p.icons)
              .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range);
            if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
            for (const enemy of enemies) {
              const dmg = computeCardDamage(enemy);
              const newHp = Math.round(Math.max(0, enemy.stats.hp - dmg));
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
                  ...ic,
                  stats: { ...ic.stats, hp: newHp },
                  isAlive: newHp > 0,
                  respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
                }),
              }));
              updated = applyKillPassives(updated, executorId, enemy.isAlive, newHp <= 0, enemy.id);
              if (card.effect.debuffType && newHp > 0) {
                // Blue Canvas: Guernica armor break lasts 3 player turns instead of 2
                const debuffDuration = (card.effect.debuffDuration ?? 2) + (executor.itemPassiveTags?.includes('picasso_guernica_extend') ? 2 : 0);
                const debuff: Debuff = { type: card.effect.debuffType, magnitude: card.effect.debuffMagnitude ?? 1, turnsRemaining: debuffDuration };
                updated.players = updated.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== enemy.id ? ic : { ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== debuff.type), debuff] }) }));
              }
              pushLog(updated, `${executor.name} ${card.name} hit ${enemy.name} for ${dmg.toFixed(0)} dmg`, executor.playerId);
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

          // Cone target (Suppressive Fire): hits all enemies in a cone toward clicked hex
          if (card.effect.coneTarget) {
            const range = card.effect.range ?? 3;
            const dq = coordinates.q - executor.position.q;
            const dr = coordinates.r - executor.position.r;
            const len = Math.max(1, Math.sqrt(dq * dq + dq * dr + dr * dr)); // hex magnitude
            // A hex (rq, rr) relative to executor is in cone if: forward projection > 0, cross ≤ projection
            const isInCone = (rq: number, rr: number) => {
              const proj = (rq * dq + rr * dr + (rq * dr + rr * dq) / 2);
              const cross = Math.abs(rq * dr - rr * dq);
              return proj > 0 && proj <= range * len && cross <= Math.ceil(proj / len);
            };
            const atkStats = calcEffectiveStats(updated, executor);
            const coneEnemies = updated.players.flatMap(p => p.icons).filter(ic => {
              if (!ic.isAlive || ic.playerId === executor.playerId) return false;
              if (hexDistance(executor.position, ic.position) > range) return false;
              return isInCone(ic.position.q - executor.position.q, ic.position.r - executor.position.r);
            });
            if (coneEnemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
            for (const enemy of coneEnemies) {
              const defStats = calcEffectiveStats(updated, enemy);
              const dmg = Math.max(1, Math.round(atkStats.might * (card.effect.mightMult ?? 0.3) - defStats.defense));
              const newHp = Math.max(0, enemy.stats.hp - dmg);
              updated.players = updated.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== enemy.id ? ic : { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 }) }));
              updated = applyKillPassives(updated, executorId, enemy.isAlive, newHp <= 0, enemy.id);
              if (card.effect.debuffType && newHp > 0) {
                const debuff: Debuff = { type: card.effect.debuffType, magnitude: card.effect.debuffMagnitude ?? 1, turnsRemaining: card.effect.debuffDuration ?? 1 };
                updated.players = updated.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== enemy.id ? ic : { ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== debuff.type), debuff] }) }));
              }
              pushLog(updated, `${executor.name} Suppressive Fire hit ${enemy.name} for ${dmg} dmg`, executor.playerId);
            }
            if (card.manaCost > 0) {
              const pid = executor.playerId as 0 | 1;
              const nm = [...updated.globalMana] as [number, number];
              nm[pid] = Math.max(0, nm[pid] - card.manaCost);
              updated.globalMana = nm;
            }
            updated.players = updated.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1 }) }));
            updated = consumeCardFromHand(updated, card, executor.playerId);
            return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
          }

          // Line target: player clicked a direction hex — hit all enemies on that line
          if (card.effect.lineTarget) {
            const range = card.effect.range ?? 4;
            const lineHexes = snapToLineHexes(executor.position, coordinates, range);
            const lineKeys = new Set(lineHexes.map(h => tileKey(h.q, h.r)));
            const enemies = updated.players
              .flatMap(p => p.icons)
              .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && lineKeys.has(tileKey(ic.position.q, ic.position.r)))
              // Death Ray: sort closest-first so falloff runs along the beam naturally.
              // Other lineTargets: furthest-first so pushing doesn't create blocking chains.
              .sort((a, b) => card.effect.deathRay
                ? hexDistance(a.position, executor.position) - hexDistance(b.position, executor.position)
                : hexDistance(b.position, executor.position) - hexDistance(a.position, executor.position));
            if (enemies.length === 0) { toast.error(getT().messages.noEnemiesOnLine); return prev; }
            // Death Ray voltage-scaled damage: Power × voltagePerStackMult × voltageStacks for first target, then chainFalloffPct per step.
            const isDeathRay = !!card.effect.deathRay;
            const voltageStacks = isDeathRay ? (executor.passiveStacks ?? 0) : 0;
            const voltagePerStackMult = card.effect.voltagePerStackMult ?? 0.5;
            const chainFalloff = card.effect.chainFalloffPct ?? 0.5;
            let lineTargetTotalDmg = 0;
            let deathRayIndex = 0;
            for (const enemy of enemies) {
              let dmg: number;
              if (isDeathRay) {
                const atkStats = calcEffectiveStats(updated, executor);
                const defStats = calcEffectiveStats(updated, enemy);
                const scaled = atkStats.power * voltagePerStackMult * voltageStacks * Math.pow(chainFalloff, deathRayIndex);
                dmg = Math.max(1, scaled - defStats.defense);
                deathRayIndex += 1;
              } else {
                dmg = computeCardDamage(enemy);
              }
              // executeDouble: double damage if target is below 50% HP
              if (card.effect.executeDouble && enemy.stats.hp < enemy.stats.maxHp * 0.4) {
                dmg = dmg * 2;
              }
              lineTargetTotalDmg += dmg;
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
              const executeLabel = card.effect.executeDouble && enemy.stats.hp < enemy.stats.maxHp * 0.4 ? " (EXECUTE×2)" : "";
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
              // Hitting an impassable tile or going off-board stuns for 1 turn (like ice collision)
              if (card.effect.pushback && newEnemyHp > 0) {
                const DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
                const dq = enemy.position.q - executor.position.q;
                const dr = enemy.position.r - executor.position.r;
                const dir = DIRS.reduce((best, d) =>
                  (dq * d.q + dr * d.r) > (dq * best.q + dr * best.r) ? d : best
                );
                let slammedWall = false;
                for (let step = 0; step < card.effect.pushback; step++) {
                  const pushed = updated.players.flatMap(p => p.icons).find(ic => ic.id === enemy.id);
                  if (!pushed || !pushed.isAlive) break;
                  const dest = { q: pushed.position.q + dir.q, r: pushed.position.r + dir.r };
                  const destTile = updated.board.find(t => t.coordinates.q === dest.q && t.coordinates.r === dest.r);
                  const isOccupied = updated.players.flatMap(p => p.icons).some(
                    ic => ic.id !== pushed.id && ic.isAlive && ic.position.q === dest.q && ic.position.r === dest.r
                  );
                  const isWall = !destTile || destTile.terrain.effects.movementModifier === -999;
                  if (isWall) { slammedWall = true; break; }
                  if (isOccupied) break;
                  updated.players = updated.players.map(p => ({
                    ...p, icons: p.icons.map(ic => ic.id !== pushed.id ? ic : { ...ic, position: dest }),
                  }));
                }
                if (slammedWall) {
                  const wallStun: Debuff = { type: 'stun', magnitude: 0, turnsRemaining: 1 };
                  updated.players = updated.players.map(p => ({
                    ...p,
                    icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
                      ...ic,
                      debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'stun'), wallStun],
                    }),
                  }));
                  pushLog(updated, `${enemy.name} slammed into an obstacle — STUNNED by Schallwelle!`, executor.playerId);
                } else {
                  pushLog(updated, `${enemy.name} pushed back by Schallwelle!`, executor.playerId);
                }
              }
            }
            // the_tower achievement: Tesla Death Ray deals 300+ total damage in one use
            if (executor.name.includes('Tesla') && executor.playerId === 0 && lineTargetTotalDmg >= 300) {
              (updated as any).kitMomentEvents = [...((updated as any).kitMomentEvents ?? []), 'tesla_death_ray_300'];
            }
            // Death Ray: consume all Voltage after resolution
            if (isDeathRay) {
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, passiveStacks: 0 }),
              }));
              pushLog(updated, `${executor.name} Death Ray — consumed ${voltageStacks} Voltage stack${voltageStacks !== 1 ? 's' : ''}`, executor.playerId);
            }

            // Beethoven Crescendo passive
            if (executor.name.includes("Beethoven") && card.exclusiveTo === "Beethoven") {
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== executorId ? ic : {
                  ...ic, passiveStacks: Math.min(15, (ic.passiveStacks ?? 0) + 1),
                }),
              }));
              const stacks = Math.min(15, (executor.passiveStacks ?? 0) + 1);
              pushLog(updated, `${executor.name} Crescendo: ${stacks}/15 (+${stacks * 2} Power)`, executor.playerId);
              // Resonant Crystal: Power×0.25 to all adjacent enemies after any Beethoven ability
              if (executor.itemPassiveTags?.includes('beethoven_resonance_aoe')) {
                const freshExec = updated.players.flatMap(p => p.icons).find(ic => ic.id === executorId) ?? executor;
                const atkStats = calcEffectiveStats(updated, freshExec);
                const adjacent = updated.players
                  .flatMap(p => p.icons)
                  .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= 1);
                for (const adj of adjacent) {
                  const defStats = calcEffectiveStats(updated, adj);
                  const dmg = Math.max(0, Math.round(atkStats.power * 0.25 - defStats.defense));
                  if (dmg > 0) {
                    const newHp = Math.max(0, adj.stats.hp - dmg);
                    updated.players = updated.players.map(p => ({
                      ...p,
                      icons: p.icons.map(ic => ic.id !== adj.id ? ic : { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 }),
                    }));
                  }
                }
                if (adjacent.length > 0) pushLog(updated, `${executor.name} Resonant Crystal — resonance wave hits ${adjacent.length} adjacent enem${adjacent.length !== 1 ? 'ies' : 'y'}!`, executor.playerId);
              }
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
            // Mountain Line-of-Sight: targeted ability cards with range > 1 cannot pass through mountains
            const cardEffectiveRange = card.effect.range ?? 1;
            if (cardEffectiveRange > 1 && hasLineMountain(state.board, executor.position, targetIcon.position)) {
              toast.error('Mountain blocks line of sight!');
              return prev;
            }
            // Taunt enforcement: taunted caster can only hit the taunter with damage cards
            const abilityTaunt = executor.debuffs?.find(d => d.type === 'taunted');
            if (abilityTaunt?.sourceIconId) {
              const taunter = state.players.flatMap(p => p.icons).find(ic => ic.id === abilityTaunt.sourceIconId && ic.isAlive);
              if (taunter && targetIcon.id !== taunter.id) {
                toast.error(`${executor.name} is Taunted — must target ${taunter.name}`);
                return prev;
              }
            }
            // Apply multiHit
            let totalDmg = 0;
            let currentHp = targetIcon.stats.hp;
            for (let hit = 0; hit < multiHit; hit++) {
              let hitDmg = computeCardDamage(targetIcon);
              // Hannibal Cannae: (30% + 2%×level) if target is flanked (ally adjacent to target); +70% with Carthaginian Ring
              if (executor.name.includes("Hannibal")) {
                const allies = updated.players.flatMap(p => p.icons).filter(ic => ic.isAlive && ic.playerId === executor.playerId && ic.id !== executorId);
                if (allies.some(a => hexDistance(a.position, targetIcon.position) === 1)) {
                  const has70 = executor.itemPassiveTags?.includes('hannibal_cannae_70pct') || executor.itemPassiveTags?.includes('sig_hannibal_carthage');
                  const cannaeMult = has70 ? 1.7 : (1.3 + 0.02 * (executor.level ?? 1));
                  hitDmg = Math.round(hitDmg * cannaeMult);
                }
              }
              // Faraday Coat: Tesla takes 15% less ability damage
              if (targetIcon.name.includes("Tesla") && targetIcon.itemPassiveTags?.includes('tesla_faraday_coat_15')) {
                hitDmg = Math.round(hitDmg * 0.85);
              }
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
            updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0, targetIcon.id);
            if (newHp <= 0 && !survivedVoid && executor.name.includes('Musashi') && executor.playerId === 0) {
              (updated as any).musashiTurnKills = ((updated as any).musashiTurnKills ?? 0) + 1;
            }
            const hitLabel = multiHit > 1 ? `${multiHit}×${(totalDmg/multiHit).toFixed(0)}` : totalDmg.toFixed(0);
            pushLog(updated, `${executor.name} played ${card.name} on ${targetIcon.name} for ${hitLabel} dmg`, executor.playerId);

            // Arc Bolt chain: at Voltage >= chainThreshold, deal chainPct damage to all adjacent enemies
            if (card.effect.chainAllAdjacent && (executor.passiveStacks ?? 0) >= (card.effect.chainThreshold ?? 3)) {
              const chainPct = card.effect.chainPct ?? 0.5;
              const freshExec = updated.players.flatMap(p => p.icons).find(ic => ic.id === executorId) ?? executor;
              const atkStats = calcEffectiveStats(updated, freshExec);
              const chainTargets = updated.players.flatMap(p => p.icons).filter(
                ic => ic.isAlive && ic.playerId !== executor.playerId && ic.id !== targetIcon.id && hexDistance(ic.position, targetIcon.position) <= 1
              );
              for (const ct of chainTargets) {
                const defStats = calcEffectiveStats(updated, ct);
                const chainDmg = Math.max(0.1, atkStats.power * chainPct - defStats.defense);
                const chainHp = Math.max(0, ct.stats.hp - chainDmg);
                const wasAliveChain = ct.isAlive;
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== ct.id ? ic : { ...ic, stats: { ...ic.stats, hp: chainHp }, isAlive: chainHp > 0, respawnTurns: chainHp > 0 ? ic.respawnTurns : 4 }),
                }));
                updated = applyKillPassives(updated, executorId, wasAliveChain, chainHp <= 0, ct.id);
                pushLog(updated, `${executor.name} Arc Bolt chains to ${ct.name} for ${chainDmg.toFixed(0)} dmg!`, executor.playerId);
              }
              // Resonant Oscillator (tesla_arc_extra_chain): also chain to 1 additional non-adjacent enemy within range 2
              if (executor.itemPassiveTags?.includes('tesla_arc_extra_chain')) {
                const chainedIds = new Set(chainTargets.map(ct => ct.id));
                chainedIds.add(targetIcon.id);
                const extraTarget = updated.players.flatMap(p => p.icons).find(
                  ic => ic.isAlive && ic.playerId !== executor.playerId && !chainedIds.has(ic.id) && hexDistance(ic.position, targetIcon.position) <= 2
                );
                if (extraTarget) {
                  const defStats = calcEffectiveStats(updated, extraTarget);
                  const extraDmg = Math.max(0.1, atkStats.power * chainPct * 0.7 - defStats.defense);
                  const extraHp = Math.max(0, extraTarget.stats.hp - extraDmg);
                  const wasAliveExtra = extraTarget.isAlive;
                  updated.players = updated.players.map(p => ({
                    ...p,
                    icons: p.icons.map(ic => ic.id !== extraTarget.id ? ic : { ...ic, stats: { ...ic.stats, hp: extraHp }, isAlive: extraHp > 0, respawnTurns: extraHp > 0 ? ic.respawnTurns : 4 }),
                  }));
                  updated = applyKillPassives(updated, executorId, wasAliveExtra, extraHp <= 0, extraTarget.id);
                  pushLog(updated, `${executor.name} Oscillator — extra chain hits ${extraTarget.name} for ${extraDmg.toFixed(0)} dmg!`, executor.playerId);
                }
              }
              // chain_reaction achievement: Tesla Arc Bolt hits 3+ enemies total (primary + 2 chain)
              if (executor.name.includes('Tesla') && executor.playerId === 0 && chainTargets.length >= 2) {
                (updated as any).kitMomentEvents = [...((updated as any).kitMomentEvents ?? []), 'tesla_chain_3'];
              }
            }

            // Nelson Trafalgar Square: on-kill AoE ~50 dmg to enemies adjacent to dead target
            if (newHp <= 0 && card.definitionId?.includes('trafalgar')) {
              const atkStats = calcEffectiveStats(updated, executor);
              const splashEnemies = updated.players.flatMap(p => p.icons).filter(
                ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(ic.position, targetIcon.position) === 1
              );
              for (const splashEnemy of splashEnemies) {
                const defStats = calcEffectiveStats(updated, splashEnemy);
                const splashDmg = Math.max(0.1, atkStats.power * 0.7 - defStats.defense);
                const splashHp = Math.round(Math.max(0, splashEnemy.stats.hp - splashDmg));
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== splashEnemy.id ? ic : {
                    ...ic, stats: { ...ic.stats, hp: splashHp }, isAlive: splashHp > 0, respawnTurns: splashHp > 0 ? ic.respawnTurns : 4,
                  }),
                }));
                updated = applyKillPassives(updated, executorId, splashEnemy.isAlive, splashHp <= 0, splashEnemy.id);
                pushLog(updated, `${executor.name} Trafalgar Square chain — ${splashEnemy.name} for ${splashDmg.toFixed(0)}!`, executor.playerId);
              }
            }

            // Daishō Set (musashi_niten_kill_bonus): Niten Ichi-ryu kill → immediate extra strike on nearest other enemy
            if (newHp <= 0 && card.effect.multiHit && executor.name.includes("Musashi") && executor.itemPassiveTags?.includes('musashi_niten_kill_bonus')) {
              const nextTarget = updated.players.flatMap(p => p.icons).find(
                ic => ic.isAlive && ic.playerId !== executor.playerId && ic.id !== targetIcon.id
              );
              if (nextTarget) {
                const freshExecN = updated.players.flatMap(p => p.icons).find(ic => ic.id === executorId) ?? executor;
                const atkStatsN = calcEffectiveStats(updated, freshExecN);
                const defStatsN = calcEffectiveStats(updated, nextTarget);
                const bonusDmg = Math.max(0.1, atkStatsN.power * (card.effect.powerMult ?? 0.7) - defStatsN.defense);
                const bonusHp = Math.max(0, nextTarget.stats.hp - bonusDmg);
                const wasAliveN = nextTarget.isAlive;
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== nextTarget.id ? ic : { ...ic, stats: { ...ic.stats, hp: bonusHp }, isAlive: bonusHp > 0, respawnTurns: bonusHp > 0 ? ic.respawnTurns : 4 }),
                }));
                updated = applyKillPassives(updated, executorId, wasAliveN, bonusHp <= 0, nextTarget.id);
                pushLog(updated, `${executor.name} Daishō — kill bonus strike on ${nextTarget.name} for ${bonusDmg.toFixed(0)} dmg!`, executor.playerId);
              }
            }

            // Decoy explosion: if target was a decoy and just died, explode
            if (newHp <= 0 && targetIcon.isDecoy && (targetIcon.decoyExplosionDmg ?? 0) > 0) {
              const explosionDmg = targetIcon.decoyExplosionDmg!;
              const explosionRange = targetIcon.decoyExplosionRange ?? 2;
              const nearbyEnemies = updated.players.flatMap(p => p.icons).filter(
                ic => ic.isAlive && ic.playerId !== targetIcon.playerId && hexDistance(ic.position, targetIcon.position) <= explosionRange
              );
              for (const enemy of nearbyEnemies) {
                const eHp = Math.max(0, enemy.stats.hp - explosionDmg);
                updated.players = updated.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
                  ...ic, stats: { ...ic.stats, hp: eHp }, isAlive: eHp > 0, respawnTurns: eHp > 0 ? ic.respawnTurns : 4,
                }) }));
              }
              if (nearbyEnemies.length > 0) pushLog(updated, `Decoy EXPLODES for ${explosionDmg} dmg (${nearbyEnemies.length} enemies hit)!`, targetIcon.playerId);
            }

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
                if (destTile.terrain.type === 'lake') {
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
            // Retribution Bleed: if retributionBleed, apply bleed for 30% of damage dealt (2 turns)
            if (card.effect.retributionBleed && newHp > 0) {
              const retBleedDmg = Math.round(totalDmg * 0.3);
              if (retBleedDmg > 0) {
                const retBleedDebuff: Debuff = { type: 'bleed', magnitude: retBleedDmg, turnsRemaining: 2 };
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                    ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'bleed'), retBleedDebuff],
                  }),
                }));
                pushLog(updated, `${targetIcon.name} is Bleeding from Retribution — ${retBleedDmg} HP/turn for 2 turns`, executor.playerId);
              }
            }
            // Grand Strategy / Marshal's Baton: hit one adjacent enemy (50% dmg, or 100% with signature)
            // Grand Strategy (rare): hit 1 adjacent enemy at 50%
            if (executor.itemPassiveTags?.includes('napoleon_barrage_splash') && card.definitionId?.includes('artillery_barrage')) {
              const splashTarget = updated.players.flatMap(p => p.icons)
                .find(ic => ic.isAlive && ic.playerId !== executor.playerId && ic.id !== targetIcon.id && hexDistance(ic.position, targetIcon.position) <= 1);
              if (splashTarget) {
                const splashDmg = Math.round(finalDmg * 0.5);
                const splashHp = Math.max(0, splashTarget.stats.hp - splashDmg);
                updated.players = updated.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== splashTarget.id ? ic : { ...ic, stats: { ...ic.stats, hp: splashHp }, isAlive: splashHp > 0, respawnTurns: splashHp > 0 ? ic.respawnTurns : 4 }) }));
                updated = applyKillPassives(updated, executorId, splashTarget.isAlive, splashHp <= 0, splashTarget.id);
                pushLog(updated, `Grand Strategy: Artillery splash hit ${splashTarget.name} for ${splashDmg} dmg`, executor.playerId);
              }
            }
            // Marshal's Baton (sig): hit ALL enemies within 2 hexes at 30%
            if (executor.itemPassiveTags?.includes('sig_napoleon_barrage_splash') && card.definitionId?.includes('artillery_barrage')) {
              const sigSplashTargets = updated.players.flatMap(p => p.icons)
                .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && ic.id !== targetIcon.id && hexDistance(ic.position, targetIcon.position) <= 2);
              const sigDmg = Math.round(finalDmg * 0.3);
              for (const st of sigSplashTargets) {
                const stHp = Math.max(0, st.stats.hp - sigDmg);
                updated.players = updated.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id !== st.id ? ic : { ...ic, stats: { ...ic.stats, hp: stHp }, isAlive: stHp > 0, respawnTurns: stHp > 0 ? ic.respawnTurns : 4 }) }));
                updated = applyKillPassives(updated, executorId, st.isAlive, stHp <= 0, st.id);
              }
              if (sigSplashTargets.length > 0)
                pushLog(updated, `Marshal's Baton: Artillery hit ${sigSplashTargets.length} additional enem${sigSplashTargets.length !== 1 ? 'ies' : 'y'} for ${sigDmg} dmg each`, executor.playerId);
            }

            // aoeRooted: apply Rooted to the primary target AND all adjacent enemies (THIS IS SPARTA!)
            if (card.effect.aoeRooted) {
              const rootDebuff: Debuff = { type: 'rooted', magnitude: 0, turnsRemaining: 2 };
              // Root the primary target if still alive
              if (targetIcon.isAlive || (updated.players.flatMap(p => p.icons).find(ic => ic.id === targetIcon.id)?.stats.hp ?? 0) > 0) {
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                    ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'rooted'), rootDebuff],
                  }),
                }));
                pushLog(updated, `${targetIcon.name} is ROOTED by THIS IS SPARTA! (2 turns)`, executor.playerId);
              }
              // Root adjacent enemies too
              const adjacentEnemies = updated.players
                .flatMap(p => p.icons)
                .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && ic.id !== targetIcon.id && hexDistance(ic.position, targetIcon.position) <= 1);
              for (const adj of adjacentEnemies) {
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== adj.id ? ic : {
                    ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'rooted'), rootDebuff],
                  }),
                }));
                pushLog(updated, `${adj.name} is ROOTED by THIS IS SPARTA! (2 turns)`, executor.playerId);
              }
            }
            // powerReduction: Asp's Kiss — reduce target Power for N turns (Lotus Library Scroll: -25 instead of -15)
            if (card.effect.powerReduction !== undefined && newHp > 0) {
              const pwrMag = executor.itemPassiveTags?.includes('cleo_asp_power_reduction_boost') ? 25 : card.effect.powerReduction;
              const pwrDebuff: Debuff = { type: 'power_reduction', magnitude: pwrMag, turnsRemaining: card.effect.powerReductionDuration ?? 3 };
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                  ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'power_reduction'), pwrDebuff],
                }),
              }));
              pushLog(updated, `${targetIcon.name} Power reduced by ${pwrMag} for ${card.effect.powerReductionDuration ?? 3} turns!`, executor.playerId);
              // Lotus Crown: Asp's Kiss also stacks Asp's Venom (same as basic attack)
              if (executor.name.includes("Cleopatra") && executor.itemPassiveTags?.includes('cleo_venom_on_abilities')) {
                const freshVT = updated.players.flatMap(p => p.icons).find(i => i.id === targetIcon.id);
                if (freshVT) {
                  const existingPoison = freshVT.debuffs?.find(d => d.type === 'poison');
                  const newPoisonMag = Math.min((existingPoison?.magnitude ?? 0) + 8, 24);
                  const venomDebuff: Debuff = { type: 'poison', magnitude: newPoisonMag, turnsRemaining: 3 };
                  updated.players = updated.players.map(p => ({
                    ...p,
                    icons: p.icons.map(ic => ic.id !== freshVT.id ? ic : {
                      ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'poison'), venomDebuff],
                    }),
                  }));
                  pushLog(updated, `${targetIcon.name} Lotus Crown — Asp's Kiss stacks Venom! (magnitude ${newPoisonMag})`, executor.playerId);
                }
              }
            }
            // armorBreakAtStacks: Toba's Fury — apply armor_break if executor has >= N Bottleneck stacks
            if (card.effect.armorBreakAtStacks !== undefined && newHp > 0) {
              if ((executor.passiveStacks ?? 0) >= card.effect.armorBreakAtStacks) {
                const abDebuff: Debuff = { type: 'armor_break', magnitude: 35, turnsRemaining: 2 };
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                    ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'armor_break'), abDebuff],
                  }),
                }));
                pushLog(updated, `${executor.name} Toba's Fury — ${targetIcon.name} ARMOR BROKEN! (${executor.passiveStacks} Bottleneck stacks)`, executor.playerId);
              }
            }
            // duelApply: Ichi no Tachi — apply Duel (taunted) to primary target
            if (card.effect.duelApply && newHp > 0) {
              const duelDebuff: Debuff = { type: 'taunted', magnitude: 35, turnsRemaining: 3 };
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                  ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'taunted'), duelDebuff],
                }),
              }));
              pushLog(updated, `${executor.name} DUELS ${targetIcon.name}! (+35% bonus damage)`, executor.playerId);
              // Niten Ichi-ryu Scrolls: Duel also applies Blinded (1 turn)
              if (executor.itemPassiveTags?.includes('sig_musashi_niten_scrolls')) {
                const blindDebuff: Debuff = { type: 'blinded', magnitude: 0, turnsRemaining: 1 };
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                    ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'blinded'), blindDebuff],
                  }),
                }));
                pushLog(updated, `${targetIcon.name} is BLINDED by Niten Scrolls!`, executor.playerId);
              }
              // duelBleed: apply Bleed to Dueled target
              if (card.effect.duelBleed) {
                const atkStats = calcEffectiveStats(updated, executor);
                const bleedDmg = Math.round(atkStats.power * 0.25);
                const bleedDebuff: Debuff = { type: 'bleed', magnitude: bleedDmg, turnsRemaining: 2 };
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                    ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'bleed'), bleedDebuff],
                  }),
                }));
                pushLog(updated, `${targetIcon.name} is BLEEDING — ${bleedDmg} HP/turn for 2 turns!`, executor.playerId);
              }
            }
            // Battle Scar: when targetIcon IS Musashi and takes damage → gain stack
            {
              const freshTarget = updated.players.flatMap(p => p.icons).find(ic => ic.id === targetIcon.id);
              if (freshTarget && freshTarget.isAlive && freshTarget.name.includes("Musashi") && totalDmg > 0) {
                const curStacks = freshTarget.passiveStacks ?? 0;
                if (curStacks < 3) {
                  updated.players = updated.players.map(p => ({
                    ...p,
                    icons: p.icons.map(ic => ic.id !== freshTarget.id ? ic : { ...ic, passiveStacks: curStacks + 1 }),
                  }));
                  const lvl = freshTarget.level ?? 1;
                  pushLog(updated, `${freshTarget.name} Battle Scar — ${curStacks + 1}/3 stacks (+${Math.ceil(lvl / 2)} Might per stack)`, freshTarget.playerId);
                }
              }
            }
          } else {
            if (isOwnBase) { toast.error(getT().messages.cantAttackOwnBase); return prev; }
            const isBase = (coordinates.q === -5 && coordinates.r === 4) || (coordinates.q === 5 && coordinates.r === -4);
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
          const healBase = card.effect.healingMult !== undefined
            ? Math.round(calcEffectiveStats(updated, executor).power * card.effect.healingMult)
            : (card.effect.healing ?? 0);
          const healAmount = healBase + (executor.itemPassiveTags?.includes('davinci_masterpiece_plus25') && card.definitionId?.includes('masterpiece') ? 25 : 0);
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

      // Handle manual respawn placement: player clicked a spawn tile for a dead character
      if ((state as any).respawnPlacement) {
        const respawnId = (state as any).respawnPlacement as string;
        const respawnIcon = state.players.flatMap(p => p.icons).find(i => i.id === respawnId);
        if (respawnIcon && !respawnIcon.isAlive && respawnIcon.respawnTurns === 0) {
          const tile = state.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          const occupied = state.players.flatMap(p => p.icons).some(i => i.isAlive && i.position.q === coordinates.q && i.position.r === coordinates.r);
          if (tile?.terrain.type === 'spawn' && !occupied) {
            state.players = state.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== respawnId ? ic : {
                ...ic, isAlive: true, position: coordinates,
                stats: { ...ic.stats, hp: ic.stats.maxHp, movement: 0 }, respawnTurns: 0,
              }),
            }));
            (state as any).respawnPlacement = undefined;
            return state;
          }
        }
        // Clicked a non-spawn tile — cancel respawn mode
        (state as any).respawnPlacement = undefined;
        return state;
      }

      // Use selectedIcon as the active mover/caster; fall back to first alive non-controlled on active player's team
      const me = state.players[state.activePlayerId]?.icons.find(
        i => (i.id === state.selectedIcon || !state.selectedIcon) && i.isAlive && !(i as any).terracottaControlled
      ) ?? state.players[state.activePlayerId]?.icons.find(i => i.isAlive && !(i as any).terracottaControlled);
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
          (caster.playerId === 0 && coordinates.q === -5 && coordinates.r === 4) ||
          (caster.playerId === 1 && coordinates.q === 5 && coordinates.r === -4);

        // Lookup ability (if any)
        const ability = caster.abilities.find((a) => a.id === abilityId);

        // Directed charge-move ability (Alpine March via ability button)
        if (ability && (ability as any).chargeMove) {
          const HEX_DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
          const rawDq = coordinates.q - caster.position.q;
          const rawDr = coordinates.r - caster.position.r;
          const chargeDir = HEX_DIRS.reduce((best, d) => {
            const dot = rawDq * d.q + rawDr * d.r;
            return dot > (rawDq * best.q + rawDr * best.r) ? d : best;
          });
          const maxSteps = (ability as any).chargeDist ?? 6;
          let currentPos = { ...caster.position };
          for (let step = 0; step < maxSteps; step++) {
            const nextPos = { q: currentPos.q + chargeDir.q, r: currentPos.r + chargeDir.r };
            const nextTile = updated.board.find(t => t.coordinates.q === nextPos.q && t.coordinates.r === nextPos.r);
            if (!nextTile) break;
            const occupied = updated.players.flatMap(p => p.icons).some(
              ic => ic.isAlive && ic.position.q === nextPos.q && ic.position.r === nextPos.r
            );
            if (occupied) break;
            currentPos = nextPos;
          }
          const manaCost = ability.manaCost ?? 0;
          updated.globalMana = updated.globalMana.map((m, idx) => (idx === caster.playerId ? Math.max(0, m - manaCost) : m)) as any;
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== caster.id ? ic : {
              ...ic, position: currentPos, movedThisTurn: true, cardUsedThisTurn: true,
            }),
          }));
          pushLog(updated, `${caster.name} Alpine March charged!`, caster.playerId);
          return { ...updated, targetingMode: undefined };
        }

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

        // Teddy: Rough Riders' Rally teleport phase (buffs already applied, card consumed)
        if (abilityId === "rough_riders_teleport") {
          const tile = state.board.find(t => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
          if (!tile || tile.terrain.effects.movementModifier === -999) { toast.error(getT().messages.cantTeleport); return prev; }
          const occupied = state.players.flatMap(p => p.icons).some(
            ic => ic.isAlive && ic.id !== caster.id && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (occupied) { toast.error(getT().messages.tileOccupied); return prev; }
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== caster.id ? ic : { ...ic, position: coordinates, movedThisTurn: true }),
          }));
          pushLog(updated, `${caster.name} teleports to (${coordinates.q},${coordinates.r})!`, caster.playerId);
          return { ...updated, baseHealth: updatedBaseHealth, objectives: updatedObjectives, targetingMode: undefined };
        }

        // BASIC ATTACK
        if (abilityId === "basic_attack") {
          if (targetIcon) {
            if (targetIcon.playerId === caster.playerId) {
              toast.error(getT().messages.cantAttackOwn2);
              return prev;
            }
            // Mountain Line-of-Sight: ranged attacks (range > 1) cannot pass through mountains on the same axial line
            const casterRange = caster.stats.attackRange ?? 1;
            if (casterRange > 1 && hasLineMountain(state.board, caster.position, targetIcon.position)) {
              toast.error('Mountain blocks line of sight!');
              return prev;
            }
            // Taunt enforcement: if caster is taunted and the taunter is alive, they can only attack the taunter
            const casterTaunt = caster.debuffs?.find(d => d.type === 'taunted');
            if (casterTaunt?.sourceIconId) {
              const taunter = state.players.flatMap(p => p.icons).find(ic => ic.id === casterTaunt.sourceIconId && ic.isAlive);
              if (taunter && targetIcon.id !== taunter.id) {
                toast.error(`${caster.name} is Taunted — must attack ${taunter.name}`);
                return prev;
              }
            }
            // Basic Attack+ has mightMult in its effect — use it if present
            const pendingCardEffect = (state.targetingMode as any)?.cardRefund?.card?.effect;
            const cardMightMult = pendingCardEffect?.mightMult as number | undefined;
            let dmg: number;
            if (cardMightMult !== undefined) {
              const atkStats = calcEffectiveStats(updated, caster);
              const defStats = calcEffectiveStats(updated, targetIcon);
              dmg = Math.max(0.1, atkStats.might * cardMightMult - (defStats.defense ?? 0));
            } else {
              dmg = resolveBasicAttackDamage(updated, caster, targetIcon);
            }
            // Hannibal Cannae: +40% damage when attacking a flanked enemy; +70% with Carthaginian Ring
            if (caster.name.includes("Hannibal")) {
              const allies = updated.players.flatMap(p => p.icons).filter(ic => ic.isAlive && ic.playerId === caster.playerId && ic.id !== caster.id);
              const isFlanked = allies.some(a => hexDistance(a.position, targetIcon.position) === 1);
              if (isFlanked) {
                const has70 = caster.itemPassiveTags?.includes('hannibal_cannae_70pct') || caster.itemPassiveTags?.includes('sig_hannibal_carthage');
                const cannaeMult = has70 ? 1.7 : 1.4;
                dmg = Math.round(dmg * cannaeMult);
                const cannaeLabel = has70 ? '+70%' : '+40%';
                pushLog(updated, `${caster.name} Cannae — flanked! ${cannaeLabel} dmg`, caster.playerId);
              }
            }
            // Berserker's Mark: +15% damage when below 50% HP
            if (caster.itemPassiveTags?.includes('berserker_mark') && caster.stats.hp < caster.stats.maxHp * 0.5) {
              dmg = Math.round(dmg * 1.15);
            }
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
            updated = applyKillPassives(updated, caster.id, wasAlive, newBasicHp <= 0, targetIcon.id);
            // Cleopatra Asp's Venom: basic attacks apply stacking Poison (cap 3 stacks) + move debuff at L5
            if (caster.name.includes("Cleopatra") && newBasicHp > 0) {
              const venomDuration = 3;
              const freshVenomTarget = updated.players.flatMap(p => p.icons).find(i => i.id === targetIcon.id);
              if (freshVenomTarget) {
                const existingPoison = freshVenomTarget.debuffs?.find(d => d.type === 'poison');
                const newPoisonMag = Math.min((existingPoison?.magnitude ?? 0) + 8, 24); // 3 stacks × 8
                const poisonDebuff: Debuff = { type: 'poison', magnitude: newPoisonMag, turnsRemaining: venomDuration };
                updated.players = updated.players.map(p => ({
                  ...p,
                  icons: p.icons.map(ic => ic.id !== freshVenomTarget.id ? ic : {
                    ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'poison'), poisonDebuff],
                  }),
                }));
                const stackCount = Math.round(newPoisonMag / 8);
                pushLog(updated, `${caster.name} Asp's Venom — ${freshVenomTarget.name} Poisoned (${stackCount}/3 stacks)!`, caster.playerId);
                // Eye of Ra: venom also reduces Power by 5 per stack
                if (caster.itemPassiveTags?.includes('sig_cleopatra_eye_of_ra')) {
                  const existingPwr = freshVenomTarget.debuffs?.find(d => d.type === 'power_reduction');
                  const newPwrMag = Math.min((existingPwr?.magnitude ?? 0) + 5, 15); // 3 stacks × 5
                  const eyePwrDebuff: Debuff = { type: 'power_reduction', magnitude: newPwrMag, turnsRemaining: venomDuration };
                  updated.players = updated.players.map(p => ({
                    ...p,
                    icons: p.icons.map(ic => ic.id !== freshVenomTarget.id ? ic : {
                      ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'power_reduction'), eyePwrDebuff],
                    }),
                  }));
                }
                // Level 5: also apply mud_throw (move −1) for venom duration
                if ((caster.level ?? 1) >= 5) {
                  const moveDebuff: Debuff = { type: 'mud_throw', magnitude: 1, turnsRemaining: venomDuration };
                  updated.players = updated.players.map(p => ({
                    ...p,
                    icons: p.icons.map(ic => ic.id !== freshVenomTarget.id ? ic : {
                      ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'mud_throw'), moveDebuff],
                    }),
                  }));
                  pushLog(updated, `${caster.name} Asp's Venom (L5) — ${freshVenomTarget.name} Move −1!`, caster.playerId);
                }
              }
            }
            // Thermopylae Stone: at 3 phalanx stacks, basic attacks taunt the target
            if (caster.name.includes("Leonidas") && (caster.passiveStacks ?? 0) >= 3 && caster.itemPassiveTags?.includes('sig_leonidas_thermopylae') && newBasicHp > 0) {
              const tauntDebuff: Debuff = { type: 'taunted' as any, magnitude: 0, turnsRemaining: 1, sourceIconId: caster.id };
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                  ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'taunted'), tauntDebuff],
                }),
              }));
              pushLog(updated, `🪨 ${caster.name} Thermopylae Stone: ${targetIcon.name} is Taunted!`, caster.playerId);
            }
          } else {
            if (isOwnBase) {
              toast.error(getT().messages.cantAttackOwnBase2);
              return prev;
            }
            const envDamage = Math.max(0.1, calcEffectiveStats(updated, caster).might);

            const isBase =
              (coordinates.q === -5 && coordinates.r === 4) ||
              (coordinates.q === 5 && coordinates.r === -4);
            if (isBase) {
              const enemyId = caster.playerId === 0 ? 1 : 0;
              updatedBaseHealth[enemyId] = Math.max(0, state.baseHealth[enemyId] - envDamage);
              pushLog(updated, `${caster.name} hit the enemy base for ${envDamage.toFixed(0)} dmg`, caster.playerId);
              toast.success(`💥 Base hit! −${envDamage.toFixed(0)} HP → ${Math.max(0, state.baseHealth[enemyId] - envDamage).toFixed(0)} remaining`, { position: 'top-right' });
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
            // Horde Tactics: Power × perEnemyMult × enemyCount to ALL enemies in range (cap at 2.5× Power)
            const perEnemyMult = (ability as any).perEnemyMult as number ?? 0.5;
            const casterStats = calcEffectiveStats(updated, caster);
            const enemiesInRange = updated.players
              .flatMap(p => p.icons)
              .filter(ic => ic.isAlive && ic.playerId !== caster.playerId && hexDistance(caster.position, ic.position) <= (ability.range ?? 2));
            const enemyCount = enemiesInRange.length;
            if (enemyCount === 0) { toast.error(getT().messages.noTargetToHit); return prev; }
            const scaledMult = Math.min(perEnemyMult * enemyCount, 2.5);
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
              movedThisTurn: true,  // cannot move on summon turn
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
              movedThisTurn: true,  // cannot move on summon turn
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
              if ((ability as any).executeDouble && targetIcon.stats.hp < targetIcon.stats.maxHp * 0.4) {
                dmg *= 2;
                pushLog(updated, `EXECUTE! ${targetIcon.name} below 40% HP — Rider's Fury damage doubled!`, caster.playerId);
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
                (coordinates.q === -5 && coordinates.r === 4) ||
                (coordinates.q === 5 && coordinates.r === -4);
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
      // Controlled enemies auto-act via AI — player cannot manually select/control them
      if (clicked && clicked.playerId === state.activePlayerId && !(clicked as any).terracottaControlled) {
        return { ...state, selectedIcon: clicked.id };
      }

      const dest = state.board.find((t) => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
      if (!dest) return prev;
      if (dest.terrain.effects.movementModifier === -999) {
        // Sun-sin (Turtle Ship passive) can enter lake tiles — the impassable deep water
        if (me.name.includes("Sun-sin") && dest.terrain.type === 'lake') {
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

      // Sun-sin already on lake: cap movement budget to 1 (Turtle Ship — anchored in lake).
      // River grants stat bonuses but does NOT cap movement.
      const currentTileType = state.board.find(t => t.coordinates.q === me.position.q && t.coordinates.r === me.position.r)?.terrain.type ?? '';
      const alreadyOnLake = me.name.includes("Sun-sin") && currentTileType === 'lake';
      const effectiveMovement = alreadyOnLake ? Math.min(1, me.stats.movement) : me.stats.movement;
      const budget = effectiveMovement; // use remaining movement directly — no moveRange cap (Quick Move can exceed it)
      // Friendly icons are passable transit tiles; enemy icons are hard blocks
      const myPlayerId = me.playerId;
      const playerBlockedKeys = new Set(
        state.players.flatMap((p) => p.icons)
          .filter((ic) => ic.id !== me.id && ic.isAlive && ic.playerId !== myPlayerId)
          .map((ic) => tileKey(ic.position.q, ic.position.r))
      );
      const playerAllyKeys = new Set(
        state.players.flatMap((p) => p.icons)
          .filter((ic) => ic.id !== me.id && ic.isAlive && ic.playerId === myPlayerId)
          .map((ic) => tileKey(ic.position.q, ic.position.r))
      );
      const allowLake = me.name.includes("Sun-sin");
      const costMap = reachableWithCosts(state.board, me.position, budget, playerBlockedKeys, allowLake, playerAllyKeys);
      const destKey = tileKey(coordinates.q, coordinates.r);
      const moveCost = costMap.get(destKey);
      if (moveCost === undefined) return prev;

      const from = { ...me.position };
      const movementBefore = me.stats.movement;
      const movementStack = { ...(state.movementStack ?? {}) };
      const stack = movementStack[me.id] ?? [];
      stack.push({ from, to: coordinates, cost: moveCost, movementBefore });
      movementStack[me.id] = stack;
      if (me.justRespawned) return prev; // Can't move on turn they spawn
      // Note: movedThisTurn is NOT checked here — multi-step movement is allowed
      // as long as stats.movement budget > 0 (enforced by Dijkstra budget above).
      if (me.debuffs?.some(d => d.type === 'stun')) {
        toast.error(`${me.name} is STUNNED and cannot move!`);
        return prev;
      }
      if (me.debuffs?.some(d => d.type === 'rooted')) {
        toast.error(`${me.name} is ROOTED and cannot move!`);
        return prev;
      }
      // Only lake landing caps remaining movement to 1; river grants bonuses but full movement remains.
      const landingOnLake = me.name.includes("Sun-sin") && dest.terrain.type === 'lake';
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
                movement: landingOnLake
                  ? Math.min(1, Math.max(0, ic.stats.movement - moveCost))
                  : Math.max(0, ic.stats.movement - moveCost),
              },
            }
            : ic
        ),
      }));
      state.movementStack = movementStack;

      // ── Ice slide: landing on ice pushes unit one extra hex in the movement direction ──
      // If the slide hex is blocked/off-board: unit stays, takes 5 damage, and is Stunned for 1 turn.
      if (dest.terrain.type === 'ice') {
        const dq = coordinates.q - from.q;
        const dr = coordinates.r - from.r;
        // Clamp direction to one axial step
        const len = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
        if (len > 0) {
          const dirQ = Math.round(dq / len);
          const dirR = Math.round(dr / len);
          const slideTarget = { q: coordinates.q + dirQ, r: coordinates.r + dirR };
          const slideTile = state.board.find(t => t.coordinates.q === slideTarget.q && t.coordinates.r === slideTarget.r);
          const slideOccupied = state.players.flatMap(p => p.icons).some(
            ic => ic.isAlive && ic.id !== me.id && ic.position.q === slideTarget.q && ic.position.r === slideTarget.r
          );
          const slidePassable = slideTile && slideTile.terrain.effects.movementModifier !== -999 && !slideOccupied;
          if (slidePassable) {
            state.players = state.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== me.id ? ic : { ...ic, position: slideTarget }),
            }));
            pushLog(state, `${me.name} slides on ice!`, me.playerId);
          } else {
            // Collision: take 5 damage and get stunned for 1 turn
            const stunDebuff: Debuff = { type: 'stun', magnitude: 0, turnsRemaining: 1 };
            state.players = state.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => {
                if (ic.id !== me.id) return ic;
                const newHp = Math.max(0, ic.stats.hp - 5);
                return {
                  ...ic,
                  stats: { ...ic.stats, hp: newHp },
                  isAlive: newHp > 0,
                  debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'stun'), stunDebuff],
                };
              }),
            }));
            pushLog(state, `${me.name} collides on ice! 5 damage and Stunned!`, me.playerId);
          }
        }
      }

      return state;
    });
  }, []);

  const useAbility = useCallback((abilityId: string) => {
    setGameState((prev) => {
      // Use selectedIcon if set, else first alive non-controlled on active player's team
      const me = prev.players[prev.activePlayerId]?.icons.find(
        i => (prev.selectedIcon ? i.id === prev.selectedIcon : true) && i.isAlive && !(i as any).terracottaControlled
      ) ?? prev.players[prev.activePlayerId]?.icons.find(i => i.isAlive && !(i as any).terracottaControlled);
      if (!me || me.cardUsedThisTurn) return prev;
      if (prev.gameMode === "singleplayer" && me.playerId === 1) return prev;
      if (me.debuffs?.some(d => d.type === 'silence') && !me.name.includes("Nelson")) {
        toast.error(`${me.name} is SILENCED and cannot use abilities!`);
        return prev;
      }

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

      // If a card is mid-targeting, cancel it: restore card to hand and refund mana
      let cancelledState = prev;
      if (prev.targetingMode?.cardRefund) {
        const { card, manaRefund } = prev.targetingMode.cardRefund;
        const pid = me.playerId;
        cancelledState = {
          ...prev,
          hand: [...prev.hand, card],
          globalMana: prev.globalMana.map((m, i) => i === pid ? m + manaRefund : m) as [number, number],
          targetingMode: undefined,
        };
      }

      return { ...cancelledState, targetingMode: { abilityId, iconId: me.id, range: ability.range } };
    });
  }, []);

  const basicAttack = useCallback(() => {
    setGameState((prev) => {
      const me = prev.players[prev.activePlayerId]?.icons.find(
        i => (prev.selectedIcon ? i.id === prev.selectedIcon : true) && i.isAlive && !(i as any).terracottaControlled
      ) ?? prev.players[prev.activePlayerId]?.icons.find(i => i.isAlive && !(i as any).terracottaControlled);
      if (!me || me.cardUsedThisTurn) return prev;
      if (prev.gameMode === "singleplayer" && me.playerId === 1) return prev;

      // Toggle off if already targeting basic for this icon
      if (prev.targetingMode?.abilityId === "basic_attack" && prev.targetingMode.iconId === me.id) {
        return { ...prev, targetingMode: undefined, cardTargetingMode: undefined };
      }

      const onWater = ['lake', 'river'].includes(prev.board.find(t => t.coordinates.q === me.position.q && t.coordinates.r === me.position.r)?.terrain.type ?? '');
      const isBlinded = me.debuffs?.some(d => d.type === 'blinded') ?? false;
      const range = isBlinded ? 1
        : me.name.includes("Sun-sin") && onWater ? 2 + (me.stats.attackRange ?? 1)
        : (me.stats.attackRange ?? 1);
      // Clearing cardTargetingMode prevents the prior ability from firing on the next tile click
      return { ...prev, targetingMode: { abilityId: "basic_attack", iconId: me.id, range }, cardTargetingMode: undefined };
    });
  }, []);

  /* =========================
     End Turn — robust boundary + respawn at boundary only
     ========================= */
  const endTurn = useCallback(() => {
    setGameState((prev) => {
      const nextPlayer: 0 | 1 = prev.activePlayerId === 0 ? 1 : 0;

      // ── Objective already met? Declare victory immediately, skipping all
      //    end-of-turn damage so the winning player can't die after winning. ──
      {
        const _p1Alive = prev.players[1].icons.some(ic => ic.isAlive);
        if (prev.baseHealth[1] <= 0) {
          return { ...prev, phase: 'victory' as any, winner: 0 };
        }
        if (prev.baseHealth[0] <= 0 && !(prev as any).isRoguelikeRun) {
          return { ...prev, phase: 'defeat' as any, winner: 1 };
        }
        if (!_p1Alive && (prev as any).encounterObjective !== 'destroy_base') {
          return { ...prev, phase: 'victory' as any, winner: 0 };
        }
      }

      // Crystal adjacency helper
      const crystalTile = prev.board.find(t => t.terrain.type === "mana_crystal");
      const hexDistFn = (a: {q:number;r:number}, b: {q:number;r:number}) => {
        const ax = a.q, az = a.r, ay = -ax - az;
        const bx = b.q, bz = b.r, by = -bx - bz;
        return (Math.abs(ax-bx) + Math.abs(ay-by) + Math.abs(az-bz)) / 2;
      };

      // Composer's Baton: next player has a live Beethoven with the baton item
      const hasFreudDef = prev.players.find(p => p.id === nextPlayer)?.icons.some(
        ic => ic.isAlive && ic.name.includes("Beethoven") && ic.itemPassiveTags?.includes('beethoven_freud_def5')
      ) ?? false;

      // Tesla Voltage: +1 stack if did NOT move this turn; -1 stack if moved (min 0, max 5)
      // Overloaded state (5 stacks) is read by card effects; stacks persist across turns
      let prevWithVoltage = prev;
      {
        const teslaIcons = prev.players[prev.activePlayerId]?.icons.filter(ic => ic.isAlive && ic.name.includes("Tesla")) ?? [];
        for (const tesla of teslaIcons) {
          const moved = tesla.movedThisTurn;
          const curVolt = tesla.passiveStacks ?? 0;
          const voltCap = tesla.itemPassiveTags?.includes('sig_tesla_transmitter') ? 8 : 5;
          const newVolt = moved ? Math.max(0, curVolt - 1) : Math.min(voltCap, curVolt + 1);
          if (newVolt !== curVolt) {
            prevWithVoltage = {
              ...prevWithVoltage,
              players: prevWithVoltage.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== tesla.id ? ic : { ...ic, passiveStacks: newVolt }),
              })),
            };
            const overloaded = newVolt >= voltCap ? ' ⚡ OVERLOADED!' : '';
            pushLog(prevWithVoltage as ExtState, `${tesla.name} Voltage: ${newVolt}/${voltCap} stacks${overloaded}`, tesla.playerId);
          }
        }
      }

      // Cleopatra untouchable: tick down untouchableTurns
      {
        prevWithVoltage = {
          ...prevWithVoltage,
          players: prevWithVoltage.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => {
              if (!ic.untouchableTurns || ic.untouchableTurns <= 0 || ic.playerId !== prev.activePlayerId) return ic;
              const remaining = ic.untouchableTurns - 1;
              if (remaining === 0) pushLog(prevWithVoltage as ExtState, `${ic.name} is no longer UNTOUCHABLE.`, ic.playerId);
              return { ...ic, untouchableTurns: remaining };
            }),
          })),
        };
      }

      // Reset icons for the player who just ended + clear buffs for starting player
      let resetPlayers = prevWithVoltage.players.map((player) => ({
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
            // Rooted: blocks movement only (enforced in selectTile) — no turn skip
            const isRooted = ic.isAlive && ic.debuffs?.some(d => d.type === 'rooted');
            if (isRooted) pushLog(prev as any, `${ic.name} is ROOTED — cannot move this turn!`, nextPlayer);
            // Stun: guaranteed full freeze (no movement, no cards, no actions)
            const isStunned = ic.isAlive && ic.debuffs?.some(d => d.type === 'stun');
            if (isStunned) pushLog(prev as any, `${ic.name} is STUNNED — cannot act this turn!`, nextPlayer);
            const demoSkip = false;
            // Sun-sin Turtle Ship: on lake tiles, movement capped at 1; river is full movement
            const sunsinTileType = prev.board.find(t => t.coordinates.q === ic.position.q && t.coordinates.r === ic.position.r)?.terrain.type ?? '';
            const sunsinOnLake = ic.name.includes("Sun-sin") && ic.isAlive && sunsinTileType === 'lake';
            const sunsinOnRiver = ic.name.includes("Sun-sin") && ic.isAlive && ['lake', 'river'].includes(sunsinTileType);
            const frozen = demoSkip || isStunned;
            // Freudenspur zone bonus at turn start — capped at +2 total, applies once to all chars in zone
            const zoneBonus = !frozen
              ? Math.min(2, (prev.activeZones ?? []).reduce((sum, z) => {
                  if (z.ownerId === nextPlayer && ic.isAlive && hexDistance(ic.position, z.center) <= z.radius) {
                    return sum + z.magnitude;
                  }
                  return sum;
                }, 0))
              : 0;
            const baseMove = frozen ? 0 : Math.max(0, ic.stats.moveRange - moveReduction);
            const finalMove = baseMove;
            // Composer's Baton: +5 DEF to allies standing on Freudenspur zones
            const inFreudZone = hasFreudDef && ic.isAlive && (prev.activeZones ?? []).some(
              z => z.ownerId === nextPlayer && hexDistance(ic.position, z.center) <= z.radius
            );
            if (inFreudZone) pushLog(prev as any, `🎵 ${ic.name} gains +5 DEF from Composer's Baton!`, nextPlayer);
            const hardyCoatActive = ic.name.includes("Nelson") && ic.itemPassiveTags?.includes('nelson_hardy_coat') && (ic.passiveStacks ?? 0) > 0;
            const newPassiveStacks = hardyCoatActive ? (ic.passiveStacks! - 1) : ic.passiveStacks;
            if (hardyCoatActive) pushLog(prev as any, `🧥 ${ic.name} Hardy's Coat: +25 DEF (${ic.passiveStacks! - 1} turn${ic.passiveStacks! - 1 !== 1 ? 's' : ''} remaining)`, nextPlayer);
            // Admiral's Turtle Helm: Sun-sin on water heals 10 HP/turn
            const turtleHelmRegen = sunsinOnRiver && ic.itemPassiveTags?.includes('sig_sunsin_turtle_helm') ? 10 : 0;
            if (turtleHelmRegen > 0) pushLog(prev as any, `🐢 ${ic.name} Turtle Helm: +${turtleHelmRegen} HP regen (water form)`, nextPlayer);
            // Multi-turn card buff persistence: if cardBuffTurns > 1, decrement and KEEP the buff values
            const buffTurnsLeft = (ic.cardBuffTurns ?? 0) - 1;
            const keepBuff = buffTurnsLeft > 0;
            return {
              ...ic,
              cardBuffAtk: keepBuff ? (ic.cardBuffAtk ?? 0) : 0,
              cardBuffDef: keepBuff ? (ic.cardBuffDef ?? 0) : ((inFreudZone ? 5 : 0) + (hardyCoatActive ? 25 : 0)),
              cardBuffPow: keepBuff ? (ic.cardBuffPow ?? 0) : 0,
              cardBuffTurns: keepBuff ? buffTurnsLeft : 0,
              cardsUsedThisTurn: frozen ? 3 : 0,
              movedThisTurn: frozen ? true : false,
              passiveStacks: newPassiveStacks,
              stats: {
                ...ic.stats,
                hp: Math.min(ic.stats.maxHp, ic.stats.hp + turtleHelmRegen),
                movement: sunsinOnLake ? Math.min(1 + zoneBonus, finalMove + zoneBonus) : finalMove + zoneBonus,
              },
            };
          }
          return ic;
        }),
      }));

      // Global mana refill for next player — base 5, +1 if 1–2 allies adjacent to crystal, +2 if 3+ allies adjacent
      const nextPlayerIcons = resetPlayers.find(p => p.id === nextPlayer)?.icons.filter(ic => ic.isAlive) ?? [];
      const crystalAdjCount = crystalTile
        ? nextPlayerIcons.filter(ic => hexDistFn(ic.position, crystalTile.coordinates) === 1).length
        : 0;
      const crystalBonus = crystalAdjCount >= 3 ? 2 : crystalAdjCount > 0 ? 1 : 0;
      const nextMana = 5 + crystalBonus;
      const mana = [...prev.globalMana] as [number, number];
      mana[nextPlayer] = nextMana;
      const maxMana = [...(prev.globalMaxMana ?? [5, 5])] as [number, number];
      maxMana[nextPlayer] = nextMana;

      // Mana Crystal item (mana_plus_1_per_turn): +1 mana per holder on turn start
      const manaCrystalCount = nextPlayerIcons.filter(ic => ic.itemPassiveTags?.includes('mana_plus_1_per_turn')).length;
      if (manaCrystalCount > 0) {
        mana[nextPlayer] += manaCrystalCount;
        maxMana[nextPlayer] += manaCrystalCount;
      }

      // Mansa Salt Road mana zone: allies on zone gain +1 Mana at turn start
      const manaRegenZones = (prev.activeZones ?? []).filter(z => z.effect === 'manaRegen' && z.ownerId === nextPlayer);
      if (manaRegenZones.length > 0) {
        const manaRegenCount = nextPlayerIcons.filter(ic =>
          manaRegenZones.some(z => hexDistance(ic.position, z.center) <= z.radius)
        ).length;
        if (manaRegenCount > 0) {
          mana[nextPlayer] = Math.min(8, mana[nextPlayer] + manaRegenCount);
          maxMana[nextPlayer] = Math.min(8, maxMana[nextPlayer] + manaRegenCount);
          pushLog(prev as any, `Salt Road: +${manaRegenCount} Mana from mana zone!`, nextPlayer);
        }
      }

      // Tesla Coil zones: when an enemy of the zone owner starts their turn on it, apply Armor Break + Stun.
      // Zone owner is the Tesla player. `nextPlayer` starts their turn now — if they are NOT the owner, any of their
      // icons standing on the zone get hit.
      const teslaCoilZones = (prev.activeZones ?? []).filter(z => z.effect === 'teslaCoil' && z.ownerId !== nextPlayer);
      if (teslaCoilZones.length > 0) {
        resetPlayers = resetPlayers.map(p => p.id !== nextPlayer ? p : ({
          ...p,
          icons: p.icons.map(ic => {
            if (!ic.isAlive) return ic;
            const onCoil = teslaCoilZones.find(z => hexDistance(ic.position, z.center) <= z.radius);
            if (!onCoil) return ic;
            const armorBreak: Debuff = { type: 'armor_break', magnitude: onCoil.magnitude, turnsRemaining: 1 };
            const newDebuffs = [...(ic.debuffs ?? []).filter(d => d.type !== 'armor_break'), armorBreak];
            if (onCoil.coilStun) {
              newDebuffs.push({ type: 'stun', magnitude: 0, turnsRemaining: 1 });
              pushLog(prev as any, `⚡ ${ic.name} stunned by Tesla Coil (−${onCoil.magnitude} DEF, 1t)!`, nextPlayer);
            } else {
              pushLog(prev as any, `⚡ ${ic.name} Tesla Coil: −${onCoil.magnitude} DEF this turn!`, nextPlayer);
            }
            return { ...ic, debuffs: newDebuffs };
          }),
        }));
      }

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
              // In roguelike runs: enemies never respawn
              if ((prev as ExtState).isRoguelikeRun && player.id === 1) return ic;
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
          if (tile?.terrain.type === 'lake' && !ic.name.includes("Sun-sin")) {
            pushLog({ ...prev, players: playersAfter } as any, `${ic.name} drowned in the lake!`, ic.playerId);
            return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 };
          }
          // Scorching Heat: desert tiles deal 10 pure damage at turn end
          if (tile?.terrain.type === 'desert') {
            const newHp = Math.max(0, ic.stats.hp - 10);
            pushLog({ ...prev, players: playersAfter } as any, `🌡 ${ic.name} takes 10 scorching heat damage!`, ic.playerId);
            return newHp <= 0
              ? { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 }
              : { ...ic, stats: { ...ic.stats, hp: newHp } };
          }
          return ic;
        }),
      }));

      // Remove expired drones / terracotta warriors (droneExpiresTurn used for both), and dead decoys
      const newCurrentTurn = nextPlayer === 0 ? prev.currentTurn + 1 : prev.currentTurn;
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.filter(ic =>
          (ic.droneExpiresTurn === undefined || ic.droneExpiresTurn > newCurrentTurn) &&
          !(ic.isDecoy && !ic.isAlive)
        ),
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
      // Carry previous event forward for 4 endTurn cycles (≈2 full rounds) so the banner stays readable
      const prevArenaEvent = (extPrevArena as any).arenaEvent ?? null;
      const prevArenaEventAge: number = (extPrevArena as any).arenaEventAge ?? 0;
      let arenaEvent: import('@/types/game').ArenaEventDef | null =
        (prevArenaEvent && prevArenaEventAge < 4) ? prevArenaEvent : null;
      let arenaEventAge: number = arenaEvent ? prevArenaEventAge + 1 : 0;
      let gravityCrushSaved: Record<string, number> | undefined = (extPrevArena as any).gravityCrushSaved;
      let gravitySurgeSaved: Record<string, number> | undefined = (extPrevArena as any).gravitySurgeSaved;
      let adrenalineSaved: Record<string, { might: number; power: number }> | undefined = (extPrevArena as any).adrenalineSaved;

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

      // Restore movement stats when gravity_surge expires (lasts 1 round)
      if (prevArenaEvent?.id === 'gravity_surge' && prevArenaEventAge >= 2 && gravitySurgeSaved) {
        playersAfter = playersAfter.map(p => ({
          ...p,
          icons: p.icons.map(ic => {
            const origMove = gravitySurgeSaved![ic.id];
            if (origMove === undefined) return ic;
            return { ...ic, stats: { ...ic.stats, moveRange: origMove, movement: origMove } };
          }),
        }));
        gravitySurgeSaved = undefined;
      }

      // Restore might/power when adrenaline_cloud expires (lasts 1 round)
      if (prevArenaEvent?.id === 'adrenaline_cloud' && prevArenaEventAge >= 2 && adrenalineSaved) {
        playersAfter = playersAfter.map(p => ({
          ...p,
          icons: p.icons.map(ic => {
            const orig = adrenalineSaved![ic.id];
            if (!orig) return ic;
            return { ...ic, stats: { ...ic.stats, might: orig.might, power: orig.power } };
          }),
        }));
        adrenalineSaved = undefined;
      }
      // Track which timed event just expired this endTurn cycle — prevent immediate re-roll of the same event
      const justExpiredEventId = (prevArenaEvent && prevArenaEventAge >= 2) ? prevArenaEvent.id : null;

      if (extPrevArena.isRoguelikeRun && nextPlayer === 0 && newCurrentTurn >= 2) {
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

        // 35% at turn 2, +5% each turn after (turn 3 = 40%, turn 4 = 45% ... cap 85%)
        const eventChance = Math.min(0.85, 0.35 + (newCurrentTurn - 2) * 0.05);
        if (Math.random() < eventChance) {
          const ALL_EVENTS: import('@/types/game').ArenaEventDef[] = [
            { id: 'gravity_surge', name: 'Gravity Surge',  icon: '🌀', description: 'Gravitational anomaly! All units gain +2 Movement this round.' },
            { id: 'mana_surge',    name: 'Mana Surge',     icon: '💎', description: 'Mana wells overflow! Both teams gain +2 bonus mana.' },
            { id: 'forest_fire',   name: 'Forest Fire',    icon: '🔥', description: '⚠ INCOMING in 2 turns — a forest tile will ignite and spread 50%/turn. Units on burning forest take 30 pure damage. Permanent!' },
            { id: 'laser_grid',    name: 'Laser Grid',     icon: '⚡', description: 'Znyxorga targets 10 random tiles — marked in gold. NEXT TURN those tiles fire 40 pure damage. Move your units now!' },
            { id: 'alien_tide',    name: 'Alien Tide',     icon: '🌊', description: '⚠ INCOMING in 2 turns — lake tiles will spread 50%/turn. Move off low ground. Permanent!' },
            { id: 'gravity_well',  name: 'Gravity Well',   icon: '⬇️', description: 'A gravity well forms at the center! All units are pulled 2 hexes toward the arena\'s heart.' },
            { id: 'gravity_crush',   name: 'Gravity Crush',   icon: '🪨', description: 'Intense gravity crushes the arena! All unit movement is halved this round.' },
            { id: 'repulse_field',   name: 'Repulse Field',   icon: '💥', description: 'Magnetic repulsion erupts from the center! All units are blasted 2 hexes outward.' },
            { id: 'adrenaline_cloud', name: 'Adrenaline Cloud', icon: '🧪', description: 'The aliens flood the arena with stimulants! All units gain +25% Might and Power this round — watch for bursty enemy abilities.' },
            { id: 'scramble',        name: 'Scramble',        icon: '🌀', description: 'Znyxorga scrambles all unit positions! Every combatant is teleported to a random location on the battlefield.' },
          ];
          // Don't roll events that are already active or already pending
          const eligibleEvents = ALL_EVENTS.filter(e => {
            if (e.id === 'alien_tide' && (floodIsActive || pendingFloodCountdown !== undefined)) return false;
            if (e.id === 'forest_fire' && (forestFireIsActive || pendingFireCountdown !== undefined)) return false;
            if (e.id === 'forest_fire' && boardAfter.filter(t => t.terrain.type === 'forest').length === 0) return false;
            if (e.id === 'gravity_surge' && gravitySurgeSaved && Object.keys(gravitySurgeSaved).length > 0) return false;
            if (e.id === 'gravity_crush' && gravityCrushSaved && Object.keys(gravityCrushSaved).length > 0) return false;
            if (e.id === 'adrenaline_cloud' && adrenalineSaved && Object.keys(adrenalineSaved).length > 0) return false;
            // Don't re-roll an event that just expired this same round boundary
            if (justExpiredEventId && e.id === justExpiredEventId) return false;
            // Laser Grid warning tiles must be visible during player's turn — only roll when AI ends turn
            if (e.id === 'laser_grid' && prev.activePlayerId !== 1) return false;
            // Scramble teleports onto flooded tiles = instant death — never while Alien Tide is active
            if (e.id === 'scramble' && floodIsActive) return false;
            return true;
          });
          if (eligibleEvents.length === 0) { /* all permanent events already active */ }
          else {
          arenaEvent = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
          arenaEventAge = 0; // Reset age so new event stays visible for 2 full turns
          pushLog(prev as any, `🌌 ARENA EVENT: ${arenaEvent.name} — ${arenaEvent.description}`, 0);

          if (arenaEvent.id === 'gravity_surge') {
            const surgeSave: Record<string, number> = {};
            playersAfter.forEach(p => p.icons.forEach(ic => {
              if (ic.isAlive) surgeSave[ic.id] = ic.stats.moveRange;
            }));
            playersAfter = playersAfter.map(p => ({
              ...p,
              icons: p.icons.map(ic => !ic.isAlive ? ic : {
                ...ic, stats: { ...ic.stats, moveRange: ic.stats.moveRange + 2, movement: ic.stats.moveRange + 2 },
              }),
            }));
            gravitySurgeSaved = surgeSave;
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
                  // Lake → drown
                  if (destTile.terrain.type === 'lake') {
                    pushLog(prev as any, `${ic.name} is pulled into the lake by the Gravity Well!`, ic.playerId);
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
          } else if (arenaEvent.id === 'repulse_field') {
            // Push all alive icons 2 hexes AWAY from center (0,0)
            const allAliveIds = new Set(playersAfter.flatMap(p => p.icons).filter(ic => ic.isAlive).map(ic => ic.id));
            const hdistR = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
            const pushStep = (q: number, r: number): { q: number; r: number } => {
              const dirs = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
              const cur = hdistR(q, r);
              const best = dirs.reduce<{q:number;r:number}|null>((b, d) => {
                const nq = q + d.q, nr = r + d.r, nd = hdistR(nq, nr);
                if (nd <= cur) return b;
                return !b || nd > hdistR(q + b.q, r + b.r) ? d : b;
              }, null);
              return best ? { q: q + best.q, r: r + best.r } : { q, r };
            };
            for (let step = 0; step < 2; step++) {
              const occupiedPos = new Map<string, string>();
              playersAfter.flatMap(p => p.icons).filter(ic => ic.isAlive).forEach(ic => {
                occupiedPos.set(tileKey(ic.position.q, ic.position.r), ic.id);
              });
              playersAfter = playersAfter.map(p => ({
                ...p,
                icons: p.icons.map(ic => {
                  if (!ic.isAlive || !allAliveIds.has(ic.id)) return ic;
                  const dest = pushStep(ic.position.q, ic.position.r);
                  const destKey = tileKey(dest.q, dest.r);
                  const destTile = prev.board.find(t => t.coordinates.q === dest.q && t.coordinates.r === dest.r);
                  if (!destTile) return ic;
                  const impassable = destTile.terrain.effects.movementModifier === -999 || destTile.terrain.type === 'mountain';
                  if (impassable) return ic;
                  const blockedBy = occupiedPos.get(destKey);
                  if (blockedBy && blockedBy !== ic.id) return ic;
                  if (destTile.terrain.type === 'lake') {
                    pushLog(prev as any, `${ic.name} is hurled into the lake by the Repulse Field!`, ic.playerId);
                    return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 } };
                  }
                  occupiedPos.set(destKey, ic.id);
                  return { ...ic, position: dest };
                }),
              }));
            }
          } else if (arenaEvent.id === 'adrenaline_cloud') {
            // +25% Might/Power this round (reduced from +50% to prevent one-shots when combined with high-multiplier enemy abilities)
            const adrenSave: Record<string, { might: number; power: number }> = {};
            playersAfter.forEach(p => p.icons.forEach(ic => {
              if (ic.isAlive) adrenSave[ic.id] = { might: ic.stats.might, power: ic.stats.power };
            }));
            playersAfter = playersAfter.map(p => ({
              ...p,
              icons: p.icons.map(ic => !ic.isAlive ? ic : {
                ...ic, stats: {
                  ...ic.stats,
                  might: Math.round(ic.stats.might * 1.25),
                  power: Math.round(ic.stats.power * 1.25),
                },
              }),
            }));
            adrenalineSaved = adrenSave;
          } else if (arenaEvent.id === 'scramble') {
            const allAlive = playersAfter.flatMap(p => p.icons).filter(ic => ic.isAlive);
            const validTiles = boardAfter.filter(t =>
              t.terrain.type !== 'mountain' &&
              t.terrain.type !== 'lake' &&
              t.terrain.effects.movementModifier !== -999
            );
            const shuffledTiles = [...validTiles].sort(() => Math.random() - 0.5);
            const shuffledIcons = [...allAlive].sort(() => Math.random() - 0.5);
            const iconToTile = new Map<string, { q: number; r: number }>();
            shuffledIcons.forEach((ic, i) => {
              const tile = shuffledTiles[i];
              if (tile) iconToTile.set(ic.id, { q: tile.coordinates.q, r: tile.coordinates.r });
            });
            playersAfter = playersAfter.map(p => ({
              ...p,
              icons: p.icons.map(ic => {
                const pos = iconToTile.get(ic.id);
                if (!pos || !ic.isAlive) return ic;
                return { ...ic, position: pos };
              }),
            }));
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
            { q: 5, r: -4 }, { q: 3, r: -3 }, { q: 3, r: -4 },
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
        const BASE_Q = 5, BASE_R = -4;
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
          toast.error(`🔴 Enemy Base fires! ${bombarded.join(', ')}`, { position: 'top-right' });
        }
      }

      // destroy_base: base turrets fire at ALL player characters within range 3 every turn
      if (extPrev.encounterObjective === 'destroy_base' && nextPlayer === 0) {
        const TURRET_Q = 5, TURRET_R = -4;
        const turretHits: string[] = [];
        playersAfter = playersAfter.map(p => {
          if (p.id !== 0) return p;
          return {
            ...p,
            icons: p.icons.map(ic => {
              if (!ic.isAlive) return ic;
              const dist = hexDistance(ic.position, { q: TURRET_Q, r: TURRET_R });
              if (dist > 3) return ic;
              const totalDef = (ic.stats.defense ?? 0) + (ic.cardBuffDef ?? 0);
              const turretDmg = Math.max(1, 50 - totalDef);
              const newHp = Math.round(Math.max(0, ic.stats.hp - turretDmg));
              turretHits.push(`${ic.name} (−${turretDmg})`);
              pushLog(prev as any, `🏰 Base Turret fires at ${ic.name} for ${turretDmg} damage!`, 1);
              return { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 };
            }),
          };
        });
        if (turretHits.length > 0) {
          toast.error(`🏰 Base Turrets fire! ${turretHits.join(', ')}`, { position: 'top-right' });
        }
      }

      // Alien Tide flood spreading — every turn flood is active, adjacent tiles have 50% to become lake (impassable)
      if (floodIsActive && nextPlayer === 0) {
        const HEX_DIRS = [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}];
        const PROTECTED = new Set(['base','mana_crystal','spawn']);
        const lakeFloodKeys = new Set(boardAfter.filter(t => t.terrain.type === 'lake').map(t => `${t.coordinates.q},${t.coordinates.r}`));
        const newRiverKeys = new Set<string>();
        for (const tile of boardAfter) {
          const k = `${tile.coordinates.q},${tile.coordinates.r}`;
          if (lakeFloodKeys.has(k) || PROTECTED.has(tile.terrain.type)) continue;
          const adjacentToLake = HEX_DIRS.some(d => lakeFloodKeys.has(`${tile.coordinates.q + d.q},${tile.coordinates.r + d.r}`));
          if (adjacentToLake && Math.random() < 0.50) newRiverKeys.add(k);
        }
        if (newRiverKeys.size > 0) {
          boardAfter = boardAfter.map(t =>
            newRiverKeys.has(`${t.coordinates.q},${t.coordinates.r}`)
              ? { ...t, terrain: { type: 'lake' as const, effects: { movementModifier: -999 } as any } }
              : t
          );
          // Drown units caught on newly flooded tiles (Sun-sin immune)
          playersAfter = playersAfter.map(p => ({
            ...p,
            icons: p.icons.map(ic => {
              if (!ic.isAlive || !newRiverKeys.has(`${ic.position.q},${ic.position.r}`)) return ic;
              if (ic.name.includes("Sun-sin")) return ic;
              pushLog(prev as any, `🌊 ${ic.name} was engulfed by the rising flood!`, ic.playerId);
              return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 } };
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
      if (prev.baseHealth[0] <= 0 && !extPrev.isRoguelikeRun) { newPhase = "defeat";  winner = 1; }
      if (prev.baseHealth[1] <= 0) { newPhase = "victory"; winner = 0; }
      // Survive objective: win once enough turns have passed
      if (extPrev.encounterObjective === 'survive' && extPrev.survivalTurnsTarget > 0) {
        if (newCurrentTurn > extPrev.survivalTurnsTarget && p0Alive) { newPhase = "victory"; winner = 0; }
      }

      // Tick bleed damage + decrement debuff durations for the side that JUST ended their turn.
      // Rule: debuffs fire/expire when the OWNER of the debuffed unit ends their turn.
      //   • Player applies bleed to enemy  → fires when AI ends turn  (nextPlayer === 0)
      //   • Enemy applies bleed to player  → fires when player ends turn (nextPlayer === 1)
      // ic.playerId === nextPlayer means "this unit's side is ABOUT TO START" — skip them.
      let bleedKilledPlayer: { victimName: string; bleedDmg: number } | null = null;
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive || !ic.debuffs?.length) return ic;
          if (ic.playerId === nextPlayer) return ic; // this side hasn't acted yet — skip
          // Bleed tick
          const bleed = ic.debuffs.find(d => d.type === 'bleed');
          const newHp = bleed ? Math.max(0, ic.stats.hp - bleed.magnitude) : ic.stats.hp;
          if (bleed && ic.playerId === 0 && newHp <= 0 && ic.stats.hp > 0) {
            bleedKilledPlayer = { victimName: ic.name, bleedDmg: bleed.magnitude };
          }
          // Duration decrement (all debuffs)
          const newDebuffs = ic.debuffs
            .map(d => ({ ...d, turnsRemaining: d.turnsRemaining - 1 }))
            .filter(d => d.turnsRemaining > 0);
          return {
            ...ic,
            stats: { ...ic.stats, hp: Math.round(newHp) },
            isAlive: newHp > 0,
            debuffs: newDebuffs,
          };
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
            pushLog(prev as any, `${ic.name} Phalanx: ${newStacks} stack(s) (+${newStacks * (6 + (ic.level ?? 1))} DEF)`, nextPlayer);
          }
          return { ...ic, passiveStacks: newStacks };
        }),
      }));

      // Napoleon Mitraille passive: at the start of Napoleon's turn, deal pure damage to all enemies within range 2
      // Scales with level: 5 + 2 × (level − 1), so lvl 1 = 5, lvl 5 = 13, lvl 10 = 23
      const napoleonIcon = playersAfter.find(p => p.id === nextPlayer)?.icons.find(ic => ic.name.includes("Napoleon") && ic.isAlive);
      if (napoleonIcon) {
        const mitrailleDmg = 5 + 2 * ((napoleonIcon.level ?? 1) - 1);
        const mitrailleHits: string[] = [];
        playersAfter = playersAfter.map(p => {
          if (p.id === napoleonIcon.playerId) return p;
          return {
            ...p,
            icons: p.icons.map(ic => {
              if (!ic.isAlive) return ic;
              if (hexDistance(ic.position, napoleonIcon.position) > 2) return ic;
              const newHp = Math.max(0, ic.stats.hp - mitrailleDmg);
              mitrailleHits.push(ic.name);
              pushLog(prev as any, `🔫 ${napoleonIcon.name} Mitraille — ${ic.name} takes ${mitrailleDmg} damage!`, napoleonIcon.playerId);
              return { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 };
            }),
          };
        });
        if (mitrailleHits.length > 0) {
          pushLog(prev as any, `🔫 Mitraille — ${mitrailleHits.join(', ')} take ${mitrailleDmg} damage!`, napoleonIcon.playerId);
        }
      }

      // Napoleon Tactical Genius: +1 movement when standing on a vantage tile (Forest or Ruins).
      // Refreshed each turn-start; the bonus naturally evaporates if she steps off next turn.
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.name.includes("Napoleon") || !ic.isAlive || ic.playerId !== nextPlayer) return ic;
          const tile = boardAfter.find(t => t.coordinates.q === ic.position.q && t.coordinates.r === ic.position.r);
          const onHighGround = tile?.terrain.type === 'forest' || tile?.terrain.type === 'ruins';
          if (!onHighGround) return ic;
          pushLog(prev as any, `⚔ ${ic.name} Tactical Genius: +1 move (vantage)`, nextPlayer);
          return { ...ic, stats: { ...ic.stats, movement: ic.stats.movement + 1 } };
        }),
      }));

      // Cards: discard ending player's hand, draw fresh hand for next player
      const prevState = prev as ExtState;
      let hands = prevState.hands ? [...prevState.hands] as [Hand, Hand] : undefined;
      let decks = prevState.decks ? [...prevState.decks] as [Deck, Deck] : undefined;
      if (hands && decks) {
        const endPid = prev.activePlayerId;
        const endHand = hands[endPid];
        const endDeck = decks[endPid];

        // ── End-of-turn curse passive penalties ──────────────────────────────
        // Applied before discarding hand, while unplayed curses are still visible
        const cursesInHand = endHand.cards.filter(c => c.definitionId.startsWith('curse_'));
        for (const curse of cursesInHand) {
          if (curse.definitionId === 'curse_malaise') {
            const unplayedCount = endHand.cards.length; // includes Malaise itself
            playersAfter = playersAfter.map(p => ({
              ...p,
              icons: p.icons.map(ic => {
                if (!ic.isAlive || ic.playerId !== endPid) return ic;
                const newHp = Math.max(0, ic.stats.hp - unplayedCount);
                pushLog(prev as any, `☠ Malaise: ${ic.name} takes ${unplayedCount} dmg (${unplayedCount} unplayed cards in hand)!`, endPid);
                return { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 };
              }),
            }));
          } else if (curse.definitionId === 'curse_dread') {
            playersAfter = playersAfter.map(p => ({
              ...p,
              icons: p.icons.map(ic => {
                if (!ic.isAlive || ic.playerId !== endPid) return ic;
                if (Math.random() < 0.25) {
                  const stunDebuff: Debuff = { type: 'stun', magnitude: 1, turnsRemaining: 1 };
                  pushLog(prev as any, `☠ Dread: ${ic.name} is STUNNED next turn!`, endPid);
                  return { ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'stun'), stunDebuff] };
                }
                return ic;
              }),
            }));
          } else if (curse.definitionId === 'curse_chains') {
            playersAfter = playersAfter.map(p => ({
              ...p,
              icons: p.icons.map(ic => {
                if (ic.playerId !== endPid || !ic.isAlive) return ic;
                const newHp = Math.max(0, ic.stats.hp - 8);
                return { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 };
              }),
            }));
            pushLog(prev as any, `☠ Chains of Znyxorga: all characters take 8 damage!`, endPid);
          }
          // curse_burden: no end-of-turn penalty — pure deck pollution
          // curse_void_echo: handled below at NEXT player's turn-start (after hand draw)
        }

        // Discard ending player's remaining hand (strip injected cavalry charge — not a deck card)
        const handToDiscard = endHand.cards.filter(c => c.definitionId !== 'huang_cavalry_charge');
        hands[endPid] = { ...endHand, cards: [] };
        decks[endPid] = { ...endDeck, discardPile: [...endDeck.discardPile, ...handToDiscard] };

        // Da Vinci Tinkerer passive: always draw +1; +1 extra if Combat Drone is alive
        const daVinciNextPlayer = playersAfter[nextPlayer]?.icons.find(
          ic => ic.isAlive && ic.name.includes("Da Vinci")
        );
        const droneAlive = (playersAfter[nextPlayer]?.icons ?? []).some(
          ic => ic.isAlive && ic.name === "Combat Drone"
        );
        // Warlord's Grimoire (grimoire_early_surge): +2 draw and +2 mana on turns 2 and 3 only
        const hasGrimoire = playersAfter[nextPlayer]?.icons.some(
          ic => ic.isAlive && (ic.itemPassiveTags?.includes('grimoire_early_surge') || ic.itemPassiveTags?.includes('draw_plus_3'))
        );
        const grimoireActive = hasGrimoire && newCurrentTurn >= 2 && newCurrentTurn <= 4;
        const grimoireBonus = grimoireActive ? 2 : 0;
        if (grimoireActive) {
          mana[nextPlayer] = Math.min(maxMana[nextPlayer] + 2, mana[nextPlayer] + 2);
          maxMana[nextPlayer] = Math.max(maxMana[nextPlayer], mana[nextPlayer]);
        }
        // Codex Atlanticus: +1 extra base draw (1→2 base; 2→3 with drone)
        const codexBonus = daVinciNextPlayer?.itemPassiveTags?.includes('sig_davinci_codex') ? 1 : 0;
        const daVinciDraw = daVinciNextPlayer ? (1 + codexBonus + (droneAlive ? 1 : 0)) : 0;
        // Echo Stone: +1 draw per alive holder on the next player's team
        const echoStoneCount = (playersAfter[nextPlayer]?.icons ?? []).filter(
          ic => ic.isAlive && ic.itemPassiveTags?.includes('echo_stone_draw')
        ).length;
        const extraDraw = daVinciDraw + grimoireBonus + echoStoneCount;

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
        const oldHandToDiscard = startHand.cards.filter(c => c.definitionId !== 'huang_cavalry_charge');
        const deckWithOld = { ...startDeck, discardPile: [...startDeck.discardPile, ...oldHandToDiscard] };
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
        // Tutorial hand script: override player 0's hand if a script entry exists for this turn
        const tutScript = (prev as any).tutorialHandScript as string[][] | undefined;
        const prevTurnIdx = (prev as any).tutorialPlayerTurnIdx as number ?? 0;
        const nextTurnIdx = prevTurnIdx + 1;
        if (nextPlayer === 0 && tutScript?.[nextTurnIdx]) {
          const scriptedCards = tutScript[nextTurnIdx].map((defId: string) => {
            const def = CARD_DEFS.find((d: any) => d.definitionId === defId);
            return def ? instantiateCard(def as any) : null;
          }).filter(Boolean) as import('@/types/game').Card[];
          finalDrawn = scriptedCards;
          finalDraw = [];
          finalDiscard = [];
        }
        hands[nextPlayer] = { ...startHand, cards: finalDrawn };
        decks[nextPlayer] = { drawPile: finalDraw, discardPile: finalDiscard };

        // Battle Drill (free_basic_each_turn): inject a free Basic Attack into hand at turn start
        const hasBattleDrill = playersAfter[nextPlayer]?.icons.some(ic => ic.isAlive && ic.itemPassiveTags?.includes('free_basic_each_turn'));
        if (hasBattleDrill) {
          const baDef = CARD_DEFS.find((d: any) => d.definitionId === 'shared_basic_attack');
          if (baDef) {
            const freeBA = { ...instantiateCard(baDef as any), manaCost: 0 };
            hands[nextPlayer] = { ...hands[nextPlayer], cards: [...hands[nextPlayer].cards, freeBA] };
          }
        }

        // Void Echo curse: −2 mana for each copy in the newly drawn hand
        const voidEchoCount = hands[nextPlayer].cards.filter(c => c.definitionId === 'curse_void_echo').length;
        if (voidEchoCount > 0) {
          const voidEchoLoss = voidEchoCount * 2;
          mana[nextPlayer] = Math.max(0, mana[nextPlayer] - voidEchoLoss);
          maxMana[nextPlayer] = Math.max(0, maxMana[nextPlayer] - voidEchoLoss);
          pushLog(prev as any, `☠ Void Echo: −${voidEchoLoss} mana this turn!`, nextPlayer);
        }
      }

      // Base intents — shown as intent badges on the base hex during player's turn
      const baseIntents: AIIntent[] = [];
      if (extPrev.encounterObjective === 'destroy_base' && nextPlayer === 0) {
        baseIntents.push({
          iconId: 'base', type: 'attack', abilityName: 'Base Turret',
          label: '50', damage: 50, range: 3,
        });
        const turnsUntilBombardment = ((3 - (newCurrentTurn % 3)) % 3) || 3;
        baseIntents.push({
          iconId: 'base', type: 'upcoming_ability', abilityName: 'Siege Bombardment',
          label: '', damage: 40, range: 999, turnsUntilReady: turnsUntilBombardment,
        });
      }

      // Advance tutorialPlayerTurnIdx when player 0 draws a new hand
      const newTutTurnIdx = (nextPlayer === 0 && (prev as any).tutorialHandScript)
        ? ((prev as any).tutorialPlayerTurnIdx as number ?? 0) + 1
        : ((prev as any).tutorialPlayerTurnIdx as number ?? 0);

      // ── Kit moment: per-turn and round-boundary checks ─────────────────────
      const kitMomentEvents: string[] = [...((prev as any).kitMomentEvents ?? [])];

      if (nextPlayer === 1) {
        // Player 0 just finished their turn — check Musashi dual kill
        const musashiKills = (prev as any).musashiTurnKills ?? 0;
        if (musashiKills >= 2) kitMomentEvents.push('musashi_dual_kill');
      }

      if (nextPlayer === 0) {
        // Start of player 0's turn — check Shaka formation
        const p0Icons = playersAfter.find(p => p.id === 0)?.icons.filter(ic => ic.isAlive) ?? [];
        const shakaIcon = p0Icons.find(ic => ic.name.includes('Shaka'));
        if (shakaIcon && p0Icons.length >= 3) {
          const allAdjacent = p0Icons.every(ic => ic.id === shakaIcon.id || hexDistance(ic.position, shakaIcon.position) <= 1);
          if (allAdjacent) kitMomentEvents.push('shaka_full_formation');
        }
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
        gravitySurgeSaved,
        adrenalineSaved,
        floodActive: floodIsActive,
        laserGridStruckIds,
        forestFireActive: forestFireIsActive,
        burningForestTiles,
        pendingLaserTiles,
        pendingFloodCountdown,
        pendingFireCountdown,
        pendingFireStartTile,
        activeZones: updatedActiveZones,
        baseIntents,
        overchargePlayerId: undefined,  // clear overcharge flag on turn end
        ...(hands && { hands }),
        ...(decks && { decks }),
        tutorialPlayerTurnIdx: newTutTurnIdx,
        kitMomentEvents,
        musashiTurnKills: nextPlayer === 1 ? 0 : (prev as any).musashiTurnKills ?? 0,
        // Defeat attribution for bleed ticks (most recent player death from bleed wins)
        lastPlayerCasualty: bleedKilledPlayer
          ? { victimName: bleedKilledPlayer.victimName, killerName: 'Bleed', sourceName: 'Status Effect', damage: bleedKilledPlayer.bleedDmg }
          : (prev as any).lastPlayerCasualty,
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
    let state = { ...prev } as ExtState;
    const executor = state.players.flatMap(p => p.icons).find(i => i.id === executorId);
    if (!executor || !executor.isAlive) return prev;
    if ((executor as any).isDecoy) {
      toast.error('Decoys cannot play cards!');
      return prev;
    }
    if ((executor as any).terracottaControlled) return prev; // controlled enemies act via AI
    if (executor.playerId !== state.activePlayerId) return prev;
    if (state.gameMode === "singleplayer" && executor.playerId === 1) return prev;
    if (executor.justRespawned) {
      toast.error(getT().messages.justRespawned);
      return prev;
    }
    if (executor.debuffs?.some(d => d.type === 'stun')) {
      toast.error(`${executor.name} is STUNNED and cannot act!`);
      return prev;
    }
    if (executor.debuffs?.some(d => d.type === 'silence') && card.exclusiveTo !== null && !executor.name.includes("Nelson")) {
      toast.error(`${executor.name} is SILENCED and cannot use abilities!`);
      return prev;
    }
    const cardLimit = executor.itemPassiveTags?.includes('cards_per_turn_unlimited')
      ? Infinity
      : 3 + (prev.permanentCardBonus ?? 0) + (executor.itemPassiveTags?.filter(t => t === 'cards_per_turn_plus_1').length ?? 0);
    if ((executor.cardsUsedThisTurn ?? 0) >= cardLimit) {
      toast.error(getT().messages.cardLimitReached);
      return prev;
    }
    if (card.exclusiveTo && !executor.name.includes(card.exclusiveTo)) {
      toast.error(getT().messages.wrongCharacter.replace('{name}', card.exclusiveTo ?? ''));
      return prev;
    }
    // Magnifying Transmitter: Tesla at max Voltage plays next ability for free (consumes all Voltage)
    if (executor.name.includes("Tesla") && executor.itemPassiveTags?.includes('sig_tesla_transmitter') && card.exclusiveTo === 'Tesla') {
      const voltCap = 8;
      if ((executor.passiveStacks ?? 0) >= voltCap) {
        // Pre-add the card cost so handlers' deductions net to 0 mana change
        const pid = executor.playerId as 0 | 1;
        const nm = [...state.globalMana] as [number, number];
        nm[pid] = (nm[pid] ?? 0) + (card.manaCost ?? 0);
        state = { ...state, globalMana: nm,
          players: state.players.map(p => ({
            ...p, icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, passiveStacks: 0 }),
          })),
        } as typeof state;
        pushLog(state as any, `${executor.name} Magnifying Transmitter — max Voltage! Ability costs 0 Mana. Voltage reset.`, executor.playerId);
      }
    }
    // Overcharge bypass: if overcharge flag is set for this player, skip mana check (the card itself shouldn't be overcharge)
    const overchargeBypass = (state as any).overchargePlayerId === executor.playerId && !card.effect.overcharge;
    if (!overchargeBypass && (state.globalMana[executor.playerId] ?? 0) < card.manaCost) {
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

    // Rooted units cannot use movement / teleport abilities
    const isMovementCard = !!(card.effect.teleport || card.effect.jump || card.effect.selfTeleportAnywhere);
    if (isMovementCard && executor.debuffs?.some(d => d.type === 'rooted')) {
      toast.error(`${executor.name} is ROOTED and cannot use movement abilities!`);
      return prev;
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

    // Decoy card → enter hex-targeting mode so player picks a tile to place the decoy
    if (card.effect.placeDecoy) {
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "place_decoy", iconId: executorId, range: card.effect.range ?? 3 },
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
    const sunsinOnWater = executor.name.includes("Sun-sin") && (executorTileType === 'river' || executorTileType === 'lake');
    const sunsinOnRiver = sunsinOnWater; // alias — water means turtle-ship form (lake or river)

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
            isAlive: Math.round(Math.max(0, ic.stats.hp - dmg)) > 0,
            respawnTurns: Math.round(Math.max(0, ic.stats.hp - dmg)) > 0 ? ic.respawnTurns : 4,
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
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1 }),
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
        icons: p.icons.map(ic => ic.id !== executorId ? ic : {
          ...ic,
          cardUsedThisTurn: true,
          cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1,
        }),
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

    // Jump — enter targeting mode: player picks a destination tile to jump to
    if (card.effect.jump) {
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "jump", iconId: executorId, range: card.effect.range ?? 2 },
      };
    }

    // Nelson: Crossing the T — directional line shot with scaling damage
    if (card.effect.lineScaling) {
      const crossingRange = (card.effect.range ?? 5) + (executor.itemPassiveTags?.includes('nelson_crossing_extend') ? 1 : 0);
      return { ...state, cardTargetingMode: { card, executorId }, targetingMode: { abilityId: "line_scaling", iconId: executorId, range: crossingRange } };
    }
    // Hannibal: Alpine March — directed charge move with line preview
    if (card.effect.chargeMove) {
      return { ...state, cardTargetingMode: { card, executorId }, targetingMode: { abilityId: "charge_move", iconId: executorId, range: card.effect.chargeDist ?? 6 } };
    }
    // Nelson: Kiss Me Hardy — charge in line pushing enemies sideways
    if (card.effect.chargeLinePushSide) {
      return { ...state, cardTargetingMode: { card, executorId }, targetingMode: { abilityId: "charge_line_push", iconId: executorId, range: card.effect.chargeDist ?? 4 } };
    }
    // Hannibal: War Elephant — summon on adjacent hex
    if (card.effect.summonWarElephant) {
      return { ...state, cardTargetingMode: { card, executorId }, targetingMode: { abilityId: "summon_war_elephant", iconId: executorId, range: card.effect.range ?? 1 } };
    }
    // Hannibal: Double Envelopment — target enemy, hit + AoE adjacent
    if (card.effect.chargeAndPull) {
      return { ...state, cardTargetingMode: { card, executorId }, targetingMode: { abilityId: "charge_and_pull", iconId: executorId, range: card.effect.range ?? 3 } };
    }
    // Picasso: Cubist Mirror — swap with ally or enemy
    if (card.effect.swapEnemyAlly) {
      return { ...state, cardTargetingMode: { card, executorId }, targetingMode: { abilityId: "swap_target", iconId: executorId, range: card.effect.range ?? 4 } };
    }
    // Mansa: Salt Road — place mana zone
    if (card.effect.manaZone) {
      return { ...state, cardTargetingMode: { card, executorId }, targetingMode: { abilityId: "mana_zone", iconId: executorId, range: card.effect.range ?? 3 } };
    }
    // Tesla: Coil Surge — place Tesla Coil zone. Gate voltage cost BEFORE entering targeting so we don't consume on abort.
    if (card.effect.coilZone) {
      const voltageCost = card.effect.voltageCost ?? 1;
      const voltageStacks = executor.passiveStacks ?? 0;
      if (voltageCost > 0 && voltageStacks < voltageCost) {
        toast.error(`Needs ≥${voltageCost} Voltage (have ${voltageStacks})`);
        return prev;
      }
      return { ...state, cardTargetingMode: { card, executorId }, targetingMode: { abilityId: "coil_zone", iconId: executorId, range: card.effect.range ?? 3 } };
    }
    // Teddy: Rough Riders' Rally — apply team buffs immediately, then enter teleport targeting
    if (card.effect.selfTeleportAnywhere) {
      let updated = { ...state } as ExtState;
      const allyMightBonus = card.effect.teamDmgFlat ?? 25;
      const allyMoveBonus = card.effect.moveBonus ?? 2;
      const selfExtra = card.effect.selfMightBonus ?? 45;
      const buffTurns = card.effect.turns ?? 2;
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive || ic.playerId !== executor.playerId) return ic;
          const extraMight = ic.id === executorId ? selfExtra : 0;
          return {
            ...ic,
            cardBuffAtk: (ic.cardBuffAtk ?? 0) + allyMightBonus + extraMight,
            cardBuffTurns: Math.max(ic.cardBuffTurns ?? 0, buffTurns),
            stats: { ...ic.stats, movement: ic.stats.movement + allyMoveBonus },
          };
        }),
      }));
      pushLog(updated, `${executor.name} Rough Riders' Rally — allies +${allyMightBonus} Might, +${allyMoveBonus} Move! Teddy +${selfExtra} Might & teleports!`, executor.playerId);
      // Rough Rider's Badge: Rally also removes all ally debuffs
      if (executor.itemPassiveTags?.includes('teddy_rally_cleanse')) {
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => (!ic.isAlive || ic.playerId !== executor.playerId) ? ic : { ...ic, debuffs: [] }),
        }));
        pushLog(updated, `${executor.name} Rough Rider's Badge: all ally debuffs CLEANSED!`, executor.playerId);
      }
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - card.manaCost);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated, targetingMode: { abilityId: "rough_riders_teleport", iconId: executorId, range: card.effect.selfTeleportAnywhere } };
    }
    // Teddy: Speak Softly — taunt all enemies in range + give Teddy DEF bonus (immediate)
    if (card.effect.globalTauntRange !== undefined) {
      let updated = { ...state } as ExtState;
      const tauntRange = card.effect.globalTauntRange;
      const defBonus = card.effect.defBonus ?? 30;
      const enemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= tauntRange
      );
      if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      const tauntDebuff: Debuff = { type: 'taunted', magnitude: 0, turnsRemaining: 2, sourceIconId: executorId };
      for (const enemy of enemies) {
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'taunted'), tauntDebuff],
          }),
        }));
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardBuffDef: (ic.cardBuffDef ?? 0) + defBonus }),
      }));
      pushLog(updated, `${executor.name} Speak Softly — ${enemies.length} enem${enemies.length !== 1 ? 'ies' : 'y'} TAUNTED! +${defBonus} DEF to Teddy.`, executor.playerId);
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - card.manaCost);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1 }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }
    // Picasso: Blue Period — scramble all units, heal allies, +DEF (immediate)
    if (card.effect.scrambleAll) {
      let updated = { ...state } as ExtState;
      const allPassableTiles = updated.board.filter(t => t.terrain.effects.movementModifier !== -999 && t.terrain.type !== 'spawn');
      const allAliveIcons = updated.players.flatMap(p => p.icons).filter(ic => ic.isAlive);
      const shuffled = [...allPassableTiles].sort(() => Math.random() - 0.5);
      const assigned: { q: number; r: number }[] = [];
      for (let i = 0; i < allAliveIcons.length; i++) {
        const candidate = shuffled.find(t => !assigned.some(a => a.q === t.coordinates.q && a.r === t.coordinates.r));
        assigned.push(candidate ? candidate.coordinates : allAliveIcons[i].position);
      }
      allAliveIcons.forEach((ic, i) => {
        const pos = assigned[i];
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ii => ii.id !== ic.id ? ii : { ...ii, position: pos }),
        }));
      });
      const healAmt = card.effect.healing ?? 60;
      const defBonusBlue = card.effect.scrambleAllyDefBonus ?? 20;
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive || ic.playerId !== executor.playerId) return ic;
          return { ...ic, stats: { ...ic.stats, hp: Math.min(ic.stats.maxHp, ic.stats.hp + healAmt) }, cardBuffDef: (ic.cardBuffDef ?? 0) + defBonusBlue };
        }),
      }));
      pushLog(updated, `${executor.name} Blue Period — ALL units scrambled! Allies +${healAmt} HP, +${defBonusBlue} DEF.`, executor.playerId);
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - card.manaCost);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }
    // Mansa: Hajj of Gold / Mansa's Bounty — heal all allies + buff (immediate)
    if (card.effect.hajjOfGold) {
      let updated = { ...state } as ExtState;
      // Infinite Vault (sig_mansa_vault): +20% heal pct on Hajj of Gold
      const vaultBonus = executor.itemPassiveTags?.includes('sig_mansa_vault') ? 0.2 : 0;
      const healPct = (card.effect.hajjHealPct ?? 0.2) + vaultBonus;
      const powerBonusHajj = card.effect.teamPowerFlat ?? 0;
      const mightBonusHajj = card.effect.teamDmgFlat ?? 0;
      const hajjBuffTurns = card.effect.turns ?? 2;
      const hasAnyBuff = powerBonusHajj > 0 || mightBonusHajj > 0;
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive || ic.playerId !== executor.playerId) return ic;
          const healAmt = Math.round(ic.stats.maxHp * healPct);
          return {
            ...ic,
            stats: { ...ic.stats, hp: Math.min(ic.stats.maxHp, ic.stats.hp + healAmt) },
            cardBuffPow: (ic.cardBuffPow ?? 0) + powerBonusHajj,
            cardBuffAtk: (ic.cardBuffAtk ?? 0) + mightBonusHajj,
            cardBuffTurns: hasAnyBuff ? Math.max(ic.cardBuffTurns ?? 0, hajjBuffTurns) : (ic.cardBuffTurns ?? 0),
          };
        }),
      }));
      const buffDesc = powerBonusHajj > 0 ? ` +${powerBonusHajj} Power` : mightBonusHajj > 0 ? ` +${mightBonusHajj} Might` : '';
      pushLog(updated, `${executor.name} ${card.name} — allies healed ${Math.round(healPct * 100)}% HP${buffDesc}.`, executor.playerId);
      // Mansa Treasury: ability cards cost 1 less mana; 2 less at level 6+ (or with Mali Coffers)
      const mansaDiscount = executor.name.includes("Mansa") && card.definitionId?.startsWith("mansa_")
        ? (executor.itemPassiveTags?.includes('mansa_discount_2') || (executor.level ?? 1) >= 6 ? 2 : 1)
        : 0;
      const effectiveCostHajj = Math.max(1, card.manaCost - mansaDiscount);
      if (effectiveCostHajj > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - effectiveCostHajj);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }

    // Mansa: Mansa's Bounty — Golden Stasis (freeze ALL units for 1 turn; upgrade freezes enemies 2 turns)
    if (card.effect.mansaBounty) {
      let updated = { ...state } as ExtState;
      const isUpgrade = card.effect.mansaBountyExtra === true;
      // Golden Stasis: freeze all units for 1 turn (upgraded: enemies frozen 2 turns)
      const allyFreeze: Debuff = { type: 'stun', magnitude: 0, turnsRemaining: 1 };
      const enemyFreeze: Debuff = { type: 'stun', magnitude: 0, turnsRemaining: isUpgrade ? 2 : 1 };
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive) return ic;
          const freeze = ic.playerId === executor.playerId ? allyFreeze : enemyFreeze;
          return { ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'stun'), freeze] };
        }),
      }));
      const desc = isUpgrade
        ? `${executor.name} Mansa's Bounty+ — Golden Stasis! All units frozen (enemies 2 turns).`
        : `${executor.name} Mansa's Bounty — Golden Stasis! All units frozen for 1 turn.`;
      pushLog(updated, desc, executor.playerId);
      // Mansa Treasury: ability cards cost 1 less mana (2 less with Mali Coffers)
      const mansaDiscountBounty = executor.name.includes("Mansa") && card.definitionId?.startsWith("mansa_")
        ? (executor.itemPassiveTags?.includes('mansa_discount_2') ? 2 : 1)
        : 0;
      const effectiveCostBounty = Math.max(1, card.manaCost - mansaDiscountBounty);
      if (effectiveCostBounty > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - effectiveCostBounty);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }

    // Vel'thar: Humanity's Last Light — AoE Power×1.5 to all enemies in range 2 + self-heal
    if (card.effect.humanitysLastLight) {
      let updated = { ...state } as ExtState;
      const hasAshfallMantle = executor.itemPassiveTags?.includes('velthar_ashfall_mantle');
      const range = (card.effect.range ?? 2) + (hasAshfallMantle ? 1 : 0);
      const selfHealAmt = (card.effect.selfHeal ?? 30) + (hasAshfallMantle ? 15 : 0);
      const enemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range
      );
      if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      for (const enemy of enemies) {
        const atkStats = calcEffectiveStats(updated, executor);
        const defStats = calcEffectiveStats(updated, enemy);
        const dmg = Math.max(0.1, atkStats.power * (card.effect.powerMult ?? 1.5) - defStats.defense);
        const wasAlive = enemy.isAlive;
        const newHp = Math.round(Math.max(0, enemy.stats.hp - dmg));
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
          }),
        }));
        updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0, enemy.id);
        pushLog(updated, `${executor.name} Humanity's Last Light hit ${enemy.name} for ${dmg.toFixed(0)} dmg`, executor.playerId);
      }
      if (selfHealAmt > 0) {
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== executorId ? ic : {
            ...ic, stats: { ...ic.stats, hp: Math.min(ic.stats.maxHp, ic.stats.hp + selfHealAmt) },
          }),
        }));
        pushLog(updated, `${executor.name} Humanity's Last Light — self-healed ${selfHealAmt} HP!`, executor.playerId);
      }
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - card.manaCost);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }

    // Vel'thar: Last Ember — conditional: if passiveStacks >= 1, self-buff; else AoE damage
    if (card.effect.lastRites) {
      let updated = { ...state } as ExtState;
      const stacks = executor.passiveStacks ?? 0;
      if (stacks >= 1) {
        const healAmt = card.effect.selfHealIfLost ?? 25;
        const defBonus = card.effect.selfDefenseIfLost ?? 15;
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== executorId ? ic : {
            ...ic,
            stats: { ...ic.stats, hp: Math.min(ic.stats.maxHp, ic.stats.hp + healAmt) },
            cardBuffDef: (ic.cardBuffDef ?? 0) + defBonus,
          }),
        }));
        pushLog(updated, `${executor.name} Last Ember — self-healed ${healAmt} HP, +${defBonus} DEF (${stacks} Bottleneck stacks)!`, executor.playerId);
      } else {
        const range = card.effect.range ?? 2;
        const enemies = updated.players.flatMap(p => p.icons).filter(
          ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range
        );
        if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
        for (const enemy of enemies) {
          const atkStats = calcEffectiveStats(updated, executor);
          const defStats = calcEffectiveStats(updated, enemy);
          const dmg = Math.max(0.1, atkStats.power * (card.effect.powerMult ?? 1.0) - defStats.defense);
          const wasAlive = enemy.isAlive;
          const newHp = Math.round(Math.max(0, enemy.stats.hp - dmg));
          updated.players = updated.players.map(p => ({
            ...p,
            icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
              ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
            }),
          }));
          updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0, enemy.id);
          pushLog(updated, `${executor.name} Last Ember hit ${enemy.name} for ${dmg.toFixed(0)} dmg (no Bottleneck stacks)`, executor.playerId);
        }
        // Ashfall Mantle: Last Ember AoE mode also heals Vel'thar 20 HP
        if (executor.itemPassiveTags?.includes('velthar_ashfall_mantle')) {
          const freshExec = updated.players.flatMap(p => p.icons).find(ic => ic.id === executorId);
          if (freshExec) {
            const ashHp = Math.min(freshExec.stats.maxHp, freshExec.stats.hp + 20);
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, stats: { ...ic.stats, hp: ashHp } }),
            }));
            pushLog(updated, `${executor.name} Ashfall Mantle — ember warmth heals 20 HP!`, executor.playerId);
          }
        }
      }
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - card.manaCost);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }

    // Cleopatra: Eternal Kingdom — Stun + Poison all enemies in range 2; self untouchable
    if (card.effect.eternalKingdom) {
      let updated = { ...state } as ExtState;
      const range = card.effect.range ?? 2;
      const stunDuration = card.effect.debuffDuration ?? 1;
      const untouchTurns = card.effect.untouchable ?? 1;
      const enemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range
      );
      if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      if (enemies.length >= 3 && executor.playerId === 0) {
        (updated as any).kitMomentEvents = [...((updated as any).kitMomentEvents ?? []), 'cleo_stun_3'];
      }
      const stunDebuff: Debuff = { type: 'stun', magnitude: 0, turnsRemaining: stunDuration };
      const poisonDebuff: Debuff = { type: 'poison', magnitude: 8, turnsRemaining: 3 };
      for (const enemy of enemies) {
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic,
            debuffs: [
              ...(ic.debuffs ?? []).filter(d => d.type !== 'stun' && (card.effect.massPoison ? d.type !== 'poison' : true)),
              stunDebuff,
              ...(card.effect.massPoison ? [poisonDebuff] : []),
            ],
          }),
        }));
      }
      pushLog(updated, `${executor.name} Eternal Kingdom — ${enemies.length} enem${enemies.length !== 1 ? 'ies' : 'y'} STUNNED & POISONED!`, executor.playerId);
      if (untouchTurns > 0) {
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== executorId ? ic : {
            ...ic, untouchableTurns: (ic.untouchableTurns ?? 0) + untouchTurns,
          }),
        }));
        pushLog(updated, `${executor.name} is UNTOUCHABLE for ${untouchTurns} turn(s)!`, executor.playerId);
      }
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - card.manaCost);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }

    // Shaka: Impondo Zankomo — AoE damage to adjacent enemies + ally DEF buff + self DEF buff
    if (card.effect.impondo) {
      let updated = { ...state } as ExtState;
      const isigodloBonus = executor.itemPassiveTags?.includes('sig_shaka_isigodlo') ? 20 : 0;
      const allyDefBuff = (card.effect.allyDefBonus ?? 35) + isigodloBonus;
      const selfDefBuff = (card.effect.selfDefBonus ?? 50) + isigodloBonus;
      const adjacentEnemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= 1
      );
      for (const enemy of adjacentEnemies) {
        const atkStats = calcEffectiveStats(updated, executor);
        const defStats = calcEffectiveStats(updated, enemy);
        const dmg = Math.max(0.1, atkStats.power * (card.effect.powerMult ?? 0.5) - defStats.defense);
        const wasAlive = enemy.isAlive;
        const newHp = Math.round(Math.max(0, enemy.stats.hp - dmg));
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
          }),
        }));
        updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0, enemy.id);
        if (newHp <= 0 && executor.playerId === 0) {
          const enemyTile = updated.board.find(t => t.coordinates.q === enemy.position.q && t.coordinates.r === enemy.position.r);
          if (enemyTile?.terrain.type === 'lake') {
            (updated as any).kitMomentEvents = [...((updated as any).kitMomentEvents ?? []), 'shaka_water_kill'];
          }
        }
        pushLog(updated, `${executor.name} Impondo Zankomo — ${enemy.name} hit for ${dmg.toFixed(0)} dmg!`, executor.playerId);
      }
      if (adjacentEnemies.length >= 3 && executor.playerId === 0) {
        (updated as any).kitMomentEvents = [...((updated as any).kitMomentEvents ?? []), 'shaka_impondo_3'];
      }
      if (adjacentEnemies.length === 0) pushLog(updated, `${executor.name} Impondo Zankomo — war cry! No adjacent enemies.`, executor.playerId);
      // Buff adjacent allies and self — persist for `defTurns` of owner's turns (default 2)
      const impondoTurns = card.effect.defTurns ?? 2;
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive || ic.playerId !== executor.playerId || ic.id === executorId) return ic;
          if (hexDistance(executor.position, ic.position) > 1) return ic;
          return {
            ...ic,
            cardBuffDef: (ic.cardBuffDef ?? 0) + allyDefBuff,
            cardBuffTurns: Math.max(ic.cardBuffTurns ?? 0, impondoTurns),
          };
        }),
      }));
      // Self DEF buff
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : {
          ...ic,
          cardBuffDef: (ic.cardBuffDef ?? 0) + selfDefBuff,
          cardBuffTurns: Math.max(ic.cardBuffTurns ?? 0, impondoTurns),
        }),
      }));
      pushLog(updated, `${executor.name} Impondo Zankomo — adj. allies +${allyDefBuff} DEF, self +${selfDefBuff} DEF!`, executor.playerId);
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - card.manaCost);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }

    // Musashi: Book of Five Rings — apply Duel to all enemies + deal Power damage to each
    if (card.effect.bookOfFiveRings) {
      let updated = { ...state } as ExtState;
      const duelBoostPct = (card.effect.duelBonusBoost ?? 65) / 100;
      const duelDebuff: Debuff = { type: 'taunted', magnitude: 35, turnsRemaining: 3 };
      const allEnemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId
      );
      if (allEnemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      for (const enemy of allEnemies) {
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic, debuffs: [...(ic.debuffs ?? []).filter(d => d.type !== 'taunted'), duelDebuff],
          }),
        }));
        const freshExec = updated.players.flatMap(p => p.icons).find(ic => ic.id === executorId) ?? executor;
        const atkStats = calcEffectiveStats(updated, freshExec);
        const defStats = calcEffectiveStats(updated, enemy);
        const baseDmg = Math.max(0.1, atkStats.power * (card.effect.powerMult ?? 1.0) - defStats.defense);
        const dmg = Math.round(baseDmg * (1 + duelBoostPct));
        const wasAlive = enemy.isAlive;
        const newHp = Math.round(Math.max(0, enemy.stats.hp - dmg));
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== enemy.id ? ic : {
            ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
          }),
        }));
        updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0, enemy.id);
        pushLog(updated, `${executor.name} Book of Five Rings — ${enemy.name} DUELED for ${dmg.toFixed(0)} dmg!`, executor.playerId);
      }
      if (card.manaCost > 0) {
        const pid = executor.playerId as 0 | 1;
        const nm = [...updated.globalMana] as [number, number];
        nm[pid] = Math.max(0, nm[pid] - card.manaCost);
        updated.globalMana = nm;
      }
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true, cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1, abilityUsedThisTurn: true }),
      }));
      updated = consumeCardFromHand(updated, card, executor.playerId);
      return { ...updated };
    }

    // Damage / healing / single-target powerMult / retribution → enter targeting mode
    const needsTarget =
      card.effect.damage !== undefined ||
      card.effect.retributionMult !== undefined ||
      ((card.effect.healing !== undefined || card.effect.healingMult !== undefined) && !card.effect.selfCast) ||
      (card.effect.powerMult !== undefined && !card.effect.allEnemiesInRange && !card.effect.lineTarget && !card.effect.randomTargets && !card.effect.coneTarget) ||
      (card.effect.debuffType !== undefined && !card.effect.allEnemiesInRange) ||
      card.effect.royalDecree === true;

    if (needsTarget) {
      const isBasicAttack = card.definitionId === "shared_basic_attack";
      const executorBlinded = executor.debuffs?.some(d => d.type === 'blinded') ?? false;
      const attackRange = executorBlinded ? 1
        : (sunsinOnRiver) ? 3
        : (executor.stats.attackRange ?? 1);
      // Carry a Bigger Stick: Big Stick range increased from 1 to 2
      const bigStickRangeBonus = !executorBlinded && !isBasicAttack && card.definitionId === 'teddy_big_stick' && executor.itemPassiveTags?.includes('teddy_big_stick_range2') ? 1 : 0;
      const cardRange = executorBlinded ? 1 : (isBasicAttack ? attackRange : (card.effect.range ?? 3) + bigStickRangeBonus);

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
          movedThisTurn: false, // allow movement after playing Quick Move even if already moved
          stats: { ...ic.stats, movement: ic.stats.movement + card.effect.moveBonus! },
        }),
      }));
      pushLog(updated, `${executor.name} played ${card.name} (+${card.effect.moveBonus} MOV)`, executor.playerId);
    } else if (card.effect.fortify) {
      // Fortify: can only be used before moving (requires full movement points); locks movement
      if (executor.stats.movement < executor.stats.moveRange) {
        toast.error(getT().messages.fortifyRequiresFullMovement ?? "Fortify requires full movement — use before moving!");
        return prev;
      }
      const fortifyTurns = card.effect.fortifyDuration ?? 1;
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : {
          ...ic,
          cardBuffAtk: (ic.cardBuffAtk ?? 0) + (card.effect.atkBonus ?? 0),
          cardBuffDef: (ic.cardBuffDef ?? 0) + (card.effect.defBonus ?? 0),
          cardBuffTurns: fortifyTurns > 1 ? Math.max(ic.cardBuffTurns ?? 0, fortifyTurns) : (ic.cardBuffTurns ?? 0),
          stats: { ...ic.stats, movement: 0 }, // lock movement for this turn
        }),
      }));
      pushLog(updated, `${executor.name} fortifies! +${card.effect.defBonus} DEF, +${card.effect.atkBonus} ATK — cannot move this turn.`, executor.playerId);
    } else if (card.effect.atkBonus || card.effect.defBonus) {
      const genericBuffTurns = card.effect.turns ?? 1;
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : {
          ...ic,
          cardBuffAtk: (ic.cardBuffAtk ?? 0) + (card.effect.atkBonus ?? 0),
          cardBuffDef: (ic.cardBuffDef ?? 0) + (card.effect.defBonus ?? 0),
          cardBuffTurns: genericBuffTurns > 1 ? Math.max(ic.cardBuffTurns ?? 0, genericBuffTurns) : (ic.cardBuffTurns ?? 0),
        }),
      }));
      pushLog(updated, `${executor.name} played ${card.name}`, executor.playerId);
    } else if (card.effect.teamDefBuff) {
      const wallPlus = executor.itemPassiveTags?.includes('leonidas_wall_plus');
      const buffVal = card.effect.teamDefBuff + (wallPlus ? 10 : 0);
      const effectiveRange = (card.effect.range ?? 2) + (wallPlus ? 1 : 0);
      updated.players = updated.players.map((p, pid) => {
        if (pid !== executor.playerId) return p;
        return {
          ...p,
          icons: p.icons.map(ic => {
            if (!ic.isAlive) return ic;
            if (ic.id !== executorId && hexDistance(executor.position, ic.position) > effectiveRange) return ic;
            return { ...ic, cardBuffDef: (ic.cardBuffDef ?? 0) + buffVal };
          }),
        };
      });
      pushLog(updated, `${executor.name} played ${card.name} — +${buffVal} DEF to allies within range ${effectiveRange}!`, executor.playerId);
    } else if (card.effect.teamDmgPct) {
      const pid = executor.playerId;
      const nm = [...updated.teamBuffs.mightBonus];
      const np = [...updated.teamBuffs.powerBonus];
      nm[pid] = Math.min((nm[pid] ?? 0) + card.effect.teamDmgPct, 60);
      np[pid] = Math.min((np[pid] ?? 0) + card.effect.teamDmgPct, 60);
      updated.teamBuffs = { ...updated.teamBuffs, mightBonus: nm, powerBonus: np };
      pushLog(updated, `${executor.name} played ${card.name} (+${card.effect.teamDmgPct}% team dmg)`, executor.playerId);
      // Emperor's Coat (napoleon_armee_mana): Grande Armée grants an additional +30% Might & Power
      if (executor.itemPassiveTags?.includes('napoleon_armee_mana') && card.definitionId?.includes('grande_armee')) {
        nm[pid] = Math.min(nm[pid] + 30, 60);
        np[pid] = Math.min(np[pid] + 30, 60);
        updated.teamBuffs = { ...updated.teamBuffs, mightBonus: nm, powerBonus: np };
        pushLog(updated, `Emperor's Coat: Grande Armée grants an additional +30% Might & Power!`, executor.playerId);
      }
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
      // Horde Tactics: damage = power × perEnemyMult × number of enemies in range (capped at 2.5× Power)
      const range = card.effect.range ?? 2;
      const perEnemyMult = card.effect.perEnemyMult ?? 0.5;
      const atkStats = calcEffectiveStats(updated, executor);
      const enemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range
      );
      if (enemies.length === 0) { toast.error(getT().messages.noEnemiesInRange); return prev; }
      const cappedMult = Math.min(perEnemyMult * enemies.length, 2.5);
      const totalDmgPerHit = Math.round(atkStats.power * cappedMult);
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
        updated = applyKillPassives(updated, executorId, enemy.isAlive, enemy.stats.hp - dmg <= 0, enemy.id);
      }
      // falls through to mana deduction + consumeCard below
    } else if (card.effect.coneTarget) {
      // Cone target: player clicks a direction, hits cone of enemies
      const cardRange = card.effect.range ?? 3;
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: card.definitionId, iconId: executorId, range: cardRange },
      };
    } else if (card.effect.deathRay) {
      // Tesla Death Ray: voltage gate BEFORE any mana/card consumption. If insufficient, abort with no cost.
      const voltageRequired = card.effect.voltageRequired ?? 1;
      const voltageStacks = executor.passiveStacks ?? 0;
      if (voltageStacks < voltageRequired) {
        toast.error(`Needs ≥${voltageRequired} Voltage (have ${voltageStacks})`);
        return prev;
      }
      const cardRange = card.effect.range ?? 6;
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: card.definitionId, iconId: executorId, range: cardRange },
      };
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
      const stunDuration = (card.effect.debuffDuration ?? 2)
        + (executor.itemPassiveTags?.includes('sig_beethoven_heiligenstadt') ? 1 : 0);
      const aoeDebuff: Debuff = {
        type: card.effect.debuffType,
        magnitude: card.effect.debuffMagnitude ?? 0,
        turnsRemaining: stunDuration,
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
            ...ic, passiveStacks: Math.min(15, (ic.passiveStacks ?? 0) + 1),
          }),
        }));
        const stacks = Math.min(15, (executor.passiveStacks ?? 0) + 1);
        pushLog(updated, `${executor.name} Crescendo: ${stacks}/15 (+${stacks * 2} Power)`, executor.playerId);
        // Resonant Crystal: Power×0.25 to all adjacent enemies after any Beethoven ability
        if (executor.itemPassiveTags?.includes('beethoven_resonance_aoe')) {
          const freshExec = updated.players.flatMap(p => p.icons).find(ic => ic.id === executorId) ?? executor;
          const atkStats = calcEffectiveStats(updated, freshExec);
          const adjacent = updated.players
            .flatMap(p => p.icons)
            .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= 1);
          for (const adj of adjacent) {
            const defStats = calcEffectiveStats(updated, adj);
            const dmg = Math.max(0, Math.round(atkStats.power * 0.25 - defStats.defense));
            if (dmg > 0) {
              const newHp = Math.max(0, adj.stats.hp - dmg);
              updated.players = updated.players.map(p => ({
                ...p,
                icons: p.icons.map(ic => ic.id !== adj.id ? ic : { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 4 }),
              }));
            }
          }
          if (adjacent.length > 0) pushLog(updated, `${executor.name} Resonant Crystal — resonance wave hits ${adjacent.length} adjacent enem${adjacent.length !== 1 ? 'ies' : 'y'}!`, executor.playerId);
        }
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
        updated = applyKillPassives(updated, executorId, wasAlive, newHp <= 0, target.id);
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
    else if (card.effect.selfHpCostPct !== undefined) {
      // Blood Price: sacrifice HP, buff all alive allies with flat Might + Power
      const hpCost = Math.floor(executor.stats.hp * card.effect.selfHpCostPct);
      const newExecutorHp = Math.max(1, executor.stats.hp - hpCost); // cannot kill self
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive) return ic;
          if (ic.id === executorId) return { ...ic, stats: { ...ic.stats, hp: newExecutorHp } };
          if (ic.playerId !== executor.playerId) return ic;
          return {
            ...ic,
            cardBuffAtk: (ic.cardBuffAtk ?? 0) + (card.effect.teamDmgFlat ?? 0),
            cardBuffPow: (ic.cardBuffPow ?? 0) + (card.effect.teamPowerFlat ?? 0),
          };
        }),
      }));
      pushLog(updated, `${executor.name} Blood Price — sacrificed ${hpCost} HP, team gains +${card.effect.teamDmgFlat} Might & +${card.effect.teamPowerFlat} Power!`, executor.playerId);
      // falls through to mana deduction + consumeCard below
    }
    else if (card.effect.overcharge) {
      // Overcharge: set a flag so the next card played this turn by this player costs 0 mana
      (updated as any).overchargePlayerId = executor.playerId;
      pushLog(updated, `${executor.name} Overcharge — next card this turn is FREE!`, executor.playerId);
      // falls through to mana deduction + consumeCard below
    }

    // Deduct mana from global pool — check for free-card passives first
    const isExclusiveAbility = card.exclusiveTo !== null && card.type !== "buff" && card.type !== "movement";
    const execRefreshed = updated.players.flatMap(p => p.icons).find(i => i.id === executorId);
    const cardIsFreeDueToNextFree = execRefreshed?.nextCardFree === true || (execRefreshed?.freeCardsLeft ?? 0) > 0;
    const cardIsFreeDueToFirstAbility = isExclusiveAbility && execRefreshed?.itemPassiveTags?.includes('first_ability_free') && !execRefreshed?.firstAbilityUsed;
    // Picasso Fractured Perspective: every 3rd card played THIS BATTLE is free (every 2nd with Rose Period Canvas / Cubist Lens)
    const cardsPlayedSoFar = execRefreshed?.cardsPlayedThisBattle ?? 0;
    const hasPerspective2nd = execRefreshed?.itemPassiveTags?.includes('picasso_perspective_2nd') || execRefreshed?.itemPassiveTags?.includes('sig_picasso_rose_period');
    const perspectiveMod = (hasPerspective2nd || (execRefreshed?.level ?? 1) >= 7) ? 2 : 3;
    const cardIsFreeDueToPicasso = executor.name.includes("Picasso") && cardsPlayedSoFar > 0 && cardsPlayedSoFar % perspectiveMod === perspectiveMod - 1;
    // Overcharge: if the flag is set for this player, this card is free — then clear the flag
    const cardIsFreeDueToOvercharge = (updated as any).overchargePlayerId === executor.playerId && !card.effect.overcharge;
    if (cardIsFreeDueToOvercharge) (updated as any).overchargePlayerId = undefined;
    const effectiveCost = (cardIsFreeDueToNextFree || cardIsFreeDueToFirstAbility || cardIsFreeDueToPicasso || cardIsFreeDueToOvercharge) ? 0 : card.manaCost;
    if (effectiveCost > 0) {
      const pid = executor.playerId as 0 | 1;
      const newMana = [...updated.globalMana] as [number, number];
      newMana[pid] = Math.max(0, newMana[pid] - effectiveCost);
      updated.globalMana = newMana;
    }
    if (cardIsFreeDueToNextFree) pushLog(updated, `${executor.name} Znyxorga's Eye: card played FREE!`, executor.playerId);
    if (cardIsFreeDueToFirstAbility) pushLog(updated, `${executor.name} Gladiator's Brand: first ability FREE!`, executor.playerId);
    if (cardIsFreeDueToPicasso) pushLog(updated, `${executor.name} Fractured Perspective: card #${cardsPlayedSoFar + 1} FREE!`, executor.playerId);
    if (cardIsFreeDueToOvercharge) pushLog(updated, `${executor.name} Overcharge: card played FREE!`, executor.playerId);

    // Mark executor as having used a card this turn; track count for 3-card limit (all card types count)
    updated.players = updated.players.map(p => ({
      ...p,
      icons: p.icons.map(ic => ic.id !== executorId ? ic : {
        ...ic,
        cardUsedThisTurn: true,
        cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1,
        cardsPlayedThisBattle: (ic.cardsPlayedThisBattle ?? 0) + 1,
        abilityUsedThisTurn: isExclusiveAbility ? true : ic.abilityUsedThisTurn,
        nextCardFree: cardIsFreeDueToNextFree ? false : ic.nextCardFree,
        freeCardsLeft: cardIsFreeDueToNextFree && (ic.freeCardsLeft ?? 0) > 0 ? ic.freeCardsLeft! - 1 : ic.freeCardsLeft,
        firstAbilityUsed: isExclusiveAbility ? true : ic.firstAbilityUsed,
      }),
    }));
    updated = consumeCardFromHand(updated, card, executor.playerId);
    return { ...updated };
  });
}, []);

/* =========================
   Undo movement — last step only
   ========================= */
const undoMovement = useCallback(() => {
  setGameState((prev) => {
    let state = { ...prev } as ExtState;
    const me = state.players[state.activePlayerId]?.icons.find(
      i => (state.selectedIcon ? i.id === state.selectedIcon : true) && i.isAlive
    ) ?? state.players[state.activePlayerId]?.icons.find(i => i.isAlive);
    if (!me) return prev;

    const stack = (state.movementStack?.[me.id] ?? []).slice();
    if (!stack.length) return prev;

    const last = stack.pop()!;

    // Don't allow undo if the previous position is occupied by another alive unit
    const isBlocked = state.players.flatMap(p => p.icons).some(
      ic => ic.isAlive && ic.id !== me.id && ic.position.q === last.from.q && ic.position.r === last.from.r
    );
    if (isBlocked) return prev;

    state.movementStack = { ...(state.movementStack ?? {}), [me.id]: stack };

    state.players = state.players.map((p) => ({
      ...p,
      icons: p.icons.map((ic) =>
        ic.id === me.id
          ? {
            ...ic,
            position: last.from,
            movedThisTurn: stack.length > 0,
            stats: { ...ic.stats, movement: last.movementBefore },
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
  act?: 1 | 2 | 3 | 4,
  permanentManaBonus?: number,
  permanentCardBonus?: number,
  veteransFuryActive?: boolean,
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
    // Progressive difficulty: +3% per roguelike battle, capped at +60%.
    // Act 4 breaks through the cap — enemies scale past 1.60× as the act progresses.
    // +3% per fight past battleCount 18, capped at 1.90×.
    const scaleFactor = (isRoguelikeRun && battleCount != null)
      ? act === 4
        ? Math.min(1.75, 1.50 + Math.max(0, battleCount - 20) * 0.025)
        : Math.min(1.50, 1 + battleCount * 0.025)
      : 1.0;
    const p1Icons = encounter
      ? buildEnemyIconsFromEncounter(encounter, scaleFactor)
      : buildIconsFromSelection(sel, runChars).filter(i => i.playerId === 1);

    // Tutorial: override spawn positions so characters start near each other.
    // Each tutorialForcePositions entry is consumed at most once (first-match),
    // so duplicate name entries work for multi-count enemies (e.g. 2× Zyx Skitter).
    const applyForcedPos = <T extends { name: string; position: { q: number; r: number } }>(icons: T[]): T[] => {
      const fps = encounter?.tutorialForcePositions;
      if (!fps || fps.length === 0) return icons;
      const usedIndices = new Set<number>();
      return icons.map(ic => {
        const fpIdx = fps.findIndex((f, i) => !usedIndices.has(i) && ic.name.includes(f.nameContains));
        if (fpIdx >= 0) {
          usedIndices.add(fpIdx);
          return { ...ic, position: { q: fps[fpIdx].q, r: fps[fpIdx].r } };
        }
        return ic;
      });
    };
    const p0IconsForced = applyForcedPos(p0Icons);
    const p0IconsFinal = (() => {
      const afterFury = (() => {
        if (!veteransFuryActive) return p0IconsForced;
        try { const p = JSON.parse(localStorage.getItem('wcw_run_perks_v1') ?? '[]') as string[]; if (!p.includes('veterans_fury')) return p0IconsForced; } catch { return p0IconsForced; }
        return p0IconsForced.map(ic => ({ ...ic, stats: { ...ic.stats, might: Math.round(ic.stats.might * 1.15), power: Math.round(ic.stats.power * 1.15) } }));
      })();
      // Shaka Kraal Shield: at fight start, gain 10% maxHp per ally as bonus HP
      const shakaIdx = afterFury.findIndex(ic => ic.name.includes("Shaka") && ic.itemPassiveTags?.includes('shaka_kraal_shield'));
      if (shakaIdx < 0) return afterFury;
      const shaka = afterFury[shakaIdx];
      const shieldHp = Math.round(shaka.stats.maxHp * 0.1 * (afterFury.length - 1));
      return afterFury.map((ic, i) => i !== shakaIdx ? ic : { ...ic, stats: { ...ic.stats, hp: Math.min(ic.stats.maxHp, ic.stats.hp + shieldHp) } });
    })();
    const p1IconsFinal = applyForcedPos(p1Icons);
    const allIcons = [...p0IconsFinal, ...p1IconsFinal];

    const speedQueueRaw = initSpeedQueue(allIcons);
    const speedQueue    = normalizeSpeedQueue(speedQueueRaw, allIcons);
    const p0Names = p0Icons.map(i => i.name);
    const p1Names = p1Icons.map(i => i.name);
    const buildHand = (names: string[], ids?: string[]): [Hand, Deck] => {
      const allCards = ids ? buildDeckFromIds(ids, upgradedCardDefIds) : buildDeckForTeam(names);
      const handSizeBonus = (runChars ?? []).reduce((sum, c) => {
        return sum + c.items.filter(Boolean).reduce((s, item) => {
          if (item?.passiveTag === 'hand_size_plus_1') return s + 1;
          if (item?.passiveTag === 'hand_size_plus_2') return s + 2;
          if (item?.passiveTag === 'draw_plus_3') return s + 3;
          return s;
        }, 0);
      }, 0);
      const perkHandBonus = (() => { try { const p = JSON.parse(localStorage.getItem('wcw_run_perks_v1') ?? '[]') as string[]; return (p.includes('card_draw_bonus_1') ? 1 : 0) + (p.includes('card_draw_bonus_2') ? 1 : 0); } catch { return 0; } })();
      const maxSize = 7 + handSizeBonus + perkHandBonus;
      return [{ cards: allCards.slice(0, maxSize), maxSize }, { drawPile: allCards.slice(maxSize), discardPile: [] }];
    };
    let [hand0, deck0] = buildHand(p0Names, deckCardIds);
    const [hand1, deck1] = buildHand(p1Names);

    // Tutorial hand script: override player 0's initial hand if turn-0 script present
    const handScript = encounter?.tutorialHandScript;
    if (handScript?.[0]) {
      const scriptedCards = handScript[0].map(defId => {
        const def = CARD_DEFS.find((d: any) => d.definitionId === defId);
        return def ? instantiateCard(def as any) : null;
      }).filter(Boolean) as import('@/types/game').Card[];
      hand0 = { cards: scriptedCards, maxSize: hand0.maxSize };
      deck0 = { drawPile: [], discardPile: [] };
    }
    // Da Vinci Tinkerer: apply +1 (or +2 with Codex) extra draw to the initial hand (turn 1)
    // Drone can't be alive yet, so no +1 drone bonus here.
    if (!handScript?.[0]) {
      const daVinciStart = p0IconsFinal.find(ic => ic.name.includes("Da Vinci"));
      if (daVinciStart) {
        const codexBonus = daVinciStart.itemPassiveTags?.includes('sig_davinci_codex') ? 1 : 0;
        const tinkererDraw = 1 + codexBonus;
        const extraCards = deck0.drawPile.slice(0, tinkererDraw);
        hand0 = { ...hand0, cards: [...hand0.cards, ...extraCards] };
        deck0 = { ...deck0, drawPile: deck0.drawPile.slice(tinkererDraw) };
      }
    }
    // Use random map for roguelike battles; act determines biome theme (1=forest, 2=desert, 3=snow/ice)
    const rawBoard = mapSeed != null ? generateRandomBattleBoard(mapSeed, act ?? 1) : createInitialBoard();
    const rogueObjective = (encounter?.objective ?? 'defeat_all') as FightObjective;
    // In roguelike: spawn tiles are always plain (no respawn zones). Base tiles are plain too,
    // unless the objective is destroy_base (where only the ENEMY base is a combat target;
    // the player has no base of their own in that mode).
    const board = isRoguelikeRun
      ? rawBoard.map(tile => {
          if (tile.terrain.type === 'spawn') return { ...tile, terrain: { type: 'plain' as const, effects: {} } };
          if (tile.terrain.type === 'base' && rogueObjective !== 'destroy_base') return { ...tile, terrain: { type: 'plain' as const, effects: {} } };
          // destroy_base: convert player's own base (q=-5,r=4) to plain — only enemy base remains
          if (tile.terrain.type === 'base' && rogueObjective === 'destroy_base' && tile.coordinates.q === -5 && tile.coordinates.r === 4) return { ...tile, terrain: { type: 'plain' as const, effects: {} } };
          return tile;
        })
      : rawBoard;
    const actBaseHp = isRoguelikeRun ? (act === 4 ? 450 : act === 3 ? 300 : act === 2 ? 200 : 150) : 150;
    // Chrono Shard: +2 starting mana per holder at the start of the first turn of combat
    const chronoShardCount = p0IconsFinal.filter(ic => ic.itemPassiveTags?.includes('chrono_shard_t1')).length;
    const manaBonus = permanentManaBonus ?? 0;
    const perkCardBonus = (() => { try { const p = JSON.parse(localStorage.getItem('wcw_run_perks_v1') ?? '[]') as string[]; return (p.includes('draw_4_cards') ? 1 : 0); } catch { return 0; } })();
    const totalCardBonus = (permanentCardBonus ?? 0) + perkCardBonus;
    const startMana: [number, number] = [5 + chronoShardCount * 2 + manaBonus, 5];
    const startMaxMana: [number, number] = [5 + chronoShardCount * 2 + manaBonus, 5];
    return {
      currentTurn: 1,
      activePlayerId: 0 as const,
      cardLockActive: false,
      phase: "combat",
      players: [
        { id: 0, name: "Player 1",                                                icons: p0IconsFinal, color: "blue", isAI: false },
        { id: 1, name: gameMode === "singleplayer" ? "Znyxorgan AI" : "Player 2", icons: p1IconsFinal, color: "red",  isAI: gameMode === "singleplayer" },
      ],
      board,
      globalMana:   startMana,
      globalMaxMana: startMaxMana,
      permanentCardBonus: totalCardBonus,
      turnTimer:    20,
      speedQueue,
      queueIndex:   0,
      objectives: {
        manaCrystal: { controlled: false },
        beastCamps: { hp: [75, 75], maxHp: 75, defeated: [false, false] },
      },
      teamBuffs:   { mightBonus: [0, 0], powerBonus: [0, 0], homeBaseBonus: [0, 0] },
      baseHealth:  [actBaseHp, actBaseHp],
      baseMaxHealth: [actBaseHp, actBaseHp],
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
      tutorialHandScript: encounter?.tutorialHandScript,
      tutorialPlayerTurnIdx: 0,
      playerKillBlows: {},
      killedEnemyNameLog: [],
      // Phased boss — populated only when the encounter has multiple phases
      bossPhases: encounter?.phases ?? [],
      currentBossPhase: 1,
      bossPhaseScaleFactor: encounter?.phases?.length ? 1.8 : scaleFactor,
      totalBossPhases: encounter?.phases ? encounter.phases.length + 1 : 1,
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










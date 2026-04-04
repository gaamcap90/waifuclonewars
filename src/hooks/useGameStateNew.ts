import { useState, useCallback, useEffect, useRef } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType, Card, Hand, Deck, AIIntent, Debuff } from "@/types/game";
import type { CharacterRunState } from "@/types/roguelike";
import { buildDeckForTeam, drawCards, buildDeckFromIds } from "@/data/cards";
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
    return { type: "river", effects: { movementModifier: -999 } as any }; // lethal if landed on (e.g. displacement)

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
        { id: "1", name: "Artillery Barrage", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Deals 48 damage.", damage: 0 },
        { id: "2", name: "Grande Armée", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "Summons phantom soldiers. +20% damage to all allies for 3 turns.", damage: 0 },
        { id: "ultimate", name: "Final Salvo", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Deal 30 damage in a 3-tile line", damage: 0 },
      ],
      passive: "Tactical Genius: +1 movement range when commanding from high ground",
    },
    {
      name: "Genghis-chan",
      role: "dps_melee" as const,
      stats: { hp: 120, maxHp: 120, moveRange: 2, speed: 8, might: 50, power: 40, defense: 25, movement: 2 },
      abilities: [
        { id: "1", name: "Mongol Charge", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Rush attack through enemies. Deals 48 damage.", damage: 0 },
        { id: "2", name: "Horde Tactics", manaCost: 5, cooldown: 0, currentCooldown: 0, range: 1, description: "Teleport behind target. Deals 60 damage + fear effect.", damage: 0 },
        { id: "ultimate", name: "Rider's Fury", manaCost: 7, cooldown: 0, currentCooldown: 0, range: 2, description: "ULTIMATE: Charge through up to 3 enemies, dealing 24 damage each", damage: 0 },
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
  const p1Spawns = [{ q: -4, r: 3 }, { q: -4, r: 2 }, { q: -3, r: 3 }];
  const p2Spawns = [{ q: 4, r: -3 }, { q: 4, r: -2 }, { q: 3, r: -3 }];

  const toIcon = (template: any, pid: number, idx: number): Icon => {
    // Apply roguelike run state overrides for player 0 only (AI always starts fresh)
    const runChar = pid === 0 ? runChars?.find((c) => c.id === template.id) : undefined;
    const statBonus = runChar?.statBonuses ?? { hp: 0, might: 0, power: 0, defense: 0 };
    const baseDefense = template.role === "support" ? 20 : template.role === "dps_melee" ? 25 : template.role === "tank" ? 42 : 15;
    const baseHp  = runChar ? runChar.currentHp : template.stats.hp;
    const maxHp   = runChar ? runChar.maxHp : template.stats.hp;

    return {
      id: `${pid}-${idx}`,
      name: template.name,
      role: template.role,
      stats: {
        hp:        baseHp,
        maxHp:     maxHp,
        moveRange: template.role === "tank" ? 2 : 3,
        speed:     template.role === "dps_melee" ? 8 : template.role === "dps_ranged" ? 6 : template.role === "tank" ? 3 : 4,
        might:     template.stats.might + (statBonus.might ?? 0),
        power:     (template.stats.power ?? 50) + (statBonus.power ?? 0),
        defense:   baseDefense + (statBonus.defense ?? 0),
        movement:  template.role === "tank" ? 2 : 3,
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
    { id: "1", name: "Artillery Barrage", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 4, description: "Long-range bombardment. Power×1.4 damage.", damage: 0, powerMult: 1.4 },
    { id: "2", name: "Grande Armée", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 2, description: "+20% Might & Power to all allies for 2 turns.", damage: 0 },
    { id: "ultimate", name: "Final Salvo", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 4, description: "ULTIMATE: 3 hits of Power×0.7 on random enemies", damage: 0, powerMult: 0.7 },
  ];
  if (name.includes("Genghis")) return [
    { id: "1", name: "Mongol Charge", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 3, description: "Rush attack. Power×1.2 damage.", damage: 0, powerMult: 1.2 },
    { id: "2", name: "Horde Tactics", manaCost: 5, cooldown: 0, currentCooldown: 0, range: 2, description: "Power×0.8 damage to ALL enemies in range 2.", damage: 0, powerMult: 0.8 },
    { id: "ultimate", name: "Rider's Fury", manaCost: 7, cooldown: 0, currentCooldown: 0, range: 5, description: "ULTIMATE: Power×0.7 to all enemies on a line", damage: 0, powerMult: 0.7 },
  ];
  if (name.includes("Da Vinci")) return [
    { id: "1", name: "Flying Machine", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 5, description: "Teleport to any hex.", damage: 0, targetMode: "hex" as any },
    { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 3, description: "Heals 45 HP to an ally.", healing: 45 },
    { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons attack drone", damage: 0 },
  ];
  if (name.includes("Leonidas")) return [
    { id: "1", name: "Shield Bash", manaCost: 3, cooldown: 0, currentCooldown: 0, range: 1, description: "Power×1.5 damage + Armor Break.", damage: 0, powerMult: 1.5 },
    { id: "2", name: "Spartan Wall", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 2, description: "+20 Defense to all nearby allies.", damage: 0, teamDefBuff: 20 },
    { id: "ultimate", name: "THIS IS SPARTA!", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Power×3 damage + Demoralize nearby.", damage: 0, powerMult: 3.0 },
  ];
  // fallback (shouldn't be reached)
  return [
    { id: "1", name: "Flying Machine", manaCost: 4, cooldown: 0, currentCooldown: 0, range: 5, description: "Teleport to any hex.", damage: 0, targetMode: "hex" as any },
    { id: "2", name: "Masterpiece", manaCost: 6, cooldown: 0, currentCooldown: 0, range: 3, description: "Heals 45 HP to an ally.", healing: 45 },
    { id: "ultimate", name: "Vitruvian Guardian", manaCost: 8, cooldown: 0, currentCooldown: 0, range: 3, description: "ULTIMATE: Summons attack drone", damage: 0 },
  ];
}

function getPassiveForCharacter(name: string) {
  if (name.includes("Napoleon")) return "Vantage Point: On a forest tile, basic attack range becomes 3";
  if (name.includes("Genghis")) return "Bloodlust: Each kill grants +15 Might and restores 1 Mana (up to 3×)";
  if (name.includes("Da Vinci")) return "Tinkerer: Draw +1 card at turn start if no exclusive ability was used last turn";
  if (name.includes("Leonidas")) return "Phalanx: Each turn adjacent to an ally, gain +8 Defense (stacks up to 3 turns)";
  return "";
}

/* =========================
   AI helpers
   ========================= */

/** Simple buff/utility actions the AI can combine with its main attack. */
const AI_BUFF_ACTIONS = [
  { id: 'battle_cry',  name: 'Battle Cry',  atkBonus: 10, defBonus: 0,  label: '+10 ATK' },
  { id: 'shields_up',  name: 'Shields Up',  atkBonus: 0,  defBonus: 10, label: '+10 DEF' },
] as const;

/** Beast camp coordinates */
const BEAST_CAMPS: Qr[] = [{ q: -2, r: 2 }, { q: 2, r: -2 }];

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
        const estDmg = isPowerMult
          ? resolveAbilityDamage(state, ai, nearestEnemy, ab.powerMult)
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
      const inRange = enemies.find(e => hexDistance(ai.position, e.position) <= basicRange);
      if (inRange) {
        const dmg = Math.max(0, ai.stats.might - inRange.stats.defense);
        intents.push({ iconId: ai.id, type: 'attack', abilityName: 'Basic Attack',
          label: String(Math.round(dmg)), damage: dmg, range: basicRange });
        mainIntentSet = true;
      }
    }

    // --- 3. Beast camp or player base attack if no enemies in range ---
    if (!mainIntentSet) {
      for (const camp of BEAST_CAMPS) {
        const campIdx = camp.q === -2 ? 0 : 1;
        if (state.objectives.beastCamps.defeated[campIdx]) continue;
        if (hexDistance(ai.position, camp) <= basicRange) {
          const dmg = Math.max(1, ai.stats.might);
          intents.push({ iconId: ai.id, type: 'attack', abilityName: 'Attack Beast Camp',
            label: String(Math.round(dmg)), damage: dmg, range: basicRange });
          mainIntentSet = true;
          break;
        }
      }
    }
    if (!mainIntentSet) {
      const playerBase: Qr = { q: -6, r: 5 };
      if (hexDistance(ai.position, playerBase) <= basicRange && state.baseHealth[0] > 0) {
        const dmg = Math.max(1, ai.stats.might);
        intents.push({ iconId: ai.id, type: 'attack', abilityName: 'Attack Base',
          label: String(Math.round(dmg)), damage: dmg, range: basicRange });
        mainIntentSet = true;
      }
    }

    // --- 4. Pair a free buff with any attacking intent ---
    if (mainIntentSet) {
      // Pick a contextual buff: ATK buff if attacking, DEF buff if healing/tanking
      const mainIntent = intents[intents.length - 1];
      const buffPick = mainIntent.type === 'heal'
        ? AI_BUFF_ACTIONS[1]  // Shields Up when healing
        : AI_BUFF_ACTIONS[Math.floor(Math.random() * 2)]; // Battle Cry or Shields Up
      intents.push({ iconId: ai.id, type: 'buff', abilityName: buffPick.name,
        label: buffPick.label, range: 0 });
    }
  }
  return intents;
}

/** Execute AI turn: ALL alive AI icons move + act. Returns updated state (aiIntents cleared). */
function executeAITurn(state: ExtState): ExtState {
  let s = { ...state } as ExtState;
  const intents: AIIntent[] = (s as any).aiIntents ?? [];

  for (const aiOrig of state.players[1].icons.filter(i => i.isAlive)) {
    let ai = s.players[1].icons.find(i => i.id === aiOrig.id);
    if (!ai || !ai.isAlive) continue;

    const basicRange = ai.name.includes("Napoleon") || ai.name.includes("Da Vinci") ? 2 : 1;
    const enemies = () => s.players[0].icons.filter(i => i.isAlive);
    const iconIntents = intents.filter(i => i.iconId === aiOrig.id);

    // --- Apply buff intent first (enhances subsequent attack) ---
    const buffIntent = iconIntents.find(i => i.type === 'buff');
    if (buffIntent) {
      const buffDef = AI_BUFF_ACTIONS.find(b => b.name === buffIntent.abilityName);
      if (buffDef) {
        s.players = s.players.map(p => ({
          ...p, icons: p.icons.map(ic => ic.id !== ai!.id ? ic : {
            ...ic,
            cardBuffAtk: (ic.cardBuffAtk ?? 0) + buffDef.atkBonus,
            cardBuffDef: (ic.cardBuffDef ?? 0) + buffDef.defBonus,
          }),
        }));
        pushLog(s, `${ai.name} used ${buffIntent.abilityName} (${buffIntent.label})`, 1);
      }
    }

    // --- Main action intent ---
    const mainIntent = iconIntents.find(i => i.type !== 'buff');

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
        } else if (mainIntent.abilityName === 'Attack Beast Camp') {
          // AI attacks a beast camp
          for (const camp of BEAST_CAMPS) {
            const campIdx = camp.q === -2 ? 0 : 1;
            if (s.objectives.beastCamps.defeated[campIdx]) continue;
            if (hexDistance(ai.position, camp) <= basicRange) {
              const dmg = Math.max(0.1, calcEffectiveStats(s, ai).might);
              const hpArr = [...s.objectives.beastCamps.hp];
              const defArr = [...s.objectives.beastCamps.defeated];
              hpArr[campIdx] = Math.max(0, hpArr[campIdx] - dmg);
              pushLog(s, `${ai.name} attacked beast camp for ${dmg.toFixed(0)} dmg`, 1);
              if (hpArr[campIdx] <= 0) {
                defArr[campIdx] = true;
                s.board = s.board.map(tile =>
                  tile.coordinates.q === camp.q && tile.coordinates.r === camp.r
                    ? { ...tile, terrain: { type: "plain", effects: {} } } : tile
                );
                const nm = [...s.teamBuffs.mightBonus];
                const np = [...s.teamBuffs.powerBonus];
                nm[1] = Math.min((nm[1] ?? 0) + 15, 30);
                np[1] = Math.min((np[1] ?? 0) + 15, 30);
                s.teamBuffs = { ...s.teamBuffs, mightBonus: nm, powerBonus: np };
                pushLog(s, `AI destroyed beast camp! +15% Might & Power`, 1);
              }
              s.objectives = { ...s.objectives, beastCamps: { ...s.objectives.beastCamps, hp: hpArr, defeated: defArr } };
              s.players = s.players.map(p => ({ ...p, icons: p.icons.map(ic => ic.id === ai!.id ? { ...ic, cardUsedThisTurn: true } : ic) }));
              break;
            }
          }
        } else {
          // Basic attack on enemy
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
      ...BEAST_CAMPS
        .filter((_, idx) => !s.objectives.beastCamps.defeated[idx])
        .map(c => ({ position: c })),
      { position: PLAYER_BASE },
    ];
    if (!allTargets.length) continue;

    const budget = Math.min(ai.stats.movement, ai.stats.moveRange);
    const occupied = new Set(
      s.players.flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.id !== ai!.id)
        .map(ic => tileKey(ic.position.q, ic.position.r))
    );
    const costMap = reachableWithCosts(s.board, ai.position, budget, occupied);
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

  return { ...s, aiIntents: [] };
}

/** Apply Genghis Bloodlust passive after a kill: +15 Might stack, +1 mana (up to 3 stacks). */
function applyGenghisKill(s: ExtState, killerId: string, victimWasAlive: boolean, victimIsNowDead: boolean): ExtState {
  if (!victimWasAlive || !victimIsNowDead) return s;
  const killer = s.players.flatMap(p => p.icons).find(i => i.id === killerId);
  if (!killer || !killer.name.includes("Genghis")) return s;
  const stacks = killer.passiveStacks ?? 0;
  if (stacks >= 3) return s;
  const newStacks = stacks + 1;
  s.players = s.players.map(p => ({
    ...p,
    icons: p.icons.map(ic => ic.id !== killerId ? ic : { ...ic, passiveStacks: newStacks }),
  }));
  const newMana = [...s.globalMana] as [number, number];
  newMana[killer.playerId] = Math.min(5, newMana[killer.playerId] + 1);
  s.globalMana = newMana;
  pushLog(s, `${killer.name} Bloodlust! ${newStacks}/3 stacks (+15 Might, +1 Mana)`, killer.playerId);
  return s;
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
        beastCamps: { hp: [75, 75], maxHp: 75, defeated: [false, false] },
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
        objectives: { manaCrystal: { controlled: false }, beastCamps: { hp: [75, 75], maxHp: 75, defeated: [false, false] } },
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
      // Beast camp intents — each active camp shows attack intention
      const campDefs = [{ q: -2, r: 2 }, { q: 2, r: -2 }];
      const beastCampIntents: { campQ: number; campR: number; range1Dmg: number; range2Dmg: number }[] = [];
      for (let campIdx = 0; campIdx < campDefs.length; campIdx++) {
        if ((prev.objectives as any)?.beastCamps?.defeated?.[campIdx]) continue;
        beastCampIntents.push({ campQ: campDefs[campIdx].q, campR: campDefs[campIdx].r, range1Dmg: 50, range2Dmg: 30 });
      }
      return { ...prev, aiIntents: intents, beastCampIntents };
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
    if (!aiIcons.length) return;

    const t = setTimeout(() => {
      setGameState((prev) => executeAITurn(prev as ExtState));
      setTimeout(() => endTurn(), AI_END_TURN_MS);
    }, AI_THINK_MS);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.activePlayerId, gameState.gameMode]);

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
          toast.error("Out of range!");
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
          if (occupied) { toast.error("Tile is occupied!"); return prev; }

          const drone: Icon = {
            id: `drone_${makeId()}`,
            name: "Combat Drone",
            role: "dps_melee",
            stats: {
              hp: 50, maxHp: 50,
              moveRange: 2, speed: 5,
              might: 15, power: 15, defense: 30,
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
            droneExpiresTurn: state.currentTurn + 2,
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
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true }),
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
          if (blocked) { toast.error("Can't teleport there!"); return prev; }
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
            icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true }),
          }));
          pushLog(updated, `${executor.name} used ${card.name} to teleport!`, executor.playerId);
          updated = consumeCardFromHand(updated, card, executor.playerId);
          return { ...updated, cardTargetingMode: undefined, targetingMode: undefined };
        }

        // ── Debuff cards ──────────────────────────────────────────────────────
        if (card.effect.debuffType) {
          const targetIcon = state.players.flatMap(p => p.icons).find(
            ic => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
          );
          if (!targetIcon || targetIcon.playerId === executor.playerId) {
            toast.error("Must target an enemy!");
            return prev;
          }
          const range = card.effect.range ?? 2;
          if (hexDistance(executor.position, coordinates) > range) {
            toast.error("Out of range!");
            return prev;
          }
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
          pushLog(updated, `${executor.name} applied ${card.name} to ${targetIcon.name}`, executor.playerId);
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
            if (enemies.length === 0) { toast.error("No enemies in range!"); return prev; }
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
            if (enemies.length === 0) { toast.error("No enemies on that line!"); return prev; }
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

          const finalDmg = computeCardDamage(targetIcon);
          const multiHit = card.effect.multiHit ?? 1;

          if (targetIcon) {
            if (targetIcon.playerId === executor.playerId) {
              toast.error("Can't attack your own character!");
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
            const newHp = currentHp;
            const wasAlive = targetIcon.isAlive;
            updated.players = updated.players.map(p => ({
              ...p,
              icons: p.icons.map(ic => ic.id !== targetIcon.id ? ic : {
                ...ic,
                stats: { ...ic.stats, hp: newHp },
                isAlive: newHp > 0,
                respawnTurns: newHp > 0 ? ic.respawnTurns : 4,
              }),
            }));
            updated = applyGenghisKill(updated, executorId, wasAlive, newHp <= 0);
            const hitLabel = multiHit > 1 ? `${multiHit}×${(totalDmg/multiHit).toFixed(0)}` : totalDmg.toFixed(0);
            pushLog(updated, `${executor.name} played ${card.name} on ${targetIcon.name} for ${hitLabel} dmg`, executor.playerId);
          } else {
            if (isOwnBase) { toast.error("Can't attack your own base!"); return prev; }
            const isBase = (coordinates.q === -6 && coordinates.r === 5) || (coordinates.q === 6 && coordinates.r === -5);
            if (isBase) {
              const enemyId = executor.playerId === 0 ? 1 : 0;
              updatedBaseHealth[enemyId] = Math.max(0, state.baseHealth[enemyId] - finalDmg);
              pushLog(updated, `${executor.name} played ${card.name} on enemy base for ${finalDmg.toFixed(0)} dmg`, executor.playerId);
            } else {
              const campIdx = coordinates.q === -2 && coordinates.r === 2 ? 0 : coordinates.q === 2 && coordinates.r === -2 ? 1 : -1;
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
                  toast.success("Beast Camp defeated! Team +15% Might & Power!");
                }
                updatedObjectives = { ...updatedObjectives, beastCamps: { ...updatedObjectives.beastCamps, hp: hpArr, defeated: defArr } };
              } else { toast.error("No target!"); return prev; }
            }
          }
        }

        if ((card.effect.healing !== undefined || card.effect.healingMult !== undefined) && !card.effect.selfCast) {
          if (!targetIcon || targetIcon.playerId !== executor.playerId) {
            toast.error("Healing targets allies only!");
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

        // Set cardUsedThisTurn on executor
        updated.players = updated.players.map(p => ({
          ...p,
          icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true }),
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
            toast.error("Can't teleport there!");
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
              toast.error("Cannot attack your own character!");
              return prev;
            }
            const dmg = resolveBasicAttackDamage(updated, caster, targetIcon);
            pushLog(updated, `${caster.name} basic-attacked ${targetIcon.name} for ${dmg.toFixed(0)} dmg`, caster.playerId);

            const wasAlive = targetIcon.isAlive;
            const newBasicHp = Math.round(Math.max(0, targetIcon.stats.hp - dmg));
            updated.players = updated.players.map((player) => ({
              ...player,
              icons: player.icons.map((ic) =>
                ic.id !== targetIcon.id
                  ? ic
                  : {
                    ...ic,
                    stats: { ...ic.stats, hp: newBasicHp },
                    isAlive: newBasicHp > 0,
                    respawnTurns: newBasicHp > 0 ? ic.respawnTurns : 4,
                  }
              ),
            }));
            updated = applyGenghisKill(updated, caster.id, wasAlive, newBasicHp <= 0);
          } else {
            if (isOwnBase) {
              toast.error("Cannot attack your own base!");
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
              const campIndex = coordinates.q === -2 && coordinates.r === 2 ? 0 : coordinates.q === 2 && coordinates.r === -2 ? 1 : -1;
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
                  toast.success("Beast Camp defeated! Team gains +15% Might and Power!");
                  pushLog(updated, `Beast camp defeated! Team +15% Might & Power`, caster.playerId);
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
              toast.error("Healing can only target allies!");
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
          } else if (typeof (ability as any).damage === "number") {
            if (targetIcon) {
              const dmg = (ability as any).damage > 0 ? (ability as any).damage : resolveAbilityDamage(updated, caster, targetIcon, (ability as any).powerMult ?? 1.0);
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
            } else {
              if (isOwnBase) {
                toast.error("Cannot attack your own base!");
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
                const campIndex = coordinates.q === -2 && coordinates.r === 2 ? 0 : coordinates.q === 2 && coordinates.r === -2 ? 1 : -1;
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
                    toast.success("Beast Camp defeated! Team gains +15% Might and Power!");
                    pushLog(updated, `Beast camp defeated! Team +15% Might & Power`, caster.playerId);
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
          icons: p.icons.map((ic) => (ic.id === caster.id ? { ...ic, cardUsedThisTurn: true } : ic)),
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
      if (dest.terrain.effects.movementModifier === -999) return prev;

      // Block movement onto any tile that has an icon — alive OR dead (prevents sliding onto a just-killed enemy's tile)
      const occupied = state.players.flatMap((p) => p.icons).some(
        (ic) => ic.position.q === coordinates.q && ic.position.r === coordinates.r
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
      if (me.justRespawned) return prev; // Can't move on turn they spawn
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
        toast.error("Not enough mana!");
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
      const isRanged = me.name.includes("Napoleon") || me.name.includes("Da Vinci");
      const range = me.name.includes("Napoleon") && onForest ? 3 : isRanged ? 2 : 1;
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
            return {
              ...ic,
              cardBuffAtk: 0,
              cardBuffDef: 0,
              cardsUsedThisTurn: demoSkip ? 3 : 0,
              stats: { ...ic.stats, movement: demoSkip ? 0 : Math.max(0, ic.stats.moveRange - moveReduction) },
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

      // Beast camp attacks: each non-defeated camp attacks a random player character in range
      // Range 1 → 50 dmg, Range 2 → 30 dmg (one attack per camp per turn, on turn end)
      const campDefs = [{ q: -2, r: 2 }, { q: 2, r: -2 }];
      for (let campIdx = 0; campIdx < campDefs.length; campIdx++) {
        const camp = campDefs[campIdx];
        if ((prev.objectives as any)?.beastCamps?.defeated?.[campIdx]) continue;
        const allAlive = playersAfter.flatMap(p => p.icons).filter(ic => ic.isAlive);
        // Find targets within range 2
        const range1Targets = allAlive.filter(ic => hexDistance(ic.position, camp) === 1);
        const range2Targets = allAlive.filter(ic => hexDistance(ic.position, camp) === 2);
        let target: Icon | undefined;
        let campDmg = 0;
        if (range1Targets.length > 0) {
          target = range1Targets[Math.floor(Math.random() * range1Targets.length)];
          campDmg = 50;
        } else if (range2Targets.length > 0) {
          target = range2Targets[Math.floor(Math.random() * range2Targets.length)];
          campDmg = 30;
        }
        if (target && campDmg > 0) {
          pushLog({ ...prev, players: playersAfter } as any,
            `Beast Camp attacked ${target.name} for ${campDmg} dmg!`, 1);
          const targetId = target.id;
          playersAfter = playersAfter.map(p => ({
            ...p,
            icons: p.icons.map(ic => {
              if (ic.id !== targetId) return ic;
              const newHp = Math.max(0, ic.stats.hp - campDmg);
              if (newHp <= 0) {
                pushLog({ ...prev, players: playersAfter } as any,
                  `${ic.name} was slain by the Beast Camp!`, 1);
                return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 };
              }
              return { ...ic, stats: { ...ic.stats, hp: newHp } };
            }),
          }));
        }
      }

      // River kill: any character standing on a river tile at end of turn drowns
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.map(ic => {
          if (!ic.isAlive) return ic;
          const tile = prev.board.find(t => t.coordinates.q === ic.position.q && t.coordinates.r === ic.position.r);
          if (tile?.terrain.type === 'river') {
            pushLog({ ...prev, players: playersAfter } as any, `${ic.name} drowned in the river!`, ic.playerId);
            return { ...ic, isAlive: false, stats: { ...ic.stats, hp: 0 }, respawnTurns: 4 };
          }
          return ic;
        }),
      }));

      // Remove expired drones (Vitruvian Guardian lasts 3 rounds)
      const newCurrentTurn = nextPlayer === 0 ? prev.currentTurn + 1 : prev.currentTurn;
      playersAfter = playersAfter.map(p => ({
        ...p,
        icons: p.icons.filter(ic => !ic.droneExpiresTurn || ic.droneExpiresTurn > newCurrentTurn),
      }));

      // Victory check — all characters of a team simultaneously defeated = instant game over
      const p0Alive = playersAfter[0].icons.some((ic) => ic.isAlive);
      const p1Alive = playersAfter[1].icons.some((ic) => ic.isAlive);
      let newPhase = prev.phase;
      let winner = prev.winner;
      if (!p0Alive) { newPhase = "defeat";  winner = 1; }
      else if (!p1Alive) { newPhase = "victory"; winner = 0; }
      if (prev.baseHealth[0] <= 0) { newPhase = "defeat";  winner = 1; }
      if (prev.baseHealth[1] <= 0) { newPhase = "victory"; winner = 0; }

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
        const extraDraw = daVinciNextPlayer ? 1 : 0;

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
        hands[nextPlayer] = { ...startHand, cards: drawn };
        decks[nextPlayer] = { drawPile: newDraw, discardPile: newDiscard };
      }

      return {
        ...prev,
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
      toast.error("This character just respawned and cannot act yet!");
      return prev;
    }
    if ((executor.cardsUsedThisTurn ?? 0) >= 3) {
      toast.error("This character has already used 3 cards this turn!");
      return prev;
    }
    if (card.exclusiveTo && !executor.name.includes(card.exclusiveTo)) {
      toast.error(`Only ${card.exclusiveTo} can play that!`);
      return prev;
    }
    if ((state.globalMana[executor.playerId] ?? 0) < card.manaCost) {
      toast.error("Not enough mana!");
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

    // Flying Machine card → teleport targeting
    if (card.effect.teleport) {
      const range = card.effect.range ?? 5;
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: "card_teleport", iconId: executorId, range },
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

    // Damage / healing / single-target powerMult → enter targeting mode
    const needsTarget =
      card.effect.damage !== undefined ||
      ((card.effect.healing !== undefined || card.effect.healingMult !== undefined) && !card.effect.selfCast) ||
      (card.effect.powerMult !== undefined && !card.effect.allEnemiesInRange && !card.effect.lineTarget && !card.effect.randomTargets) ||
      card.effect.debuffType !== undefined;

    if (needsTarget) {
      const isBasicAttack = card.definitionId === "shared_basic_attack";
      const attackRange = executor.name.includes("Napoleon") || executor.name.includes("Da Vinci") ? 2 : 1;
      const cardRange = card.effect.range ?? (isBasicAttack ? attackRange : 3);
      const targetingMode = {
        abilityId: isBasicAttack ? "basic_attack" : card.definitionId,
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
    } else if (card.effect.teamDmgPct) {
      const pid = executor.playerId;
      const nm = [...updated.teamBuffs.mightBonus];
      const np = [...updated.teamBuffs.powerBonus];
      nm[pid] = Math.min((nm[pid] ?? 0) + card.effect.teamDmgPct, 60);
      np[pid] = Math.min((np[pid] ?? 0) + card.effect.teamDmgPct, 60);
      updated.teamBuffs = { ...updated.teamBuffs, mightBonus: nm, powerBonus: np };
      pushLog(updated, `${executor.name} played ${card.name} (+${card.effect.teamDmgPct}% team dmg)`, executor.playerId);
    } else if (card.effect.powerMult && card.effect.allEnemiesInRange) {
      // AoE: fires immediately (no directional target needed)
      const range = card.effect.range ?? 2;
      const executorTile = state.board.find(t => t.coordinates.q === executor.position.q && t.coordinates.r === executor.position.r);
      const terrainMult = 1 + (executorTile ? (card.terrainBonus?.[executorTile.terrain.type] ?? 0) : 0);
      const enemies = updated.players.flatMap(p => p.icons).filter(
        ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range
      );
      if (enemies.length === 0) { toast.error("No enemies in range!"); return prev; }
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
    } else if (card.effect.powerMult && card.effect.lineTarget) {
      // Line target: requires player to click a direction hex — enter targeting mode
      const cardRange = card.effect.range ?? 5;
      return {
        ...state,
        cardTargetingMode: { card, executorId },
        targetingMode: { abilityId: card.definitionId, iconId: executorId, range: cardRange },
      };
    } else if (card.effect.randomTargets && card.effect.powerMult) {
      // Final Salvo: fire multiHit random hits at enemies within range (no targeting click needed)
      const range = card.effect.range ?? 4;
      const hits = card.effect.multiHit ?? 3;
      const enemiesInRange = updated.players
        .flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.playerId !== executor.playerId && hexDistance(executor.position, ic.position) <= range);
      if (enemiesInRange.length === 0) { toast.error("No enemies in range!"); return prev; }
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
        updated = applyGenghisKill(updated, executorId, wasAlive, newHp <= 0);
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
        icons: p.icons.map(ic => ic.id !== executorId ? ic : { ...ic, cardUsedThisTurn: true }),
      }));
      return { ...updated };
    }

    // Deduct mana from global pool
    if (card.manaCost > 0) {
      const pid = executor.playerId as 0 | 1;
      const newMana = [...updated.globalMana] as [number, number];
      newMana[pid] = Math.max(0, newMana[pid] - card.manaCost);
      updated.globalMana = newMana;
    }

    // Mark executor as having used a card this turn; track count for 3-card limit
    const isExclusiveAbility = card.exclusiveTo !== null && card.type !== "buff" && card.type !== "movement";
    if (card.type !== "movement") {
      updated.players = updated.players.map(p => ({
        ...p,
        icons: p.icons.map(ic => ic.id !== executorId ? ic : {
          ...ic,
          cardUsedThisTurn: true,
          cardsUsedThisTurn: (ic.cardsUsedThisTurn ?? 0) + 1,
          abilityUsedThisTurn: isExclusiveAbility ? true : ic.abilityUsedThisTurn,
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

const startBattle = useCallback((runChars?: CharacterRunState[], deckCardIds?: string[]) => {
  const sel = selectedCharactersRef.current;
  if (!sel || sel.length === 0) return;
  setGameState(() => {
    const initialIcons = buildIconsFromSelection(sel, runChars);
    const speedQueueRaw = initSpeedQueue(initialIcons);
    const speedQueue    = normalizeSpeedQueue(speedQueueRaw, initialIcons);
    const p0Names = initialIcons.filter(i => i.playerId === 0).map(i => i.name);
    const p1Names = initialIcons.filter(i => i.playerId === 1).map(i => i.name);
    const buildHand = (names: string[], ids?: string[]): [Hand, Deck] => {
      const allCards = ids ? buildDeckFromIds(ids) : buildDeckForTeam(names);
      // Compute hand size bonus from run items
      const handSizeBonus = (runChars ?? []).reduce((sum, c) => {
        return sum + c.items.filter(Boolean).reduce((s, item) => {
          if (item?.passiveTag === 'hand_size_plus_1') return s + 1;
          if (item?.passiveTag === 'hand_size_plus_2') return s + 2;
          return s;
        }, 0);
      }, 0);
      const maxSize = 7 + handSizeBonus;
      return [{ cards: allCards.slice(0, maxSize), maxSize }, { drawPile: allCards.slice(maxSize), discardPile: [] }];
    };
    const [hand0, deck0] = buildHand(p0Names, deckCardIds);
    const [hand1, deck1] = buildHand(p1Names); // AI has no roguelike deck
    return {
      currentTurn: 1,
      activePlayerId: 0 as const,
      cardLockActive: false,
      phase: "combat",
      players: [
        { id: 0, name: "Player 1",                                              icons: initialIcons.filter(i => i.playerId === 0), color: "blue", isAI: false },
        { id: 1, name: gameMode === "singleplayer" ? "Znyxorgan AI" : "Player 2", icons: initialIcons.filter(i => i.playerId === 1), color: "red",  isAI: gameMode === "singleplayer" },
      ],
      board:        createInitialBoard(),
      globalMana:   [5, 5],
      globalMaxMana:[5, 5],
      turnTimer:    20,
      speedQueue,
      queueIndex:   0,
      objectives: {
        manaCrystal: { controlled: false },
        beastCamps:  { hp: [75, 75], maxHp: 75, defeated: [false, false] },
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
    } as ExtState;
  });
}, [gameMode]);

const resetGame = useCallback(() => {
  startBattle(); // Full reset at base HP, no run overrides
}, [startBattle]);

// Cancel targeting helper
const cancelTargeting = useCallback(() => {
  setGameState(prev => ({
    ...prev,
    targetingMode: undefined,
    cardTargetingMode: undefined,
  }));
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










import { useState, useCallback, useEffect } from "react";
import { GameState, Coordinates, Icon, HexTile, TerrainType } from "@/types/game";
import { toast } from "sonner";

// TURN/COMBAT HELPERS (external)
import {
  initSpeedQueue,
  isRoundBoundary,
  countAlliesAdjacentToCrystal,
  findFreeSpawnTile,
  hexDistance,
} from "@/engine/turnEngine";
import { resolveBasicAttackDamage, resolveAbilityDamage } from "@/combat/resolver";
import { calcEffectiveStats } from "@/combat/buffs";

/* =========================
   Board / Icons init
   ========================= */

const createInitialBoard = (): HexTile[] => {
  const board: HexTile[] = [];

  for (let q = -7; q <= 7; q++) {
    const r1 = Math.max(-7, -q - 7);
    const r2 = Math.min(7, -q + 7);

    for (let r = r1; r <= r2; r++) {
      const terrain = getTerrainForPosition(q, r);
      board.push({
        coordinates: { q, r },
        terrain,
        highlighted: false,
        selectable: false,
      });
    }
  }

  return board;
};

type Qr = { q: number; r: number };

function tileKey(q: number, r: number) { return `${q},${r}`; }

function movementCostForTile(tile: HexTile): number {
  // Impassables: mountains/rivers/bases/crystal/beast_camp
  if (tile.terrain.effects.movementModifier === -999) return Infinity;
  if (tile.terrain.type === "forest") return 2;
  // plains, spawn, etc.
  return 1;
}

function neighborsAxial({ q, r }: Qr): Qr[] {
  return [
    { q: q+1, r: r }, { q: q+1, r: r-1 }, { q: q, r: r-1 },
    { q: q-1, r: r }, { q: q-1, r: r+1 }, { q: q, r: r+1 },
  ];
}

/**
 * Dijkstra over the board with costs {plain:1, forest:2}, blocking impassables and occupied hexes.
 * Returns: Map of tileKey -> totalCost from `start` (including entry cost of destination tile).
 */
function reachableWithCosts(
  board: HexTile[],
  start: Qr,
  maxBudget: number,
  occupiedKeys: Set<string>
): Map<string, number> {
  const byKey = new Map(board.map(t => [tileKey(t.coordinates.q, t.coordinates.r), t]));
  const dist = new Map<string, number>();
  const pq: Array<{ key: string; cost: number }> = [];

  const startKey = tileKey(start.q, start.r);
  dist.set(startKey, 0);
  pq.push({ key: startKey, cost: 0 });

  while (pq.length) {
    // pop min
    let minI = 0;
    for (let i = 1; i < pq.length; i++) if (pq[i].cost < pq[minI].cost) minI = i;
    const { key, cost } = pq.splice(minI, 1)[0];

    // Standard Dijkstra stop
    if (cost > (dist.get(key) ?? Infinity)) continue;

    const [qStr, rStr] = key.split(",");
    const pos = { q: parseInt(qStr, 10), r: parseInt(rStr, 10) };

    for (const nb of neighborsAxial(pos)) {
      const nbKey = tileKey(nb.q, nb.r);
      const nbTile = byKey.get(nbKey);
      if (!nbTile) continue;

      // Skip occupied (except the start tile—you can move out of it)
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

  // Remove the start key (standing still is not a "move")
  dist.delete(startKey);
  return dist;
}


const getTerrainForPosition = (q: number, r: number): TerrainType => {
  if (q === 0 && r === 0) {
    return { type: "mana_crystal", effects: { movementModifier: -999 } }; // Impassable
  }

  // Bases
  if ((q === -6 && r === 5) || (q === 6 && r === -5)) {
    return { type: "base", effects: { movementModifier: -999 } }; // Impassable
  }

  // Spawn areas
  if (
    (q >= -6 && q <= -4 && r >= 3 && r <= 5) ||
    (q >= 4 && q <= 6 && r >= -5 && r <= -3)
  ) {
    return { type: "spawn", effects: {} };
  }

  // Beast camps
  if ((q === -2 && r === 2) || (q === 2 && r === -2)) {
    return { type: "beast_camp", effects: { movementModifier: -999 } }; // Impassable until defeated
  }

  // Mountains edges — impassable
  if (Math.abs(q) >= 6 || Math.abs(r) >= 6 || Math.abs(q + r) >= 6) {
    return {
      type: "mountain",
      effects: { rangeBonus: true, blocksLineOfSight: true, movementModifier: -999 },
    };
  }

  // Rivers — impassable
  if ((Math.abs(q + r) === 3 && Math.abs(q) <= 2) || (q === 0 && Math.abs(r) === 4)) {
    return { type: "river", effects: { movementModifier: -999 } };
  }

  // Forest clusters
  const isForest =
    (q >= -4 && q <= -2 && r >= 0 && r <= 2) ||
    (q >= 2 && q <= 4 && r >= -2 && r <= 0) ||
    (q >= -1 && q <= 1 && r >= -3 && r <= -1) ||
    (q >= -1 && q <= 1 && r >= 1 && r <= 3);

  if (isForest) return { type: "forest", effects: { dodgeBonus: true, stealthBonus: true } };

  return { type: "plain", effects: {} };
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

const useGameState = (gameMode: "singleplayer" | "multiplayer" = "singleplayer") => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialIcons = createInitialIcons();
    const speedQueue = initSpeedQueue(initialIcons); // EXTERNAL (array of iconIds)

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
    };
  });

  // Turn timer countdown
  const [currentTurnTimer, setCurrentTurnTimer] = useState(20);

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
     AI Turn (singleplayer)
     ========================= */
  useEffect(() => {
    if (gameState.gameMode !== "singleplayer" || gameState.phase !== "combat") return;

    const activeIcon = gameState.players.flatMap((p) => p.icons).find((i) => i.id === gameState.activeIconId);
    if (!activeIcon || !activeIcon.isAlive || activeIcon.playerId !== 1) return;

    const timer = setTimeout(() => {
      // If already in targeting mode, try to execute immediately
      if (gameState.targetingMode && gameState.targetingMode.iconId === activeIcon.id) {
        const enemies = gameState.players[0].icons.filter((i) => i.isAlive);

        let target: Coordinates | null = null;

        // Units
        for (const enemy of enemies) {
          if (hexDistance(activeIcon.position, enemy.position) <= gameState.targetingMode.range) {
            target = enemy.position;
            break;
          }
        }
        // Enemy base
        if (!target) {
          const enemyBase = gameState.board.find((t) => t.terrain.type === "base" && t.coordinates.q === -6 && t.coordinates.r === 5);
          if (enemyBase && hexDistance(activeIcon.position, enemyBase.coordinates) <= gameState.targetingMode.range) {
            target = enemyBase.coordinates;
          }
        }
        // Beast camps
        if (!target) {
          const camps = [{ q: -2, r: 2 }, { q: 2, r: -2 }];
          for (const c of camps) {
            if (hexDistance(activeIcon.position, c) <= gameState.targetingMode.range) {
              target = c;
              break;
            }
          }
        }

        if (target) {
          // Execute
          setGameState((prev) => {
            const targetIcon = prev.players.flatMap((p) => p.icons).find((ic) => ic.isAlive && ic.position.q === target!.q && ic.position.r === target!.r);

            let updatedPlayers = prev.players;
            let updatedBaseHealth = [...prev.baseHealth];
            let updatedObjectives = { ...prev.objectives };

            if (prev.targetingMode!.abilityId === "basic_attack") {
              if (targetIcon) {
                const damage = resolveBasicAttackDamage(prev, activeIcon, targetIcon);
                updatedPlayers = prev.players.map((player) => ({
                  ...player,
                  icons: player.icons.map((ic) => {
                    if (ic.id !== targetIcon.id) return ic;
                    const newHp = Math.max(0, ic.stats.hp - damage);
                    return { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 3 };
                  }),
                }));
              } else {
                // ENV (base/camp) → Might vs 0 DEF, min 0.1
                const envDamage = Math.max(0.1, calcEffectiveStats(prev, activeIcon).might);
                if (target.q === -6 && target.r === 5) {
                  updatedBaseHealth[0] = Math.max(0, prev.baseHealth[0] - envDamage);
                } else if (target.q === 6 && target.r === -5) {
                  updatedBaseHealth[1] = Math.max(0, prev.baseHealth[1] - envDamage);
                } else {
                  // camp
                  const campIndex = target.q === -2 && target.r === 2 ? 0 : target.q === 2 && target.r === -2 ? 1 : -1;
                  if (campIndex !== -1 && !prev.objectives.beastCamps.defeated[campIndex]) {
                    const newHp = Math.max(0, prev.objectives.beastCamps.hp[campIndex] - envDamage);
                    const hpArr = [...prev.objectives.beastCamps.hp];
                    const defArr = [...prev.objectives.beastCamps.defeated];
                    hpArr[campIndex] = newHp;

                    if (newHp <= 0 && !defArr[campIndex]) {
                      defArr[campIndex] = true;

                      const updatedBoard = prev.board.map((tile) =>
                        tile.coordinates.q === target!.q && tile.coordinates.r === target!.r
                          ? { ...tile, terrain: { type: "plain", effects: {} } }
                          : tile
                      );

                      const newMight = [...prev.teamBuffs.mightBonus];
                      const newPower = [...prev.teamBuffs.powerBonus];
                      newMight[activeIcon.playerId] = Math.min((newMight[activeIcon.playerId] ?? 0) + 15, 30);
                      newPower[activeIcon.playerId] = Math.min((newPower[activeIcon.playerId] ?? 0) + 15, 30);

                      return {
                        ...prev,
                        board: updatedBoard,
                        players: prev.players.map((p) => ({
                          ...p,
                          icons: p.icons.map((ic) => (ic.id === activeIcon.id ? { ...ic, actionTaken: true } : ic)),
                        })),
                        objectives: { ...prev.objectives, beastCamps: { ...prev.objectives.beastCamps, hp: hpArr, defeated: defArr } },
                        teamBuffs: { mightBonus: newMight, powerBonus: newPower },
                        targetingMode: undefined,
                        baseHealth: updatedBaseHealth,
                      };
                    } else {
                      updatedObjectives = { ...prev.objectives, beastCamps: { ...prev.objectives.beastCamps, hp: hpArr, defeated: defArr } };
                    }
                  }
                }
              }
            } else {
              // Ability
              const ability = activeIcon.abilities.find((a) => a.id === prev.targetingMode!.abilityId);
              if (ability) {
                if (targetIcon) {
                  const dmg =
                    typeof ability.damage === "number" && ability.damage > 0
                      ? ability.damage
                      : resolveAbilityDamage(prev, activeIcon, targetIcon, 1.0);

                  updatedPlayers = prev.players.map((player) => ({
                    ...player,
                    icons: player.icons.map((ic) => {
                      if (ic.id !== targetIcon.id) return ic;
                      const newHp = Math.max(0, ic.stats.hp - dmg);
                      return { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 3 };
                    }),
                  }));
                } else {
                  // ENV → Power vs 0 DEF
                  const envDamage = Math.max(0.1, calcEffectiveStats(prev, activeIcon).power);
                  if (target.q === -6 && target.r === 5) {
                    updatedBaseHealth[0] = Math.max(0, prev.baseHealth[0] - envDamage);
                  } else if (target.q === 6 && target.r === -5) {
                    updatedBaseHealth[1] = Math.max(0, prev.baseHealth[1] - envDamage);
                  } else {
                    const campIndex = target.q === -2 && target.r === 2 ? 0 : target.q === 2 && target.r === -2 ? 1 : -1;
                    if (campIndex !== -1 && !prev.objectives.beastCamps.defeated[campIndex]) {
                      const newHp = Math.max(0, prev.objectives.beastCamps.hp[campIndex] - envDamage);
                      const hpArr = [...prev.objectives.beastCamps.hp];
                      const defArr = [...prev.objectives.beastCamps.defeated];
                      hpArr[campIndex] = newHp;

                      if (newHp <= 0 && !defArr[campIndex]) {
                        defArr[campIndex] = true;

                        const updatedBoard = prev.board.map((tile) =>
                          tile.coordinates.q === target!.q && tile.coordinates.r === target!.r
                            ? { ...tile, terrain: { type: "plain", effects: {} } }
                            : tile
                        );

                        const newMight = [...prev.teamBuffs.mightBonus];
                        const newPower = [...prev.teamBuffs.powerBonus];
                        newMight[activeIcon.playerId] = Math.min((newMight[activeIcon.playerId] ?? 0) + 15, 30);
                        newPower[activeIcon.playerId] = Math.min((newPower[activeIcon.playerId] ?? 0) + 15, 30);

                        toast.success("Beast Camp defeated! Team gains +15% Might and Power!");

                        return {
                          ...prev,
                          board: updatedBoard,
                          players: prev.players.map((p) => ({
                            ...p,
                            icons: p.icons.map((ic) => (ic.id === activeIcon.id ? { ...ic, actionTaken: true } : ic)),
                          })),
                          objectives: { ...prev.objectives, beastCamps: { ...prev.objectives.beastCamps, hp: hpArr, defeated: defArr } },
                          teamBuffs: { mightBonus: newMight, powerBonus: newPower },
                          targetingMode: undefined,
                          baseHealth: updatedBaseHealth,
                        };
                      } else {
                        updatedObjectives = { ...prev.objectives, beastCamps: { ...prev.objectives.beastCamps, hp: hpArr, defeated: defArr } };
                      }
                    }
                  }
                }

                if (ability.id === "ultimate") {
                  updatedPlayers = updatedPlayers.map((p) => ({
                    ...p,
                    icons: p.icons.map((ic) => (ic.id === activeIcon.id ? { ...ic, ultimateUsed: true } : ic)),
                  }));
                }
              }
            }

            // Consume mana
            const manaCost =
              prev.targetingMode!.abilityId === "basic_attack"
                ? 0
                : activeIcon.abilities.find((a) => a.id === prev.targetingMode!.abilityId)?.manaCost || 0;

            return {
              ...prev,
              players: updatedPlayers.map((p) => ({
                ...p,
                icons: p.icons.map((ic) => (ic.id === activeIcon.id ? { ...ic, actionTaken: true } : ic)),
              })),
              baseHealth: updatedBaseHealth,
              objectives: updatedObjectives,
              targetingMode: undefined,
              globalMana: prev.globalMana.map((m, idx) => (idx === activeIcon.playerId ? Math.max(0, m - manaCost) : m)),
            };
          });
          return;
        }
      }

      // Otherwise: basic AI — try basic, else move closer, else end
      const enemies = gameState.players[0].icons.filter((i) => i.isAlive);
      const attackRange = activeIcon.name === "Napoleon-chan" || activeIcon.name === "Da Vinci-chan" ? 2 : 1;

      // Try immediate basic attack (set targeting then next tick will execute)
      for (const enemy of enemies) {
        if (hexDistance(activeIcon.position, enemy.position) <= attackRange && !activeIcon.actionTaken) {
          setGameState((prev) => ({
            ...prev,
            targetingMode: { abilityId: "basic_attack", iconId: activeIcon.id, range: attackRange },
          }));
          return;
        }
      }

      // Try to move closer (NOTE: uses raw hex distance; your BFS mover still governs in RangeIndicator)
      // Try to move closer (terrain-aware cost)
if (!activeIcon.movedThisTurn && activeIcon.stats.movement > 0) {
  setGameState((prev) => {
    const me = prev.players.flatMap(p => p.icons).find(i => i.id === activeIcon.id);
    if (!me) return prev;

    const budget = Math.min(me.stats.movement, me.stats.moveRange);

    const occupiedKeys = new Set(
      prev.players
        .flatMap(p => p.icons)
        .filter(ic => ic.isAlive && ic.id !== me.id)
        .map(ic => `${ic.position.q},${ic.position.r}`)
    );

    const costMap = reachableWithCosts(prev.board, me.position, budget, occupiedKeys);
    if (costMap.size === 0 || enemies.length === 0) return prev;

    // Choose the reachable tile that minimizes raw hex distance to the closest enemy
    // (You can switch to path-cost heuristics later if you want.)
    let best: { coord: Coordinates; score: number; cost: number } | null = null;

    for (const [key, cost] of costMap.entries()) {
      const [qStr, rStr] = key.split(",");
      const cand: Coordinates = { q: parseInt(qStr, 10), r: parseInt(rStr, 10) };
      // distance to nearest enemy (raw hex distance is fine for targeting)
      let minD = Infinity;
      for (const e of enemies) {
        const d = hexDistance(cand, e.position);
        if (d < minD) minD = d;
      }
      const score = minD; // lower is better
      if (!best || score < best.score) best = { coord: cand, score, cost };
    }

    if (!best) return prev;

    return {
      ...prev,
      players: prev.players.map((p) => ({
        ...p,
        icons: p.icons.map((ic) =>
          ic.id === me.id
            ? {
                ...ic,
                position: best!.coord,
                movedThisTurn: true,
                stats: {
                  ...ic.stats,
                  movement: Math.max(0, ic.stats.movement - best!.cost),
                },
              }
            : ic
        ),
      })),
    };
  });
  return;
}


      // End turn if nothing else
      endTurn();
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.activeIconId, gameState.gameMode, gameState.targetingMode, gameState.phase]);

  /* =========================
     Input handlers
     ========================= */

  const selectTile = useCallback((coordinates: Coordinates) => {
    setGameState((prev) => {
      const activeIcon = prev.players.flatMap((p) => p.icons).find((i) => i.id === prev.activeIconId);
      if (!activeIcon) return prev;

      // Prevent controlling AI in singleplayer
      if (prev.gameMode === "singleplayer" && activeIcon.playerId === 1) return prev;

      // Targeting path
      if (prev.targetingMode) {
        const distance = hexDistance(activeIcon.position, coordinates);
        if (distance > prev.targetingMode.range) return prev;

        const targetIcon = prev.players.flatMap((p) => p.icons).find(
          (ic) => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r
        );

        let updatedPlayers = prev.players;
        let updatedBaseHealth = [...prev.baseHealth];
        let updatedObjectives = { ...prev.objectives };

        if (prev.targetingMode.abilityId === "basic_attack") {
          if (targetIcon) {
            if (targetIcon.playerId === activeIcon.playerId) {
              toast.error("Cannot attack your own character!");
              return prev;
            }
            const damage = resolveBasicAttackDamage(prev, activeIcon, targetIcon);
            updatedPlayers = prev.players.map((player) => ({
              ...player,
              icons: player.icons.map((ic) => {
                if (ic.id !== targetIcon.id) return ic;
                const newHp = Math.max(0, ic.stats.hp - damage);
                return { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 3 };
              }),
            }));
          } else {
            // base/camp — Might vs ENV
            const envDamage = Math.max(0.1, calcEffectiveStats(prev, activeIcon).might);

            const baseTile = prev.board.find(
              (t) => t.terrain.type === "base" && t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r
            );
            if (baseTile) {
              const isP1Base = coordinates.q === -6 && coordinates.r === 5;
              const isP2Base = coordinates.q === 6 && coordinates.r === -5;
              const myBase = (activeIcon.playerId === 0 && isP1Base) || (activeIcon.playerId === 1 && isP2Base);
              if (myBase) {
                toast.error("Cannot attack your own base!");
                return prev;
              }
              const enemyId = activeIcon.playerId === 0 ? 1 : 0;
              updatedBaseHealth[enemyId] = Math.max(0, prev.baseHealth[enemyId] - envDamage);
            } else {
              // Beast camp
              const campTile = prev.board.find(
                (t) => t.terrain.type === "beast_camp" && t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r
              );
              if (campTile) {
                const campIndex = coordinates.q === -2 && coordinates.r === 2 ? 0 : coordinates.q === 2 && coordinates.r === -2 ? 1 : -1;

                if (campIndex !== -1 && !prev.objectives.beastCamps.defeated[campIndex]) {
                  const newHp = Math.max(0, prev.objectives.beastCamps.hp[campIndex] - envDamage);
                  const hpArr = [...prev.objectives.beastCamps.hp];
                  const defArr = [...prev.objectives.beastCamps.defeated];
                  hpArr[campIndex] = newHp;

                  if (newHp <= 0 && !defArr[campIndex]) {
                    defArr[campIndex] = true;

                    const updatedBoard = prev.board.map((tile) =>
                      tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
                        ? { ...tile, terrain: { type: "plain", effects: {} } }
                        : tile
                    );

                    const newMight = [...prev.teamBuffs.mightBonus];
                    const newPower = [...prev.teamBuffs.powerBonus];
                    newMight[activeIcon.playerId] = Math.min((newMight[activeIcon.playerId] ?? 0) + 15, 30);
                    newPower[activeIcon.playerId] = Math.min((newPower[activeIcon.playerId] ?? 0) + 15, 30);

                    toast.success("Beast Camp defeated! Team gains +15% Might and Power!");

                    return {
                      ...prev,
                      board: updatedBoard,
                      players: prev.players.map((p) => ({
                        ...p,
                        icons: p.icons.map((ic) => (ic.id === activeIcon.id ? { ...ic, actionTaken: true } : ic)),
                      })),
                      objectives: { ...prev.objectives, beastCamps: { ...prev.objectives.beastCamps, hp: hpArr, defeated: defArr } },
                      teamBuffs: { mightBonus: newMight, powerBonus: newPower },
                      targetingMode: undefined,
                    };
                  } else {
                    updatedObjectives = { ...prev.objectives, beastCamps: { ...prev.objectives.beastCamps, hp: hpArr, defeated: defArr } };
                  }
                }
              } else {
                toast.error("No target to attack!");
                return prev;
              }
            }
          }
        } else {
          // Ability path
          const ability = activeIcon.abilities.find((a) => a.id === prev.targetingMode!.abilityId);
          if (!ability) return prev;

          if (typeof ability.damage === "number" && ability.damage > 0) {
            if (targetIcon) {
              const dmg =
                ability.damage > 0 ? ability.damage : resolveAbilityDamage(prev, activeIcon, targetIcon, 1.0);

              updatedPlayers = prev.players.map((player) => ({
                ...player,
                icons: player.icons.map((ic) => {
                  if (ic.id !== targetIcon.id) return ic;
                  const newHp = Math.max(0, ic.stats.hp - dmg);
                  return { ...ic, stats: { ...ic.stats, hp: newHp }, isAlive: newHp > 0, respawnTurns: newHp > 0 ? ic.respawnTurns : 3 };
                }),
              }));
            } else {
              // ENV → Power
              const envDamage = Math.max(0.1, calcEffectiveStats(prev, activeIcon).power);

              const isP1Base = coordinates.q === -6 && coordinates.r === 5;
              const isP2Base = coordinates.q === 6 && coordinates.r === -5;
              if (isP1Base || isP2Base) {
                const myBase = (activeIcon.playerId === 0 && isP1Base) || (activeIcon.playerId === 1 && isP2Base);
                if (myBase) {
                  toast.error("Cannot attack your own base!");
                  return prev;
                }
                const enemyId = activeIcon.playerId === 0 ? 1 : 0;
                updatedBaseHealth[enemyId] = Math.max(0, prev.baseHealth[enemyId] - envDamage);
              } else {
                const campIndex = coordinates.q === -2 && coordinates.r === 2 ? 0 : coordinates.q === 2 && coordinates.r === -2 ? 1 : -1;
                if (campIndex !== -1 && !prev.objectives.beastCamps.defeated[campIndex]) {
                  const newHp = Math.max(0, prev.objectives.beastCamps.hp[campIndex] - envDamage);
                  const hpArr = [...prev.objectives.beastCamps.hp];
                  const defArr = [...prev.objectives.beastCamps.defeated];
                  hpArr[campIndex] = newHp;

                  if (newHp <= 0 && !defArr[campIndex]) {
                    defArr[campIndex] = true;

                    const updatedBoard = prev.board.map((tile) =>
                      tile.coordinates.q === coordinates.q && tile.coordinates.r === coordinates.r
                        ? { ...tile, terrain: { type: "plain", effects: {} } }
                        : tile
                    );

                    const newMight = [...prev.teamBuffs.mightBonus];
                    const newPower = [...prev.teamBuffs.powerBonus];
                    newMight[activeIcon.playerId] = Math.min((newMight[activeIcon.playerId] ?? 0) + 15, 30);
                    newPower[activeIcon.playerId] = Math.min((newPower[activeIcon.playerId] ?? 0) + 15, 30);

                    toast.success("Beast Camp defeated! Team gains +15% Might and Power!");

                    return {
                      ...prev,
                      board: updatedBoard,
                      players: prev.players.map((p) => ({
                        ...p,
                        icons: p.icons.map((ic) => (ic.id === activeIcon.id ? { ...ic, actionTaken: true } : ic)),
                      })),
                      objectives: { ...prev.objectives, beastCamps: { ...prev.objectives.beastCamps, hp: hpArr, defeated: defArr } },
                      teamBuffs: { mightBonus: newMight, powerBonus: newPower },
                      targetingMode: undefined,
                    };
                  } else {
                    updatedObjectives = { ...prev.objectives, beastCamps: { ...prev.objectives.beastCamps, hp: hpArr, defeated: defArr } };
                  }
                }
              }
            }

            if (ability.id === "ultimate") {
              updatedPlayers = updatedPlayers.map((p) => ({
                ...p,
                icons: p.icons.map((ic) => (ic.id === activeIcon.id ? { ...ic, ultimateUsed: true } : ic)),
              }));
            }
          } else if (typeof ability.healing === "number" && ability.healing > 0) {
            // Heal ally only
            if (!targetIcon || targetIcon.playerId !== activeIcon.playerId) {
              toast.error("Healing can only target allies!");
              return prev;
            }
            updatedPlayers = prev.players.map((player) => ({
              ...player,
              icons: player.icons.map((ic) => {
                if (ic.id !== targetIcon.id) return ic;
                const newHp = Math.min(ic.stats.maxHp, ic.stats.hp + ability.healing!);
                return { ...ic, stats: { ...ic.stats, hp: newHp } };
              }),
            }));
          } else {
            // non-damaging, non-heal ability: consume mana + mark used (already handled below)
          }
        }

        // Consume mana if ability (not basic attack)
        const manaCost =
          prev.targetingMode.abilityId === "basic_attack"
            ? 0
            : activeIcon.abilities.find((a) => a.id === prev.targetingMode!.abilityId)?.manaCost || 0;

        return {
          ...prev,
          players: updatedPlayers.map((p) => ({
            ...p,
            icons: p.icons.map((ic) => (ic.id === activeIcon.id ? { ...ic, actionTaken: true } : ic)),
          })),
          baseHealth: updatedBaseHealth,
          objectives: updatedObjectives,
          globalMana: prev.globalMana.map((m, idx) => (idx === activeIcon.playerId ? Math.max(0, m - manaCost) : m)),
          targetingMode: undefined,
        };
      }

      // No targeting → movement or selection
      const clickedIcon = prev.players.flatMap((p) => p.icons).find(
        (i) => i.isAlive && i.position.q === coordinates.q && i.position.r === coordinates.r
      );
      if (clickedIcon && clickedIcon.id === prev.activeIconId) {
        return { ...prev, selectedIcon: clickedIcon.id };
      }

      const destinationTile = prev.board.find((t) => t.coordinates.q === coordinates.q && t.coordinates.r === coordinates.r);
      if (!destinationTile) return prev;
      if (destinationTile.terrain.effects.movementModifier === -999) return prev; // impassable

      const occupied = prev.players.flatMap((p) => p.icons).some((ic) => ic.isAlive && ic.position.q === coordinates.q && ic.position.r === coordinates.r);
      if (occupied) return prev;

      // movement limited by remaining movement + moveRange (terrain BFS handled elsewhere for indicators)
      // movement limited by terrain-aware cost (plain=1, forest=2), capped by both movement and moveRange
const budget = Math.min(activeIcon.stats.movement, activeIcon.stats.moveRange);

// Build occupied set (exclude the moving unit’s current tile so it can step out)
const occupiedKeys = new Set(
  prev.players
    .flatMap(p => p.icons)
    .filter(ic => ic.isAlive && ic.id !== activeIcon.id)
    .map(ic => `${ic.position.q},${ic.position.r}`)
);

// Dijkstra from current position
const costMap = reachableWithCosts(prev.board, activeIcon.position, budget, occupiedKeys);
const destKey = `${coordinates.q},${coordinates.r}`;
const moveCost = costMap.get(destKey);
if (moveCost === undefined) return prev; // not reachable this turn

return {
  ...prev,
  players: prev.players.map((p) => ({
    ...p,
    icons: p.icons.map((ic) =>
      ic.id === activeIcon.id
        ? {
            ...ic,
            position: coordinates,
            movedThisTurn: true,
            stats: {
              ...ic.stats,
              movement: Math.max(0, ic.stats.movement - moveCost),
            },
          }
        : ic
    ),
  })),
  selectedIcon: undefined,
};


  const useAbility = useCallback((abilityId: string) => {
    setGameState((prev) => {
      const activeIcon = prev.players.flatMap((p) => p.icons).find((i) => i.id === prev.activeIconId);
      if (!activeIcon || activeIcon.actionTaken) return prev;

      const ability = activeIcon.abilities.find((a) => a.id === abilityId);
      if (!ability) return prev;
      if (abilityId === "ultimate" && activeIcon.ultimateUsed) return prev;

      if (prev.globalMana[activeIcon.playerId] < ability.manaCost) {
        toast.error("Not enough mana!");
        return prev;
      }

      return { ...prev, targetingMode: { abilityId, iconId: activeIcon.id, range: ability.range } };
    });
  }, []);

  const basicAttack = useCallback(() => {
    setGameState((prev) => {
      const activeIcon = prev.players.flatMap((p) => p.icons).find((i) => i.id === prev.activeIconId);
      if (!activeIcon || activeIcon.actionTaken) return prev;

      const range = activeIcon.name === "Napoleon-chan" || activeIcon.name === "Da Vinci-chan" ? 2 : 1;
      return { ...prev, targetingMode: { abilityId: "basic_attack", iconId: activeIcon.id, range } };
    });
  }, []);

  const endTurn = useCallback(() => {
    setCurrentTurnTimer(20);
    setGameState((prev) => {
      if (!prev.speedQueue.length) return prev;

      // 1) reset current icon ONLY (no respawn tick here!)
      const updatedPlayers = prev.players.map((player) => ({
        ...player,
        icons: player.icons.map((ic) =>
          ic.id === prev.activeIconId
            ? { ...ic, actionTaken: false, movedThisTurn: false, stats: { ...ic.stats, movement: ic.stats.moveRange } }
            : ic
        ),
      }));

      // 2) next index in stable queue
      let nextIndex = (prev.queueIndex + 1) % prev.speedQueue.length;

      // 3) Round boundary?
      const roundBoundary =
        typeof isRoundBoundary === "function"
          ? isRoundBoundary(prev.queueIndex, nextIndex, prev.speedQueue)
          : nextIndex === 0;

      let mana = [...prev.globalMana];
      let playersAfterRespawn = updatedPlayers;
      let nextTurn = prev.currentTurn;

      if (roundBoundary) {
        // Mana: +1 baseline + adjacency, capped to +4 total gain per round
        mana = mana.map((m, pid) => {
          const adj = countAlliesAdjacentToCrystal({ ...prev, players: playersAfterRespawn } as GameState, pid);
          const gain = Math.min(4, 1 + adj);
          return m + gain;
        });

        // Respawn tick ONCE per round, then auto-respawn anyone at 0
        playersAfterRespawn = playersAfterRespawn.map((player) => ({
          ...player,
          icons: player.icons.map((ic) => (!ic.isAlive && ic.respawnTurns > 0 ? { ...ic, respawnTurns: ic.respawnTurns - 1 } : ic)),
        }));

        playersAfterRespawn = playersAfterRespawn.map((player) => ({
          ...player,
          icons: player.icons.map((ic) => {
            if (!ic.isAlive && ic.respawnTurns <= 0) {
              const free = findFreeSpawnTile(prev.board, { ...prev, players: playersAfterRespawn } as GameState, player.id);
              if (free) {
                return { ...ic, isAlive: true, position: free, stats: { ...ic.stats, hp: ic.stats.maxHp, movement: 0 }, respawnTurns: 0 };
              }
            }
            return ic;
          }),
        }));

        nextTurn = prev.currentTurn + 1;
      }

      // 4) pick next active — skip dead but keep queue intact (UI greys them)
      let activeIdx = nextIndex;
      let safety = prev.speedQueue.length;
      let nextActiveId = prev.speedQueue[activeIdx];

      const allIcons = playersAfterRespawn.flatMap((p) => p.icons);
      while (safety-- > 0) {
        const ic = allIcons.find((i) => i.id === nextActiveId);
        if (ic?.isAlive) break;
        activeIdx = (activeIdx + 1) % prev.speedQueue.length;
        nextActiveId = prev.speedQueue[activeIdx];
      }

      // 5) victory conditions
      const baseHealth = [...prev.baseHealth];
      const p1Alive = playersAfterRespawn[0].icons.some((ic) => ic.isAlive);
      const p2Alive = playersAfterRespawn[1].icons.some((ic) => ic.isAlive);

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
        players: playersAfterRespawn,
        globalMana: mana,
        queueIndex: activeIdx,
        activeIconId: nextActiveId,
        currentTurn: nextTurn,
        selectedIcon: undefined,
        targetingMode: undefined,
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

  // Stub: your project’s real per-step undo logic lives elsewhere
  const undoMovement = useCallback(() => setGameState((prev) => prev), []);

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

  return {
    gameState,
    selectTile,
    useAbility,
    endTurn,
    basicAttack,
    respawnCharacter,
    currentTurnTimer,
    selectIcon,
    undoMovement,          // hook to your real undo logic
    startRespawnPlacement,
  };
}
export default useGameState;




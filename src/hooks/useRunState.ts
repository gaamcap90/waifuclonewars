// src/hooks/useRunState.ts
import { useState, useCallback } from "react";
import {
  RunState, CharacterId, RunItem, CombatResult, PendingRewards,
} from "@/types/roguelike";
import {
  generateActMap, buildStartingCharacters, SHARED_STARTING_CARDS, CHARACTER_STARTING_CARDS,
  XP_TO_NEXT, pickCardRewards, pickItemReward,
} from "@/data/roguelikeData";

function seededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

function makeInitialRunState(seed: number, selectedIds: string[]): RunState {
  const map = generateActMap(seed, 1);
  const row0Ids = map.filter(n => n.row === 0).map(n => n.id);

  // Only include characters that were selected
  const allChars = buildStartingCharacters();
  const characters = selectedIds.length > 0
    ? allChars.filter(c => selectedIds.includes(c.id))
    : allChars;

  // Build starting deck: shared cards + one ability card per selected character
  const deckCardIds: string[] = [
    ...SHARED_STARTING_CARDS,
    ...selectedIds.map(id => CHARACTER_STARTING_CARDS[id]).filter(Boolean),
  ];

  return {
    seed, act: 1, gold: 50,
    currentNodeId: null,
    completedNodeIds: [],
    unlockedNodeIds: row0Ids,
    map,
    characters,
    deckCardIds,
    pendingRewards: null,
    permanentlyDeadIds: [],
    battleCount: 0,
  };
}

export function useRunState() {
  const [runState, setRunState] = useState<RunState | null>(null);

  const startRun = useCallback((selectedIds: string[] = []) => {
    const seed = Date.now() & 0xffffff;
    setRunState(makeInitialRunState(seed, selectedIds));
  }, []);

  const abandonRun = useCallback(() => {
    setRunState(null);
  }, []);

  // Called when a combat node is entered (before the fight starts)
  const enterNode = useCallback((nodeId: string) => {
    setRunState(prev => {
      if (!prev) return prev;
      const node = prev.map.find(n => n.id === nodeId);
      if (!node) return { ...prev, currentNodeId: nodeId };
      // Lock all other unlocked nodes in the same row — once you pick a path, siblings are gone
      const newUnlocked = prev.unlockedNodeIds.filter(uid => {
        if (uid === nodeId) return true;
        const sibling = prev.map.find(n => n.id === uid);
        return sibling?.row !== node.row;
      });
      return { ...prev, currentNodeId: nodeId, unlockedNodeIds: newUnlocked };
    });
  }, []);

  // Called when combat ends — computes rewards and stores them as pending
  const completeCombat = useCallback((result: CombatResult) => {
    setRunState(prev => {
      if (!prev) return prev;
      const node = prev.map.find(n => n.id === result.nodeId);
      if (!node || !node.encounter) return prev;

      const enc = node.encounter;
      const rng = seededRng(prev.seed ^ result.nodeId.charCodeAt(0));

      let baseXp = enc.xpReward;
      if (!result.won) baseXp = 0;
      // Bonus XP
      const noHitBonus = Object.values(result.finalHps).every((hp, i) => {
        const base = prev.characters[i]?.maxHp ?? 100;
        return hp >= base; // no damage taken if HP didn't decrease... simplified
      }) ? enc.bonusXpNoHit : 0;
      const fastBonus = result.turnsElapsed <= 4 ? enc.bonusXpFast : 0;
      const totalXp = baseXp + noHitBonus + fastBonus;
      const goldEarned = result.won ? enc.goldReward : Math.floor(enc.goldReward * 0.3);

      // Item drop — boss fights give one rare item per living character
      let itemDrop: RunItem | undefined;
      let bossItems: RunItem[] | undefined;
      if (result.won && node.type === 'boss') {
        const livingChars = prev.characters.filter(c => (result.finalHps[c.id] ?? 0) > 0);
        bossItems = livingChars.map(() => pickItemReward('rare', rng));
      } else if (result.won && enc.guaranteedItem) {
        itemDrop = pickItemReward('uncommon', rng);
      } else if (result.won && rng() < enc.itemDropChance) {
        itemDrop = pickItemReward('common', rng);
      }

      // Card choices
      const cardChoices = result.won ? pickCardRewards(prev.deckCardIds, rng) : [];

      const pending: PendingRewards = {
        gold: goldEarned,
        xp: totalXp,
        cardChoices,
        itemDrop,
        bossItems,
      };

      // Update character HPs + track permanent deaths
      const newDeadIds = prev.characters
        .filter(c => (result.finalHps[c.id] ?? 1) <= 0 && !prev.permanentlyDeadIds.includes(c.id))
        .map(c => c.id);

      const chars = prev.characters.map(c => {
        const newHp = result.finalHps[c.id] ?? c.currentHp;
        if (newHp <= 0) {
          // Strip all items from dead characters
          return { ...c, currentHp: 0, items: [null, null, null, null, null] };
        }
        return { ...c, currentHp: newHp };
      });

      return {
        ...prev,
        characters: chars,
        completedNodeIds: [...prev.completedNodeIds, result.nodeId],
        currentNodeId: null,
        pendingRewards: pending,
        permanentlyDeadIds: [...prev.permanentlyDeadIds, ...newDeadIds] as any,
        battleCount: prev.battleCount + 1,
      };
    });
  }, []);

  // Called when player finishes the rewards screen
  const collectRewards = useCallback((
    chosenCardId: string | null,
    equipItem: { characterId: CharacterId; slotIndex: number; item: RunItem } | null,
  ) => {
    setRunState(prev => {
      if (!prev?.pendingRewards) return prev;
      const r = prev.pendingRewards;

      // Add gold
      const newGold = prev.gold + r.gold;

      // Add card to deck
      const newDeck = chosenCardId
        ? [...prev.deckCardIds, chosenCardId]
        : prev.deckCardIds;

      // Apply XP and check level ups
      const chars = prev.characters.map(c => {
        let { xp, level, xpToNext, pendingStatPoints } = c;
        xp += r.xp;
        while (xp >= xpToNext && level < 6) {
          xp -= xpToNext;
          level++;
          xpToNext = XP_TO_NEXT[level] ?? 9999;
          pendingStatPoints += 2;
        }
        return { ...c, xp, level, xpToNext, pendingStatPoints };
      });

      // Equip normal item
      let charsWithItem = equipItem
        ? chars.map(c => {
            if (c.id !== equipItem.characterId) return c;
            const items = [...c.items];
            items[equipItem.slotIndex] = equipItem.item;
            return { ...c, items };
          })
        : chars;

      // Auto-equip boss items — one item per living character, first available slot
      if (r.bossItems && r.bossItems.length > 0) {
        const livingChars = charsWithItem.filter(c => c.currentHp > 0);
        r.bossItems.forEach((item, idx) => {
          const target = livingChars[idx];
          if (!target) return;
          charsWithItem = charsWithItem.map(c => {
            if (c.id !== target.id) return c;
            const items = [...c.items];
            const emptySlot = items.findIndex(s => s === null);
            if (emptySlot !== -1) items[emptySlot] = item;
            else items[4] = item; // replace last slot if full
            return { ...c, items };
          });
        });
      }

      // Check if a boss was just completed → advance to next act
      const bossJustCompleted = prev.map.some(n => n.type === 'boss' && prev.completedNodeIds.includes(n.id));
      if (bossJustCompleted && prev.act < 3) {
        const newAct = (prev.act + 1) as 1 | 2 | 3;
        const newMap = generateActMap(prev.seed + newAct * 12345, newAct);
        const newRow0Ids = newMap.filter(n => n.row === 0).map(n => n.id);
        return {
          ...prev,
          act: newAct,
          map: newMap,
          completedNodeIds: [],
          unlockedNodeIds: newRow0Ids,
          gold: newGold,
          deckCardIds: newDeck,
          characters: charsWithItem,
          pendingRewards: null,
        };
      }

      // Unlock next nodes
      const newUnlocked = [...prev.unlockedNodeIds];
      prev.completedNodeIds.forEach(completedId => {
        const done = prev.map.find(n => n.id === completedId);
        if (done) {
          done.connections.forEach(cid => {
            if (!newUnlocked.includes(cid)) newUnlocked.push(cid);
          });
        }
      });

      return {
        ...prev,
        gold: newGold,
        deckCardIds: newDeck,
        characters: charsWithItem,
        unlockedNodeIds: newUnlocked,
        pendingRewards: null,
      };
    });
  }, []);

  // Allocate a stat point to a specific character
  const allocateStatPoint = useCallback((
    characterId: CharacterId,
    stat: 'hp' | 'might' | 'power' | 'defense',
  ) => {
    setRunState(prev => {
      if (!prev) return prev;
      const amount = stat === 'hp' ? 8 : stat === 'defense' ? 5 : 5;
      return {
        ...prev,
        characters: prev.characters.map(c => {
          if (c.id !== characterId || c.pendingStatPoints <= 0) return c;
          return {
            ...c,
            pendingStatPoints: c.pendingStatPoints - 1,
            maxHp: stat === 'hp' ? c.maxHp + amount : c.maxHp,
            currentHp: stat === 'hp' ? c.currentHp + amount : c.currentHp,
            statBonuses: { ...c.statBonuses, [stat]: c.statBonuses[stat] + amount },
          };
        }),
      };
    });
  }, []);

  // Called when a non-combat node is completed (campfire, merchant, treasure, unknown)
  const completeNonCombatNode = useCallback((nodeId: string) => {
    setRunState(prev => {
      if (!prev) return prev;
      const completedNodeIds = [...prev.completedNodeIds, nodeId];
      const newUnlocked = [...prev.unlockedNodeIds];
      completedNodeIds.forEach(completedId => {
        const done = prev.map.find(n => n.id === completedId);
        if (done) {
          done.connections.forEach(cid => {
            if (!newUnlocked.includes(cid)) newUnlocked.push(cid);
          });
        }
      });
      return { ...prev, completedNodeIds, currentNodeId: null, unlockedNodeIds: newUnlocked };
    });
  }, []);

  const spendGold = useCallback((amount: number): boolean => {
    let success = false;
    setRunState(prev => {
      if (!prev || prev.gold < amount) return prev;
      success = true;
      return { ...prev, gold: prev.gold - amount };
    });
    return success;
  }, []);

  const addGold = useCallback((amount: number) => {
    setRunState(prev => prev ? { ...prev, gold: prev.gold + amount } : prev);
  }, []);

  const addCardToDeck = useCallback((cardId: string) => {
    setRunState(prev => prev ? { ...prev, deckCardIds: [...prev.deckCardIds, cardId] } : prev);
  }, []);

  // Hurt all living characters by amount (minimum 1 HP — unknown events can't kill outright)
  const hurtAllCharacters = useCallback((amount: number) => {
    setRunState(prev => prev ? {
      ...prev,
      characters: prev.characters.map(c => ({
        ...c,
        currentHp: Math.max(1, c.currentHp - amount),
      })),
    } : prev);
  }, []);

  const healAtCampfire = useCallback((characterId: CharacterId) => {
    setRunState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        characters: prev.characters.map(c => {
          if (c.id !== characterId) return c;
          const healAmount = Math.floor(c.maxHp * 0.30);
          return { ...c, currentHp: Math.min(c.maxHp, c.currentHp + healAmount) };
        }),
      };
    });
  }, []);

  return {
    runState,
    startRun,
    abandonRun,
    enterNode,
    completeCombat,
    completeNonCombatNode,
    collectRewards,
    allocateStatPoint,
    spendGold,
    addGold,
    addCardToDeck,
    hurtAllCharacters,
    healAtCampfire,
  };
}

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
    setRunState(prev => prev ? { ...prev, currentNodeId: nodeId } : prev);
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

      // Item drop
      let itemDrop: RunItem | undefined;
      if (result.won && enc.guaranteedItem) {
        itemDrop = pickItemReward(node.type === 'boss' ? 'rare' : 'uncommon', rng);
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
      };

      // Update character HPs
      const chars = prev.characters.map(c => ({
        ...c,
        currentHp: result.finalHps[c.id] ?? c.currentHp,
      }));

      return {
        ...prev,
        characters: chars,
        completedNodeIds: [...prev.completedNodeIds, result.nodeId],
        currentNodeId: null,
        pendingRewards: pending,
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

      // Equip item
      const charsWithItem = equipItem
        ? chars.map(c => {
            if (c.id !== equipItem.characterId) return c;
            const items = [...c.items];
            items[equipItem.slotIndex] = equipItem.item;
            return { ...c, items };
          })
        : chars;

      // Unlock next nodes
      const completedNode = prev.map.find(n => prev.completedNodeIds.includes(n.id) && !prev.unlockedNodeIds.some(uid =>
        prev.map.find(m => m.id === uid)?.row === (n.row + 1)
      ));
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

  const spendGold = useCallback((amount: number): boolean => {
    let success = false;
    setRunState(prev => {
      if (!prev || prev.gold < amount) return prev;
      success = true;
      return { ...prev, gold: prev.gold - amount };
    });
    return success;
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
    collectRewards,
    allocateStatPoint,
    spendGold,
    healAtCampfire,
  };
}

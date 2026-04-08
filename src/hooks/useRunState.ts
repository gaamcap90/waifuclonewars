// src/hooks/useRunState.ts
import { useState, useCallback } from "react";
import {
  RunState, CharacterId, RunItem, CombatResult, PendingRewards,
} from "@/types/roguelike";
import {
  generateActMap, buildStartingCharacters, SHARED_STARTING_CARDS, CHARACTER_STARTING_CARDS,
  XP_TO_NEXT, pickCardRewards, pickItemReward,
} from "@/data/roguelikeData";
import { seededRng } from "@/utils/rng";

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
      const nodeHash = result.nodeId.split('').reduce((h, ch) => (Math.imul(31, h) + ch.charCodeAt(0)) | 0, 0);
      const rng = seededRng((prev.seed ^ nodeHash) + prev.battleCount * 7919);

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

      // Living character IDs used for both item filtering and card choices
      const livingCharIds = prev.characters
        .filter(c => (result.finalHps[c.id] ?? 1) > 0)
        .map(c => c.id);

      // Item drop — boss fights give one rare item per living character
      let itemDrop: RunItem | undefined;
      let bossItems: RunItem[] | undefined;
      if (result.won && node.type === 'boss') {
        const livingChars = prev.characters.filter(c => (result.finalHps[c.id] ?? 0) > 0);
        bossItems = livingChars.map(() => pickItemReward('rare', rng, livingCharIds));
      } else if (result.won && enc.guaranteedItem) {
        itemDrop = pickItemReward('rare', rng, livingCharIds);
      } else if (result.won && rng() < enc.itemDropChance) {
        itemDrop = pickItemReward('uncommon', rng, livingCharIds);
      }

      // Update character HPs + track permanent deaths
      const newDeadIds = prev.characters
        .filter(c => (result.finalHps[c.id] ?? 1) <= 0 && !prev.permanentlyDeadIds.includes(c.id))
        .map(c => c.id);

      // Remove dead characters' ability cards from deck
      const deckAfterDeaths = prev.deckCardIds.filter(cardId =>
        !newDeadIds.some(deadId => cardId.startsWith(deadId + '_'))
      );

      // Card choices — only include cards for living characters after this battle
      const cardChoices = result.won ? pickCardRewards(deckAfterDeaths, rng, livingCharIds) : [];

      const pending: PendingRewards = {
        gold: goldEarned,
        xp: totalXp,
        cardChoices,
        itemDrop,
        bossItems,
        completedNodeId: result.nodeId,
      };

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
        deckCardIds: deckAfterDeaths,
        completedNodeIds: [...prev.completedNodeIds, result.nodeId],
        currentNodeId: null,
        pendingRewards: pending,
        permanentlyDeadIds: [...prev.permanentlyDeadIds, ...newDeadIds] as any,
        battleCount: prev.battleCount + 1,
      };
    });
  }, []);

  // Called when player finishes the rewards screen
  // equipItems: array of item assignments (can include boss items + regular itemDrop)
  const collectRewards = useCallback((
    chosenCardId: string | null,
    equipItems: Array<{ characterId: CharacterId; slotIndex: number; item: RunItem }> | null,
  ) => {
    setRunState(prev => {
      if (!prev) return prev;
      // Allow item equip / card add even without pendingRewards (e.g. treasure rooms)
      const r = prev.pendingRewards;

      // Add gold (only if rewards exist)
      const newGold = prev.gold + (r?.gold ?? 0);

      // Add card to deck
      const newDeck = chosenCardId
        ? [...prev.deckCardIds, chosenCardId]
        : prev.deckCardIds;

      // Apply XP and check level ups (only if rewards exist; dead characters don't gain XP)
      const chars = prev.characters.map(c => {
        if (!r) return c;
        if (c.currentHp <= 0) return c;
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

      // Equip all assigned items (regular drop + boss items all go through the same path)
      let charsWithItem = chars;
      for (const eq of (equipItems ?? [])) {
        charsWithItem = charsWithItem.map(c => {
          if (c.id !== eq.characterId) return c;
          const items = [...c.items];
          items[eq.slotIndex] = eq.item;
          return { ...c, items };
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

      // Unlock next nodes — only from the just-completed node to prevent re-unlocking locked siblings
      const newUnlocked = [...prev.unlockedNodeIds];
      const justCompletedId = r?.completedNodeId;
      const justCompletedNode = justCompletedId ? prev.map.find(n => n.id === justCompletedId) : null;
      if (justCompletedNode) {
        justCompletedNode.connections.forEach(cid => {
          if (!newUnlocked.includes(cid)) newUnlocked.push(cid);
        });
      }

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
      // Only unlock connections from the just-completed node to avoid re-unlocking locked siblings
      const newUnlocked = [...prev.unlockedNodeIds];
      const justDone = prev.map.find(n => n.id === nodeId);
      if (justDone) {
        justDone.connections.forEach(cid => {
          if (!newUnlocked.includes(cid)) newUnlocked.push(cid);
        });
      }
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

  // Atomic merchant purchase: spend gold + add card in one state update (avoids async timing issues)
  const buyCardFromMerchant = useCallback((cardId: string, cost: number) => {
    setRunState(prev => {
      if (!prev || prev.gold < cost) return prev;
      return { ...prev, gold: prev.gold - cost, deckCardIds: [...prev.deckCardIds, cardId] };
    });
  }, []);

  // Atomic merchant heal: spend gold + heal all living characters in one state update
  const buyHealAllFromMerchant = useCallback((cost: number) => {
    setRunState(prev => {
      if (!prev || prev.gold < cost) return prev;
      return {
        ...prev,
        gold: prev.gold - cost,
        characters: prev.characters.map(c => {
          if (c.currentHp <= 0) return c;
          const heal = Math.floor(c.maxHp * 0.30);
          return { ...c, currentHp: Math.min(c.maxHp, c.currentHp + heal) };
        }),
      };
    });
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
          if (c.currentHp <= 0) return c; // dead characters cannot be healed at campfire
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
    buyCardFromMerchant,
    buyHealAllFromMerchant,
    hurtAllCharacters,
    healAtCampfire,
  };
}

// src/hooks/useRunState.ts
import { useState, useCallback, useEffect } from "react";
import {
  RunState, CharacterId, RunItem, CombatResult, PendingRewards,
} from "@/types/roguelike";
import {
  generateActMap, buildStartingCharacters, SHARED_STARTING_CARDS, CHARACTER_STARTING_CARDS,
  XP_TO_NEXT, pickCardRewards, pickItemReward, rollItemTier, pickBossExclusiveItem,
} from "@/data/roguelikeData";
import { TUTORIAL_MAP } from "@/data/tutorialData";
import { seededRng } from "@/utils/rng";

const LS_RUN_KEY = 'wcw_active_run_v1';

function loadSavedRun(): RunState | null {
  try {
    const raw = localStorage.getItem(LS_RUN_KEY);
    return raw ? (JSON.parse(raw) as RunState) : null;
  } catch { return null; }
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
    upgradedCardDefIds: [],
    runStats: { enemiesKilled: 0, itemsObtained: 0, cardsObtained: 0 },
    runStartTime: Date.now(),
  };
}

export function useRunState() {
  const [runState, setRunState] = useState<RunState | null>(() => loadSavedRun());

  // Auto-persist every non-tutorial run to localStorage
  useEffect(() => {
    if (runState && !runState.isTutorialRun) {
      localStorage.setItem(LS_RUN_KEY, JSON.stringify(runState));
    } else if (!runState) {
      localStorage.removeItem(LS_RUN_KEY);
    }
  }, [runState]);

  const startRun = useCallback((selectedIds: string[] = []) => {
    const seed = Date.now() & 0xffffff;
    setRunState(makeInitialRunState(seed, selectedIds));
  }, []);

  const startTutorialRun = useCallback(() => {
    const allChars = buildStartingCharacters();
    const characters = allChars.filter(c => ['leonidas', 'napoleon'].includes(c.id));
    const deckCardIds: string[] = [
      ...SHARED_STARTING_CARDS,
      CHARACTER_STARTING_CARDS['leonidas'],
      CHARACTER_STARTING_CARDS['napoleon'],
    ].filter(Boolean) as string[];

    setRunState({
      seed: 0,
      act: 1,
      gold: 0,
      currentNodeId: null,
      completedNodeIds: [],
      unlockedNodeIds: ['tut-0'],
      map: TUTORIAL_MAP as any,
      characters,
      deckCardIds,
      pendingRewards: null,
      permanentlyDeadIds: [],
      battleCount: 0,
      upgradedCardDefIds: [],
      runStats: { enemiesKilled: 0, itemsObtained: 0, cardsObtained: 0 },
      runStartTime: Date.now(),
      isTutorialRun: true,
    });
  }, []);

  const abandonRun = useCallback(() => {
    localStorage.removeItem(LS_RUN_KEY);
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
      let goldEarned = result.won ? enc.goldReward : Math.floor(enc.goldReward * 0.3);
      // Mansa Treasury: bonus gold equal to Mansa's Power% (only on win)
      if (result.won) {
        const mansaChar = prev.characters.find(c => c.id === 'mansa' && (result.finalHps[c.id] ?? 0) > 0);
        if (mansaChar) {
          const MANSA_BASE_POWER = 60; // from CharacterSelection.tsx stats
          const mansaItemPowerBonus = mansaChar.items.reduce((acc, item) => acc + (item?.statBonus?.power ?? 0), 0);
          const mansaEffectivePower = MANSA_BASE_POWER + (mansaChar.statBonuses.power ?? 0) + mansaItemPowerBonus;
          goldEarned += Math.floor(goldEarned * (mansaEffectivePower / 100));
          // Golden Throne: flat +50% bonus gold on top of Treasury
          const hasTreasuryDouble = mansaChar.items.some(item => item?.passiveTag === 'mansa_treasury_double');
          if (hasTreasuryDouble) goldEarned += Math.floor(goldEarned * 0.5);
        }
      }

      // Living character IDs used for both item filtering and card choices
      const livingCharIds = prev.characters
        .filter(c => (result.finalHps[c.id] ?? 1) > 0)
        .map(c => c.id);

      // Item drop — tier rolled per encounter type; character-specific items only if that char is alive
      let itemDrop: RunItem | undefined;
      let bossItems: RunItem[] | undefined;
      if (result.won && node.type === 'boss') {
        const livingChars = prev.characters.filter(c => (result.finalHps[c.id] ?? 0) > 0);
        const pickedIds: string[] = [];
        bossItems = livingChars.map(char => {
          const item = pickBossExclusiveItem(char.id, pickedIds, rng);
          pickedIds.push(item.id);
          return item;
        });
      } else if (result.won && enc.guaranteedItem) {
        itemDrop = pickItemReward(rollItemTier('elite', rng), rng, livingCharIds);
      } else if (result.won && rng() < enc.itemDropChance) {
        itemDrop = pickItemReward(rollItemTier(node.type === 'elite' ? 'elite' : 'enemy', rng), rng, livingCharIds);
      }

      // Update character HPs + track permanent deaths
      const newDeadIds = prev.characters
        .filter(c => (result.finalHps[c.id] ?? 1) <= 0 && !prev.permanentlyDeadIds.includes(c.id))
        .map(c => c.id);

      // Remove dead characters' ability cards from deck
      const deckAfterDeaths = prev.deckCardIds.filter(cardId =>
        !newDeadIds.some(deadId => cardId.startsWith(deadId + '_'))
      );

      // Card choices — tier gated by encounter type (ultimates only from elite/boss)
      const encounterKind = node.type === 'boss' ? 'boss' : node.type === 'elite' ? 'elite' : 'enemy';
      const cardChoices = result.won ? pickCardRewards(deckAfterDeaths, rng, livingCharIds, encounterKind) : [];

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
          return { ...c, currentHp: 0, items: [null, null, null, null, null, null], passiveStacks: undefined };
        }
        // Persist passive stacks for characters with the bloodlust_persist item (Genghis)
        const hasPersist = c.items.some(item => item?.passiveTag === 'genghis_bloodlust_persist');
        const persistedStacks = hasPersist ? (result.finalPassiveStacks?.[c.id] ?? 0) : undefined;
        return { ...c, currentHp: newHp, passiveStacks: persistedStacks };
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
        runStats: {
          ...prev.runStats,
          enemiesKilled: (prev.runStats?.enemiesKilled ?? 0) + (result.enemiesKilled ?? 0),
        },
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
        let { xp, level, xpToNext, pendingStatPoints, pendingAbilityUpgrades, pendingUltimateUpgrade } = c;
        xp += r.xp;
        while (xp >= xpToNext && level < 6) {
          xp -= xpToNext;
          level++;
          xpToNext = XP_TO_NEXT[level] ?? 9999;
          pendingStatPoints += 2;
          if (level === 2 || level === 4) pendingAbilityUpgrades += 1;
          if (level === 6) pendingUltimateUpgrade += 1;
        }
        return { ...c, xp, level, xpToNext, pendingStatPoints, pendingAbilityUpgrades, pendingUltimateUpgrade };
      });

      // Equip all assigned items (regular drop + boss items all go through the same path)
      // Per-character uniqueness: same character cannot hold the same item twice; other characters may
      let charsWithItem = chars;
      let itemsAdded = 0;
      for (const eq of (equipItems ?? [])) {
        const alreadyOwned = charsWithItem.find(c => c.id === eq.characterId)?.items.some(s => s?.id === eq.item.id) ?? false;
        if (alreadyOwned) continue;
        charsWithItem = charsWithItem.map(c => {
          if (c.id !== eq.characterId) return c;
          const items = [...c.items];
          items[eq.slotIndex] = eq.item;
          return { ...c, items };
        });
        itemsAdded++;
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
        runStats: {
          ...prev.runStats,
          itemsObtained: (prev.runStats?.itemsObtained ?? 0) + itemsAdded,
          cardsObtained: (prev.runStats?.cardsObtained ?? 0) + (chosenCardId ? 1 : 0),
        },
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

  // Spend one pending ability upgrade token: upgrade ALL copies of defId in the deck
  const upgradeAbility = useCallback((characterId: CharacterId, defId: string, isUltimate: boolean) => {
    setRunState(prev => {
      if (!prev) return prev;
      // Upgrade every un-upgraded copy of this card that exists in the deck
      const copiesInDeck = prev.deckCardIds.filter(id => id === defId).length;
      const alreadyUpgraded = prev.upgradedCardDefIds.filter(id => id === defId).length;
      const toAdd = Math.max(0, copiesInDeck - alreadyUpgraded);
      const newUpgradedCardDefIds = [...prev.upgradedCardDefIds, ...Array(toAdd).fill(defId)];
      return {
        ...prev,
        upgradedCardDefIds: newUpgradedCardDefIds,
        characters: prev.characters.map(c => {
          if (c.id !== characterId) return c;
          if (isUltimate && c.pendingUltimateUpgrade <= 0) return c;
          if (!isUltimate && c.pendingAbilityUpgrades <= 0) return c;
          return {
            ...c,
            pendingAbilityUpgrades: isUltimate ? c.pendingAbilityUpgrades : c.pendingAbilityUpgrades - 1,
            pendingUltimateUpgrade: isUltimate ? c.pendingUltimateUpgrade - 1 : c.pendingUltimateUpgrade,
            upgradedAbilityIds: [...c.upgradedAbilityIds, defId],
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
    setRunState(prev => prev ? {
      ...prev,
      deckCardIds: [...prev.deckCardIds, cardId],
      runStats: { ...prev.runStats, cardsObtained: (prev.runStats?.cardsObtained ?? 0) + 1 },
    } : prev);
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

  // Hurt (or heal, if amount < 0) all living characters. Never kills (floor 1),
  // never exceeds maxHp (ceiling), and skips already-dead characters.
  const hurtAllCharacters = useCallback((amount: number) => {
    setRunState(prev => prev ? {
      ...prev,
      characters: prev.characters.map(c => {
        if (c.currentHp <= 0) return c; // dead — don't touch
        return { ...c, currentHp: Math.min(c.maxHp, Math.max(1, c.currentHp - amount)) };
      }),
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

  // Heal all living characters by 30% max HP (campfire heal-all option)
  const healAllAtCampfire = useCallback(() => {
    setRunState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        characters: prev.characters.map(c => {
          if (c.currentHp <= 0) return c;
          const heal = Math.floor(c.maxHp * 0.30);
          return { ...c, currentHp: Math.min(c.maxHp, c.currentHp + heal) };
        }),
      };
    });
  }, []);

  // Upgrade a shared card at campfire — adds defId to upgradedCardDefIds (duplicates allowed for multiple copies)
  const upgradeSharedCard = useCallback((defId: string) => {
    setRunState(prev => {
      if (!prev) return prev;
      // Allow upgrading multiple copies — but cap at the number of copies in the deck
      const copiesInDeck = prev.deckCardIds.filter(id => id === defId).length;
      const alreadyUpgraded = prev.upgradedCardDefIds.filter(id => id === defId).length;
      if (alreadyUpgraded >= copiesInDeck) return prev;
      return { ...prev, upgradedCardDefIds: [...prev.upgradedCardDefIds, defId] };
    });
  }, []);

  // Remove one copy of a card from the deck (campfire remove-card option)
  const removeCardFromDeck = useCallback((cardId: string) => {
    setRunState(prev => {
      if (!prev) return prev;
      const idx = prev.deckCardIds.indexOf(cardId);
      if (idx === -1) return prev;
      const newDeck = [...prev.deckCardIds];
      newDeck.splice(idx, 1);
      return { ...prev, deckCardIds: newDeck };
    });
  }, []);

  // Add an item directly to a character's slot (unknown events / mystery box)
  const addItemToCharacter = useCallback((item: RunItem, characterId: CharacterId, slotIndex: number) => {
    setRunState(prev => {
      if (!prev) return prev;
      // Per-character uniqueness: one character cannot carry the same item twice
      const targetChar = prev.characters.find(c => c.id === characterId);
      if (targetChar?.items.some(s => s?.id === item.id)) return prev;
      return {
        ...prev,
        characters: prev.characters.map(c => {
          if (c.id !== characterId) return c;
          const items = [...c.items];
          items[slotIndex] = item;
          return { ...c, items };
        }),
        runStats: { ...prev.runStats, itemsObtained: (prev.runStats?.itemsObtained ?? 0) + 1 },
      };
    });
  }, []);

  // Remove an item from a character's slot (selling)
  const removeItemFromCharacter = useCallback((characterId: CharacterId, slotIndex: number) => {
    setRunState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        characters: prev.characters.map(c => {
          if (c.id !== characterId) return c;
          const items = [...c.items] as typeof c.items;
          items[slotIndex] = null;
          return { ...c, items };
        }),
      };
    });
  }, []);

  const hasSavedRun = runState !== null && !runState.isTutorialRun;

  return {
    runState,
    hasSavedRun,
    startRun,
    startTutorialRun,
    abandonRun,
    enterNode,
    completeCombat,
    completeNonCombatNode,
    collectRewards,
    allocateStatPoint,
    upgradeAbility,
    spendGold,
    addGold,
    addCardToDeck,
    buyCardFromMerchant,
    buyHealAllFromMerchant,
    hurtAllCharacters,
    healAtCampfire,
    healAllAtCampfire,
    upgradeSharedCard,
    removeCardFromDeck,
    addItemToCharacter,
    removeItemFromCharacter,
  };
}

// src/hooks/useBuffCalculation.ts - Calculate character stat buffs

import { GameState, Icon, Coordinates } from "@/types/game";

export const useBuffCalculation = () => {
  const calculateBuffedStats = (icon: Icon, gameState: GameState) => {
    const teamBuffs = gameState.teamBuffs;
    
    const mightBonusPct = teamBuffs.mightBonus[icon.playerId] || 0;
    const powerBonusPct = teamBuffs.powerBonus[icon.playerId] || 0;
    const defenseBonusPct = 0; // No team defense bonus yet

    // Check if on home base for additional 20% buff
    const isOnHomeBase = (() => {
      const baseTile = gameState.board.find(tile => 
        tile.coordinates.q === icon.position.q && 
        tile.coordinates.r === icon.position.r &&
        tile.terrain.type === 'base'
      );
      if (!baseTile) return false;
      // Blue base is at negative coords, red base at positive coords
      return (icon.playerId === 0 && baseTile.coordinates.q < 0) ||
             (icon.playerId === 1 && baseTile.coordinates.q > 0);
    })();

    // Check if on forest for defense bonus
    const isOnForest = (() => {
      const forestTile = gameState.board.find(tile => 
        tile.coordinates.q === icon.position.q && 
        tile.coordinates.r === icon.position.r &&
        tile.terrain.type === 'forest'
      );
      return !!forestTile;
    })();

    const homeBaseBuff = isOnHomeBase ? 20 : 0;
    const forestDefenseBuff = isOnForest ? 50 : 0; // +50% defense in forest

    // Calculate total buffs (additive)
    const totalMightBonus = mightBonusPct + homeBaseBuff;
    const totalPowerBonus = powerBonusPct + homeBaseBuff;
    const totalDefenseBonus = defenseBonusPct + homeBaseBuff + forestDefenseBuff;

    // Apply buffs to stats (include temporary card buffs)
    const cardBuffAtk = icon.cardBuffAtk ?? 0;
    const cardBuffDef = icon.cardBuffDef ?? 0;
    const buffedMight = Math.floor(icon.stats.might * (1 + totalMightBonus / 100)) + cardBuffAtk;
    const buffedPower = Math.floor(icon.stats.power * (1 + totalPowerBonus / 100));
    const buffedDefense = Math.floor(icon.stats.defense * (1 + totalDefenseBonus / 100)) + cardBuffDef;

    return {
      might: buffedMight,
      power: buffedPower,
      defense: buffedDefense,
      cardBuffAtk,
      cardBuffDef,
      hp: icon.stats.hp,
      maxHp: icon.stats.maxHp,
      speed: icon.stats.speed,
      movement: icon.stats.movement,
      isOnHomeBase,
      isOnForest,
      mightBonus: totalMightBonus,
      powerBonus: totalPowerBonus,
      defenseBonus: totalDefenseBonus,
      homeBaseBonus: homeBaseBuff,
      forestDefenseBonus: forestDefenseBuff
    };
  };

  return { calculateBuffedStats };
};
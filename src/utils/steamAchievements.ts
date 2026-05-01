// src/utils/steamAchievements.ts
//
// Abstraction layer between in-game achievement unlocks and the Steamworks API.
// Designed to compile and run safely in three environments:
//
//   1. Web build (no Steam) — calls become no-ops with console hints in dev.
//   2. Electron without Steamworks bridge — same as web (no-op + log).
//   3. Electron WITH Steamworks bridge installed — actually unlocks on Steam.
//
// SETUP (when ready to ship Steam):
// ─────────────────────────────────────────────────────────────────────────────
//  a. Install steamworks.js in the project:        npm i steamworks.js
//  b. Add an electron/preload.js that exposes an API via contextBridge:
//
//       const { contextBridge } = require('electron');
//       const steam = require('steamworks.js');
//       const client = steam.init(YOUR_APP_ID); // 480 = Spacewar test app
//       contextBridge.exposeInMainWorld('wcwSteam', {
//         isReady: () => true,
//         unlockAchievement: (apiName) => client.achievement.activate(apiName),
//         clearAchievement:  (apiName) => client.achievement.clear(apiName),
//       });
//
//  c. In electron/main.cjs, set webPreferences.preload to that file's path.
//  d. Fill in steamAchievementMap.ts with the API names from your Steamworks
//     dashboard (Achievements section).
//
// Until step (b) lands, this module gracefully no-ops in the renderer.

import { STEAM_ACHIEVEMENT_MAP } from '@/data/steamAchievementMap';

interface SteamBridge {
  isReady: () => boolean;
  unlockAchievement: (apiName: string) => void;
  clearAchievement?:  (apiName: string) => void;
}

declare global {
  interface Window {
    wcwSteam?: SteamBridge;
  }
}

const isDev = typeof import.meta !== 'undefined'
  && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

function getBridge(): SteamBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = window.wcwSteam;
  if (!bridge) return null;
  try {
    if (!bridge.isReady()) return null;
  } catch { return null; }
  return bridge;
}

/** Mark an in-game achievement as unlocked on Steam. Safe to call repeatedly. */
export function unlockSteamAchievement(internalId: string): void {
  const apiName = STEAM_ACHIEVEMENT_MAP[internalId];
  if (!apiName) {
    if (isDev) console.warn(`[steam] no Steam mapping for achievement '${internalId}'`);
    return;
  }
  const bridge = getBridge();
  if (!bridge) {
    if (isDev) console.log(`[steam:stub] would unlock '${apiName}' (${internalId})`);
    return;
  }
  try {
    bridge.unlockAchievement(apiName);
    if (isDev) console.log(`[steam] unlocked '${apiName}' (${internalId})`);
  } catch (err) {
    console.warn(`[steam] failed to unlock '${apiName}':`, (err as Error).message);
  }
}

/** Dev/QA helper — clear a Steam achievement (won't help with already-stored unlocks). */
export function clearSteamAchievement(internalId: string): void {
  const apiName = STEAM_ACHIEVEMENT_MAP[internalId];
  const bridge = getBridge();
  if (!apiName || !bridge?.clearAchievement) return;
  try { bridge.clearAchievement(apiName); }
  catch (err) { console.warn(`[steam] failed to clear '${apiName}':`, (err as Error).message); }
}

/** Returns true when running in an Electron build with the Steam bridge wired. */
export function isSteamAvailable(): boolean {
  return getBridge() !== null;
}

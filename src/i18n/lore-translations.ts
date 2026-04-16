// Lore translations — generated translations for non-English languages.
// English lore lives in HistoricalArchives.tsx (const LORE).
// Fall-through to English when a key is missing.

import type { Language } from './index';
import { loreDe } from './lore_de';
import { loreKo } from './lore_ko';
import { lorePtBR } from './lore_pt-BR';
import { loreZhCN } from './lore_zh-CN';

export type LoreTranslation = { title: string; text: string };
export type LoreTranslations = Record<string, LoreTranslation>;

const LORE_BY_LANG: Partial<Record<Language, LoreTranslations>> = {
  de:      loreDe,
  ko:      loreKo,
  'pt-BR': lorePtBR,
  'zh-CN': loreZhCN,
};

export function getLoreTranslation(id: string, lang: Language): LoreTranslation | null {
  return LORE_BY_LANG[lang]?.[id] ?? null;
}

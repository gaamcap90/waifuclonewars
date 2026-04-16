import type { Language } from './index';
import { achievementDe } from './achievement_de';
import { achievementKo } from './achievement_ko';
import { achievementPtBR } from './achievement_pt-BR';
import { achievementZhCN } from './achievement_zh-CN';

const ACHIEVEMENT_BY_LANG: Partial<Record<Language, Record<string, { name: string; description: string }>>> = {
  de:      achievementDe,
  ko:      achievementKo,
  'pt-BR': achievementPtBR,
  'zh-CN': achievementZhCN,
};

export function getAchievementTranslation(
  id: string,
  lang: Language,
): { name: string; description: string } | null {
  return ACHIEVEMENT_BY_LANG[lang]?.[id] ?? null;
}

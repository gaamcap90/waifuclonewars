import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './en';
import { de } from './de';
import { ptBR } from './pt-BR';
import { ko } from './ko';
import { zhCN } from './zh-CN';

export type Language = 'en' | 'de' | 'pt-BR' | 'ko' | 'zh-CN';
export type Translations = typeof en;

const LANGS: Record<Language, Translations> = {
  en,
  de,
  'pt-BR': ptBR,
  ko,
  'zh-CN': zhCN,
};

export const LANG_LABELS: Record<Language, string> = {
  en:      'English',
  de:      'Deutsch',
  'pt-BR': 'Português (BR)',
  ko:      '한국어',
  'zh-CN': '中文 (简体)',
};

// Module-level singleton for non-React usage (toast messages in hooks, etc.)
let _t: Translations = en;
export const getT = (): Translations => _t;

interface I18nCtx {
  lang: Language;
  t: Translations;
  setLang: (l: Language) => void;
}

const I18nContext = createContext<I18nCtx>({ lang: 'en', t: en, setLang: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('wcw_lang') as Language | null;
    return saved && LANGS[saved] ? saved : 'en';
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('wcw_lang', l);
    _t = LANGS[l];
  };

  useEffect(() => {
    _t = LANGS[lang];
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t: LANGS[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT(): I18nCtx {
  return useContext(I18nContext);
}

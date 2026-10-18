/**
 * Sheba Sound — Language Context
 * --------------------------------
 * Provides language state and a `t()` translation function
 * to the entire app. Persists language choice in localStorage.
 */

import { createContext, useState, useCallback, type ReactNode } from "react";
import type { TranslationKeys } from "./en";
import en from "./en";
import am from "./am";
import om from "./om";
import ti from "./ti";
import gu from "./gu";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Language = "en" | "am" | "om" | "ti" | "gu";

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  /**
   * Translate a dot-notation key, e.g. `t("topbar.menu")`.
   * Supports simple `{{placeholder}}` interpolation.
   */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

/* ------------------------------------------------------------------ */
/*  Translation Map                                                    */
/* ------------------------------------------------------------------ */

const translations: Record<Language, TranslationKeys> = { en, am, om, ti, gu };

const STORAGE_KEY = "sheba_sound_lang";

/* ------------------------------------------------------------------ */
/*  Helper: resolve a dot-path like "topbar.menu" from nested object   */
/* ------------------------------------------------------------------ */

function resolve(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const k of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[k];
  }
  return typeof current === "string" ? current : path;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

export const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

const VALID_LANGS: Language[] = ["en", "am", "om", "ti", "gu"];

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (VALID_LANGS.includes(stored as Language)) return stored as Language;
    return "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let text = resolve(translations[language] as unknown as Record<string, unknown>, key);
      // Fallback to English if key not found in current language
      if (text === key) {
        text = resolve(translations.en as unknown as Record<string, unknown>, key);
      }
      // Interpolation: replace {{var}} placeholders
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
        }
      }
      return text;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

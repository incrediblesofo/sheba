/**
 * Sheba Sound — useTranslation Hook
 * ------------------------------------
 * Convenience hook to access the language context.
 */

import { useContext } from "react";
import { LanguageContext, type LanguageContextType } from "./LanguageContext";

export function useTranslation(): LanguageContextType {
  return useContext(LanguageContext);
}

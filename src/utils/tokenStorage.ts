/**
 * Sheba Sound — Token Storage Utility
 * ------------------------------------
 * Thin wrapper around localStorage for JWT token persistence.
 * Isolates storage logic so it can be swapped (e.g. to secure cookies) later.
 */

import { TOKEN_KEYS } from './constants';
import type { TokenPair } from '@/types/auth';

/* ------------------------------------------------------------------ */
/*  Getters                                                            */
/* ------------------------------------------------------------------ */

export const getAccessToken = (): string | null =>
  localStorage.getItem(TOKEN_KEYS.ACCESS);

export const getRefreshToken = (): string | null =>
  localStorage.getItem(TOKEN_KEYS.REFRESH);

export const getTokens = (): TokenPair | null => {
  const access = getAccessToken();
  const refresh = getRefreshToken();
  if (access && refresh) return { access, refresh };
  return null;
};

/* ------------------------------------------------------------------ */
/*  Setters                                                            */
/* ------------------------------------------------------------------ */

export const setAccessToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEYS.ACCESS, token);

export const setRefreshToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEYS.REFRESH, token);

export const setTokens = ({ access, refresh }: TokenPair): void => {
  setAccessToken(access);
  setRefreshToken(refresh);
};

/* ------------------------------------------------------------------ */
/*  Clear                                                              */
/* ------------------------------------------------------------------ */

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
};

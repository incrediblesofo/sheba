/**
 * Sheba Sound — Auth Redux Slice
 * -------------------------------
 * Manages the authenticated user, JWT tokens, and session state.
 * Token persistence is delegated to utils/tokenStorage.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState } from '@/types/auth';
import type { User } from '@/types/models';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '@/utils/tokenStorage';

/* ------------------------------------------------------------------ */
/*  Initial State                                                      */
/* ------------------------------------------------------------------ */

/**
 * On app boot we hydrate tokens from localStorage so that a page
 * refresh doesn't force a re-login. The actual user object is fetched
 * via the getMe RTK Query endpoint in the AppInitializer.
 */
const initialState: AuthState = {
  user: null,
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: !!getAccessToken(),
  isLoading: true, // true until getMe resolves or rejects
};

/* ------------------------------------------------------------------ */
/*  Slice                                                              */
/* ------------------------------------------------------------------ */

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Called after a successful login or token refresh to persist the
     * new credentials in both Redux state and localStorage.
     */
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>,
    ) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      setTokens({ access: accessToken, refresh: refreshToken });
    },

    /** Populate the user object (e.g. after getMe succeeds). */
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    },

    /** Clear the entire auth state and wipe persisted tokens. */
    logOut: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      clearTokens();
    },

    /** Mark the initial auth check as complete (used by AppInitializer). */
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /** Called by musicApi's silent token refresh to sync the new access token into Redux. */
    tokenRefreshed: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
  },
});

export const { setCredentials, setUser, logOut, setAuthLoading, tokenRefreshed } =
  authSlice.actions;
export default authSlice.reducer;

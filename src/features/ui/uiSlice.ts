/**
 * Sheba Sound — UI Redux Slice
 * -----------------------------
 * Global UI state: theme mode, snackbar notifications, sidebar toggle.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AlertColor } from '@mui/material';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SnackbarMessage {
  id: string;
  message: string;
  severity: AlertColor; // 'success' | 'error' | 'warning' | 'info'
  autoHideDuration?: number;
}

export interface UiState {
  themeMode: 'light' | 'dark';
  sidebarOpen: boolean;
  snackbar: SnackbarMessage | null;
}

/* ------------------------------------------------------------------ */
/*  Initial State                                                      */
/* ------------------------------------------------------------------ */

const initialState: UiState = {
  themeMode:
    (localStorage.getItem('sheba_sound_theme') as 'light' | 'dark') ?? 'dark',
  sidebarOpen: true,
  snackbar: null,
};

/* ------------------------------------------------------------------ */
/*  Slice                                                              */
/* ------------------------------------------------------------------ */

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('sheba_sound_theme', state.themeMode);
    },

    setThemeMode: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.themeMode = action.payload;
      localStorage.setItem('sheba_sound_theme', action.payload);
    },

    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    /** Show a snackbar notification. */
    showSnackbar: (
      state,
      action: PayloadAction<Omit<SnackbarMessage, 'id'>>,
    ) => {
      state.snackbar = {
        ...action.payload,
        id: crypto.randomUUID(),
      };
    },

    /** Dismiss the current snackbar. */
    dismissSnackbar: (state) => {
      state.snackbar = null;
    },
  },
});

export const {
  toggleTheme,
  setThemeMode,
  toggleSidebar,
  setSidebarOpen,
  showSnackbar,
  dismissSnackbar,
} = uiSlice.actions;
export default uiSlice.reducer;

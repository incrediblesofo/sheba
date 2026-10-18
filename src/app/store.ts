/**
 * Sheba Sound — Redux Store Configuration
 * ----------------------------------------
 * Combines all slices and RTK Query APIs into a single store.
 */

import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "@/features/auth/authApi";
import { musicApi } from "@/features/music/musicApi";
import authReducer from "@/features/auth/authSlice";
import uiReducer from "@/features/ui/uiSlice";
import playerReducer from "@/features/player/playerSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    player: playerReducer,
    [authApi.reducerPath]: authApi.reducer,
    [musicApi.reducerPath]: musicApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, musicApi.middleware),
  devTools: import.meta.env.DEV,
});

/** Inferred types for use throughout the application. */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

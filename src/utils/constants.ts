/**
 * Sheba Sound — Application Constants
 * ------------------------------------
 * Centralised configuration values used across the platform.
 */

/** Base URL of the Django REST Framework backend (local dev). */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? '/api';

/** LocalStorage keys for JWT persistence. */
export const TOKEN_KEYS = {
  ACCESS: 'sheba_sound_access_token',
  REFRESH: 'sheba_sound_refresh_token',
} as const;

/** Route paths — single source of truth for navigation. */
export const ROUTES = {
  // Public
  WELCOME: '/welcome',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:uid/:token',

  // Listener
  LISTENER_HOME: '/',
  LISTENER_SEARCH: '/search',
  LISTENER_LIBRARY: '/library',
  LISTENER_PLAYLIST: '/playlist/:id',
  LISTENER_ALBUM: '/album/:id',
  LISTENER_ARTISTS: '/artists',
  LISTENER_ARTIST: '/artist/:id',
  LISTENER_SETTINGS: '/settings',
  LISTENER_DOWNLOADS: '/downloads',
  LISTENER_LIKED_SONGS: '/liked-songs',
  LISTENER_SUBSCRIPTION: '/subscription',
  LISTENER_PAYMENT_RETURN: '/subscription/return',
  BECOME_ARTIST: '/become-artist',

  // Artist
  ARTIST_DASHBOARD: '/artist/dashboard',
  ARTIST_UPLOAD: '/artist/upload',
  ARTIST_SONGS: '/artist/songs',
  ARTIST_ALBUMS: '/artist/albums',
  ARTIST_ANALYTICS: '/artist/analytics',
  ARTIST_PROFILE: '/artist/profile',
  ARTIST_REVENUE: '/artist/revenue',
  ARTIST_PLAYLISTS: '/artist/playlists',
  ARTIST_NOTIFICATIONS: '/artist/notifications',
  ARTIST_SETTINGS: '/artist/settings',

  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_CONTENT: '/admin/content',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_ARTIST_VERIFICATION: '/admin/artist-verification',

  // Catch-all
  NOT_FOUND: '/404',
} as const;

/** Drawer width in pixels for the side navigation. */
export const DRAWER_WIDTH = 260;

/** Height of the mobile bottom navigation bar in pixels. */
export const BOTTOM_NAV_HEIGHT = 56;

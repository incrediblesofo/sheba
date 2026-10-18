# EthioMusic Web

A Spotify-inspired Ethiopian music streaming platform built with React, TypeScript, and Material UI. Features public browsing, role-based dashboards, a global audio player, and mock data for frontend-only development.

## Tech Stack

- **Framework:** React 19 + TypeScript (strict)
- **Build:** Vite 8 with lazy-loaded code splitting
- **State:** Redux Toolkit + RTK Query (mock mode)
- **UI:** Material UI 7, Ethiopian-themed light/dark mode
- **Routing:** React Router 7 with RBAC guards
- **Audio:** HTML5 Audio API via Redux-managed global player

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npx tsc -b         # type check
```

## Demo Accounts

The app runs entirely in the browser with data. Use the demo buttons on the login page or these credentials (password: `demo1234`):

## Architecture

```
src/
  app/              # Redux store, hooks
  components/
    common/         # ErrorBoundary, LoadingSpinner, Logo
    layout/         # AppShell, TopBar, Sidebar
    music/          # SongCard, SongListItem, AlbumCard, PlaylistCard
    player/         # GlobalPlayer (persistent bottom bar)
    routing/        # AppRouter, PublicRoute, ProtectedRoute, RoleBasedRoute
  features/
    auth/           # authSlice, authApi, LoginForm, RegisterForm
    player/         # playerSlice (queue, shuffle, repeat, volume)
    ui/             # uiSlice (theme, sidebar, snackbar)
  hooks/            # useRequireAuth
  pages/
    listener/       # Home, Search, Library, Settings, Subscription,
                    # AlbumDetail, PlaylistDetail, ArtistDetail
    artist/         # Dashboard, Upload, Songs, Albums, Analytics, Profile
    admin/          # Dashboard, Users, Content, Subscriptions, Reports
  types/            # models.ts, auth.ts (strict TypeScript types)
  utils/            # mockAuth, mockMusic, mockArtist, mockAdmin, constants
```

## Key Features

### Public Browsing (Spotify-like UX)

- Home page with trending songs, new releases, and featured playlists
- Search with text filtering and genre chips
- Album, playlist, and artist detail pages
- **Sign Up** and **Log In** buttons in the top bar
- Clicking play without an account redirects to sign up

### Listener Module

- My Library (liked songs, playlists, recently played)
- Subscription page (Free vs Premium plans, 149 ETB/month)
- Settings (profile editing, password change, notification prefs)

### Artist Module

- Dashboard with stats cards and recent songs
- Song upload form with audio/cover file input and metadata
- Songs management with status badges and edit/delete
- Albums page with create album dialog
- Analytics with stream charts and top songs
- Profile editor (stage name, bio, social links)

### Admin Module

- Platform stats dashboard with activity feed
- User management (search, filter, activate/deactivate)
- Content moderation queue (approve/reject songs)
- Subscription overview with revenue estimates
- Platform reports (user growth, genre distribution, top artists)

### Global Audio Player

- Persistent bottom bar with play/pause, next/prev, seek
- Volume control with mute toggle
- Shuffle and repeat modes (off, all, one)
- Queue management via Redux

### Performance

- Lazy-loaded route pages (386KB main bundle, ~2-14KB per page chunk)
- Suspense with loading fallback
- Error boundary for graceful crash recovery

## Connecting a Backend

Each mock utility (`mockAuth.ts`, `mockMusic.ts`, etc.) has comments marking where to swap in real RTK Query API calls. The auth flow already has RTK Query mutations defined in `authApi.ts` — just remove the mock wrappers in the form components.

Environment variable for the API:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## License

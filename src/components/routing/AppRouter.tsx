/**
 * Sheba Sound — Application Router
 * ----------------------------------
 * Defines the complete route tree with RBAC guards.
 * All page components are lazy-loaded for optimal code splitting.
 *
 * Route hierarchy:
 *   PublicRoute  → Login, Register, ForgotPassword
 *   AppShell (public)
 *     ├── Home, Search, Album/Playlist/Artist detail (public browsing)
 *     └── ProtectedRoute
 *           ├── Listener routes (role: listener)
 *           ├── Artist routes   (role: artist)
 *           └── Admin routes    (role: admin)
 *   NotFoundPage (catch-all)
 */

import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";
import RoleBasedRoute from "./RoleBasedRoute";
import AppShell from "@/components/layout/AppShell";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { UserRole } from "@/types/models";
import { ROUTES } from "@/utils/constants";

/* ---- Lazy-loaded pages ---- */
const WelcomePage = lazy(() => import("@/features/auth/pages/WelcomePage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const ForgotPasswordPage = lazy(
  () => import("@/features/auth/pages/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(
  () => import("@/features/auth/pages/ResetPasswordPage"),
);
const VerifyEmailPage = lazy(
  () => import("@/pages/VerifyEmailPage"),
);
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// Listener
const ListenerHomePage = lazy(
  () => import("@/pages/listener/ListenerHomePage"),
);
const SearchPage = lazy(() => import("@/pages/listener/SearchPage"));
const LibraryPage = lazy(() => import("@/pages/listener/LibraryPage"));
const SettingsPage = lazy(() => import("@/pages/listener/SettingsPage"));
const SubscriptionPage = lazy(
  () => import("@/pages/listener/SubscriptionPage"),
);
const AlbumDetailPage = lazy(() => import("@/pages/listener/AlbumDetailPage"));
const PlaylistDetailPage = lazy(
  () => import("@/pages/listener/PlaylistDetailPage"),
);
const ArtistDetailPage = lazy(
  () => import("@/pages/listener/ArtistDetailPage"),
);
const ArtistsPage = lazy(
  () => import("@/pages/listener/ArtistsPage"),
);
const BecomeArtistPage = lazy(
  () => import("@/pages/listener/BecomeArtistPage"),
);
const PaymentReturnPage = lazy(
  () => import("@/pages/listener/PaymentReturnPage"),
);
const DownloadsPage = lazy(
  () => import("@/pages/listener/DownloadsPage"),
);
const LikedSongsPage = lazy(
  () => import("@/pages/listener/LikedSongsPage"),
);

// Artist
const ArtistDashboardPage = lazy(
  () => import("@/pages/artist/ArtistDashboardPage"),
);
const ArtistUploadPage = lazy(() => import("@/pages/artist/ArtistUploadPage"));
const ArtistSongsPage = lazy(() => import("@/pages/artist/ArtistSongsPage"));
const ArtistAlbumsPage = lazy(() => import("@/pages/artist/ArtistAlbumsPage"));
const ArtistAnalyticsPage = lazy(
  () => import("@/pages/artist/ArtistAnalyticsPage"),
);
const ArtistProfilePage = lazy(
  () => import("@/pages/artist/ArtistProfilePage"),
);
const ArtistRevenuePage = lazy(
  () => import("@/pages/artist/ArtistRevenuePage"),
);
const ArtistPlaylistsPage = lazy(
  () => import("@/pages/artist/ArtistPlaylistsPage"),
);
const ArtistNotificationsPage = lazy(
  () => import("@/pages/artist/ArtistNotificationsPage"),
);
const ArtistSettingsPage = lazy(
  () => import("@/pages/artist/ArtistSettingsPage"),
);

// Admin
const AdminDashboardPage = lazy(
  () => import("@/pages/admin/AdminDashboardPage"),
);
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminContentPage = lazy(() => import("@/pages/admin/AdminContentPage"));
const AdminSubscriptionsPage = lazy(
  () => import("@/pages/admin/AdminSubscriptionsPage"),
);
const AdminReportsPage = lazy(() => import("@/pages/admin/AdminReportsPage"));
const AdminArtistVerificationPage = lazy(
  () => import("@/pages/admin/AdminArtistVerificationPage"),
);

const AppRouter: React.FC = () => (
  <Suspense fallback={<LoadingSpinner fullScreen message="Loading page..." />}>
    <Routes>
      {/* ================================================================ */}
      {/*  AUTH PAGES — only when NOT authenticated (redirects if logged in)*/}
      {/* ================================================================ */}
      <Route element={<PublicRoute />}>
        <Route path={ROUTES.WELCOME} element={<WelcomePage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      </Route>

      {/* Reset password — accessible regardless of auth state */}
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

      {/* Email verification — accessible regardless of auth state */}
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* ================================================================ */}
      {/*  PUBLIC BROWSING — available to everyone inside AppShell          */}
      {/*  (unauthenticated users see Sign Up / Log In in the TopBar)      */}
      {/* ================================================================ */}
      <Route element={<AppShell />}>
        {/* Anyone can browse Home, Search, and detail pages */}
        <Route path={ROUTES.LISTENER_HOME} element={<ListenerHomePage />} />
        <Route path={ROUTES.LISTENER_SEARCH} element={<SearchPage />} />
        <Route path={ROUTES.LISTENER_ALBUM} element={<AlbumDetailPage />} />
        <Route
          path={ROUTES.LISTENER_PLAYLIST}
          element={<PlaylistDetailPage />}
        />
        <Route path={ROUTES.LISTENER_ARTISTS} element={<ArtistsPage />} />
        <Route path={ROUTES.LISTENER_ARTIST} element={<ArtistDetailPage />} />

        {/* -------------------------------------------------------------- */}
        {/*  PROTECTED — require authentication                            */}
        {/* -------------------------------------------------------------- */}
        <Route element={<ProtectedRoute />}>
          {/* ---- Subscription & Payment (all authenticated users) ---- */}
          <Route
            path={ROUTES.LISTENER_SUBSCRIPTION}
            element={<SubscriptionPage />}
          />
          <Route
            path={ROUTES.LISTENER_PAYMENT_RETURN}
            element={<PaymentReturnPage />}
          />
          {/* ---- Become Artist (all authenticated — shows status-aware UI) ---- */}
          <Route
            path={ROUTES.BECOME_ARTIST}
            element={<BecomeArtistPage />}
          />

          {/* ---- Listener (auth required) ---- */}
          <Route
            element={
              <RoleBasedRoute
                allowedRoles={[UserRole.Listener, UserRole.Admin]}
              />
            }
          >
            <Route path={ROUTES.LISTENER_LIBRARY} element={<LibraryPage />} />
            <Route path={ROUTES.LISTENER_DOWNLOADS} element={<DownloadsPage />} />
            <Route path={ROUTES.LISTENER_LIKED_SONGS} element={<LikedSongsPage />} />
            <Route path={ROUTES.LISTENER_SETTINGS} element={<SettingsPage />} />
          </Route>

          {/* ---- Artist Routes ---- */}
          <Route
            element={
              <RoleBasedRoute
                allowedRoles={[UserRole.Artist, UserRole.Admin]}
              />
            }
          >
            <Route
              path={ROUTES.ARTIST_DASHBOARD}
              element={<ArtistDashboardPage />}
            />
            <Route path={ROUTES.ARTIST_UPLOAD} element={<ArtistUploadPage />} />
            <Route path={ROUTES.ARTIST_SONGS} element={<ArtistSongsPage />} />
            <Route path={ROUTES.ARTIST_ALBUMS} element={<ArtistAlbumsPage />} />
            <Route
              path={ROUTES.ARTIST_ANALYTICS}
              element={<ArtistAnalyticsPage />}
            />
            <Route
              path={ROUTES.ARTIST_PROFILE}
              element={<ArtistProfilePage />}
            />
            <Route
              path={ROUTES.ARTIST_REVENUE}
              element={<ArtistRevenuePage />}
            />
            <Route
              path={ROUTES.ARTIST_PLAYLISTS}
              element={<ArtistPlaylistsPage />}
            />
            <Route
              path={ROUTES.ARTIST_NOTIFICATIONS}
              element={<ArtistNotificationsPage />}
            />
            <Route
              path={ROUTES.ARTIST_SETTINGS}
              element={<ArtistSettingsPage />}
            />
          </Route>

          {/* ---- Admin Routes ---- */}
          <Route element={<RoleBasedRoute allowedRoles={[UserRole.Admin]} />}>
            <Route
              path={ROUTES.ADMIN_DASHBOARD}
              element={<AdminDashboardPage />}
            />
            <Route path={ROUTES.ADMIN_USERS} element={<AdminUsersPage />} />
            <Route path={ROUTES.ADMIN_CONTENT} element={<AdminContentPage />} />
            <Route
              path={ROUTES.ADMIN_SUBSCRIPTIONS}
              element={<AdminSubscriptionsPage />}
            />
            <Route path={ROUTES.ADMIN_REPORTS} element={<AdminReportsPage />} />
            <Route
              path={ROUTES.ADMIN_ARTIST_VERIFICATION}
              element={<AdminArtistVerificationPage />}
            />
          </Route>
        </Route>
      </Route>

      {/* ================================================================ */}
      {/*  CATCH-ALL                                                        */}
      {/* ================================================================ */}
      <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
    </Routes>
  </Suspense>
);

export default AppRouter;

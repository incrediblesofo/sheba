/**
 * Sheba Sound — App Initializer
 * -------------------------------
 * On mount, checks whether persisted tokens exist and attempts to
 * fetch the current user via the getMe endpoint. This enables
 * session persistence across page refreshes without re-login.
 *
 * Also polls getMe periodically to detect external role changes
 * (e.g. admin approving an artist application), updating Redux state
 * and navigating the user immediately.
 *
 * Poll cadence:
 *   – 15 s when the user is a listener (role upgrade expected soon)
 *   – 60 s otherwise (maintenance heartbeat)
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { useLazyGetMeQuery } from "@/features/auth/authApi";
import { setUser, logOut, setAuthLoading } from "@/features/auth/authSlice";
import { showSnackbar } from "@/features/ui/uiSlice";
import { ROUTES } from "@/utils/constants";
import LoadingSpinner from "./LoadingSpinner";

/** Polling intervals (ms). */
const POLL_FAST_MS = 15_000; // while listener — waiting for approval
const POLL_SLOW_MS = 60_000; // otherwise — routine heartbeat

interface AppInitializerProps {
  children: ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { accessToken, isLoading } = useAppSelector((state) => state.auth);
  // Read user role without subscribing to full user object to avoid re-renders
  const userRole = useAppSelector((state) => state.auth.user?.role ?? null);
  const [triggerGetMe] = useLazyGetMeQuery();

  /**
   * Tracks the role as seen BEFORE the most-recent poll so we can
   * detect a server-side upgrade. Only updated by the poller itself —
   * NOT by the Redux user selector — so the "before" snapshot is preserved.
   */
  const previousRoleRef = useRef<string | null>(null);

  /* ── Initial auth check ─────────────────────────────────────────── */
  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      if (!accessToken) {
        dispatch(setAuthLoading(false));
        return;
      }

      try {
        const fetchedUser = await triggerGetMe().unwrap();
        dispatch(setUser(fetchedUser));
        previousRoleRef.current = fetchedUser.role;
      } catch {
        // Token is invalid or expired and refresh also failed
        dispatch(logOut());
      }
    };

    void initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Periodic polling to detect external role changes ────────────── */
  useEffect(() => {
    if (!accessToken) return;

    // Choose interval: poll fast while user is a listener so approval
    // takes effect within 15 s instead of up to 60 s.
    const interval = userRole === "listener" ? POLL_FAST_MS : POLL_SLOW_MS;

    const intervalId = setInterval(async () => {
      try {
        const freshUser = await triggerGetMe().unwrap();

        // Detect role upgrade (listener → artist)
        const oldRole = previousRoleRef.current;

        if (oldRole && oldRole !== freshUser.role) {
          // Role changed — update Redux first
          dispatch(setUser(freshUser));
          previousRoleRef.current = freshUser.role;

          if (oldRole === "listener" && freshUser.role === "artist") {
            dispatch(
              showSnackbar({
                message:
                  "🎉 Congratulations! Your artist application has been approved. Redirecting to your artist dashboard...",
                severity: "success",
                autoHideDuration: 8000,
              }),
            );
            // Navigate to artist dashboard — RoleBasedRoute will now allow it
            navigate(ROUTES.ARTIST_DASHBOARD);
          }
        } else {
          // No role change — still sync other profile fields
          dispatch(setUser(freshUser));
          // Keep ref current so next comparison is accurate
          previousRoleRef.current = freshUser.role;
        }
      } catch {
        // Silently ignore polling errors — the auth interceptor handles 401s
      }
    }, interval);

    return () => clearInterval(intervalId);
    // Re-start interval when role changes so cadence updates immediately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, userRole]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Starting Sheba Sound..." />;
  }

  return <>{children}</>;
};

export default AppInitializer;

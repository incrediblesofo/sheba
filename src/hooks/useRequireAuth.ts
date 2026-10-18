/**
 * Sheba Sound — useRequireAuth Hook
 * -----------------------------------
 * Returns a guard function that checks if the user is authenticated.
 * If not, it shows a snackbar and redirects to the signup page.
 * Used by music components to gate playback behind authentication.
 */

import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { useNavigate } from "react-router-dom";
import { showSnackbar } from "@/features/ui/uiSlice";
import { ROUTES } from "@/utils/constants";

/**
 * Returns `{ isAuthenticated, requireAuth }`.
 * Call `requireAuth()` before any action that needs login.
 * It returns `true` if the user is logged in, `false` otherwise
 * (and handles the redirect + snackbar automatically).
 */
export const useRequireAuth = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const requireAuth = (): boolean => {
    if (isAuthenticated) return true;

    dispatch(
      showSnackbar({
        message: "Sign up for free to start listening!",
        severity: "info",
      }),
    );
    navigate(ROUTES.REGISTER);
    return false;
  };

  return { isAuthenticated, requireAuth };
};

/**
 * Sheba Sound — Protected Route Guard
 * -------------------------------------
 * Wraps routes that require authentication.
 * Redirects unauthenticated users to the login page, preserving the
 * originally requested location so they can be sent back after login.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { ROUTES } from "@/utils/constants";

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const location = useLocation();

  /* While the initial auth check (getMe) is in flight, show a loader. */
  if (isLoading) {
    return <LoadingSpinner fullScreen message="Verifying session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.REGISTER} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

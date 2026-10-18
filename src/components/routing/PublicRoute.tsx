/**
 * Sheba Sound — Public Route Guard
 * ----------------------------------
 * Wraps routes that should only be accessible to unauthenticated users
 * (login, register, forgot-password). Redirects authenticated users to
 * the appropriate home page based on their role.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { UserRole } from '@/types/models';
import { ROUTES } from '@/utils/constants';
import LoadingSpinner from '@/components/common/LoadingSpinner';

/** Returns the default landing page for a given role. */
const getHomeRoute = (role: UserRole): string => {
  switch (role) {
    case UserRole.Artist:
      return ROUTES.ARTIST_DASHBOARD;
    case UserRole.Admin:
      return ROUTES.ADMIN_DASHBOARD;
    case UserRole.Listener:
    default:
      return ROUTES.LISTENER_HOME;
  }
};

const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAppSelector(
    (state) => state.auth,
  );

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;

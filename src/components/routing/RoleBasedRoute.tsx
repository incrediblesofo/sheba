/**
 * Sheba Sound — Role-Based Route Guard
 * --------------------------------------
 * Restricts access to routes based on the user's RBAC role.
 * Must be nested inside a <ProtectedRoute /> so user is guaranteed
 * to be authenticated by the time this component renders.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import type { UserRole } from '@/types/models';
import { ROUTES } from '@/utils/constants';

interface RoleBasedRouteProps {
  /** One or more roles allowed to access the child routes. */
  allowedRoles: UserRole[];
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ allowedRoles }) => {
  const user = useAppSelector((state) => state.auth.user);

  if (!user || !allowedRoles.includes(user.role)) {
    /* Redirect unauthorised users to 404 rather than exposing route existence. */
    return <Navigate to={ROUTES.NOT_FOUND} replace />;
  }

  return <Outlet />;
};

export default RoleBasedRoute;

/**
 * Sheba Sound — Premium Status Hook
 * -----------------------------------
 * Provides easy access to the current user's premium status.
 * Uses the subscription query to determine tier.
 */

import { useGetCurrentSubscriptionQuery } from '@/features/music/musicApi';
import { useAppSelector } from '@/app/hooks';

export interface PremiumStatus {
  /** Whether the user has an active premium subscription. */
  isPremium: boolean;
  /** Whether subscription data is still loading. */
  isLoading: boolean;
  /** The current tier ('free' | 'premium'). */
  tier: 'free' | 'premium';
  /** Days remaining on the subscription (0 if free). */
  daysRemaining: number;
}

/**
 * Hook to check the current user's premium status.
 * Returns isPremium=false if user is not authenticated.
 */
export function usePremiumStatus(): PremiumStatus {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const { data, isLoading } = useGetCurrentSubscriptionQuery(undefined, {
    skip: !isAuthenticated,
  });

  if (!isAuthenticated || !data) {
    return {
      isPremium: false,
      isLoading: isAuthenticated ? isLoading : false,
      tier: 'free',
      daysRemaining: 0,
    };
  }

  const isPremium = data.tier === 'premium' && data.has_subscription;

  return {
    isPremium,
    isLoading,
    tier: isPremium ? 'premium' : 'free',
    daysRemaining: data.subscription?.days_remaining ?? 0,
  };
}

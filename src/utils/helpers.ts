/**
 * Sheba Sound — Music Helpers
 * ----------------------------
 * Pure utility functions for displaying music data.
 * Real data comes from the backend API via RTK Query.
 */

/** Format seconds to mm:ss. */
export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/** Format large numbers compactly (e.g. 1200000 → "1.2M"). */
export const formatStreamCount = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
};

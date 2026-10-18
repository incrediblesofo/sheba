/**
 * Sheba Sound — Radio Engine Hook
 * ---------------------------------
 * Watches the player queue and, when radioMode is active, automatically
 * fetches and appends recommended songs before the queue runs dry.
 *
 * Trigger: when remaining songs in queue drops to ≤ PREFETCH_THRESHOLD
 *           (or queue is already empty).
 *
 * Algorithm (server-side):
 *   Tier 1 — same genre as the current song (stream_count DESC)
 *   Tier 2 — weighted by user's listening history for this genre/artist
 *   Tier 3 — follow-boosted songs from artists the user follows
 *
 * Usage: mount once inside <GlobalPlayer> so it lives for the session.
 */

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { appendToQueue } from '@/features/player/playerSlice';
import { musicApi } from '@/features/music/musicApi';
import type { SongWithArtist } from '@/features/music/musicApi';

/** How many songs remaining in queue before we prefetch the next batch. */
const PREFETCH_THRESHOLD = 2;

/** How many songs to request per batch. */
const BATCH_SIZE = 10;

export function useRadioEngine(): void {
  const dispatch = useAppDispatch();

  const { currentTrack, queue, queueIndex, isPlaying, radioMode } =
    useAppSelector((state) => state.player);

  /**
   * Track all song IDs that have ever been in the queue during this radio
   * session so we don't re-add them.
   */
  const seenIds = useRef<Set<string>>(new Set());

  /**
   * Guard against firing multiple concurrent fetches.
   */
  const isFetching = useRef(false);

  /**
   * Reset seen IDs whenever the user manually clears/replaces the queue
   * (i.e. starts a completely new listening context).
   */
  const prevQueueLength = useRef(queue.length);
  useEffect(() => {
    if (queue.length < prevQueueLength.current - 2) {
      // Queue shrank significantly → new session started
      seenIds.current = new Set();
    }
    prevQueueLength.current = queue.length;
  }, [queue.length]);

  useEffect(() => {
    // Only run when radio is on, something is playing, and not already fetching
    if (!radioMode || !currentTrack || !isPlaying) return;

    const remaining = queue.length - queueIndex - 1;
    if (remaining > PREFETCH_THRESHOLD) return;
    if (isFetching.current) return;

    // Build the exclude list from everything already seen or in queue
    queue.forEach((s) => seenIds.current.add(s.id));
    seenIds.current.add(currentTrack.id);
    const excludeIds = Array.from(seenIds.current);

    isFetching.current = true;

    dispatch(
      musicApi.endpoints.getRadioRecommendations.initiate({
        seedId: currentTrack.id,
        excludeIds,
        limit: BATCH_SIZE,
      }),
    )
      .then((result) => {
        const songs = (result.data ?? []) as SongWithArtist[];
        if (songs.length > 0) {
          // Mark fetched songs as seen before appending
          songs.forEach((s) => seenIds.current.add(s.id));
          dispatch(appendToQueue(songs));
        }
      })
      .catch(() => {
        // Silently ignore — radio failing shouldn't break playback
      })
      .finally(() => {
        isFetching.current = false;
      });
  }, [
    radioMode,
    currentTrack,
    isPlaying,
    queue,
    queueIndex,
    dispatch,
  ]);
}

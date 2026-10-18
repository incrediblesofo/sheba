/**
 * Sheba Sound — Player Redux Slice
 * ----------------------------------
 * Manages the global audio player state: current track, queue,
 * playback controls, volume, progress, shuffle, and repeat mode.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Song } from '@/types/models';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  /** The currently loaded track (null if nothing is playing). */
  currentTrack: Song | null;
  /** Ordered list of tracks in the queue. */
  queue: Song[];
  /** Index of the current track within the queue. */
  queueIndex: number;
  /** Whether audio is currently playing. */
  isPlaying: boolean;
  /** Volume level 0–1. */
  volume: number;
  /** Whether audio is muted. */
  isMuted: boolean;
  /** Current playback position in seconds. */
  progress: number;
  /** Total duration of the current track in seconds. */
  duration: number;
  /** Shuffle mode toggle. */
  shuffle: boolean;
  /** Repeat mode: off, repeat-all, repeat-one. */
  repeat: RepeatMode;
  /** Whether the full-screen player overlay is open. */
  isFullScreen: boolean;
  /**
   * Radio mode: when true the RadioEngine hook automatically fetches
   * and appends more songs when the queue is about to run out.
   * Defaults to true (Spotify-style auto-play).
   */
  radioMode: boolean;
}

/* ------------------------------------------------------------------ */
/*  Initial State                                                      */
/* ------------------------------------------------------------------ */

const initialState: PlayerState = {
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: 0.7,
  isMuted: false,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',
  isFullScreen: false,
  radioMode: true,
};

/* ------------------------------------------------------------------ */
/*  Slice                                                              */
/* ------------------------------------------------------------------ */

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    /**
     * Play a single track immediately.
     * Optionally provide a queue context (e.g. album or playlist tracks).
     */
    playTrack: (
      state,
      action: PayloadAction<{ track: Song; queue?: Song[] }>,
    ) => {
      const { track, queue } = action.payload;
      state.currentTrack = track;
      state.isPlaying = true;
      state.progress = 0;

      if (queue && queue.length > 0) {
        state.queue = queue;
        state.queueIndex = queue.findIndex((s) => s.id === track.id);
        if (state.queueIndex === -1) state.queueIndex = 0;
      } else {
        state.queue = [track];
        state.queueIndex = 0;
      }
    },

    /** Toggle play/pause. */
    togglePlayPause: (state) => {
      if (state.currentTrack) {
        state.isPlaying = !state.isPlaying;
      }
    },

    /** Explicitly set playing state. */
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },

    /** Pause playback. */
    pause: (state) => {
      state.isPlaying = false;
    },

    /** Skip to the next track in the queue. */
    nextTrack: (state) => {
      if (state.queue.length === 0) return;

      if (state.repeat === 'one') {
        // Restart current track
        state.progress = 0;
        state.isPlaying = true;
        return;
      }

      let nextIndex: number;

      if (state.shuffle) {
        // Pick a random different index
        if (state.queue.length === 1) {
          nextIndex = 0;
        } else {
          do {
            nextIndex = Math.floor(Math.random() * state.queue.length);
          } while (nextIndex === state.queueIndex);
        }
      } else {
        nextIndex = state.queueIndex + 1;
      }

      if (nextIndex >= state.queue.length) {
        if (state.repeat === 'all') {
          nextIndex = 0;
        } else {
          // End of queue, stop playback
          state.isPlaying = false;
          return;
        }
      }

      state.queueIndex = nextIndex;
      state.currentTrack = state.queue[nextIndex];
      state.progress = 0;
      state.isPlaying = true;
    },

    /** Go to the previous track in the queue. */
    prevTrack: (state) => {
      if (state.queue.length === 0) return;

      // If more than 3 seconds in, restart current track
      if (state.progress > 3) {
        state.progress = 0;
        return;
      }

      let prevIndex: number;

      if (state.shuffle) {
        prevIndex = Math.floor(Math.random() * state.queue.length);
      } else {
        prevIndex = state.queueIndex - 1;
      }

      if (prevIndex < 0) {
        prevIndex = state.repeat === 'all' ? state.queue.length - 1 : 0;
      }

      state.queueIndex = prevIndex;
      state.currentTrack = state.queue[prevIndex];
      state.progress = 0;
      state.isPlaying = true;
    },

    /** Update current playback progress (called by the audio element's timeupdate). */
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },

    /** Seek to a specific position. */
    seekTo: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },

    /** Set the total duration of the current track. */
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },

    /** Set volume (0–1). */
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload));
      if (state.volume > 0) state.isMuted = false;
    },

    /** Toggle mute. */
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },

    /** Toggle shuffle mode. */
    toggleShuffle: (state) => {
      state.shuffle = !state.shuffle;
    },

    /** Cycle repeat mode: off → all → one → off. */
    cycleRepeat: (state) => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const currentIdx = modes.indexOf(state.repeat);
      state.repeat = modes[(currentIdx + 1) % modes.length];
    },

    /** Replace the entire queue (e.g. when user clicks "Play All" on a playlist). */
    setQueue: (state, action: PayloadAction<Song[]>) => {
      state.queue = action.payload;
      if (action.payload.length > 0) {
        state.queueIndex = 0;
        state.currentTrack = action.payload[0];
        state.progress = 0;
        state.isPlaying = true;
      }
    },

    /** Add a song to the end of the queue. */
    addToQueue: (state, action: PayloadAction<Song>) => {
      state.queue.push(action.payload);
    },

    /** Insert a song right after the current track ("Play Next"). */
    playNext: (state, action: PayloadAction<Song>) => {
      const insertAt = state.queueIndex + 1;
      state.queue.splice(insertAt, 0, action.payload);
    },

    /** Remove a song from the queue by its index. */
    removeFromQueue: (state, action: PayloadAction<number>) => {
      const removeIdx = action.payload;
      if (removeIdx < 0 || removeIdx >= state.queue.length) return;
      state.queue.splice(removeIdx, 1);
      // Adjust queueIndex if needed
      if (removeIdx < state.queueIndex) {
        state.queueIndex -= 1;
      } else if (removeIdx === state.queueIndex) {
        // Removed the current track — play the next one
        if (state.queue.length === 0) {
          return initialState;
        }
        state.queueIndex = Math.min(state.queueIndex, state.queue.length - 1);
        state.currentTrack = state.queue[state.queueIndex];
        state.progress = 0;
      }
    },

    /** Clear the player completely. */
    clearPlayer: () => initialState,

    /** Toggle the full-screen player overlay. */
    toggleFullScreen: (state) => {
      state.isFullScreen = !state.isFullScreen;
    },

    /** Explicitly open or close the full-screen overlay. */
    setFullScreen: (state, action: PayloadAction<boolean>) => {
      state.isFullScreen = action.payload;
    },

    /** Toggle radio / auto-play mode. */
    toggleRadioMode: (state) => {
      state.radioMode = !state.radioMode;
    },

    /**
     * Append an array of songs to the END of the queue without changing
     * the current track or index. Used by the RadioEngine to silently
     * extend the queue when it is about to run out.
     */
    appendToQueue: (state, action: PayloadAction<Song[]>) => {
      if (action.payload.length === 0) return;
      // Deduplicate: skip songs already present in the queue
      const existingIds = new Set(state.queue.map((s) => s.id));
      const newSongs = action.payload.filter((s) => !existingIds.has(s.id));
      state.queue.push(...newSongs);
    },
  },
});

export const {
  playTrack,
  togglePlayPause,
  setIsPlaying,
  pause,
  nextTrack,
  prevTrack,
  setProgress,
  seekTo,
  setDuration,
  setVolume,
  toggleMute,
  toggleShuffle,
  cycleRepeat,
  setQueue,
  addToQueue,
  playNext,
  removeFromQueue,
  clearPlayer,
  toggleFullScreen,
  setFullScreen,
  toggleRadioMode,
  appendToQueue,
} = playerSlice.actions;

export default playerSlice.reducer;

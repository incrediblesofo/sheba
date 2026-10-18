/**
 * Sheba Sound — Search Page
 * --------------------------
 * Mobile: Full-width search bar, recent searches with clear all, results list.
 * Desktop: Existing design with grid + list views.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  List,
  Paper,
  Skeleton,
  CircularProgress,
  IconButton,
  InputBase,
  useTheme,
  useMediaQuery,
  Avatar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MicIcon from '@mui/icons-material/Mic';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonIcon from '@mui/icons-material/Person';
import SongCard from '@/components/music/SongCard';
import SongListItem from '@/components/music/SongListItem';
import AlbumCard from '@/components/music/AlbumCard';
import { useSearchMusicQuery, useGetSongsQuery } from '@/features/music/musicApi';
import { useAppDispatch } from '@/app/hooks';
import { setQueue } from '@/features/player/playerSlice';
import type { SongWithArtist } from '@/features/music/musicApi';
import { Genre } from '@/types/models';
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

/** All genre values for filter chips. */
const ALL_GENRES = Object.values(Genre);

/** Debounce hook */
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), []);

  const update = useCallback(
    (newVal: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDebouncedValue(newVal), delay);
    },
    [delay, timerRef],
  );

  if (value !== debouncedValue && !timerRef.current) {
    update(value);
  }

  // Trigger on value change
  useMemo(() => update(value), [value, update]);

  return debouncedValue;
}

/** Recent searches hook using localStorage */
function useRecentSearches() {
  const STORAGE_KEY = 'sheba_recent_searches';
  const [searches, setSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearches((prev) => {
      const filtered = prev.filter((s) => s !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeSearch = useCallback((query: string) => {
    setSearches((prev) => {
      const updated = prev.filter((s) => s !== query);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { searches, addSearch, removeSearch, clearAll };
}

const SearchPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 400);

  const { searches, addSearch, removeSearch, clearAll } = useRecentSearches();

  // Use search API when there's a text query
  const { data: searchResults, isFetching: isSearching } = useSearchMusicQuery(
    debouncedQuery,
    { skip: !debouncedQuery.trim() },
  );

  // Use genre filter when only genre is selected (no text query)
  const { data: genreSongs = [], isFetching: isFilteringGenre } = useGetSongsQuery(
    selectedGenre && !debouncedQuery.trim() ? { genre: selectedGenre } : undefined,
    { skip: !selectedGenre || !!debouncedQuery.trim() },
  );

  // Browse all songs when no filter active
  const { data: allSongs = [], isLoading: isBrowseLoading } = useGetSongsQuery(
    undefined,
    { skip: !!debouncedQuery.trim() || !!selectedGenre },
  );

  // Determine which songs to show
  const displaySongs = useMemo(() => {
    if (debouncedQuery.trim() && searchResults) {
      let songs = searchResults.songs;
      if (selectedGenre) {
        songs = songs.filter((s) => s.genre === selectedGenre);
      }
      return songs;
    }
    if (selectedGenre) return genreSongs;
    return allSongs;
  }, [debouncedQuery, searchResults, selectedGenre, genreSongs, allSongs]);

  const displayAlbums = debouncedQuery.trim() && searchResults ? searchResults.albums : [];
  const displayArtists = debouncedQuery.trim() && searchResults ? searchResults.artists : [];

  const isLoading = isSearching || isFilteringGenre || isBrowseLoading;

  const handleGenreClick = (genre: string): void => {
    setSelectedGenre((prev) => (prev === genre ? null : genre));
  };

  const handleSearchSubmit = () => {
    if (query.trim()) {
      addSearch(query.trim());
    }
  };

  /* ================================================================ */
  /*  MOBILE LAYOUT                                                    */
  /* ================================================================ */
  if (isMobile) {
    return (
      <Box sx={{ pt: 4, px: 2 }}>
        {/* Search Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            borderRadius: '8px',
            px: 1.5,
            py: 0.75,
            mb: 3,
          }}
        >
          <SearchIcon sx={{ color: 'text.secondary', fontSize: 20, mr: 1 }} />
          <InputBase
            placeholder="Search songs, albums, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
            autoFocus
            sx={{
              flex: 1,
              color: 'text.primary',
              fontSize: '0.875rem',
              '& input::placeholder': { color: 'text.secondary', opacity: 0.7 },
            }}
          />
          {isSearching && <CircularProgress size={18} sx={{ ml: 1 }} />}
          <MicIcon sx={{ color: 'text.secondary', fontSize: 20, ml: 1 }} />
        </Box>

        {/* Show results if query, otherwise show recent searches */}
        {!debouncedQuery.trim() ? (
          <>
            {/* Recent Searches */}
            {searches.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body1" fontWeight={700} sx={{ color: 'text.primary' }}>
                    Recent searches
                  </Typography>
                  <Typography
                    variant="body2"
                    onClick={clearAll}
                    sx={{
                      color: '#E57373',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}
                  >
                    Clear all
                  </Typography>
                </Box>
                {searches.map((search) => (
                  <Box
                    key={search}
                    onClick={() => setQuery(search)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 1.25,
                      cursor: 'pointer',
                    }}
                  >
                    <AccessTimeIcon sx={{ color: 'text.secondary', fontSize: 20, mr: 2 }} />
                    <Typography
                      variant="body2"
                      sx={{ flex: 1, color: 'text.primary', fontSize: '0.9rem' }}
                    >
                      {search}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); removeSearch(search); }}
                      sx={{ color: 'text.secondary' }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </>
        ) : (
          <>
            {/* Search Results */}
            {isLoading ? (
              <Box>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
                ))}
              </Box>
            ) : displaySongs.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No results found for "{debouncedQuery}"
                </Typography>
              </Box>
            ) : (
              <Box>
                {/* Artist Results */}
                {displayArtists.length > 0 && (
                  <>
                    <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
                      Artists
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 2, mb: 2, '&::-webkit-scrollbar': { height: 0 } }}>
                      {displayArtists.map((artist) => (
                        <Box
                          key={artist.id}
                          onClick={() => navigate(`/artist/${artist.id}`)}
                          sx={{
                            flex: '0 0 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: 80,
                            cursor: 'pointer',
                          }}
                        >
                          <Avatar
                            src={artist.profile_image_url || undefined}
                            sx={{
                              width: 64, height: 64, mb: 0.5,
                              background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
                            }}
                          >
                            <PersonIcon />
                          </Avatar>
                          <Typography variant="caption" noWrap fontWeight={600} sx={{ fontSize: '0.7rem', textAlign: 'center', maxWidth: 80 }}>
                            {artist.stage_name}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
                {displayAlbums.length > 0 && (
                  <>
                    <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
                      Albums
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 2, mb: 2, '&::-webkit-scrollbar': { height: 0 } }}>
                      {displayAlbums.map((album) => (
                        <Box key={album.id} sx={{ flex: '0 0 auto' }}>
                          <AlbumCard album={album} />
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
                <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
                  Songs
                </Typography>
                {displaySongs.map((song) => (
                  <Box
                    key={song.id}
                    onClick={() => dispatch(setQueue([song as SongWithArtist]))}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 1,
                      cursor: 'pointer',
                      borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
                    }}
                  >
                    <Avatar
                      variant="rounded"
                      src={song.cover_image_url || SONG_PLACEHOLDER}
                      alt={song.title}
                      sx={{ width: 48, height: 48, borderRadius: 1, mr: 1.5, flexShrink: 0 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap fontWeight={700} sx={{ fontSize: '0.875rem' }}>
                        {song.title}
                      </Typography>
                      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {(song as SongWithArtist).artist_name ?? 'Unknown Artist'}
                      </Typography>
                    </Box>
                    <IconButton size="small" sx={{ color: 'text.secondary' }}>
                      <MoreVertIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>
    );
  }

  /* ================================================================ */
  /*  DESKTOP LAYOUT (existing design)                                 */
  /* ================================================================ */
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Search
      </Typography>

      {/* ---- Search Input ---- */}
      <TextField
        placeholder="Search for songs, artists, albums..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 3, maxWidth: 500 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: isSearching ? (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ) : undefined,
          },
        }}
      />

      {/* ---- Genre Filter Chips ---- */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        {ALL_GENRES.map((genre) => (
          <Chip
            key={genre}
            label={genre.charAt(0).toUpperCase() + genre.slice(1)}
            onClick={() => handleGenreClick(genre)}
            color={selectedGenre === genre ? 'primary' : 'default'}
            variant={selectedGenre === genre ? 'filled' : 'outlined'}
            size="small"
          />
        ))}
      </Stack>

      {/* ---- Artist results from search ---- */}
      {displayArtists.length > 0 && (
        <>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Artists
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              pb: 2,
              mb: 3,
              '&::-webkit-scrollbar': { height: 0 },
              scrollbarWidth: 'none',
            }}
          >
            {displayArtists.map((artist) => (
              <Paper
                key={artist.id}
                onClick={() => navigate(`/artist/${artist.id}`)}
                sx={{
                  flex: '0 0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 3,
                  width: 140,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <Avatar
                  src={artist.profile_image_url || undefined}
                  sx={{
                    width: 80, height: 80, mb: 1,
                    background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
                    fontSize: 32,
                  }}
                >
                  <PersonIcon sx={{ fontSize: 36 }} />
                </Avatar>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 120 }}>
                  {artist.stage_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Artist
                </Typography>
              </Paper>
            ))}
          </Box>
        </>
      )}

      {/* ---- Albums from search ---- */}
      {displayAlbums.length > 0 && (
        <>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Albums
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              pb: 2,
              mb: 3,
              '&::-webkit-scrollbar': { height: 0 },
              scrollbarWidth: 'none',
            }}
          >
            {displayAlbums.map((album) => (
              <Box key={album.id} sx={{ flex: '0 0 auto' }}>
                <AlbumCard album={album} />
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* ---- Results ---- */}
      {isLoading ? (
        <Box>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
          ))}
        </Box>
      ) : displaySongs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">
            {debouncedQuery.trim()
              ? 'No songs found. Try a different search or genre filter.'
              : 'Start typing to search for songs, artists, and albums.'}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Card grid for visual browsing */}
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            {displaySongs.length} result{displaySongs.length !== 1 && 's'}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(5, 1fr)',
              },
              gap: 2,
              mb: 4,
            }}
          >
            {displaySongs.map((song) => (
              <SongCard key={song.id} song={song} queue={displaySongs} />
            ))}
          </Box>

          {/* Also show as a list for quick scanning */}
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            List View
          </Typography>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <List disablePadding>
              {displaySongs.map((song, index) => (
                <SongListItem
                  key={song.id}
                  song={song}
                  index={index}
                  queue={displaySongs}
                />
              ))}
            </List>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default SearchPage;

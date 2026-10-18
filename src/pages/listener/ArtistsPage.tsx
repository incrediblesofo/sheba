/**
 * Sheba Sound — Artists Page
 * ----------------------------
 * Dedicated page showcasing all artists on the platform.
 * Features:
 *   • Hero section with Ethiopian-inspired gradient
 *   • "Popular Artists" — top artists by stream count
 *   • "Rising Stars" — newest artists
 *   • "All Artists" — full searchable/filterable grid
 *   • Glassmorphic artist cards with hover animations
 * Theme-aware: adapts to dark and light modes.
 */

import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  Skeleton,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import GroupsIcon from '@mui/icons-material/Groups';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { formatStreamCount } from '@/utils/helpers';
import { useGetArtistsQuery } from '@/features/music/musicApi';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Section header with icon and count */
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: number;
}> = ({ icon, title, subtitle, count }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark
              ? 'linear-gradient(135deg, rgba(18,166,74,0.2) 0%, rgba(18,166,74,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(7,137,48,0.15) 0%, rgba(7,137,48,0.04) 100%)',
            color: '#12A64A',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </Typography>
            {count !== undefined && (
              <Chip
                label={count}
                size="small"
                sx={{
                  fontWeight: 700,
                  height: 22,
                  fontSize: '0.7rem',
                  bgcolor: isDark ? 'rgba(18,166,74,0.12)' : 'rgba(7,137,48,0.08)',
                  color: '#12A64A',
                }}
              />
            )}
          </Box>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

/** Featured artist card — horizontal layout for Popular section */
const FeaturedArtistCard: React.FC<{
  artist: { id: string; stage_name: string; profile_image_url: string | null; verified: boolean; total_streams: number; bio: string };
  rank: number;
  onClick: () => void;
}> = ({ artist, rank, onClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        p: 2,
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
        background: isDark
          ? 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(18,166,74,0.02) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(7,137,48,0.02) 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: isDark
            ? '0 12px 40px rgba(18,166,74,0.15)'
            : '0 12px 32px rgba(0,0,0,0.1)',
          borderColor: isDark ? 'rgba(18,166,74,0.2)' : 'rgba(7,137,48,0.15)',
          '& .rank-badge': {
            background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
            color: '#fff',
          },
          '& .artist-arrow': {
            opacity: 1,
            transform: 'translateX(0)',
          },
        },
      }}
    >
      {/* Rank badge */}
      <Box
        className="rank-badge"
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: '0.85rem',
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          color: 'text.secondary',
          flexShrink: 0,
          transition: 'all 0.3s ease',
        }}
      >
        {rank}
      </Box>

      {/* Artist avatar */}
      <Avatar
        src={artist.profile_image_url ?? undefined}
        alt={artist.stage_name}
        sx={{
          width: 60,
          height: 60,
          boxShadow: isDark
            ? '0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: 28,
          bgcolor: '#12A64A',
          flexShrink: 0,
        }}
      >
        <PersonIcon sx={{ fontSize: 28 }} />
      </Avatar>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="body1" fontWeight={700} noWrap>
            {artist.stage_name}
          </Typography>
          {artist.verified && (
            <VerifiedIcon sx={{ fontSize: 16, color: '#5B9BD5', flexShrink: 0 }} />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
          {formatStreamCount(artist.total_streams)} streams
        </Typography>
        {artist.bio && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: 'block', mt: 0.25, fontSize: '0.7rem', maxWidth: 280, opacity: 0.7 }}
          >
            {artist.bio}
          </Typography>
        )}
      </Box>

      {/* Arrow */}
      <ArrowForwardIcon
        className="artist-arrow"
        sx={{
          fontSize: 18,
          color: '#12A64A',
          opacity: 0,
          transform: 'translateX(-8px)',
          transition: 'all 0.3s ease',
          flexShrink: 0,
        }}
      />
    </Paper>
  );
};

/** Standard artist card — circular avatar, vertical layout */
const ArtistCard: React.FC<{
  artist: { id: string; stage_name: string; profile_image_url: string | null; verified: boolean; total_streams: number };
  onClick: () => void;
}> = ({ artist, onClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      onClick={onClick}
      sx={{
        textAlign: 'center',
        cursor: 'pointer',
        p: 2,
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-6px)',
          bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          '& .artist-avatar-ring': {
            borderColor: '#12A64A',
            transform: 'scale(1.05)',
          },
        },
      }}
    >
      <Box
        className="artist-avatar-ring"
        sx={{
          width: { xs: 100, sm: 130 },
          height: { xs: 100, sm: 130 },
          borderRadius: '50%',
          border: '3px solid transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          transition: 'all 0.3s ease',
          mb: 1.5,
        }}
      >
        <Avatar
          src={artist.profile_image_url ?? undefined}
          alt={artist.stage_name}
          sx={{
            width: { xs: 90, sm: 120 },
            height: { xs: 90, sm: 120 },
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.5)'
              : '0 8px 24px rgba(0,0,0,0.12)',
            fontSize: { xs: 36, sm: 48 },
            bgcolor: '#12A64A',
          }}
        >
          <PersonIcon sx={{ fontSize: { xs: 36, sm: 48 } }} />
        </Avatar>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
        <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 120 }}>
          {artist.stage_name}
        </Typography>
        {artist.verified && <VerifiedIcon sx={{ fontSize: 14, color: '#5B9BD5' }} />}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
        {formatStreamCount(artist.total_streams)} streams
      </Typography>
    </Box>
  );
};

/** Skeleton for featured card */
const FeaturedSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
    <Skeleton variant="circular" width={32} height={32} />
    <Skeleton variant="circular" width={60} height={60} />
    <Box sx={{ flex: 1 }}>
      <Skeleton width={160} height={22} />
      <Skeleton width={80} height={14} />
    </Box>
  </Box>
);

/** Skeleton for standard card */
const CardSkeleton: React.FC = () => (
  <Box sx={{ textAlign: 'center', p: 2 }}>
    <Skeleton variant="circular" width={120} height={120} sx={{ mx: 'auto', mb: 1.5 }} />
    <Skeleton width={80} height={18} sx={{ mx: 'auto', mb: 0.5 }} />
    <Skeleton width={60} height={14} sx={{ mx: 'auto' }} />
  </Box>
);

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const ArtistsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { data: artists = [], isLoading } = useGetArtistsQuery();
  const [searchQuery, setSearchQuery] = useState('');

  // Derived lists
  const popularArtists = useMemo(() => {
    return [...artists].sort((a, b) => b.total_streams - a.total_streams).slice(0, 6);
  }, [artists]);

  const risingStars = useMemo(() => {
    return [...artists]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [artists]);

  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return artists;
    const q = searchQuery.toLowerCase();
    return artists.filter(
      (a) =>
        a.stage_name.toLowerCase().includes(q) ||
        a.bio?.toLowerCase().includes(q),
    );
  }, [artists, searchQuery]);

  return (
    <Box sx={{ mb: 4 }}>
      {/* ================================================================ */}
      {/*  Hero Banner                                                      */}
      {/* ================================================================ */}
      <Box
        sx={{
          p: { xs: 3, sm: 5 },
          mb: 4,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, #0D2818 0%, #0A0A0F 30%, #1A0A1E 60%, #0A0A0F 100%)'
            : 'linear-gradient(135deg, #E8F5E9 0%, #FFFFFF 30%, #F3E5F5 60%, #FFFFFF 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background:
              'linear-gradient(90deg, #078930 0%, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%, #DA121A 100%)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '10%',
            right: '-5%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(18,166,74,0.08) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(7,137,48,0.06) 0%, transparent 70%)',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <GroupsIcon sx={{ fontSize: 32, color: '#12A64A' }} />
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              Artists
            </Typography>
          </Box>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              maxWidth: 520,
              mb: 3,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              lineHeight: 1.6,
            }}
          >
            Discover Ethiopian musical talent — from legendary icons to emerging voices shaping the future of Ethiopian music.
          </Typography>

          {/* Search bar */}
          <TextField
            placeholder="Search artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              maxWidth: 440,
              width: '100%',
              '& .MuiOutlinedInput-root': {
                borderRadius: 500,
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                backdropFilter: 'blur(8px)',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                },
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#12A64A',
                  borderWidth: 2,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* ================================================================ */}
      {/*  Popular Artists — Top by streams (horizontal featured cards)     */}
      {/* ================================================================ */}
      <SectionHeader
        icon={<StarIcon sx={{ fontSize: 22 }} />}
        title="Popular Artists"
        subtitle="Most streamed artists on Sheba Sound"
        count={popularArtists.length}
      />
      {isLoading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 5 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <FeaturedSkeleton key={i} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
            mb: 5,
          }}
        >
          {popularArtists.map((artist, i) => (
            <FeaturedArtistCard
              key={artist.id}
              artist={artist}
              rank={i + 1}
              onClick={() => navigate(`/artist/${artist.id}`)}
            />
          ))}
        </Box>
      )}

      {/* ================================================================ */}
      {/*  Rising Stars — Newest artists (horizontal scroll)               */}
      {/* ================================================================ */}
      <SectionHeader
        icon={<TrendingUpIcon sx={{ fontSize: 22 }} />}
        title="Rising Stars"
        subtitle="Newest artists joining the platform"
        count={risingStars.length}
      />
      {isLoading ? (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, mb: 5 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Box key={i} sx={{ flexShrink: 0 }}>
              <CardSkeleton />
            </Box>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            pb: 1,
            mb: 5,
            mx: -1,
            px: 1,
            '&::-webkit-scrollbar': { height: 0 },
            scrollbarWidth: 'none',
          }}
        >
          {risingStars.map((artist) => (
            <Box key={artist.id} sx={{ flexShrink: 0 }}>
              <ArtistCard
                artist={artist}
                onClick={() => navigate(`/artist/${artist.id}`)}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* ================================================================ */}
      {/*  All Artists — Full grid (filtered by search)                    */}
      {/* ================================================================ */}
      <SectionHeader
        icon={<GroupsIcon sx={{ fontSize: 22 }} />}
        title="All Artists"
        subtitle="Browse the complete artist catalog"
        count={filteredArtists.length}
      />

      {isLoading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(5, 1fr)',
            },
            gap: 1,
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </Box>
      ) : filteredArtists.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          }}
        >
          <PersonIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            No artists found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery ? `No results for "${searchQuery}". Try a different search.` : 'No artists available yet.'}
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(5, 1fr)',
            },
            gap: 1,
          }}
        >
          {filteredArtists.map((artist) => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              onClick={() => navigate(`/artist/${artist.id}`)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ArtistsPage;

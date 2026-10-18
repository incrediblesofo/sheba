/**
 * Sheba Sound — Downloads Page
 * ------------------------------
 * Dedicated page for the "Downloaded" bottom nav tab.
 * Shows downloaded songs for offline listening (premium feature).
 */

import {
  Box, Typography, Paper, List, Skeleton,
  Button, useTheme, useMediaQuery,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import StarIcon from '@mui/icons-material/Star';
import SongListItem from '@/components/music/SongListItem';
import DownloadButton from '@/components/music/DownloadButton';
import { useGetMyDownloadsQuery } from '@/features/music/musicApi';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

const DownloadsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: downloadsData, isLoading } = useGetMyDownloadsQuery();
  const { isPremium } = usePremiumStatus();

  return (
    <Box sx={{ pt: isMobile ? 4 : 0, px: isMobile ? 2 : 0 }}>
      <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700} gutterBottom>
        Downloads
      </Typography>

      {!isPremium ? (
        <Paper
          sx={{
            p: 5, textAlign: 'center', borderRadius: 3,
            background: isDark
              ? 'linear-gradient(135deg, rgba(243,156,18,0.08) 0%, rgba(0,0,0,0) 100%)'
              : 'linear-gradient(135deg, rgba(243,156,18,0.06) 0%, rgba(255,255,255,0) 100%)',
            border: '1px solid rgba(243,156,18,0.2)',
          }}
        >
          <DownloadIcon sx={{ fontSize: 48, color: '#F39C12', opacity: 0.6, mb: 1 }} />
          <Typography fontWeight={700} gutterBottom>
            Offline Downloads
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Download up to 25 songs for offline listening with Premium.
          </Typography>
          <Button
            variant="contained" size="small" startIcon={<StarIcon />}
            href="/subscription"
            sx={{
              bgcolor: '#F39C12', color: '#000', fontWeight: 700,
              borderRadius: 99, px: 3,
              '&:hover': { bgcolor: '#E67E22' },
            }}
          >
            Upgrade to Premium
          </Button>
        </Paper>
      ) : isLoading ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
          ))}
        </Box>
      ) : !downloadsData || downloadsData.songs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <DownloadIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">
            No downloaded songs yet. Click the download icon on any song to save it offline.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {downloadsData.count}/{downloadsData.limit} songs downloaded
            </Typography>
          </Box>
          <List disablePadding>
            {downloadsData.songs.map((song, index) => (
              <Box key={song.id} sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <SongListItem song={song} index={index} queue={downloadsData.songs} />
                </Box>
                <Box sx={{ pr: 1 }}>
                  <DownloadButton songId={song.id} isDownloaded={true} />
                </Box>
              </Box>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default DownloadsPage;

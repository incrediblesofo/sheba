/**
 * Sheba Sound — Loading Spinner
 * ------------------------------
 * A centred circular progress indicator used during data fetching.
 */

import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  /** Optional message displayed below the spinner. */
  message?: string;
  /** Fill the full viewport height (true for page-level loading). */
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  fullScreen = false,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: fullScreen ? '100vh' : '40vh',
      gap: 2,
    }}
  >
    <CircularProgress color="primary" size={48} />
    {message && (
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    )}
  </Box>
);

export default LoadingSpinner;

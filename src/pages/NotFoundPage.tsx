/**
 * Sheba Sound — 404 Not Found Page
 * ----------------------------------
 * Displayed when no route matches or when a user tries to access a
 * route they don't have permission for.
 */

import { Box, Typography, Button } from '@mui/material';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        px: 3,
        bgcolor: 'background.default',
      }}
    >
      <SentimentDissatisfiedIcon
        sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }}
      />
      <Typography variant="h3" fontWeight={700} gutterBottom>
        404
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Page not found
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 400 }}
      >
        The page you're looking for doesn't exist or you don't have permission
        to view it.
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => navigate(ROUTES.LISTENER_HOME, { replace: true })}
      >
        Go Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;

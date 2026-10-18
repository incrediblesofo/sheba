/**
 * Sheba Sound — Welcome / Landing Page
 * --------------------------------------
 * Full-screen splash page with background image,
 * ShebaSound branding, and CTA buttons for Get Started / Sign In.
 */

import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        bgcolor: '#0a0a0a',
      }}
    >
      {/* ---- Background Image ---- */}
      <Box
        component="img"
        src="/welcome-bg.jpg"
        alt=""
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.5,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {/* ---- Dark overlay for readability ---- */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ---- Content ---- */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          px: 3,
          maxWidth: 480,
          animation: 'fadeInUp 0.8s ease-out',
          '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(30px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        {/* Brand Name */}
        <Typography
          variant="h2"
          sx={{
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.02em',
            fontSize: { xs: '2.5rem', sm: '3.5rem' },
            mb: 1.5,
            textShadow: '0 4px 24px rgba(0,0,0,0.5)',
            fontStyle: 'italic',
          }}
        >
          ShebaSound
        </Typography>

        {/* Tagline */}
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: { xs: '0.95rem', sm: '1.05rem' },
            mb: 5,
            lineHeight: 1.6,
          }}
        >
          Listen to free music from your favorite artists.
        </Typography>

        {/* Get Started Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={() => navigate(ROUTES.REGISTER)}
          id="welcome-get-started"
          sx={{
            py: 1.5,
            borderRadius: 50,
            background: '#7C3AED !important',
            fontWeight: 700,
            fontSize: '1rem',
            textTransform: 'none',
            letterSpacing: 0.5,
            boxShadow: '0 8px 32px rgba(124, 58, 237, 0.4)',
            '&:hover': {
              background: '#6D28D9 !important',
              transform: 'scale(1.02)',
              boxShadow: '0 12px 40px rgba(124, 58, 237, 0.5)',
            },
            transition: 'all 0.25s ease',
            mb: 2,
          }}
        >
          Get started
        </Button>

        {/* Already have an account */}
        <Typography
          variant="body2"
          onClick={() => navigate(ROUTES.LOGIN)}
          id="welcome-have-account"
          sx={{
            color: 'rgba(255,255,255,0.75)',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: 0.3,
            '&:hover': {
              color: '#fff',
              textDecoration: 'underline',
            },
            transition: 'color 0.2s ease',
          }}
        >
          I already have an account
        </Typography>
      </Box>
    </Box>
  );
};

export default WelcomePage;

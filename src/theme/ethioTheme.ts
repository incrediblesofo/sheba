/**
 * Sheba Sound — Custom MUI Theme
 * --------------------------------
 * Premium Spotify-inspired dark-first design deeply infused with
 * Ethiopian cultural identity: tricolour palette (green, gold, red),
 * Lalibela cross geometry, Tizita warmth, and Afrobeat energy.
 *
 * Typography: "Inter" for Latin + "Noto Sans Ethiopic" for Ge'ez / Amharic.
 */

import { createTheme, type ThemeOptions } from '@mui/material/styles';

/* ------------------------------------------------------------------ */
/*  Colour Tokens                                                      */
/* ------------------------------------------------------------------ */

const ETHIOPIAN_GREEN       = '#078930';          // Flag green — raw
const ETHIOPIAN_GREEN_VIVID = '#12A64A';          // Primary CTA — richer, more premium
const ETHIOPIAN_GREEN_LIGHT = '#1ED760';          // Hover / bright accent
const ETHIOPIAN_GOLD        = '#FCDD09';          // Flag gold — warmth
const ETHIOPIAN_RED         = '#DA121A';          // Flag red — energy
const STAR_BLUE             = '#0F47AF';          // Star of David blue

/* Deep cinema-black backgrounds (richer than plain #000) */
const BG_DEFAULT_DARK = '#0A0A0F';
const BG_PAPER_DARK   = '#111118';
const BG_CARD_DARK    = '#16161F';
const BG_HOVER_DARK   = '#1E1E2A';

export const ethioColors = {
  ethiopianGreen:      ETHIOPIAN_GREEN,
  ethiopianGreenVivid: ETHIOPIAN_GREEN_VIVID,
  ethiopianGreenLight: ETHIOPIAN_GREEN_LIGHT,
  ethiopianGold:       ETHIOPIAN_GOLD,
  ethiopianRed:        ETHIOPIAN_RED,
  starBlue:            STAR_BLUE,
};

/* ------------------------------------------------------------------ */
/*  Shared Typography                                                  */
/* ------------------------------------------------------------------ */

const sharedTypography: ThemeOptions['typography'] = {
  fontFamily: [
    'Inter',
    'Noto Sans Ethiopic',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ].join(','),
  /* Responsive headings — clamp(min, preferred, max) for smooth scaling */
  h1: { fontWeight: 900, fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', letterSpacing: '-0.04em' },
  h2: { fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', letterSpacing: '-0.03em' },
  h3: { fontWeight: 700, fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)', letterSpacing: '-0.02em' },
  h4: { fontWeight: 700, fontSize: 'clamp(1.1rem, 3vw, 1.375rem)', letterSpacing: '-0.01em' },
  h5: { fontWeight: 700, fontSize: 'clamp(1rem, 2.5vw, 1.125rem)' },
  h6: { fontWeight: 700, fontSize: '1rem' },
  button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
  body1: { fontSize: '0.9375rem', lineHeight: 1.65 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.55 },
  caption: { fontSize: '0.6875rem', letterSpacing: '0.02em' },
};

const sharedShape: ThemeOptions['shape'] = {
  borderRadius: 8,
};

/* ------------------------------------------------------------------ */
/*  Dark Theme                                                         */
/* ------------------------------------------------------------------ */

const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: ETHIOPIAN_GREEN_VIVID,
      light: ETHIOPIAN_GREEN_LIGHT,
      dark: ETHIOPIAN_GREEN,
      contrastText: '#000000',
    },
    secondary: {
      main: ETHIOPIAN_GOLD,
      contrastText: '#000000',
    },
    warning: { main: ETHIOPIAN_GOLD },
    error:   { main: '#E74C3C' },
    background: {
      default: BG_DEFAULT_DARK,
      paper:   BG_PAPER_DARK,
    },
    text: {
      primary:   '#FFFFFF',
      secondary: '#A0A0B0',
    },
    divider: 'rgba(255,255,255,0.06)',
    action: {
      hover:    'rgba(255,255,255,0.06)',
      selected: 'rgba(18,166,74,0.12)',
    },
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: {
    /* --- Button --- */
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 500,
          padding: '10px 32px',
          fontSize: '0.875rem',
          fontWeight: 700,
          transition: 'all 0.18s cubic-bezier(0.25, 0.8, 0.25, 1)',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${ETHIOPIAN_GREEN_VIVID} 0%, ${ETHIOPIAN_GREEN} 100%)`,
          color: '#000',
          '&:hover': {
            background: `linear-gradient(135deg, ${ETHIOPIAN_GREEN_LIGHT} 0%, ${ETHIOPIAN_GREEN_VIVID} 100%)`,
            transform: 'scale(1.04)',
            boxShadow: `0 6px 24px rgba(18, 166, 74, 0.4)`,
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(255,255,255,0.25)',
          color: '#fff',
          '&:hover': {
            borderColor: ETHIOPIAN_GREEN_VIVID,
            background: 'rgba(18,166,74,0.08)',
          },
        },
        text: {
          color: '#A0A0B0',
          '&:hover': { color: '#fff', background: 'transparent' },
        },
      },
    },

    /* --- TextField --- */
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 500,
            backgroundColor: 'rgba(255,255,255,0.08)',
            transition: 'background-color 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.11)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.25)',
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: ETHIOPIAN_GREEN_VIVID,
              borderWidth: 2,
            },
          },
        },
      },
    },

    /* --- Card --- */
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: BG_CARD_DARK,
          backgroundImage: 'none',
          transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
          '&:hover': {
            backgroundColor: BG_HOVER_DARK,
            boxShadow: `0 12px 40px rgba(18, 166, 74, 0.15)`,
            transform: 'translateY(-2px)',
          },
        },
      },
    },

    /* --- Paper --- */
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: BG_PAPER_DARK,
        },
      },
    },

    /* --- AppBar --- */
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: `rgba(10, 10, 15, 0.8)`,
          backdropFilter: 'blur(24px)',
          borderBottom: 'none',
          boxShadow: 'none',
        },
      },
    },

    /* --- Drawer / Sidebar --- */
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(10, 10, 15, 0.96)',
          backdropFilter: 'blur(24px)',
          borderRight: 'none',
        },
      },
    },

    /* --- ListItemButton --- */
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.07)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(18, 166, 74, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(18, 166, 74, 0.18)',
            },
          },
        },
      },
    },

    /* --- Slider --- */
    MuiSlider: {
      styleOverrides: {
        root: {
          color: ETHIOPIAN_GREEN_VIVID,
          height: 4,
          '&:hover': {
            '& .MuiSlider-thumb': { opacity: 1 },
            '& .MuiSlider-track': { height: 6 },
          },
          transition: 'all 0.15s ease',
        },
        thumb: {
          width: 12,
          height: 12,
          opacity: 0,
          transition: 'opacity 0.2s ease',
          '&.Mui-active': { opacity: 1 },
          '&:hover': { boxShadow: `0 0 0 8px rgba(18,166,74,0.18)` },
        },
        rail: {
          opacity: 0.25,
          backgroundColor: '#535360',
        },
        track: {
          border: 'none',
          transition: 'height 0.15s ease',
        },
      },
    },

    /* --- Chip --- */
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 500,
          fontWeight: 600,
          fontSize: '0.6875rem',
          letterSpacing: '0.03em',
        },
        colorPrimary: {
          backgroundColor: 'rgba(18, 166, 74, 0.2)',
          color: ETHIOPIAN_GREEN_LIGHT,
          '&:hover': { backgroundColor: 'rgba(18, 166, 74, 0.3)' },
        },
      },
    },

    /* --- IconButton --- */
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.15s ease',
          '&:hover': { transform: 'scale(1.08)' },
        },
      },
    },

    /* --- Tooltip --- */
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#2A2A38',
          color: '#fff',
          fontSize: '0.75rem',
          borderRadius: 8,
          padding: '6px 12px',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },

    /* --- Menu --- */
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1E1E2A',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },

    /* --- LinearProgress (for loading) --- */
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: 'rgba(255,255,255,0.08)',
        },
        bar: {
          background: `linear-gradient(90deg, ${ETHIOPIAN_GREEN_VIVID}, ${ETHIOPIAN_GOLD})`,
          borderRadius: 4,
        },
      },
    },

    /* --- CssBaseline --- */
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: BG_DEFAULT_DARK,
        },
      },
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Light Theme                                                        */
/* ------------------------------------------------------------------ */

const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: ETHIOPIAN_GREEN,
      light: ETHIOPIAN_GREEN_VIVID,
      dark: '#056625',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: STAR_BLUE,
      contrastText: '#FFFFFF',
    },
    warning: { main: ETHIOPIAN_GOLD },
    error:   { main: ETHIOPIAN_RED },
    background: {
      default: '#F2F2F7',
      paper:   '#FFFFFF',
    },
    text: {
      primary:   '#0D0D12',
      secondary: '#5A5A72',
    },
    divider: 'rgba(0,0,0,0.07)',
    action: {
      hover:    'rgba(0,0,0,0.05)',
      selected: 'rgba(7, 137, 48, 0.10)',
    },
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 500,
          padding: '10px 32px',
          fontSize: '0.875rem',
          fontWeight: 700,
          transition: 'all 0.18s cubic-bezier(0.25, 0.8, 0.25, 1)',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${ETHIOPIAN_GREEN_VIVID} 0%, ${ETHIOPIAN_GREEN} 100%)`,
          color: '#fff',
          '&:hover': {
            transform: 'scale(1.04)',
            boxShadow: `0 6px 20px rgba(7, 137, 48, 0.35)`,
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(0,0,0,0.18)',
          color: '#0D0D12',
          '&:hover': {
            borderColor: ETHIOPIAN_GREEN,
            background: 'rgba(7, 137, 48, 0.06)',
          },
        },
        text: {
          color: '#5A5A72',
          '&:hover': { color: '#0D0D12', background: 'transparent' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 500,
            backgroundColor: 'rgba(0,0,0,0.05)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0,0,0,0.2)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: ETHIOPIAN_GREEN,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
          '&:hover': {
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(242,242,247,0.88)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          color: '#0D0D12',
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FAFAFA',
          borderRight: '1px solid rgba(0,0,0,0.07)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.15s ease',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(7, 137, 48, 0.1)',
            '&:hover': { backgroundColor: 'rgba(7, 137, 48, 0.15)' },
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: ETHIOPIAN_GREEN },
        thumb: {
          width: 12,
          height: 12,
          '&:hover': { boxShadow: `0 0 0 8px rgba(7,137,48,0.18)` },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 500,
          fontWeight: 600,
          fontSize: '0.6875rem',
        },
        colorPrimary: {
          backgroundColor: 'rgba(7, 137, 48, 0.12)',
          color: ETHIOPIAN_GREEN,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.15s ease',
          '&:hover': { transform: 'scale(1.08)' },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#2A2A2A',
          color: '#fff',
          fontSize: '0.75rem',
          borderRadius: 8,
          padding: '6px 12px',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          border: '1px solid rgba(0,0,0,0.07)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: 'rgba(0,0,0,0.06)',
        },
        bar: {
          background: `linear-gradient(90deg, ${ETHIOPIAN_GREEN}, ${ETHIOPIAN_GREEN_VIVID})`,
          borderRadius: 4,
        },
      },
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Theme Factory                                                      */
/* ------------------------------------------------------------------ */

export const getEthioTheme = (mode: 'light' | 'dark') =>
  createTheme(mode === 'light' ? lightThemeOptions : darkThemeOptions);

/** Raw colour tokens — usable outside MUI context. */
export { ethioColors as palette };

/**
 * Sheba Sound — Top Navigation Bar
 * ----------------------------------
 * Glassmorphic AppBar with Left/Right navigation, inline search pill,
 * Ethiopian cultural accents, language switcher, and smooth transitions.
 * Theme-aware & i18n-aware.
 */

import { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Avatar,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  InputBase,
  Badge,
  Chip,
  useMediaQuery,
  useTheme,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MicExternalOnIcon from "@mui/icons-material/MicExternalOn";
import TranslateIcon from "@mui/icons-material/Translate";
import Logo from "@/components/common/Logo";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { toggleTheme, toggleSidebar } from "@/features/ui/uiSlice";
import { logOut } from "@/features/auth/authSlice";
import { useLogoutMutation } from "@/features/auth/authApi";
import { showSnackbar } from "@/features/ui/uiSlice";
import { useNavigate } from "react-router-dom";
import { ROUTES, DRAWER_WIDTH } from "@/utils/constants";
import { useTranslation, type Language } from "@/i18n";

const LANG_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "am", label: "አማርኛ", flag: "🇪🇹" },
  { code: "om", label: "Afaan Oromoo", flag: "🇪🇹" },
  { code: "ti", label: "ትግርኛ", flag: "🇪🇹" },
  { code: "gu", label: "ጉራግኛ", flag: "🇪🇹" },
];

const LANG_SHORT: Record<Language, string> = {
  en: "EN",
  am: "አማ",
  om: "OM",
  ti: "ትግ",
  gu: "ጉራ",
};

const TopBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";
  const { t, language, setLanguage } = useTranslation();

  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const themeMode = useAppSelector((state) => state.ui.themeMode);
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  const [logout] = useLogoutMutation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const menuOpen = Boolean(anchorEl);
  const langMenuOpen = Boolean(langAnchorEl);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = (): void => {
    setAnchorEl(null);
  };

  const handleLogout = async (): Promise<void> => {
    handleMenuClose();
    try {
      await logout().unwrap();
    } catch {
      // Server-side error — clear locally anyway
    }
    dispatch(logOut());
    dispatch(showSnackbar({ message: t("topbar.signOut") + " ✓", severity: "info" }));
    navigate(ROUTES.LISTENER_HOME, { replace: true });
  };

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(ROUTES.LISTENER_SEARCH);
    }
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: {
          md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : "100%",
        },
        ml: { md: sidebarOpen ? `${DRAWER_WIDTH}px` : 0 },
        transition: theme.transitions.create(["width", "margin"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        bgcolor: isDark ? "rgba(10, 10, 15, 0.82)" : "rgba(242, 242, 247, 0.88)",
        backdropFilter: "blur(24px)",
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Ethiopian flag accent at very top of AppBar */}
      <Box
        sx={{
          height: 2,
          background: "linear-gradient(90deg, #078930 0%, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%, #DA121A 100%)",
        }}
      />

      <Toolbar sx={{ gap: { xs: 0.25, sm: 0.5 }, minHeight: "60px !important", px: { xs: 1, sm: 2 } }}>
        {/* Sidebar Toggle */}
        <Tooltip title={t("topbar.menu")}>
          <IconButton
            edge="start"
            aria-label="toggle sidebar"
            onClick={() => dispatch(toggleSidebar())}
            sx={{
              color: "text.secondary",
              mr: 0.5,
              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

        {/* History nav arrows (desktop only) */}
        {!isMobile && (
          <Box sx={{ display: "flex", gap: 0.25, mr: 1 }}>
            <Tooltip title={t("topbar.goBack")}>
              <IconButton
                size="small"
                onClick={() => window.history.back()}
                sx={{
                  color: "text.secondary",
                  bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  width: 30,
                  height: 30,
                  "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)", color: "text.primary" },
                }}
              >
                <ArrowBackIosNewIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t("topbar.goForward")}>
              <IconButton
                size="small"
                onClick={() => window.history.forward()}
                sx={{
                  color: "text.secondary",
                  bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  width: 30,
                  height: 30,
                  "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)", color: "text.primary" },
                }}
              >
                <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Logo — mobile only or when sidebar closed */}
        {(isMobile || !sidebarOpen) && (
          <Box onClick={() => navigate(ROUTES.LISTENER_HOME)} sx={{ cursor: "pointer" }}>
            <Logo compact={isSmall} />
          </Box>
        )}

        {/* Inline Search Bar */}
        {!isSmall && (
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: searchFocused
                ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)")
                : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"),
              borderRadius: 500,
              px: 1.5,
              py: 0.5,
              ml: 2,
              flex: !isMobile ? "0 0 280px" : "1",
              maxWidth: 320,
              border: searchFocused
                ? `1.5px solid ${isDark ? "#12A64A" : "#078930"}`
                : "1.5px solid transparent",
              transition: "all 0.2s ease",
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} />
            <InputBase
              placeholder={t("topbar.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onClick={() => navigate(ROUTES.LISTENER_SEARCH)}
              sx={{
                fontSize: "0.875rem",
                color: "text.primary",
                flex: 1,
                "& input::placeholder": { color: "text.secondary", opacity: 0.8 },
              }}
            />
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Language Switcher */}
        <Tooltip title={t("topbar.switchLang")}>
          <IconButton
            onClick={(e) => setLangAnchorEl(e.currentTarget)}
            sx={{
              color: "text.secondary",
              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
              position: "relative",
            }}
          >
            <TranslateIcon sx={{ fontSize: 20 }} />
            <Typography
              component="span"
              sx={{
                position: "absolute",
                bottom: 2,
                right: 2,
                fontSize: "0.5rem",
                fontWeight: 800,
                lineHeight: 1,
                color: "#12A64A",
                bgcolor: isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)",
                borderRadius: 0.5,
                px: 0.3,
              }}
            >
              {LANG_SHORT[language]}
            </Typography>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={langAnchorEl}
          open={langMenuOpen}
          onClose={() => setLangAnchorEl(null)}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                minWidth: 180,
                bgcolor: isDark ? "#1A1A26" : "#FFFFFF",
                border: (t) => `1px solid ${t.palette.divider}`,
                borderRadius: 2,
                boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.6)" : "0 8px 32px rgba(0,0,0,0.12)",
              },
            },
          }}
        >
          {LANG_OPTIONS.map((opt) => (
            <MenuItem
              key={opt.code}
              selected={language === opt.code}
              onClick={() => {
                setLanguage(opt.code);
                setLangAnchorEl(null);
              }}
              sx={{
                py: 1,
                "&.Mui-selected": {
                  bgcolor: isDark ? "rgba(18,166,74,0.14)" : "rgba(7,137,48,0.10)",
                },
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, fontSize: "1.2rem" }}>
                {opt.flag}
              </ListItemIcon>
              <ListItemText
                primary={opt.label}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: language === opt.code ? 700 : 500,
                }}
              />
              {language === opt.code && (
                <Typography variant="caption" sx={{ color: "#12A64A", fontWeight: 700, ml: 1 }}>
                  ✓
                </Typography>
              )}
            </MenuItem>
          ))}
        </Menu>

        {/* Theme Toggle */}
        <Tooltip title={t("topbar.switchTheme", { mode: themeMode === "dark" ? t("topbar.light") : t("topbar.dark") })}>
          <IconButton
            onClick={() => dispatch(toggleTheme())}
            sx={{
              color: "text.secondary",
              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
            }}
          >
            {themeMode === "dark" ? (
              <LightModeIcon sx={{ fontSize: 20 }} />
            ) : (
              <DarkModeIcon sx={{ fontSize: 20 }} />
            )}
          </IconButton>
        </Tooltip>

        {/* Unauthenticated: Sign Up + Log In */}
        {!isAuthenticated && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", ml: 0.5 }}>
            <Button
              variant="text"
              onClick={() => navigate(ROUTES.WELCOME)}
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                "&:hover": { color: "text.primary", background: "transparent" },
                px: 2,
                display: { xs: "none", sm: "flex" },
              }}
            >
              {t("topbar.signUp")}
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(ROUTES.WELCOME)}
              sx={{
                borderRadius: 500,
                px: { xs: 2, sm: 3 },
                py: 0.875,
                fontWeight: 700,
                background: isDark
                  ? "linear-gradient(135deg, #fff 0%, #e8e8e8 100%)"
                  : "linear-gradient(135deg, #12A64A 0%, #078930 100%)",
                color: isDark ? "#000" : "#fff",
                "&:hover": {
                  transform: "scale(1.04)",
                  boxShadow: isDark
                    ? "0 4px 16px rgba(255,255,255,0.2)"
                    : "0 4px 16px rgba(18,166,74,0.35)",
                },
                transition: "all 0.18s ease",
              }}
            >
              {t("topbar.logIn")}
            </Button>
          </Box>
        )}

        {/* Authenticated: Notification + Avatar Dropdown */}
        {isAuthenticated && user && (
          <>
            {!isMobile && (
              <Tooltip title={t("topbar.notifications")}>
                <IconButton
                  sx={{
                    color: "text.secondary",
                    "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                  }}
                >
                  <Badge badgeContent={0} color="error">
                    <NotificationsIcon sx={{ fontSize: 20 }} />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={`${user.first_name} ${user.last_name}`}>
              <Box
                onClick={handleMenuOpen}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "pointer",
                  borderRadius: 500,
                  px: 0.75,
                  py: 0.5,
                  bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
                  },
                  ml: 0.5,
                }}
              >
                <Avatar
                  src={user.avatar_url ?? undefined}
                  alt={user.first_name}
                  sx={{
                    width: 28,
                    height: 28,
                    background: "linear-gradient(135deg, #12A64A 0%, #078930 100%)",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    border: user.role === "artist" ? "2px solid #FCDD09" : "2px solid transparent",
                  }}
                >
                  {user.first_name.charAt(0).toUpperCase()}
                </Avatar>
                {!isMobile && (
                  <Chip
                    label={t(`roles.${user.role}`)}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.6rem",
                      bgcolor: isDark ? "rgba(18,166,74,0.15)" : "rgba(7,137,48,0.1)",
                      color: "#12A64A",
                      fontWeight: 700,
                      border: "none",
                    }}
                  />
                )}
              </Box>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 220,
                    bgcolor: isDark ? "#1A1A26" : "#FFFFFF",
                    border: (t) => `1px solid ${t.palette.divider}`,
                    borderRadius: 2,
                    boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.6)" : "0 8px 32px rgba(0,0,0,0.12)",
                  },
                },
              }}
            >
              <MenuItem disabled sx={{ py: 1.5 }}>
                <ListItemText
                  primary={`${user.first_name} ${user.last_name}`}
                  secondary={user.email || user.phone_number || ''}
                  primaryTypographyProps={{ fontWeight: 700, fontSize: "0.9rem" }}
                  secondaryTypographyProps={{ sx: { color: "text.secondary", fontSize: "0.75rem" } }}
                />
              </MenuItem>

              <Box sx={{ height: "1px", bgcolor: "divider", mx: 1.5, my: 0.5 }} />

              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate(user.role === "artist" ? ROUTES.ARTIST_PROFILE : ROUTES.LISTENER_SETTINGS);
                }}
                sx={{ py: 1, "&:hover": { bgcolor: "action.hover" } }}
              >
                <ListItemIcon>
                  <PersonIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </ListItemIcon>
                <ListItemText
                  primary={t("topbar.profile")}
                  primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 500 }}
                />
              </MenuItem>

              {user.role === "listener" && (
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate(ROUTES.BECOME_ARTIST);
                  }}
                  sx={{
                    py: 1,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemIcon>
                    <MicExternalOnIcon fontSize="small" sx={{ color: "#FCDD09" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={t("topbar.becomeArtist")}
                    primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }}
                  />
                </MenuItem>
              )}

              <MenuItem
                onClick={handleLogout}
                sx={{ py: 1, "&:hover": { bgcolor: "action.hover" } }}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" sx={{ color: "#E74C3C" }} />
                </ListItemIcon>
                <ListItemText
                  primary={t("topbar.signOut")}
                  primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 500, color: "#E74C3C" }}
                />
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;

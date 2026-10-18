/**
 * Sheba Sound — Sidebar Navigation
 * ----------------------------------
 * Glassmorphic Spotify-style permanent sidebar with role-aware navigation.
 * Features Ethiopian tricolour vertical stripe, i18n-aware labels,
 * and animated active-item indicator. Theme-aware.
 */

import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
  Avatar,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AlbumIcon from "@mui/icons-material/Album";
import GroupsIcon from "@mui/icons-material/Groups";
import BarChartIcon from "@mui/icons-material/BarChart";
import PeopleIcon from "@mui/icons-material/People";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PaymentIcon from "@mui/icons-material/Payment";
import ReportIcon from "@mui/icons-material/Report";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import QueueMusicIcon2 from "@mui/icons-material/PlaylistPlay";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MicExternalOnIcon from "@mui/icons-material/MicExternalOn";
import DownloadIcon from "@mui/icons-material/Download";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/common/Logo";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setSidebarOpen } from "@/features/ui/uiSlice";
import { toggleFullScreen } from "@/features/player/playerSlice";
import { UserRole } from "@/types/models";
import { ROUTES, DRAWER_WIDTH } from "@/utils/constants";
import { useTranslation } from "@/i18n";
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

/* ------------------------------------------------------------------ */
/*  Navigation Config per Role                                         */
/* ------------------------------------------------------------------ */

interface NavItem {
  /** Translation key for the label, e.g. "nav.home" */
  labelKey: string;
  icon: React.ReactNode;
  path: string;
}

interface NavSection {
  /** Translation key for the section title */
  titleKey?: string;
  items: NavItem[];
}

const guestSections: NavSection[] = [
  {
    items: [
      { labelKey: "nav.home", icon: <HomeIcon />, path: ROUTES.LISTENER_HOME },
      { labelKey: "nav.search", icon: <SearchIcon />, path: ROUTES.LISTENER_SEARCH },
      { labelKey: "nav.artists", icon: <GroupsIcon />, path: ROUTES.LISTENER_ARTISTS },
    ],
  },
];

const listenerSections: NavSection[] = [
  {
    items: [
      { labelKey: "nav.home", icon: <HomeIcon />, path: ROUTES.LISTENER_HOME },
      { labelKey: "nav.search", icon: <SearchIcon />, path: ROUTES.LISTENER_SEARCH },
      { labelKey: "nav.artists", icon: <GroupsIcon />, path: ROUTES.LISTENER_ARTISTS },
    ],
  },
  {
    titleKey: "nav.yourLibrary",
    items: [
      { labelKey: "nav.myLibrary", icon: <LibraryMusicIcon />, path: ROUTES.LISTENER_LIBRARY },
      { labelKey: "nav.subscription", icon: <CardMembershipIcon />, path: ROUTES.LISTENER_SUBSCRIPTION },
      { labelKey: "nav.downloads", icon: <DownloadIcon />, path: ROUTES.LISTENER_DOWNLOADS },
      { labelKey: "nav.settings", icon: <SettingsIcon />, path: ROUTES.LISTENER_SETTINGS },
    ],
  },
  {
    titleKey: "nav.forArtists",
    items: [
      { labelKey: "nav.becomeArtist", icon: <MicExternalOnIcon />, path: ROUTES.BECOME_ARTIST },
    ],
  },
];

const artistSections: NavSection[] = [
  {
    items: [
      { labelKey: "nav.dashboard", icon: <DashboardIcon />, path: ROUTES.ARTIST_DASHBOARD },
    ],
  },
  {
    titleKey: "nav.browse",
    items: [
      { labelKey: "nav.home", icon: <HomeIcon />, path: ROUTES.LISTENER_HOME },
      { labelKey: "nav.search", icon: <SearchIcon />, path: ROUTES.LISTENER_SEARCH },
    ],
  },
  {
    titleKey: "nav.music",
    items: [
      { labelKey: "nav.uploadSong", icon: <CloudUploadIcon />, path: ROUTES.ARTIST_UPLOAD },
      { labelKey: "nav.mySongs", icon: <QueueMusicIcon />, path: ROUTES.ARTIST_SONGS },
      { labelKey: "nav.myAlbums", icon: <AlbumIcon />, path: ROUTES.ARTIST_ALBUMS },
      { labelKey: "nav.myPlaylists", icon: <QueueMusicIcon2 />, path: ROUTES.ARTIST_PLAYLISTS },
    ],
  },
  {
    titleKey: "nav.insights",
    items: [
      { labelKey: "nav.analytics", icon: <BarChartIcon />, path: ROUTES.ARTIST_ANALYTICS },
      { labelKey: "nav.revenue", icon: <AttachMoneyIcon />, path: ROUTES.ARTIST_REVENUE },
      { labelKey: "nav.profile", icon: <PersonIcon />, path: ROUTES.ARTIST_PROFILE },
    ],
  },
  {
    titleKey: "nav.account",
    items: [
      { labelKey: "nav.notifications", icon: <NotificationsIcon />, path: ROUTES.ARTIST_NOTIFICATIONS },
      { labelKey: "nav.settings", icon: <SettingsIcon />, path: ROUTES.ARTIST_SETTINGS },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    items: [
      { labelKey: "nav.dashboard", icon: <DashboardIcon />, path: ROUTES.ADMIN_DASHBOARD },
    ],
  },
  {
    titleKey: "nav.manage",
    items: [
      { labelKey: "nav.users", icon: <PeopleIcon />, path: ROUTES.ADMIN_USERS },
      { labelKey: "nav.content", icon: <VerifiedUserIcon />, path: ROUTES.ADMIN_CONTENT },
      { labelKey: "nav.artistVerification", icon: <MicExternalOnIcon />, path: ROUTES.ADMIN_ARTIST_VERIFICATION },
      { labelKey: "nav.subscriptions", icon: <PaymentIcon />, path: ROUTES.ADMIN_SUBSCRIPTIONS },
      { labelKey: "nav.reports", icon: <ReportIcon />, path: ROUTES.ADMIN_REPORTS },
      { labelKey: "nav.settings", icon: <SettingsIcon />, path: ROUTES.LISTENER_SETTINGS },
    ],
  },
];

const getSections = (role: UserRole | null): NavSection[] => {
  if (!role) return guestSections;
  switch (role) {
    case UserRole.Artist: return artistSections;
    case UserRole.Admin:  return adminSections;
    case UserRole.Listener:
    default: return listenerSections;
  }
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isDark = theme.palette.mode === "dark";
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const user = useAppSelector((state) => state.auth.user);
  const currentTrack = useAppSelector((state) => state.player.currentTrack);
  const isPlaying = useAppSelector((state) => state.player.isPlaying);

  const role = user?.role ?? null;
  const sections = getSections(role);

  const handleNavigate = (path: string): void => {
    navigate(path);
    if (isMobile) dispatch(setSidebarOpen(false));
  };

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ---- Ethiopian flag vertical stripe (left edge) ---- */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 3,
          background: "linear-gradient(180deg, #078930 0%, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%, #DA121A 100%)",
          zIndex: 1,
        }}
      />

      {/* Content — shifted right to clear the stripe */}
      <Box sx={{ pl: "3px", display: "flex", flexDirection: "column", height: "100%" }}>

        {/* ---- Logo Area ---- */}
        <Box
          sx={{
            px: 2.5,
            py: 2.5,
            minHeight: 72,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Logo />
        </Box>

        <Divider sx={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", mx: 2 }} />

        {/* ---- Navigation Sections ---- */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            px: 1.5,
            py: 1.5,
          }}
        >
          {sections.map((section, sIdx) => (
            <Box key={sIdx} sx={{ mb: 1.5 }}>
              {/* Card background for first section */}
              <Box
                sx={{
                  bgcolor: sIdx === 0 ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent",
                  borderRadius: 2,
                  p: sIdx === 0 ? 1 : 0,
                  mb: sIdx === 0 ? 1.5 : 0,
                  border: sIdx === 0 ? (isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)") : "none",
                }}
              >
                {section.titleKey && (
                  <Box sx={{ px: 1.5, pt: 1.5, pb: 0.75 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        fontWeight: 800,
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.10em",
                        fontSize: "0.625rem",
                      }}
                    >
                      {t(section.titleKey)}
                    </Typography>
                  </Box>
                )}

                <List disablePadding>
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          selected={isActive}
                          onClick={() => handleNavigate(item.path)}
                          sx={{
                            borderRadius: 2,
                            py: 1,
                            px: 1.5,
                            position: "relative",
                            overflow: "hidden",
                            "&.Mui-selected": {
                              bgcolor: isDark
                                ? "rgba(18, 166, 74, 0.14)"
                                : "rgba(7, 137, 48, 0.10)",
                              "&::before": {
                                content: '""',
                                position: "absolute",
                                left: 0,
                                top: "20%",
                                bottom: "20%",
                                width: 3,
                                borderRadius: "0 3px 3px 0",
                                background: "#12A64A",
                              },
                              "& .MuiListItemIcon-root": {
                                color: "#12A64A",
                              },
                              "& .MuiListItemText-primary": {
                                color: "text.primary",
                                fontWeight: 700,
                              },
                              "&:hover": {
                                bgcolor: isDark
                                  ? "rgba(18, 166, 74, 0.20)"
                                  : "rgba(7, 137, 48, 0.16)",
                              },
                            },
                            "&:hover": {
                              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                              "& .MuiListItemIcon-root": {
                                transform: "scale(1.1)",
                              },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 36,
                              color: isActive ? "#12A64A" : "text.secondary",
                              "& .MuiSvgIcon-root": {
                                fontSize: "1.2rem",
                                transition: "transform 0.15s ease",
                              },
                            }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={t(item.labelKey)}
                            primaryTypographyProps={{
                              fontSize: "0.875rem",
                              fontWeight: isActive ? 700 : 500,
                              color: isActive ? "text.primary" : "text.secondary",
                              lineHeight: 1.5,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            </Box>
          ))}
        </Box>

        {/* ---- Now Playing mini strip ---- */}
        {currentTrack && (
          <Box
            onClick={() => dispatch(toggleFullScreen())}
            title="Open full-screen player"
            sx={{
              mx: 1.5,
              mb: 1.5,
              p: 1.25,
              borderRadius: 2,
              bgcolor: isDark ? "rgba(18, 166, 74, 0.08)" : "rgba(7, 137, 48, 0.06)",
              border: isDark ? "1px solid rgba(18,166,74,0.2)" : "1px solid rgba(7,137,48,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: isDark ? "rgba(18, 166, 74, 0.14)" : "rgba(7, 137, 48, 0.10)",
              },
            }}
          >
            <Avatar
              variant="rounded"
              src={currentTrack.cover_image_url || SONG_PLACEHOLDER}
              sx={{ width: 36, height: 36, borderRadius: 1 }}
            />
            <Box sx={{ flex: 1, overflow: "hidden" }}>
              <Typography
                variant="caption"
                noWrap
                sx={{ display: "block", fontWeight: 700, color: "text.primary", fontSize: "0.75rem" }}
              >
                {currentTrack.title}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: "text.secondary", fontSize: "0.65rem" }}
              >
                {t("nav.nowPlaying")}
              </Typography>
            </Box>
            {isPlaying && (
              <Box className="eq-bars" sx={{ flexShrink: 0 }}>
                <span />
                <span />
                <span />
              </Box>
            )}
            {!isPlaying && (
              <GraphicEqIcon sx={{ fontSize: "1rem", color: "#12A64A", opacity: 0.7 }} />
            )}
          </Box>
        )}

        {/* ---- Bottom Ethiopian flag accent bar ---- */}
        <Box
          sx={{
            height: 3,
            background: "linear-gradient(90deg, #078930 0%, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%, #DA121A 100%)",
            flexShrink: 0,
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? "temporary" : "persistent"}
      open={sidebarOpen}
      onClose={() => dispatch(setSidebarOpen(false))}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          bgcolor: isDark ? "rgba(10, 10, 15, 0.97)" : "#FAFAFA",
          backdropFilter: isDark ? "blur(24px)" : "none",
          borderRight: isDark ? "none" : "1px solid rgba(0,0,0,0.07)",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;

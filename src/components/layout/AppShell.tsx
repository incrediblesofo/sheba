/**
 * Sheba Sound — App Shell Layout
 * --------------------------------
 * Spotify-style layout with immersive gradient background,
 * animated page transitions, and proper spacing.
 * Mobile: hides TopBar + Sidebar, uses MobileBottomNav.
 * Desktop: shows TopBar + Sidebar as before.
 */

import { Box, Toolbar, useTheme, useMediaQuery } from "@mui/material";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";
import GlobalPlayer, { PLAYER_HEIGHT, PLAYER_HEIGHT_MOBILE } from "@/components/player/GlobalPlayer";
import EmailVerificationBanner from "@/components/common/EmailVerificationBanner";
import { useAppSelector } from "@/app/hooks";
import { DRAWER_WIDTH, BOTTOM_NAV_HEIGHT } from "@/utils/constants";

const AppShell: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const currentTrack = useAppSelector((state) => state.player.currentTrack);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        /* Subtle full-page radial gradient from top — cinematic feel */
        backgroundImage: isDark
          ? "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(18, 166, 74, 0.08) 0%, transparent 60%)"
          : "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(7, 137, 48, 0.06) 0%, transparent 60%)",
      }}
    >
      {/* Top Navigation — hidden on mobile */}
      {!isMobile && <TopBar />}

      {/* Side Navigation — hidden on mobile */}
      {!isMobile && <Sidebar />}

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : "100%",
          },
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          bgcolor: "transparent",
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Spacer for fixed AppBar — desktop only */}
        {!isMobile && <Toolbar sx={{ minHeight: "62px !important" }} />}

        {/* Email verification banner — only shown to unverified users */}
        <EmailVerificationBanner />

        {/* Page content with entrance animation */}
        <Box
          sx={{
            p: { xs: 0, md: 3 },
            pb: isMobile
              ? currentTrack
                ? `${BOTTOM_NAV_HEIGHT + PLAYER_HEIGHT_MOBILE + 16}px`
                : `${BOTTOM_NAV_HEIGHT + 16}px`
              : currentTrack
                ? { sm: `${PLAYER_HEIGHT + 32}px` }
                : 4,
            animation: "fadeSlideUp 0.35s ease both",
            "@keyframes fadeSlideUp": {
              from: { opacity: 0, transform: "translateY(12px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Persistent Global Audio Player */}
      <GlobalPlayer />

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </Box>
  );
};

export default AppShell;

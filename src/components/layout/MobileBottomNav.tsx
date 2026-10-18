/**
 * Sheba Sound — Mobile Bottom Navigation
 * ----------------------------------------
 * Fixed bottom navigation bar for mobile screens.
 * Shows Home, Search, Library, and Downloaded tabs.
 * Only visible on xs/sm breakpoints.
 */

import { Box, useTheme } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import SearchIcon from "@mui/icons-material/Search";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import DownloadIcon from "@mui/icons-material/Download";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { ROUTES, BOTTOM_NAV_HEIGHT } from "@/utils/constants";

interface NavTab {
  label: string;
  path: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const tabs: NavTab[] = [
  {
    label: "Home",
    path: ROUTES.LISTENER_HOME,
    icon: <HomeOutlinedIcon />,
    activeIcon: <HomeIcon />,
  },
  {
    label: "Search",
    path: ROUTES.LISTENER_SEARCH,
    icon: <SearchIcon />,
    activeIcon: <SearchIcon />,
  },
  {
    label: "Library",
    path: ROUTES.LISTENER_LIBRARY,
    icon: <EqualizerIcon />,
    activeIcon: <EqualizerIcon />,
  },
  {
    label: "Downloaded",
    path: ROUTES.LISTENER_DOWNLOADS,
    icon: <DownloadOutlinedIcon />,
    activeIcon: <DownloadIcon />,
  },
];

const MobileBottomNav: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      id="mobile-bottom-nav"
      sx={{
        display: { xs: "flex", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: BOTTOM_NAV_HEIGHT,
        bgcolor: isDark ? "#0A0A0F" : "#FAFAFA",
        borderTop: isDark
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid rgba(0,0,0,0.08)",
        zIndex: theme.zIndex.appBar + 2,
        justifyContent: "space-around",
        alignItems: "center",
        px: 1,
        /* Safe area for notched phones */
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <Box
            key={tab.path}
            onClick={() => navigate(tab.path)}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              py: 0.75,
              cursor: "pointer",
              color: active ? "#fff" : (isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)"),
              transition: "color 0.2s ease",
              "& .MuiSvgIcon-root": {
                fontSize: 24,
                transition: "transform 0.15s ease",
              },
              "&:active .MuiSvgIcon-root": {
                transform: "scale(0.9)",
              },
            }}
          >
            {active ? tab.activeIcon : tab.icon}
          </Box>
        );
      })}
    </Box>
  );
};

export default MobileBottomNav;

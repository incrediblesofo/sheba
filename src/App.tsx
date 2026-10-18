/**
 * Sheba Sound — Root Application Component
 * ------------------------------------------
 * Composes the global providers: MUI ThemeProvider, Redux Provider,
 * React Router, Error Boundary, Snackbar, Language, and Auth Initializer.
 */

import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { store } from "@/app/store";
import { useAppSelector } from "@/app/hooks";
import { getEthioTheme } from "@/theme/ethioTheme";
import { LanguageProvider } from "@/i18n";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import GlobalSnackbar from "@/components/common/GlobalSnackbar";
import AppInitializer from "@/components/common/AppInitializer";
import AppRouter from "@/components/routing/AppRouter";

/**
 * Inner shell that has access to the Redux store (for reading themeMode).
 * Must be rendered inside <Provider>.
 */
const ThemedApp: React.FC = () => {
  const themeMode = useAppSelector((state) => state.ui.themeMode);
  const theme = useMemo(() => getEthioTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <AppInitializer>
              <AppRouter />
            </AppInitializer>
          </BrowserRouter>
        </ErrorBoundary>
        <GlobalSnackbar />
      </LanguageProvider>
    </ThemeProvider>
  );
};

/**
 * Top-level App wraps everything in the Redux Provider.
 */
const App: React.FC = () => (
  <Provider store={store}>
    <ThemedApp />
  </Provider>
);

export default App;

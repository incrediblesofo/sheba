/**
 * Sheba Sound — Global Snackbar
 * ------------------------------
 * Renders MUI Snackbar + Alert driven by the UI Redux slice.
 * Mount once in App.tsx so every part of the app can trigger notifications.
 */

import { Snackbar, Alert } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { dismissSnackbar } from '@/features/ui/uiSlice';

const GlobalSnackbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const snackbar = useAppSelector((state) => state.ui.snackbar);

  const handleClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string,
  ): void => {
    if (reason === 'clickaway') return;
    dispatch(dismissSnackbar());
  };

  return (
    <Snackbar
      open={!!snackbar}
      autoHideDuration={snackbar?.autoHideDuration ?? 5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      {snackbar ? (
        <Alert
          onClose={handleClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
};

export default GlobalSnackbar;

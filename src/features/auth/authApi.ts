/**
 * Sheba Sound — Auth API (RTK Query)
 * -----------------------------------
 * Endpoints for authentication against the Django REST Framework backend.
 * Handles JWT token lifecycle including automatic refresh via baseQuery wrapper.
 */

import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/app/store';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RefreshTokenResponse,
  GoogleAuthRequest,
  GoogleAuthResponse,
} from '@/types/auth';
import type { User, ArtistProfile } from '@/types/models';
import { setCredentials, logOut } from './authSlice';
import { getAccessToken, getRefreshToken, setAccessToken } from '@/utils/tokenStorage';
import { API_BASE_URL } from '@/utils/constants';

/* ------------------------------------------------------------------ */
/*  Base Query with automatic token refresh                            */
/* ------------------------------------------------------------------ */

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    // Prefer token from Redux state; fall back to localStorage
    const token =
      (getState() as RootState).auth.accessToken ?? getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * Wraps the raw base query to intercept 401 responses and attempt a
 * silent token refresh before retrying the original request once.
 */
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refresh = getRefreshToken();
    if (refresh) {
      const refreshResult = await rawBaseQuery(
        {
          url: '/auth/token/refresh/',
          method: 'POST',
          body: { refresh },
        },
        api,
        extraOptions,
      );

      if (refreshResult.data) {
        const { access } = refreshResult.data as RefreshTokenResponse;
        setAccessToken(access);

        // Update Redux state with the new access token
        const state = api.getState() as RootState;
        if (state.auth.user) {
          api.dispatch(
            setCredentials({
              user: state.auth.user,
              accessToken: access,
              refreshToken: refresh,
            }),
          );
        }

        // Retry the original request with the new token
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        // Refresh failed — force logout
        api.dispatch(logOut());
      }
    } else {
      api.dispatch(logOut());
    }
  }

  return result;
};

/* ------------------------------------------------------------------ */
/*  API Slice                                                          */
/* ------------------------------------------------------------------ */

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User'],
  endpoints: (builder) => ({
    /** Obtain a JWT token pair with email + password. */
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login/',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    /** Register a new Listener or Artist account. */
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (data) => ({
        url: '/auth/register/',
        method: 'POST',
        body: data,
      }),
    }),

    /** Request a password-reset email. */
    forgotPassword: builder.mutation<ForgotPasswordResponse, ForgotPasswordRequest>({
      query: (data) => ({
        url: '/auth/forgot-password/',
        method: 'POST',
        body: data,
      }),
    }),

    /** Set a new password using the reset token from email. */
    resetPassword: builder.mutation<ResetPasswordResponse, ResetPasswordRequest>({
      query: (data) => ({
        url: '/auth/reset-password/',
        method: 'POST',
        body: data,
      }),
    }),

    /** Fetch the currently authenticated user's profile. */
    getMe: builder.query<User, void>({
      query: () => '/auth/me/',
      providesTags: ['User'],
    }),

    /** Blacklist the refresh token on the server side. */
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout/',
        method: 'POST',
        body: { refresh: getRefreshToken() },
      }),
      invalidatesTags: ['User'],
    }),

    /** Upgrade the current listener account to an artist (with ID verification). */
    becomeArtist: builder.mutation<
      { message: string; artist_profile: ArtistProfile; user: User },
      FormData
    >({
      query: (formData) => ({
        url: '/users/become-artist/',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),

    /** Resubmit artist application after rejection. */
    resubmitArtistApplication: builder.mutation<
      { message: string; artist_profile: ArtistProfile; user: User },
      FormData
    >({
      query: (formData) => ({
        url: '/users/become-artist/',
        method: 'PUT',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),

    /** GET /api/auth/artist-status/ — check artist verification status. */
    getArtistStatus: builder.query<
      {
        has_application: boolean;
        verification_status: string | null;
        stage_name?: string;
        submitted_at?: string;
        is_identity_verified?: boolean;
        rejection_reason?: string;
      },
      void
    >({
      query: () => '/auth/artist-status/',
      providesTags: ['User'],
    }),

    /** POST /api/auth/me/avatar/ — upload or change profile image. */
    updateAvatar: builder.mutation<
      { message: string; avatar_url: string; user: User },
      FormData
    >({
      query: (formData) => ({
        url: '/auth/me/avatar/',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),

    /** DELETE /api/auth/me/avatar/ — remove profile image. */
    removeAvatar: builder.mutation<
      { message: string; user: User },
      void
    >({
      query: () => ({
        url: '/auth/me/avatar/',
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    /** POST /api/auth/google/ — authenticate with a Google ID token. */
    googleAuth: builder.mutation<GoogleAuthResponse, GoogleAuthRequest>({
      query: (data) => ({
        url: '/auth/google/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    /** GET /api/auth/verify-email/?uid=...&token=... */
    verifyEmail: builder.query<
      { detail: string; verified?: boolean; already_verified?: boolean },
      { uid: string; token: string }
    >({
      query: ({ uid, token }) => `/auth/verify-email/?uid=${uid}&token=${token}`,
      // Invalidate User cache so the banner disappears after verification
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Re-fetch current user so is_verified updates in Redux
          dispatch(authApi.util.invalidateTags(['User']));
        } catch { /* noop */ }
      },
    }),

    /** POST /api/auth/resend-verification/ */
    resendVerification: builder.mutation<{ detail: string }, void>({
      query: () => ({
        url: '/auth/resend-verification/',
        method: 'POST',
      }),
    }),

    /** DELETE /api/auth/me/delete/ — permanently delete user account. */
    deleteAccount: builder.mutation<{ detail: string }, { password: string }>({
      query: (body) => ({
        url: '/auth/me/delete/',
        method: 'DELETE',
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useLogoutMutation,
  useBecomeArtistMutation,
  useResubmitArtistApplicationMutation,
  useGetArtistStatusQuery,
  useUpdateAvatarMutation,
  useRemoveAvatarMutation,
  useGoogleAuthMutation,
  useLazyVerifyEmailQuery,
  useResendVerificationMutation,
  useDeleteAccountMutation,
} = authApi;

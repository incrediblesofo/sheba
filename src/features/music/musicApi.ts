/**
 * Sheba Sound — Music API (RTK Query)
 * -------------------------------------
 * Endpoints for the music catalog, listener actions, and artist-specific content.
 * Reuses the same base query with JWT auto-refresh logic as authApi.
 */

import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/app/store';
import type { Song, Album, Playlist, ArtistProfile, PaginatedResponse, User, Subscription, Notification, ArtistEarning, WithdrawalRequest } from '@/types/models';
import { logOut } from '@/features/auth/authSlice';
import { getAccessToken, getRefreshToken, setAccessToken } from '@/utils/tokenStorage';
import { API_BASE_URL } from '@/utils/constants';

/* ------------------------------------------------------------------ */
/*  Base query with auto-refresh (mirrors authApi)                     */
/* ------------------------------------------------------------------ */

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token =
      (getState() as RootState).auth.accessToken ?? getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

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
        { url: '/auth/token/refresh/', method: 'POST', body: { refresh } },
        api,
        extraOptions,
      );
      if (refreshResult.data) {
        const { access } = refreshResult.data as { access: string };
        setAccessToken(access);
        // Update Redux auth state with the new access token
        api.dispatch({
          type: 'auth/tokenRefreshed',
          payload: access,
        });
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logOut());
      }
    } else {
      api.dispatch(logOut());
    }
  }

  return result;
};

/* ------------------------------------------------------------------ */
/*  Types for API responses                                            */
/* ------------------------------------------------------------------ */

/** Song with artist_name from the backend serializer. */
export interface SongWithArtist extends Song {
  artist_name: string;
  quality_tier?: 'high' | 'standard';
}

/** Album detail (from /albums/<id>/) includes nested songs. */
export interface AlbumDetail extends Album {
  songs: SongWithArtist[];
}

/** Playlist detail with full song objects instead of IDs. */
export interface PlaylistDetail extends Playlist {
  song_objects?: SongWithArtist[];
}

/** Response from GET /api/music/playlists/my/ */
export interface MyPlaylistsResponse {
  playlists: Playlist[];
  count: number;
  limit: number | null;
  is_premium: boolean;
}

/** Search response from GET /api/music/search/?q= */
export interface SearchResults {
  songs: SongWithArtist[];
  albums: Album[];
  artists: ArtistProfile[];
}

/** Query params for song lists */
export interface SongQueryParams {
  genre?: string;
  artist?: string;
  album?: string;
  ordering?: string;
  search?: string;
}

/** Admin dashboard stats response */
export interface PlatformStats {
  totalUsers: number;
  totalArtists: number;
  totalListeners: number;
  totalSongs: number;
  pendingSongs: number;
  pendingArtists: number;
  totalStreams: number;
  activeSubscriptions: number;
  revenue: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
}

/** Pending artist application (from admin list) */
export interface PendingArtistItem {
  id: string;
  stage_name: string;
  bio: string;
  user_email: string;
  user_phone_number: string | null;
  user_username: string;
  user_full_name: string;
  verification_status: string;
  id_document_type: string;
  submitted_at: string;
  profile_image_url: string | null;
}

/** Artist verification detail (from admin detail view) */
export interface ArtistVerificationDetail {
  id: string;
  stage_name: string;
  bio: string;
  user: {
    id: string;
    email: string;
    phone_number: string | null;
    username: string;
    full_name: string;
  };
  verification_status: string;
  id_document_url: string;
  id_document_type: string;
  profile_image_url: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string;
  is_identity_verified: boolean;
  verification_logs: {
    action: string;
    performed_by: string | null;
    reason: string;
    created_at: string;
  }[];
}

/** Admin activity feed item */
export interface ActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'user' | 'song' | 'subscription';
}

/** Admin moderation item */
export interface ModerationItem {
  songId: string;
  title: string;
  artistName: string;
  genre: string;
  duration: number;
  coverUrl: string | null;
  status: string;
  submittedAt: string;
}

/** Admin reports response */
export interface AdminReports {
  genreDistribution: Record<string, number>;
  topArtists: { id: string; stage_name: string; total_streams: number }[];
  topSongs: { id: string; title: string; stream_count: number }[];
  totalUsers: number;
  totalSongs: number;
  totalStreams: number;
  userGrowth: { month: string; count: number }[];
  streamTrends: { date: string; streams: number }[];
  listenerDemographics: {
    byRole: { label: string; value: number }[];
    byTier: { label: string; value: number }[];
  };
  geographicDistribution: { country: string; code: string; flag: string; streams: number }[];
}

/** Admin subscription with user info */
/** Response from POST /api/subscriptions/initiate/ */
export interface InitiatePaymentResponse {
  tx_ref: string;
  amount: string;
  billing_period: string;
  checkout_url?: string | null;
  subscription_id: string;
}

/** Response from GET /api/subscriptions/current/ */
export interface CurrentSubscriptionResponse {
  has_subscription: boolean;
  tier: 'free' | 'premium';
  subscription: Subscription | null;
  message?: string;
}

/** Response from GET /api/subscriptions/verify/<tx_ref>/ */
export interface VerifyPaymentResponse {
  status: 'completed' | 'pending' | 'failed';
  subscription: Subscription;
  message?: string;
}

/** Response from POST /api/subscriptions/cancel/ */
export interface CancelSubscriptionResponse {
  message: string;
  subscription: Subscription;
}

export interface SubscriptionWithUser extends Subscription {
  user_email?: string;
  user_name?: string;
}

/** Artist analytics response */
export interface ArtistAnalytics {
  total_streams: number;
  monthly_listeners: number;
  published_songs: number;
  monthly_streams: { month: string; streams: number; listeners: number }[];
  engagement: {
    total_likes: number;
    total_comments: number;
    total_shares: number;
    new_followers_this_month: number;
    total_followers: number;
  };
  geo_listeners: { country: string; listeners: number; flag: string }[];
}

/** Artist earnings response */
export interface ArtistEarningsResponse {
  earnings: ArtistEarning[];
  total_earnings: number;
  unpaid_earnings: number;
  withdrawals: WithdrawalRequest[];
  has_pending_withdrawal: boolean;
}

/** Withdrawal request payload */
export interface CreateWithdrawalPayload {
  amount: number;
  payment_method: 'telebirr' | 'chapa' | 'bank_transfer';
  account_details: string;
}

/* ------------------------------------------------------------------ */
/*  Helper to unwrap DRF paginated responses                           */
/* ------------------------------------------------------------------ */

function unwrapPaginated<T>(response: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(response) ? response : (response.results ?? []);
}

/* ------------------------------------------------------------------ */
/*  API Slice                                                          */
/* ------------------------------------------------------------------ */

export const musicApi = createApi({
  reducerPath: 'musicApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Song', 'Album', 'ArtistProfile', 'Playlist', 'LikedSongs', 'History',
    'AdminStats', 'AdminUsers', 'Moderation', 'AdminSubscriptions', 'AdminReports',
    'AdminActivity', 'ArtistAnalytics', 'ArtistEarnings', 'Notifications',
    'FollowedArtists', 'Downloads', 'PendingArtists',
  ],
  endpoints: (builder) => ({

    /* ============================================================== */
    /*  Public Catalog (Listener)                                      */
    /* ============================================================== */

    /** GET /api/music/songs/ — approved songs (public catalog) */
    getSongs: builder.query<SongWithArtist[], SongQueryParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.genre) searchParams.set('genre', params.genre);
          if (params.artist) searchParams.set('artist', params.artist);
          if (params.album) searchParams.set('album', params.album);
          if (params.ordering) searchParams.set('ordering', params.ordering);
          if (params.search) searchParams.set('search', params.search);
        }
        const qs = searchParams.toString();
        return `/music/songs/${qs ? `?${qs}` : ''}`;
      },
      transformResponse: (response: PaginatedResponse<SongWithArtist> | SongWithArtist[]) =>
        unwrapPaginated(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Song' as const, id })),
              { type: 'Song', id: 'LIST' },
            ]
          : [{ type: 'Song', id: 'LIST' }],
    }),

    /** GET /api/music/songs/<id>/ — single song detail */
    getSongById: builder.query<SongWithArtist, string>({
      query: (id) => `/music/songs/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Song', id }],
    }),

    /** POST /api/music/songs/<id>/stream/ — increment stream count */
    streamSong: builder.mutation<{ stream_count: number }, string>({
      query: (id) => ({
        url: `/music/songs/${id}/stream/`,
        method: 'POST',
      }),
    }),

    /** GET /api/music/songs/<id>/download/ — download a song (premium only) */
    downloadSong: builder.mutation<{ download_url: string; song_id: string; title: string }, string>({
      query: (id) => `/music/songs/${id}/download/`,
      invalidatesTags: ['Downloads'],
    }),

    /** DELETE /api/music/songs/<id>/download/remove/ — remove download record */
    removeDownload: builder.mutation<void, string>({
      query: (id) => ({
        url: `/music/songs/${id}/download/remove/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Downloads'],
    }),

    /** GET /api/music/downloads/ — list user's downloaded songs */
    getMyDownloads: builder.query<{ count: number; limit: number; songs: SongWithArtist[] }, void>({
      query: () => '/music/downloads/',
      providesTags: ['Downloads'],
    }),

    /** GET /api/music/albums/ — all albums */
    getAlbums: builder.query<Album[], { genre?: string; artist?: string } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.genre) searchParams.set('genre', params.genre);
          if (params.artist) searchParams.set('artist', params.artist);
        }
        const qs = searchParams.toString();
        return `/music/albums/${qs ? `?${qs}` : ''}`;
      },
      transformResponse: (response: PaginatedResponse<Album> | Album[]) =>
        unwrapPaginated(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Album' as const, id })),
              { type: 'Album', id: 'LIST' },
            ]
          : [{ type: 'Album', id: 'LIST' }],
    }),

    /** GET /api/music/albums/<id>/ — album detail with nested songs */
    getAlbumById: builder.query<AlbumDetail, string>({
      query: (id) => `/music/albums/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Album', id }],
    }),

    /** GET /api/music/playlists/ — public playlists */
    getPlaylists: builder.query<Playlist[], void>({
      query: () => '/music/playlists/',
      transformResponse: (response: PaginatedResponse<Playlist> | Playlist[]) =>
        unwrapPaginated(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Playlist' as const, id })),
              { type: 'Playlist', id: 'LIST' },
            ]
          : [{ type: 'Playlist', id: 'LIST' }],
    }),

    /** GET /api/music/playlists/<id>/ — playlist detail */
    getPlaylistById: builder.query<Playlist, string>({
      query: (id) => `/music/playlists/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Playlist', id }],
    }),

    /** GET /api/auth/artists/ — all verified artists */
    getArtists: builder.query<ArtistProfile[], void>({
      query: () => '/auth/artists/',
      transformResponse: (response: PaginatedResponse<ArtistProfile> | ArtistProfile[]) =>
        unwrapPaginated(response),
      providesTags: ['ArtistProfile'],
    }),

    /** GET /api/auth/artists/<id>/ — single artist profile */
    getArtistById: builder.query<ArtistProfile, string>({
      query: (id) => `/auth/artists/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'ArtistProfile', id }],
    }),

    /** GET /api/music/search/?q=<query> — full-text search */
    searchMusic: builder.query<SearchResults, string>({
      query: (q) => `/music/search/?q=${encodeURIComponent(q)}`,
    }),

    /* ============================================================== */
    /*  Follow / Unfollow Artist                                        */
    /* ============================================================== */

    /** POST /api/music/artists/<id>/follow/ — toggle follow */
    toggleFollowArtist: builder.mutation<{ following: boolean; followers_count: number }, string>({
      query: (artistId) => ({
        url: `/music/artists/${artistId}/follow/`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, artistId) => [
        { type: 'ArtistProfile', id: artistId },
        'FollowedArtists',
      ],
    }),

    /** GET /api/music/artists/<id>/follow-status/ — check if following */
    getFollowStatus: builder.query<{ following: boolean }, string>({
      query: (artistId) => `/music/artists/${artistId}/follow-status/`,
      providesTags: (_result, _error, artistId) => [
        { type: 'FollowedArtists', id: artistId },
      ],
    }),

    /** GET /api/music/followed-artists/ — user's followed artists */
    getFollowedArtists: builder.query<ArtistProfile[], void>({
      query: () => '/music/followed-artists/',
      transformResponse: (response: PaginatedResponse<ArtistProfile> | ArtistProfile[]) =>
        unwrapPaginated(response),
      providesTags: ['FollowedArtists'],
    }),

    /* ============================================================== */
    /*  Like / Unlike                                                   */
    /* ============================================================== */

    /** POST /api/music/songs/<id>/like/ — toggle like */
    toggleLike: builder.mutation<{ liked: boolean; like_count: number }, string>({
      query: (songId) => ({
        url: `/music/songs/${songId}/like/`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, songId) => [
        { type: 'Song', id: songId },
        'LikedSongs',
      ],
    }),

    /** GET /api/music/liked-songs/ — user's liked songs */
    getLikedSongs: builder.query<SongWithArtist[], void>({
      query: () => '/music/liked-songs/',
      transformResponse: (response: PaginatedResponse<SongWithArtist> | SongWithArtist[]) =>
        unwrapPaginated(response),
      providesTags: ['LikedSongs'],
    }),

    /* ============================================================== */
    /*  Listening History                                               */
    /* ============================================================== */

    /** POST /api/music/history/ — record a listen */
    recordListen: builder.mutation<void, string>({
      query: (songId) => ({
        url: '/music/history/',
        method: 'POST',
        body: { song: songId },
      }),
      invalidatesTags: ['History'],
    }),

    /** GET /api/music/history/ — user's recent history */
    getListeningHistory: builder.query<SongWithArtist[], void>({
      query: () => '/music/history/',
      transformResponse: (response: PaginatedResponse<SongWithArtist> | SongWithArtist[]) =>
        unwrapPaginated(response),
      providesTags: ['History'],
    }),

    /* ============================================================== */
    /*  Artist's Own Content (existing endpoints)                       */
    /* ============================================================== */

    /** GET /api/auth/artist/profile/ — logged-in artist's own profile */
    getMyArtistProfile: builder.query<ArtistProfile, void>({
      query: () => '/auth/artist/profile/',
      providesTags: ['ArtistProfile'],
    }),

    /** PATCH /api/auth/artist/profile/ — update logged-in artist's profile */
    updateMyArtistProfile: builder.mutation<ArtistProfile, Partial<ArtistProfile>>({
      query: (body) => ({
        url: '/auth/artist/profile/',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['ArtistProfile'],
    }),

    /** POST /api/auth/artist/profile/image/ — upload profile photo or cover image */
    uploadArtistImage: builder.mutation<
      { message: string; image_url: string; artist_profile: ArtistProfile },
      FormData
    >({
      query: (formData) => ({
        url: '/auth/artist/profile/image/',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['ArtistProfile'],
    }),

    /** DELETE /api/auth/artist/profile/image/?type=profile|cover — remove image */
    removeArtistImage: builder.mutation<
      { message: string; artist_profile: ArtistProfile },
      'profile' | 'cover'
    >({
      query: (imageType) => ({
        url: `/auth/artist/profile/image/?type=${imageType}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ArtistProfile'],
    }),

    /** GET /api/music/artist/songs/ — logged-in artist's own songs */
    getMySongs: builder.query<Song[], void>({
      query: () => '/music/artist/songs/',
      transformResponse: (response: { results?: Song[] } | Song[]) =>
        Array.isArray(response) ? response : (response.results ?? []),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Song' as const, id })),
              { type: 'Song', id: 'LIST' },
            ]
          : [{ type: 'Song', id: 'LIST' }],
    }),

    /** DELETE /api/music/artist/songs/<id>/ */
    deleteSong: builder.mutation<void, string>({
      query: (id) => ({
        url: `/music/artist/songs/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Song', id: 'LIST' }],
    }),

    /** PATCH /api/music/artist/songs/<id>/ */
    updateSong: builder.mutation<Song, { id: string; data: Partial<Song> }>({
      query: ({ id, data }) => ({
        url: `/music/artist/songs/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Song', id }],
    }),

    /** POST /api/music/artist/songs/<id>/cover/ — upload/replace cover image */
    updateSongCover: builder.mutation<
      { message: string; cover_image_url: string; song: Song },
      { id: string; formData: FormData }
    >({
      query: ({ id, formData }) => ({
        url: `/music/artist/songs/${id}/cover/`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Song', id },
        { type: 'Song', id: 'LIST' },
      ],
    }),

    /** GET /api/music/artist/albums/ — logged-in artist's own albums */
    getMyAlbums: builder.query<Album[], void>({
      query: () => '/music/artist/albums/',
      transformResponse: (response: { results?: Album[] } | Album[]) =>
        Array.isArray(response) ? response : (response.results ?? []),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Album' as const, id })),
              { type: 'Album', id: 'LIST' },
            ]
          : [{ type: 'Album', id: 'LIST' }],
    }),

    /** POST /api/music/artist/albums/ — supports JSON or FormData (with cover_image) */
    createAlbum: builder.mutation<Album, FormData | Partial<Album>>({
      query: (body) => ({
        url: '/music/artist/albums/',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Album', id: 'LIST' }],
    }),

    /** POST /api/music/artist/albums/<id>/cover/ — upload/replace album cover image */
    updateAlbumCover: builder.mutation<
      { message: string; cover_image_url: string; album: Album },
      { id: string; formData: FormData }
    >({
      query: ({ id, formData }) => ({
        url: `/music/artist/albums/${id}/cover/`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Album', id },
        { type: 'Album', id: 'LIST' },
      ],
    }),

    /** DELETE /api/music/artist/albums/<id>/ */
    deleteAlbum: builder.mutation<void, string>({
      query: (id) => ({
        url: `/music/artist/albums/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Album', id: 'LIST' }],
    }),

    /** POST /api/music/playlists/ — create new playlist */
    createPlaylist: builder.mutation<Playlist, { title: string; description?: string; is_public?: boolean; songs?: string[] }>({
      query: (body) => ({
        url: '/music/playlists/',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Playlist', id: 'LIST' }],
    }),

    /** GET /api/music/playlists/my/ — current user's own playlists + quota */
    getMyPlaylists: builder.query<MyPlaylistsResponse, void>({
      query: () => '/music/playlists/my/',
      providesTags: (result) =>
        result
          ? [
              ...result.playlists.map(({ id }) => ({ type: 'Playlist' as const, id })),
              { type: 'Playlist', id: 'LIST' },
            ]
          : [{ type: 'Playlist', id: 'LIST' }],
    }),

    /** PUT /api/music/playlists/<id>/ — update a playlist */
    updatePlaylist: builder.mutation<Playlist, { id: string; data: Partial<Playlist> & { songs?: string[] } }>({
      query: ({ id, data }) => ({
        url: `/music/playlists/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Playlist', id },
        { type: 'Playlist', id: 'LIST' },
      ],
    }),

    /** POST /api/music/playlists/<id>/cover/ — upload/replace playlist cover image */
    updatePlaylistCover: builder.mutation<
      { message: string; cover_image_url: string; playlist: Playlist },
      { id: string; formData: FormData }
    >({
      query: ({ id, formData }) => ({
        url: `/music/playlists/${id}/cover/`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Playlist', id },
        { type: 'Playlist', id: 'LIST' },
      ],
    }),

    /** DELETE /api/music/playlists/<id>/ — delete a playlist */
    deletePlaylist: builder.mutation<void, string>({
      query: (id) => ({
        url: `/music/playlists/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Playlist', id: 'LIST' }],
    }),

    /** POST /api/music/playlists/<id>/songs/ — add a single song */
    addSongToPlaylist: builder.mutation<Playlist, { playlistId: string; songId: string }>({
      query: ({ playlistId, songId }) => ({
        url: `/music/playlists/${playlistId}/songs/`,
        method: 'POST',
        body: { song_id: songId },
      }),
      invalidatesTags: (_result, _error, { playlistId }) => [
        { type: 'Playlist', id: playlistId },
        { type: 'Playlist', id: 'LIST' },
      ],
    }),

    /** DELETE /api/music/playlists/<id>/songs/<song_id>/ — remove a single song */
    removeSongFromPlaylist: builder.mutation<Playlist, { playlistId: string; songId: string }>({
      query: ({ playlistId, songId }) => ({
        url: `/music/playlists/${playlistId}/songs/${songId}/`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { playlistId }) => [
        { type: 'Playlist', id: playlistId },
        { type: 'Playlist', id: 'LIST' },
      ],
    }),

    /** POST /api/music/playlists/<id>/songs/reorder/ — reorder songs via drag-and-drop */
    reorderPlaylistSongs: builder.mutation<Playlist, { playlistId: string; songIds: string[] }>({
      query: ({ playlistId, songIds }) => ({
        url: `/music/playlists/${playlistId}/songs/reorder/`,
        method: 'POST',
        body: { song_ids: songIds },
      }),
      invalidatesTags: (_result, _error, { playlistId }) => [
        { type: 'Playlist', id: playlistId },
      ],
    }),

    /* ============================================================== */
    /*  Admin Dashboard                                                 */
    /* ============================================================== */

    /** GET /api/admin-dashboard/stats/ */
    getAdminStats: builder.query<PlatformStats, void>({
      query: () => '/admin-dashboard/stats/',
      providesTags: ['AdminStats'],
    }),

    /** GET /api/admin-dashboard/activity/ */
    getAdminActivity: builder.query<ActivityItem[], void>({
      query: () => '/admin-dashboard/activity/',
      providesTags: ['AdminActivity'],
    }),

    /** GET /api/admin-dashboard/users/ */
    getAdminUsers: builder.query<User[], void>({
      query: () => '/admin-dashboard/users/',
      transformResponse: (response: PaginatedResponse<User> | User[]) =>
        unwrapPaginated(response),
      providesTags: ['AdminUsers'],
    }),

    /** PATCH /api/admin-dashboard/users/<id>/ */
    updateAdminUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/admin-dashboard/users/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['AdminUsers', 'AdminStats'],
    }),

    /** GET /api/admin-dashboard/moderation/ */
    getModerationQueue: builder.query<ModerationItem[], { status?: string } | void>({
      query: (params) => {
        const qs = params?.status ? `?status=${params.status}` : '';
        return `/admin-dashboard/moderation/${qs}`;
      },
      transformResponse: (response: PaginatedResponse<ModerationItem> | ModerationItem[]) =>
        unwrapPaginated(response),
      providesTags: ['Moderation'],
    }),

    /** PATCH /api/admin-dashboard/moderation/<id>/ */
    moderateSong: builder.mutation<{ detail: string; status: string }, { id: string; status: 'approved' | 'rejected' }>({
      query: ({ id, status }) => ({
        url: `/admin-dashboard/moderation/${id}/`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Moderation', 'AdminStats', { type: 'Song', id: 'LIST' }],
    }),

    /** GET /api/admin-dashboard/subscriptions/ */
    getAdminSubscriptions: builder.query<Subscription[], void>({
      query: () => '/admin-dashboard/subscriptions/',
      transformResponse: (response: PaginatedResponse<Subscription> | Subscription[]) =>
        unwrapPaginated(response),
      providesTags: ['AdminSubscriptions'],
    }),

    /** GET /api/admin-dashboard/reports/ */
    getAdminReports: builder.query<AdminReports, void>({
      query: () => '/admin-dashboard/reports/',
      providesTags: ['AdminReports'],
    }),

    /** GET /api/admin-dashboard/pending-artists/?status=pending|verified|rejected */
    getPendingArtists: builder.query<PendingArtistItem[], { status?: string } | void>({
      query: (params) => {
        const status = params?.status ?? 'pending';
        return `/admin-dashboard/pending-artists/?status=${status}`;
      },
      providesTags: ['PendingArtists'],
    }),

    /** GET /api/admin-dashboard/pending-artists/<id>/ */
    getArtistVerificationDetail: builder.query<ArtistVerificationDetail, string>({
      query: (id) => `/admin-dashboard/pending-artists/${id}/`,
      providesTags: ['PendingArtists'],
    }),

    /** PATCH /api/admin-dashboard/verify-artist/<id>/ */
    verifyArtist: builder.mutation<{ detail: string; verification_status: string }, string>({
      query: (id) => ({
        url: `/admin-dashboard/verify-artist/${id}/`,
        method: 'PATCH',
      }),
      invalidatesTags: ['PendingArtists', 'AdminStats', 'AdminUsers', 'AdminActivity'],
    }),

    /** PATCH /api/admin-dashboard/reject-artist/<id>/ */
    rejectArtist: builder.mutation<
      { detail: string; verification_status: string; rejection_reason: string },
      { id: string; rejection_reason: string }
    >({
      query: ({ id, rejection_reason }) => ({
        url: `/admin-dashboard/reject-artist/${id}/`,
        method: 'PATCH',
        body: { rejection_reason },
      }),
      invalidatesTags: ['PendingArtists', 'AdminStats', 'AdminActivity'],
    }),

    /* ============================================================== */
    /*  Artist Analytics, Earnings & Notifications                     */
    /* ============================================================== */

    /** GET /api/music/artist/analytics/ */
    getArtistAnalytics: builder.query<ArtistAnalytics, void>({
      query: () => '/music/artist/analytics/',
      providesTags: ['ArtistAnalytics'],
    }),

    /** GET /api/music/artist/earnings/ */
    getArtistEarnings: builder.query<ArtistEarningsResponse, void>({
      query: () => '/music/artist/earnings/',
      providesTags: ['ArtistEarnings'],
    }),

    /** POST /api/music/artist/withdrawals/ — request a withdrawal */
    requestWithdrawal: builder.mutation<WithdrawalRequest, CreateWithdrawalPayload>({
      query: (body) => ({
        url: '/music/artist/withdrawals/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ArtistEarnings'],
    }),

    /** GET /api/music/artist/notifications/ */
    getNotifications: builder.query<Notification[], void>({
      query: () => '/music/artist/notifications/',
      transformResponse: (response: PaginatedResponse<Notification> | Notification[]) =>
        unwrapPaginated(response),
      providesTags: ['Notifications'],
    }),

    /** PATCH /api/music/artist/notifications/<id>/ — mark as read */
    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/music/artist/notifications/${id}/`,
        method: 'PATCH',
        body: { is_read: true },
      }),
      invalidatesTags: ['Notifications'],
    }),

    /* ============================================================== */
    /*  Subscription / Payment                                         */
    /* ============================================================== */

    /** POST /api/subscriptions/initiate/ — start payment flow */
    initiatePayment: builder.mutation<InitiatePaymentResponse, { payment_provider: 'chapa' | 'telebirr'; tier?: string; billing_period?: 'monthly' | 'yearly' }>({
      query: (body) => ({
        url: '/subscriptions/initiate/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminSubscriptions'],
    }),

    /** GET /api/subscriptions/current/ — user's active subscription */
    getCurrentSubscription: builder.query<CurrentSubscriptionResponse, void>({
      query: () => '/subscriptions/current/',
      providesTags: ['AdminSubscriptions'],
    }),

    /** GET /api/subscriptions/verify/<tx_ref>/ — poll payment status */
    verifyPayment: builder.query<VerifyPaymentResponse, string>({
      query: (txRef) => `/subscriptions/verify/${txRef}/`,
    }),

    /** POST /api/subscriptions/cancel/ — cancel auto-renewal */
    cancelSubscription: builder.mutation<CancelSubscriptionResponse, { confirm: boolean }>({
      query: (body) => ({
        url: '/subscriptions/cancel/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminSubscriptions'],
    }),

    /* ============================================================== */
    /*  Radio / Auto-play Recommendations                               */
    /* ============================================================== */

    /**
     * GET /api/music/songs/radio/?seed=<id>&exclude=<id1,id2,...>&limit=10
     * Returns recommended songs based on genre, listening history, and follows.
     */
    getRadioRecommendations: builder.query<
      SongWithArtist[],
      { seedId: string; excludeIds?: string[]; limit?: number }
    >({
      query: ({ seedId, excludeIds = [], limit = 10 }) => {
        const params = new URLSearchParams();
        params.set('seed', seedId);
        if (excludeIds.length > 0) params.set('exclude', excludeIds.join(','));
        params.set('limit', String(limit));
        return `/music/songs/radio/?${params.toString()}`;
      },
      transformResponse: (response: PaginatedResponse<SongWithArtist> | SongWithArtist[]) =>
        unwrapPaginated(response),
      // Never cache radio responses — always fresh
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  // Public catalog
  useGetSongsQuery,
  useGetSongByIdQuery,
  useStreamSongMutation,
  useDownloadSongMutation,
  useRemoveDownloadMutation,
  useGetMyDownloadsQuery,
  useGetAlbumsQuery,
  useGetAlbumByIdQuery,
  useGetPlaylistsQuery,
  useGetPlaylistByIdQuery,
  useGetArtistsQuery,
  useGetArtistByIdQuery,
  useSearchMusicQuery,
  // Follow
  useToggleFollowArtistMutation,
  useGetFollowStatusQuery,
  useGetFollowedArtistsQuery,
  // Like
  useToggleLikeMutation,
  useGetLikedSongsQuery,
  // History
  useRecordListenMutation,
  useGetListeningHistoryQuery,
  // Artist own content
  useGetMyArtistProfileQuery,
  useUpdateMyArtistProfileMutation,
  useUploadArtistImageMutation,
  useRemoveArtistImageMutation,
  useGetMySongsQuery,
  useDeleteSongMutation,
  useUpdateSongMutation,
  useUpdateSongCoverMutation,
  useGetMyAlbumsQuery,
  useCreateAlbumMutation,
  useUpdateAlbumCoverMutation,
  useDeleteAlbumMutation,
  useCreatePlaylistMutation,
  useGetMyPlaylistsQuery,
  useUpdatePlaylistMutation,
  useUpdatePlaylistCoverMutation,
  useDeletePlaylistMutation,
  useAddSongToPlaylistMutation,
  useRemoveSongFromPlaylistMutation,
  useReorderPlaylistSongsMutation,
  // Admin dashboard
  useGetAdminStatsQuery,
  useGetAdminActivityQuery,
  useGetAdminUsersQuery,
  useUpdateAdminUserMutation,
  useGetModerationQueueQuery,
  useModerateSongMutation,
  useGetAdminSubscriptionsQuery,
  useGetAdminReportsQuery,
  // Artist verification
  useGetPendingArtistsQuery,
  useGetArtistVerificationDetailQuery,
  useVerifyArtistMutation,
  useRejectArtistMutation,
  // Artist analytics
  useGetArtistAnalyticsQuery,
  useGetArtistEarningsQuery,
  useRequestWithdrawalMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  // Subscription / payment
  useInitiatePaymentMutation,
  useGetCurrentSubscriptionQuery,
  useVerifyPaymentQuery,
  useCancelSubscriptionMutation,
  // Radio / recommendations
  useGetRadioRecommendationsQuery,
} = musicApi;

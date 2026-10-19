/**
 * Sheba Sound — Core Domain Models
 * --------------------------------
 * TypeScript interfaces that mirror the Django REST Framework database schemas.
 * All primary keys are UUID v4 strings. Timestamps use ISO-8601 strings.
 */

/* ------------------------------------------------------------------ */
/*  Enums                                                              */
/* ------------------------------------------------------------------ */

/** The three strict RBAC roles recognised by the platform. */
export const UserRole = {
  Listener: "listener",
  Artist: "artist",
  Admin: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Subscription tier for listeners. */
export const SubscriptionTier = {
  Free: "free",
  Premium: "premium",
} as const;
export type SubscriptionTier =
  (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

/** Status of a song in the moderation pipeline. */
export const SongStatus = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
} as const;
export type SongStatus = (typeof SongStatus)[keyof typeof SongStatus];

/** Artist identity verification status. */
export const VerificationStatus = {
  Pending: "pending",
  Verified: "verified",
  Rejected: "rejected",
} as const;
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

/** Supported Ethiopian music genres. */
export const Genre = {
  Tizita: "tizita",
  Bati: "bati",
  Ambassel: "ambassel",
  Anchihoye: "anchihoye",
  Ethiojazz: "ethiojazz",
  Tigrigna: "tigrigna",
  Oromo: "oromo",
  Gurage: "gurage",
  Modern: "modern",
  Gospel: "gospel",
  HipHop: "hiphop",
  Other: "other",
} as const;
export type Genre = (typeof Genre)[keyof typeof Genre];

/* ------------------------------------------------------------------ */
/*  Base Entity                                                        */
/* ------------------------------------------------------------------ */

/** Fields shared by every persisted entity. */
export interface BaseEntity {
  id: string; // UUID v4
  created_at: string; // ISO-8601
  updated_at: string; // ISO-8601
}

/* ------------------------------------------------------------------ */
/*  User & Profile                                                     */
/* ------------------------------------------------------------------ */

export interface User extends BaseEntity {
  email: string | null;
  phone_number: string | null;
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
}

export interface ListenerProfile extends BaseEntity {
  user: string; // FK → User.id
  subscription_tier: SubscriptionTier;
  subscription_expiry: string | null; // ISO-8601
  favorite_genres: Genre[];
}

export interface ArtistProfile extends BaseEntity {
  user: string; // FK → User.id
  stage_name: string;
  bio: string;
  verified: boolean;
  profile_image_url: string | null;
  cover_image_url: string | null;
  social_links: Record<string, string>;
  total_streams: number;
  followers_count: number;
  verification_status: VerificationStatus;
  submitted_at: string | null;
  rejection_reason: string;
  is_identity_verified: boolean;
}

/* ------------------------------------------------------------------ */
/*  Music Catalog                                                      */
/* ------------------------------------------------------------------ */

export interface Album extends BaseEntity {
  artist: string; // FK → ArtistProfile.id
  artist_name?: string;
  title: string;
  cover_image_url: string | null;
  release_date: string; // ISO-8601
  genre: Genre;
  description: string;
}

export interface Song extends BaseEntity {
  artist: string; // FK → ArtistProfile.id
  album: string | null; // FK → Album.id (nullable for singles)
  title: string;
  genre: Genre;
  duration: number; // seconds
  audio_file_url: string;
  cover_image_url: string | null;
  stream_count: number;
  like_count: number;
  comment_count: number;
  status: SongStatus;
  lyrics: string | null;
  tags: string[];
  audio_hash: string | null;
}

export interface Playlist extends BaseEntity {
  owner: string; // FK → User.id
  title: string;
  description: string;
  is_public: boolean;
  cover_image_url: string | null;
  songs: string[]; // ordered list of Song.id
  song_objects?: Song[]; // full song objects (from detail endpoint)
  song_count?: number;
  total_duration?: number;
}

/* ------------------------------------------------------------------ */
/*  Subscription / Payment                                             */
/* ------------------------------------------------------------------ */

export interface Subscription extends BaseEntity {
  user: string; // FK → User.id
  tier: SubscriptionTier;
  start_date: string;
  end_date: string;
  is_active: boolean;
  payment_provider: "telebirr" | "chapa" | "manual";
  transaction_ref: string | null;
  payment_status: "pending" | "completed" | "failed" | "refunded";
  auto_renew: boolean;
  amount: number;
  currency: string;
  renewal_count: number;
  last_payment_date: string | null;
  cancellation_date: string | null;
  days_remaining: number;
  is_expired: boolean;
}

/* ------------------------------------------------------------------ */
/*  Paginated API Response (DRF standard)                              */
/* ------------------------------------------------------------------ */

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ------------------------------------------------------------------ */
/*  Notifications                                                       */
/* ------------------------------------------------------------------ */

export const NotificationType = {
  NewFollower: 'new_follower',
  StreamMilestone: 'stream_milestone',
  RevenueUpdate: 'revenue_update',
  SongApproved: 'song_approved',
  SongRejected: 'song_rejected',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface Notification extends BaseEntity {
  type: NotificationType;
  message: string;
  is_read: boolean;
  link?: string;
}

/* ------------------------------------------------------------------ */
/*  Revenue                                                             */
/* ------------------------------------------------------------------ */

export interface ArtistEarning extends BaseEntity {
  month: string;        // e.g. '2026-02'
  streams_count: number;
  earnings_usd: number;
  paid_out: boolean;
}

export interface PaymentTransaction extends BaseEntity {
  amount_usd: number;
  method: 'telebirr' | 'chapa' | 'bank_transfer';
  status: 'completed' | 'pending' | 'failed';
  reference: string;
}

/* ------------------------------------------------------------------ */
/*  Withdrawal Requests                                                */
/* ------------------------------------------------------------------ */

export const WithdrawalStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Completed: 'completed',
  Rejected: 'rejected',
} as const;
export type WithdrawalStatus = (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];

export interface WithdrawalRequest {
  id: string;
  amount: number;
  payment_method: 'telebirr' | 'chapa' | 'bank_transfer';
  account_details: string;
  status: WithdrawalStatus;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

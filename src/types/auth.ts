/**
 * Sheba Sound — Authentication Types
 * -----------------------------------
 * Request / response shapes for the Django REST Framework JWT auth endpoints.
 */

import type { User, UserRole } from "./models";

/* ------------------------------------------------------------------ */
/*  JWT Token Payloads                                                 */
/* ------------------------------------------------------------------ */

/** Decoded JWT access-token payload (SimpleJWT default claims). */
export interface JwtPayload {
  token_type: "access";
  exp: number;
  iat: number;
  jti: string;
  user_id: string; // UUID
  role: UserRole;
}

/** The pair returned by the /api/auth/token/ endpoint. */
export interface TokenPair {
  access: string;
  refresh: string;
}

/* ------------------------------------------------------------------ */
/*  Request DTOs                                                       */
/* ------------------------------------------------------------------ */

export interface LoginRequest {
  login_method?: "email" | "phone";
  email?: string;
  phone_number?: string;
  password: string;
}

export interface RegisterRequest {
  registration_method?: "email" | "phone";
  email?: string;
  phone_number?: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  uid: string;
  token: string;
  new_password: string;
  new_password_confirm: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

/* ------------------------------------------------------------------ */
/*  Response DTOs                                                      */
/* ------------------------------------------------------------------ */

export interface LoginResponse {
  tokens: TokenPair;
  user: User;
}

export interface RegisterResponse {
  user: User;
  message: string;
  /** Present for email registration: whether the verification message was sent. */
  verification_email_sent?: boolean;
}

export interface RefreshTokenResponse {
  access: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface GoogleAuthRequest {
  id_token: string;
}

/** Same shape as LoginResponse — tokens + user object. */
export type GoogleAuthResponse = LoginResponse;

/* ------------------------------------------------------------------ */
/*  Auth Slice State                                                   */
/* ------------------------------------------------------------------ */

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

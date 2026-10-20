/**
 * JWT & Session Cookie Helpers (src/backend/auth/jwt.ts)
 * 
 * Provides signed JSON Web Token generation and HttpOnly cookie management
 * for Hono HTTP contexts.
 */

import { sign, verify } from "hono/jwt";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { User } from "../../storage/user";

export const JWT_SECRET = process.env.JWT_SECRET || "metacognitive-testing-auth-secret-key-2026";
export const AUTH_COOKIE_NAME = "auth_token";
export const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface JwtUserPayload {
  sub: string;
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  primary_provider: string;
  metadata?: any;
  exp: number;
  iat: number;
}

export async function createAuthToken(user: User, secret: string = JWT_SECRET): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtUserPayload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    primary_provider: user.primary_provider,
    metadata: user.metadata,
    exp: now + TOKEN_EXPIRY_SECONDS,
    iat: now,
  };
  return sign(payload, secret);
}

export async function verifyAuthToken(token: string, secret: string = JWT_SECRET): Promise<JwtUserPayload | null> {
  try {
    const payload = await verify(token, secret, "HS256");
    return payload as unknown as JwtUserPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(c: Context, token: string): void {
  const isHttps = c.req.url.startsWith("https://") || c.req.header("x-forwarded-proto") === "https";
  setCookie(c, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "Lax",
    path: "/",
    maxAge: TOKEN_EXPIRY_SECONDS,
  });
}

export function clearAuthCookie(c: Context): void {
  deleteCookie(c, AUTH_COOKIE_NAME, {
    path: "/",
  });
}

export function extractToken(c: Context): string | null {
  // 1. Check HttpOnly cookie
  const cookieToken = getCookie(c, AUTH_COOKIE_NAME);
  if (cookieToken) return cookieToken;

  // 2. Check Authorization Bearer header
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * User Model & Types (src/storage/user.ts)
 * 
 * Defines core User entity, provider profiles, and storage row representations
 * for multi-provider OAuth matrix (GitHub, LinuxDo, Google).
 */

export type AuthProvider = "github" | "linuxdo" | "google" | (string & {});

export type SessionVisibilityPreference = "private" | "anonymous" | "public";
export type SessionVisibility = SessionVisibilityPreference;

export interface UserSocialLinks {
  github?: string;
  twitter?: string;
  linuxdo?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface UserMetadata {
  bio?: string;
  default_visibility?: SessionVisibilityPreference;
  social_links?: UserSocialLinks;
  custom_avatar?: string;
  providers?: Record<string, {
    id: string | number;
    username?: string;
    email?: string | null;
    avatar_url?: string | null;
    linked_at: string;
    [key: string]: any;
  }>;
  trust_level?: number;
  badge?: string;
  [key: string]: any;
}

export interface User {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  primary_provider: AuthProvider;
  created_at: string;
  updated_at: string;
  metadata?: UserMetadata;
}

export interface UserRow {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  primary_provider: string;
  created_at: string;
  updated_at: string;
  metadata_json: string | null;
}

export function parseUserRow(row: UserRow): User {
  let metadata: UserMetadata | undefined;
  if (row.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json);
    } catch {
      metadata = undefined;
    }
  }
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    primary_provider: row.primary_provider as AuthProvider,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata,
  };
}

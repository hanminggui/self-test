/**
 * User Manager (src/backend/user_manager.ts)
 * 
 * Manages user accounts, identity linking, provider deduplication,
 * and persistence across pluggable storage adapters.
 */

import { StorageAdapter } from "../storage/adapter";
import { LocalSqliteAdapter, USERS_TABLE_SCHEMA_SQL } from "../storage/local_sqlite";
import { User, UserRow, UserMetadata, parseUserRow, SessionVisibilityPreference, UserSocialLinks } from "../storage/user";
import { validateDisplayName, validateBio, validateVisibility, validateSocialLinks } from "./user_validation";

export interface UpsertUserParams {
  id?: string;
  email?: string | null;
  display_name: string;
  avatar_url?: string | null;
  primary_provider: string;
  provider_id?: string | number;
  metadata?: Record<string, any>;
}

export interface UpdateProfileParams {
  display_name?: string;
  bio?: string;
  avatar_url?: string | null;
  default_visibility?: SessionVisibilityPreference;
  social_links?: UserSocialLinks;
  metadata?: Record<string, any>;
}

export interface ConnectedProviderInfo {
  provider: string;
  linked: boolean;
  is_primary: boolean;
  id?: string | number;
  username?: string;
  email?: string | null;
  avatar_url?: string | null;
  linked_at?: string;
}

export class UserManager {
  private storage: StorageAdapter;

  constructor(storage?: StorageAdapter) {
    this.storage = storage || new LocalSqliteAdapter();
    this.initDb();
  }

  public getStorage(): StorageAdapter {
    return this.storage;
  }

  public initDb(): void {
    if (this.storage.execSync) {
      this.storage.execSync(USERS_TABLE_SCHEMA_SQL);
    } else {
      this.storage.exec(USERS_TABLE_SCHEMA_SQL).catch((e) => console.warn("Failed to init users table:", e));
    }
  }

  public async getUserById(id: string): Promise<User | null> {
    const rows = await this.storage.query<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
    if (!rows || rows.length === 0) return null;
    return parseUserRow(rows[0]);
  }

  public getUserByIdSync(id: string): User | null {
    if (!this.storage.querySync) return null;
    const rows = this.storage.querySync<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
    if (!rows || rows.length === 0) return null;
    return parseUserRow(rows[0]);
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const rows = await this.storage.query<UserRow>("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email]);
    if (!rows || rows.length === 0) return null;
    return parseUserRow(rows[0]);
  }

  public getUserByEmailSync(email: string): User | null {
    if (!email || !this.storage.querySync) return null;
    const rows = this.storage.querySync<UserRow>("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email]);
    if (!rows || rows.length === 0) return null;
    return parseUserRow(rows[0]);
  }

  public async getUserByProvider(provider: string, providerId: string | number): Promise<User | null> {
    const rows = await this.storage.query<UserRow>("SELECT * FROM users");
    const targetIdStr = String(providerId);
    for (const row of rows) {
      if (row.id === `${provider}:${targetIdStr}`) {
        return parseUserRow(row);
      }
      if (row.metadata_json) {
        try {
          const meta = JSON.parse(row.metadata_json);
          if (meta.providers && meta.providers[provider] && String(meta.providers[provider].id) === targetIdStr) {
            return parseUserRow(row);
          }
        } catch {}
      }
    }
    return null;
  }

  public getUserByProviderSync(provider: string, providerId: string | number): User | null {
    if (!this.storage.querySync) return null;
    const rows = this.storage.querySync<UserRow>("SELECT * FROM users");
    const targetIdStr = String(providerId);
    for (const row of rows) {
      if (row.id === `${provider}:${targetIdStr}`) {
        return parseUserRow(row);
      }
      if (row.metadata_json) {
        try {
          const meta = JSON.parse(row.metadata_json);
          if (meta.providers && meta.providers[provider] && String(meta.providers[provider].id) === targetIdStr) {
            return parseUserRow(row);
          }
        } catch {}
      }
    }
    return null;
  }

  /**
   * Upserts a user with provider identity deduplication.
   * If an existing user matches by verified email, links the provider to that user.
   * Otherwise, if existing user matches by provider_id, updates that record.
   * Otherwise, inserts a new user record.
   */
  public async upsertUser(params: UpsertUserParams): Promise<User> {
    const now = new Date().toISOString();
    const normalizedEmail = params.email ? params.email.trim().toLowerCase() : null;
    const providerIdStr = params.provider_id !== undefined ? String(params.provider_id) : undefined;

    // 1. Account deduplication by verified email
    let existingUser: User | null = null;
    if (normalizedEmail) {
      existingUser = await this.getUserByEmail(normalizedEmail);
    }

    // 2. Lookup by provider id if no email match
    if (!existingUser && providerIdStr) {
      existingUser = await this.getUserByProvider(params.primary_provider, providerIdStr);
    }

    if (existingUser) {
      // Merge provider into existing metadata
      const meta: UserMetadata = existingUser.metadata ? { ...existingUser.metadata } : {};
      meta.providers = meta.providers || {};
      if (providerIdStr) {
        meta.providers[params.primary_provider] = {
          id: providerIdStr,
          email: normalizedEmail,
          avatar_url: params.avatar_url || existingUser.avatar_url,
          display_name: params.display_name,
          linked_at: now,
          ...(params.metadata?.providers?.[params.primary_provider] || {}),
        };
      }

      // Merge community badges / trust levels (e.g. LinuxDo)
      if (params.metadata?.trust_level !== undefined) {
        meta.trust_level = params.metadata.trust_level;
      }
      if (params.metadata?.badge) {
        meta.badge = params.metadata.badge;
      }
      if (params.metadata) {
        for (const [k, v] of Object.entries(params.metadata)) {
          if (k !== "providers") {
            meta[k] = v;
          }
        }
      }

      const updatedDisplayName = existingUser.display_name || params.display_name;
      const updatedAvatar = existingUser.avatar_url || params.avatar_url || null;
      const updatedEmail = existingUser.email || normalizedEmail;

      const updateSql = `
        UPDATE users
        SET email = ?,
            display_name = ?,
            avatar_url = ?,
            updated_at = ?,
            metadata_json = ?
        WHERE id = ?
      `;
      const updateParams = [
        updatedEmail,
        updatedDisplayName,
        updatedAvatar,
        now,
        JSON.stringify(meta),
        existingUser.id,
      ];

      if (this.storage.runSync) {
        this.storage.runSync(updateSql, updateParams);
      } else {
        await this.storage.run(updateSql, updateParams);
      }

      return {
        id: existingUser.id,
        email: updatedEmail,
        display_name: updatedDisplayName,
        avatar_url: updatedAvatar,
        primary_provider: existingUser.primary_provider,
        created_at: existingUser.created_at,
        updated_at: now,
        metadata: meta,
      };
    }

    // 3. New user creation
    const newId = params.id || `usr_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const initialMeta: UserMetadata = {
      ...(params.metadata || {}),
      providers: {
        ...(params.metadata?.providers || {}),
      },
    };
    if (providerIdStr) {
      initialMeta.providers![params.primary_provider] = {
        id: providerIdStr,
        email: normalizedEmail,
        avatar_url: params.avatar_url || null,
        display_name: params.display_name,
        linked_at: now,
      };
    }

    const insertSql = `
      INSERT INTO users (id, email, display_name, avatar_url, primary_provider, created_at, updated_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertParams = [
      newId,
      normalizedEmail,
      params.display_name,
      params.avatar_url || null,
      params.primary_provider,
      now,
      now,
      JSON.stringify(initialMeta),
    ];

    if (this.storage.runSync) {
      this.storage.runSync(insertSql, insertParams);
    } else {
      await this.storage.run(insertSql, insertParams);
    }

    return {
      id: newId,
      email: normalizedEmail,
      display_name: params.display_name,
      avatar_url: params.avatar_url || null,
      primary_provider: params.primary_provider,
      created_at: now,
      updated_at: now,
      metadata: initialMeta,
    };
  }

  public async deleteUser(id: string): Promise<boolean> {
    const res = await this.storage.run("DELETE FROM users WHERE id = ?", [id]);
    return (res.changes ?? 0) > 0;
  }

  /**
   * Updates user profile fields (display name, bio, avatar, default visibility, social links)
   * with strict validation.
   */
  public async updateUserProfile(id: string, params: UpdateProfileParams): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error("User not found");
    }

    // 1. Validation
    if (params.display_name !== undefined) {
      const v = validateDisplayName(params.display_name);
      if (!v.valid) {
        throw new Error(v.error || "Invalid display name");
      }
    }

    if (params.bio !== undefined) {
      const v = validateBio(params.bio);
      if (!v.valid) {
        throw new Error(v.error || "Invalid bio");
      }
    }

    if (params.default_visibility !== undefined) {
      const v = validateVisibility(params.default_visibility);
      if (!v.valid) {
        throw new Error(v.error || "Invalid default visibility preference");
      }
    }

    if (params.social_links !== undefined) {
      const v = validateSocialLinks(params.social_links);
      if (!v.valid) {
        throw new Error(v.error || "Invalid social links");
      }
    }

    // 2. Prepare merged fields
    const updatedDisplayName = params.display_name !== undefined ? params.display_name.trim() : user.display_name;
    const updatedAvatar = params.avatar_url !== undefined ? params.avatar_url : user.avatar_url;
    const now = new Date().toISOString();

    const meta: UserMetadata = {
      ...(user.metadata || {}),
      providers: { ...(user.metadata?.providers || {}) },
    };

    if (params.bio !== undefined) {
      meta.bio = params.bio.trim();
    }
    if (params.default_visibility !== undefined) {
      meta.default_visibility = params.default_visibility;
    }
    if (params.social_links !== undefined) {
      meta.social_links = {
        ...(meta.social_links || {}),
        ...params.social_links,
      };
    }
    if (params.metadata) {
      for (const [k, v] of Object.entries(params.metadata)) {
        if (k !== "providers") {
          meta[k] = v;
        }
      }
    }

    const updateSql = `
      UPDATE users
      SET display_name = ?,
          avatar_url = ?,
          updated_at = ?,
          metadata_json = ?
      WHERE id = ?
    `;
    const updateParams = [
      updatedDisplayName,
      updatedAvatar,
      now,
      JSON.stringify(meta),
      user.id,
    ];

    if (this.storage.runSync) {
      this.storage.runSync(updateSql, updateParams);
    } else {
      await this.storage.run(updateSql, updateParams);
    }

    return {
      id: user.id,
      email: user.email,
      display_name: updatedDisplayName,
      avatar_url: updatedAvatar,
      primary_provider: user.primary_provider,
      created_at: user.created_at,
      updated_at: now,
      metadata: meta,
    };
  }

  /**
   * Links a secondary OAuth provider to an existing user account.
   */
  public async linkProvider(
    userId: string,
    provider: string,
    profile: {
      id: string | number;
      email?: string | null;
      display_name?: string;
      avatar_url?: string | null;
      metadata?: any;
    }
  ): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const providerIdStr = String(profile.id);

    // Check if this provider profile is already linked to another user
    const existingOwner = await this.getUserByProvider(provider, providerIdStr);
    if (existingOwner && existingOwner.id !== userId) {
      throw new Error(`This ${provider} account is already linked to another user (${existingOwner.display_name}).`);
    }

    const now = new Date().toISOString();
    const meta: UserMetadata = {
      ...(user.metadata || {}),
      providers: { ...(user.metadata?.providers || {}) },
    };

    meta.providers![provider] = {
      id: providerIdStr,
      username: profile.display_name,
      email: profile.email || null,
      avatar_url: profile.avatar_url || null,
      linked_at: now,
      ...(profile.metadata || {}),
    };

    const updateSql = `
      UPDATE users
      SET updated_at = ?,
          metadata_json = ?
      WHERE id = ?
    `;
    const updateParams = [now, JSON.stringify(meta), userId];

    if (this.storage.runSync) {
      this.storage.runSync(updateSql, updateParams);
    } else {
      await this.storage.run(updateSql, updateParams);
    }

    return {
      ...user,
      updated_at: now,
      metadata: meta,
    };
  }

  /**
   * Unlinks a secondary OAuth provider from a user account.
   * Throws an error if attempting to unlink the user's sole authentication method.
   */
  public async unlinkProvider(userId: string, provider: string): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const meta: UserMetadata = {
      ...(user.metadata || {}),
      providers: { ...(user.metadata?.providers || {}) },
    };

    const providers = meta.providers || {};
    const linkedProviders = Object.keys(providers);

    // Guard: Prevent unlinking sole authentication method
    if (linkedProviders.length <= 1) {
      throw new Error("Cannot unlink your only authentication provider.");
    }

    if (!providers[provider]) {
      throw new Error(`Provider '${provider}' is not linked.`);
    }

    delete providers[provider];

    const now = new Date().toISOString();
    let newPrimary = user.primary_provider;

    // If unlinking primary provider, promote the first remaining connected provider
    if (user.primary_provider === provider) {
      const remaining = Object.keys(providers);
      if (remaining.length > 0) {
        newPrimary = remaining[0];
      }
    }

    const updateSql = `
      UPDATE users
      SET primary_provider = ?,
          updated_at = ?,
          metadata_json = ?
      WHERE id = ?
    `;
    const updateParams = [newPrimary, now, JSON.stringify(meta), userId];

    if (this.storage.runSync) {
      this.storage.runSync(updateSql, updateParams);
    } else {
      await this.storage.run(updateSql, updateParams);
    }

    return {
      ...user,
      primary_provider: newPrimary,
      updated_at: now,
      metadata: meta,
    };
  }

  /**
   * Returns list of supported OAuth providers with their connection status for a user.
   */
  public getConnectedProviders(user: User): ConnectedProviderInfo[] {
    const supported = ["github", "linuxdo", "google"];
    const userProviders = user.metadata?.providers || {};

    return supported.map((prov) => {
      const info = userProviders[prov];
      const isLinked = Boolean(info || user.primary_provider === prov);
      return {
        provider: prov,
        linked: isLinked,
        is_primary: user.primary_provider === prov,
        id: info?.id,
        username: info?.username,
        email: info?.email,
        avatar_url: info?.avatar_url,
        linked_at: info?.linked_at || (user.primary_provider === prov ? user.created_at : undefined),
      };
    });
  }
}

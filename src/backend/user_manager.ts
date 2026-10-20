/**
 * User Manager (src/backend/user_manager.ts)
 * 
 * Manages user accounts, identity linking, provider deduplication,
 * and persistence across pluggable storage adapters.
 */

import { StorageAdapter } from "../storage/adapter";
import { LocalSqliteAdapter, USERS_TABLE_SCHEMA_SQL } from "../storage/local_sqlite";
import { User, UserRow, UserMetadata, parseUserRow } from "../storage/user";

export interface UpsertUserParams {
  id?: string;
  email?: string | null;
  display_name: string;
  avatar_url?: string | null;
  primary_provider: string;
  provider_id?: string | number;
  metadata?: Record<string, any>;
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
}

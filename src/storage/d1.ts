/**
 * Cloudflare D1 Storage Adapter (src/storage/d1.ts)
 * 
 * Implements StorageAdapter wrapping Cloudflare D1 Database binding for
 * edge runtime execution with native asynchronous execution.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { RunResult, StorageAdapter } from "./adapter";

export class D1StorageAdapter implements StorageAdapter {
  readonly engine = "cloudflare_d1";
  private db: D1Database;

  constructor(d1Database: D1Database) {
    if (!d1Database) {
      throw new Error("D1StorageAdapter requires a valid D1Database instance.");
    }
    this.db = d1Database;
  }

  getDatabase(): D1Database {
    return this.db;
  }

  /**
   * Normalize parameters for Cloudflare D1 binding (maps undefined to null).
   */
  private normalizeParams(params: any[] = []): any[] {
    return params.map(val => (val === undefined ? null : val));
  }

  /**
   * Executes a parameterized SQL query and returns result rows.
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const cleanParams = this.normalizeParams(params);
    const stmt = cleanParams.length > 0
      ? this.db.prepare(sql).bind(...cleanParams)
      : this.db.prepare(sql);
    const result = await stmt.all<T>();
    return (result.results ?? []) as T[];
  }

  /**
   * Executes a parameterized DML statement (INSERT, UPDATE, DELETE).
   */
  async run(sql: string, params: any[] = []): Promise<RunResult> {
    const cleanParams = this.normalizeParams(params);
    const stmt = cleanParams.length > 0
      ? this.db.prepare(sql).bind(...cleanParams)
      : this.db.prepare(sql);
    const res = await stmt.run();
    const changes = res.meta?.changes ?? res.meta?.rows_written ?? (res.success ? 1 : 0);
    const lastInsertRowid = res.meta?.last_row_id;
    return {
      changes,
      lastInsertRowid,
    };
  }

  /**
   * Executes raw multi-statement DDL scripts safely.
   * Note: Cloudflare D1's native `db.exec(query)` splits queries by newline (\n),
   * which breaks formatted multiline DDL statements like `CREATE TABLE (...)`.
   * To ensure robust execution across all environments, we strip comments,
   * parse statements by semicolon, and execute each statement via prepared statements (or batch).
   */
  async exec(sql: string): Promise<void> {
    const cleanedSql = sql
      .replace(/--.*$/gm, "")
      .trim();

    const statements = cleanedSql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (statements.length === 0) return;

    if (typeof this.db.batch === "function" && statements.length > 1) {
      const preparedList = statements.map(s => this.db.prepare(s));
      await this.db.batch(preparedList);
      return;
    }

    for (const stmt of statements) {
      await this.db.prepare(stmt).run();
    }
  }

  /**
   * Closes database connection (managed at edge by Cloudflare, no-op).
   */
  close(): void {
    // Cloudflare D1 is managed at the edge; connection pooling/closure is handled by the platform.
  }
}

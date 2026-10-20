/**
 * Local SQLite Storage Adapter (src/storage/local_sqlite.ts)
 * 
 * Implements StorageAdapter wrapping `bun:sqlite` for local development,
 * testing, and standalone CLI environments.
 */

import { Database } from "bun:sqlite";
import * as path from "path";
import * as fs from "fs";
import { RunResult, StorageAdapter } from "./adapter";

export class LocalSqliteAdapter implements StorageAdapter {
  readonly engine = "local_sqlite";
  private db: Database;

  constructor(dbPathOrDb?: string | Database) {
    if (dbPathOrDb && typeof dbPathOrDb !== "string") {
      this.db = dbPathOrDb;
    } else {
      const targetPath = dbPathOrDb || path.join(process.cwd(), "data", "sessions.sqlite");
      if (targetPath !== ":memory:") {
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      this.db = new Database(targetPath, { create: true });
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.querySync<T>(sql, params);
  }

  async run(sql: string, params: any[] = []): Promise<RunResult> {
    return this.runSync(sql, params);
  }

  async exec(sql: string): Promise<void> {
    this.execSync(sql);
  }

  querySync<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.query(sql);
    return stmt.all(...params) as T[];
  }

  runSync(sql: string, params: any[] = []): RunResult {
    const stmt = this.db.prepare(sql);
    const res = stmt.run(...params) as any;
    return {
      changes: res?.changes ?? 0,
      lastInsertRowid: res?.lastInsertRowid,
    };
  }

  execSync(sql: string): void {
    this.db.exec(sql);
  }

  close(): void {
    try {
      this.db.close();
    } catch {}
  }

  getDatabase(): Database {
    return this.db;
  }
}

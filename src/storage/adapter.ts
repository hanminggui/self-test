/**
 * Pluggable Storage Layer (src/storage/adapter.ts)
 * 
 * Provides unified, runtime-agnostic asynchronous storage primitives for
 * multi-runtime deployments (Bun, Node, Cloudflare Workers/D1, Edge).
 */

export interface RunResult {
  changes: number;
  lastInsertRowid?: number | bigint;
}

export interface StorageAdapter {
  /**
   * Engine identifier name (e.g. 'local_sqlite', 'cloudflare_d1').
   */
  readonly engine?: string;

  /**
   * Executes a SQL query with parameters and returns an array of result rows.
   */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * Executes a parameterized DML statement (INSERT, UPDATE, DELETE)
   * and returns the number of affected rows and optional last insert rowid.
   */
  run(sql: string, params?: any[]): Promise<RunResult>;

  /**
   * Executes raw SQL statements (such as DDL scripts or multi-statement schemas).
   */
  exec(sql: string): Promise<void>;

  /**
   * Closes the storage connection and releases any held resources.
   */
  close?(): Promise<void> | void;

  /**
   * Optional synchronous query execution for runtimes and engines that support it (e.g., bun:sqlite).
   */
  querySync?<T = any>(sql: string, params?: any[]): T[];

  /**
   * Optional synchronous DML execution for runtimes and engines that support it.
   */
  runSync?(sql: string, params?: any[]): RunResult;

  /**
   * Optional synchronous raw SQL execution for runtimes and engines that support it.
   */
  execSync?(sql: string): void;
}

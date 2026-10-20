/**
 * Stub for bun:sqlite when bundling for non-Bun runtimes (e.g., Cloudflare Workers).
 */
export class Database {
  constructor(..._args: any[]) {
    throw new Error("bun:sqlite is only supported under the Bun runtime.");
  }
}

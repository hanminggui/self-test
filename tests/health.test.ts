import { describe, test, expect } from "bun:test";
import { app } from "../src/backend/server";
import { D1StorageAdapter } from "../src/storage/d1";
import { SessionManager } from "../src/backend/session_manager";
import { Database } from "bun:sqlite";
import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";

function createMockD1(): D1Database {
  const memDb = new Database(":memory:");
  return {
    prepare(sql: string): D1PreparedStatement {
      return {
        bind(...params: any[]) {
          return {
            bind: (...p2: any[]) => this.bind(...params, ...p2),
            first: async () => memDb.prepare(sql).get(...params) as any,
            run: async () => {
              const res = memDb.prepare(sql).run(...params) as any;
              return { success: true, meta: { changes: res?.changes ?? 0, last_row_id: 0 } };
            },
            all: async <T>() => ({
              results: memDb.prepare(sql).all(...params) as T[],
              success: true,
              meta: {},
            }),
            raw: async () => memDb.prepare(sql).values(...params) as any[],
          } as any;
        },
        first: async () => memDb.prepare(sql).get() as any,
        run: async () => {
          const res = memDb.prepare(sql).run() as any;
          return { success: true, meta: { changes: res?.changes ?? 0, last_row_id: 0 } };
        },
        all: async <T>() => ({
          results: memDb.prepare(sql).all() as T[],
          success: true,
          meta: {},
        }),
        raw: async () => memDb.prepare(sql).values() as any[],
      } as any;
    },
    dump: async () => new ArrayBuffer(0),
    batch: async () => [],
    exec: async (sql: string) => {
      memDb.exec(sql);
      return { count: 1, duration: 0 };
    },
  } as unknown as D1Database;
}

describe("GitHub Issue #5: Health Probe & Dual-Mode Runtime", () => {
  test("GET /api/health reports Bun local environment and local_sqlite engine by default", async () => {
    const req = new Request("http://localhost/api/health");
    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.environment).toBe("bun");
    expect(body.runtime).toBe("bun");
    expect(body.storage).toBe("local_sqlite");
    expect(body.storage_engine).toBe("local_sqlite");
    expect(body.connected).toBe(true);
    expect(body.database.connected).toBe(true);
  });

  test("GET /api/health reports cloudflare-workers and cloudflare_d1 when D1 binding is injected", async () => {
    const mockD1 = createMockD1();
    const req = new Request("http://localhost/api/health");
    // Inject c.env.DB
    const res = await app.fetch(req, { DB: mockD1 });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.environment).toBe("cloudflare-workers");
    expect(body.runtime).toBe("cloudflare-workers");
    expect(body.storage).toBe("cloudflare_d1");
    expect(body.storage_engine).toBe("cloudflare_d1");
    expect(body.connected).toBe(true);
    expect(body.database.connected).toBe(true);
  });

  test("GET /api/health reports degraded status (503) when database connectivity fails", async () => {
    const brokenD1 = {
      prepare() {
        return {
          bind() { return this; },
          run: async () => { throw new Error("Simulated D1 connection timeout"); },
          all: async () => { throw new Error("Simulated D1 connection timeout"); },
          first: async () => { throw new Error("Simulated D1 connection timeout"); },
          raw: async () => { throw new Error("Simulated D1 connection timeout"); },
        } as any;
      },
      dump: async () => new ArrayBuffer(0),
      batch: async () => [],
      exec: async () => { throw new Error("Simulated D1 connection timeout"); },
    } as unknown as D1Database;

    const req = new Request("http://localhost/api/health");
    const res = await app.fetch(req, { DB: brokenD1 });
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.connected).toBe(false);
    expect(body.database.connected).toBe(false);
    expect(body.database.error).toContain("Simulated D1 connection timeout");
  });

  test("CLI evaluator cleanly normalizes --apiUrl and probes /api/health", async () => {
    const { normalizeApiUrl, checkServerHealth } = await import("../src/cli/eval");

    // 1. Normalization of various apiUrl inputs
    expect(normalizeApiUrl(undefined)).toBe("http://localhost:8000");
    expect(normalizeApiUrl("https://my-worker.workers.dev///")).toBe("https://my-worker.workers.dev");
    expect(normalizeApiUrl("http://localhost:8000/")).toBe("http://localhost:8000");
    expect(normalizeApiUrl("  https://custom-domain.com/api-prefix/  ")).toBe("https://custom-domain.com/api-prefix");

    // 2. checkServerHealth verifies /api/health probe
    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/api/health") {
          return Response.json({ status: "healthy", connected: true });
        }
        return new Response("Not Found", { status: 404 });
      },
    });

    try {
      const serverUrl = `http://localhost:${server.port}`;
      const isHealthy = await checkServerHealth(serverUrl);
      expect(isHealthy).toBe(true);

      const isUnhealthy = await checkServerHealth("http://localhost:59999");
      expect(isUnhealthy).toBe(false);
    } finally {
      server.stop();
    }
  });

  test("GET /admin and SPA routes correctly serve index.html in Cloudflare Workers with ASSETS binding", async () => {
    const mockAssets = {
      fetch: async (req: Request) => {
        const url = new URL(req.url);
        // Emulate Cloudflare Workers Assets: only index.html and static assets exist on disk
        if (url.pathname === "/index.html" || url.pathname === "/") {
          return new Response("<!DOCTYPE html><html><body>Self-Test SPA</body></html>", {
            headers: { "Content-Type": "text/html" },
            status: 200,
          });
        }
        if (url.pathname.startsWith("/assets/app.js")) {
          return new Response("console.log('app');", {
            headers: { "Content-Type": "application/javascript" },
            status: 200,
          });
        }
        return new Response("Not Found", { status: 404 });
      },
    };

    // 1. /admin endpoint
    const resAdmin = await app.fetch(new Request("http://localhost/admin"), { ASSETS: mockAssets });
    expect(resAdmin.status).toBe(200);
    const htmlAdmin = await resAdmin.text();
    expect(htmlAdmin).toContain("Self-Test SPA");

    // 2. /admin with token query param
    const resAdminToken = await app.fetch(new Request("http://localhost/admin?token=admin888"), { ASSETS: mockAssets });
    expect(resAdminToken.status).toBe(200);
    const htmlAdminToken = await resAdminToken.text();
    expect(htmlAdminToken).toContain("Self-Test SPA");

    // 3. /admin/ trailing slash
    const resAdminSlash = await app.fetch(new Request("http://localhost/admin/"), { ASSETS: mockAssets });
    expect(resAdminSlash.status).toBe(200);

    // 4. Fallback route /*
    const resOther = await app.fetch(new Request("http://localhost/any-client-route"), { ASSETS: mockAssets });
    expect(resOther.status).toBe(200);

    // 5. Static assets pass through
    const resAsset = await app.fetch(new Request("http://localhost/assets/app.js"), { ASSETS: mockAssets });
    expect(resAsset.status).toBe(200);
    expect(await resAsset.text()).toBe("console.log('app');");
  });
});

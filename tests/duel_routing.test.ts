import { describe, expect, it, beforeEach } from "bun:test";
import {
  extractDuelSessionIdsFromUrl,
  resolveRouteView,
  buildDuelUrl,
  saveReferrerSessionId,
  getReferrerSessionId,
  clearReferrerSessionId,
} from "../src/frontend/utils/sessionRoute";

describe("Seam 4: Duel Routing & Session Referrer Persistence", () => {
  beforeEach(() => {
    (globalThis as any).localStorage = {
      _store: {} as Record<string, string>,
      getItem(key: string) {
        return this._store[key] || null;
      },
      setItem(key: string, val: string) {
        this._store[key] = val;
      },
      removeItem(key: string) {
        delete this._store[key];
      },
    };
    (globalThis as any).sessionStorage = {
      _store: {} as Record<string, string>,
      getItem(key: string) {
        return this._store[key] || null;
      },
      setItem(key: string, val: string) {
        this._store[key] = val;
      },
      removeItem(key: string) {
        delete this._store[key];
      },
    };
  });

  describe("extractDuelSessionIdsFromUrl", () => {
    it("extracts session IDs from /duel/:idA/:idB path", () => {
      const res = extractDuelSessionIdsFromUrl("/duel/sess_111/sess_222");
      expect(res).toEqual({
        sessionIdA: "sess_111",
        sessionIdB: "sess_222",
      });
    });

    it("extracts session IDs from query parameters (?duel_a=...&duel_b=...)", () => {
      const res = extractDuelSessionIdsFromUrl("/duel", "?duel_a=sess_aaa&duel_b=sess_bbb");
      expect(res).toEqual({
        sessionIdA: "sess_aaa",
        sessionIdB: "sess_bbb",
      });
    });

    it("extracts session IDs from query duel parameter (?duel=sess_x,sess_y)", () => {
      const res = extractDuelSessionIdsFromUrl("/", "?duel=sess_x,sess_y");
      expect(res).toEqual({
        sessionIdA: "sess_x",
        sessionIdB: "sess_y",
      });
    });

    it("returns null when IDs are missing or incomplete", () => {
      expect(extractDuelSessionIdsFromUrl("/duel")).toBeNull();
      expect(extractDuelSessionIdsFromUrl("/duel/sess_111")).toBeNull();
      expect(extractDuelSessionIdsFromUrl("/")).toBeNull();
    });
  });

  describe("resolveRouteView for Duel", () => {
    it("routes /duel/:idA/:idB to view 'duel' outside AppLayout for both guest and authenticated users", () => {
      for (const isAuth of [false, true]) {
        const resolved = resolveRouteView("/duel/sess_1/sess_2", isAuth);
        expect(resolved).toEqual({
          view: "duel",
          inAppLayout: false,
        });
      }
    });

    it("routes /duel (standalone) to view 'duel' outside AppLayout", () => {
      const resolved = resolveRouteView("/duel", false);
      expect(resolved.view).toBe("duel");
      expect(resolved.inAppLayout).toBe(false);
    });
  });

  describe("buildDuelUrl", () => {
    it("constructs relative and absolute duel URLs", () => {
      expect(buildDuelUrl("sess_a", "sess_b")).toBe("/duel/sess_a/sess_b");
      expect(buildDuelUrl("sess_a", "sess_b", "https://self-test.app")).toBe("https://self-test.app/duel/sess_a/sess_b");
    });
  });

  describe("Referrer Session ID Persistence", () => {
    it("saves, retrieves, and clears referrer session ID", () => {
      expect(getReferrerSessionId()).toBeNull();
      saveReferrerSessionId("sess_friend_999");
      expect(getReferrerSessionId()).toBe("sess_friend_999");
      clearReferrerSessionId();
      expect(getReferrerSessionId()).toBeNull();
    });
  });
});

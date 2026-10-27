import { describe, expect, it, beforeEach, mock } from "bun:test";
import {
  resolveMotionMode,
  resolveSoundMode,
  resolvePerformanceMode,
  STORAGE_KEYS,
} from "../src/frontend/contexts/GameEffectsContext";

describe("Seam 2: Game Effects & Accessibility Context", () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };
  });

  it("当系统 prefers-reduced-motion 为 true 且无用户手动配置时，自动降级为 reduced 动效模式", () => {
    const mode = resolveMotionMode({
      storageValue: null,
      prefersReducedMotion: true,
    });
    expect(mode).toBe("reduced");
  });

  it("当用户在 localStorage 显式配置 full 时，优先尊重用户显式选择", () => {
    mockStorage[STORAGE_KEYS.MOTION_MODE] = "full";
    const mode = resolveMotionMode({
      storageValue: mockStorage[STORAGE_KEYS.MOTION_MODE],
      prefersReducedMotion: true,
    });
    expect(mode).toBe("full");
  });

  it("当用户在 localStorage 显式配置 reduced 时，不论系统偏好为何均输出 reduced", () => {
    mockStorage[STORAGE_KEYS.MOTION_MODE] = "reduced";
    const mode = resolveMotionMode({
      storageValue: mockStorage[STORAGE_KEYS.MOTION_MODE],
      prefersReducedMotion: false,
    });
    expect(mode).toBe("reduced");
  });

  it("音效偏好默认开启 enabled，且可正确读取存储的 muted 配置", () => {
    expect(resolveSoundMode(null)).toBe("enabled");
    expect(resolveSoundMode("muted")).toBe("muted");
    expect(resolveSoundMode("enabled")).toBe("enabled");
  });

  it("性能模式默认 high，且可读取配置降级为 eco 节能模式", () => {
    expect(resolvePerformanceMode(null)).toBe("high");
    expect(resolvePerformanceMode("eco")).toBe("eco");
    expect(resolvePerformanceMode("high")).toBe("high");
  });
});

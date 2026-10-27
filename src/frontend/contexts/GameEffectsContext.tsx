import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getGameAudio, type SoundEffectName } from "../utils/gameAudio";

export type MotionMode = "full" | "reduced";
export type SoundMode = "enabled" | "muted";
export type PerformanceMode = "high" | "eco";

export const STORAGE_KEYS = {
  MOTION_MODE: "metacognitive_motion_mode",
  SOUND_MODE: "metacognitive_sound_mode",
  PERF_MODE: "metacognitive_perf_mode",
} as const;

export interface GameEffectsContextType {
  motionMode: MotionMode;
  soundMode: SoundMode;
  performanceMode: PerformanceMode;
  isReducedMotion: boolean;
  isSoundMuted: boolean;
  isEcoMode: boolean;
  setMotionMode: (mode: MotionMode) => void;
  setSoundMode: (mode: SoundMode) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  toggleSound: () => void;
  toggleMotion: () => void;
  playSound: (name: SoundEffectName) => void;
  triggerHaptic: (type?: "light" | "medium" | "heavy") => void;
}

export function resolveMotionMode(opts: {
  storageValue: string | null;
  prefersReducedMotion: boolean;
}): MotionMode {
  if (opts.storageValue === "full" || opts.storageValue === "reduced") {
    return opts.storageValue;
  }
  return opts.prefersReducedMotion ? "reduced" : "full";
}

export function resolveSoundMode(storageValue: string | null): SoundMode {
  if (storageValue === "muted") return "muted";
  return "enabled";
}

export function resolvePerformanceMode(storageValue: string | null): PerformanceMode {
  if (storageValue === "eco") return "eco";
  return "high";
}

const GameEffectsContext = createContext<GameEffectsContextType | null>(null);

export const GameEffectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Motion preference resolution
  const [motionMode, setMotionModeState] = useState<MotionMode>(() => {
    let prefReduced = false;
    let storedVal: string | null = null;
    if (typeof window !== "undefined") {
      try {
        prefReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        storedVal = localStorage.getItem(STORAGE_KEYS.MOTION_MODE);
      } catch {}
    }
    return resolveMotionMode({ storageValue: storedVal, prefersReducedMotion: prefReduced });
  });

  // 2. Sound preference resolution
  const [soundMode, setSoundModeState] = useState<SoundMode>(() => {
    let storedVal: string | null = null;
    if (typeof window !== "undefined") {
      try {
        storedVal = localStorage.getItem(STORAGE_KEYS.SOUND_MODE);
      } catch {}
    }
    return resolveSoundMode(storedVal);
  });

  // 3. Performance preference resolution
  const [performanceMode, setPerformanceModeState] = useState<PerformanceMode>(() => {
    let storedVal: string | null = null;
    if (typeof window !== "undefined") {
      try {
        storedVal = localStorage.getItem(STORAGE_KEYS.PERF_MODE);
      } catch {}
    }
    return resolvePerformanceMode(storedVal);
  });

  // Sync with audio synthesizer whenever soundMode changes
  useEffect(() => {
    const audio = getGameAudio();
    audio.setMuted(soundMode === "muted");
  }, [soundMode]);

  // Listen to OS prefers-reduced-motion changes if user hasn't explicitly set a preference
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => {
      const explicit = localStorage.getItem(STORAGE_KEYS.MOTION_MODE);
      if (!explicit) {
        setMotionModeState(e.matches ? "reduced" : "full");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setMotionMode = useCallback((mode: MotionMode) => {
    setMotionModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.MOTION_MODE, mode);
    } catch {}
  }, []);

  const setSoundMode = useCallback((mode: SoundMode) => {
    setSoundModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND_MODE, mode);
    } catch {}
  }, []);

  const setPerformanceMode = useCallback((mode: PerformanceMode) => {
    setPerformanceModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.PERF_MODE, mode);
    } catch {}
  }, []);

  const toggleSound = useCallback(() => {
    setSoundMode(soundMode === "enabled" ? "muted" : "enabled");
  }, [soundMode, setSoundMode]);

  const toggleMotion = useCallback(() => {
    setMotionMode(motionMode === "full" ? "reduced" : "full");
  }, [motionMode, setMotionMode]);

  const playSound = useCallback(
    (name: SoundEffectName) => {
      if (soundMode === "muted") return;
      getGameAudio().play(name);
    },
    [soundMode]
  );

  const triggerHaptic = useCallback((type: "light" | "medium" | "heavy" = "light") => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        const duration = type === "heavy" ? 35 : type === "medium" ? 20 : 10;
        navigator.vibrate(duration);
      } catch {}
    }
  }, []);

  const value = useMemo(
    () => ({
      motionMode,
      soundMode,
      performanceMode,
      isReducedMotion: motionMode === "reduced",
      isSoundMuted: soundMode === "muted",
      isEcoMode: performanceMode === "eco",
      setMotionMode,
      setSoundMode,
      setPerformanceMode,
      toggleSound,
      toggleMotion,
      playSound,
      triggerHaptic,
    }),
    [
      motionMode,
      soundMode,
      performanceMode,
      setMotionMode,
      setSoundMode,
      setPerformanceMode,
      toggleSound,
      toggleMotion,
      playSound,
      triggerHaptic,
    ]
  );

  return <GameEffectsContext.Provider value={value}>{children}</GameEffectsContext.Provider>;
};

export function useGameEffects(): GameEffectsContextType {
  const ctx = useContext(GameEffectsContext);
  if (!ctx) {
    // Return a safe fallback if used outside provider
    return {
      motionMode: "full",
      soundMode: "enabled",
      performanceMode: "high",
      isReducedMotion: false,
      isSoundMuted: false,
      isEcoMode: false,
      setMotionMode: () => {},
      setSoundMode: () => {},
      setPerformanceMode: () => {},
      toggleSound: () => {},
      toggleMotion: () => {},
      playSound: (name) => getGameAudio().play(name),
      triggerHaptic: () => {},
    };
  }
  return ctx;
}

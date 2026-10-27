/**
 * Web Audio API Procedural Sound Synthesizer
 * Zero external audio assets, zero network latency, pure client-side procedural synthesis.
 */

export type SoundEffectName =
  | "tap"
  | "select"
  | "wager"
  | "hint"
  | "level_up"
  | "level_down"
  | "portal"
  | "settlement_pulse"
  | "report_reveal";

export class GameAudioSynthesizer {
  private ctxFactory: (() => any) | null;
  private ctx: any | null = null;
  private muted: boolean = false;
  private volume: number = 0.5;

  constructor(ctxFactory?: (() => any) | null) {
    if (ctxFactory !== undefined) {
      this.ctxFactory = ctxFactory;
    } else {
      this.ctxFactory = () => {
        if (typeof window !== "undefined") {
          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            return new AudioContextClass();
          }
        }
        return null;
      };
    }
  }

  public isSupported(): boolean {
    if (this.ctx) return true;
    if (!this.ctxFactory) return false;
    try {
      const probe = this.ctxFactory();
      if (probe) {
        this.ctx = probe;
        return true;
      }
    } catch {}
    return false;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  private getContext(): any | null {
    if (this.ctx) return this.ctx;
    if (!this.ctxFactory) return null;
    try {
      this.ctx = this.ctxFactory();
      return this.ctx;
    } catch {
      return null;
    }
  }

  public play(name: SoundEffectName): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === "suspended" && typeof ctx.resume === "function") {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime || 0;
      switch (name) {
        case "tap":
          this.playTap(ctx, now);
          break;
        case "select":
          this.playSelect(ctx, now);
          break;
        case "wager":
          this.playWager(ctx, now);
          break;
        case "hint":
          this.playHint(ctx, now);
          break;
        case "level_up":
          this.playLevelShift(ctx, now, "up");
          break;
        case "level_down":
          this.playLevelShift(ctx, now, "down");
          break;
        case "portal":
          this.playPortal(ctx, now);
          break;
        case "settlement_pulse":
          this.playSettlementPulse(ctx, now);
          break;
        case "report_reveal":
          this.playReportReveal(ctx, now);
          break;
      }
    } catch (e) {
      // Gracefully prevent audio context glitches from breaking UI
      console.warn("GameAudio synthesis warning:", e);
    }
  }

  // Soft tactile pop/click (~50ms)
  private playTap(ctx: any, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);

    const masterVol = 0.15 * this.volume;
    gain.gain.setValueAtTime(masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Crisp crystal resonance for option locking (~100ms)
  private playSelect(ctx: any, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5

    const masterVol = 0.22 * this.volume;
    gain.gain.setValueAtTime(masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Wager mode toggle: Dual resonant energy pulse (~120ms)
  private playWager(ctx: any, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.linearRampToValueAtTime(330, now + 0.06); // E4
    osc.frequency.linearRampToValueAtTime(440, now + 0.12); // A4

    const masterVol = 0.2 * this.volume;
    gain.gain.setValueAtTime(masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Arcane Hint shimmer: Pentatonic arpeggio (~300ms)
  private playHint(ctx: any, now: number): void {
    const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      const noteVol = (0.16 / (idx + 1)) * this.volume;
      gain.gain.setValueAtTime(noteVol, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.18);
    });
  }

  // Adaptive difficulty ladder shift
  private playLevelShift(ctx: any, now: number, dir: "up" | "down"): void {
    const freqs = dir === "up" ? [440, 554.37, 659.25] : [659.25, 554.37, 440];
    freqs.forEach((freq, idx) => {
      const noteTime = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, noteTime);

      const noteVol = 0.18 * this.volume;
      gain.gain.setValueAtTime(noteVol, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.12);
    });
  }

  // Portal leap / Warp tunnel whoosh (~500ms)
  private playPortal(ctx: any, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.45);

    const masterVol = 0.18 * this.volume;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(masterVol, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Settlement deduction pulse (~150ms)
  private playSettlementPulse(ctx: any, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

    const masterVol = 0.2 * this.volume;
    gain.gain.setValueAtTime(masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  // Final Report reveal: Harmonic triumphant celestial chord (~1.2s)
  private playReportReveal(ctx: any, now: number): void {
    const chord = [392.0, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      const noteVol = (0.2 / chord.length) * this.volume;
      const noteTime = now + idx * 0.04;
      gain.gain.setValueAtTime(0.01, noteTime);
      gain.gain.linearRampToValueAtTime(noteVol, noteTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 1.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 1.1);
    });
  }
}

// Global singleton instance
let _globalGameAudio: GameAudioSynthesizer | null = null;
export function getGameAudio(): GameAudioSynthesizer {
  if (!_globalGameAudio) {
    _globalGameAudio = new GameAudioSynthesizer();
  }
  return _globalGameAudio;
}

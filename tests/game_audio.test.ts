import { describe, expect, it, beforeEach, mock } from "bun:test";
import {
  GameAudioSynthesizer,
  getGameAudio,
  type SoundEffectName,
} from "../src/frontend/utils/gameAudio";

describe("Seam 1: Game Audio Synthesizer (Web Audio API)", () => {
  let mockAudioContext: any;
  let createdNodes: {
    oscillators: any[];
    gains: any[];
  };

  beforeEach(() => {
    createdNodes = {
      oscillators: [],
      gains: [],
    };

    mockAudioContext = {
      state: "running",
      currentTime: 100,
      resume: mock(async () => {
        mockAudioContext.state = "running";
      }),
      close: mock(async () => {}),
      createGain: mock(() => {
        const gainNode = {
          gain: {
            value: 1,
            setValueAtTime: mock(() => {}),
            linearRampToValueAtTime: mock(() => {}),
            exponentialRampToValueAtTime: mock(() => {}),
          },
          connect: mock(() => {}),
        };
        createdNodes.gains.push(gainNode);
        return gainNode;
      }),
      createOscillator: mock(() => {
        const oscNode = {
          type: "sine",
          frequency: {
            value: 440,
            setValueAtTime: mock(() => {}),
            exponentialRampToValueAtTime: mock(() => {}),
            linearRampToValueAtTime: mock(() => {}),
          },
          connect: mock(() => {}),
          start: mock(() => {}),
          stop: mock(() => {}),
        };
        createdNodes.oscillators.push(oscNode);
        return oscNode;
      }),
      destination: {},
    };
  });

  it("在无 AudioContext 环境下安全降级不崩溃且不抛出异常", () => {
    const synth = new GameAudioSynthesizer(null);
    expect(synth.isSupported()).toBe(false);
    expect(() => synth.play("tap")).not.toThrow();
    expect(() => synth.play("select")).not.toThrow();
    expect(() => synth.play("portal")).not.toThrow();
  });

  it("静音 (isMuted = true) 时不触发任何振荡器发声", () => {
    const synth = new GameAudioSynthesizer(() => mockAudioContext);
    synth.setMuted(true);
    expect(synth.isMuted()).toBe(true);

    synth.play("tap");
    expect(createdNodes.oscillators.length).toBe(0);
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
  });

  it("开启音效时能为各种交互事件正确创建声学节点包络", () => {
    const synth = new GameAudioSynthesizer(() => mockAudioContext);
    synth.setMuted(false);

    // 1. 轻触音 (tap)
    synth.play("tap");
    expect(createdNodes.oscillators.length).toBeGreaterThan(0);
    expect(createdNodes.gains.length).toBeGreaterThan(0);

    const initialOscCount = createdNodes.oscillators.length;

    // 2. 传送门跃迁音 (portal)
    synth.play("portal");
    expect(createdNodes.oscillators.length).toBeGreaterThan(initialOscCount);

    // 3. 难度跃迁音 (level_up / level_down)
    synth.play("level_up");
    synth.play("level_down");
    expect(createdNodes.oscillators.length).toBeGreaterThan(initialOscCount + 1);

    // 4. 算力推演脉冲音 (settlement_pulse) 与报告揭晓 (report_reveal)
    synth.play("settlement_pulse");
    synth.play("report_reveal");
    expect(createdNodes.oscillators.length).toBeGreaterThan(initialOscCount + 3);
  });

  it("音频上下文处于 suspended 状态时自动触发 resume 唤醒", async () => {
    mockAudioContext.state = "suspended";
    const synth = new GameAudioSynthesizer(() => mockAudioContext);

    synth.play("select");
    expect(mockAudioContext.resume).toHaveBeenCalled();
  });

  it("单例 getGameAudio() 能够维持全局音频实例", () => {
    const audio1 = getGameAudio();
    const audio2 = getGameAudio();
    expect(audio1).toBe(audio2);
    expect(audio1).toBeInstanceOf(GameAudioSynthesizer);
  });
});

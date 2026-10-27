import { describe, expect, it } from "bun:test";
import { StaircaseController } from "../src/backend/staircase";

describe("Leek (2001) 混合加速反转级联阶梯 (Hybrid Accelerated Reversal-Cascaded Staircase)", () => {
  it("预热期首次反转前使用 1:1 (0.18) 盲测冲刺，首次反转后切换为 2:1 并沿 0.12 -> 0.08 -> 0.04 级联衰减，交接正式阶段以 0.04 起步", () => {
    // 构造具有 10 轮预热的阶梯控制器
    const sc = new StaircaseController(0.50, 0.08, 0.05, 0.85, 3, 10, 0.18);

    // 1. 首次反转前：1-up-1-down 盲测冲刺 (步长 0.18)
    expect(sc.currentStepSize).toBe(0.18);
    expect(sc.reversalCount).toBe(0);

    // Trial 1 (correct): 0.50 -> 0.32 (0.50 - 0.18)
    sc.update(true, true);
    expect(sc.getCurrentDelta()).toBeCloseTo(0.32, 4);
    expect(sc.reversalCount).toBe(0);
    expect(sc.currentStepSize).toBe(0.18);

    // Trial 2 (correct): 0.32 -> 0.14 (0.32 - 0.18)
    sc.update(true, true);
    expect(sc.getCurrentDelta()).toBeCloseTo(0.14, 4);
    expect(sc.reversalCount).toBe(0);
    expect(sc.currentStepSize).toBe(0.18);

    // Trial 3 (wrong): 触壁反转！由 -1 翻转为 +1
    // 本次 trial 结束时完成第 1 次反转，步长在下一次开始应用 0.12
    sc.update(false, true);
    expect(sc.reversalCount).toBe(1);
    expect(sc.getCurrentDelta()).toBeCloseTo(0.32, 4); // 0.14 + 0.18

    // 2. 首次反转后：永久切换为 2-up-1-down，步长变为 0.12
    // Trial 4 (correct): 2-up 单次答对不应改变难度！
    sc.update(true, true);
    expect(sc.getCurrentDelta()).toBeCloseTo(0.32, 4);
    expect(sc.currentStepSize).toBeCloseTo(0.12, 4);

    // Trial 5 (correct): 连续第 2 次答对，触发变难 (减 0.12: 0.32 -> 0.20)
    // 方向由 +1 翻转为 -1，触发第 2 次反转！
    sc.update(true, true);
    expect(sc.getCurrentDelta()).toBeCloseTo(0.20, 4);
    expect(sc.reversalCount).toBe(2);

    // 3. 第 2 次反转后：步长自动衰减为 0.08
    // Trial 6 (wrong): 答错 1 次立即降难 (加 0.08: 0.20 -> 0.28)
    // 方向由 -1 翻转为 +1，触发第 3 次反转！
    sc.update(false, true);
    expect(sc.getCurrentDelta()).toBeCloseTo(0.28, 4);
    expect(sc.reversalCount).toBe(3);

    // 4. 第 3 次反转后：步长自动衰减为 0.04
    // Trial 7 (correct): 2-up 单次答对不改变难度
    sc.update(true, true);
    expect(sc.getCurrentDelta()).toBeCloseTo(0.28, 4);
    expect(sc.currentStepSize).toBe(0.04);

    // Trial 8 (correct): 连对 2 次触发变难 (减 0.04: 0.28 -> 0.24)
    sc.update(true, true);
    expect(sc.getCurrentDelta()).toBeCloseTo(0.24, 4);

    // Trial 9 (wrong): 答错 1 次加 0.04 (0.24 -> 0.28)
    sc.update(false, true);
    expect(sc.getCurrentDelta()).toBeCloseTo(0.28, 4);

    // Trial 10 (预热末题): 答对单次
    const t10Delta = sc.update(true, true);
    expect(sc.warmupHandoffDone).toBe(true);

    // 5. 验证质心平滑交接：
    // 正式阶段起始难度为质心，且正式阶段直接运行在 0.04 最精细步长！
    expect(sc.currentStepSize).toBe(0.04);
    expect(sc.consecutiveCorrect).toBe(0);
    expect(sc.lastDirection).toBe(0);

    // Trial 11 进入正式阶段：直接以 0.04 微调
    // 单次答对不改变
    const t11Delta = sc.update(true, false);
    expect(t11Delta).toBe(t10Delta);
    expect(sc.currentStepSize).toBe(0.04);

    // 连续第 2 次答对触发减 0.04
    const t12Delta = sc.update(true, false);
    expect(t12Delta).toBeCloseTo(t10Delta - 0.04, 4);
    expect(sc.currentStepSize).toBe(0.04);
  });
});

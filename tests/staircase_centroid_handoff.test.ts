import { describe, expect, it } from "bun:test";
import { StaircaseController } from "../src/backend/staircase";

describe("Plan A: Reversal Centroid Handoff (预热反转质心平滑交接)", () => {
  it("预热结束时自动根据预热期有效反转点重置正式阶段起始难度，消除末题跳跃噪声", () => {
    // 构造 10 题预热的阶梯控制器
    const sc = new StaircaseController(0.50, 0.08, 0.05, 0.85, 3, 10, 0.18);

    // 模拟一段前 10 题发生多次反转的响应流
    // Trial 1 (wrong):  0.50 + 0.18 = 0.68
    // Trial 2 (wrong):  0.68 + 0.18 = 0.85 (cap)
    // Trial 3 (correct): 0.85 - 0.18 = 0.67 (Reversal 1 @ 0.85)
    // Trial 4 (correct): 0.67 - 0.18 = 0.49
    // Trial 5 (wrong):  0.49 + 0.18 = 0.67 (Reversal 2 @ 0.49)
    // Trial 6 (correct): 0.67 - 0.18 = 0.49 (Reversal 3 @ 0.67)
    // Trial 7 (wrong):  0.49 + 0.18 = 0.67 (Reversal 4 @ 0.49)
    // Trial 8 (correct): 0.67 - 0.18 = 0.49 (Reversal 5 @ 0.67)
    // Trial 9 (wrong):  0.49 + 0.18 = 0.67 (Reversal 6 @ 0.49)
    // Trial 10 (wrong - 偶然末题再错，瞬间冲向 0.85): 0.67 + 0.18 = 0.85
    const responses = [false, false, true, true, false, true, false, true, false, false];

    let t10Delta = 0;
    for (let i = 0; i < responses.length; i++) {
      t10Delta = sc.update(responses[i], true);
    }

    // 第 10 题结束时，如果没有质心平滑，Delta 会直接被末尾连续答错拉到 0.85
    // 但在方案 A 质心重置下，剥离早期前 2 次冲刺反转 (0.85, 0.49)，后续反转在 [0.67, 0.49, 0.67, 0.49]
    // 均值应收敛在 ~0.58 附近，而非被绑架在 0.85
    expect(t10Delta).toBeLessThan(0.80);
    expect(t10Delta).toBeGreaterThanOrEqual(0.50);
    expect(sc.warmupHandoffDone).toBe(true);

    // 验证状态机干净交接：方向惯性与连胜计数彻底归零
    expect(sc.lastDirection).toBe(0);
    expect(sc.consecutiveCorrect).toBe(0);

    // Trial 11 进入正式阶段 (Levitt 2-up-1-down, formalStepSize = 0.08)
    // 单次答对不改变难度
    const t11Delta = sc.update(true, false);
    expect(t11Delta).toBe(t10Delta);

    // 连续第 2 次答对，触发变难 (减 0.08)
    const t12Delta = sc.update(true, false);
    expect(t12Delta).toBeCloseTo(t10Delta - 0.08, 4);
  });

  it("当预热期反转过少 (< 2 次，如极端模型单向饱和撞顶) 时，安全保底沿用当前难度", () => {
    // 连续全对冲顶
    const sc = new StaircaseController(0.50, 0.08, 0.05, 0.85, 3, 5, 0.18);
    for (let i = 0; i < 5; i++) {
      sc.update(true, true);
    }
    // 连续 5 次答对直接冲到 0.05 下界，没有反转
    expect(sc.getCurrentDelta()).toBe(0.05);
    expect(sc.warmupHandoffDone).toBe(true);
  });
});

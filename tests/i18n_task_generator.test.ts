import { describe, expect, it } from "bun:test";
import { TaskGenerator } from "../src/backend/task_generator";
import { runWithLocale } from "../src/i18n";

describe("Seam 2: TaskGenerator PRNG Seed Invariance & Bilingual Generation", () => {
  it("相同 seed 下，60 轮试次的数学谜题、4个选项、正确答案与难度完全绝对一致 (Cross-Lingual Determinism)", () => {
    const seed = 987654;
    const genZH = new TaskGenerator(seed);
    const genEN = new TaskGenerator(seed);

    for (let trial = 1; trial <= 60; trial++) {
      const delta = 0.50 + 0.30 * Math.sin(trial);

      const taskZH = runWithLocale("zh-CN", () => genZH.generate(trial, delta));
      const taskEN = runWithLocale("en-US", () => genEN.generate(trial, delta));

      expect(taskZH.stimulus_id).toBe(taskEN.stimulus_id);
      expect(taskZH.correct_option).toBe(taskEN.correct_option);
      expect(taskZH.difficulty_level).toBe(taskEN.difficulty_level);
      expect(taskZH.signal_type).toBe(taskEN.signal_type);
      expect(taskZH.options).toEqual(taskEN.options);

      // 中文 Prompt 与 英文 Prompt 均非空且有差异（通过 runWithLocale 或 payload 获取对应语言）
      const promptZH = runWithLocale("zh-CN", () => taskZH.prompt);
      const promptEN = runWithLocale("en-US", () => taskEN.prompt);
      expect(promptZH.length).toBeGreaterThan(10);
      expect(promptEN.length).toBeGreaterThan(10);
      expect(promptZH).not.toBe(promptEN);

      // 线索也成功双语化且正确包含排除项
      const payloadZH = taskZH.toSafePayload(2, "zh-CN");
      const payloadEN = taskZH.toSafePayload(2, "en-US");
      expect(payloadZH.unlocked_hints?.tier1).toContain("宏观");
      expect(payloadEN.unlocked_hints?.tier1).toContain("Macro");
    }
  });

  it("支持在同一个试次实例上中途动态切换语言 (Mid-Trial Language Switching)", () => {
    const gen = new TaskGenerator(42);
    const task = gen.generate(1, 0.45);

    // 1. 默认或 zh-CN 状态
    const payloadZH = task.toSafePayload(2, "zh-CN");
    expect(payloadZH.prompt).toMatch(/[\u4e00-\u9fa5]/);
    expect(payloadZH.unlocked_hints?.tier1).toContain("宏观规律方向");

    // 2. 切为 en-US 状态
    const payloadEN = task.toSafePayload(2, "en-US");
    expect(payloadEN.prompt).toMatch(/[A-Za-z]/);
    expect(payloadEN.unlocked_hints?.tier1).toContain("Macro Direction");

    // 3. 验证选项和题目主体数据绝对一致
    expect(payloadZH.options).toEqual(payloadEN.options);
    expect(payloadZH.stimulus_id).toBe(payloadEN.stimulus_id);
  });

  it("覆盖全部 8 大认知范式，均能输出合法的英文题干与线索", () => {
    const gen = new TaskGenerator(2026);
    // 8 轮覆盖 8 大范式
    for (let trial = 1; trial <= 8; trial++) {
      runWithLocale("en-US", () => {
        const task = gen.generate(trial, 0.5);
        expect(task.prompt).toBeDefined();
        expect(task.prompt).toMatch(/[A-Za-z]/);
        expect(task.hint_tier1).toBeDefined();
        expect(task.hint_tier1).toContain("Macro");
        expect(task.hint_tier2).toBeDefined();
        expect(task.hint_tier2).toContain("Micro");
      });
    }
  });
});

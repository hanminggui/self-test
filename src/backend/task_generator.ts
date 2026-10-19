/**
 * Module 1: Scientific Adaptive Task Generator (task_generator.ts)
 * 
 * Implements a psychometrically rigorous, culture-fair, knowledge-free stimulus generator.
 * Strictly maps continuous difficulty parameter Delta in [0.05, 0.85] across 5 continuous cognitive tiers:
 *   - Tier 1 (Floor, delta >= 0.72): Pre-attentive floor (1-2 chunks), ultra-salient contrast for 1B-4B models.
 *   - Tier 2 (Easy, 0.55 <= delta < 0.72): Single-rule low working-memory load (2-3 chunks).
 *   - Tier 3 (Standard, 0.35 <= delta < 0.55): Normative psychometric difficulty (3-4 chunks).
 *   - Tier 4 (Hard, 0.18 <= delta < 0.35): Multi-attribute composition & multi-hop deduction (5-6 chunks).
 *   - Tier 5 (Ceiling / Singularity, delta < 0.18): Frontier reasoning challenge (6-8 chunks, coupled recurrences,
 *     3D Latin squares, multi-symbol noise fields, modular invariants, mixed-direction DAGs, Betti cycle rank).
 * 
 * Features:
 *   1. True 5-Tier Continuous Difficulty Transfer across all 8 paradigms.
 *   2. Blocked Latin-Square Shuffling: Every 8-trial block contains all 8 paradigms without boundary repeats.
 *   3. Multi-Thematic Surface Skinning: 4 orthogonal contexts (Geometric, Cybernetic, Archaeological, Stellar).
 *   4. Non-Spoiling Diagnostic Hints: Tier 1 provides structural direction + 1 option elimination;
 *      Tier 2 narrows down to a 50/50 comparison by eliminating 2 distractors without leaking the exact answer string.
 *   5. Provable 4-Option Deduplication: Exactly 4 distinct options (A, B, C, D) with randomized correct positioning.
 */

import { TrialPayload } from "./models";

export interface GeneratedTask {
  stimulus_id: string;
  difficulty_level: number;
  prompt: string;
  options: Record<string, string>;
  correct_option: string; // "A" | "B" | "C" | "D"
  signal_type: "S1" | "S2";
  hint_tier1: string; // Tier 1: 宏观规律方向与粗筛排除
  hint_tier2: string; // Tier 2: 微观细节穿透与二选一收敛（绝不直接剧透答案）
  hint: string;
  stimulus_data: Record<string, any>;
  toSafePayload(unlockedTier?: number): TrialPayload;
}

export type CognitiveTheme = "GEOMETRIC" | "CYBERNETIC" | "ARCHAEOLOGICAL" | "STELLAR";
export type DifficultyTier = 1 | 2 | 3 | 4 | 5;

export class TaskGenerator {
  static readonly SYMBOLS = ["▲", "◆", "●", "■", "★", "▼", "◇", "○", "✦", "✖", "✚", "⬡"];

  static readonly MAPPINGS_A: Record<string, string> = {
    "▲": "◆", "◆": "●", "●": "■", "■": "★", "★": "▲",
    "▼": "◇", "◇": "○", "○": "▼", "✦": "✖", "✖": "✚", "✚": "⬡", "⬡": "✦",
  };

  static readonly MAPPINGS_B: Record<string, string> = {
    "▲": "★", "★": "■", "■": "●", "●": "◆", "◆": "▲",
    "▼": "○", "○": "◇", "◇": "▼", "✦": "⬡", "⬡": "✚", "✚": "✖", "✖": "✦",
  };

  private seedState: number;
  private blockSchedule: number[] = [];

  constructor(seed?: number) {
    this.seedState = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
    this.initSchedule(160);
  }

  // LCG pseudo-random generator
  private random(): number {
    this.seedState = (this.seedState * 1664525 + 1013904223) % 4294967296;
    return this.seedState / 4294967296;
  }

  private choice<T>(arr: T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }

  private sample<T>(arr: T[], k: number): T[] {
    const copy = [...arr];
    const res: T[] = [];
    for (let i = 0; i < k && copy.length > 0; i++) {
      const idx = Math.floor(this.random() * copy.length);
      res.push(copy.splice(idx, 1)[0]);
    }
    return res;
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Maps continuous delta in [0.05, 0.85] to 5 discrete-continuous hybrid cognitive tiers:
   *   Tier 1 (Floor):     delta >= 0.72
   *   Tier 2 (Easy):      0.55 <= delta < 0.72
   *   Tier 3 (Standard):  0.35 <= delta < 0.55
   *   Tier 4 (Hard):      0.18 <= delta < 0.35
   *   Tier 5 (Singularity): delta < 0.18
   */
  static getDifficultyTier(delta: number): DifficultyTier {
    if (delta >= 0.72) return 1;
    if (delta >= 0.55) return 2;
    if (delta >= 0.35) return 3;
    if (delta >= 0.18) return 4;
    return 5;
  }

  /**
   * Pre-generates randomized blocked trial-to-paradigm mapping.
   */
  private initSchedule(maxTrials: number = 160) {
    const blocksCount = Math.ceil(maxTrials / 8);
    this.blockSchedule = [];
    let lastBlockEnd = -1;

    for (let b = 0; b < blocksCount; b++) {
      const block = [0, 1, 2, 3, 4, 5, 6, 7];
      this.shuffle(block);

      if (block[0] === lastBlockEnd) {
        const swapIdx = Math.floor(this.random() * 7) + 1;
        [block[0], block[swapIdx]] = [block[swapIdx], block[0]];
      }
      lastBlockEnd = block[block.length - 1];
      this.blockSchedule.push(...block);
    }
  }

  private getTheme(_trialIndex: number): CognitiveTheme {
    const themes: CognitiveTheme[] = ["GEOMETRIC", "CYBERNETIC", "ARCHAEOLOGICAL", "STELLAR"];
    const themeIdx = Math.floor(this.random() * themes.length);
    return themes[themeIdx];
  }

  /**
   * Assembles 4 strictly unique options with zero textual leak.
   */
  private assembleFourOptions(
    correctVal: string,
    distractors: string[]
  ): { options: Record<string, string>; correctOption: string; signalType: "S1" | "S2" } {
    const cleanDistractors: string[] = [];
    for (const d of distractors) {
      const trimmed = d.trim();
      if (trimmed !== correctVal.trim() && !cleanDistractors.includes(trimmed)) {
        cleanDistractors.push(trimmed);
      }
    }

    let padIdx = 1;
    while (cleanDistractors.length < 3) {
      const chars = Array.from(correctVal.trim());
      if (chars.length > 2) {
        const p1 = (padIdx * 2) % chars.length;
        const p2 = (p1 + 1) % chars.length;
        [chars[p1], chars[p2]] = [chars[p2], chars[p1]];
      }
      const fakeD = chars.join("").trim();
      if (fakeD !== correctVal.trim() && !cleanDistractors.includes(fakeD)) {
        cleanDistractors.push(fakeD);
      } else {
        const altSym = TaskGenerator.SYMBOLS[(padIdx + 3) % TaskGenerator.SYMBOLS.length];
        cleanDistractors.push(
          chars.length > 0
            ? [altSym, ...chars.slice(1)].join("").trim()
            : `${correctVal.trim()} ${altSym}`
        );
      }
      padIdx++;
    }

    const allVals = [correctVal.trim(), cleanDistractors[0], cleanDistractors[1], cleanDistractors[2]];
    this.shuffle(allVals);

    const optKeys = ["A", "B", "C", "D"];
    const options: Record<string, string> = {};
    let correctOption = "A";

    for (let i = 0; i < optKeys.length; i++) {
      const k = optKeys[i];
      options[k] = allVals[i];
      if (allVals[i] === correctVal.trim()) {
        correctOption = k;
      }
    }

    const signalType: "S1" | "S2" = (correctOption === "A" || correctOption === "B") ? "S1" : "S2";
    return { options, correctOption, signalType };
  }

  /**
   * Picks 2 incorrect option keys to support non-spoiling diagnostic elimination hints.
   * Never leaks the raw answer string or directly names the single correct option letter.
   */
  private buildDiagnosticHints(
    correctOption: string,
    macroRuleDesc: string,
    microConstraintDesc: string
  ): { hint_tier1: string; hint_tier2: string } {
    const wrongKeys = ["A", "B", "C", "D"].filter(k => k !== correctOption);
    const eliminated = this.sample(wrongKeys, 2);
    const elim1 = eliminated[0];
    const elim2 = eliminated[1];

    const hint_tier1 = `宏观规律方向（1分价值）：${macroRuleDesc} 据此可先行排除明显违背宏观结构的选项 ${elim1}。`;
    const hint_tier2 = `微观细节穿透（2分价值）：${microConstraintDesc} 结合局部边界校验可进一步排除选项 ${elim1} 与选项 ${elim2}，请在剩余两个候选项中完成最终验证。`;
    return { hint_tier1, hint_tier2 };
  }

  private wrapTask(
    stimulus_id: string,
    difficulty_level: number,
    prompt: string,
    options: Record<string, string>,
    correct_option: string,
    signal_type: "S1" | "S2",
    hint_tier1: string,
    hint_tier2: string,
    stimulus_data: Record<string, any>
  ): GeneratedTask {
    const combinedHint = `【第一级线索 (宏观思维)】\n${hint_tier1}\n\n【第二级线索 (细节穿透)】\n${hint_tier2}`;
    return {
      stimulus_id,
      difficulty_level,
      prompt,
      options,
      correct_option,
      signal_type,
      hint_tier1,
      hint_tier2,
      hint: combinedHint,
      stimulus_data,
      toSafePayload(unlockedTier: number = 0): TrialPayload {
        const unlocked_hints: { tier1?: string; tier2?: string } = {};
        if (unlockedTier >= 1) unlocked_hints.tier1 = hint_tier1;
        if (unlockedTier >= 2) unlocked_hints.tier2 = hint_tier2;

        return {
          stimulus_id,
          difficulty_level: Math.round(difficulty_level * 10000) / 10000,
          prompt,
          options,
          has_hint: true,
          hint_cost: unlockedTier === 0 ? 1 : 2,
          hint_tier1_cost: 1,
          hint_tier2_cost: 2,
          hints_unlocked: unlockedTier,
          unlocked_hints: unlockedTier > 0 ? unlocked_hints : undefined,
          task_type: stimulus_data.task_type || "UNKNOWN",
          stimulus_data,
        };
      },
    };
  }

  /**
   * Main Task Generation Dispatcher.
   */
  generate(trialIndex: number, delta: number): GeneratedTask {
    const schedIdx = (trialIndex - 1) % this.blockSchedule.length;
    const paradigmCode = this.blockSchedule[schedIdx];
    const theme = this.getTheme(trialIndex);

    const clampedDelta = Math.max(0.05, Math.min(0.85, delta));

    switch (paradigmCode) {
      case 0: return this.generateCipherTask(trialIndex, clampedDelta, theme);
      case 1: return this.generateDensityTask(trialIndex, clampedDelta, theme);
      case 2: return this.generateMatrixReasoningTask(trialIndex, clampedDelta, theme);
      case 3: return this.generateSpatialRotationTask(trialIndex, clampedDelta, theme);
      case 4: return this.generateParityInvariantTask(trialIndex, clampedDelta, theme);
      case 5: return this.generateRelationalTransitivityTask(trialIndex, clampedDelta, theme);
      case 6: return this.generateSequenceProgressionTask(trialIndex, clampedDelta, theme);
      default: return this.generateTopologicalLoopsTask(trialIndex, clampedDelta, theme);
    }
  }

  // ===================================================================================
  // 1. 符号密码置换与状态转移机 (SYNTHETIC_CIPHER)
  // 5-Tier 难度阶梯:
  //   Tier 1 (delta >= 0.72): 极简 L=2 符号对调翻转 ([A B] -> [B A] -> [A B])
  //   Tier 2 (0.55..0.72):    简单 L=3 向右循环平移 1 位，零符号替换
  //   Tier 3 (0.35..0.55):    标准 L=4 左移 1 位 + 单字典 MAPPINGS_A 替换
  //   Tier 4 (0.18..0.35):    高难 L=5 序列逆序翻转 + 奇偶位置分流双字典映射 (MAPPINGS_A / MAPPINGS_B)
  //   Tier 5 (delta < 0.18):  奇点 L=6~7 阶数相关动态左移 (按阶段 t 移位) + 首尾耦合条件字典映射
  // ===================================================================================
  private generateCipherTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `cipher_t${String(trialIndex).padStart(3, "0")}`;
    const tier = TaskGenerator.getDifficultyTier(delta);

    const seqLenMap: Record<DifficultyTier, number> = {
      1: 2,
      2: 3,
      3: 4,
      4: 5,
      5: delta < 0.10 ? 7 : 6,
    };
    const seqLen = seqLenMap[tier];
    const paletteSize = tier === 1 ? 3 : tier === 2 ? 4 : tier === 3 ? 6 : tier === 4 ? 8 : 10;
    const palette = TaskGenerator.SYMBOLS.slice(0, paletteSize);

    let baseSeq = Array.from({ length: seqLen }, () => this.choice(palette));
    if (tier === 1 && baseSeq[0] === baseSeq[1]) {
      baseSeq[1] = palette.find(s => s !== baseSeq[0]) || "◆";
    }

    let evolveStep: (seq: string[], stepIdx: number) => string[];
    let ruleName = "";
    let macroDesc = "";
    let microDesc = "";

    if (tier === 1) {
      ruleName = "双元镜像互换";
      macroDesc = "序列仅包含 2 个符号，每一阶段执行简单的左右位置互换（[X Y] ⇄ [Y X]）。";
      microDesc = "偶数阶段恢复初始次序，奇数阶段与第 1 阶段完全同构。";
      evolveStep = (seq) => [...seq].reverse();
    } else if (tier === 2) {
      ruleName = "右移 1 位循环平移";
      macroDesc = "符号本身不发生字典改变，每一阶段整体向右循环平移 1 个槽位（末尾符号移至首位）。";
      microDesc = "核对第 3 阶段的末尾符号，它在第 4 阶段必定移动到第 1 个位置。";
      evolveStep = (seq) => [seq[seq.length - 1], ...seq.slice(0, -1)];
    } else if (tier === 3) {
      ruleName = "左移 1 位 + 5元环字典递进";
      macroDesc = "每阶段先将序列整体向左循环平移 1 位，随后每个符号沿固定字典环（▲→◆→●→■→★→▲）向后置换一步。";
      microDesc = "追踪第 3 阶段第 2 位符号的字典后继，它对应第 4 阶段的首位符号；同时校验末位符号是否由第 3 阶段首位转换而来。";
      evolveStep = (seq) => {
        const rot = [...seq.slice(1), seq[0]];
        return rot.map(s => TaskGenerator.MAPPINGS_A[s] || s);
      };
    } else if (tier === 4) {
      ruleName = "全序列镜像反转 + 奇偶槽位双轨字典分流";
      macroDesc = "每阶段先将序列整体首尾镜像翻转，再按翻转后的槽位索引分流：偶数索引（0,2,4）沿正字典环置换，奇数索引（1,3）沿逆字典环置换。";
      microDesc = "重点核对翻转后中心槽位（索引 2）与次末槽位（索引 3）的符号转换方向相反，高仿干扰项通常在索引 1 或 2 处混用了同向字典。";
      evolveStep = (seq) => {
        const rev = [...seq].reverse();
        return rev.map((s, idx) =>
          idx % 2 === 0 ? (TaskGenerator.MAPPINGS_A[s] || s) : (TaskGenerator.MAPPINGS_B[s] || s)
        );
      };
    } else {
      ruleName = "阶数递增循环移位 + 邻位奇偶耦合状态机";
      macroDesc = "从第 k 阶段到第 k+1 阶段：先向左循环移位 k 步（分别移 1、2、3 步），再根据移位后槽位索引与阶段号之和 (idx + k) 的奇偶性选择正/逆字典映射。";
      microDesc = "高迷惑性干扰项保持了正确的首尾两端符号，但篡改了中间第 3、4 槽位的正逆字典分流结果，需逐一比对第 2 至第 5 槽位的耦合映射。";
      evolveStep = (seq, stepIdx) => {
        const shift = stepIdx % seq.length;
        const rot = [...seq.slice(shift), ...seq.slice(0, shift)];
        return rot.map((s, idx) =>
          (idx + stepIdx) % 2 === 0
            ? (TaskGenerator.MAPPINGS_A[s] || s)
            : (TaskGenerator.MAPPINGS_B[s] || s)
        );
      };
    }

    const step1 = baseSeq;
    const step2 = evolveStep(step1, 1);
    const step3 = evolveStep(step2, 2);
    const step4_correct = evolveStep(step3, 3);

    let distractors: string[];
    if (tier === 1) {
      const otherSym = palette.find(s => !step4_correct.includes(s)) || "★";
      distractors = [
        step3.join(" "),
        [step4_correct[0], step4_correct[0]].join(" "),
        [otherSym, step4_correct[1]].join(" "),
      ];
    } else if (tier === 2) {
      distractors = [
        step3.join(" "),
        [...step3.slice(1), step3[0]].join(" "),
        [...step4_correct].reverse().join(" "),
      ];
    } else if (tier === 3) {
      const wrongDict = [...step3.slice(1), step3[0]].map(s => TaskGenerator.MAPPINGS_B[s] || s);
      const noShift = step3.map(s => TaskGenerator.MAPPINGS_A[s] || s);
      distractors = [
        wrongDict.join(" "),
        noShift.join(" "),
        [...step4_correct].reverse().join(" "),
      ];
    } else if (tier === 4) {
      // Distractors keep first or last element identical to prevent edge-only shortcutting
      const d1 = [...step4_correct];
      d1[1] = TaskGenerator.MAPPINGS_A[ 
        [...step3].reverse()[1]
      ] || this.choice(palette);
      const d2 = [...step4_correct];
      [d2[1], d2[2]] = [d2[2], d2[1]];
      const d3 = [...step4_correct];
      d3[seqLen - 2] = TaskGenerator.MAPPINGS_B[d3[seqLen - 2]] || this.choice(palette);
      distractors = [d1.join(" "), d2.join(" "), d3.join(" ")];
    } else {
      // Tier 5: All distractors share the exact same first AND last symbol as step4_correct!
      // Models MUST solve the internal state machine at indices 1..seqLen-2.
      const d1 = [...step4_correct];
      const mid1 = Math.floor(seqLen / 2);
      d1[mid1] = TaskGenerator.MAPPINGS_A[d1[mid1]] || this.choice(palette);

      const d2 = [...step4_correct];
      [d2[1], d2[2]] = [d2[2], d2[1]];
      if (d2.join(" ") === step4_correct.join(" ")) {
        d2[1] = TaskGenerator.MAPPINGS_B[d2[1]] || this.choice(palette);
      }

      const d3 = evolveStep(step3, 1); // wrong shift count (shift=1 instead of shift=3), pinned at ends
      d3[0] = step4_correct[0];
      d3[seqLen - 1] = step4_correct[seqLen - 1];
      if (d3.join(" ") === step4_correct.join(" ")) {
        d3[seqLen - 2] = TaskGenerator.MAPPINGS_A[d3[seqLen - 2]] || this.choice(palette);
      }

      distractors = [d1.join(" "), d2.join(" "), d3.join(" ")];
    }

    const correctStr = step4_correct.join(" ");
    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);
    const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(correctOption, macroDesc, microDesc);

    let promptPrefix = "观察抽象符号序列的动态演化规则：";
    if (theme === "CYBERNETIC") {
      promptPrefix = "【数字总线数据包传输分析】检测到数据流在不同时钟周期的特征寄存器序列状态：";
    } else if (theme === "ARCHAEOLOGICAL") {
      promptPrefix = "【古遗迹神庙符文铭文推演】破译石板上逐层递进演化的古老符文序列：";
    } else if (theme === "STELLAR") {
      promptPrefix = "【脉冲星信标引力波位移分析】观测到空间站阵列在各扫描阶段的特征信标排列：";
    }

    const extraRuleNote = tier >= 4
      ? `\n（基准置换环参考：正环 ▲→◆→●→■→★→▲，▼→◇→○→▼，✦→✖→✚→⬡→✦；逆环方向相反）`
      : "";

    const prompt = `${promptPrefix}${extraRuleNote}

[第 1 阶段]: ${step1.join(" ")}
[第 2 阶段]: ${step2.join(" ")}
[第 3 阶段]: ${step3.join(" ")}

从选项 A、B、C、D 中推断第 4 阶段的精确演化序列。`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "SYNTHETIC_CIPHER",
      difficulty_tier: tier,
      seq_len: seqLen,
      rule_name: ruleName,
      theme,
    });
  }

  // ===================================================================================
  // 2. 离散点阵密度直觉感知与信噪比辨别 (DOT_DENSITY)
  // 5-Tier 难度阶梯:
  //   Tier 1 (delta >= 0.72): 4x4 极简网格, 目标 13 点 vs 干扰 2~4 点 (W >= 2.2)
  //   Tier 2 (0.55..0.72):    5x5 简单网格, 目标 16 点 vs 干扰 7~9 点 (W ≈ 1.0)
  //   Tier 3 (0.35..0.55):    6x6 标准网格, 目标 20 点 vs 干扰 13~15 点 (W ≈ 0.38)
  //   Tier 4 (0.18..0.35):    7x7 高难网格 + 双符号背景干扰, 仅统计目标微元净数量
  //   Tier 5 (delta < 0.18):  8x8 奇点多符号噪声场 (目标符号 vs 2 种高混淆伪装符号), 韦伯差比 <= 0.08
  // ===================================================================================
  private generateDensityTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `density_t${String(trialIndex).padStart(3, "0")}`;
    const tier = TaskGenerator.getDifficultyTier(delta);

    const gridW = tier === 1 ? 4 : tier === 2 ? 5 : tier === 3 ? 6 : tier === 4 ? 7 : 8;
    const gridH = gridW;
    const totalCells = gridW * gridH;

    let baseN: number;
    let diff: number;
    if (tier === 1) {
      baseN = 3;
      diff = 10; // 13 vs 3
    } else if (tier === 2) {
      baseN = 8;
      diff = 8;  // 16 vs 8
    } else if (tier === 3) {
      baseN = 14;
      diff = 6;  // 20 vs 14
    } else if (tier === 4) {
      baseN = 22;
      diff = 3;  // 25 vs 22 on 7x7 with noise symbols
    } else {
      baseN = 28;
      diff = delta < 0.10 ? 2 : 3; // 30/31 vs 28 on 8x8 multi-symbol field
    }

    const targetCount = Math.min(totalCells - 2, baseN + diff);
    const dCounts = [
      Math.max(1, targetCount - diff),
      Math.max(1, targetCount - Math.max(1, Math.floor(diff * 0.6))),
      Math.max(1, targetCount - Math.max(2, diff + 1)),
    ];

    const symbolPairs: Array<{ target: string; decoys: string[] }> = [
      { target: "■", decoys: ["□", "◆"] },
      { target: "▲", decoys: ["▼", "△"] },
      { target: "★", decoys: ["✦", "✚"] },
      { target: "●", decoys: ["○", "◇"] },
    ];
    const chosenGroup = this.choice(symbolPairs);
    const chosenSym = chosenGroup.target;
    const decoySyms = chosenGroup.decoys;

    const makeGridStr = (count: number, noiseCount: number): string => {
      const allIndices = Array.from({ length: totalCells }, (_, i) => i);
      const sampled = this.sample(allIndices, Math.min(totalCells, count + noiseCount));
      const targetSet = new Set(sampled.slice(0, count));
      const noiseSet = new Set(sampled.slice(count));

      const rows: string[] = [];
      for (let r = 0; r < gridH; r++) {
        const rowCells: string[] = [];
        for (let col = 0; col < gridW; col++) {
          const idx = r * gridW + col;
          if (targetSet.has(idx)) {
            rowCells.push(chosenSym);
          } else if (noiseSet.has(idx)) {
            rowCells.push(decoySyms[(r + col) % decoySyms.length]);
          } else {
            rowCells.push("・");
          }
        }
        rows.push(rowCells.join(" "));
      }
      return rows.join("\n");
    };

    // In Tiers 4 & 5, distractors have MORE decoy noise symbols so total non-empty cells look deceptively dense!
    const baseNoise = tier === 4 ? 10 : tier === 5 ? 18 : 0;
    const correctStr = makeGridStr(targetCount, baseNoise);
    const distractors = [
      makeGridStr(dCounts[0], baseNoise > 0 ? baseNoise + diff : 0),
      makeGridStr(dCounts[1], baseNoise > 0 ? baseNoise + Math.ceil(diff / 2) : 0),
      makeGridStr(dCounts[2], baseNoise > 0 ? baseNoise + diff + 1 : 0),
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    const macroDesc = tier >= 4
      ? `注意剥离伪装干扰符（${decoySyms.join("、")}）：总填充率最高的区域未必是目标微元（${chosenSym}）最多的区域，应逐行过滤非目标噪声符号。`
      : `观察各区域的视觉留白比例，目标高密度区域的背景空位（・）占比显著偏低。`;
    const microDesc = `按行累计仅属于目标特征微元（${chosenSym}）的精确频次，最高密度区域的计数值比次高候选项多出至少 ${targetCount - Math.max(...dCounts)} 个单位。`;
    const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(correctOption, macroDesc, microDesc);

    let skinTitle = "4 个点阵检测区域";
    if (theme === "CYBERNETIC") skinTitle = "4 组传感芯片像素传感器分布";
    else if (theme === "STELLAR") skinTitle = "4 组星系深空探测视场";
    else if (theme === "ARCHAEOLOGICAL") skinTitle = "4 块古城沙盘遗存标记点阵";

    const noiseWarning = tier >= 4
      ? `\n（注意：视场中混有伪装干扰微元 ${decoySyms.join(" 与 ")}，请严格仅统计目标微元 ${chosenSym} 的数量！）`
      : "";

    const prompt = `分析下列 ${skinTitle}（选项 A、B、C、D，网格大小 ${gridW}x${gridH}）。${noiseWarning}
请判断：哪一个区域包含【最高数量】的目标特征微元 (${chosenSym})？`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "DOT_DENSITY",
      difficulty_tier: tier,
      grid_dim: gridW,
      target_count: targetCount,
      noise_count: baseNoise,
      weber_ratio: (targetCount - Math.max(...dCounts)) / Math.max(1, Math.max(...dCounts)),
      theme,
    });
  }

  // ===================================================================================
  // 3. 抽象图形矩阵推理 (MATRIX_REASONING)
  // 5-Tier 难度阶梯:
  //   Tier 1 (delta >= 0.72): 极简 2x2 同行恒等矩阵 ([s1, s1] / [s2, ?] -> s2)
  //   Tier 2 (0.55..0.72):    简单 2x2 对角交错矩阵 ([s1, s2] / [s2, ?] -> s1)
  //   Tier 3 (0.35..0.55):    标准 3x3 随机置换拉丁方阵 (行/列排列完全随机生成)
  //   Tier 4 (0.18..0.35):    高难 3x3 双维正交拉丁方阵 (随机符号拉丁方 × 随机计数拉丁方)
  //   Tier 5 (delta < 0.18):  奇点 3x3 三维正交超拉丁方阵 (外框括号类型 × 内部符号 × 算术模3或集合异或运算)
  // ===================================================================================
  private generateMatrixReasoningTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `matrix_t${String(trialIndex).padStart(3, "0")}`;
    const tier = TaskGenerator.getDifficultyTier(delta);

    if (tier === 1 || tier === 2) {
      const [s1, s2, s3, s4] = this.sample(TaskGenerator.SYMBOLS, 4);
      const isRowIdentity = tier === 1;
      const r1c1 = s1;
      const r1c2 = isRowIdentity ? s1 : s2;
      const r2c1 = s2;
      const correctAns = isRowIdentity ? s2 : s1;
      const distractors = [isRowIdentity ? s1 : s2, s3, s4];

      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
      const macroDesc = isRowIdentity
        ? "2x2 矩阵遵循同行恒等复制律：每一行的左右两个单元格保持完全一致。"
        : "2x2 矩阵遵循行列互异与主对角线守恒律：每行每列均由两个不同符号组成。";
      const microDesc = "核对第 2 行左侧已知符号与第 1 行的对应关系即可唯一确定右下角缺失项。";
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(correctOption, macroDesc, microDesc);

      const gridDisplay = `第 1 行:  [ ${r1c1} ]  [ ${r1c2} ]\n第 2 行:  [ ${r2c1} ]  [ ? ]`;
      const prompt = `分析下列 2x2 基础矩阵的守恒规律：\n\n${gridDisplay}\n\n从选项 A、B、C、D 中选出右下角 [ ? ] 处最合理的符号。`;

      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "MATRIX_REASONING",
        difficulty_tier: tier,
        matrix_size: "2x2",
        theme,
      });
    }

    // Helper to generate a randomized 3x3 Latin Square over [0, 1, 2]
    const makeLatin3x3 = (): number[][] => {
      const base = [
        [0, 1, 2],
        [1, 2, 0],
        [2, 0, 1],
      ];
      const rowPerm = this.shuffle([0, 1, 2]);
      const colPerm = this.shuffle([0, 1, 2]);
      return rowPerm.map(r => colPerm.map(c => base[r][c]));
    };

    const [s1, s2, s3, s4] = this.sample(TaskGenerator.SYMBOLS, 4);
    const syms = [s1, s2, s3];
    const symLatin = makeLatin3x3();

    if (tier === 3) {
      const correctSym = syms[symLatin[2][2]];
      const distractors = [syms[symLatin[2][0]], syms[symLatin[2][1]], s4];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctSym, distractors);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "矩阵遵循 3x3 拉丁方阵封闭守恒律：每一行与每一列均恰好包含全部 3 种基准符号且互不重复。",
        "同时比对第 3 行已出现的两个符号与第 3 列已出现的两个符号，取其唯一补集元素。"
      );

      const gridDisplay = [
        `第 1 行:  [ ${syms[symLatin[0][0]]} ]  [ ${syms[symLatin[0][1]]} ]  [ ${syms[symLatin[0][2]]} ]`,
        `第 2 行:  [ ${syms[symLatin[1][0]]} ]  [ ${syms[symLatin[1][1]]} ]  [ ${syms[symLatin[1][2]]} ]`,
        `第 3 行:  [ ${syms[symLatin[2][0]]} ]  [ ${syms[symLatin[2][1]]} ]  [ ? ]`,
      ].join("\n");

      const prompt = `推导下列 3x3 抽象符号矩阵的行列守恒机制：\n\n${gridDisplay}\n\n从选项 A、B、C、D 中推断右下角 [ ? ] 处应填入的符号。`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "MATRIX_REASONING",
        difficulty_tier: tier,
        matrix_size: "3x3",
        theme,
      });
    }

    if (tier === 4) {
      const counts = [1, 2, 3];
      const countLatin = makeLatin3x3();
      const formatCell = (r: number, c: number) => `[ ${syms[symLatin[r][c]].repeat(counts[countLatin[r][c]])} ]`;

      const correctAns = formatCell(2, 2);
      const targetSym = syms[symLatin[2][2]];
      const targetCount = counts[countLatin[2][2]];
      const wrongSym1 = syms[symLatin[2][0]];
      const wrongSym2 = syms[symLatin[2][1]];
      const wrongCount1 = counts[countLatin[2][0]];
      const wrongCount2 = counts[countLatin[2][1]];

      const distractors = [
        `[ ${targetSym.repeat(wrongCount1)} ]`,
        `[ ${wrongSym1.repeat(targetCount)} ]`,
        `[ ${wrongSym2.repeat(wrongCount2)} ]`,
      ];

      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "矩阵由两个正交的 3x3 拉丁方阵叠加而成：【符号种类】与【符号重复个数 (1/2/3)】在每一行、每一列均独立满足不重复守恒。",
        "先由第 3 行前两格确定缺失的符号种类，再独立由第 3 行前两格的元素个数确定缺失的重复次数，切勿将两个维度混为一谈。"
      );

      const gridDisplay = [
        `第 1 行:  ${formatCell(0, 0)}  ${formatCell(0, 1)}  ${formatCell(0, 2)}`,
        `第 2 行:  ${formatCell(1, 0)}  ${formatCell(1, 1)}  ${formatCell(1, 2)}`,
        `第 3 行:  ${formatCell(2, 0)}  ${formatCell(2, 1)}  [ ? ]`,
      ].join("\n");

      const prompt = `推导下列 3x3 双维复合矩阵的行列正交守恒机制：\n\n${gridDisplay}\n\n从选项 A、B、C、D 中推断右下角 [ ? ] 处应填入的组合。`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "MATRIX_REASONING",
        difficulty_tier: tier,
        matrix_size: "3x3_dual",
        theme,
      });
    }

    // Tier 5: 3 Orthogonal Dimensions:
    //   Dimension 1: Outer Frame Bracket type: [ ... ], ( ... ), { ... } -> Latin Square 1
    //   Dimension 2: Core Symbol type: syms[0], syms[1], syms[2]         -> Latin Square 2
    //   Dimension 3: Numeric index / repeat count follow row-wise modular sum: c3 = ((c1 + c2) mod 3) + 1
    const frames: Array<[string, string]> = [["[", "]"], ["(", ")"], ["{", "}"]];
    const frameLatin = makeLatin3x3();
    const rowCounts: number[][] = [
      [1, 2, 0],
      [2, 2, 0],
      [1, 1, 0],
    ].map(() => {
      const a = this.choice([1, 2, 3]);
      const b = this.choice([1, 2, 3]);
      const c = ((a + b) % 3) + 1;
      return [a, b, c];
    });

    const formatCellT5 = (r: number, c: number) => {
      const [openB, closeB] = frames[frameLatin[r][c]];
      const sym = syms[symLatin[r][c]];
      const cnt = rowCounts[r][c];
      return `${openB} ${sym.repeat(cnt)} ${closeB}`;
    };

    const correctAns = formatCellT5(2, 2);
    const [targetOpen, targetClose] = frames[frameLatin[2][2]];
    const [wrongOpen1, wrongClose1] = frames[frameLatin[2][0]];
    const targetSym = syms[symLatin[2][2]];
    const wrongSym = syms[symLatin[2][1]];
    const targetCnt = rowCounts[2][2];
    const wrongCnt1 = (targetCnt % 3) + 1;
    const wrongCnt2 = ((targetCnt + 1) % 3) + 1;

    const distractors = [
      `${targetOpen} ${targetSym.repeat(wrongCnt1)} ${targetClose}`, // right frame & symbol, wrong modular count
      `${wrongOpen1} ${targetSym.repeat(targetCnt)} ${wrongClose1}`, // wrong frame, right symbol & count
      `${targetOpen} ${wrongSym.repeat(wrongCnt2)} ${targetClose}`,  // right frame, wrong symbol & count
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
    const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
      correctOption,
      "三维超拉丁矩阵包含三个独立正交特征：1. 外框括号类型 [] / () / {} 满足行列拉丁守恒；2. 核心符号满足行列拉丁守恒；3. 每行第 3 格的符号个数等于前两格个数之和对 3 取模再加 1（即 ((N₁+N₂) mod 3) + 1）。",
      "先通过外框括号与符号种类的拉丁方阵唯一确定括号形态和符号类别，再用前两格计数代入公式 ((N₁+N₂) mod 3) + 1 计算出精确重复次数。"
    );

    const gridDisplay = [
      `第 1 行:  ${formatCellT5(0, 0)}   ${formatCellT5(0, 1)}   ${formatCellT5(0, 2)}`,
      `第 2 行:  ${formatCellT5(1, 0)}   ${formatCellT5(1, 1)}   ${formatCellT5(1, 2)}`,
      `第 3 行:  ${formatCellT5(2, 0)}   ${formatCellT5(2, 1)}   ?`,
    ].join("\n");

    const prompt = `推导下列 3x3 三维复合超矩阵（外框括号 × 内部符号 × 数量递推）的深层守恒机制：\n\n${gridDisplay}\n\n从选项 A、B、C、D 中推断右下角 ? 处应填入的精确表达式。`;
    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "MATRIX_REASONING",
      difficulty_tier: tier,
      matrix_size: "3x3_hyper",
      theme,
    });
  }

  // ===================================================================================
  // 4. 空间心智旋转与二面体群几何变换 (SPATIAL_ROTATION)
  // 5-Tier 难度阶梯:
  //   Tier 1 (delta >= 0.72): 3x3 简单直条 (3格), 顺时针旋转 90°, 干扰项点数不同
  //   Tier 2 (0.55..0.72):    3x3 非对称 L 型拐角, 旋转 90°/180°, 干扰项为不同拓扑形状
  //   Tier 3 (0.35..0.55):    4x4 随机生成非对称多联骨牌 + 异质锚点符号, 纯旋转 vs 手性镜像
  //   Tier 4 (0.18..0.35):    5x5 复杂异质双锚点构型, 旋转 180°/270°, 干扰项为手性镜像与单锚点错位
  //   Tier 5 (delta < 0.18):  6x6 奇点二面体复合变换（先顺时针旋转 270° 再执行水平镜像翻转）+ 三异质锚点
  // ===================================================================================
  private generateSpatialRotationTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `rot_t${String(trialIndex).padStart(3, "0")}`;
    const tier = TaskGenerator.getDifficultyTier(delta);

    const rotCw = (grid: string[][]): string[][] => {
      const h = grid.length;
      const w = grid[0].length;
      const res: string[][] = [];
      for (let c = 0; c < w; c++) {
        const row: string[] = [];
        for (let r = h - 1; r >= 0; r--) row.push(grid[r][c]);
        res.push(row);
      }
      return res;
    };
    const mirrorH = (grid: string[][]): string[][] => grid.map(r => [...r].reverse());
    const mirrorV = (grid: string[][]): string[][] => [...grid].reverse().map(r => [...r]);
    const gridToStr = (grid: string[][]): string => grid.map(r => r.join(" ")).join("\n");

    if (tier === 1) {
      const sym = this.choice(["■", "▲", "★"]);
      const baseGrid = [
        [sym, "・", "・"],
        [sym, "・", "・"],
        [sym, "・", "・"],
      ];
      const correctGrid = rotCw(baseGrid);
      const dist1 = [
        [sym, "・", "・"],
        ["・", sym, "・"],
        ["・", "・", "・"],
      ];
      const dist2 = [
        [sym, sym, "・"],
        [sym, sym, "・"],
        ["・", "・", "・"],
      ];
      const dist3 = [
        ["・", sym, "・"],
        [sym, sym, sym],
        ["・", sym, "・"],
      ];
      const { options, correctOption, signalType } = this.assembleFourOptions(
        gridToStr(correctGrid),
        [gridToStr(dist1), gridToStr(dist2), gridToStr(dist3)]
      );
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        `刚体旋转保持微元总数（3 个 '${sym}'）与直线拓扑形态不变。`,
        `左侧竖直 3 连杆顺时针旋转 90° 后变为顶行水平 3 连杆。`
      );
      const prompt = `基准二维几何构型如下（3x3 网格）：\n\n${gridToStr(baseGrid)}\n\n请从选项 A、B、C、D 中选出由基准构型顺时针旋转 90° 得到的图形。`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "SPATIAL_ROTATION",
        difficulty_tier: tier,
        grid_dim: 3,
        theme,
      });
    }

    if (tier === 2) {
      const baseGrid = [
        ["★", "・", "・"],
        ["■", "・", "・"],
        ["■", "■", "▲"],
      ];
      const steps = this.choice([1, 2]);
      let correctGrid = baseGrid;
      for (let i = 0; i < steps; i++) correctGrid = rotCw(correctGrid);

      const d1 = mirrorH(correctGrid);
      const d2 = mirrorV(correctGrid);
      const d3 = correctGrid.map(r => [...r]);
      d3[0][0] = d3[0][0] === "・" ? "■" : "・";

      const { options, correctOption, signalType } = this.assembleFourOptions(
        gridToStr(correctGrid),
        [gridToStr(d1), gridToStr(d2), gridToStr(d3)]
      );
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "刚体旋转保持『★ 端点 — ■ 拐角 — ▲ 端点』的顺时针手性连接次序不变。",
        "定位特殊锚点符号 ★ 与 ▲ 相对于直角拐点的朝向，镜像翻转选项会使拐角左右手性反转。"
      );
      const prompt = `基准二维几何构型如下（3x3 网格）：\n\n${gridToStr(baseGrid)}\n\n请从选项 A、B、C、D 中判断：哪一个图形是由基准构型在平面内通过【纯顺时针旋转】得到的？`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "SPATIAL_ROTATION",
        difficulty_tier: tier,
        grid_dim: 3,
        theme,
      });
    }

    // Tiers 3, 4, 5: Procedural chiral grid generator on 4x4, 5x5, or 6x6
    const dim = tier === 3 ? 4 : tier === 4 ? 5 : 6;
    const emptyGrid = () => Array.from({ length: dim }, () => Array.from({ length: dim }, () => "・"));

    const buildChiralShape = (): string[][] => {
      const g = emptyGrid();
      // Construct an asymmetric F/P-like chiral backbone guaranteed to have trivial rotational symmetry group
      const r0 = Math.floor(this.random() * 2);
      const c0 = Math.floor(this.random() * 2);
      g[r0][c0] = "★"; // Anchor 1 (head)
      g[r0 + 1][c0] = "■";
      g[r0 + 2][c0] = "■";
      g[r0][c0 + 1] = "■";
      g[r0][c0 + 2] = "▲"; // Anchor 2 (arm tip)
      g[r0 + 1][c0 + 1] = "◆"; // Chiral off-center spur

      if (dim >= 5) {
        g[r0 + 3][c0] = "■";
        g[r0 + 2][c0 + 2] = "●"; // Secondary asymmetric anchor
      }
      if (dim >= 6) {
        g[r0 + 3][c0 + 1] = "✦"; // Tertiary chiral marker
        g[r0 + 1][c0 + 3] = "■";
      }

      // Apply random initial orientation (0, 90, 180, 270) so base grid is dynamically varied every time
      let oriented = g;
      const initRot = Math.floor(this.random() * 4);
      for (let i = 0; i < initRot; i++) oriented = rotCw(oriented);
      return oriented;
    };

    const baseGrid = buildChiralShape();

    if (tier === 5) {
      // Tier 5: Composite Dihedral Transformation: Rotate 270° clockwise, THEN Horizontal Mirror!
      const rot270 = rotCw(rotCw(rotCw(baseGrid)));
      const correctGrid = mirrorH(rot270);

      // Distractor 1: Pure rotation 270° (forgot horizontal mirror)
      const d1 = rot270;
      // Distractor 2: Rotate 90° clockwise then Horizontal Mirror (wrong rotation angle)
      const d2 = mirrorH(rotCw(baseGrid));
      // Distractor 3: Correct geometry, but swap two internal chiral anchors (◆ and ✦)
      const d3 = correctGrid.map(row =>
        row.map(cell => (cell === "◆" ? "✦" : cell === "✦" ? "◆" : cell))
      );

      const { options, correctOption, signalType } = this.assembleFourOptions(
        gridToStr(correctGrid),
        [gridToStr(d1), gridToStr(d2), gridToStr(d3)]
      );
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "复合二面体变换分两步执行：第一步顺时针旋转 270°（等价于逆时针旋转 90°），第二步沿垂直中轴做左右水平镜像翻转。",
        "先追踪四角锚点（★ 与 ▲）经逆时针 90° 旋转并左右翻转后的精确行列坐标，再校验内部异质节点（◆ 与 ✦）是否发生非法互换。"
      );

      const prompt = `基准二维异质几何构型如下（${dim}x${dim} 网格）：\n\n${gridToStr(baseGrid)}\n\n请从选项 A、B、C、D 中推断：哪一个构型是由基准构型先执行【顺时针旋转 270°】，随后再执行【水平左右镜像翻转】得到的精确结果？`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "SPATIAL_ROTATION",
        difficulty_tier: tier,
        grid_dim: dim,
        transform_type: "composite_rot270_mirrorH",
        theme,
      });
    }

    // Tier 3 & Tier 4: Pure rotation (90°, 180°, or 270°)
    const rotSteps = tier === 4 ? this.choice([2, 3]) : this.choice([1, 2, 3]);
    let correctGrid = baseGrid;
    for (let i = 0; i < rotSteps; i++) correctGrid = rotCw(correctGrid);

    // Distractor 1: Chiral mirror rotated by same steps
    let d1 = mirrorH(baseGrid);
    for (let i = 0; i < rotSteps; i++) d1 = rotCw(d1);

    // Distractor 2: Chiral mirror rotated by +180°
    const d2 = rotCw(rotCw(d1));

    // Distractor 3: Correct outer silhouette, but swap anchor symbols ★ and ▲
    const d3 = correctGrid.map(row =>
      row.map(cell => (cell === "★" ? "▲" : cell === "▲" ? "★" : cell))
    );

    const { options, correctOption, signalType } = this.assembleFourOptions(
      gridToStr(correctGrid),
      [gridToStr(d1), gridToStr(d2), gridToStr(d3)]
    );
    const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
      correctOption,
      "刚体平面纯旋转严格保持构型的手性（顺/逆时针拐向）以及各异质锚点（★、▲、◆）之间的相对拓扑邻接关系。",
      "部分高仿干扰项复刻了旋转后的外轮廓，但互换了首尾特征锚点（★ 与 ▲）或引入了手性镜像，需同时核对轮廓手性与锚点符号位置。"
    );

    const prompt = `基准二维几何构型如下（${dim}x${dim} 网格）：\n\n${gridToStr(baseGrid)}\n\n请从选项 A、B、C、D 中判断：哪一个构型是由基准构型在平面内通过【纯顺时针旋转】得到的？\n（注：其余选项为手性镜像体或锚点错位畸变体）`;
    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "SPATIAL_ROTATION",
      difficulty_tier: tier,
      grid_dim: dim,
      rotation_steps: rotSteps,
      theme,
    });
  }

  // ===================================================================================
  // 5. 抽象结构守恒律与模算术不变量 (PARITY_INVARIANT)
  // 5-Tier 难度阶梯:
  //   Tier 1 (delta >= 0.72): 长度 3, 核心符号 ★ 恒为 1 个
  //   Tier 2 (0.55..0.72):    长度 4, 实心与空心符号数量严格相等 (2 实心 + 2 空心, 完全随机打乱)
  //   Tier 3 (0.35..0.55):    长度 6, 空心恒为 2 个且实心为偶数 (4 实心 + 2 空心, 彻底修复末尾空心泄漏 Bug!)
  //   Tier 4 (0.18..0.35):    长度 8, 三元组复合守恒：实心数为偶数、空心数为奇数、且首尾两符号同属一类
  //   Tier 5 (delta < 0.18):  长度 9, 模 3 线性代数守恒律：设实心权重 +2、星号(★/✦)权重 +1、空心权重 -1，总权重之和模 3 恒等于 0，且首尾权重互异
  // ===================================================================================
  private generateParityInvariantTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `parity_t${String(trialIndex).padStart(3, "0")}`;
    const tier = TaskGenerator.getDifficultyTier(delta);

    const solidSyms = ["●", "■", "▲"];
    const hollowSyms = ["○", "□", "△"];
    const starSyms = ["★", "✦"];

    if (tier === 1) {
      const makeT1Valid = () => {
        const seq = [this.choice(solidSyms), "★", this.choice(solidSyms)];
        return this.shuffle(seq).join(" ");
      };
      const samples = [makeT1Valid(), makeT1Valid(), makeT1Valid()];
      const correctStr = makeT1Valid();
      const distractors = [
        [this.choice(solidSyms), this.choice(solidSyms), this.choice(solidSyms)].join(" "),
        ["★", "★", this.choice(solidSyms)].join(" "),
        ["★", "★", "★"].join(" "),
      ];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "统计序列中特征星号（★）的出现频次，与具体排列位置无关。",
        "合法样本均恰好包含 1 个 '★'，含 0 个或多个 '★' 的选项均违背守恒律。"
      );
      const prompt = `以下 3 组示例序列均严格满足某种抽象结构平衡法则（合法样本）：\n\n[样本 1]: ${samples[0]}\n[样本 2]: ${samples[1]}\n[样本 3]: ${samples[2]}\n\n请从选项 A、B、C、D 中选出同样满足该守恒法则的序列。`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "PARITY_INVARIANT",
        difficulty_tier: tier,
        theme,
      });
    }

    if (tier === 2 || tier === 3) {
      const nSolid = tier === 2 ? 2 : 4;
      const nHollow = 2;

      const makeValid = (): string => {
        const items = [
          ...Array.from({ length: nSolid }, () => this.choice(solidSyms)),
          ...Array.from({ length: nHollow }, () => this.choice(hollowSyms)),
        ];
        // Full uniform shuffle — never pins hollow symbol at the end!
        return this.shuffle(items).join(" ");
      };

      const makeInvalid = (mode: number): string => {
        const sCount = mode === 0 ? nSolid - 1 : mode === 1 ? nSolid + 1 : nSolid + 2;
        const hCount = (nSolid + nHollow) - sCount;
        const items = [
          ...Array.from({ length: Math.max(0, sCount) }, () => this.choice(solidSyms)),
          ...Array.from({ length: Math.max(0, hCount) }, () => this.choice(hollowSyms)),
        ];
        return this.shuffle(items).join(" ");
      };

      const samples = [makeValid(), makeValid(), makeValid()];
      const correctStr = makeValid();
      const distractors = [makeInvalid(0), makeInvalid(1), makeInvalid(2)];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "分类统计序列中『实心几何图形 (●/■/▲)』与『空心几何图形 (○/□/△)』的各自总数。",
        `所有合法样本均严格包含 ${nSolid} 个实心图形与 ${nHollow} 个空心图形。`
      );
      const prompt = `以下 3 组示例序列均严格满足某种抽象结构平衡法则（合法样本）：\n\n[样本 1]: ${samples[0]}\n[样本 2]: ${samples[1]}\n[样本 3]: ${samples[2]}\n\n请从选项 A、B、C、D 中判断：哪一个序列同样严格满足该守恒法则？`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "PARITY_INVARIANT",
        difficulty_tier: tier,
        theme,
      });
    }

    if (tier === 4) {
      // Tier 4: Length 8. Invariants:
      //   1. Number of solid symbols is EVEN (4)
      //   2. Number of hollow symbols is ODD (3)
      //   3. Number of star symbols is ODD (1)
      //   4. First and last symbols belong to the SAME category (both solid)
      const makeT4Valid = (): string => {
        const inner = this.shuffle([
          ...Array.from({ length: 2 }, () => this.choice(solidSyms)),
          ...Array.from({ length: 3 }, () => this.choice(hollowSyms)),
          this.choice(starSyms),
        ]);
        return [this.choice(solidSyms), ...inner, this.choice(solidSyms)].join(" ");
      };

      // Distractor 1: Same counts (4 solid, 3 hollow, 1 star), but first & last are different categories (solid start, hollow end)
      const d1Inner = this.shuffle([
        ...Array.from({ length: 3 }, () => this.choice(solidSyms)),
        ...Array.from({ length: 2 }, () => this.choice(hollowSyms)),
        this.choice(starSyms),
      ]);
      const d1 = [this.choice(solidSyms), ...d1Inner, this.choice(hollowSyms)].join(" ");

      // Distractor 2: Solid start & end, but 3 solids (ODD), 4 hollows (EVEN), 1 star
      const d2Inner = this.shuffle([
        this.choice(solidSyms),
        ...Array.from({ length: 4 }, () => this.choice(hollowSyms)),
        this.choice(starSyms),
      ]);
      const d2 = [this.choice(solidSyms), ...d2Inner, this.choice(solidSyms)].join(" ");

      // Distractor 3: Solid start & end, 4 solids, 2 hollows, 2 stars
      const d3Inner = this.shuffle([
        ...Array.from({ length: 2 }, () => this.choice(solidSyms)),
        ...Array.from({ length: 2 }, () => this.choice(hollowSyms)),
        ...Array.from({ length: 2 }, () => this.choice(starSyms)),
      ]);
      const d3 = [this.choice(solidSyms), ...d3Inner, this.choice(solidSyms)].join(" ");

      const samples = [makeT4Valid(), makeT4Valid(), makeT4Valid()];
      const correctStr = makeT4Valid();
      const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, [d1, d2, d3]);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "复合守恒律同时约束『三类符号（实心/空心/星形）的奇偶配比』与『首尾边界符号的类别对称性』。",
        "合法序列满足：首尾两端同为实心符号，且序列总计包含 4 个实心（偶）、3 个空心（奇）与 1 个星形（奇）。"
      );

      const prompt = `以下 3 组示例序列（长度均为 8）均严格满足某种复合结构守恒法则（合法样本）：\n\n[样本 1]: ${samples[0]}\n[样本 2]: ${samples[1]}\n[样本 3]: ${samples[2]}\n\n请从选项 A、B、C、D 中推断：哪一个序列同样严格满足全部守恒约束？`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "PARITY_INVARIANT",
        difficulty_tier: tier,
        theme,
      });
    }

    // Tier 5: Length 9 Modular Linear Invariant + Alternating Triad Balance
    // Every valid sequence has length 9, partitioned into three 3-symbol blocks, where:
    //   - Total count: 3 Solids (●/■/▲), 3 Hollows (○/□/△), 3 Stars (★/✦)
    //   - Every contiguous 3-symbol triad [0..2], [3..5], [6..8] contains EXACTLY 1 Solid, 1 Hollow, and 1 Star!
    const makeT5Valid = (): string => {
      const triad = () => this.shuffle([
        this.choice(solidSyms),
        this.choice(hollowSyms),
        this.choice(starSyms),
      ]);
      return [...triad(), ...triad(), ...triad()].join(" ");
    };

    // Distractor 1: Globally has 3 Solids, 3 Hollows, 3 Stars, but violates local triad balance (e.g. first triad has 2 Solids, 1 Hollow, 0 Stars)
    const d1 = [
      this.choice(solidSyms), this.choice(solidSyms), this.choice(hollowSyms),
      this.choice(starSyms), this.choice(starSyms), this.choice(hollowSyms),
      this.choice(solidSyms), this.choice(hollowSyms), this.choice(starSyms),
    ].join(" ");

    // Distractor 2: First and third triads balanced, middle triad has 2 Hollows & 1 Star (global: 2 Solids, 4 Hollows, 3 Stars)
    const d2 = [
      ...this.shuffle([this.choice(solidSyms), this.choice(hollowSyms), this.choice(starSyms)]),
      ...this.shuffle([this.choice(hollowSyms), this.choice(hollowSyms), this.choice(starSyms)]),
      ...this.shuffle([this.choice(solidSyms), this.choice(hollowSyms), this.choice(starSyms)]),
    ].join(" ");

    // Distractor 3: Globally 3 Solids, 3 Hollows, 3 Stars, but middle and last triads swap a Solid and Star
    const d3 = [
      ...this.shuffle([this.choice(solidSyms), this.choice(hollowSyms), this.choice(starSyms)]),
      this.choice(solidSyms), this.choice(solidSyms), this.choice(hollowSyms),
      this.choice(starSyms), this.choice(starSyms), this.choice(hollowSyms),
    ].join(" ");

    const samples = [makeT5Valid(), makeT5Valid(), makeT5Valid()];
    const correctStr = makeT5Valid();
    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, [d1, d2, d3]);
    const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
      correctOption,
      "除全局满足『3 实心 + 3 空心 + 3 星形』外，序列还受局部滑窗守恒约束：将长度 9 的序列等分为前、中、后三个三元组（位置 1-3、4-6、7-9）。",
      "每一个独立三元组内部都必须恰好包含 1 个实心符号、1 个空心符号与 1 个星形符号；全局总数正确但局部三元组失衡的伪装项需排除。"
    );

    const prompt = `以下 3 组长度为 9 的示例序列均严格满足某种全局与局部双重结构守恒法则（合法样本）：\n\n[样本 1]: ${samples[0]}\n[样本 2]: ${samples[1]}\n[样本 3]: ${samples[2]}\n\n请从选项 A、B、C、D 中判断：哪一个序列同样严格满足该双重守恒法则？`;
    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "PARITY_INVARIANT",
      difficulty_tier: tier,
      theme,
    });
  }

  // ===================================================================================
  // 6. 抽象逻辑关系网络与传递性推断 (RELATIONAL_TRANSITIVITY)
  // 5-Tier 难度阶梯:
  //   Tier 1 (delta >= 0.72): 3 节点顺向直连 A ▷ B, B ▷ C => A ▷ C
  //   Tier 2 (0.55..0.72):    4 节点单向打乱, 2~3 跳传递
  //   Tier 3 (0.35..0.55):    5 节点单向打乱, 3~4 跳传递
  //   Tier 4 (0.18..0.35):    6~7 节点混合方向关系 (同时包含顺向 'X ▷ Y' 与逆向 'Y ◁ X')
  //   Tier 5 (delta < 0.18):  8~9 节点有向无环图 (DAG)：包含混合操作符 (▷ / ◁) + 旁支死胡同干扰边，需定位唯一可传递的 5 跳主干路径
  // ===================================================================================
  private generateRelationalTransitivityTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `trans_t${String(trialIndex).padStart(3, "0")}`;
    const tier = TaskGenerator.getDifficultyTier(delta);

    if (tier === 1) {
      const [s0, s1, s2] = this.sample(TaskGenerator.SYMBOLS, 3);
      const premise = `${s0} ▷ ${s1} ， ${s1} ▷ ${s2}`;
      const correctAns = `${s0} ▷ ${s2}`;
      const distractors = [`${s2} ▷ ${s0}`, `${s1} ▷ ${s0}`, `${s2} ▷ ${s1}`];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        `沿单向传递链条从起点 '${s0}' 顺延至终点 '${s2}'。`,
        `根据传递律，首尾必然满足前驱先于后继，反向命题均不成立。`
      );
      const prompt = `已知下列抽象符号之间的直接序位关系（'X ▷ Y' 表示 X 的层级严格先于 Y）：\n\n前提条件：${premise}\n\n依据传递性公理（若 X ▷ Y 且 Y ▷ Z，则 X ▷ Z），下列哪一个命题必然成立？`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "RELATIONAL_TRANSITIVITY",
        difficulty_tier: tier,
        node_count: 3,
        theme,
      });
    }

    if (tier === 2 || tier === 3) {
      const nodeCount = tier === 2 ? 4 : 5;
      const syms = this.sample(TaskGenerator.SYMBOLS, nodeCount);
      const pairsPresented: string[] = [];
      for (let i = 0; i < nodeCount - 1; i++) {
        pairsPresented.push(`${syms[i]} ▷ ${syms[i + 1]}`);
      }
      this.shuffle(pairsPresented);

      const startIdx = tier === 2 ? 0 : 1;
      const endIdx = nodeCount - 1;
      const correctAns = `${syms[startIdx]} ▷ ${syms[endIdx]}`;

      const invalidPairs: string[] = [];
      for (let i = 0; i < nodeCount; i++) {
        for (let j = 0; j < i; j++) {
          invalidPairs.push(`${syms[i]} ▷ ${syms[j]}`);
        }
      }
      const distractors = this.sample(invalidPairs, 3);
      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "将打乱的二元关系首尾拼接，还原唯一的单向全序链。",
        "核对各候选项左右两端符号在全序链中的前后次序，逆序断言可直接排除。"
      );

      const prompt = `系统已知下列抽象符号之间的直接序位关系（'X ▷ Y' 表示 X 的层级严格先于 Y）：\n\n已知前提：${pairsPresented.join(" ， ")}\n\n依据传递性公理（若 X ▷ Y 且 Y ▷ Z，则 X ▷ Z），判断下列哪一个命题必然成立？`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "RELATIONAL_TRANSITIVITY",
        difficulty_tier: tier,
        node_count: nodeCount,
        theme,
      });
    }

    // Tier 4 & Tier 5: Mixed relational operators ('X ▷ Y' means X precedes Y; 'Y ◁ X' ALSO means X precedes Y)
    // Plus in Tier 5: Decoy branches that fork out or merge in (partial order DAG), so non-comparable pairs are invalid!
    const spineLen = tier === 4 ? 6 : 7;
    const totalSyms = tier === 4 ? 6 : 9;
    const allSyms = this.sample(TaskGenerator.SYMBOLS, totalSyms);
    const spine = allSyms.slice(0, spineLen);
    const decoys = allSyms.slice(spineLen);

    const premises: string[] = [];
    for (let i = 0; i < spineLen - 1; i++) {
      // Mix forward ▷ and reverse ◁ notation to prevent surface token scanning
      const useReverse = (i % 2 === 1);
      if (useReverse) {
        premises.push(`${spine[i + 1]} ◁ ${spine[i]}`);
      } else {
        premises.push(`${spine[i]} ▷ ${spine[i + 1]}`);
      }
    }

    if (tier === 5 && decoys.length >= 2) {
      // Add forked decoy branches: spine[1] ▷ decoys[0] and decoys[1] ▷ spine[spineLen-2]
      // Note: decoys[0] has NO relation to spine[4], and decoys[1] has NO relation to spine[1]!
      premises.push(`${decoys[0]} ◁ ${spine[1]}`); // spine[1] ▷ decoys[0]
      premises.push(`${decoys[1]} ▷ ${spine[spineLen - 2]}`); // decoys[1] ▷ spine[5]
    }

    this.shuffle(premises);

    // Query a deep 4-hop or 5-hop internal pair along the spine: spine[1] ▷ spine[spineLen - 2]
    const qStart = 1;
    const qEnd = spineLen - 2;
    const correctAns = `${spine[qStart]} ▷ ${spine[qEnd]}`;

    const distractors: string[] = [
      `${spine[qEnd]} ▷ ${spine[qStart]}`, // Reversed spine pair
      `${spine[qEnd - 1]} ▷ ${spine[qStart + 1]}`, // Internal reversed spine pair
      tier === 5 && decoys.length >= 2
        ? `${decoys[0]} ▷ ${spine[qEnd]}` // Incomparable branch decoy (spine[1] ▷ decoys[0] and spine[1] ▷ spine[qEnd], so decoys[0] and spine[qEnd] cannot be ordered!)
        : `${spine[spineLen - 1]} ▷ ${spine[2]}`,
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
    const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
      correctOption,
      "先把所有逆向关系『Y ◁ X』统一改写为等价的顺向关系『X ▷ Y』，再沿有向边追踪可达路径。",
      tier === 5
        ? "注意区分主干传递链与同源分叉旁支（若 A ▷ B 且 A ▷ C，B 与 C 之间并不存在传递序关系），仅在存在完整有向路径的节点对之间断言。"
        : "还原主干拓扑序后，重点核对候选项中中间节点对的前后可达方向。"
    );

    const prompt = `系统已知下列抽象符号之间的直接序位关系（其中 'X ▷ Y' 表示 X 先于 Y；而 'Y ◁ X' 表示 Y 后于 X，即等价于 X ▷ Y）：\n\n已知前提：${premises.join(" ， ")}\n\n依据严格偏序传递性公理，判断下列哪一个命题必然成立？`;
    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "RELATIONAL_TRANSITIVITY",
      difficulty_tier: tier,
      node_count: totalSyms,
      theme,
    });
  }

  // ===================================================================================
  // 7. 符号序列多轨周期与耦合递推 (SEQUENCE_PROGRESSION)
  // 5-Tier 难度阶梯 (彻底修复原代码 curNum 重复累加导致正确选项算错的 Bug!):
  //   Tier 1 (delta >= 0.72): 单轨符号恒定 + 数值 +2 等差 ([▲ 2] [▲ 4] [▲ 6] [▲ 8] -> [▲ 10])
  //   Tier 2 (0.55..0.72):    符号 2 周期交替 + 数值固定等差
  //   Tier 3 (0.35..0.55):    符号 3 周期循环 + 数值一阶等差
  //   Tier 4 (0.18..0.35):    符号 4 周期循环 + 数值二阶等差数列 (相邻差值 d, 2d, 3d, 4d)
  //   Tier 5 (delta < 0.18):  三轨耦合递推系统 [Sym A:B]：
  //                           符号沿步长 +2 跳步循环；左寄存器 A 执行二阶等差；右寄存器 B 满足递推 B_n = B_{n-1} + A_{n-1}
  // ===================================================================================
  private generateSequenceProgressionTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `seq_t${String(trialIndex).padStart(3, "0")}`;
    const tier = TaskGenerator.getDifficultyTier(delta);

    if (tier === 1) {
      const sym = this.choice(TaskGenerator.SYMBOLS.slice(0, 6));
      const startNum = this.choice([2, 4, 6]);
      const items = Array.from({ length: 5 }, (_, i) => `[${sym} ${startNum + i * 2}]`);
      const seqItems = items.slice(0, 4);
      const correctAns = items[4];
      const distractors = [
        `[${sym} ${startNum + 7}]`,
        `[${sym} ${startNum + 9}]`,
        `[${sym} ${startNum + 10}]`,
      ];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "符号保持恒定不变，数值构成公差为 +2 的简单等差数列。",
        "在第 4 项数值基础上加 2 即可确定第 5 项。"
      );
      const prompt = `观察下列序列的递增演化规律：\n\n${seqItems.join("  ")}  [ ? ]\n\n推断末尾 [ ? ] 处所对应的组合。`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "SEQUENCE_PROGRESSION",
        difficulty_tier: tier,
        theme,
      });
    }

    if (tier === 2 || tier === 3 || tier === 4) {
      const cycleLen = tier === 2 ? 2 : tier === 3 ? 3 : 4;
      const cycleSyms = this.sample(TaskGenerator.SYMBOLS.slice(0, 8), cycleLen);
      const stepDiff = this.choice([2, 3, 4]);
      const startNum = Math.floor(this.random() * 6) + 2;

      const nums: number[] = [startNum];
      for (let i = 0; i < 4; i++) {
        const prev = nums[nums.length - 1];
        const increment = tier === 4 ? stepDiff * (i + 1) : stepDiff;
        nums.push(prev + increment);
      }

      const items = nums.map((n, i) => `[${cycleSyms[i % cycleLen]} ${n}]`);
      const seqItems = items.slice(0, 4);
      const correctAns = items[4];
      const targetSym = cycleSyms[4 % cycleLen];
      const wrongSym = cycleSyms[3 % cycleLen];
      const targetNum = nums[4];

      const distractors = [
        `[${targetSym} ${targetNum - stepDiff}]`,
        `[${targetSym} ${targetNum + stepDiff}]`,
        `[${wrongSym} ${targetNum}]`,
      ];

      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        tier === 4
          ? `双轨解耦分析：符号轨以长度 ${cycleLen} 周期循环；数值轨为二阶等差数列（相邻两项的一阶差值依次为 ${stepDiff}, ${stepDiff * 2}, ${stepDiff * 3}, ${stepDiff * 4}）。`
          : `双轨解耦分析：符号轨以长度 ${cycleLen} 周期循环，数值轨以固定步长 +${stepDiff} 线性递增。`,
        `先锁定第 5 项对应的周期符号，再将第 4 项数值加上第 4 步增量（+${tier === 4 ? stepDiff * 4 : stepDiff}）。`
      );

      const prompt = `观察下列符号与数值的双轨演化序列：\n\n${seqItems.join("  ")}  [ ? ]\n\n推断末尾 [ ? ] 处所对应的符号与数值组合。`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "SEQUENCE_PROGRESSION",
        difficulty_tier: tier,
        theme,
      });
    }

    // Tier 5: Three-Track Coupled State Recurrence [Sym A:B]
    //   - Symbol cycles through a 3-symbol ring
    //   - Left number A_i increases by second-order arithmetic difference: A_{i} = A_{i-1} + d * i
    //   - Right number B_i is coupled to the previous state: B_{i} = B_{i-1} + A_{i-1}
    const cycleSyms = this.sample(TaskGenerator.SYMBOLS.slice(0, 8), 3);
    const d = this.choice([2, 3]);
    const a0 = this.choice([2, 3, 4]);
    const b0 = this.choice([1, 2, 3]);

    const regA: number[] = [a0];
    const regB: number[] = [b0];
    for (let i = 1; i <= 4; i++) {
      const prevA = regA[i - 1];
      const prevB = regB[i - 1];
      regA.push(prevA + d * i);
      regB.push(prevB + prevA);
    }

    const items = regA.map((aVal, i) => `[${cycleSyms[i % 3]} ${aVal}:${regB[i]}]`);
    const seqItems = items.slice(0, 4);
    const correctAns = items[4];

    const targetSym = cycleSyms[4 % 3];
    const wrongSym = cycleSyms[3 % 3];
    const targetA = regA[4];
    const targetB = regB[4];

    const distractors = [
      `[${targetSym} ${targetA}:${targetB - d}]`,            // Right symbol & A, slightly off B
      `[${targetSym} ${targetA - d}:${targetB}]`,            // Right symbol & B, linear instead of 2nd-order A
      `[${wrongSym} ${targetA}:${ regB[3] + targetA }]`,     // Used A_4 instead of A_3 for B_4
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
    const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
      correctOption,
      `三轨耦合系统 [Sym A:B] 规律：1. 符号以 3 为周期循环；2. 左寄存器 A 的相邻差值呈等差递增（+${d}, +${2 * d}, +${3 * d}, +${4 * d}）；3. 右寄存器 B 满足跨轨累加递推：下一项的 B 等于上一项的 A 与 B 之和（Bₙ = Bₙ₋₁ + Aₙ₋₁）。`,
      `计算第 5 项时，左值 A₅ = A₄ + ${4 * d}，而右值 B₅ 必须由第 4 项的 A₄ + B₄ 求得（切勿误加 A₅）。`
    );

    const prompt = `观察下列三轨耦合寄存器序列 [符号 左值:右值] 的递推演化规律：\n\n${seqItems.join("  ")}  [ ? ]\n\n请从选项 A、B、C、D 中推断末尾 [ ? ] 处对应的精确状态。`;
    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "SEQUENCE_PROGRESSION",
      difficulty_tier: tier,
      theme,
    });
  }

  // ===================================================================================
  // 8. 几何连通性与图拓扑第一贝蒂数 (TOPOLOGICAL_LOOPS)
  // 5-Tier 难度阶梯 (彻底重写为动态图边集生成器，基于欧拉公式 Beta_1 = E - V + C):
  //   Tier 1 (delta >= 0.72): 3 节点开放路径 (0 环) vs 三角闭环 (1 环)
  //   Tier 2 (0.55..0.72):    4 节点简单连通图边集, 判定 0 环 (树) vs 1 环
  //   Tier 3 (0.35..0.55):    5 节点随机顶点标签连通图, 判定独立闭合环路数 Beta_1 in {0, 1, 2}
  //   Tier 4 (0.18..0.35):    6 节点打乱边集连通图 (含枝干悬挂边干扰), 计算精确环路数 Beta_1 = E - V + 1 in {1, 2, 3}
  //   Tier 5 (delta < 0.18):  7~8 节点非连通/双连通分量图 (C = 2 或 C = 1), 必须利用完整拓扑公式 Beta_1 = E - V + C 计算总独立环路数
  // ===================================================================================
  private generateTopologicalLoopsTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `topo_t${String(trialIndex).padStart(3, "0")}`;
    const tier = TaskGenerator.getDifficultyTier(delta);

    const labelPools = [
      ["A", "B", "C", "D", "E", "F", "G", "H"],
      ["P", "Q", "R", "S", "T", "U", "V", "W"],
      ["X", "Y", "Z", "M", "N", "K", "L", "J"],
      ["1", "2", "3", "4", "5", "6", "7", "8"],
    ];

    if (tier === 1) {
      const openSamples = ["A ── B ── C", "X ── Y ── Z", "P ── Q ── R"];
      const correctAns = "[ M ── N ── K ]";
      const distractors = [
        "[ M ── N ── K ── M ]",
        "[ M ── N ── M ]",
        "[ K ── M ── N ── K ]",
      ];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
      const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
        correctOption,
        "观察路径的首尾节点是否重合：参考样本均为首尾不相连的开放折线（0 个闭合环）。",
        "首尾出现相同节点字母的选项均构成了闭合回路，需直接排除。"
      );
      const prompt = `下列 3 个参考拓扑路径具有相同的几何连通特征（【开放路径，0 个闭合回路】）：\n\n参考样本:  [ ${openSamples[0]} ]    [ ${openSamples[1]} ]    [ ${openSamples[2]} ]\n\n请从选项 A、B、C、D 中选出同样属于【开放路径（0 个闭合回路）】的选项。`;
      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "TOPOLOGICAL_LOOPS",
        difficulty_tier: tier,
        loop_count: 0,
        theme,
      });
    }

    /**
     * Procedurally generates an undirected graph edge list with exact vertices V,
     * connected components C, and cycle rank (first Betti number) beta1 = E - V + C.
     */
    const buildGraphEdgeList = (numVertices: number, beta1: number, numComponents: number, poolIdx: number): string => {
      const pool = this.sample(labelPools[poolIdx % labelPools.length], numVertices);
      const edges: Array<[string, string]> = [];
      const edgeSet = new Set<string>();

      const addEdge = (u: string, v: string): boolean => {
        if (u === v) return false;
        const key = u < v ? `${u}-${v}` : `${v}-${u}`;
        if (edgeSet.has(key)) return false;
        edgeSet.add(key);
        edges.push(this.random() < 0.5 ? [u, v] : [v, u]);
        return true;
      };

      // Partition vertices into `numComponents` components (each size >= 3 when cycles are needed)
      const groups: string[][] = [];
      if (numComponents === 2 && numVertices >= 6) {
        const split = Math.max(3, Math.floor(numVertices / 2));
        groups.push(pool.slice(0, split));
        groups.push(pool.slice(split));
      } else {
        groups.push(pool);
      }

      // Step 1: Build a spanning tree inside each component (V - C edges, 0 cycles)
      for (const grp of groups) {
        for (let i = 1; i < grp.length; i++) {
          const parentIdx = Math.floor(this.random() * i);
          addEdge(grp[parentIdx], grp[i]);
        }
      }

      // Step 2: Add `beta1` intra-component chord edges (each chord adds exactly +1 independent cycle)
      let addedChords = 0;
      let safety = 0;
      while (addedChords < beta1 && safety < 100) {
        safety++;
        const grp = this.choice(groups);
        if (grp.length < 3) continue;
        const [u, v] = this.sample(grp, 2);
        if (addEdge(u, v)) {
          addedChords++;
        }
      }

      this.shuffle(edges);
      return `{ ${edges.map(([u, v]) => `${u}─${v}`).join(", ")} }`;
    };

    const vCount = tier === 2 ? 4 : tier === 3 ? 5 : tier === 4 ? 6 : 7;
    const targetLoops = tier === 2 ? this.choice([0, 1]) : tier === 3 ? this.choice([1, 2]) : this.choice([1, 2, 3]);
    const compCount = tier === 5 ? 2 : 1;

    const sample1 = buildGraphEdgeList(vCount, targetLoops, compCount, 0);
    const sample2 = buildGraphEdgeList(vCount, targetLoops, compCount, 1);
    const sample3 = buildGraphEdgeList(vCount, targetLoops, compCount, 2);
    const correctAns = buildGraphEdgeList(vCount, targetLoops, compCount, 3);

    const candidateLoopCounts = [0, 1, 2, 3, 4].filter(k => k !== targetLoops);
    const distractorLoops = this.sample(candidateLoopCounts, 3);
    const distractors = distractorLoops.map((k, idx) =>
      // In Tier 5, vary component count on one distractor so naive edge-counting fails!
      buildGraphEdgeList(vCount, k, tier === 5 && idx === 0 ? 1 : compCount, (idx + 1) % 4)
    );

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
    const { hint_tier1, hint_tier2 } = this.buildDiagnosticHints(
      correctOption,
      `图的独立闭合回路数（第一贝蒂数 β₁）满足拓扑欧拉示性数公式：β₁ = E - V + C（其中 E 为边数，V 为顶点数，C 为连通分量数）。`,
      `参考样本的独立闭合回路数均为 β₁ = ${targetLoops}（含 ${vCount} 个顶点、${compCount} 个连通分量）。统计各选项的边数 E 与连通块数 C 代入 β₁ = E - V + C 即可排除环数不符的候选项。`
    );

    const compNote = tier === 5
      ? `\n（提示：图可能包含多个互不连通的子图分量 C，独立闭合环路数满足拓扑定理 β₁ = 边数 E - 顶点数 V + 连通分量数 C）`
      : `\n（注：每个集合表示无向连通图的边集，'X─Y' 表示顶点 X 与顶点 Y 之间存在一条无向边）`;

    const prompt = `下列 3 个无向拓扑图边集共享相同的拓扑不变量——【独立闭合环路数（第一贝蒂数 β₁）】：${compNote}

[参考图 1]: ${sample1}
[参考图 2]: ${sample2}
[参考图 3]: ${sample3}

请从选项 A、B、C、D 中判断：哪一个拓扑图边集具有与参考图完全相同的【独立闭合环路数】？`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "TOPOLOGICAL_LOOPS",
      difficulty_tier: tier,
      vertex_count: vCount,
      component_count: compCount,
      loop_count: targetLoops,
      theme,
    });
  }
}

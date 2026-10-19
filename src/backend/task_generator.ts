/**
 * Module 1: Scientific Adaptive Task Generator (task_generator.ts)
 * 
 * Implements a psychometrically rigorous, culture-fair, knowledge-free stimulus generator.
 * Strictly maps continuous difficulty parameter Delta in [0.05, 0.85] to cognitive load:
 *   - High Delta (>= 0.65): Pre-attentive, low working memory span (2-3 chunks), salient contrast (suitable for 4B models & beginners).
 *   - Mid Delta (0.35 - 0.65): Standard normative psychometric difficulty, balanced relational complexity.
 *   - Low Delta (< 0.35): High working memory span (5-7 chunks), deep relational complexity, fine Weber fraction (challenges frontier LLMs & high-IQ humans).
 * 
 * Features:
 *   1. True Monotonic Difficulty Transfer: Delta mathematically controls sequence length, relational hops, Weber ratio, matrix rank, and distractor similarity.
 *   2. Blocked Latin-Square Shuffling: Eliminates rigid 8-trial cyclic predictability; within every 8-trial block, all paradigms appear once with boundary de-aliasing.
 *   3. Multi-Thematic Surface Skinning: 4 orthogonal skinning contexts (Geometric, Cybernetic, Archaeological, Stellar) make trials feel organic and non-repetitive.
 *   4. Zero Knowledge/Language Bias: Pure structural and relational deduction.
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
  hint_tier2: string; // Tier 2: 微观细节穿透与特定干扰排除
  hint: string;
  stimulus_data: Record<string, any>;
  toSafePayload(unlockedTier?: number): TrialPayload;
}

export type CognitiveTheme = "GEOMETRIC" | "CYBERNETIC" | "ARCHAEOLOGICAL" | "STELLAR";

export class TaskGenerator {
  static readonly SYMBOLS = ["▲", "◆", "●", "■", "★", "▼", "◇", "○", "✦", "✖", "✚", "⬡"];

  static readonly MAPPINGS_A: Record<string, string> = {
    "▲": "◆", "◆": "●", "●": "■", "■": "★", "★": "▲",
    "▼": "◇", "◇": "○", "○": "▼", "✦": "✖", "✖": "✦",
  };

  static readonly MAPPINGS_B: Record<string, string> = {
    "▲": "★", "★": "■", "■": "●", "●": "◆", "◆": "▲",
    "▼": "○", "○": "◇", "◇": "▼", "✦": "✚", "✚": "✦",
  };

  private seedState: number;
  // Blocked shuffle cache for unpredictable trial sequencing
  private blockSchedule: number[] = [];

  constructor(seed?: number) {
    this.seedState = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
    this.initSchedule(120);
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
   * Pre-generates randomized blocked trial-to-paradigm mapping.
   * Ensures every block of 8 contains all 8 paradigms, but in pseudo-random order without boundary repeats.
   */
  private initSchedule(maxTrials: number = 160) {
    const blocksCount = Math.ceil(maxTrials / 8);
    this.blockSchedule = [];
    let lastBlockEnd = -1;

    for (let b = 0; b < blocksCount; b++) {
      let block = [0, 1, 2, 3, 4, 5, 6, 7];
      this.shuffle(block);

      // Prevent boundary duplicate between adjacent blocks
      if (block[0] === lastBlockEnd) {
        const swapIdx = (Math.floor(this.random() * 7)) + 1;
        [block[0], block[swapIdx]] = [block[swapIdx], block[0]];
      }
      lastBlockEnd = block[block.length - 1];
      this.blockSchedule.push(...block);
    }
  }

  /**
   * Selects thematic context dynamically to vary narrative and visual skinning.
   */
  private getTheme(trialIndex: number): CognitiveTheme {
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
      // Perturb without leaking
      const chars = Array.from(correctVal);
      if (chars.length > 2) {
        const p1 = (padIdx * 2) % chars.length;
        const p2 = (p1 + 1) % chars.length;
        [chars[p1], chars[p2]] = [chars[p2], chars[p1]];
      }
      const fakeD = chars.join("");
      if (fakeD.trim() !== correctVal.trim() && !cleanDistractors.includes(fakeD.trim())) {
        cleanDistractors.push(fakeD.trim());
      } else {
        cleanDistractors.push(`${correctVal.trim()} · ${padIdx}`);
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
   * Maps trial index and continuous delta to appropriate paradigm and cognitive load.
   */
  generate(trialIndex: number, delta: number): GeneratedTask {
    const schedIdx = (trialIndex - 1) % this.blockSchedule.length;
    const paradigmCode = this.blockSchedule[schedIdx];
    const theme = this.getTheme(trialIndex);

    // Delta is bounded in [0.05, 0.85]
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
  // 难度阶梯:
  //   delta >= 0.65: 极简模式 (L=3, 单步直接平移或直接替换, 干扰项极易辨识)
  //   0.35 <= delta < 0.65: 标准模式 (L=4, 循环平移 + 字典映射)
  //   delta < 0.35: 高难模式 (L=5~6, 奇偶分流复合映射 + 镜像逆序)
  // ===================================================================================
  private generateCipherTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `cipher_t${String(trialIndex).padStart(3, "0")}`;

    // 科学难度映射: 序列长度随 delta 缩减
    let seqLen = 4;
    let isEasy = delta >= 0.65;
    let isHard = delta < 0.35;

    if (isEasy) seqLen = 3;
    else if (isHard) seqLen = 5;

    const palette = TaskGenerator.SYMBOLS.slice(0, isEasy ? 4 : isHard ? 8 : 6);
    const baseSeq = Array.from({ length: seqLen }, () => this.choice(palette));

    let evolve: (seq: string[]) => string[];
    let ruleName = "";

    if (isEasy) {
      // 极简: 仅向右循环平移 1 位，不产生复杂映射
      ruleName = "右移 1 位循环";
      evolve = (seq) => [seq[seq.length - 1], ...seq.slice(0, -1)];
    } else if (isHard) {
      // 高难: 对称置换 + 奇偶位置分化映射
      ruleName = "对称翻转 + 奇偶分流映射";
      evolve = (seq) => {
        const rev = [...seq].reverse();
        return rev.map((s, idx) => idx % 2 === 0 ? (TaskGenerator.MAPPINGS_A[s] || s) : (TaskGenerator.MAPPINGS_B[s] || s));
      };
    } else {
      // 标准: 左移 1 位 + 一对一字典映射
      ruleName = "左移 1 位 + 字典映射";
      evolve = (seq) => {
        const rot = [...seq.slice(1), seq[0]];
        return rot.map(s => TaskGenerator.MAPPINGS_A[s] || s);
      };
    }

    const step1 = baseSeq;
    const step2 = evolve(step1);
    const step3 = evolve(step2);
    const step4_correct = evolve(step3);

    // 干扰项构造: 高难度下干扰项极度逼真 (Hamming 距离小)，低难度下一眼可破
    let distractors: string[];
    if (isEasy) {
      const d1 = this.sample(palette, seqLen).join(" ");
      const d2 = [...step1].reverse().join(" ");
      const d3 = step2.join(" ");
      distractors = [d1, d2, d3];
    } else if (isHard) {
      // 仅在末尾或首位产生 1 步微小差错
      const d1Mut = [...step4_correct];
      d1Mut[d1Mut.length - 1] = TaskGenerator.MAPPINGS_B[d1Mut[d1Mut.length - 1]] || this.choice(palette);
      const d2Mut = [...step4_correct];
      [d2Mut[0], d2Mut[1]] = [d2Mut[1], d2Mut[0]];
      const d3Mut = evolve(step2); // 少算一步
      distractors = [d1Mut.join(" "), d2Mut.join(" "), d3Mut.join(" ")];
    } else {
      const d1 = step3.join(" ");
      const d2 = [...step4_correct].reverse().join(" ");
      const d3 = [...step3.slice(1), step3[0]].join(" ");
      distractors = [d1, d2, d3];
    }

    const correctStr = step4_correct.join(" ");
    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    // 皮肤叙述包装
    let promptPrefix = "";
    if (theme === "CYBERNETIC") {
      promptPrefix = `【数字总线数据包传输分析】检测到数据流在不同时钟周期的特征寄存器序列状态：`;
    } else if (theme === "ARCHAEOLOGICAL") {
      promptPrefix = `【古遗迹神庙符文铭文推演】破译石板上逐层递进演化的古老符文序列：`;
    } else if (theme === "STELLAR") {
      promptPrefix = `【脉冲星信标引力波位移分析】观测到空间站阵列在各扫描阶段的特征信标排列：`;
    } else {
      promptPrefix = `观察抽象符号序列的动态演化规则：`;
    }

    const prompt = `${promptPrefix}

[第 1 阶段]: ${step1.join(" ")}
[第 2 阶段]: ${step2.join(" ")}
[第 3 阶段]: ${step3.join(" ")}

从选项 A、B、C、D 中推断第 4 阶段的精确演化序列。`;

    const hint_tier1 = `宏观规律方向（1分价值）：当前演化机制为【${ruleName}】。重点观察前 3 个阶段符号在空间位置上的移动方向（左移、右移或对称反转），可直接粗筛排除 50% 位置对不齐的干扰项。`;
    const hint_tier2 = `微观细节穿透（2分价值）：目标序列首位符号必为 '${step4_correct[0]}'，末尾符号必为 '${step4_correct[step4_correct.length - 1]}'。对比候选项的首尾细节可直接锁定唯一定解。`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "SYNTHETIC_CIPHER",
      seq_len: seqLen,
      rule_name: ruleName,
      theme,
    });
  }

  // ===================================================================================
  // 2. 离散点阵密度直觉感知 (DOT_DENSITY)
  // 基于 Weber-Fechner 定律，以韦伯比率 W = Delta N / N_base 控制难度:
  //   delta >= 0.65: 极简模式 (5x5 网格, 差比 W >= 1.0, 一眼看出悬殊差异)
  //   0.35 <= delta < 0.65: 标准模式 (6x6 网格, 差比 W ≈ 0.35)
  //   delta < 0.35: 高难极限 (7x7 网格, 差比 W <= 0.12, 逼近感官临界阈值)
  // ===================================================================================
  private generateDensityTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `density_t${String(trialIndex).padStart(3, "0")}`;

    let gridW = 6;
    let gridH = 6;
    let baseN = 14;
    let diff = 5;

    if (delta >= 0.65) {
      // 极简: 5x5 网格, 目标 16 点 vs 干扰 5~7 点, 差比极高, 绝对显性
      gridW = 5;
      gridH = 5;
      baseN = 6;
      diff = 10; // 目标达到 16 点，干扰项仅 6 点左右，肉眼/小模型极易识别
    } else if (delta < 0.35) {
      // 高难: 7x7 网格 (49格), 基准 25 点, 仅相差 2~3 点
      gridW = 7;
      gridH = 7;
      baseN = 24;
      diff = Math.max(2, Math.round(3 * (delta / 0.35)));
    } else {
      // 标准
      gridW = 6;
      gridH = 6;
      baseN = 14;
      diff = Math.max(4, Math.round(8 * delta));
    }

    const totalCells = gridW * gridH;
    const targetCount = Math.min(totalCells - 2, baseN + diff);
    const dCounts = [
      Math.max(2, baseN),
      Math.max(2, baseN + Math.max(0, diff - 2)),
      Math.max(2, baseN - Math.max(1, Math.floor(diff * 0.5))),
    ].map(c => (c >= targetCount ? targetCount - 1 : c));

    const chosenSym = this.choice(["■", "▲", "★", "◆", "●"]);
    const makeGridStr = (count: number): string => {
      const allIndices = Array.from({ length: totalCells }, (_, i) => i);
      const coords = this.sample(allIndices, count);
      const coordSet = new Set(coords);
      const rows: string[] = [];
      for (let r = 0; r < gridH; r++) {
        const rowCells: string[] = [];
        for (let col = 0; col < gridW; col++) {
          rowCells.push(coordSet.has(r * gridW + col) ? chosenSym : "・");
        }
        rows.push(rowCells.join(" "));
      }
      return rows.join("\n");
    };

    const correctStr = makeGridStr(targetCount);
    const distractors = [
      makeGridStr(dCounts[0]),
      makeGridStr(dCounts[1]),
      makeGridStr(dCounts[2]),
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    let skinTitle = "4 个点阵检测区域";
    if (theme === "CYBERNETIC") skinTitle = "4 组传感芯片像素传感器分布";
    else if (theme === "STELLAR") skinTitle = "4 组星系深空探测视场";
    else if (theme === "ARCHAEOLOGICAL") skinTitle = "4 块古城沙盘遗存标记点阵";

    const prompt = `分析下列 ${skinTitle}（选项 A、B、C、D，网格大小 ${gridW}x${gridH}）。
请通过直觉密度感知判断：哪一个区域包含【最高密度】的特征目标微元 (${chosenSym})？`;

    const hint_tier1 = `宏观规律方向（1分价值）：反向聚焦留白面积。目标高密度区域中未被占用的“背景微元 (・)”最少；干扰项中稀疏空白大片连通，可一眼粗筛排除最稀疏的两个选项。`;
    const hint_tier2 = `微观细节穿透（2分价值）：目标区域内特征微元实际数量达 ${targetCount} 个，明显存在多点聚集的核心簇群；对比干扰项上限仅为 ${Math.max(...dCounts)} 个，可直接排除边缘散落的对比项。`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "DOT_DENSITY",
      target_count: targetCount,
      weber_ratio: (targetCount - baseN) / baseN,
      theme,
    });
  }

  // ===================================================================================
  // 3. 抽象图形矩阵推理 (MATRIX_REASONING, 类似瑞文 Raven 标准推理)
  // 难度阶梯:
  //   delta >= 0.65: 极简 2x2 矩阵 (单特征对角/行列守恒, 任何小模型秒答)
  //   0.35 <= delta < 0.65: 标准 3x3 拉丁方阵 (符号无重复守恒)
  //   delta < 0.35: 高难 3x3 双向复合进位方阵 (符号形态 + 数量计数双维度)
  // ===================================================================================
  private generateMatrixReasoningTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `matrix_t${String(trialIndex).padStart(3, "0")}`;

    if (delta >= 0.65) {
      // 极简: 2x2 极简矩阵推理
      const [s1, s2] = this.sample(TaskGenerator.SYMBOLS, 2);
      // 行列对角守恒:
      // [ s1 ]  [ s2 ]
      // [ s2 ]  [ ?  ]  => correct is s1
      const correctAns = s1;
      const distractors = [s2, this.choice(TaskGenerator.SYMBOLS.filter(s => s !== s1 && s !== s2)), "・"];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

      const gridDisplay = `第 1 行:  [ ${s1} ]  [ ${s2} ]\n第 2 行:  [ ${s2} ]  [ ? ]`;
      const prompt = `分析下列 2x2 基础矩阵的对称守恒规律：\n\n${gridDisplay}\n\n从选项 A、B、C、D 中选出右下角 [ ? ] 处最合理的符号。`;

      const hint_tier1 = `宏观规律方向（1分价值）：主副对角线及行列元素守恒。每一行与每一列均包含 '${s1}' 与 '${s2}' 两种互异元素。`;
      const hint_tier2 = `微观细节穿透（2分价值）：第 2 行第 1 个符号为 '${s2}'，因此右下角必然填入缺失的 '${correctAns}'。`;

      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "MATRIX_REASONING",
        matrix_size: "2x2",
        theme,
      });
    }

    // 3x3 矩阵推理
    const palette = this.sample(TaskGenerator.SYMBOLS, 4);
    const [s1, s2, s3, s4] = palette;

    let correctAns = s2;
    let distractors = [s1, s3, s4];
    let gridDisplay = "";

    if (delta < 0.35) {
      // 高难: 双维度特征进位矩阵 (符号 + 数量)
      const count1 = 1;
      const count2 = 2;
      const count3 = 3;
      correctAns = `[ ${s2.repeat(count3)} ]`;
      distractors = [
        `[ ${s2.repeat(count2)} ]`,
        `[ ${s1.repeat(count3)} ]`,
        `[ ${s3.repeat(count1)} ]`,
      ];
      gridDisplay = `第 1 行:  [ ${s1.repeat(count1)} ]  [ ${s2.repeat(count2)} ]  [ ${s3.repeat(count3)} ]
第 2 行:  [ ${s2.repeat(count1)} ]  [ ${s3.repeat(count2)} ]  [ ${s1.repeat(count3)} ]
第 3 行:  [ ${s3.repeat(count1)} ]  [ ${s1.repeat(count2)} ]  [ ? ]`;
    } else {
      // 标准 3x3 拉丁方阵
      correctAns = s2;
      distractors = [s1, s3, s4];
      gridDisplay = `第 1 行:  [ ${s1} ]  [ ${s2} ]  [ ${s3} ]
第 2 行:  [ ${s2} ]  [ ${s3} ]  [ ${s1} ]
第 3 行:  [ ${s3} ]  [ ${s1} ]  [ ? ]`;
    }

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
    const prompt = `推导下列 3x3 抽象符号矩阵的行列守恒机制：\n\n${gridDisplay}\n\n从选项 A、B、C、D 中推断右下角 [ ? ] 处应填入的符号。`;

    const hint_tier1 = `宏观规律方向（1分价值）：矩阵遵循行列封闭守恒。每行与每列必须同时具备 3 种独立基准符号，可排除重复出现的符号项。`;
    const hint_tier2 = `微观细节穿透（2分价值）：对比前两行，第 3 行已包含第 1 和第 2 种符号，右下角唯独缺失第 3 种基准符号，答案直接锁定为 '${correctAns}'。`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "MATRIX_REASONING",
      matrix_size: "3x3",
      theme,
    });
  }

  // ===================================================================================
  // 4. 空间心智旋转与几何手性辨别 (SPATIAL_ROTATION)
  // 难度阶梯:
  //   delta >= 0.65: 极简 3x3 仅 3 个点, 旋转 0°/90°, 干扰项形状截然不同 (一眼看出)
  //   0.35 <= delta < 0.65: 标准 4x4, 4 微元拐角, 90°/180° 旋转, 干扰项为真实手性镜像体
  //   delta < 0.35: 高难 4x4, 5~6 微元复杂多边形, 270° 旋转, 干扰项为极细微的局部倒挂
  // ===================================================================================
  private generateSpatialRotationTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `rot_t${String(trialIndex).padStart(3, "0")}`;

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
    const gridToStr = (grid: string[][]): string => grid.map(r => r.join(" ")).join("\n");

    if (delta >= 0.65) {
      // 极简 3x3, 仅 3 点构成的明显 "L" 拐角
      const baseGrid = [
        ["■", "・", "・"],
        ["■", "・", "・"],
        ["■", "■", "■"],
      ];
      const correctGrid = rotCw(baseGrid); // 旋转 90 度
      const correctStr = gridToStr(correctGrid);

      // 干扰项是非 L 型的完全不同形状 (一条横线、一个方块、一个单点)
      const dist1 = [
        ["■", "■", "■"],
        ["・", "・", "・"],
        ["・", "・", "・"],
      ];
      const dist2 = [
        ["■", "■", "・"],
        ["■", "■", "・"],
        ["・", "・", "・"],
      ];
      const dist3 = [
        ["・", "■", "・"],
        ["■", "■", "■"],
        ["・", "■", "・"],
      ];
      const distractors = [gridToStr(dist1), gridToStr(dist2), gridToStr(dist3)];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

      const prompt = `基准二维几何构型如下（3x3 网格）：\n\n${gridToStr(baseGrid)}\n\n请从选项 A、B、C、D 中判断：哪一个图形是由基准构型在平面内通过【顺时针旋转】得到的？\n（提示：非同构的形状为畸变体，请直接排除）`;
      const hint_tier1 = `宏观规律方向（1分价值）：微元总数严格守恒。基准图形由 5 个实心点构成，其他点数不为 5 的选项直接排除。`;
      const hint_tier2 = `微观细节穿透（2分价值）：基准拐角为直角弯折，顺时针旋转 90 度后长边变为底横边向右延伸，可明确锁定正确构型。`;

      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "SPATIAL_ROTATION",
        grid_dim: 3,
        theme,
      });
    }

    // 标准与高难 4x4
    const baseGrid = [
      ["■", "■", "・", "・"],
      ["・", "■", "・", "・"],
      ["・", "■", "■", "■"],
      ["・", "・", "・", "・"],
    ];

    const degSteps = delta < 0.35 ? [3, 2] : [1, 2];
    const steps = this.choice(degSteps);
    let rotG = baseGrid;
    for (let i = 0; i < steps; i++) rotG = rotCw(rotG);
    const correctStr = gridToStr(rotG);

    let m1 = mirrorH(baseGrid);
    for (let i = 0; i < steps; i++) m1 = rotCw(m1);

    const m2 = rotCw(rotCw(m1));
    const deformed = rotG.map(r => [...r]);
    // 改变一个微元
    deformed[0][0] = deformed[0][0] === "■" ? "・" : "■";

    const distractors = [gridToStr(m1), gridToStr(m2), gridToStr(deformed)];
    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    const prompt = `基准二维几何构型如下（4x4 网格）：\n\n${gridToStr(baseGrid)}\n\n请从选项 A、B、C、D 中判断：哪一个构型是由基准构型在平面内通过【纯旋转】得到的？\n（注：其余选项为镜像异构体或畸变体，无法仅靠平面旋转重合）`;
    const hint_tier1 = `宏观思考方向（1分价值）：刚体平面旋转的手征性（手性）守恒律。纯旋转不改变左右拐向手性，顺着最长分支走向寻找弯折方向，可粗筛排除需要镜像翻折的选项。`;
    const hint_tier2 = `微观细节穿透（2分价值）：基准长边与侧翼突起的相对拓扑位置恒定，侧翼方向反转的必为镜像体，直接排除即可。`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "SPATIAL_ROTATION",
      grid_dim: 4,
      theme,
    });
  }

  // ===================================================================================
  // 5. 抽象结构守恒律与奇偶/平衡判定 (PARITY_INVARIANT)
  // 难度阶梯:
  //   delta >= 0.65: 单特征绝对守恒 (例如合法样本中 ★ 恒为 1 个, 干扰项为 0 或 3 个, 极显性)
  //   0.35 <= delta < 0.65: 标准实心偶数 + 空心固定 2 个
  //   delta < 0.35: 高难长序列 (8~10), 双重平衡 (实心偶数 + 空心偶数 + 首尾同类)
  // ===================================================================================
  private generateParityInvariantTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `parity_t${String(trialIndex).padStart(3, "0")}`;

    if (delta >= 0.65) {
      // 极简: 序列长度 3, 核心标记符号 ★ 数量恒等于 1
      const commonSyms = ["●", "■", "▲"];
      const makeEasyValid = () => {
        const c1 = this.choice(commonSyms);
        const c2 = this.choice(commonSyms);
        const seq = [c1, "★", c2];
        this.shuffle(seq);
        return seq.join(" ");
      };
      const sample1 = makeEasyValid();
      const sample2 = makeEasyValid();
      const sample3 = makeEasyValid();
      const correctStr = makeEasyValid();

      // 干扰项: 0 个 ★，或者 2~3 个 ★
      const d1 = [this.choice(commonSyms), this.choice(commonSyms), this.choice(commonSyms)].join(" ");
      const d2 = ["★", "★", this.choice(commonSyms)].join(" ");
      const d3 = ["★", "★", "★"].join(" ");

      const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, [d1, d2, d3]);
      const prompt = `以下 3 组示例序列均严格满足某种抽象结构平衡法则（合法样本）：\n\n[样本 1]: ${sample1}\n[样本 2]: ${sample2}\n[样本 3]: ${sample3}\n\n请从选项 A、B、C、D 中判断：哪一个序列同样严格满足该守恒法则？`;

      const hint_tier1 = `宏观规律方向（1分价值）：统计特定特征符号的出现频率，与具体排列次序无关。`;
      const hint_tier2 = `微观细节穿透（2分价值）：所有合法样本均严格包含且仅包含 1 个 '★' 符号。选项中包含 0 个或多个 '★' 的均为伪造序列。`;

      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "PARITY_INVARIANT",
        difficulty_mode: "easy_single_parity",
        theme,
      });
    }

    // 标准与高难
    const solidSyms = ["●", "■", "▲"];
    const hollowSyms = ["○", "□", "△"];
    const lenMult = delta < 0.35 ? 2 : 1;

    const makeValid = (): string[] => {
      const nSolid = 2 * lenMult;
      const solids = Array.from({ length: nSolid }, () => this.choice(solidSyms));
      const hollows = Array.from({ length: 2 }, () => this.choice(hollowSyms));
      const inner = this.shuffle([...solids, hollows[0]]);
      return [...inner, hollows[1]];
    };

    const makeInvalid = (mode: number): string[] => {
      if (mode === 0) {
        // 3 hollows
        return this.shuffle([
          ...Array.from({ length: 2 * lenMult }, () => this.choice(solidSyms)),
          ...Array.from({ length: 3 }, () => this.choice(hollowSyms)),
        ]);
      } else if (mode === 1) {
        // 1 hollow
        return this.shuffle([
          ...Array.from({ length: 2 * lenMult }, () => this.choice(solidSyms)),
          ...Array.from({ length: 1 }, () => this.choice(hollowSyms)),
        ]);
      } else {
        // odd solids
        return this.shuffle([
          ...Array.from({ length: 2 * lenMult + 1 }, () => this.choice(solidSyms)),
          ...Array.from({ length: 2 }, () => this.choice(hollowSyms)),
        ]);
      }
    };

    const sample1 = makeValid().join(" ");
    const sample2 = makeValid().join(" ");
    const sample3 = makeValid().join(" ");
    const correctStr = makeValid().join(" ");
    const distractors = [makeInvalid(0).join(" "), makeInvalid(1).join(" "), makeInvalid(2).join(" ")];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);
    const prompt = `以下 3 组示例序列均严格满足某种抽象结构平衡法则（合法样本）：\n\n[样本 1]: ${sample1}\n[样本 2]: ${sample2}\n[样本 3]: ${sample3}\n\n请从选项 A、B、C、D 中判断：哪一个序列同样严格满足该守恒法则？`;

    const hint_tier1 = `宏观规律方向（1分价值）：结构平衡法则基于‘实心图形(●/■/▲)’与‘空心图形(○/□/△)’的数量统计特征，与前后次序无关。`;
    const hint_tier2 = `微观细节穿透（2分价值）：所有合法样本均满足：空心图形恰好为 2 个，且实心图形总数为偶数。选项中空心数为 1、3 或实心为奇数的均直接排除。`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "PARITY_INVARIANT",
      difficulty_mode: delta < 0.35 ? "hard_mult" : "standard",
      theme,
    });
  }

  // ===================================================================================
  // 6. 抽象逻辑关系网络与传递性推断 (RELATIONAL_TRANSITIVITY)
  // 难度阶梯:
  //   delta >= 0.65: 极简 3 节点，按序直出 A ▷ B, B ▷ C => A ▷ C (小模型 100% 答对)
  //   0.35 <= delta < 0.65: 标准 4 节点，无序打乱，2~3 跳
  //   delta < 0.35: 高难 5~6 节点网状拓扑，4 跳长链或多分支消歧
  // ===================================================================================
  private generateRelationalTransitivityTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `trans_t${String(trialIndex).padStart(3, "0")}`;

    if (delta >= 0.65) {
      // 极简 3 节点直连链
      const syms = this.sample(TaskGenerator.SYMBOLS, 3);
      const [s0, s1, s2] = syms;
      const premise = `${s0} ▷ ${s1} ， ${s1} ▷ ${s2}`;
      const correctAns = `${s0} ▷ ${s2}`;
      const distractors = [
        `${s2} ▷ ${s0}`, // 逆序
        `${s1} ▷ ${s0}`, // 逆序
        `${s2} ▷ ${s1}`, // 逆序
      ];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

      const prompt = `已知下列抽象符号之间的直接序位关系（'X ▷ Y' 表示 X 的层级严格先于 Y）：\n\n前提条件：${premise}\n\n依据传递性公理（若 X ▷ Y 且 Y ▷ Z，则 X ▷ Z），下列哪一个命题必然成立？`;
      const hint_tier1 = `宏观规律方向（1分价值）：单向拓扑流向。起点为 '${s0}'，终点为 '${s2}'。`;
      const hint_tier2 = `微观细节穿透（2分价值）：首尾跨跳必然得出 '${correctAns}'；反向断言均为伪命题。`;

      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "RELATIONAL_TRANSITIVITY",
        node_count: 3,
        theme,
      });
    }

    // 标准与高难
    const nodeCount = delta < 0.35 ? 6 : 4;
    const syms = this.sample(TaskGenerator.SYMBOLS, nodeCount);

    const pairsPresented: string[] = [];
    for (let i = 0; i < nodeCount - 1; i++) {
      pairsPresented.push(`${syms[i]} ▷ ${syms[i + 1]}`);
    }
    this.shuffle(pairsPresented);

    const targetHops = delta < 0.35 ? nodeCount - 1 : 2;
    const correctAns = `${syms[0]} ▷ ${syms[targetHops]}`;

    const invalidPairs: string[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < i; j++) {
        invalidPairs.push(`${syms[i]} ▷ ${syms[j]}`);
      }
    }
    const distractors = this.sample(invalidPairs, 3);
    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

    const prompt = `系统已知下列抽象符号之间的直接序位关系（'X ▷ Y' 表示 X 的层级严格先于 Y）：\n\n已知前提：${pairsPresented.join(" ， ")}\n\n依据传递性公理（若 X ▷ Y 且 Y ▷ Z，则 X ▷ Z），判断下列哪一个命题必然成立？`;
    const hint_tier1 = `宏观规律方向（1分价值）：有向图拓扑链条构建。寻找只在左侧出现的始祖节点与只在右侧出现的末端节点。`;
    const hint_tier2 = `微观细节穿透（2分价值）：拓扑全序关系为 '${syms.join(" ▷ ")}'。选项中断言后驱先于前驱的逆向命题直接排除。`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "RELATIONAL_TRANSITIVITY",
      node_count: nodeCount,
      theme,
    });
  }

  // ===================================================================================
  // 7. 符号序列双轨周期递增 (SEQUENCE_PROGRESSION)
  // 难度阶梯:
  //   delta >= 0.65: 单轨简单线性等差 (符号恒定, +2 等差, 极简)
  //   0.35 <= delta < 0.65: 符号 3 周期 + 一阶等差数列
  //   delta < 0.35: 符号 6 周期 + 二阶加速等差 (差分递增)
  // ===================================================================================
  private generateSequenceProgressionTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `seq_t${String(trialIndex).padStart(3, "0")}`;

    if (delta >= 0.65) {
      // 极简单轨: 符号固定为同一个，数值每次 +2 (如 2, 4, 6, 8, [?])
      const sym = this.choice(TaskGenerator.SYMBOLS);
      const startNum = this.choice([2, 4, 6]);
      const seqItems = [
        `[${sym} ${startNum}]`,
        `[${sym} ${startNum + 2}]`,
        `[${sym} ${startNum + 4}]`,
        `[${sym} ${startNum + 6}]`,
      ];
      const correctAns = `[${sym} ${startNum + 8}]`;
      const distractors = [
        `[${sym} ${startNum + 7}]`,
        `[${sym} ${startNum + 9}]`,
        `[${sym} ${startNum + 10}]`,
      ];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

      const prompt = `观察下列序列的递增演化规律：\n\n${seqItems.join("  ")}  [ ? ]\n\n推断末尾 [ ? ] 处所对应的组合。`;
      const hint_tier1 = `宏观规律方向（1分价值）：基础一阶线性等差数列，相邻项固定递增 2。`;
      const hint_tier2 = `微观细节穿透（2分价值）：前一项为 ${startNum + 6}，加上 2 得到结果 ${startNum + 8}。`;

      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "SEQUENCE_PROGRESSION",
        difficulty_mode: "easy_arithmetic",
        theme,
      });
    }

    // 标准与高难
    const cycleSyms = delta < 0.35 ? ["▲", "◆", "●", "■", "★", "✦"] : ["▲", "◆", "●"];
    const startSymIdx = Math.floor(this.random() * cycleSyms.length);
    const stepDiff = this.choice([2, 3, 4]);
    const startNum = Math.floor(this.random() * 8) + 1;

    const seqItems: string[] = [];
    let curNum = startNum;
    for (let i = 0; i < 4; i++) {
      const sym = cycleSyms[(startSymIdx + i) % cycleSyms.length];
      seqItems.push(`[${sym} ${curNum}]`);
      if (delta < 0.35) {
        // 二阶加速
        curNum += stepDiff * (i + 1);
      } else {
        curNum += stepDiff;
      }
    }

    const targetSym = cycleSyms[(startSymIdx + 4) % cycleSyms.length];
    const targetNum = delta < 0.35 ? curNum + stepDiff * 5 : curNum;
    const correctAns = `[${targetSym} ${targetNum}]`;

    const distractors = [
      `[${targetSym} ${targetNum - stepDiff}]`,
      `[${cycleSyms[(startSymIdx + 3) % cycleSyms.length]} ${targetNum}]`,
      `[${cycleSyms[(startSymIdx + 5) % cycleSyms.length]} ${targetNum + stepDiff}]`,
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
    const prompt = `观察下列符号与数值的双轨演化序列：\n\n${seqItems.join("  ")}  [ ? ]\n\n推断末尾 [ ? ] 处所对应的符号与数值组合。`;

    const hint_tier1 = `宏观规律方向（1分价值）：符号轨与数值轨独立解耦分析。符号遵循周期有限循环群，数值遵循等差演进。`;
    const hint_tier2 = `微观细节穿透（2分价值）：目标符号必定为 '${targetSym}'，末尾目标数值计算值为 ${targetNum}。`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "SEQUENCE_PROGRESSION",
      difficulty_mode: delta < 0.35 ? "hard_accelerating" : "standard",
      theme,
    });
  }

  // ===================================================================================
  // 8. 几何连通性与拓扑网络圈数 (TOPOLOGICAL_LOOPS)
  // 彻底优化纯文本大模型的自解释网络图结构:
  //   delta >= 0.65: 极简开链 (0 环) vs 闭环 (1 环), 图连通自解释
  //   0.35 <= delta < 0.65: 标准单环回路判定
  //   delta < 0.35: 高难 5 节点连通图欧拉闭合回路计数 (0 环 / 1 环 / 2 环)
  // ===================================================================================
  private generateTopologicalLoopsTask(trialIndex: number, delta: number, theme: CognitiveTheme): GeneratedTask {
    const stimulus_id = `topo_t${String(trialIndex).padStart(3, "0")}`;

    if (delta >= 0.65) {
      // 极简: 开链 (0 闭环) vs 闭圈 (1 闭环)
      const openPaths = [
        "A ── B ── C",
        "X ── Y ── Z",
        "P ── Q ── R",
      ];
      const closedPaths = [
        "A ── B ── C ── A",
        "X ── Y ── Z ── X",
        "P ── Q ── R ── P",
      ];
      // 参考样本全为开链 (0 闭环回路)
      const correctAns = `[ M ── N ── K ]`; // 也是开链
      const distractors = [
        `[ M ── N ── K ── M ]`, // 闭环
        `[ M ── N ── M ]`,       // 闭环
        `[ K ── M ── N ── K ]`, // 闭环
      ];
      const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

      const prompt = `下列 3 个参考拓扑路径具有相同的几何连通特征（【开放路径，无闭合环路】）：\n\n参考样本:  [ ${openPaths[0]} ]    [ ${openPaths[1]} ]    [ ${openPaths[2]} ]\n\n请从选项 A、B、C、D 中选出同样属于【开放路径（无闭合回路）】的选项。`;
      const hint_tier1 = `宏观规律方向（1分价值）：拓扑路径闭合性。参考样本首尾节点均不相连，无回闭回路。`;
      const hint_tier2 = `微观细节穿透（2分价值）：目标项首末节点必须互异，选项中首末节点相同（形成回环闭圈）的直接排除。`;

      return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
        task_type: "TOPOLOGICAL_LOOPS",
        topology_type: "open_path_zero_loop",
        theme,
      });
    }

    // 标准与高难: 拓扑欧拉环路计数
    const zeroLoop = ["A ── B ── C", "X ── Y ── Z", "P ── Q ── R", "D ── E ── F"];
    const oneLoop = ["A ── B ── C ── A", "X ── Y ── Z ── X", "P ── Q ── R ── P", "1 ── 2 ── 3 ── 1"];
    const twoLoops = [
      "(A─B─A) ∪ (C─D─C)",
      "(X─Y─X) ∪ (Z─W─Z)",
      "(1─2─1) ∪ (3─4─3)",
    ];

    const kLoops = this.choice([0, 1, 2]);
    const loopGroups = [zeroLoop, oneLoop, twoLoops];
    const targetPool = loopGroups[kLoops];

    const samples = this.sample(targetPool, Math.min(3, targetPool.length));
    const availCorrect = targetPool.filter(s => !samples.includes(s));
    const correctVal = availCorrect.length > 0 ? this.choice(availCorrect) : this.choice(targetPool);
    const correctAns = `[ ${correctVal} ]`;

    const otherPool = loopGroups.filter((_, idx) => idx !== kLoops).flat();
    const distractorSyms = this.sample(otherPool, 3);
    const distractors = distractorSyms.map(s => `[ ${s} ]`);

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);
    const prompt = `下列 3 个参考拓扑连通构型共享同一种欧拉回路特征（包含 ${kLoops} 个独立闭合内腔）：\n\n参考样本:  [ ${samples[0]} ]    [ ${samples[1]} ]    [ ${samples[2]} ]\n\n从选项 A、B、C、D 中选出同样严格包含 ${kLoops} 个独立闭合回路的构型。`;

    const hint_tier1 = `宏观规律方向（1分价值）：拓扑欧拉示性数与闭合环路计数。重点统计图中可以形成完整封闭巡回的回路个数。`;
    const hint_tier2 = `微观细节穿透（2分价值）：参考构型严格包含 ${kLoops} 个闭合环路，其余包含更多或更少闭合环路的构型直接排除。`;

    return this.wrapTask(stimulus_id, delta, prompt, options, correctOption, signalType, hint_tier1, hint_tier2, {
      task_type: "TOPOLOGICAL_LOOPS",
      loop_count: kLoops,
      theme,
    });
  }
}

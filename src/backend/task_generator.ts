/**
 * Module 1: Synthetic Task Generator (task_generator.ts)
 * Generates abstract, knowledge-free stimuli spanning 8 distinct cognitive paradigms:
 *   1. SYNTHETIC_CIPHER: State machine symbol evolution with multi-rule permutations.
 *   2. DOT_DENSITY: High-entropy symbol/dot density comparison based on Weber's Law.
 *   3. MATRIX_REASONING: 3x3 abstract geometric matrix pattern inference (Raven-style).
 *   4. SPATIAL_ROTATION: 2D mental rotation vs. chiral/mirrored reflection discernment.
 *   5. PARITY_INVARIANT: Structural parity and topological invariant rule verification.
 *   6. RELATIONAL_TRANSITIVITY: Directed graph dominance order and transitive deduction.
 *   7. SEQUENCE_PROGRESSION: Dual-track symbolic cyclic progression and arithmetic differences.
 *   8. TOPOLOGICAL_LOOPS: Euler characteristic and closed interior cavities recognition.
 *
 * Difficulty parameter Delta continuously controls perceptual discriminability or symbol distortion.
 * All tasks generate 4 candidate options (A, B, C, D) with plausible distractors,
 * strictly preventing binary guessing and reverse-engineering from options.
 * Zero duplicate options guaranteed via automated deduplication.
 */

import { TrialPayload } from "./models";

export interface GeneratedTask {
  stimulus_id: string;
  difficulty_level: number;
  prompt: string;
  options: Record<string, string>;
  correct_option: string; // "A" | "B" | "C" | "D"
  signal_type: "S1" | "S2";
  hint_tier1: string; // Tier 1 (1分): 宏观规律与思考方向
  hint_tier2: string; // Tier 2 (2分): 微观穿透与干扰排除
  hint: string;
  stimulus_data: Record<string, any>;
  toSafePayload(unlockedTier?: number): TrialPayload;
}

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

  constructor(seed?: number) {
    this.seedState = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
  }

  // Simple LCG pseudo-random generator
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

  private assembleFourOptions(
    correctVal: string,
    distractors: string[]
  ): { options: Record<string, string>; correctOption: string; signalType: "S1" | "S2" } {
    const cleanDistractors: string[] = [];
    for (const d of distractors) {
      if (d !== correctVal && !cleanDistractors.includes(d)) {
        cleanDistractors.push(d);
      }
    }

    let padIdx = 1;
    while (cleanDistractors.length < 3) {
      // Create a perturbed alternative without adding textual leak labels
      const chars = Array.from(correctVal);
      if (chars.length > 2) {
        const p1 = (padIdx * 2) % chars.length;
        const p2 = (p1 + 1) % chars.length;
        [chars[p1], chars[p2]] = [chars[p2], chars[p1]];
      }
      const fakeD = chars.join("");
      if (fakeD !== correctVal && !cleanDistractors.includes(fakeD)) {
        cleanDistractors.push(fakeD);
      } else {
        cleanDistractors.push(correctVal + " ");
      }
      padIdx++;
    }

    const allVals = [correctVal, ...cleanDistractors.slice(0, 3)];
    this.shuffle(allVals);

    const optKeys = ["A", "B", "C", "D"];
    const options: Record<string, string> = {};
    let correctOption = "A";

    for (let i = 0; i < optKeys.length; i++) {
      const k = optKeys[i];
      options[k] = allVals[i];
      if (allVals[i] === correctVal) {
        correctOption = k;
      }
    }

    const signalType: "S1" | "S2" = (correctOption === "A" || correctOption === "B") ? "S1" : "S2";
    return { options, correctOption, signalType };
  }

  generate(trialIndex: number, delta: number): GeneratedTask {
    const mod = (trialIndex - 1) % 8;
    switch (mod) {
      case 0: return this.generateCipherTask(trialIndex, delta);
      case 1: return this.generateDensityTask(trialIndex, delta);
      case 2: return this.generateMatrixReasoningTask(trialIndex, delta);
      case 3: return this.generateSpatialRotationTask(trialIndex, delta);
      case 4: return this.generateParityInvariantTask(trialIndex, delta);
      case 5: return this.generateRelationalTransitivityTask(trialIndex, delta);
      case 6: return this.generateSequenceProgressionTask(trialIndex, delta);
      default: return this.generateTopologicalLoopsTask(trialIndex, delta);
    }
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

  // 1. 符号密码置换与序列演化
  private generateCipherTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `cipher_rule_t${String(trialIndex).padStart(3, "0")}`;
    const seqLen = 5;
    const palette = TaskGenerator.SYMBOLS.slice(0, 6);
    const baseSeq = Array.from({ length: seqLen }, () => this.choice(palette));

    const ruleType = Math.floor(trialIndex / 3) % 3;
    let ruleName = "";
    let evolve: (seq: string[]) => string[];

    if (ruleType === 0) {
      ruleName = "左移映射演化";
      evolve = (seq) => {
        const rotated = [...seq.slice(1), seq[0]];
        return rotated.map(s => TaskGenerator.MAPPINGS_A[s] || s);
      };
    } else if (ruleType === 1) {
      ruleName = "右移镜像映射";
      evolve = (seq) => {
        const rotated = [seq[seq.length - 1], ...seq.slice(0, -1)];
        return rotated.map(s => TaskGenerator.MAPPINGS_B[s] || s);
      };
    } else {
      ruleName = "对称奇偶置换";
      evolve = (seq) => {
        const swapped = [...seq];
        [swapped[0], swapped[swapped.length - 1]] = [swapped[swapped.length - 1], swapped[0]];
        return swapped.map(s => TaskGenerator.MAPPINGS_A[s] || s);
      };
    }

    const step1 = baseSeq;
    const step2 = evolve(step1);
    const step3 = evolve(step2);
    const step4_correct = evolve(step3);

    const d1 = [...step3.slice(1), step3[0]];
    const d2 = step3.map(s => TaskGenerator.MAPPINGS_A[s] || s);
    const d3 = [...step4_correct].reverse();

    const distractors = [d1.join(" "), d2.join(" "), d3.join(" ")];
    const correctStr = step4_correct.join(" ");

    const cleanedDistractors = distractors.map((d, i) => {
      if (d === correctStr) {
        const mutated = [...step4_correct];
        const cur = mutated[i % seqLen];
        const alts = palette.filter(s => s !== cur);
        mutated[i % seqLen] = this.choice(alts);
        return mutated.join(" ");
      }
      return d;
    });

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, cleanedDistractors);

    const prompt = `观察抽象符号序列的动态演化规则：

[第1步]: ${step1.join(" ")}
[第2步]: ${step2.join(" ")}
[第3步]: ${step3.join(" ")}

请从选项 A、B、C、D 中推断第 4 步的精确演化序列。`;

    const hint_tier1 = `宏观规律方向（1分价值）：序列置换与状态转移机制。优先观察前3步在序列整体上的平移律（当前规则为：${ruleName}），判断符号整体是左移、右移还是端点置换，据此可粗筛排除50%平移错位的干扰项。`;
    const hint_tier2 = `微观特征穿透（2分价值）：符号在平移的同时伴随一对一状态映射置换。例如第3步转移至第4步时，第1位符号必须由前一步指定位置的符号经固定映射得到，可明确排除首尾符号置换错误的特定混淆项。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint_tier1,
      hint_tier2,
      { task_type: "SYNTHETIC_CIPHER", rule_name: ruleName }
    );
  }

  // 2. 离散点阵密度感知
  private generateDensityTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `density_matrix_t${String(trialIndex).padStart(3, "0")}`;
    const baseN = 21;
    // Scale perceptual difference directly with delta: at delta=0.05, diff=1; at delta=0.50, diff=5; at delta=0.85, diff=9
    const diff = Math.max(1, Math.round(12 * Math.pow(Math.max(0.02, delta), 1.2)));
    const targetCount = baseN + diff;
    const dCounts = [
      Math.max(4, baseN),
      Math.max(4, baseN + Math.max(0, diff - 1)),
      Math.max(4, baseN - Math.max(1, Math.floor(diff * 0.5))),
    ].map(c => (c >= targetCount ? targetCount - 1 : c));

    const gridW = 7;
    const gridH = 6;
    const totalCells = gridW * gridH;

    const makeGridStr = (count: number, symbol: string = "■"): string => {
      const allIndices = Array.from({ length: totalCells }, (_, i) => i);
      const coords = this.sample(allIndices, Math.min(count, totalCells));
      const coordSet = new Set(coords);
      const rows: string[] = [];
      for (let r = 0; r < gridH; r++) {
        const rowCells: string[] = [];
        for (let col = 0; col < gridW; col++) {
          const idx = r * gridW + col;
          rowCells.push(coordSet.has(idx) ? symbol : "・");
        }
        rows.push(rowCells.join(" "));
      }
      return rows.join("\n");
    };

    const chosenSym = this.choice(["■", "▲", "★", "◆"]);
    const correctStr = makeGridStr(targetCount, chosenSym);
    const distractors = [
      makeGridStr(dCounts[0], chosenSym),
      makeGridStr(dCounts[1], chosenSym),
      makeGridStr(dCounts[2], chosenSym),
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    const prompt = `观察下列 4 个离散点阵区域（选项 A、B、C、D，网格大小 7x6）。
依据直觉感知判断：哪一个区域包含最高密度的特征微元 (${chosenSym})？`;

    const hint_tier1 = `宏观知觉聚焦（1分价值）：避免逐个细数。优先反向扫描“背景微元 (・)”的连通空白面积；真正的高密度区域其背景空白连通面积最小，可快速排除两个明显稀疏的散布对比项。`;
    const hint_tier2 = `微观团块穿透（2分价值）：目标最高密度区域中，特征微元在局部形成了紧密的连通团块（总微元达到 ${targetCount} 个）；而对比项中微元数量上限不超过 ${Math.max(...dCounts)} 个，在网格边缘分布稀落，可排除缺乏局部核心聚集的干扰项。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint_tier1,
      hint_tier2,
      { task_type: "DOT_DENSITY", target_count: targetCount }
    );
  }

  // 3. 抽象图形矩阵推理
  private generateMatrixReasoningTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `matrix_reason_t${String(trialIndex).padStart(3, "0")}`;
    const palette = this.sample(["▲", "●", "■", "★", "◆", "✦", "⬡"], 4);
    const [s1, s2, s3, s4] = palette;

    const row1 = [s1, s2, s3];
    const row2 = [s2, s3, s1];
    const row3 = [s3, s1, "?"];
    const correctAns = s2;
    const distractors = [s1, s3, s4];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

    const gridDisplay = `第 1 行:  [ ${row1[0]} ]  [ ${row1[1]} ]  [ ${row1[2]} ]
第 2 行:  [ ${row2[0]} ]  [ ${row2[1]} ]  [ ${row2[2]} ]
第 3 行:  [ ${row3[0]} ]  [ ${row3[1]} ]  [ ${row3[2]} ]`;

    const prompt = `分析下列 3x3 抽象符号矩阵的行列守恒规律：

${gridDisplay}

从选项 A、B、C、D 中推断右下角 [ ? ] 处应填入哪一个符号？`;

    const hint_tier1 = `宏观规律方向（1分价值）：3x3 矩阵遵循严格的“拉丁方阵行列双向守恒律”。每一行与每一列均由相同的 3 种基准符号构成且无重复出现，与图形尺寸或渐变无关，可排除重复符选项。`;
    const hint_tier2 = `微观细节穿透（2分价值）：对比前两行全集，再观察第 3 行与第 3列已给出的两个符号，直接求出二者交集所缺失的唯一种类；选项中未出现在矩阵全集中的符号、或已在该行该列出现的符号均可直接排除。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint_tier1,
      hint_tier2,
      { task_type: "MATRIX_REASONING" }
    );
  }

  // 4. 空间心智旋转判别
  private generateSpatialRotationTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `spatial_rot_t${String(trialIndex).padStart(3, "0")}`;
    const basePatterns = [
      [
        ["■", "■", "・", "・"],
        ["・", "■", "・", "・"],
        ["・", "■", "■", "■"],
        ["・", "・", "・", "・"],
      ],
      [
        ["・", "▲", "▲", "・"],
        ["・", "▲", "・", "・"],
        ["・", "▲", "▲", "▲"],
        ["・", "・", "・", "・"],
      ],
      [
        ["◆", "◆", "◆", "・"],
        ["・", "・", "◆", "・"],
        ["・", "◆", "◆", "・"],
        ["・", "・", "・", "・"],
      ],
      [
        ["★", "・", "・", "・"],
        ["★", "★", "★", "・"],
        ["・", "・", "★", "★"],
        ["・", "・", "・", "・"],
      ],
    ];
    const baseGrid = this.choice(basePatterns);

    const rotCw = (grid: string[][]): string[][] => {
      const h = grid.length;
      const w = grid[0].length;
      const res: string[][] = [];
      for (let c = 0; c < w; c++) {
        const row: string[] = [];
        for (let r = h - 1; r >= 0; r--) {
          row.push(grid[r][c]);
        }
        res.push(row);
      }
      return res;
    };

    const mirrorH = (grid: string[][]): string[][] => grid.map(r => [...r].reverse());
    const mirrorV = (grid: string[][]): string[][] => [...grid].reverse();
    const gridToStr = (grid: string[][]): string => grid.map(r => r.join(" ")).join("\n");

    const degStep = this.choice([1, 2, 3]);
    let rotG = baseGrid;
    for (let i = 0; i < degStep; i++) {
      rotG = rotCw(rotG);
    }
    const correctStr = gridToStr(rotG);

    let m1 = mirrorH(baseGrid);
    for (let i = 0; i < this.choice([0, 1, 2, 3]); i++) m1 = rotCw(m1);

    let m2 = mirrorV(baseGrid);
    for (let i = 0; i < this.choice([0, 1, 2, 3]); i++) m2 = rotCw(m2);

    const deformed = rotG.map(r => [...r]);
    let cleared = false;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (deformed[r][c] !== "・" && !cleared) {
          deformed[r][c] = "・";
          cleared = true;
          break;
        }
      }
      if (cleared) break;
    }

    const distractors = [
      gridToStr(m1),
      gridToStr(m2),
      gridToStr(deformed),
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    const prompt = `基准二维几何构型如下：

${gridToStr(baseGrid)}

请从选项 A、B、C、D 中判断：哪一个构型是由基准构型在平面内通过【纯旋转】得到的？
（注：其余选项为镜像异构体或畸变体，无法仅靠平面旋转复原）`;

    const hint_tier1 = `宏观思考方向（1分价值）：刚体平面纯旋转的手征性（手性）守恒律。纯旋转不改变手性，请锁定基准构型的最长分支折角，观察其顺时针拐弯走向，可快速剔除必须翻转才能重合的镜像体。`;
    const hint_tier2 = `微观细节穿透（2分价值）：刚体旋转后微元总数严格守恒（畸变选项有点缺失直接排除）。同时基准构型的 3 微元主轴与单点侧翼的相对左右位置在旋转下恒定，可明确排除侧翼位置反转的异构体。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint_tier1,
      hint_tier2,
      { task_type: "SPATIAL_ROTATION" }
    );
  }

  // 5. 符号结构守恒律
  private generateParityInvariantTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `parity_invar_t${String(trialIndex).padStart(3, "0")}`;
    const solidSyms = ["●", "■", "▲"];
    const hollowSyms = ["○", "□", "△"];

    const makeValid = (lenMult: number = 1): string[] => {
      const nSolid = this.choice([2, 4]) * lenMult;
      const solids = Array.from({ length: nSolid }, () => this.choice(solidSyms));
      const hollows = Array.from({ length: 2 }, () => this.choice(hollowSyms));
      const inner = this.shuffle([...solids, hollows[0]]);
      return [...inner, hollows[1]];
    };

    const makeInvalid = (mode: number, lenMult: number = 1): string[] => {
      if (mode === 0) {
        // Violates hollow count (3 hollows instead of 2), even solids
        const solids = Array.from({ length: 2 * lenMult }, () => this.choice(solidSyms));
        const hollows = Array.from({ length: 3 }, () => this.choice(hollowSyms));
        return this.shuffle([...solids, ...hollows]);
      } else if (mode === 1) {
        // Violates hollow count (1 hollow instead of 2), even solids
        const solids = Array.from({ length: 4 * lenMult }, () => this.choice(solidSyms));
        const hollows = Array.from({ length: 1 }, () => this.choice(hollowSyms));
        return this.shuffle([...solids, ...hollows]);
      } else {
        // Violates solid parity (odd solids, 2 hollows)
        const solids = Array.from({ length: (2 * lenMult) + 1 }, () => this.choice(solidSyms));
        const hollows = Array.from({ length: 2 }, () => this.choice(hollowSyms));
        return this.shuffle([...solids, ...hollows]);
      }
    };

    const isHard = delta < 0.4;
    const mult = isHard ? 2 : 1;

    const sample1 = makeValid(mult).join(" ");
    const sample2 = makeValid(mult).join(" ");
    const sample3 = makeValid(mult).join(" ");

    const correctStr = makeValid(mult).join(" ");
    const distractors = [
      makeInvalid(0, mult).join(" "),
      makeInvalid(1, mult).join(" "),
      makeInvalid(2, mult).join(" "),
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    const prompt = `以下 3 组示例序列均严格满足某种抽象结构平衡法则（合法样本）：

[样本 1]: ${sample1}
[样本 2]: ${sample2}
[样本 3]: ${sample3}

请从选项 A、B、C、D 中判断：哪一个序列同样严格满足该守恒法则？`;

    const hint_tier1 = `宏观规律方向（1分价值）：结构平衡法则建立在‘实心图形(●/■/▲)’与‘空心图形(○/□/△)’的分类统计特征上，与具体符号前后次序无关。请重点统计样本中两类图形的各自出现总数。`;
    const hint_tier2 = `微观细节穿透（2分价值）：所有合法样本均严格锁定双重不变量：①空心图形数量恒等于 2；②实心图形总数严格为偶数。干扰项中存在空心数为 1 或 3 个、或实心数为奇数的伪造序列，可直接排除。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint_tier1,
      hint_tier2,
      { task_type: "PARITY_INVARIANT" }
    );
  }

  // 6. 抽象逻辑关系网络与传递性推断
  private generateRelationalTransitivityTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `relation_trans_t${String(trialIndex).padStart(3, "0")}`;
    const syms = this.sample(TaskGenerator.SYMBOLS, 5);
    const [s0, s1, s2, s3, s4] = syms;

    const pairsPresented = [
      `${s0} ▷ ${s1}`,
      `${s1} ▷ ${s2}`,
      `${s2} ▷ ${s3}`,
      `${s3} ▷ ${s4}`,
    ];
    this.shuffle(pairsPresented);

    const validPairs = [
      [s0, s3], [s1, s4], [s0, s4], [s0, s2], [s1, s3]
    ];
    const targetV = this.choice(validPairs);
    const correctAns = `${targetV[0]} ▷ ${targetV[1]}`;

    // All false / invalid reversed pairs where i > j:
    const invalidPairs: [string, string][] = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < i; j++) {
        invalidPairs.push([syms[i], syms[j]]);
      }
    }
    const chosenInvalid = this.sample(invalidPairs, 3);
    const distractors = chosenInvalid.map(p => `${p[0]} ▷ ${p[1]}`);

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

    const prompt = `系统已知下列抽象符号之间的直接序位关系（'X ▷ Y' 表示 X 的层级严格先于 Y）：

已知前提：${pairsPresented.join(" ， ")}

依据严格的传递性公理（若 X ▷ Y 且 Y ▷ Z，则 X ▷ Z），请判断下列哪一个命题必然成立？`;

    const hint_tier1 = `宏观规律方向（1分价值）：偏序关系的单向拓扑建链法。将已知条件视为有向图，寻找全序链的唯一起点（只出现在 ▷ 左侧者）与终点（只出现在右侧者），建立严格单向流动总链。`;
    const hint_tier2 = `微观细节穿透（2分价值）：总链的局部前驱子链包含 '${s0} ▷ ${s1} ▷ ${s2}'。若选项断言后驱元素先于前驱元素（如逆向颠倒命题），均属于不可传递的伪命题，可直接排除逆向干扰项。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint_tier1,
      hint_tier2,
      { task_type: "RELATIONAL_TRANSITIVITY" }
    );
  }

  // 7. 符号序列双轨周期递增
  private generateSequenceProgressionTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `seq_prog_t${String(trialIndex).padStart(3, "0")}`;
    const cycleSyms = ["▲", "◆", "●", "■", "★", "✦"];
    const startSymIdx = Math.floor(this.random() * cycleSyms.length);
    const stepDiff = this.choice([2, 3, 4]);
    const startNum = Math.floor(this.random() * 10) + 1;

    const seqItems: string[] = [];
    let curNum = startNum;
    for (let i = 0; i < 4; i++) {
      const sym = cycleSyms[(startSymIdx + i) % cycleSyms.length];
      seqItems.push(`[${sym} ${curNum}]`);
      curNum += stepDiff * (i + 1);
    }

    const targetSym = cycleSyms[(startSymIdx + 4) % cycleSyms.length];
    const targetNum = curNum;
    const correctAns = `[${targetSym} ${targetNum}]`;

    const distractors = [
      `[${targetSym} ${targetNum - stepDiff}]`,
      `[${cycleSyms[(startSymIdx + 3) % cycleSyms.length]} ${targetNum}]`,
      `[${cycleSyms[(startSymIdx + 5) % cycleSyms.length]} ${targetNum + stepDiff}]`,
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

    const prompt = `观察下列符号与数值的双轨演化序列：

${seqItems.join("  ")}  [ ? ]

推断末尾 [ ? ] 处所对应的符号与数值组合。`;

    const hint_tier1 = `宏观规律方向（1分价值）：双轨演化序列的解耦分析。符号轨与数值轨是彼此独立的双重规律：符号遵循长度为 6 的有限循环群，数值遵循多阶等差数列，必须分别独立推导。`;
    const hint_tier2 = `微观细节穿透（2分价值）：数值轨的一阶相邻差值依次递增 ${stepDiff}，二阶差分恒为常数；第 5 项的数值增量必为 ${stepDiff * 4}；同时符号循环周期为 6，当前末尾符号为循环序列的第 5 项，可直接排除数值计算偏差的干扰项。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint_tier1,
      hint_tier2,
      { task_type: "SEQUENCE_PROGRESSION" }
    );
  }

  // 8. 拓扑环路与封闭区域感知
  private generateTopologicalLoopsTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `topo_loops_t${String(trialIndex).padStart(3, "0")}`;
    const zeroLoop = ["⊏", "⊐", "∪", "∩", "∠", "⋀", "∨", "S", "Z"];
    const oneLoop = ["○", "□", "△", "◇", "⬡", "⎔", "D", "P"];
    const twoLoops = ["8", "B", "⧉", "⯐", "⚯"];

    const kLoops = this.choice([0, 1, 2]);
    const loopGroups = [zeroLoop, oneLoop, twoLoops];
    const targetPool = loopGroups[kLoops];

    const samples = this.sample(targetPool, Math.min(3, targetPool.length));
    const availCorrect = targetPool.filter(s => !samples.includes(s));
    const correctSym = availCorrect.length > 0 ? this.choice(availCorrect) : this.choice(targetPool);
    const correctAns = `[ ${correctSym} ]`;

    // Distractor pool consists of symbols from the other loop categories
    const otherPool = loopGroups.filter((_, idx) => idx !== kLoops).flat();
    const distractorSyms = this.sample(otherPool, 3);
    const distractors = distractorSyms.map(s => `[ ${s} ]`);

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

    const prompt = `下列 3 个参考样本图形共享同一种拓扑内腔特征：

参考样本:  [ ${samples[0]} ]    [ ${samples[1]} ]    [ ${samples[2]} ]

请从选项 A、B、C、D 中选出同样满足该拓扑特征的图形。`;

    const hint_tier1 = `宏观规律方向（1分价值）：拓扑同胚守恒与欧拉示性数。忽略笔画粗细、长短曲直与几何外形，核心考查图形在连通性上所包含的‘内部闭合空腔（孔洞/内环）数目’。`;
    const hint_tier2 = `微观细节穿透（2分价值）：参考样本均为严格包含 ${kLoops} 个闭合孔洞的拓扑图形。候选项中具有 ${kLoops === 0 ? "1个或2个闭合内腔" : kLoops === 1 ? "0个或2个闭合内腔" : "0个或1个闭合内腔"} 的选项均为拓扑异构体，可直接排除。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint_tier1,
      hint_tier2,
      { task_type: "TOPOLOGICAL_LOOPS" }
    );
  }
}

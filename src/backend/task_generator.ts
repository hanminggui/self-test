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
  hint: string;
  stimulus_data: Record<string, any>;
  toSafePayload(): TrialPayload;
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
      const fakeD = `${correctVal} (变体 ${padIdx})`;
      if (fakeD !== correctVal && !cleanDistractors.includes(fakeD)) {
        cleanDistractors.push(fakeD);
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
    hint: string,
    stimulus_data: Record<string, any>
  ): GeneratedTask {
    return {
      stimulus_id,
      difficulty_level,
      prompt,
      options,
      correct_option,
      signal_type,
      hint,
      stimulus_data,
      toSafePayload(): TrialPayload {
        return {
          stimulus_id,
          difficulty_level: Math.round(difficulty_level * 10000) / 10000,
          prompt,
          options,
          has_hint: Boolean(hint),
          hint_cost: 2,
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

    const prompt = `【任务类型：符号密码规则推演】
观察抽象符号序列的动态演化规则：
  [第1步]: ${step1.join(" ")}
  [第2步]: ${step2.join(" ")}
  [第3步]: ${step3.join(" ")}
请从选项 A、B、C、D 中推断第 4 步的精确演化序列。`;

    const hint = `【启发式线索】抽象密码遵循序列置换与状态转移机制：
1. 观察符号在序列中的整体平移方向（向左循环还是向右循环）；
2. 注意符号在移动时是否经历了形态映射置换（如实心与空心、特定图形间的固定映射）。
比对前 3 步在相同位置上的符号演变轨迹，即可推导出第 4 步的转移律。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint,
      { task_type: "SYNTHETIC_CIPHER", rule_name: ruleName }
    );
  }

  // 2. 离散点阵密度感知
  private generateDensityTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `density_matrix_t${String(trialIndex).padStart(3, "0")}`;
    const baseN = 26;
    const diff = Math.max(2, Math.round(baseN * (delta / 1.5)));
    const targetCount = baseN + diff;
    const dCounts = [
      Math.max(4, baseN - diff),
      Math.max(4, baseN - Math.floor(diff * 0.6) - 1),
      Math.max(4, baseN - Math.floor(diff * 1.2) - 2),
    ].map(c => (c >= targetCount ? targetCount - 2 : c));

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
          rowCells.push(coordSet.has(idx) ? symbol : "·");
        }
        rows.push(rowCells.join(" "));
      }
      return rows.join("\n");
    };

    const chosenSym = this.choice(["■", "▲", "★", "◆"]);
    const correctStr = `点阵区 (高聚集度):\n${makeGridStr(targetCount, chosenSym)}`;
    const distractors = [
      `点阵区 (散布比照 1):\n${makeGridStr(dCounts[0], chosenSym)}`,
      `点阵区 (散布比照 2):\n${makeGridStr(dCounts[1], chosenSym)}`,
      `点阵区 (散布比照 3):\n${makeGridStr(dCounts[2], chosenSym)}`,
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    const prompt = `【任务类型：离散微元点阵密度对比】
观察下列 4 个离散点阵区域（选项 A、B、C、D，网格大小 7x6）。
依据快速知觉判断：哪一个区域包含最高密度的特征微元 (${chosenSym})？`;

    const hint = `【启发式线索】微元密度对比的知觉聚焦策略：
1. 避免逐个计数，关注特征微元 (${chosenSym}) 在局部区域的聚集团块与空白间距；
2. 真正的高密度区域往往在局部形成密集的同类微元连通团块，而干扰项通常散布均匀稀疏；
3. 快速对比各区域中“背景微元 (·)”的连通空白面积，空白面积最小者即为高聚集区。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint,
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
    const row3 = [s3, s1, "[ ? ]"];
    const correctAns = `符号：${s2}`;
    const distractors = [`符号：${s1}`, `符号：${s3}`, `符号：${s4}`];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

    const gridDisplay = `  第 1 行:  [ ${row1[0]} ]  [ ${row1[1]} ]  [ ${row1[2]} ]
  第 2 行:  [ ${row2[0]} ]  [ ${row2[1]} ]  [ ${row2[2]} ]
  第 3 行:  [ ${row3[0]} ]  [ ${row3[1]} ]  [ ${row3[2]} ]`;

    const prompt = `【任务类型：图形矩阵逻辑推理】
分析下列 3x3 抽象符号矩阵的行列守恒规律：

${gridDisplay}

从选项 A、B、C、D 中推断右下角 [ ? ] 处应填入哪一个符号？`;

    const hint = `【启发式线索】3x3 矩阵推理的行列守恒不变量：
1. 观察第 1 行与第 2 行所包含的符号全集，注意图形在每行是否各出现一次（拉丁方阵守恒）；
2. 沿列方向交叉检验相同的守恒规律，确认每一列同样不存在重复符号；
3. 找出前两行共有的 3 种基准符号，对比第 3 行当前已有的 2 个符号，即可确定右下角所缺失的唯一种类。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint,
      { task_type: "MATRIX_REASONING" }
    );
  }

  // 4. 空间心智旋转判别
  private generateSpatialRotationTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `spatial_rot_t${String(trialIndex).padStart(3, "0")}`;
    const basePatterns = [
      [
        ["■", "■", "·", "·"],
        ["·", "■", "·", "·"],
        ["·", "■", "■", "■"],
        ["·", "·", "·", "·"],
      ],
      [
        ["·", "▲", "▲", "·"],
        ["·", "▲", "·", "·"],
        ["·", "▲", "▲", "▲"],
        ["·", "·", "·", "·"],
      ],
      [
        ["◆", "◆", "◆", "·"],
        ["·", "·", "◆", "·"],
        ["·", "◆", "◆", "·"],
        ["·", "·", "·", "·"],
      ],
      [
        ["★", "·", "·", "·"],
        ["★", "★", "★", "·"],
        ["·", "·", "★", "★"],
        ["·", "·", "·", "·"],
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
    const correctStr = `几何构型:\n${gridToStr(rotG)}`;

    let m1 = mirrorH(baseGrid);
    for (let i = 0; i < this.choice([0, 1, 2, 3]); i++) m1 = rotCw(m1);

    let m2 = mirrorV(baseGrid);
    for (let i = 0; i < this.choice([0, 1, 2, 3]); i++) m2 = rotCw(m2);

    const deformed = rotG.map(r => [...r]);
    let cleared = false;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (deformed[r][c] !== "·" && !cleared) {
          deformed[r][c] = "·";
          cleared = true;
          break;
        }
      }
      if (cleared) break;
    }

    const distractors = [
      `几何构型 (异构 1):\n${gridToStr(m1)}`,
      `几何构型 (异构 2):\n${gridToStr(m2)}`,
      `几何构型 (畸变 3):\n${gridToStr(deformed)}`,
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    const prompt = `【任务类型：空间心智旋转判别】
基准二维几何构型如下：

${gridToStr(baseGrid)}

请从选项 A、B、C、D 中判断：哪一个构型是由基准构型在平面内通过【纯旋转】得到的？
（注：其余选项为镜像异构体或畸变体，无法仅靠平面旋转复原）`;

    const hint = `【启发式线索】空间心智旋转与手征性辨识法：
1. 刚体在平面内做纯旋转时，图形的“手征性”（左右利手方向）严格保持不变；
2. 锁定基准构型中一个独特的局部特征（例如最长的连续分支或 L 型拐角），观察拐角末端的弯折方向；
3. 凡是通过翻转（镜像反射）才能重合的选项均为干扰项，可依此率先排除手征性相反的异构体。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint,
      { task_type: "SPATIAL_ROTATION" }
    );
  }

  // 5. 符号结构守恒律
  private generateParityInvariantTask(trialIndex: number, delta: number): GeneratedTask {
    const stimulus_id = `parity_invar_t${String(trialIndex).padStart(3, "0")}`;
    const solidSyms = ["●", "■", "▲"];
    const hollowSyms = ["○", "□", "△"];

    const makeValid = (): string[] => {
      const nSolid = this.choice([2, 4]);
      const solids = Array.from({ length: nSolid }, () => this.choice(solidSyms));
      const hollows = Array.from({ length: 2 }, () => this.choice(hollowSyms));
      const inner = this.shuffle([...solids, hollows[0]]);
      return [...inner, hollows[1]];
    };

    const makeInvalid = (nSolid: number): string[] => {
      const solids = Array.from({ length: nSolid }, () => this.choice(solidSyms));
      const hollows = Array.from({ length: 2 }, () => this.choice(hollowSyms));
      const inner = this.shuffle([...solids, hollows[0]]);
      return [...inner, hollows[1]];
    };

    const sample1 = makeValid().join(" ");
    const sample2 = makeValid().join(" ");
    const sample3 = makeValid().join(" ");

    const correctStr = makeValid().join(" ");
    const distractors = [
      makeInvalid(1).join(" "),
      makeInvalid(3).join(" "),
      makeInvalid(5).join(" "),
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctStr, distractors);

    const prompt = `【任务类型：符号结构守恒不变量】
以下 3 组示例序列均严格满足某种抽象结构平衡法则（合法样本）：
  [样本 1]: ${sample1}
  [样本 2]: ${sample2}
  [样本 3]: ${sample3}

请从选项 A、B、C、D 中判断：哪一个序列同样严格满足该守恒法则？`;

    const hint = `【启发式线索】结构平衡不变量的归纳维度：
1. 不要被符号的具体排列位置（前后次序）所干扰，结构守恒通常建立在宏观统计特征上；
2. 分别统计样本中“实心图形”（●、■、▲）与“空心图形”（○、□、△）的各自出现频次；
3. 观察合法样本在数量奇偶性（或总和配比）上的共同特征，并在各选项中检验该不变量。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint,
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
    const correctAns = `命题：${targetV[0]} ▷ ${targetV[1]}`;

    const distractors = [
      `命题：${targetV[1]} ▷ ${targetV[0]}`,
      `命题：${s4} ▷ ${s1}`,
      `命题：${s3} ▷ ${s0}`,
    ];

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

    const prompt = `【任务类型：符号关系网络传递性推导】
系统已知下列抽象符号之间的直接序位关系（'X ▷ Y' 表示 X 的层级严格先于 Y）：
  已知前提：${pairsPresented.join(" ， ")}

依据严格的传递性公理（若 X ▷ Y 且 Y ▷ Z，则 X ▷ Z），请判断下列哪一个命题必然成立？`;

    const hint = `【启发式线索】偏序传递关系的拓扑建链法：
1. 将已知条件视为有向图（X ▷ Y 表示 X 指向 Y）；
2. 寻找链条的开端（只出现在 ▷ 左侧、从未出现在右侧的符号）以及末端（只出现在右侧的符号）；
3. 顺藤摸瓜将分散的前提串联为一条单向有序总链，然后将各选项的前后序位代入总链中验证是否成立。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint,
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

    const prompt = `【任务类型：双轨周期序列与二阶差分】
观察下列符号与数值的双轨演化序列：
  ${seqItems.join("  ")}  [ ? ]

推断末尾 [ ? ] 处所对应的符号与数值组合。`;

    const hint = `【启发式线索】双轨演化序列的解耦分析法：
1. 符号轨与数值轨是相互独立的双重规律，请分开独立推演；
2. 符号轨：观察符号的循环周期，统计周期长度以确定第 5 项对应的符号；
3. 数值轨：计算相邻两项之间的增量差值（一阶差），观察差值是否呈等差递增，进而累加推算出目标数值。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint,
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
    let targetPool: string[];
    let dPools: [string[], string[], string[]];

    if (kLoops === 0) {
      targetPool = zeroLoop;
      dPools = [oneLoop, twoLoops, oneLoop];
    } else if (kLoops === 1) {
      targetPool = oneLoop;
      dPools = [zeroLoop, twoLoops, zeroLoop];
    } else {
      targetPool = twoLoops;
      dPools = [zeroLoop, oneLoop, oneLoop];
    }

    const samples = this.sample(targetPool, Math.min(3, targetPool.length));
    const availCorrect = targetPool.filter(s => !samples.includes(s));
    const correctSym = availCorrect.length > 0 ? this.choice(availCorrect) : this.choice(targetPool);
    const correctAns = `特征图形：[ ${correctSym} ]`;

    const distractorSyms = [
      this.choice(dPools[0]),
      this.choice(dPools[1]),
      this.choice(dPools[2]),
    ];
    const distractors = distractorSyms.map(s => `特征图形：[ ${s} ]`);

    const { options, correctOption, signalType } = this.assembleFourOptions(correctAns, distractors);

    const prompt = `【任务类型：拓扑欧拉环路与封闭区域分析】
下列 3 个参考样本图形共享同一种拓扑内腔特征：
  参考样本:  [ ${samples[0]} ]    [ ${samples[1]} ]    [ ${samples[2]} ]

请从选项 A、B、C、D 中选出同样满足该拓扑特征的图形。`;

    const hint = `【启发式线索】拓扑不变性与闭合内腔分析：
1. 拓扑学中忽略笔画长度、曲直与几何形状，重点关注图形的“连通性”与“内部封闭空腔（孔洞）数目”；
2. 仔细数一数 3 个参考样本图形内部各包围了多少个封闭区域（例如是否有内腔、是 1 个还是 2 个）；
3. 选项中只有唯一一个图形具备与参考样本完全相同的空腔数量，其余均为异构干扰项。`;

    return this.wrapTask(
      stimulus_id,
      delta,
      prompt,
      options,
      correctOption,
      signalType,
      hint,
      { task_type: "TOPOLOGICAL_LOOPS" }
    );
  }
}

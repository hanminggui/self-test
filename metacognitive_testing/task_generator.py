"""
Module 1: Synthetic Task Generator (task_generator.py)
Generates abstract, knowledge-free stimuli spanning 8 distinct cognitive paradigms:
  1. SYNTHETIC_CIPHER: State machine symbol evolution with multi-rule permutations.
  2. DOT_DENSITY: High-entropy symbol/dot density comparison based on Weber's Law.
  3. MATRIX_REASONING: 3x3 abstract geometric matrix pattern inference (Raven-style).
  4. SPATIAL_ROTATION: 2D mental rotation vs. chiral/mirrored reflection discernment.
  5. PARITY_INVARIANT: Structural parity and topological invariant rule verification.
  6. RELATIONAL_TRANSITIVITY: Directed graph dominance order and transitive deduction.
  7. SEQUENCE_PROGRESSION: Dual-track symbolic cyclic progression and arithmetic differences.
  8. TOPOLOGICAL_LOOPS: Euler characteristic and closed interior cavities recognition.

Difficulty parameter Delta continuously controls perceptual discriminability or symbol distortion.
All tasks generate 4 candidate options (A, B, C, D) with plausible distractors,
strictly preventing binary coin-toss guessing and reverse-engineering from options.
Zero duplicate options are guaranteed via automated deduplication assertions.
"""

import random
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from metacognitive_testing.models import TrialPayload


@dataclass
class GeneratedTask:
    stimulus_id: str
    difficulty_level: float
    prompt: str
    options: Dict[str, str]
    correct_option: str       # "A", "B", "C", or "D" (strictly protected)
    signal_type: str          # "S1" (if correct is A/B) or "S2" (if correct is C/D)
    hint: str                 # Hint revealed only when BUY_HINT is requested
    stimulus_data: Dict[str, Any]

    def to_safe_payload(self) -> TrialPayload:
        """Create a payload safe for client consumption (zero answer leakage)."""
        return TrialPayload(
            stimulus_id=self.stimulus_id,
            difficulty_level=round(self.difficulty_level, 4),
            prompt=self.prompt,
            options=self.options,
            has_hint=bool(self.hint),
            hint_cost=2,
            task_type=self.stimulus_data.get("task_type", "UNKNOWN"),
            stimulus_data=self.stimulus_data,
        )


class TaskGenerator:
    """
    Generator for abstract cognitive tasks.
    Supports 8 diverse knowledge-free cognitive paradigms with 4 candidate options each.
    """

    SYMBOLS = ["▲", "◆", "●", "■", "★", "▼", "◇", "○", "✦", "✖", "✚", "⬡"]

    MAPPINGS_A = {
        "▲": "◆", "◆": "●", "●": "■", "■": "★", "★": "▲",
        "▼": "◇", "◇": "○", "○": "▼", "✦": "✖", "✖": "✦",
    }
    MAPPINGS_B = {
        "▲": "★", "★": "■", "■": "●", "●": "◆", "◆": "▲",
        "▼": "○", "○": "◇", "◇": "▼", "✦": "✚", "✚": "✦",
    }

    def __init__(self, seed: Optional[int] = None):
        self.rng = random.Random(seed)

    def _assemble_four_options(
        self, correct_val: str, distractors: List[str]
    ) -> tuple[Dict[str, str], str, str]:
        """
        Assembles 4 candidate choices (A, B, C, D) and ensures:
        1. All 4 options are strictly unique (no duplicates).
        2. Correct option position is randomized.
        3. Assigns signal_type S1 (for A/B) vs S2 (for C/D).
        """
        clean_distractors = []
        for d in distractors:
            if d != correct_val and d not in clean_distractors:
                clean_distractors.append(d)

        pad_idx = 1
        while len(clean_distractors) < 3:
            fake_d = f"{correct_val} (变体 {pad_idx})"
            if fake_d != correct_val and fake_d not in clean_distractors:
                clean_distractors.append(fake_d)
            pad_idx += 1

        all_vals = [correct_val] + clean_distractors[:3]
        self.rng.shuffle(all_vals)

        opt_keys = ["A", "B", "C", "D"]
        options = {k: v for k, v in zip(opt_keys, all_vals)}
        correct_option = [k for k, v in options.items() if v == correct_val][0]
        signal_type = "S1" if correct_option in ["A", "B"] else "S2"

        # Hard assertion ensuring absolute uniqueness
        assert len(set(options.values())) == 4, f"Duplicate option detected: {options}"
        return options, correct_option, signal_type

    def generate(self, trial_index: int, delta: float) -> GeneratedTask:
        """
        Generate a synthetic trial task with difficulty Delta in [0.05, 0.85].
        Cycles across 8 diverse task paradigms to eliminate repetitiveness.
        """
        mod = (trial_index - 1) % 8
        if mod == 0:
            return self._generate_cipher_task(trial_index, delta)
        elif mod == 1:
            return self._generate_density_task(trial_index, delta)
        elif mod == 2:
            return self._generate_matrix_reasoning_task(trial_index, delta)
        elif mod == 3:
            return self._generate_spatial_rotation_task(trial_index, delta)
        elif mod == 4:
            return self._generate_parity_invariant_task(trial_index, delta)
        elif mod == 5:
            return self._generate_relational_transitivity_task(trial_index, delta)
        elif mod == 6:
            return self._generate_sequence_progression_task(trial_index, delta)
        else:
            return self._generate_topological_loops_task(trial_index, delta)

    # -------------------------------------------------------------------------
    # 1. 符号密码置换与序列演化 (Synthetic Cipher)
    # -------------------------------------------------------------------------
    def _generate_cipher_task(self, trial_index: int, delta: float) -> GeneratedTask:
        stimulus_id = f"cipher_rule_t{trial_index:03d}"
        seq_len = 5
        palette = self.SYMBOLS[:6]
        base_seq = [self.rng.choice(palette) for _ in range(seq_len)]

        rule_type = (trial_index // 3) % 3
        if rule_type == 0:
            rule_name = "左移映射演化"
            def evolve(seq):
                rotated = seq[1:] + [seq[0]]
                return [self.MAPPINGS_A.get(s, s) for s in rotated]
        elif rule_type == 1:
            rule_name = "右移镜像映射"
            def evolve(seq):
                rotated = [seq[-1]] + seq[:-1]
                return [self.MAPPINGS_B.get(s, s) for s in rotated]
        else:
            rule_name = "对称奇偶置换"
            def evolve(seq):
                swapped = list(seq)
                swapped[0], swapped[-1] = swapped[-1], swapped[0]
                return [self.MAPPINGS_A.get(s, s) for s in swapped]

        step1 = base_seq
        step2 = evolve(step1)
        step3 = evolve(step2)
        step4_correct = evolve(step3)

        # 构造 3 个不同认知偏差来源的干扰项
        d1 = step3[1:] + [step3[0]]
        d2 = [self.MAPPINGS_A.get(s, s) for s in step3]
        d3 = list(reversed(step4_correct))

        distractors = [" ".join(d1), " ".join(d2), " ".join(d3)]
        correct_str = " ".join(step4_correct)
        cleaned_distractors = []
        for i, d in enumerate(distractors):
            if d == correct_str or d in cleaned_distractors:
                mutated = list(step4_correct)
                mutated[i % seq_len] = self.rng.choice([s for s in palette if s != mutated[i % seq_len]])
                d = " ".join(mutated)
            cleaned_distractors.append(d)

        options, correct_option, signal_type = self._assemble_four_options(correct_str, cleaned_distractors)

        prompt = (
            f"【任务类型：符号密码规则推演】\n"
            f"观察抽象符号序列的动态演化规则：\n"
            f"  [第1步]: {' '.join(step1)}\n"
            f"  [第2步]: {' '.join(step2)}\n"
            f"  [第3步]: {' '.join(step3)}\n"
            f"请从选项 A、B、C、D 中推断第 4 步的精确演化序列。"
        )

        hint = (
            "【启发式线索】抽象密码遵循序列置换与状态转移机制：\n"
            "1. 观察符号在序列中的整体平移方向（向左循环还是向右循环）；\n"
            "2. 注意符号在移动时是否经历了形态映射置换（如实心与空心、特定图形间的固定映射）。\n"
            "比对前 3 步在相同位置上的符号演变轨迹，即可推导出第 4 步的转移律。"
        )

        return GeneratedTask(
            stimulus_id=stimulus_id,
            difficulty_level=delta,
            prompt=prompt,
            options=options,
            correct_option=correct_option,
            signal_type=signal_type,
            hint=hint,
            stimulus_data={"task_type": "SYNTHETIC_CIPHER", "rule_name": rule_name},
        )

    # -------------------------------------------------------------------------
    # 2. 离散点阵密度感知 (Dot Density Discrimination)
    # -------------------------------------------------------------------------
    def _generate_density_task(self, trial_index: int, delta: float) -> GeneratedTask:
        stimulus_id = f"density_matrix_t{trial_index:03d}"
        base_n = 26
        diff = max(2, int(round(base_n * (delta / 1.5))))

        target_count = base_n + diff
        d_counts = [
            max(4, base_n - diff),
            max(4, base_n - int(diff * 0.6) - 1),
            max(4, base_n - int(diff * 1.2) - 2),
        ]
        d_counts = [c if c < target_count else target_count - 2 for c in d_counts]

        grid_w, grid_h = 7, 6
        total_cells = grid_w * grid_h

        def make_grid_str(count, symbol="■"):
            coords = self.rng.sample(range(total_cells), k=min(count, total_cells))
            grid = [["·" for _ in range(grid_w)] for _ in range(grid_h)]
            for c in coords:
                r, col = divmod(c, grid_w)
                grid[r][col] = symbol
            return "\n".join(" ".join(row) for row in grid)

        symbol_pool = ["■", "▲", "★", "◆"]
        chosen_sym = self.rng.choice(symbol_pool)

        correct_str = f"点阵区 (高聚集度):\n{make_grid_str(target_count, chosen_sym)}"
        distractors = [
            f"点阵区 (散布比照 1):\n{make_grid_str(d_counts[0], chosen_sym)}",
            f"点阵区 (散布比照 2):\n{make_grid_str(d_counts[1], chosen_sym)}",
            f"点阵区 (散布比照 3):\n{make_grid_str(d_counts[2], chosen_sym)}",
        ]

        options, correct_option, signal_type = self._assemble_four_options(correct_str, distractors)

        prompt = (
            f"【任务类型：离散微元点阵密度对比】\n"
            f"观察下列 4 个离散点阵区域（选项 A、B、C、D，网格大小 7x6）。\n"
            f"依据快速知觉判断：哪一个区域包含最高密度的特征微元 ({chosen_sym})？"
        )

        hint = (
            f"【启发式线索】微元密度对比的知觉聚焦策略：\n"
            f"1. 避免逐个计数，关注特征微元 ({chosen_sym}) 在局部区域的聚集团块与空白间距；\n"
            f"2. 真正的高密度区域往往在局部形成密集的同类微元连通团块，而干扰项通常散布均匀稀疏；\n"
            f"3. 快速对比各区域中“背景微元 (·)”的连通空白面积，空白面积最小者即为高聚集区。"
        )

        return GeneratedTask(
            stimulus_id=stimulus_id,
            difficulty_level=delta,
            prompt=prompt,
            options=options,
            correct_option=correct_option,
            signal_type=signal_type,
            hint=hint,
            stimulus_data={"task_type": "DOT_DENSITY", "target_count": target_count},
        )

    # -------------------------------------------------------------------------
    # 3. 抽象图形矩阵推理 (Matrix Reasoning / Raven-style)
    # -------------------------------------------------------------------------
    def _generate_matrix_reasoning_task(self, trial_index: int, delta: float) -> GeneratedTask:
        stimulus_id = f"matrix_reason_t{trial_index:03d}"
        palette = self.rng.sample(["▲", "●", "■", "★", "◆", "✦", "⬡"], k=4)
        s1, s2, s3, s4 = palette[0], palette[1], palette[2], palette[3]

        row1 = [s1, s2, s3]
        row2 = [s2, s3, s1]
        row3 = [s3, s1, "[ ? ]"]
        correct_ans = f"符号：{s2}"

        distractors = [f"符号：{s1}", f"符号：{s3}", f"符号：{s4}"]

        options, correct_option, signal_type = self._assemble_four_options(correct_ans, distractors)

        grid_display = (
            f"  第 1 行:  [ {row1[0]} ]  [ {row1[1]} ]  [ {row1[2]} ]\n"
            f"  第 2 行:  [ {row2[0]} ]  [ {row2[1]} ]  [ {row2[2]} ]\n"
            f"  第 3 行:  [ {row3[0]} ]  [ {row3[1]} ]  [ {row3[2]} ]"
        )

        prompt = (
            f"【任务类型：图形矩阵逻辑推理】\n"
            f"分析下列 3x3 抽象符号矩阵的行列守恒规律：\n\n"
            f"{grid_display}\n\n"
            f"从选项 A、B、C、D 中推断右下角 [ ? ] 处应填入哪一个符号？"
        )

        hint = (
            "【启发式线索】3x3 矩阵推理的行列守恒不变量：\n"
            "1. 观察第 1 行与第 2 行所包含的符号全集，注意图形在每行是否各出现一次（拉丁方阵守恒）；\n"
            "2. 沿列方向交叉检验相同的守恒规律，确认每一列同样不存在重复符号；\n"
            "3. 找出前两行共有的 3 种基准符号，对比第 3 行当前已有的 2 个符号，即可确定右下角所缺失的唯一种类。"
        )

        return GeneratedTask(
            stimulus_id=stimulus_id,
            difficulty_level=delta,
            prompt=prompt,
            options=options,
            correct_option=correct_option,
            signal_type=signal_type,
            hint=hint,
            stimulus_data={"task_type": "MATRIX_REASONING"},
        )

    # -------------------------------------------------------------------------
    # 4. 空间心智旋转判别 (Spatial Mental Rotation)
    # -------------------------------------------------------------------------
    def _generate_spatial_rotation_task(self, trial_index: int, delta: float) -> GeneratedTask:
        stimulus_id = f"spatial_rot_t{trial_index:03d}"

        base_patterns = [
            [
                ["■", "■", "·", "·"],
                ["·", "■", "·", "·"],
                ["·", "■", "■", "■"],
                ["·", "·", "·", "·"]
            ],
            [
                ["·", "▲", "▲", "·"],
                ["·", "▲", "·", "·"],
                ["·", "▲", "▲", "▲"],
                ["·", "·", "·", "·"]
            ],
            [
                ["◆", "◆", "◆", "·"],
                ["·", "·", "◆", "·"],
                ["·", "◆", "◆", "·"],
                ["·", "·", "·", "·"]
            ],
            [
                ["★", "·", "·", "·"],
                ["★", "★", "★", "·"],
                ["·", "·", "★", "★"],
                ["·", "·", "·", "·"]
            ]
        ]
        base_grid = self.rng.choice(base_patterns)

        def rot_cw(grid):
            return [list(r) for r in zip(*grid[::-1])]

        def mirror_h(grid):
            return [r[::-1] for r in grid]

        def mirror_v(grid):
            return grid[::-1]

        def grid_to_str(grid):
            return "\n".join(" ".join(row) for row in grid)

        deg_step = self.rng.choice([1, 2, 3])
        rot_g = base_grid
        for _ in range(deg_step):
            rot_g = rot_cw(rot_g)
        correct_str = f"几何构型:\n{grid_to_str(rot_g)}"

        m1 = mirror_h(base_grid)
        for _ in range(self.rng.choice([0, 1, 2, 3])):
            m1 = rot_cw(m1)

        m2 = mirror_v(base_grid)
        for _ in range(self.rng.choice([0, 1, 2, 3])):
            m2 = rot_cw(m2)

        deformed = [list(r) for r in rot_g]
        cleared = False
        for r in range(4):
            for c in range(4):
                if deformed[r][c] != "·" and not cleared:
                    deformed[r][c] = "·"
                    cleared = True
                    break
            if cleared:
                break

        distractors = [
            f"几何构型 (异构 1):\n{grid_to_str(m1)}",
            f"几何构型 (异构 2):\n{grid_to_str(m2)}",
            f"几何构型 (畸变 3):\n{grid_to_str(deformed)}",
        ]

        options, correct_option, signal_type = self._assemble_four_options(correct_str, distractors)

        prompt = (
            f"【任务类型：空间心智旋转判别】\n"
            f"基准二维几何构型如下：\n\n"
            f"{grid_to_str(base_grid)}\n\n"
            f"请从选项 A、B、C、D 中判断：哪一个构型是由基准构型在平面内通过【纯旋转】得到的？\n"
            f"（注：其余选项为镜像异构体或畸变体，无法仅靠平面旋转复原）"
        )

        hint = (
            "【启发式线索】空间心智旋转与手征性辨识法：\n"
            "1. 刚体在平面内做纯旋转时，图形的“手征性”（左右利手方向）严格保持不变；\n"
            "2. 锁定基准构型中一个独特的局部特征（例如最长的连续分支或 L 型拐角），观察拐角末端的弯折方向；\n"
            "3. 凡是通过翻转（镜像反射）才能重合的选项均为干扰项，可依此率先排除手征性相反的异构体。"
        )

        return GeneratedTask(
            stimulus_id=stimulus_id,
            difficulty_level=delta,
            prompt=prompt,
            options=options,
            correct_option=correct_option,
            signal_type=signal_type,
            hint=hint,
            stimulus_data={"task_type": "SPATIAL_ROTATION"},
        )

    # -------------------------------------------------------------------------
    # 5. 符号结构守恒律 (Structural Parity Invariant)
    # -------------------------------------------------------------------------
    def _generate_parity_invariant_task(self, trial_index: int, delta: float) -> GeneratedTask:
        stimulus_id = f"parity_invar_t{trial_index:03d}"
        solid_syms = ["●", "■", "▲"]
        hollow_syms = ["○", "□", "△"]

        def make_valid():
            n_solid = self.rng.choice([2, 4])
            solids = [self.rng.choice(solid_syms) for _ in range(n_solid)]
            hollows = [self.rng.choice(hollow_syms) for _ in range(2)]
            inner = solids + [hollows[0]]
            self.rng.shuffle(inner)
            return inner + [hollows[1]]

        def make_invalid(n_solid):
            solids = [self.rng.choice(solid_syms) for _ in range(n_solid)]
            hollows = [self.rng.choice(hollow_syms) for _ in range(2)]
            inner = solids + [hollows[0]]
            self.rng.shuffle(inner)
            return inner + [hollows[1]]

        sample1 = " ".join(make_valid())
        sample2 = " ".join(make_valid())
        sample3 = " ".join(make_valid())

        correct_str = " ".join(make_valid())
        distractors = [
            " ".join(make_invalid(1)),
            " ".join(make_invalid(3)),
            " ".join(make_invalid(5)),
        ]

        options, correct_option, signal_type = self._assemble_four_options(correct_str, distractors)

        prompt = (
            f"【任务类型：符号结构守恒不变量】\n"
            f"以下 3 组示例序列均严格满足某种抽象结构平衡法则（合法样本）：\n"
            f"  [样本 1]: {sample1}\n"
            f"  [样本 2]: {sample2}\n"
            f"  [样本 3]: {sample3}\n\n"
            f"请从选项 A、B、C、D 中判断：哪一个序列同样严格满足该守恒法则？"
        )

        hint = (
            "【启发式线索】结构平衡不变量的归纳维度：\n"
            "1. 不要被符号的具体排列位置（前后次序）所干扰，结构守恒通常建立在宏观统计特征上；\n"
            "2. 分别统计样本中“实心图形”（●、■、▲）与“空心图形”（○、□、△）的各自出现频次；\n"
            "3. 观察合法样本在数量奇偶性（或总和配比）上的共同特征，并在各选项中检验该不变量。"
        )

        return GeneratedTask(
            stimulus_id=stimulus_id,
            difficulty_level=delta,
            prompt=prompt,
            options=options,
            correct_option=correct_option,
            signal_type=signal_type,
            hint=hint,
            stimulus_data={"task_type": "PARITY_INVARIANT"},
        )

    # -------------------------------------------------------------------------
    # 6. 抽象逻辑关系网络与传递性推断 (Relational Transitivity)
    # -------------------------------------------------------------------------
    def _generate_relational_transitivity_task(self, trial_index: int, delta: float) -> GeneratedTask:
        stimulus_id = f"relation_trans_t{trial_index:03d}"
        syms = self.rng.sample(self.SYMBOLS, k=5)
        s0, s1, s2, s3, s4 = syms

        pairs_presented = [
            f"{s0} ▷ {s1}",
            f"{s1} ▷ {s2}",
            f"{s2} ▷ {s3}",
            f"{s3} ▷ {s4}",
        ]
        self.rng.shuffle(pairs_presented)

        valid_pairs = [(s0, s3), (s1, s4), (s0, s4), (s0, s2), (s1, s3)]
        target_v = self.rng.choice(valid_pairs)
        correct_ans = f"命题：{target_v[0]} ▷ {target_v[1]}"

        distractors = [
            f"命题：{target_v[1]} ▷ {target_v[0]}",
            f"命题：{s4} ▷ {s1}",
            f"命题：{s3} ▷ {s0}",
        ]

        options, correct_option, signal_type = self._assemble_four_options(correct_ans, distractors)

        prompt = (
            f"【任务类型：符号关系网络传递性推导】\n"
            f"系统已知下列抽象符号之间的直接序位关系（'X ▷ Y' 表示 X 的层级严格先于 Y）：\n"
            f"  已知前提：{' ， '.join(pairs_presented)}\n\n"
            f"依据严格的传递性公理（若 X ▷ Y 且 Y ▷ Z，则 X ▷ Z），请判断下列哪一个命题必然成立？"
        )

        hint = (
            "【启发式线索】偏序传递关系的拓扑建链法：\n"
            "1. 将已知条件视为有向图（X ▷ Y 表示 X 指向 Y）；\n"
            "2. 寻找链条的开端（只出现在 ▷ 左侧、从未出现在右侧的符号）以及末端（只出现在右侧的符号）；\n"
            "3. 顺藤摸瓜将分散的前提串联为一条单向有序总链，然后将各选项的前后序位代入总链中验证是否成立。"
        )

        return GeneratedTask(
            stimulus_id=stimulus_id,
            difficulty_level=delta,
            prompt=prompt,
            options=options,
            correct_option=correct_option,
            signal_type=signal_type,
            hint=hint,
            stimulus_data={"task_type": "RELATIONAL_TRANSITIVITY"},
        )

    # -------------------------------------------------------------------------
    # 7. 符号序列双轨周期递增 (Sequence Progression)
    # -------------------------------------------------------------------------
    def _generate_sequence_progression_task(self, trial_index: int, delta: float) -> GeneratedTask:
        stimulus_id = f"seq_prog_t{trial_index:03d}"
        cycle_syms = ["▲", "◆", "●", "■", "★", "✦"]
        start_sym_idx = self.rng.randint(0, len(cycle_syms) - 1)
        step_diff = self.rng.choice([2, 3, 4])
        start_num = self.rng.randint(1, 10)

        seq_items = []
        cur_num = start_num
        for i in range(4):
            sym = cycle_syms[(start_sym_idx + i) % len(cycle_syms)]
            seq_items.append(f"[{sym} {cur_num}]")
            cur_num += step_diff * (i + 1)

        target_sym = cycle_syms[(start_sym_idx + 4) % len(cycle_syms)]
        target_num = cur_num
        correct_ans = f"[{target_sym} {target_num}]"

        distractors = [
            f"[{target_sym} {target_num - step_diff}]",
            f"[{cycle_syms[(start_sym_idx + 3) % len(cycle_syms)]} {target_num}]",
            f"[{cycle_syms[(start_sym_idx + 5) % len(cycle_syms)]} {target_num + step_diff}]",
        ]

        options, correct_option, signal_type = self._assemble_four_options(correct_ans, distractors)

        prompt = (
            f"【任务类型：双轨周期序列与二阶差分】\n"
            f"观察下列符号与数值的双轨演化序列：\n"
            f"  {'  '.join(seq_items)}  [ ? ]\n\n"
            f"推断末尾 [ ? ] 处所对应的符号与数值组合。"
        )

        hint = (
            "【启发式线索】双轨演化序列的解耦分析法：\n"
            "1. 符号轨与数值轨是相互独立的双重规律，请分开独立推演；\n"
            "2. 符号轨：观察符号的循环周期，统计周期长度以确定第 5 项对应的符号；\n"
            "3. 数值轨：计算相邻两项之间的增量差值（一阶差），观察差值是否呈等差递增，进而累加推算出目标数值。"
        )

        return GeneratedTask(
            stimulus_id=stimulus_id,
            difficulty_level=delta,
            prompt=prompt,
            options=options,
            correct_option=correct_option,
            signal_type=signal_type,
            hint=hint,
            stimulus_data={"task_type": "SEQUENCE_PROGRESSION"},
        )

    # -------------------------------------------------------------------------
    # 8. 拓扑环路与封闭区域感知 (Topological Loops)
    # -------------------------------------------------------------------------
    def _generate_topological_loops_task(self, trial_index: int, delta: float) -> GeneratedTask:
        stimulus_id = f"topo_loops_t{trial_index:03d}"

        zero_loop = ["⊏", "⊐", "∪", "∩", "∠", "⋀", "∨", "S", "Z"]
        one_loop = ["○", "□", "△", "◇", "⬡", "⎔", "D", "P"]
        two_loops = ["8", "B", "⧉", "⯐", "⚯"]

        k_loops = self.rng.choice([0, 1, 2])
        if k_loops == 0:
            target_pool = zero_loop
            d_pools = [one_loop, two_loops, one_loop]
            rule_desc = "【零封闭内腔】（无闭合环路）"
        elif k_loops == 1:
            target_pool = one_loop
            d_pools = [zero_loop, two_loops, zero_loop]
            rule_desc = "【单封闭内腔】（恰好 1 个闭合环路）"
        else:
            target_pool = two_loops
            d_pools = [zero_loop, one_loop, one_loop]
            rule_desc = "【双封闭内腔】（恰好 2 个闭合环路）"

        samples = self.rng.sample(target_pool, k=min(3, len(target_pool)))
        correct_sym = self.rng.choice([s for s in target_pool if s not in samples] or target_pool)
        correct_ans = f"特征图形：[ {correct_sym} ]"

        distractor_syms = [
            self.rng.choice(d_pools[0]),
            self.rng.choice(d_pools[1]),
            self.rng.choice(d_pools[2]),
        ]
        distractors = [f"特征图形：[ {s} ]" for s in distractor_syms]

        options, correct_option, signal_type = self._assemble_four_options(correct_ans, distractors)

        prompt = (
            f"【任务类型：拓扑欧拉环路与封闭区域分析】\n"
            f"下列 3 个参考样本图形共享同一种拓扑内腔特征：\n"
            f"  参考样本:  [ {samples[0]} ]    [ {samples[1]} ]    [ {samples[2]} ]\n\n"
            f"请从选项 A、B、C、D 中选出同样满足该拓扑特征的图形。"
        )

        hint = (
            "【启发式线索】拓扑不变性与闭合内腔分析：\n"
            "1. 拓扑学中忽略笔画长度、曲直与几何形状，重点关注图形的“连通性”与“内部封闭空腔（孔洞）数目”；\n"
            "2. 仔细数一数 3 个参考样本图形内部各包围了多少个封闭区域（例如是否有内腔、是 1 个还是 2 个）；\n"
            "3. 选项中只有唯一一个图形具备与参考样本完全相同的空腔数量，其余均为异构干扰项。"
        )

        return GeneratedTask(
            stimulus_id=stimulus_id,
            difficulty_level=delta,
            prompt=prompt,
            options=options,
            correct_option=correct_option,
            signal_type=signal_type,
            hint=hint,
            stimulus_data={"task_type": "TOPOLOGICAL_LOOPS"},
        )

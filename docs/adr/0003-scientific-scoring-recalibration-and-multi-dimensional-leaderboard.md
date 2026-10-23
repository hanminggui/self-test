# Scientific Scoring Recalibration and Multi-Dimensional Leaderboard Architecture

Status: accepted

We establish a single-responsibility psychometric foundation and decoupled evaluation architecture across eight core dimensions:

1. **Symmetric Staircase Progression & Unassisted Threshold Baseline (P1)**:
   The Levitt 2-up-1-down staircase controller must maintain strict directional symmetry in all Markov state transitions without conditional suppression. When subjects use heavy clues (Tier 2 hints), the controller continues standard servo tracking, but asymptotic threshold capacity $D^*$ calculation is derived from unassisted or lightly assisted baseline trials, preventing clue foraging from artificially inflating raw cognitive ceiling.

2. **Orthogonal Sensitivity Roles & Gateway Integrity (P2)**:
   First-order cognitive breakthrough qualification (`isHighFirstOrder`) is governed strictly by threshold capacity $D^* \ge 0.60$, completely eliminating the `d' >= 1.40` static table loophole that allowed low-difficulty subjects to pass on high accuracy. Type-1 sensitivity $d'$ serves solely as the local discrimination anchor for Type-2 fidelity ($M_{ratio} = \text{Meta-}d' / d'$), with the denominator bounded to a valid cognitive operating bandwidth ($[0.40, 2.50]$) to protect against denominator inflation from easy-trial accuracy.

3. **Pure Formal Utility & Unscored Burn-in Isolation (P3 & P4)**:
   Warmup trials serve strictly as algorithm convergence search rounds and must be 100% excluded from `session.score` and `final_score`. Game utility payoff remains strictly $+10 / -10 / +3$ based on binary delivery action and objective outcome without fractional confidence scaling. Overall intelligence ranking combines difficulty via the Composite Cognitive Score ($\text{CCS} = D^* \times \text{Utility}$).

4. **Two-Stage Adaptive Staircase Engine (Warmup Acceleration & Precision Tracking)**:
   The adaptive staircase operates in two distinct phases:
   - **Stage 1 (Warmup Coarse Hunting)**: Accelerated large-step traversal ($\Delta_{\text{warmup}} = 0.18$, 1-up-1-down) to locate the subject's approximate threshold within 3~4 trials without premature ceiling/floor traps;
   - **Stage 2 (Formal Precision Locking)**: Transitions smoothly to standard Levitt 2-up-1-down with fine step size ($\Delta = 0.08 \to 0.04$) to accurately estimate the asymptotic $70.71\%$ psychophysical threshold.

5. **Single Responsibility for Primitive Metrics (P5)**:
   Information Value Efficiency ($IVE$) strictly measures the economic return on investment when external clues are unlocked. When $N_{hints} = 0$, $IVE$ remains at the uninformative Bayesian prior ($0.50$). Autonomous problem solvers without clue usage are classified and honored via the orthogonal $D^* \ge 0.60$ and $M_{ratio} \ge 0.80$ criteria for **Q1-CAL (The Sovereign / 人形外挂)**, rather than polluting $IVE$ with first-order accuracy.

6. **Revealed Preference Centroids for Discrete Wagering (P6)**:
   When explicit continuous confidence is absent (such as human binary clicks), subjective confidence is mapped to the unbiased expectation centroids of the rational expected utility intervals:
   - $\text{HIGH\_BET}$ maps to $\mathbf{0.825}$ (the exact midpoint of rational wagering interval $[0.65, 1.00]$);
   - $\text{SAFE\_BET}$ maps to $\mathbf{0.450}$ (the exact midpoint of uncertain interval $[0.25, 0.65]$).
   When continuous confidence is provided by LLM agents, native float values are preserved for micro-calibration analysis.

7. **Physical Resource Footprint Tracking (P7)**:
   Hardware and economic resources are tracked as independent physical primitives: total elapsed time (`duration_ms`), per-trial latency (`ms/trial`), token billing (`prompt`, `completion`, `reasoning`), and reasoning concentration ratio ($\text{reasoning\_tokens} / \text{total\_tokens}$), without arbitrary penalty docking on raw cognitive scores.

8. **Multi-Dimensional Sub-Leaderboards & TOPSIS Unified Ranking (P8)**:
   Model evaluation exposes five orthogonal sub-dimension leaderboards (Reasoning, Metacognition, Tool Foraging, Game Utility, Cognitive Efficiency) and a unified multi-criteria decision analysis (MCDA) ranking based on the Technique for Order of Preference by Similarity to Ideal Solution (TOPSIS).

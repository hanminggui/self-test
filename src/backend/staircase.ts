/**
 * Module 1: Staircase Adaptive Engine (staircase.ts)
 * Implements Levitt's 2-up-1-down adaptive staircase algorithm to lock first-order accuracy around 70.71%.
 */

export class StaircaseController {
  minDelta: number;
  maxDelta: number;
  initialStepSize: number;
  formalStepSize: number;
  warmupStepSize: number;
  currentStepSize: number;
  warmupTrials: number;
  reversalsForStepReduction: number;

  currentDelta: number;
  consecutiveCorrect: number;
  trialCount: number;

  lastDirection: number; // -1 (harder, delta down), +1 (easier, delta up), 0 (none)
  reversalCount: number;
  reversalTrials: number[];
  reversalDeltas: number[];

  historyDeltas: number[];
  historyResponses: boolean[];

  constructor(
    initialDelta: number = 0.50,
    initialStepSize: number = 0.08,
    minDelta: number = 0.05,
    maxDelta: number = 0.85,
    reversalsForStepReduction: number = 3,
    warmupTrials: number = 0,
    warmupStepSize: number = 0.18
  ) {
    this.minDelta = minDelta;
    this.maxDelta = maxDelta;
    this.formalStepSize = initialStepSize;
    this.initialStepSize = initialStepSize;
    this.warmupStepSize = warmupStepSize;
    this.warmupTrials = warmupTrials;
    this.currentStepSize = warmupTrials > 0 ? warmupStepSize : initialStepSize;
    this.reversalsForStepReduction = reversalsForStepReduction;

    this.currentDelta = Math.max(minDelta, Math.min(maxDelta, initialDelta));
    this.consecutiveCorrect = 0;
    this.trialCount = 0;

    this.lastDirection = 0;
    this.reversalCount = 0;
    this.reversalTrials = [];
    this.reversalDeltas = [];

    this.historyDeltas = [this.currentDelta];
    this.historyResponses = [];
  }

  /**
   * Update the staircase state based on the first-order accuracy of current trial.
   * Stage 1: Warmup Coarse Hunting (trialCount <= warmupTrials or isWarmup = true)
   *   Step size Delta_warmup = 0.18, 1-up-1-down hunting.
   * Stage 2: Formal Precision Measurement (trialCount > warmupTrials or isWarmup = false)
   *   Step size Delta_formal = 0.08 (halved to 0.04 after >= 3 reversals), standard Levitt 2-up-1-down.
   * Completely eliminates asymmetric heavyHintAssisted suppression.
   * Returns the new delta parameter for next trial.
   */
  update(isCorrect: boolean, isWarmup?: boolean): number {
    const inWarmup = isWarmup !== undefined
      ? isWarmup
      : (this.warmupTrials > 0 && this.trialCount < this.warmupTrials);

    this.trialCount += 1;
    this.historyResponses.push(isCorrect);

    let direction = 0; // -1 means harder (decrease delta), +1 means easier (increase delta)

    if (inWarmup) {
      // Stage 1: Warmup Coarse Hunting (1-up-1-down, step = 0.18)
      this.currentStepSize = this.warmupStepSize;
      if (isCorrect) {
        direction = -1; // 1-up: harder, delta decreases
      } else {
        direction = 1;  // 1-down: easier, delta increases
      }
      this.consecutiveCorrect = 0;
    } else {
      // Stage 2: Formal Precision Measurement (standard Levitt 2-up-1-down)
      if (isCorrect) {
        this.consecutiveCorrect += 1;
        if (this.consecutiveCorrect >= 2) {
          direction = -1;
          this.consecutiveCorrect = 0;
        }
      } else {
        direction = 1;
        this.consecutiveCorrect = 0;
      }
    }

    if (direction !== 0) {
      // Check for reversal
      if (this.lastDirection !== 0 && direction !== this.lastDirection) {
        this.reversalCount += 1;
        this.reversalTrials.push(this.trialCount);
        this.reversalDeltas.push(this.currentDelta);
      }

      this.lastDirection = direction;

      // In formal stage, step size adaptation: halve step size when reversals reach threshold
      if (!inWarmup) {
        if (this.trialCount > 10 && this.reversalCount >= this.reversalsForStepReduction) {
          this.currentStepSize = this.formalStepSize / 2.0;
        } else {
          this.currentStepSize = this.formalStepSize;
        }
      }

      // Update delta
      if (direction === -1) {
        this.currentDelta = Math.max(this.minDelta, Math.round((this.currentDelta - this.currentStepSize) * 10000) / 10000);
      } else {
        this.currentDelta = Math.min(this.maxDelta, Math.round((this.currentDelta + this.currentStepSize) * 10000) / 10000);
      }
    }

    this.historyDeltas.push(this.currentDelta);
    return this.currentDelta;
  }

  getCurrentDelta(): number {
    return this.currentDelta;
  }

  getAccuracy(excludeWarmup: number = 0): number {
    const responses = this.historyResponses.slice(excludeWarmup);
    if (responses.length === 0) return 0.0;
    const correctCount = responses.filter(r => r).length;
    return correctCount / responses.length;
  }

  /**
   * Estimates asymptotic difference threshold delta* based on effective post-warmup reversals,
   * with Monotonic Tail Correction for subjects who break through to ceiling/floor after early reversals.
   */
  getEstimatedThreshold(warmupCutoff: number = 5): number {
    const validDeltas: number[] = [];
    const validTrials: number[] = [];
    for (let i = 0; i < this.reversalTrials.length; i++) {
      if (this.reversalTrials[i] > warmupCutoff) {
        validDeltas.push(this.reversalDeltas[i]);
        validTrials.push(this.reversalTrials[i]);
      }
    }

    const last5 = this.historyDeltas.slice(-5);
    const tailMean = last5.length > 0
      ? last5.reduce((a, b) => a + b, 0) / last5.length
      : this.currentDelta;

    if (validDeltas.length < 2) {
      return tailMean;
    }

    const kEff = Math.min(5, validDeltas.length);
    const targetDeltas = validDeltas.slice(-kEff);
    const revMean = targetDeltas.reduce((a, b) => a + b, 0) / targetDeltas.length;

    // Monotonic Tail Correction:
    // If a subject had early reversals but then went on a long unreversed winning/losing streak
    // (e.g., >= 6 trials without reversal, or saturated at minDelta/maxDelta at the tail),
    // the early reversals no longer represent the asymptotic convergence point.
    const lastRevTrial = validTrials[validTrials.length - 1];
    const unreversedRun = this.trialCount - lastRevTrial;
    const isTailAtBoundary =
      Math.abs(tailMean - this.minDelta) < 0.015 ||
      Math.abs(tailMean - this.maxDelta) < 0.015;

    if (unreversedRun >= 12 || (unreversedRun >= 6 && isTailAtBoundary)) {
      return tailMean;
    } else if (unreversedRun >= 6) {
      // Smooth interpolation between reversal mean and tail mean for medium streaks (6..11 trials)
      const weightTail = (unreversedRun - 5) / 7.0;
      return revMean * (1.0 - weightTail) + tailMean * weightTail;
    }

    return revMean;
  }

  /**
   * Computes normalized first-order difficulty capacity D* in [0, 1].
   * D* = (delta_max - delta*) / (delta_max - delta_min) = (0.85 - delta*) / 0.80
   */
  computeDStar(deltaStar?: number, warmupCutoff: number = 5): number {
    const delta = deltaStar !== undefined ? deltaStar : this.getEstimatedThreshold(warmupCutoff);
    const dStar = (this.maxDelta - delta) / (this.maxDelta - this.minDelta);
    const clamped = Math.max(0.0, Math.min(1.0, dStar));
    return Math.round(clamped * 10000) / 10000;
  }

  toJSON(): StaircaseSnapshot {
    return {
      minDelta: this.minDelta,
      maxDelta: this.maxDelta,
      initialStepSize: this.initialStepSize,
      formalStepSize: this.formalStepSize,
      warmupStepSize: this.warmupStepSize,
      warmupTrials: this.warmupTrials,
      currentStepSize: this.currentStepSize,
      reversalsForStepReduction: this.reversalsForStepReduction,
      currentDelta: this.currentDelta,
      consecutiveCorrect: this.consecutiveCorrect,
      trialCount: this.trialCount,
      lastDirection: this.lastDirection,
      reversalCount: this.reversalCount,
      reversalTrials: [...this.reversalTrials],
      reversalDeltas: [...this.reversalDeltas],
      historyDeltas: [...this.historyDeltas],
      historyResponses: [...this.historyResponses],
    };
  }

  static fromJSON(snapshot: StaircaseSnapshot): StaircaseController {
    const sc = new StaircaseController(
      snapshot.currentDelta,
      snapshot.formalStepSize ?? snapshot.initialStepSize ?? 0.08,
      snapshot.minDelta,
      snapshot.maxDelta,
      snapshot.reversalsForStepReduction,
      snapshot.warmupTrials ?? 0,
      snapshot.warmupStepSize ?? 0.18
    );
    sc.currentStepSize = snapshot.currentStepSize;
    sc.consecutiveCorrect = snapshot.consecutiveCorrect;
    sc.trialCount = snapshot.trialCount;
    sc.lastDirection = snapshot.lastDirection;
    sc.reversalCount = snapshot.reversalCount;
    sc.reversalTrials = [...snapshot.reversalTrials];
    sc.reversalDeltas = [...snapshot.reversalDeltas];
    sc.historyDeltas = [...snapshot.historyDeltas];
    sc.historyResponses = [...snapshot.historyResponses];
    return sc;
  }
}

export interface StaircaseSnapshot {
  minDelta: number;
  maxDelta: number;
  initialStepSize: number;
  formalStepSize?: number;
  warmupStepSize?: number;
  warmupTrials?: number;
  currentStepSize: number;
  reversalsForStepReduction: number;
  currentDelta: number;
  consecutiveCorrect: number;
  trialCount: number;
  lastDirection: number;
  reversalCount: number;
  reversalTrials: number[];
  reversalDeltas: number[];
  historyDeltas: number[];
  historyResponses: boolean[];
}

/**
 * Module 1: Staircase Adaptive Engine (staircase.ts)
 * Implements Levitt's 2-up-1-down adaptive staircase algorithm to lock first-order accuracy around 70.71%.
 */

export class StaircaseController {
  minDelta: number;
  maxDelta: number;
  initialStepSize: number;
  currentStepSize: number;
  reversalsForStepReduction: number;

  currentDelta: number;
  consecutiveCorrect: number;
  trialCount: number;

  lastDirection: number; // -1 (harder, delta down), +1 (easier, delta up), 0 (none)
  reversalCount: number;
  reversalTrials: number[];

  historyDeltas: number[];
  historyResponses: boolean[];

  constructor(
    initialDelta: number = 0.50,
    initialStepSize: number = 0.08,
    minDelta: number = 0.05,
    maxDelta: number = 0.85,
    reversalsForStepReduction: number = 3
  ) {
    this.minDelta = minDelta;
    this.maxDelta = maxDelta;
    this.initialStepSize = initialStepSize;
    this.currentStepSize = initialStepSize;
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

  reversalDeltas: number[];

  /**
   * Update the staircase state based on the first-order accuracy of current trial.
   * Returns the new delta parameter for next trial.
   */
  update(isCorrect: boolean): number {
    this.trialCount += 1;
    this.historyResponses.push(isCorrect);

    let direction = 0; // -1 means harder (decrease delta), +1 means easier (increase delta)

    if (isCorrect) {
      this.consecutiveCorrect += 1;
      if (this.consecutiveCorrect >= 2) {
        // 2-up rule: difficulty increases (delta decreases)
        direction = -1;
        this.consecutiveCorrect = 0;
      }
    } else {
      // 1-down rule: difficulty decreases (delta increases)
      direction = 1;
      this.consecutiveCorrect = 0;
    }

    if (direction !== 0) {
      // Check for reversal
      if (this.lastDirection !== 0 && direction !== this.lastDirection) {
        this.reversalCount += 1;
        this.reversalTrials.push(this.trialCount);
        this.reversalDeltas.push(this.currentDelta);
      }

      this.lastDirection = direction;

      // Step size adaptation: after trial 10 and >= reversalsForStepReduction, halve step size
      if (this.trialCount > 10 && this.reversalCount >= this.reversalsForStepReduction) {
        this.currentStepSize = this.initialStepSize / 2.0;
      }

      // Update delta
      if (direction === -1) {
        this.currentDelta = Math.max(this.minDelta, this.currentDelta - this.currentStepSize);
      } else {
        this.currentDelta = Math.min(this.maxDelta, this.currentDelta + this.currentStepSize);
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
   * Estimates asymptotic difference threshold delta* based on effective post-warmup reversals.
   * If reversals < 2 (extreme ceiling/floor performance), falls back to 5-trial moving average.
   */
  getEstimatedThreshold(warmupCutoff: number = 5): number {
    const validDeltas: number[] = [];
    for (let i = 0; i < this.reversalTrials.length; i++) {
      if (this.reversalTrials[i] > warmupCutoff) {
        validDeltas.push(this.reversalDeltas[i]);
      }
    }

    if (validDeltas.length < 2) {
      const last5 = this.historyDeltas.slice(-5);
      if (last5.length === 0) return this.currentDelta;
      return last5.reduce((a, b) => a + b, 0) / last5.length;
    }

    const kEff = Math.min(5, validDeltas.length);
    const targetDeltas = validDeltas.slice(-kEff);
    return targetDeltas.reduce((a, b) => a + b, 0) / targetDeltas.length;
  }

  /**
   * Computes normalized first-order difficulty capacity D* in [0, 1].
   * D* = (delta_max - delta*) / (delta_max - delta_min) = (0.85 - delta*) / 0.80
   */
  computeDStar(deltaStar?: number): number {
    const delta = deltaStar !== undefined ? deltaStar : this.getEstimatedThreshold();
    const dStar = (this.maxDelta - delta) / (this.maxDelta - this.minDelta);
    const clamped = Math.max(0.0, Math.min(1.0, dStar));
    return Math.round(clamped * 10000) / 10000;
  }
}

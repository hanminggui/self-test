/**
 * Computational Aesthetics Engine (src/frontend/utils/aestheticEngine.ts)
 *
 * Maps multi-dimensional metacognitive data (macro aggregate metrics + micro trial time-series)
 * into a deterministic, gallery-grade continuous generative SVG manifold.
 *
 * Supports:
 * - Dual visual themes: "dark" (Obsidian Observatory / Acid Cyber) & "light" (Editorial Parchment / Neo-Pop)
 * - Dual surface modes: "artifact" (high-craft 1-of-1 Cognitive Sigil) & "ambient" (low-contrast page backdrop)
 * - Smooth Catmull-Rom -> Cubic Bézier splines (zero jagged polygon edges)
 */

import { SimplexNoise } from "./simplexNoise";

export interface TrialDataPoint {
  trial_index: number;
  is_warmup?: boolean;
  difficulty_level: number;
  is_correct_first_order: boolean;
  is_correct_final: boolean;
  action: string;
  confidence_level: number;
  hints_unlocked: number;
  score_delta: number;
  duration_ms: number;
}

export interface AestheticSessionData {
  id: string;
  subject_name: string;
  subject_type: string;
  created_at: string;
  quadrant_code?: string;
  metrics: {
    d_prime: number;
    meta_d_prime: number;
    m_ratio: number;
    calibration_bias: number;
    brier_score: number;
    first_order_accuracy: number;
    second_order_accuracy: number;
    reversals_count: number;
    ive: number;
    coachability_index: number;
    total_duration_ms: number;
    final_score: number;
    total_trials: number;
  };
  micro_metrics?: {
    avg_confidence: number;
    std_confidence: number;
    avg_duration_ms: number;
    hint_trial_ratio: number;
    trial_count: number;
  };
  trials?: TrialDataPoint[];
}

export type AestheticTheme = "dark" | "light";
export type AestheticSurface = "artifact" | "ambient";

export interface AestheticRenderOptions {
  theme?: AestheticTheme;
  surface?: AestheticSurface;
  showHud?: boolean;
  idSuffix?: string;
}

export interface ConstellationNode {
  x: number;
  y: number;
  outerX: number;
  outerY: number;
  r: number;
  opacity: number;
  glow: boolean;
  isCorrect: boolean;
  isWarmup: boolean;
  isReversal: boolean;
  hintTaken: boolean;
  hintsUnlocked: number;
  confidence: number;
  difficulty: number;
  duration_ms: number;
  trialIndex: number;
  angleRad: number;
  radiusDist: number;
}

export interface WaveLayer {
  d: string;
  strokeD: string;
  fill: string;
  stroke: string;
  opacity: number;
}

export interface AestheticParameters {
  seed: number;
  theme: AestheticTheme;
  surface: AestheticSurface;
  baseHue: number;
  accentHue: number;
  saturation: number;
  lightness: number;
  bgGradStart: string;
  bgGradMid: string;
  bgGradEnd: string;
  auraColor: string;
  primaryColor: string;
  secondaryColor: string;
  inkColor: string;
  mutedInkColor: string;
  dangerColor: string;
  hintColor: string;
  harmonicOrder: number;
  harmonicSymmetry: number;
  turbulenceScale: number;
  frequency: number;
  nodes: ConstellationNode[];
  spinePath: string;
  baselinePath: string;
  resonancePaths: string[];
  waveLayers: WaveLayer[];
  ambientStars: Array<{ x: number; y: number; r: number; opacity: number; color: string }>;
  totalTrials: number;
  formalTrials: number;
}

function stringToSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) || 1;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function sanitizeSvgId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100);
  const lig = clamp(l, 0, 100) / 100;
  const a = (sat * Math.min(lig, 1 - lig)) / 100;
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Converts a series of [x, y] points into a smooth G1-continuous Cubic Bézier SVG path
 * using Catmull-Rom spline interpolation (eliminates jagged polygon segments).
 */
export function pointsToSmoothCubicPath(
  pts: Array<[number, number]>,
  closed: boolean = false,
  tension: number = 0.5
): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  if (pts.length === 2) {
    return `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} L ${pts[1][0].toFixed(2)} ${pts[1][1].toFixed(2)}${closed ? " Z" : ""}`;
  }

  const n = pts.length;
  const k = tension / 3;
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;

  const getPt = (idx: number): [number, number] => {
    if (closed) {
      return pts[((idx % n) + n) % n];
    }
    if (idx < 0) return pts[0];
    if (idx >= n) return pts[n - 1];
    return pts[idx];
  };

  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = getPt(i - 1);
    const p1 = getPt(i);
    const p2 = getPt(i + 1);
    const p3 = getPt(i + 2);

    const cp1x = p1[0] + (p2[0] - p0[0]) * k;
    const cp1y = p1[1] + (p2[1] - p0[1]) * k;
    const cp2x = p2[0] - (p3[0] - p1[0]) * k;
    const cp2y = p2[1] - (p3[1] - p1[1]) * k;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }

  if (closed) d += " Z";
  return d;
}

/**
 * Adapter: Converts a FinalAssessmentReport (from /api/sessions/:id/report or /api/share/:id)
 * into an AestheticSessionData object for seamless live rendering.
 */
export function reportToAestheticSession(report: any): AestheticSessionData {
  const m = report?.metrics || report?.metacognitive_metrics || {};
  const records: any[] = Array.isArray(report?.records) ? report.records : [];

  const trials: TrialDataPoint[] = records.map((r, idx) => ({
    trial_index: r.trial_index ?? idx + 1,
    is_warmup: Boolean(r.is_warmup),
    difficulty_level: typeof r.difficulty_level === "number" ? r.difficulty_level : 0.5,
    is_correct_first_order: Boolean(r.is_correct_first_order),
    is_correct_final: Boolean(r.is_correct_final),
    action: r.action || "SAFE_BET",
    confidence_level: typeof r.confidence_level === "number" ? r.confidence_level : 0.5,
    hints_unlocked: r.hints_unlocked ?? 0,
    score_delta: r.score_delta ?? 0,
    duration_ms: r.duration_ms ?? 1500,
  }));

  const count = trials.length;
  const avgConf = count
    ? trials.reduce((acc, t) => acc + t.confidence_level, 0) / count
    : 0.55;
  const stdConf = count
    ? Math.sqrt(trials.reduce((acc, t) => acc + Math.pow(t.confidence_level - avgConf, 2), 0) / count)
    : 0.16;
  const avgDuration = count
    ? trials.reduce((acc, t) => acc + t.duration_ms, 0) / count
    : 1800;
  const hintCount = trials.filter((t) => t.hints_unlocked > 0).length;

  return {
    id: report?.session_id || report?.id || "preview_manifold",
    subject_name: report?.subject_name || "Explorer",
    subject_type: report?.subject_type || "HUMAN",
    created_at: report?.created_at || new Date().toISOString(),
    quadrant_code: report?.quadrant_code || report?.diagnostic_profile?.quadrant_code,
    metrics: {
      d_prime: m.d_prime ?? 1.4,
      meta_d_prime: m.meta_d_prime ?? 1.15,
      m_ratio: m.m_ratio ?? 0.85,
      calibration_bias: m.calibration_bias ?? 0.0,
      brier_score: m.brier_score ?? 0.22,
      first_order_accuracy: m.first_order_accuracy ?? report?.summary?.first_order_accuracy ?? 0.72,
      second_order_accuracy: m.second_order_accuracy ?? 0.75,
      reversals_count: m.reversals_count ?? report?.summary?.reversals_count ?? 4,
      ive: m.ive ?? 0.5,
      coachability_index: m.coachability_index ?? 50,
      total_duration_ms: report?.total_duration_ms ?? avgDuration * Math.max(1, count),
      final_score: report?.final_score ?? report?.formal_score ?? 0,
      total_trials: report?.total_trials ?? (count || 16),
    },
    micro_metrics: {
      avg_confidence: avgConf,
      std_confidence: stdConf,
      avg_duration_ms: avgDuration,
      hint_trial_ratio: count ? hintCount / count : 0.1,
      trial_count: count,
    },
    trials,
  };
}

export function computeAestheticParameters(
  session: AestheticSessionData,
  canvasWidth: number = 800,
  canvasHeight: number = 800,
  options: AestheticRenderOptions = {}
): AestheticParameters {
  const theme: AestheticTheme = options.theme || "dark";
  const surface: AestheticSurface = options.surface || "artifact";
  const seed = stringToSeed(session.id || session.subject_name || "manifold");
  const noise = new SimplexNoise((seed % 9973) + 1);
  const m = session.metrics;
  const micro = session.micro_metrics || {
    avg_confidence: 0.55,
    std_confidence: 0.16,
    avg_duration_ms: 2000,
    hint_trial_ratio: 0.1,
    trial_count: session.trials?.length || m.total_trials || 20,
  };

  // 1. Perceptual Color Synthesis
  // Calibration Bias (-1.0 ~ +1.0) maps into 3 distinct perceptual chromatic bands:
  //   |bias| <= 0.08 -> 162°~182° (Aurora Emerald-Cyan: lucid calibration)
  //   bias > +0.08   -> 42° -> 16°  (Saffron Gold -> Burnt Tangerine: bold / overconfident)
  //   bias < -0.08   -> 204° -> 258° (Cobalt -> Deep Indigo: prudent / cautious)
  const bias = clamp(m.calibration_bias ?? 0, -1, 1);
  const mRatio = clamp(m.m_ratio ?? 0.85, 0.05, 2.2);
  let baseHue: number;
  let accentHue: number;
  let waveHueStep: number;

  if (bias > 0.08) {
    const t = clamp((bias - 0.08) / 0.55, 0, 1);
    baseHue = 40 - t * 22; // 40° (Saffron Gold) -> 18° (Terracotta Tangerine)
    // Stay strictly inside warm gold/amber/coral range (16°..52°), never drifting into 70°..145° olive/lime
    accentHue = clamp(baseHue + 10 + Math.min(8, mRatio * 4), 20, 52);
    waveHueStep = -4; // Subtle shift toward warm coral/terracotta
  } else if (bias < -0.08) {
    const t = clamp((-bias - 0.08) / 0.55, 0, 1);
    baseHue = 204 + t * 54; // 204° (Cobalt) -> 258° (Deep Indigo)
    accentHue = (baseHue + 24 + Math.min(18, mRatio * 10)) % 360;
    waveHueStep = 9;
  } else {
    baseHue = 172 - bias * 120; // 162°..182° (Emerald-Cyan)
    accentHue = (baseHue + 22 + Math.min(16, mRatio * 9)) % 360;
    waveHueStep = 8;
  }

  const atmosphericHue = (baseHue + 210) % 360;

  const acc = clamp(m.first_order_accuracy ?? 0.7, 0.15, 1.0);
  const brierClarity = clamp(1 - (m.brier_score ?? 0.25), 0.2, 1.0);
  const saturation =
    theme === "dark"
      ? Math.round(62 + acc * 24)
      : Math.round(58 + acc * 24);
  const lightness = theme === "dark" ? 66 : 42;

  // Harmonious Canvas Backgrounds (zero muddy browns or washed greens)
  const bgGradStart =
    theme === "dark"
      ? hslToHex(atmosphericHue, 32, 5)
      : "#FFFDF8";
  const bgGradMid =
    theme === "dark"
      ? hslToHex(baseHue, 28, 9)
      : hslToHex(baseHue, 26, 97);
  const bgGradEnd =
    theme === "dark"
      ? hslToHex(accentHue, 36, 12)
      : hslToHex(accentHue, 32, 94);

  const auraColor =
    theme === "dark"
      ? hslToHex(baseHue, clamp(saturation, 55, 85), 54)
      : hslToHex(baseHue, clamp(saturation, 50, 78), 64);

  const primaryColor = hslToHex(baseHue, saturation, lightness);
  const secondaryColor = hslToHex(accentHue, clamp(saturation + 6, 54, 92), theme === "dark" ? 72 : 46);
  const inkColor = theme === "dark" ? "#F8FAFC" : "#1C1917";
  const mutedInkColor =
    theme === "dark"
      ? hslToHex(baseHue, 24, 72)
      : hslToHex(baseHue, 22, 34);
  const dangerColor = theme === "dark" ? "#FB7185" : "#E11D48";
  const hintColor = theme === "dark" ? "#F59E0B" : "#B45309";

  // 2. Mathematical Topology & Flow
  const harmonicOrder = clamp(mRatio, 0.4, 2.4);
  const harmonicSymmetry = clamp(Math.round(3 + mRatio * 3.2), 3, 9);
  const turbulenceScale = clamp(
    micro.std_confidence * 18 + ((m.reversals_count ?? 3) / 24) * 14,
    2,
    26
  );
  const dPrime = clamp(m.d_prime ?? 1.3, 0.2, 3.6);
  const frequency = 1.6 + dPrime * 1.15;

  // 3. Trial Polar Constellation
  const fallbackCount = clamp(m.total_trials || 20, 12, 36);
  const trials: TrialDataPoint[] =
    session.trials && session.trials.length > 0
      ? session.trials
      : Array.from({ length: fallbackCount }, (_, idx) => {
          const nVal = noise.noise2D([idx * 0.35, (seed % 97) * 0.1]);
          const prog = idx / fallbackCount;
          const diff = clamp(0.32 + prog * 0.45 + nVal * 0.14, 0.15, 0.95);
          const conf = clamp(0.55 + bias * 0.18 + nVal * 0.22, 0.15, 0.98);
          const isCorr = nVal > -0.22 * (1.2 - acc);
          return {
            trial_index: idx + 1,
            is_warmup: false,
            difficulty_level: diff,
            is_correct_first_order: isCorr,
            is_correct_final: isCorr,
            action: conf > 0.62 ? "HIGH_BET" : "SAFE_BET",
            confidence_level: conf,
            hints_unlocked: idx % 7 === 4 ? 1 : 0,
            score_delta: isCorr ? 8 : -5,
            duration_ms: Math.round(1400 + Math.abs(nVal) * 2600),
          };
        });

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const minDim = Math.min(canvasWidth, canvasHeight);
  const maxOrbitR = minDim * 0.37;
  const minOrbitR = minDim * 0.13;

  const avgDur = Math.max(400, micro.avg_duration_ms || 1800);
  const n = trials.length;
  const nodes: ConstellationNode[] = [];
  const spineCoords: Array<[number, number]> = [];
  const baselineCoords: Array<[number, number]> = [];

  trials.forEach((t, i) => {
    // Golden-subtle phase offset derived from seed so each session feels alive
    const phaseShift = ((seed % 360) * Math.PI) / 180;
    const angle = (2 * Math.PI * i) / n - Math.PI / 2 + phaseShift * 0.08;

    const diff = clamp(t.difficulty_level ?? 0.5, 0.05, 1.0);
    const conf = clamp(t.confidence_level ?? 0.5, 0.05, 1.0);
    const isWarmup = Boolean(t.is_warmup);

    // Difficulty drives base orbital radius; confidence pulls/pushes subtly around the difficulty shell
    const baseOrbital = minOrbitR + diff * (maxOrbitR - minOrbitR) * 0.78;
    const confidenceDelta = (conf - 0.5) * (minDim * 0.085);
    const rDist = clamp(baseOrbital + confidenceDelta, minOrbitR * 0.82, maxOrbitR);

    const x = cx + rDist * Math.cos(angle);
    const y = cy + rDist * Math.sin(angle);
    spineCoords.push([x, y]);
    baselineCoords.push([
      cx + baseOrbital * Math.cos(angle),
      cy + baseOrbital * Math.sin(angle),
    ]);

    // Hesitation whisker outward length driven by normalized reaction time
    const durRatio = clamp((t.duration_ms || avgDur) / avgDur, 0.3, 2.6);
    const whiskerLen = (isWarmup ? 4 : 7) + durRatio * (minDim * 0.022);
    const outerX = cx + (rDist + whiskerLen) * Math.cos(angle);
    const outerY = cy + (rDist + whiskerLen) * Math.sin(angle);

    const baseNodeR = isWarmup
      ? minDim * 0.004
      : minDim * (0.0042 + conf * 0.0068);

    nodes.push({
      x,
      y,
      outerX,
      outerY,
      r: baseNodeR,
      opacity: isWarmup ? 0.42 : 0.62 + conf * 0.38,
      glow: !isWarmup && t.is_correct_final,
      isCorrect: t.is_correct_final,
      isWarmup,
      isReversal: t.is_correct_first_order !== t.is_correct_final,
      hintTaken: (t.hints_unlocked ?? 0) > 0,
      hintsUnlocked: t.hints_unlocked ?? 0,
      confidence: conf,
      difficulty: diff,
      duration_ms: t.duration_ms || avgDur,
      trialIndex: t.trial_index || i + 1,
      angleRad: angle,
      radiusDist: rDist,
    });
  });

  // Smooth Catmull-Rom closed curves
  const spinePath = pointsToSmoothCubicPath(spineCoords, true, 0.55);
  const baselinePath = pointsToSmoothCubicPath(baselineCoords, true, 0.5);

  // 4. Harmonic Resonance Interference Filaments (Chladni / Lissajous polar waves)
  const resonancePaths: string[] = [];
  const ringSamples = 96;
  const resonanceRingCount = surface === "ambient" ? 2 : 3;
  const phaseSeed = ((seed % 628) / 100);
  for (let rIdx = 0; rIdx < resonanceRingCount; rIdx++) {
    const ringPts: Array<[number, number]> = [];
    const baseR = minDim * (0.19 + rIdx * 0.092);
    const amp1 = minDim * (0.014 + (1 / Math.max(0.5, harmonicOrder)) * 0.012) * (1 - rIdx * 0.14);
    const amp2 = minDim * (0.007 + (turbulenceScale / 40) * 0.01);

    for (let s = 0; s < ringSamples; s++) {
      const theta = (2 * Math.PI * s) / ringSamples;
      const harmonicTerm =
        Math.cos(harmonicSymmetry * theta + phaseSeed + rIdx * 0.7) * amp1 +
        Math.sin((harmonicSymmetry + 2) * theta - phaseSeed * 0.5 + rIdx * 1.1) * amp2;
      const rad = baseR + harmonicTerm;
      ringPts.push([cx + rad * Math.cos(theta), cy + rad * Math.sin(theta)]);
    }
    resonancePaths.push(pointsToSmoothCubicPath(ringPts, true, 0.5));
  }

  // 5. Smooth Simplex-Modulated Topographic Wave Ribbons (No jagged polygons!)
  const waveLayers: WaveLayer[] = [];
  const waveCount = 4;
  const sampleCols = 28;
  for (let w = 0; w < waveCount; w++) {
    const baseY = canvasHeight * (0.56 + w * 0.1);
    const amp = canvasHeight * (0.042 + (1 / Math.max(0.5, harmonicOrder)) * 0.018);
    const waveFreq = frequency * 0.0038;
    const pts: Array<[number, number]> = [];

    for (let c = 0; c <= sampleCols; c++) {
      const px = (canvasWidth * c) / sampleCols;
      const nOffset = noise.noise2D([px * 0.0028 + w * 1.3, (seed % 50) * 0.15 + w * 0.8]);
      const py =
        baseY +
        Math.sin(px * waveFreq + w * 1.45 + phaseSeed) * amp * 0.65 +
        nOffset * amp * 0.85;
      pts.push([px, py]);
    }

    const topSpline = pointsToSmoothCubicPath(pts, false, 0.5);
    const closedFill = `${topSpline} L ${canvasWidth} ${canvasHeight} L 0 ${canvasHeight} Z`;

    const layerHue = ((baseHue + w * waveHueStep) % 360 + 360) % 360;
    const fillHex =
      theme === "dark"
        ? hslToHex(layerHue, clamp(saturation - 18, 22, 65), 18 + w * 5)
        : hslToHex(layerHue, clamp(saturation - 24, 22, 54), 89 - w * 3);
    const strokeHex =
      theme === "dark"
        ? hslToHex(layerHue, clamp(saturation, 42, 82), 54 + w * 5)
        : hslToHex(layerHue, clamp(saturation - 12, 32, 66), 46 - w * 3);

    const baseOpacity =
      surface === "ambient"
        ? theme === "dark"
          ? 0.045 + w * 0.015
          : 0.035 + w * 0.012
        : theme === "dark"
        ? 0.14 + w * 0.055
        : 0.1 + w * 0.035;

    waveLayers.push({
      d: closedFill,
      strokeD: topSpline,
      fill: fillHex,
      stroke: strokeHex,
      opacity: baseOpacity,
    });
  }

  // 6. Deterministic Ambient Micro Stars / Dust
  const starCount = surface === "ambient" ? 18 : 28;
  const ambientStars = Array.from({ length: starCount }, (_, i) => {
    const sx = (0.5 + 0.46 * noise.noise2D([i * 1.7, (seed % 101) * 0.3])) * canvasWidth;
    const sy = (0.5 + 0.46 * noise.noise2D([(seed % 89) * 0.25, i * 2.1])) * canvasHeight;
    const sr = 0.7 + ((i * 17 + seed) % 10) * 0.14;
    const op =
      surface === "ambient"
        ? 0.12 + (i % 3) * 0.06
        : (theme === "dark" ? 0.22 : 0.18) + (i % 4) * 0.11 * brierClarity;
    return {
      x: clamp(sx, 12, canvasWidth - 12),
      y: clamp(sy, 12, canvasHeight - 12),
      r: sr,
      opacity: op,
      color: i % 2 === 0 ? primaryColor : secondaryColor,
    };
  });

  return {
    seed,
    theme,
    surface,
    baseHue,
    accentHue,
    saturation,
    lightness,
    bgGradStart,
    bgGradMid,
    bgGradEnd,
    auraColor,
    primaryColor,
    secondaryColor,
    inkColor,
    mutedInkColor,
    dangerColor,
    hintColor,
    harmonicOrder,
    harmonicSymmetry,
    turbulenceScale,
    frequency,
    nodes,
    spinePath,
    baselinePath,
    resonancePaths,
    waveLayers,
    ambientStars,
    totalTrials: trials.length,
    formalTrials: trials.filter((t) => !t.is_warmup).length,
  };
}

export function generateAestheticSvg(
  session: AestheticSessionData,
  size: number = 800,
  options: AestheticRenderOptions = {}
): string {
  const theme: AestheticTheme = options.theme || "dark";
  const surface: AestheticSurface = options.surface || "artifact";
  const showHud = options.showHud ?? (surface === "artifact");
  const p = computeAestheticParameters(session, size, size, { theme, surface, showHud });

  const uid = sanitizeSvgId(`${session.id || "manifold"}_${options.idSuffix || `${theme}_${surface}`}`);
  const cx = size / 2;
  const cy = size / 2;

  // Radial calibration rings
  const ringRadii = [size * 0.14, size * 0.23, size * 0.32, size * 0.41];
  const ringStrokeOp = surface === "ambient" ? 0.07 : theme === "dark" ? 0.16 : 0.14;

  // Degree tick marks around outer astrolabe ring
  const outerRingR = ringRadii[3];
  const tickCount = 36;
  const ticksMarkup = Array.from({ length: tickCount }, (_, i) => {
    const ang = (i * Math.PI * 2) / tickCount;
    const isMajor = i % 3 === 0;
    const rIn = outerRingR - (isMajor ? size * 0.011 : size * 0.0055);
    const rOut = outerRingR + (isMajor ? size * 0.005 : 0);
    const x1 = cx + rIn * Math.cos(ang);
    const y1 = cy + rIn * Math.sin(ang);
    const x2 = cx + rOut * Math.cos(ang);
    const y2 = cy + rOut * Math.sin(ang);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${p.mutedInkColor}" stroke-width="${isMajor ? 1.1 : 0.6}" opacity="${isMajor ? ringStrokeOp * 1.8 : ringStrokeOp}" />`;
  }).join("\n    ");

  const waveElements = p.waveLayers
    .map(
      (w) =>
        `<path d="${w.d}" fill="${w.fill}" opacity="${w.opacity.toFixed(3)}" />
    <path d="${w.strokeD}" fill="none" stroke="${w.stroke}" stroke-width="${surface === "ambient" ? 0.8 : 1.1}" opacity="${(w.opacity * 1.45).toFixed(3)}" />`
    )
    .join("\n    ");

  const resonanceElements = p.resonancePaths
    .map((d, idx) => {
      const op = surface === "ambient" ? 0.08 - idx * 0.02 : (theme === "dark" ? 0.28 : 0.24) - idx * 0.05;
      return `<path d="${d}" fill="none" stroke="${idx % 2 === 0 ? p.primaryColor : p.secondaryColor}" stroke-width="${surface === "ambient" ? 0.85 : 1.05}" opacity="${Math.max(0.03, op).toFixed(3)}" />`;
    })
    .join("\n    ");

  const starElements = p.ambientStars
    .map(
      (st) =>
        `<circle cx="${st.x.toFixed(1)}" cy="${st.y.toFixed(1)}" r="${st.r.toFixed(2)}" fill="${st.color}" opacity="${st.opacity.toFixed(2)}" />`
    )
    .join("\n    ");

  const nodeElements =
    surface === "ambient"
      ? ""
      : p.nodes
          .map((n) => {
            const strokeColor = n.isCorrect ? p.primaryColor : p.dangerColor;
            const fillColor = n.isCorrect ? p.secondaryColor : p.dangerColor;
            const whiskerOp = n.isWarmup ? 0.2 : 0.45;
            const coreFill = n.isWarmup
              ? "none"
              : n.isCorrect
              ? fillColor
              : theme === "dark"
              ? "#090B12"
              : "#FFFDF8";

            return `<g class="trial-node">
      <line x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${n.outerX.toFixed(1)}" y2="${n.outerY.toFixed(1)}" stroke="${strokeColor}" stroke-width="1" stroke-linecap="round" opacity="${whiskerOp}" />
      ${
        !n.isWarmup && n.isCorrect
          ? `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(n.r * 2.1).toFixed(1)}" fill="${fillColor}" opacity="${(n.opacity * (theme === "dark" ? 0.22 : 0.16)).toFixed(2)}" />`
          : ""
      }
      ${
        n.isReversal
          ? `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(n.r + 3.2).toFixed(1)}" fill="none" stroke="${p.hintColor}" stroke-width="1.1" stroke-dasharray="2 2" opacity="0.85" />`
          : ""
      }
      <circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}" fill="${coreFill}" stroke="${strokeColor}" stroke-width="${n.isWarmup ? 1.1 : n.isCorrect ? 1.5 : 1.9}" opacity="${n.opacity.toFixed(2)}" />
      ${
        n.hintTaken
          ? `<polygon points="${n.outerX.toFixed(1)},${(n.outerY - 3).toFixed(1)} ${(n.outerX + 3).toFixed(1)},${n.outerY.toFixed(1)} ${n.outerX.toFixed(1)},${(n.outerY + 3).toFixed(1)} ${(n.outerX - 3).toFixed(1)},${n.outerY.toFixed(1)}" fill="${p.hintColor}" opacity="0.92" />`
          : ""
      }
    </g>`;
          })
          .join("\n    ");

  const hudMarkup =
    showHud && surface === "artifact"
      ? `<g class="manifold-hud" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" fill="${p.mutedInkColor}">
    <text x="${size * 0.055}" y="${size * 0.075}" font-size="${Math.round(size * 0.017)}" font-weight="700" letter-spacing="1.6" opacity="0.65">MANIFOLD // ${escapeXml(session.quadrant_code || "SIGIL")}</text>
    <text x="${size * 0.945}" y="${size * 0.075}" font-size="${Math.round(size * 0.017)}" font-weight="700" text-anchor="end" opacity="0.65">N=${p.totalTrials} · M=${session.metrics.m_ratio.toFixed(2)}</text>
    <text x="${size * 0.055}" y="${size * 0.945}" font-size="${Math.round(size * 0.016)}" opacity="0.58">d' ${session.metrics.d_prime.toFixed(2)} · BIAS ${session.metrics.calibration_bias >= 0 ? "+" : ""}${session.metrics.calibration_bias.toFixed(2)}</text>
    <text x="${size * 0.945}" y="${size * 0.945}" font-size="${Math.round(size * 0.016)}" text-anchor="end" opacity="0.58">HUE ${Math.round(p.baseHue)}° · HARMONIC K=${p.harmonicSymmetry}</text>
  </g>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.bgGradStart}" />
      <stop offset="52%" stop-color="${p.bgGradMid}" />
      <stop offset="100%" stop-color="${p.bgGradEnd}" />
    </linearGradient>
    <radialGradient id="aura-${uid}" cx="50%" cy="48%" r="48%">
      <stop offset="0%" stop-color="${p.auraColor}" stop-opacity="${surface === "ambient" ? (theme === "dark" ? "0.14" : "0.12") : (theme === "dark" ? "0.26" : "0.20")}" />
      <stop offset="58%" stop-color="${p.secondaryColor}" stop-opacity="${surface === "ambient" ? "0.04" : "0.07"}" />
      <stop offset="100%" stop-color="${p.bgGradStart}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="spine-grad-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.primaryColor}" stop-opacity="${theme === "dark" ? "0.32" : "0.22"}" />
      <stop offset="100%" stop-color="${p.secondaryColor}" stop-opacity="${theme === "dark" ? "0.10" : "0.08"}" />
    </linearGradient>
    <filter id="glow-${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${Math.max(1.5, size * 0.004).toFixed(1)}" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Canvas Backdrop -->
  ${surface === "artifact" ? `<rect width="${size}" height="${size}" fill="url(#bg-${uid})" />` : ""}
  <circle cx="${cx}" cy="${cy}" r="${size * 0.48}" fill="url(#aura-${uid})" />

  <!-- Topographic Simplex Harmonic Waves -->
  <g class="manifold-waves">
    ${waveElements}
  </g>

  <!-- Astrolabe Coordinate Reticle -->
  <g class="radar-rings" fill="none">
    <line x1="${cx - outerRingR - size * 0.025}" y1="${cy}" x2="${cx + outerRingR + size * 0.025}" y2="${cy}" stroke="${p.mutedInkColor}" stroke-width="0.7" opacity="${ringStrokeOp}" />
    <line x1="${cx}" y1="${cy - outerRingR - size * 0.025}" x2="${cx}" y2="${cy + outerRingR + size * 0.025}" stroke="${p.mutedInkColor}" stroke-width="0.7" opacity="${ringStrokeOp}" />
    ${ringRadii
      .map(
        (r, i) =>
          `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" stroke="${p.mutedInkColor}" stroke-width="${i === 3 ? 1 : 0.75}" ${i % 2 === 1 ? 'stroke-dasharray="3 4"' : ""} opacity="${(ringStrokeOp * (i === 3 ? 1.4 : 1)).toFixed(3)}" />`
      )
      .join("\n    ")}
    ${ticksMarkup}
  </g>

  <!-- Parametric Harmonic Resonance Halo -->
  <g class="resonance-filaments">
    ${resonanceElements}
  </g>

  <!-- Ideal Difficulty Reference Curve -->
  ${
    surface === "artifact"
      ? `<path d="${p.baselinePath}" fill="none" stroke="${p.mutedInkColor}" stroke-width="0.9" stroke-dasharray="3 4" opacity="0.28" />`
      : ""
  }

  <!-- Smooth Cubic-Bézier Cognitive Trajectory Envelope -->
  <path d="${p.spinePath}" fill="url(#spine-grad-${uid})" stroke="${p.primaryColor}" stroke-width="${surface === "ambient" ? 1.0 : 1.9}" opacity="${surface === "ambient" ? 0.22 : 0.88}" ${surface === "artifact" && theme === "dark" ? `filter="url(#glow-${uid})"` : ""} />

  <!-- Micro Star Field -->
  <g class="ambient-stars">
    ${starElements}
  </g>

  <!-- Micro Trial Constellation Nodes -->
  <g class="constellation-nodes">
    ${nodeElements}
  </g>

  <!-- Central Origin Core -->
  <circle cx="${cx}" cy="${cy}" r="${(size * 0.0065).toFixed(1)}" fill="${p.primaryColor}" opacity="${surface === "ambient" ? 0.25 : 0.85}" />
  <circle cx="${cx}" cy="${cy}" r="${(size * 0.016).toFixed(1)}" fill="none" stroke="${p.secondaryColor}" stroke-width="0.9" opacity="${surface === "ambient" ? 0.14 : 0.45}" />

  ${hudMarkup}
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

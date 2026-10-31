import { VisualColorToken } from "../types/admin";

/**
 * Spec §7.4: 双变量色彩映射纯函数
 * Hue 表达决策偏向倾角 Bias (冷暖双极流向)
 * Saturation, Alpha & Glow 表达信息觅食弹性 IVE (能量充盈度)
 */
export function computeMultivariateColor(
  bias: number, // [-1.0, 1.0], 决策倾角
  ive: number   // [0.0, 1.0], 信息觅食杠杆
): VisualColorToken {
  // 1. 计算色相 Hue (Bias 驱动: 冰蓝 205° -> 翡翠绿 155° -> 炽橙红 15°)
  let hue = 155;
  if (bias < -0.12) {
    const t = Math.min(1.0, Math.max(0.0, (-bias - 0.12) / 0.25));
    hue = Math.round(155 + t * 50); // 155° -> 205°
  } else if (bias > 0.12) {
    const t = Math.min(1.0, Math.max(0.0, (bias - 0.12) / 0.25));
    hue = Math.round(155 - t * 140); // 155° -> 15°
  }

  // 2. 计算饱和度 Saturation 与亮度 Lightness (IVE 驱动)
  const clampedIve = Math.min(1.0, Math.max(0.0, ive));
  const saturation = Math.round(40 + clampedIve * 60); // 40% ~ 100%
  const lightness = Math.round(50 + clampedIve * 10);   // 50% ~ 60%

  // 3. 计算约束透明度 Alpha (IVE 驱动，设立 0.45 保底，杜绝隐形)
  const alpha = (0.45 + clampedIve * 0.55).toFixed(2); // 0.45 ~ 1.00

  // 4. 高杠杆外发光辉光 (IVE >= 0.70 激活)
  const isHighLeverage = clampedIve >= 0.70;
  const boxShadow = isHighLeverage
    ? `0 0 10px hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`
    : "none";

  return {
    backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`,
    borderColor: `hsla(${hue}, ${saturation}%, ${Math.min(90, lightness + 20)}%, 0.9)`,
    boxShadow,
    hue,
  };
}

/**
 * 计算极坐标扇面路径 (SVG Path)
 */
export function getSectorAnnulusPath(
  startDeg: number,
  endDeg: number,
  rInner: number,
  rOuter: number,
  cx: number = 440,
  cy: number = 280
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const radStart = toRad(startDeg);
  const radEnd = toRad(endDeg);

  const x1 = cx + rInner * Math.cos(radStart);
  const y1 = cy + rInner * Math.sin(radStart);
  const x2 = cx + rOuter * Math.cos(radStart);
  const y2 = cy + rOuter * Math.sin(radStart);

  const x3 = cx + rOuter * Math.cos(radEnd);
  const y3 = cy + rOuter * Math.sin(radEnd);
  const x4 = cx + rInner * Math.cos(radEnd);
  const y4 = cy + rInner * Math.sin(radEnd);

  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${rOuter} ${rOuter} 0 0 1 ${x3.toFixed(1)} ${y3.toFixed(1)} L ${x4.toFixed(1)} ${y4.toFixed(1)} A ${rInner} ${rInner} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
}

/**
 * 格式化数值展示
 */
export function formatBias(bias: number): string {
  return bias > 0 ? `+${bias}` : `${bias}`;
}

/**
 * 计算两人之间的四维元认知流形契合度/相似度百分比 (0 ~ 100%)
 * 向量维度: [d_star (0~1), m_ratio (0~2), calibration_bias (-1~1), ive (0~1)]
 */
export function computeCognitiveSimilarity(
  v1: [number, number, number, number] | number[] = [0.5, 0.9, 0.0, 0.5],
  v2: [number, number, number, number] | number[] = [0.5, 0.9, 0.0, 0.5]
): number {
  if (!v1 || !v2) return 100;
  
  const dStar1 = v1[0] ?? 0.5;
  const dStar2 = v2[0] ?? 0.5;
  const diffDStar = Math.abs(dStar1 - dStar2); // range ~1

  const mRatio1 = Math.max(0, Math.min(2.5, v1[1] ?? 0.9));
  const mRatio2 = Math.max(0, Math.min(2.5, v2[1] ?? 0.9));
  const diffMRatio = Math.abs(mRatio1 - mRatio2) / 2.0; // normalized ~1

  const bias1 = Math.max(-1, Math.min(1, v1[2] ?? 0.0));
  const bias2 = Math.max(-1, Math.min(1, v2[2] ?? 0.0));
  const diffBias = Math.abs(bias1 - bias2) / 2.0; // normalized ~1

  const ive1 = Math.max(0, Math.min(1, v1[3] ?? 0.5));
  const ive2 = Math.max(0, Math.min(1, v2[3] ?? 0.5));
  const diffIve = Math.abs(ive1 - ive2); // range ~1

  // 4D 归一化欧氏距离
  const normalizedDistance = Math.sqrt(
    (Math.pow(diffDStar, 2) + Math.pow(diffMRatio, 2) + Math.pow(diffBias, 2) + Math.pow(diffIve, 2)) / 4
  );

  const similarity = Math.round(Math.max(0, Math.min(100, (1 - normalizedDistance) * 100)));
  return similarity;
}


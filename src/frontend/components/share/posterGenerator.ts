/**
 * Poster Generator Engine (posterGenerator.ts)
 * 
 * Generates ultra-high-definition exportable share posters (1080x1920) for the
 * 8 Chinese Cognitive Archetypes with Oriental Brush/Gold aesthetics.
 * Supports dynamic QR code, PNG download, and direct clipboard image copy.
 */

import QRCode from "qrcode";
import { CognitiveArchetype } from "../../../backend/models";
import { getMythicArchetype, MythicArchetypeConfig } from "./mythicArchetypes";

export interface PosterShareData {
  subjectName: string;
  archetype: CognitiveArchetype | string;
  roleTitle?: string;
  praiseTagline?: string;
  strengthTags?: string[];
  metrics: {
    d_prime?: number;
    meta_d_prime?: number;
    m_ratio?: number;
    calibration_bias?: number;
    d_star?: number;
    ive?: number;
  };
  entryUrl?: string;
  dateText?: string;
}

/**
 * 格式化通用认知指标
 */
export function formatCognitiveMetric(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || Number.isNaN(val)) return "--";
  if (!Number.isFinite(val)) {
    return val > 0 ? "9.99+" : "-9.99";
  }
  return val.toFixed(decimals);
}

/**
 * 格式化校准偏置 (Bias)，带正负号
 */
export function formatBiasMetric(bias: number | undefined | null): string {
  if (bias === undefined || bias === null || Number.isNaN(bias)) return "--";
  if (!Number.isFinite(bias)) return "--";
  if (Math.abs(bias) < 0.0001) return "±0.00";
  const sign = bias > 0 ? "+" : "";
  return `${sign}${bias.toFixed(2)}`;
}

/**
 * 格式化 M_ratio 百分比或倍率
 */
export function formatMRatioMetric(mRatio: number | undefined | null): string {
  if (mRatio === undefined || mRatio === null || Number.isNaN(mRatio)) return "--";
  if (!Number.isFinite(mRatio)) return "9.99+";
  return mRatio.toFixed(2);
}

/**
 * 生成动态二维码 SVG 字符串
 */
export async function generatePosterQrCodeSvg(url: string): Promise<string> {
  const finalUrl = url || "http://localhost:8000/";
  return await QRCode.toString(finalUrl, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#0b0d13",
      light: "#ffffff",
    },
  });
}

/**
 * 生成动态二维码 DataURL (PNG base64)
 */
export async function generatePosterQrCodeDataUrl(
  url: string,
  darkColor: string = "#0b0d13",
  lightColor: string = "#ffffff"
): Promise<string> {
  const finalUrl = url || "http://localhost:8000/";
  return await QRCode.toDataURL(finalUrl, {
    margin: 1,
    width: 280,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });
}

/**
 * 在 Canvas 上绘制回纹/如意云纹角标
 */
function drawChineseCornerFret(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  dirX: 1 | -1,
  dirY: 1 | -1,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "square";
  ctx.beginPath();

  // 外侧直角
  ctx.moveTo(x, y + dirY * size);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dirX * size, y);

  // 回环内折
  const s2 = size * 0.65;
  const s3 = size * 0.35;
  ctx.moveTo(x + dirX * 12, y + dirY * s2);
  ctx.lineTo(x + dirX * 12, y + dirY * 12);
  ctx.lineTo(x + dirX * s2, y + dirY * 12);
  ctx.lineTo(x + dirX * s2, y + dirY * s3);
  ctx.lineTo(x + dirX * s3, y + dirY * s3);

  ctx.stroke();
  ctx.restore();
}

/**
 * 在 Canvas 上绘制朱砂印章 (篆刻风格方印)
 */
function drawVermilionSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  text: string
) {
  ctx.save();
  // 朱砂印章背景
  ctx.fillStyle = "#b91c1c";
  ctx.shadowColor = "rgba(185, 28, 28, 0.5)";
  ctx.shadowBlur = 12;

  // 稍微粗粝的圆角方印
  const r = 8;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, r);
  ctx.fill();

  // 印泥白文/金文内边框
  ctx.strokeStyle = "rgba(254, 240, 138, 0.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 5, size - 10, size - 10, r - 3);
  ctx.stroke();

  // 篆刻四字 (2x2 排布: 右上 -> 右下 -> 左上 -> 左下 传统印序)
  ctx.fillStyle = "#fef08a";
  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.floor(size * 0.36)}px "STKaiti", "KaiTi", "Songti SC", "SimSun", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const chars = text.slice(0, 4);
  const c0 = chars[0] || "天";
  const c1 = chars[1] || "元";
  const c2 = chars[2] || "统";
  const c3 = chars[3] || "御";

  const cx1 = x + size * 0.72;
  const cx2 = x + size * 0.28;
  const cy1 = y + size * 0.30;
  const cy2 = y + size * 0.72;

  // 传统古印布局：右列上、右列下、左列上、左列下
  ctx.fillText(c0, cx1, cy1);
  ctx.fillText(c1, cx1, cy2);
  ctx.fillText(c2, cx2, cy1);
  ctx.fillText(c3, cx2, cy2);

  ctx.restore();
}

/**
 * 绘制易经三爻结构 (初爻、二爻、上爻)
 */
function drawTrigramLines(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  lines: [boolean, boolean, boolean],
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";

  const lineSpacing = 12;
  const gap = 12;
  const half = width / 2;

  // 从下往上画：初爻(0)、二爻(1)、上爻(2)
  for (let i = 0; i < 3; i++) {
    const isYang = lines[i];
    const y = cy + (1 - i) * lineSpacing;

    if (isYang) {
      // 阳爻：一整条实线
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
    } else {
      // 阴爻：两段断线
      const segLen = (width - gap) / 2;
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx - half + segLen, y);
      ctx.moveTo(cx + half - segLen, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * 渲染全量超高清 (1080 x 1920) 东方神话海报至 Canvas
 */
export async function renderPosterToCanvas(
  data: PosterShareData,
  scale: number = 1
): Promise<HTMLCanvasElement> {
  const WIDTH = 1080 * scale;
  const HEIGHT = 1920 * scale;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  ctx.scale(scale, scale);

  const config = getMythicArchetype(data.archetype);
  const W = 1080;
  const H = 1920;

  // 1. 深邃东方水墨星汉背景 (Radial Dark Indigo/Black to Archetype Tint)
  const bgGrad = ctx.createRadialGradient(W / 2, H * 0.35, 80, W / 2, H * 0.5, W * 0.9);
  bgGrad.addColorStop(0, config.colorScheme.bgRadialInner);
  bgGrad.addColorStop(0.65, config.colorScheme.bgRadialOuter);
  bgGrad.addColorStop(1, "#050608");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. 泥金星尘粒子与氛围微晕
  ctx.save();
  ctx.fillStyle = config.colorScheme.primaryGold;
  for (let i = 0; i < 48; i++) {
    const px = ((i * 197 + 83) % (W - 80)) + 40;
    const py = ((i * 311 + 47) % (H - 80)) + 40;
    const pr = ((i % 5) + 1) * 0.8;
    const alpha = ((i % 7) + 2) * 0.05;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. 传统东方双金线华丽边框与古典回纹角标
  const m = 44; // margin
  const goldColor = config.colorScheme.primaryGold;

  // 外框单线
  ctx.strokeStyle = "rgba(254, 240, 138, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m - 8, m - 8, W - (m - 8) * 2, H - (m - 8) * 2);

  // 主金线框
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);

  // 内侧金线
  ctx.strokeStyle = "rgba(254, 240, 138, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(m + 8, m + 8, W - (m + 8) * 2, H - (m + 8) * 2);

  // 四角回纹
  const fretSize = 36;
  drawChineseCornerFret(ctx, m + 8, m + 8, fretSize, 1, 1, goldColor);
  drawChineseCornerFret(ctx, W - m - 8, m + 8, fretSize, -1, 1, goldColor);
  drawChineseCornerFret(ctx, m + 8, H - m - 8, fretSize, 1, -1, goldColor);
  drawChineseCornerFret(ctx, W - m - 8, H - m - 8, fretSize, -1, -1, goldColor);

  // 4. 顶部古典殿阁标头 (Header)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 标头顶带徽标
  ctx.fillStyle = config.colorScheme.secondaryGold;
  ctx.font = `bold 24px "Songti SC", "SimSun", "STSong", serif`;
  ctx.letterSpacing = "6px";
  ctx.fillText("东方认知流形 · 周易八卦心智图谱", W / 2, 105);

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = `600 13px system-ui, -apple-system, sans-serif`;
  ctx.letterSpacing = "4px";
  ctx.fillText("CHINESE COGNITIVE MANIFOLD ARCHETYPE SPECTRUM", W / 2, 135);

  // 装饰分隔金线
  ctx.strokeStyle = "rgba(254, 240, 138, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 160, 155);
  ctx.lineTo(W / 2 + 160, 155);
  ctx.stroke();

  // 5. 核心图腾与八卦徽章 (Bagua & Totem Central Badge)
  const badgeY = 285;
  // 外层辉光光晕
  const auraGrad = ctx.createRadialGradient(W / 2, badgeY, 20, W / 2, badgeY, 150);
  auraGrad.addColorStop(0, config.colorScheme.glowColor);
  auraGrad.addColorStop(1, "transparent");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(W / 2, badgeY, 150, 0, Math.PI * 2);
  ctx.fill();

  // 八卦罗盘外环
  ctx.strokeStyle = config.colorScheme.primaryGold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, badgeY, 90, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(254, 240, 138, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(W / 2, badgeY, 100, 0, Math.PI * 2);
  ctx.stroke();

  // 罗盘刻度点
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    const px = W / 2 + Math.cos(rad) * 95;
    const py = badgeY + Math.sin(rad) * 95;
    ctx.fillStyle = config.colorScheme.secondaryGold;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 中心八卦卦象符号 (☰ 等)
  ctx.fillStyle = config.colorScheme.secondaryGold;
  ctx.font = `900 68px "STKaiti", "Songti SC", serif`;
  ctx.fillText(config.baguaSymbol, W / 2, badgeY - 10);

  // 易经三爻结构示意
  drawTrigramLines(ctx, W / 2, badgeY + 48, 54, config.trigramLines, config.colorScheme.secondaryGold);

  // 图腾称号徽带 (如 "【九天应龙 · 统御天道】")
  const ribbonY = 425;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.roundRect(W / 2 - 200, ribbonY - 20, 400, 40, 20);
  ctx.fill();
  ctx.strokeStyle = config.colorScheme.primaryGold;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = config.colorScheme.secondaryGold;
  ctx.font = `bold 18px "STKaiti", "Songti SC", serif`;
  ctx.letterSpacing = "2px";
  ctx.fillText(`【 ${config.mythicTotem} · ${config.baguaName}为${config.baguaNature} 】`, W / 2, ribbonY);

  // 6. 受测者身份与专属本命称号
  const titleY = 515;
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.font = `600 18px system-ui, sans-serif`;
  ctx.letterSpacing = "3px";
  const subjectStr = `探索者 · ${data.subjectName || "无名道者"}`;
  ctx.fillText(subjectStr, W / 2, titleY);

  // 核心角色大字 (如 "人形外挂", 渐变曜金)
  const roleName = data.roleTitle || config.roleTitle;
  const roleY = 600;
  const roleGrad = ctx.createLinearGradient(W / 2 - 180, roleY - 40, W / 2 + 180, roleY + 40);
  roleGrad.addColorStop(0, "#fffbeb");
  roleGrad.addColorStop(0.35, config.colorScheme.secondaryGold);
  roleGrad.addColorStop(0.7, config.colorScheme.primaryGold);
  roleGrad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = roleGrad;
  ctx.font = `900 82px "STKaiti", "Songti SC", "SimSun", serif`;
  ctx.letterSpacing = "8px";
  ctx.shadowColor = config.colorScheme.glowColor;
  ctx.shadowBlur = 24;
  ctx.fillText(roleName, W / 2, roleY);
  ctx.shadowBlur = 0;

  // 象限代码角标 (如 "Q1-CAL")
  ctx.fillStyle = config.colorScheme.accentColor;
  ctx.font = `bold 16px "SF Mono", monospace`;
  ctx.letterSpacing = "1px";
  ctx.fillText(`[ ${config.quadrantCode} ]`, W / 2, roleY + 54);

  // 专属赞许金句 Tagline
  const tagline = data.praiseTagline || config.praiseTagline;
  const tagY = 710;
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 28px "STKaiti", "Songti SC", serif`;
  ctx.letterSpacing = "3px";
  ctx.fillText(`“ ${tagline} ”`, W / 2, tagY);

  // 7. 高光标签 (Tags)
  const tags = data.strengthTags || [
    "高维逻辑底蕴",
    "算力降维压制",
    "知行绝对自洽",
    "手术刀级决断",
  ];
  const tagsY = 775;
  const tagTotalW = tags.length * 155;
  let tagStartX = (W - tagTotalW) / 2 + 75;
  for (const tag of tags.slice(0, 4)) {
    ctx.fillStyle = "rgba(254, 240, 138, 0.12)";
    ctx.strokeStyle = "rgba(254, 240, 138, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tagStartX - 70, tagsY - 18, 140, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = config.colorScheme.secondaryGold;
    ctx.font = `bold 15px system-ui, sans-serif`;
    ctx.letterSpacing = "1px";
    ctx.fillText(`#${tag}`, tagStartX, tagsY);
    tagStartX += 155;
  }

  // 8. 4D 认知流形指标矩阵 (The 4D Cognitive Metrics Grid)
  const metricsStartY = 845;
  const cardW = 450;
  const cardH = 120;
  const col1X = W / 2 - cardW / 2 - 15 - cardW / 2; // (W/2 - cardW - 15)
  const col2X = W / 2 + 15 + cardW / 2;

  const metricItems = [
    {
      symbol: "d'",
      title: "一元客观辨别力",
      en: "Type-1 Objective Sensitivity",
      val: formatCognitiveMetric(data.metrics.d_prime),
      desc: "底层抽象推导硬核战力",
    },
    {
      symbol: "Meta-d'",
      title: "二元自我觉察力",
      en: "Type-2 Metacognitive Sensitivity",
      val: formatCognitiveMetric(data.metrics.meta_d_prime),
      desc: "知己掌控与边界分辨率",
    },
    {
      symbol: "M-ratio",
      title: "二元自洽效能",
      en: "Metacognitive Efficiency",
      val: formatMRatioMetric(data.metrics.m_ratio),
      desc: "元认知杠杆对齐转化率",
    },
    {
      symbol: "Bias",
      title: "校准决策偏置",
      en: "Calibration Bias",
      val: formatBiasMetric(data.metrics.calibration_bias),
      desc: "冒进搏杀 vs 审慎避险",
    },
  ];

  for (let idx = 0; idx < metricItems.length; idx++) {
    const item = metricItems[idx];
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const cx = col === 0 ? W / 2 - cardW / 2 - 12 : W / 2 + cardW / 2 + 12;
    const cy = metricsStartY + row * (cardH + 18) + cardH / 2;

    // 单项指标背景卡
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.strokeStyle = "rgba(254, 240, 138, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // 指标数值 (左侧大字)
    ctx.textAlign = "left";
    ctx.fillStyle = config.colorScheme.secondaryGold;
    ctx.font = `bold 42px "SF Mono", monospace`;
    ctx.letterSpacing = "0px";
    ctx.fillText(item.val, cx - cardW / 2 + 24, cy - 8);

    // 指标符号与名称
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 18px system-ui, sans-serif`;
    ctx.fillText(`${item.symbol}  ${item.title}`, cx - cardW / 2 + 24, cy + 28);

    // 辅助描述 (右侧)
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `13px system-ui, sans-serif`;
    ctx.fillText(item.desc, cx + cardW / 2 - 20, cy + 28);
    ctx.fillText(item.en, cx + cardW / 2 - 20, cy - 10);
  }

  // 9. 易经象辞古训典故横幅 (Hexagram Aphorism Banner)
  const aphorismY = 1170;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.strokeStyle = "rgba(254, 240, 138, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 470, aphorismY - 45, 940, 90, 16);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = config.colorScheme.secondaryGold;
  ctx.font = `bold 16px "Songti SC", serif`;
  ctx.letterSpacing = "4px";
  ctx.fillText("【 周易 · 象曰 】", W / 2, aphorismY - 18);

  ctx.fillStyle = "#f3f4f6";
  ctx.font = `italic 20px "STKaiti", "Songti SC", serif`;
  ctx.letterSpacing = "1.5px";
  ctx.fillText(`“${config.hexagramAphorism}”`, W / 2, aphorismY + 16);

  // 10. 东方朱砂篆刻印章 (Vermilion Seal)
  const sealX = W - m - 160;
  const sealY = 1320;
  drawVermilionSeal(ctx, sealX, sealY, 110, config.sealText);

  // 11. 动态二维码区域与扫码邀约
  const qrSectionY = 1480;
  const qrUrl = data.entryUrl || (typeof window !== "undefined" ? window.location.href : "http://localhost:8000/");

  // 二维码背景边框
  const qrBoxSize = 240;
  const qrBoxX = W / 2 - qrBoxSize / 2;
  const qrBoxY = qrSectionY - 40;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
  ctx.fill();

  // 绘制动态生成的 QR Code 图片
  try {
    const qrDataUrl = await generatePosterQrCodeDataUrl(qrUrl, "#0b0d13", "#ffffff");
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve, reject) => {
      qrImg.onload = resolve;
      qrImg.onerror = reject;
    });
    ctx.drawImage(qrImg, qrBoxX + 10, qrBoxY + 10, qrBoxSize - 20, qrBoxSize - 20);
  } catch {
    // 降级绘制方框
    ctx.fillStyle = "#000000";
    ctx.font = `14px monospace`;
    ctx.fillText("QR CODE", W / 2, qrSectionY + 80);
  }

  // 二维码外环古典装饰边框
  ctx.strokeStyle = config.colorScheme.primaryGold;
  ctx.lineWidth = 2;
  ctx.strokeRect(qrBoxX - 6, qrBoxY - 6, qrBoxSize + 12, qrBoxSize + 12);

  // 扫码呼召文案 (Call To Action)
  ctx.textAlign = "center";
  ctx.fillStyle = config.colorScheme.secondaryGold;
  ctx.font = `bold 22px "STKaiti", "Songti SC", serif`;
  ctx.letterSpacing = "3px";
  ctx.fillText("长按识别二维码 · 测算你的认知本命流形", W / 2, qrSectionY + 245);

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = `14px system-ui, sans-serif`;
  ctx.letterSpacing = "2px";
  ctx.fillText("SCAN TO DISCOVER YOUR TWO-TIER METACOGNITIVE ARCHETYPE", W / 2, qrSectionY + 278);

  // 12. 底部极简防伪溯源脚注 (Footer)
  const footerY = 1845;
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = `13px "SF Mono", monospace`;
  ctx.letterSpacing = "1.5px";
  const dateStr = data.dateText || new Date().toISOString().split("T")[0];
  ctx.fillText(`VERIFIED INFERENCE · ${dateStr} · SYSTEM V2.0 · LAB DEPT.`, W / 2, footerY);

  return canvas;
}

/**
 * 生成海报 Blob 对象 (PNG)
 */
export async function generatePosterBlob(data: PosterShareData, scale: number = 2): Promise<Blob> {
  const canvas = await renderPosterToCanvas(data, scale);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export canvas to PNG blob"));
    }, "image/png");
  });
}

/**
 * 一键下载高清海报 PNG
 */
export async function downloadPoster(data: PosterShareData, customFilename?: string): Promise<void> {
  const config = getMythicArchetype(data.archetype);
  const blob = await generatePosterBlob(data, 2);
  const url = URL.createObjectURL(blob);

  const cleanName = (data.subjectName || "explorer").replace(/[/\\?%*:|"<>]/g, "");
  const filename = customFilename || `认知流形本命海报-${config.roleTitle}-${cleanName}.png`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 一键复制海报图片到剪贴板 (优先使用 ClipboardItem，降级处理兼容各种环境)
 */
export async function copyPosterImageToClipboard(
  data: PosterShareData
): Promise<{ success: boolean; fallback?: boolean; error?: string }> {
  try {
    const blob = await generatePosterBlob(data, 2);

    // 1. 尝试现代浏览器的 ClipboardItem 图片写入
    if (navigator?.clipboard?.write && typeof ClipboardItem !== "undefined") {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        return { success: true };
      } catch (clipErr: any) {
        console.warn("ClipboardItem image write failed, falling back to download:", clipErr);
        // 如果剪贴板图片写入被拒绝（例如部分移动端浏览器不支持写入非文本），自动降级为直接下载
        await downloadPoster(data);
        return { success: true, fallback: true, error: clipErr.message };
      }
    }

    // 2. 环境不支持剪贴板图片写入，降级为下载
    await downloadPoster(data);
    return { success: true, fallback: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to copy poster" };
  }
}

/**
 * 复制文案格式的分享信息
 */
export async function copyShareTextToClipboard(data: PosterShareData): Promise<boolean> {
  const config = getMythicArchetype(data.archetype);
  const tagline = data.praiseTagline || config.praiseTagline;
  const tags = data.strengthTags?.map((t) => `#${t}`).join(" ") || "";
  const metrics = data.metrics;

  const text = [
    `【${config.baguaName}卦 · ${config.mythicTotem}】${config.roleTitle}（${config.quadrantCode}）`,
    `“${tagline}”`,
    `探索者：${data.subjectName}`,
    tags,
    `───────────`,
    `4D 认知流形特征：`,
    `• 一元辨别力 d' = ${formatCognitiveMetric(metrics.d_prime)}`,
    `• 二元敏锐度 Meta-d' = ${formatCognitiveMetric(metrics.meta_d_prime)}`,
    `• 认知自洽率 M_ratio = ${formatMRatioMetric(metrics.m_ratio)}`,
    `• 校准决策偏置 Bias = ${formatBiasMetric(metrics.calibration_bias)}`,
    `───────────`,
    `易经象辞：“${config.hexagramAphorism}”`,
    `探寻你的认知本命流形：${data.entryUrl || "http://localhost:8000/"}`,
  ].join("\n");

  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

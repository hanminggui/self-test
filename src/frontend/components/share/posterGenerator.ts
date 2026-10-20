/**
 * Poster Generator Engine (posterGenerator.ts)
 * 
 * Generates ultra-high-definition exportable share posters (1080x1920) for both:
 * 1. Chinese Oriental Mythic Archetypes (Brush/Gold & Celestial Totems)
 * 2. Western Arcane Orders (Arcane Crests & Astral Gold)
 * 
 * Features:
 * - 1:1 reproduction of web preview ambient glow, stardust noise, and dark-gold gradient depth
 * - Sensitive 4D raw metrics & quadrant codes PURGED from canvas and share text
 * - 4 Unique Positive Cognitive Skills in balanced glassmorphic layout
 * - Real user nickname in avatar ribbon
 * - Dynamic QR code, PNG download, and clipboard image copy
 */

import QRCode from "qrcode";
import { CognitiveArchetype } from "../../../backend/models";
import { getMythicArchetype, MythicArchetypeConfig } from "./mythicArchetypes";
import { getArcaneArchetype, ArcaneArchetypeConfig } from "./arcaneArchetypes";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";

export interface SkillDisplayItem {
  icon?: string;
  type?: string;
  name: string;
  desc: string;
}

export interface PosterShareData {
  subjectName: string;
  archetype: CognitiveArchetype | string;
  roleTitle?: string;
  praiseTagline?: string;
  strengthTags?: string[];
  skills?: SkillDisplayItem[];
  empoweringFeedback?: string;
  locale?: string;
  // Metrics kept optional for backward signature compatibility, but NEVER rendered on poster
  metrics?: {
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
 * 格式化通用认知指标 (保留兼容性测试支持)
 */
export function formatCognitiveMetric(val: number | undefined | null, decimals: number = 2): string {
  if (val === undefined || val === null || Number.isNaN(val)) return "--";
  if (!Number.isFinite(val)) {
    return val > 0 ? "9.99+" : "-9.99";
  }
  return val.toFixed(decimals);
}

/**
 * 格式化校准偏置 (Bias)，带正负号 (保留兼容性测试支持)
 */
export function formatBiasMetric(bias: number | undefined | null): string {
  if (bias === undefined || bias === null || Number.isNaN(bias)) return "--";
  if (!Number.isFinite(bias)) return "--";
  if (Math.abs(bias) < 0.0001) return "±0.00";
  const sign = bias > 0 ? "+" : "";
  return `${sign}${bias.toFixed(2)}`;
}

/**
 * 格式化 M_ratio 百分比或倍率 (保留兼容性测试支持)
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
 * 在 Canvas 上绘制回纹/角标
 */
function drawCornerFret(
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
 * 在 Canvas 上绘制朱砂/秘法印章
 */
function drawSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  text: string,
  isEn: boolean
) {
  ctx.save();
  // 红色朱砂底或深金秘法底
  ctx.fillStyle = isEn ? "#4c1d95" : "#b91c1c";
  ctx.shadowColor = isEn ? "rgba(124, 58, 237, 0.5)" : "rgba(185, 28, 28, 0.5)";
  ctx.shadowBlur = 12;

  const r = 8;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + size - r, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + r);
  ctx.lineTo(x + size, y + size - r);
  ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  ctx.lineTo(x + r, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // 印章双边框
  ctx.shadowBlur = 0;
  ctx.strokeStyle = isEn ? "#c084fc" : "#fef08a";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

  // 阳刻文字
  ctx.fillStyle = isEn ? "#f5f3ff" : "#fef08a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (isEn) {
    ctx.font = `bold 13px system-ui, sans-serif`;
    ctx.letterSpacing = "1px";
    const words = text.split(" ");
    if (words.length >= 2) {
      ctx.fillText(words[0], x + size / 2, y + size / 2 - 10);
      ctx.fillText(words.slice(1).join(" "), x + size / 2, y + size / 2 + 10);
    } else {
      ctx.fillText(text, x + size / 2, y + size / 2);
    }
  } else {
    ctx.font = `bold 22px "STKaiti", "Songti SC", serif`;
    const clean = text.slice(0, 4);
    if (clean.length === 4) {
      ctx.fillText(clean.slice(0, 2), x + size / 2, y + size / 2 - 14);
      ctx.fillText(clean.slice(2, 4), x + size / 2, y + size / 2 + 14);
    } else {
      ctx.fillText(clean, x + size / 2, y + size / 2);
    }
  }

  ctx.restore();
}

/**
 * 辅助：在 Canvas 上换行绘制文本
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 2
) {
  const chars = Array.from(text);
  let line = "";
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < chars.length; n++) {
    const testLine = line + chars[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        ctx.fillText(line + "...", x, currentY);
        return;
      }
      ctx.fillText(line, x, currentY);
      line = chars[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

/**
 * 渲染全量超高清 (1080 x 1920) 专属分享海报至 Canvas
 * 1:1 完整复刻网页端背景光晕、暗金沉底渐变与细密星尘粒子质感
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

  const W = 1080;
  const H = 1920;
  const isEn = data.locale === "en-US" || (typeof data.archetype === "string" && data.archetype.includes("Archmage"));

  const mythicConfig = getMythicArchetype(data.archetype);
  const arcaneConfig = getArcaneArchetype(data.archetype);

  const colorScheme = isEn ? arcaneConfig.colorScheme : mythicConfig.colorScheme;
  const roleTitle = isEn
    ? (data.roleTitle || arcaneConfig.roleTitle)
    : (data.roleTitle || mythicConfig.roleTitle);
  const praiseTagline = isEn
    ? (data.praiseTagline || arcaneConfig.praiseTagline)
    : (data.praiseTagline || mythicConfig.praiseTagline);

  // 获取 4 项原创正向特技
  const skills: SkillDisplayItem[] = (data.skills && data.skills.length >= 4)
    ? data.skills
    : isEn
      ? arcaneConfig.skills
      : (getArchetypeDefinition(mythicConfig.archetype, "zh-CN").skills || []);

  const strengthTags = data.strengthTags && data.strengthTags.length > 0
    ? data.strengthTags.slice(0, 4)
    : isEn
      ? arcaneConfig.strengthTags
      : ["高维逻辑底蕴", "算力降维压制", "知行绝对自洽", "手术刀级决断"];

  const empoweringFeedback = data.empoweringFeedback || (isEn
    ? arcaneConfig.empoweringFeedback
    : (mythicConfig.totemAphorism || "自强不息，知行自洽。"));

  // ==========================================
  // 1. 多层背景渲染 (1:1 沉底暗金渐变与径向发光)
  // ==========================================

  // 底层深色基底
  ctx.fillStyle = "#050608";
  ctx.fillRect(0, 0, W, H);

  // 顶部中心径向主氛围光晕
  const topGlowGrad = ctx.createRadialGradient(W / 2, H * 0.22, 60, W / 2, H * 0.35, W * 0.85);
  topGlowGrad.addColorStop(0, colorScheme.bgRadialInner);
  topGlowGrad.addColorStop(0.55, colorScheme.bgRadialOuter);
  topGlowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = topGlowGrad;
  ctx.fillRect(0, 0, W, H);

  // 底部暗金/流光沉底渐变 (消除黑底生硬感)
  const bottomGlowGrad = ctx.createRadialGradient(W / 2, H * 0.98, 80, W / 2, H * 0.82, W * 0.75);
  bottomGlowGrad.addColorStop(0, colorScheme.bgRadialInner);
  bottomGlowGrad.addColorStop(0.65, colorScheme.bgRadialOuter);
  bottomGlowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = bottomGlowGrad;
  ctx.fillRect(0, 0, W, H);

  // ==========================================
  // 2. 细密星尘粒子噪点 (180+ 粒子随机分布)
  // ==========================================
  ctx.save();
  for (let i = 0; i < 180; i++) {
    const px = ((i * 197 + 83) % (W - 80)) + 40;
    const py = ((i * 311 + 47) % (H - 80)) + 40;
    const pr = ((i % 5) + 1) * 0.6;
    const alpha = ((i % 9) + 2) * 0.04;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 3 === 0 ? colorScheme.secondaryGold : colorScheme.primaryGold;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    // 偶发星芒十字
    if (i % 25 === 0) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = colorScheme.secondaryGold;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px - 4, py);
      ctx.lineTo(px + 4, py);
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px, py + 4);
      ctx.stroke();
    }
  }
  ctx.restore();

  // ==========================================
  // 3. 双层边框与典雅角标
  // ==========================================
  const m = 44; // 边距
  const primaryColor = colorScheme.primaryGold;

  // 外框单线
  ctx.strokeStyle = "rgba(254, 240, 138, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m - 8, m - 8, W - (m - 8) * 2, H - (m - 8) * 2);

  // 主金线框
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);

  // 内侧金线
  ctx.strokeStyle = "rgba(254, 240, 138, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(m + 8, m + 8, W - (m + 8) * 2, H - (m + 8) * 2);

  // 四角回纹
  const fretSize = 36;
  drawCornerFret(ctx, m + 8, m + 8, fretSize, 1, 1, primaryColor);
  drawCornerFret(ctx, W - m - 8, m + 8, fretSize, -1, 1, primaryColor);
  drawCornerFret(ctx, m + 8, H - m - 8, fretSize, 1, -1, primaryColor);
  drawCornerFret(ctx, W - m - 8, H - m - 8, fretSize, -1, -1, primaryColor);

  // ==========================================
  // 4. 顶部标头 (Header)
  // ==========================================
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = colorScheme.secondaryGold;
  ctx.font = isEn
    ? `bold 22px system-ui, -apple-system, sans-serif`
    : `bold 24px "Songti SC", "SimSun", "STSong", serif`;
  ctx.letterSpacing = isEn ? "4px" : "6px";
  ctx.fillText(
    isEn ? "WESTERN ARCANE ORDER · COGNITIVE SPECTRUM" : "东方认知流形 · 心智图谱",
    W / 2,
    110
  );

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = `600 13px system-ui, -apple-system, sans-serif`;
  ctx.letterSpacing = "4px";
  ctx.fillText(
    isEn ? "ORDO ARCANUM · METACOGNITIVE TESTING LAB" : "CHINESE COGNITIVE MANIFOLD ARCHETYPE SPECTRUM",
    W / 2,
    140
  );

  // 分隔细金线
  ctx.strokeStyle = "rgba(254, 240, 138, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 160, 160);
  ctx.lineTo(W / 2 + 160, 160);
  ctx.stroke();

  // ==========================================
  // 5. 头像框与专属图腾 (Avatar Emblem)
  // ==========================================
  const avatarY = 280;

  // 头像背后强烈多层放射辉光
  const avatarAura = ctx.createRadialGradient(W / 2, avatarY, 20, W / 2, avatarY, 180);
  avatarAura.addColorStop(0, colorScheme.glowColor);
  avatarAura.addColorStop(0.8, `${colorScheme.primaryGold}22`);
  avatarAura.addColorStop(1, "transparent");
  ctx.fillStyle = avatarAura;
  ctx.beginPath();
  ctx.arc(W / 2, avatarY, 180, 0, Math.PI * 2);
  ctx.fill();

  // 外层金色同心罗盘环
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, avatarY, 80, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(254, 240, 138, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(W / 2, avatarY, 90, 0, Math.PI * 2);
  ctx.stroke();

  // 刻度星点
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    const px = W / 2 + Math.cos(rad) * 85;
    const py = avatarY + Math.sin(rad) * 85;
    ctx.fillStyle = colorScheme.secondaryGold;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 中心圆内背景
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.beginPath();
  ctx.arc(W / 2, avatarY, 78, 0, Math.PI * 2);
  ctx.fill();

  // 头像框中心专属图腾图标/字符
  ctx.fillStyle = colorScheme.secondaryGold;
  ctx.font = `bold 52px system-ui, -apple-system, sans-serif`;
  const emblemGlyph = isEn ? arcaneConfig.crestSymbol : (skills[0]?.icon || "✦");
  ctx.fillText(emblemGlyph, W / 2, avatarY);

  // ==========================================
  // 6. 头像框下方长条徽带 (展示用户真实昵称)
  // ==========================================
  const ribbonY = 410;
  const subjectName = data.subjectName || (isEn ? "Explorer" : "探索者");
  const nicknameText = isEn ? `Explorer · ${subjectName}` : `探索者 · ${subjectName}`;

  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 220, ribbonY - 22, 440, 44, 22);
  ctx.fill();
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = colorScheme.secondaryGold;
  ctx.font = isEn ? `bold 20px system-ui, sans-serif` : `bold 20px "STKaiti", "Songti SC", serif`;
  ctx.letterSpacing = "2px";
  ctx.fillText(nicknameText, W / 2, ribbonY);

  // ==========================================
  // 7. 角色大标题与赞许金句 (Role Title & Tagline)
  // ==========================================
  const roleY = 515;

  // 渐变曜金角色大字
  const roleGrad = ctx.createLinearGradient(W / 2 - 200, roleY - 30, W / 2 + 200, roleY + 30);
  roleGrad.addColorStop(0, "#ffffff");
  roleGrad.addColorStop(0.35, colorScheme.secondaryGold);
  roleGrad.addColorStop(0.7, colorScheme.primaryGold);
  roleGrad.addColorStop(1, colorScheme.secondaryGold);
  ctx.fillStyle = roleGrad;
  ctx.font = isEn
    ? `900 64px system-ui, -apple-system, sans-serif`
    : `900 80px "STKaiti", "Songti SC", "SimSun", serif`;
  ctx.letterSpacing = isEn ? "3px" : "8px";
  ctx.shadowColor = colorScheme.glowColor;
  ctx.shadowBlur = 24;
  ctx.fillText(roleTitle, W / 2, roleY);
  ctx.shadowBlur = 0;

  // 赞许金句 Tagline
  const tagY = 595;
  ctx.fillStyle = "#fef08a";
  ctx.font = isEn ? `600 24px system-ui, sans-serif` : `600 26px "STKaiti", "Songti SC", serif`;
  ctx.letterSpacing = "2px";
  ctx.fillText(`“ ${praiseTagline} ”`, W / 2, tagY);

  // 高光标签 (Tags)
  const tagsY = 655;
  const tagTotalW = strengthTags.length * 165;
  let tagStartX = (W - tagTotalW) / 2 + 80;
  for (const tag of strengthTags) {
    ctx.fillStyle = "rgba(254, 240, 138, 0.12)";
    ctx.strokeStyle = "rgba(254, 240, 138, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tagStartX - 75, tagsY - 18, 150, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colorScheme.secondaryGold;
    ctx.font = `bold 14px system-ui, sans-serif`;
    ctx.letterSpacing = "1px";
    ctx.fillText(`#${tag}`, tagStartX, tagsY);
    tagStartX += 165;
  }

  // ==========================================
  // 8. 4 项专属正向认知特技 (2x2 Grid)
  // 彻底置换原 4D 指标，全中文无杂质 / 英文全纯正
  // ==========================================
  const skillsStartY = 720;
  const cardW = 460;
  const cardH = 155;

  for (let idx = 0; idx < 4; idx++) {
    const skill = skills[idx] || {
      icon: "⚡",
      type: isEn ? "Core Trait" : "专属特技",
      name: isEn ? "Innate Aptitude" : "核心认知特技",
      desc: isEn ? "Cognitive empowerment." : "高维认知推演。",
    };

    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const cx = col === 0 ? W / 2 - cardW / 2 - 12 : W / 2 + cardW / 2 + 12;
    const cy = skillsStartY + row * (cardH + 18) + cardH / 2;

    // 单项玻璃拟态卡片背景
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.strokeStyle = "rgba(254, 240, 138, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 18);
    ctx.fill();
    ctx.stroke();

    // 技能图标 (左侧)
    ctx.textAlign = "center";
    ctx.font = `32px system-ui, sans-serif`;
    ctx.fillText(skill.icon || "✦", cx - cardW / 2 + 40, cy - cardH / 2 + 45);

    // 技能类型徽章 (Pill Badge)
    ctx.textAlign = "left";
    ctx.fillStyle = colorScheme.badgeBg;
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2 + 75, cy - cardH / 2 + 20, isEn ? 120 : 80, 24, 6);
    ctx.fill();

    ctx.fillStyle = colorScheme.secondaryGold;
    ctx.font = `bold 12px system-ui, sans-serif`;
    ctx.letterSpacing = "1px";
    ctx.fillText(skill.type, cx - cardW / 2 + 82, cy - cardH / 2 + 36);

    // 技能名称 (Bold Header)
    ctx.fillStyle = "#ffffff";
    ctx.font = isEn ? `bold 20px system-ui, sans-serif` : `bold 22px "STKaiti", "Songti SC", serif`;
    ctx.letterSpacing = "1px";
    ctx.fillText(skill.name, cx - cardW / 2 + (isEn ? 205 : 165), cy - cardH / 2 + 37);

    // 技能精炼描述 (Wrapped Text)
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = `14px system-ui, sans-serif`;
    ctx.letterSpacing = "0.5px";
    drawWrappedText(
      ctx,
      skill.desc,
      cx - cardW / 2 + 24,
      cy - cardH / 2 + 80,
      cardW - 48,
      22,
      3
    );
  }

  // ==========================================
  // 9. 赋能启示古训/箴言横幅与印章 (Empowering Banner & Seal)
  // ==========================================
  const bannerY = 1145;
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.strokeStyle = "rgba(254, 240, 138, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 470, bannerY - 45, 940, 110, 18);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = colorScheme.secondaryGold;
  ctx.font = isEn ? `bold 16px system-ui, sans-serif` : `bold 17px "Songti SC", serif`;
  ctx.letterSpacing = "2px";
  ctx.fillText(
    isEn ? "[ ORDO ARCANUM · EMPOWERING INSIGHT ]" : "【 认知心智 · 赋能启示 】",
    W / 2 - 440,
    bannerY - 18
  );

  ctx.fillStyle = "#f3f4f6";
  ctx.font = isEn ? `italic 15px system-ui, sans-serif` : `italic 16px "STKaiti", "Songti SC", serif`;
  ctx.letterSpacing = "1px";
  drawWrappedText(
    ctx,
    `“${empoweringFeedback}”`,
    W / 2 - 440,
    bannerY + 12,
    760,
    22,
    3
  );

  // 右侧朱砂/秘法印章
  const sealText = isEn ? arcaneConfig.sealText : mythicConfig.sealText;
  drawSeal(ctx, W / 2 + 340, bannerY - 35, 90, sealText, isEn);

  // ==========================================
  // 10. 动态二维码扫码区域 (Dynamic QR Code)
  // ==========================================
  const qrSectionY = 1430;
  const qrUrl = data.entryUrl || (typeof window !== "undefined" ? window.location.href : "http://localhost:8000/");

  const qrBoxSize = 220;
  const qrBoxX = W / 2 - qrBoxSize / 2;
  const qrBoxY = qrSectionY - 40;

  // 二维码白底
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
    ctx.fillStyle = "#000000";
    ctx.font = `14px monospace`;
    ctx.fillText("QR CODE", W / 2, qrSectionY + 70);
  }

  // 二维码装饰金框
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(qrBoxX - 6, qrBoxY - 6, qrBoxSize + 12, qrBoxSize + 12);

  // 扫码呼召文案
  ctx.textAlign = "center";
  ctx.fillStyle = colorScheme.secondaryGold;
  ctx.font = isEn ? `bold 22px system-ui, sans-serif` : `bold 22px "STKaiti", "Songti SC", serif`;
  ctx.letterSpacing = "2px";
  ctx.fillText(
    isEn ? "Scan to Discover Your Cognitive Archetype" : "长按识别二维码 · 测算你的认知本命流形",
    W / 2,
    qrSectionY + 235
  );

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = `13px system-ui, sans-serif`;
  ctx.letterSpacing = "2px";
  ctx.fillText(
    isEn ? "TWO-TIER METACOGNITIVE MANIFOLD TEST" : "TWO-TIER METACOGNITIVE MANIFOLD TEST",
    W / 2,
    qrSectionY + 268
  );

  // ==========================================
  // 11. 底部脚注 (Footer)
  // ==========================================
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
  const isEn = data.locale === "en-US";
  const blob = await generatePosterBlob(data, 2);
  const url = URL.createObjectURL(blob);

  const cleanName = (data.subjectName || "explorer").replace(/[/\\?%*:|"<>]/g, "");
  const roleTitle = isEn
    ? (data.roleTitle || getArcaneArchetype(data.archetype).roleTitle)
    : (data.roleTitle || getMythicArchetype(data.archetype).roleTitle);
  const defaultFilename = isEn
    ? `Cognitive-Archetype-${roleTitle.replace(/\s+/g, "-")}-${cleanName}.png`
    : `认知流形本命海报-${roleTitle}-${cleanName}.png`;
  const filename = customFilename || defaultFilename;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 一键复制海报图片到剪贴板
 */
export async function copyPosterImageToClipboard(
  data: PosterShareData
): Promise<{ success: boolean; fallback?: boolean; error?: string }> {
  try {
    const blob = await generatePosterBlob(data, 2);

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
        await downloadPoster(data);
        return { success: true, fallback: true, error: clipErr.message };
      }
    }

    await downloadPoster(data);
    return { success: true, fallback: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to copy poster" };
  }
}

/**
 * 复制文案格式的分享信息 (彻底净化 4D 敏感数据与卦象爻线)
 */
export async function copyShareTextToClipboard(data: PosterShareData): Promise<boolean> {
  const isEn = data.locale === "en-US";
  const mythicConfig = getMythicArchetype(data.archetype);
  const arcaneConfig = getArcaneArchetype(data.archetype);

  const roleTitle = isEn
    ? (data.roleTitle || arcaneConfig.roleTitle)
    : (data.roleTitle || mythicConfig.roleTitle);
  const praiseTagline = isEn
    ? (data.praiseTagline || arcaneConfig.praiseTagline)
    : (data.praiseTagline || mythicConfig.praiseTagline);

  const tags = data.strengthTags?.map((t) => `#${t}`).join(" ") || "";
  const skills: SkillDisplayItem[] = (data.skills && data.skills.length >= 4)
    ? data.skills
    : isEn
      ? arcaneConfig.skills
      : (getArchetypeDefinition(mythicConfig.archetype, "zh-CN").skills || []);

  const empoweringFeedback = data.empoweringFeedback || (isEn
    ? arcaneConfig.empoweringFeedback
    : (mythicConfig.totemAphorism || "自强不息，知行自洽。"));

  const entryUrl = data.entryUrl || "http://localhost:8000/";

  let text = "";

  if (isEn) {
    const skillsText = skills
      .map((s) => `• [${s.type}] ${s.name}: ${s.desc}`)
      .join("\n");
    text = [
      `[${roleTitle}]`,
      `"${praiseTagline}"`,
      `Explorer: ${data.subjectName}`,
      tags ? `Tags: ${tags}` : "",
      `───────────`,
      `Unique Cognitive Skills:`,
      skillsText,
      `───────────`,
      `Empowering Insight:`,
      `"${empoweringFeedback}"`,
      `───────────`,
      `Discover your cognitive archetype: ${entryUrl}`,
    ].filter(Boolean).join("\n");
  } else {
    const skillsText = skills
      .map((s) => `• 【${s.type}】${s.name}：${s.desc}`)
      .join("\n");
    text = [
      `【${roleTitle}】`,
      `“${praiseTagline}”`,
      `探索者：${data.subjectName}`,
      tags ? `标签：${tags}` : "",
      `───────────`,
      `专属认知特技：`,
      skillsText,
      `───────────`,
      `赋能启示：`,
      `“${empoweringFeedback}”`,
      `───────────`,
      `测算你的认知本命流形：${entryUrl}`,
    ].filter(Boolean).join("\n");
  }

  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

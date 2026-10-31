/**
 * Cognitive Twin Duel Joint Poster Generator (src/frontend/components/share/duelPosterGenerator.ts)
 * 
 * Generates ultra-high-definition exportable visual comparison posters (1200x1500)
 * displaying side-by-side or dual-star comparison with participants' badges, aphorisms,
 * 4D alignment score, and complementary synergy dynamics.
 */

import * as QRCodeModule from "qrcode";
const QRCode: any = (QRCodeModule as any).default || QRCodeModule;
import { CognitiveArchetype } from "../../../backend/models";
import { getMythicArchetype } from "./mythicArchetypes";
import { getArcaneArchetype } from "./arcaneArchetypes";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";

export interface DuelParticipantData {
  sessionId: string;
  subjectName: string;
  archetype: CognitiveArchetype | string;
  roleTitle?: string;
  praiseTagline?: string;
  totemOrOrder?: string;
  aphorism?: string;
  badgeText?: string;
  metrics?: any;
}

export interface DuelPosterData {
  participantA: DuelParticipantData;
  participantB: DuelParticipantData;
  comparison: {
    euclidean_distance: number;
    similarity_percentage: number;
    cognitive_alignment_score: number;
    complementary_index: number;
    synergy_title: string;
    pairing_dynamics: string;
    mutual_strengths: string[];
    mutual_differences: string[];
  };
  locale?: string;
  entryUrl?: string;
  dateText?: string;
}

/**
 * Generates dynamic QR code SVG string for duel permalink
 */
export async function generateDuelQrCodeSvg(url: string): Promise<string> {
  const finalUrl = url || "http://localhost:8000/";
  return await QRCode.toString(finalUrl, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#08080C",
      light: "#ffffff",
    },
  });
}

/**
 * Generates dynamic QR code base64 DataURL
 */
export async function generateDuelQrCodeDataUrl(
  url: string,
  darkColor: string = "#08080C",
  lightColor: string = "#ffffff"
): Promise<string> {
  const finalUrl = url || "http://localhost:8000/";
  return await QRCode.toDataURL(finalUrl, {
    margin: 1,
    width: 260,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });
}

/**
 * Generates viral, forum-ready comparison text for replies and social sharing
 */
export function generateDuelShareText(data: DuelPosterData): string {
  const isEn = data.locale === "en-US" || String(data.locale).toLowerCase().startsWith("en");
  const pA = data.participantA;
  const pB = data.participantB;
  const comp = data.comparison;
  const url = data.entryUrl || `http://localhost:8000/duel/${pA.sessionId}/${pB.sessionId}`;

  if (isEn) {
    const roleA = pA.roleTitle || "The Explorer";
    const roleB = pB.roleTitle || "The Explorer";
    const orderA = pA.totemOrOrder || roleA;
    const orderB = pB.totemOrOrder || roleB;

    return [
      `⚔️ Twin Stars Cognitive Duel | Self-Test Metacognitive Manifold`,
      `【${pA.subjectName}】[${roleA}] (${orderA}) vs 【${pB.subjectName}】[${roleB}] (${orderB})`,
      `🌟 4D Manifold Alignment: ${comp.similarity_percentage}% Alignment | Dynamic: ${comp.synergy_title}`,
      `✨ Complementary Index: ${comp.complementary_index}%`,
      `🌌 Chemistry: ${comp.pairing_dynamics}`,
      `💫 Mutual Synergies: ${comp.mutual_strengths.join("; ")}`,
      comp.mutual_differences.length > 0 ? `⚡ Cognitive Divergence: ${comp.mutual_differences.join("; ")}` : "",
      `🔗 Duel Permalink & Joint Poster: ${url}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const mythicA = getMythicArchetype(pA.archetype);
  const mythicB = getMythicArchetype(pB.archetype);
  const titleA = pA.roleTitle || mythicA.roleTitle;
  const titleB = pB.roleTitle || mythicB.roleTitle;
  const totemA = pA.totemOrOrder || mythicA.mythicTotem;
  const totemB = pB.totemOrOrder || mythicB.mythicTotem;

  return [
    `⚔️ 双星认知对决报告 | Self-Test 思维星图`,
    `【${pA.subjectName}】${titleA} (${totemA}) vs 【${pB.subjectName}】${titleB} (${totemB})`,
    `🌟 4D 认知契合度：${comp.similarity_percentage}% | 契合评定：${comp.synergy_title}`,
    `✨ 互补指数：${comp.complementary_index}%`,
    `🌌 双星对决解读：${comp.pairing_dynamics}`,
    `💫 战力协同优势：${comp.mutual_strengths.join("；")}`,
    comp.mutual_differences.length > 0 ? `⚡ 决策风格对照：${comp.mutual_differences.join("；")}` : "",
    `🔗 完整双星战报与海报：${url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Copies the forum-ready share text to clipboard
 */
export async function copyDuelShareTextToClipboard(data: DuelPosterData): Promise<boolean> {
  const text = generateDuelShareText(data);
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Clipboard write failed, trying fallback:", err);
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Helper to render multi-line text with wrapping and truncation ellipsis
 */
function renderWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 3
): void {
  if (!ctx.measureText) {
    ctx.fillText(text, x, y);
    return;
  }
  const chars = Array.from(text);
  let line = "";
  let currentY = y;
  let linesDrawn = 0;

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      if (linesDrawn >= maxLines - 1) {
        ctx.fillText(line.slice(0, -1) + "…", x, currentY);
        return;
      }
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
      linesDrawn++;
    } else {
      line = testLine;
    }
  }

  if (line.length > 0 && linesDrawn < maxLines) {
    ctx.fillText(line, x, currentY);
  }
}

/**
 * High-definition Canvas 2D Twin Stars Joint Poster Renderer
 */
export async function renderTwinStarsPosterToCanvas(
  data: DuelPosterData,
  scale: number = 1
): Promise<HTMLCanvasElement> {
  const W = 1200;
  const H = 1500;
  const WIDTH = W * scale;
  const HEIGHT = H * scale;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  ctx.scale(scale, scale);

  const isEn = data.locale === "en-US" || String(data.locale).toLowerCase().startsWith("en");
  const pA = data.participantA;
  const pB = data.participantB;
  const comp = data.comparison;

  const mythicA = getMythicArchetype(pA.archetype);
  const mythicB = getMythicArchetype(pB.archetype);
  const arcaneA = getArcaneArchetype(pA.archetype);
  const arcaneB = getArcaneArchetype(pB.archetype);

  const nameA = pA.subjectName || (isEn ? "Explorer A" : "探索者 A");
  const nameB = pB.subjectName || (isEn ? "Explorer B" : "探索者 B");
  const titleA = pA.roleTitle || (isEn ? arcaneA.roleTitle : mythicA.roleTitle);
  const titleB = pB.roleTitle || (isEn ? arcaneB.roleTitle : mythicB.roleTitle);
  const totemA = pA.totemOrOrder || (isEn ? arcaneA.orderTitle : mythicA.mythicTotem);
  const totemB = pB.totemOrOrder || (isEn ? arcaneB.orderTitle : mythicB.mythicTotem);
  const aphorismA = pA.aphorism || (isEn ? arcaneA.praiseTagline : mythicA.totemAphorism);
  const aphorismB = pB.aphorism || (isEn ? arcaneB.praiseTagline : mythicB.totemAphorism);

  // 1. Deep cosmic gradient base
  ctx.fillStyle = "#07080D";
  ctx.fillRect(0, 0, W, H);

  // 2. Dual ambient nebulas (Left: Cyber Blue / Cyan, Right: Astral Gold / Amber)
  const leftGlow = ctx.createRadialGradient(280, 480, 50, 280, 480, 480);
  leftGlow.addColorStop(0, "rgba(56, 189, 248, 0.22)");
  leftGlow.addColorStop(0.6, "rgba(37, 99, 235, 0.08)");
  leftGlow.addColorStop(1, "transparent");
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, W, H);

  const rightGlow = ctx.createRadialGradient(920, 480, 50, 920, 480, 480);
  rightGlow.addColorStop(0, "rgba(251, 191, 36, 0.22)");
  rightGlow.addColorStop(0.6, "rgba(217, 119, 6, 0.08)");
  rightGlow.addColorStop(1, "transparent");
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, W, H);

  // Stardust accents
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  for (let i = 0; i < 40; i++) {
    const sx = (Math.sin(i * 123.45) * 0.5 + 0.5) * W;
    const sy = (Math.cos(i * 678.91) * 0.5 + 0.5) * H;
    const sr = (i % 3) + 1;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Header: Brand badge & Title
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Top pill badge
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(W / 2 - 200, 45, 400, 36, 18);
  } else {
    ctx.rect(W / 2 - 200, 45, 400, 36);
  }
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillStyle = "#FBBF24";
  ctx.fillText(
    isEn ? "✦ SELF-TEST · COGNITIVE TWIN DUEL ✦" : "✦ 思维星图 · 双星认知对决 ✦",
    W / 2,
    63
  );

  // Main Header Title
  ctx.font = "900 38px system-ui, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(
    isEn ? "COGNITIVE TWIN DUEL" : "认知双星对决报告",
    W / 2,
    115
  );
  ctx.restore();

  // 4. Central Nexus: Dual Star Alignment Score
  ctx.save();
  const nexusY = 245;

  // Outer glowing ring
  ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, nexusY, 75, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(W / 2, nexusY, 84, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inside score fill
  ctx.fillStyle = "rgba(15, 17, 26, 0.85)";
  ctx.beginPath();
  ctx.arc(W / 2, nexusY, 72, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#CCFF00";
  ctx.font = "900 48px system-ui, sans-serif";
  ctx.fillText(`${comp.similarity_percentage}%`, W / 2, nexusY - 6);

  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(isEn ? "4D ALIGNMENT" : "4D 认知契合度", W / 2, nexusY + 26);

  // Synergy Title Badge below nexus
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillStyle = "#FBBF24";
  ctx.fillText(comp.synergy_title, W / 2, nexusY + 115);

  // Complementary Index pill
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillText(
    isEn ? `Complementary Index: ${comp.complementary_index}%` : `互补指数：${comp.complementary_index}%`,
    W / 2,
    nexusY + 145
  );
  ctx.restore();

  // 5. Side-by-Side Dual Participant Cards
  const cardW = 440;
  const cardH = 360;
  const cardY = 440;

  // Participant A (Left Card)
  ctx.save();
  const cardAX = 80;
  ctx.fillStyle = "rgba(20, 24, 38, 0.8)";
  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardAX, cardY, cardW, cardH, 20);
  } else {
    ctx.rect(cardAX, cardY, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  // Avatar / Name Ribbon
  ctx.fillStyle = "#38BDF8";
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(nameA, cardAX + 32, cardY + 54);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(isEn ? "PARTICIPANT A" : "受测选手 A", cardAX + 32, cardY + 80);

  // Seal badge
  const sealA = isEn ? arcaneA.sealText : mythicA.sealText;
  ctx.font = "bold 11px monospace";
  const sealW_A = ctx.measureText ? ctx.measureText(sealA).width + 16 : 80;
  ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.lineWidth = 1;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(cardAX + cardW - 32 - sealW_A, cardY + 36, sealW_A, 24, 6);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#38BDF8";
  ctx.fillText(sealA, cardAX + cardW - 32 - sealW_A + 8, cardY + 52);

  // Role Title & Totem/Order
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(titleA, cardAX + 32, cardY + 130);

  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.fillText(`✦ ${totemA}`, cardAX + 32, cardY + 160);

  // Aphorism Quote
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fillRect(cardAX + 24, cardY + 195, cardW - 48, 125);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
  if (ctx.strokeRect) {
    ctx.strokeRect(cardAX + 24, cardY + 195, cardW - 48, 125);
  } else {
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "italic 15px system-ui, sans-serif";
  renderWrappedText(ctx, `“${aphorismA}”`, cardAX + 40, cardY + 230, cardW - 80, 22, 3);

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(isEn ? "Praise & Totem Aphorism" : "象辞与认知图腾箴言", cardAX + 40, cardY + 300);
  ctx.restore();

  // VS Bridge in the center
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 28px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillText("VS", W / 2, cardY + cardH / 2);
  ctx.restore();

  // Participant B (Right Card)
  ctx.save();
  const cardBX = W - 80 - cardW;
  ctx.fillStyle = "rgba(20, 24, 38, 0.8)";
  ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardBX, cardY, cardW, cardH, 20);
  } else {
    ctx.rect(cardBX, cardY, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  // Avatar / Name Ribbon
  ctx.fillStyle = "#FBBF24";
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(nameB, cardBX + 32, cardY + 54);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(isEn ? "PARTICIPANT B" : "受测选手 B", cardBX + 32, cardY + 80);

  // Seal badge
  const sealB = isEn ? arcaneB.sealText : mythicB.sealText;
  ctx.font = "bold 11px monospace";
  const sealW_B = ctx.measureText ? ctx.measureText(sealB).width + 16 : 80;
  ctx.fillStyle = "rgba(251, 191, 36, 0.12)";
  ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
  ctx.lineWidth = 1;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(cardBX + cardW - 32 - sealW_B, cardY + 36, sealW_B, 24, 6);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#FBBF24";
  ctx.fillText(sealB, cardBX + cardW - 32 - sealW_B + 8, cardY + 52);

  // Role Title & Totem/Order
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(titleB, cardBX + 32, cardY + 130);

  ctx.fillStyle = "#FBBF24";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.fillText(`✦ ${totemB}`, cardBX + 32, cardY + 160);

  // Aphorism Quote
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fillRect(cardBX + 24, cardY + 195, cardW - 48, 125);
  ctx.strokeStyle = "rgba(251, 191, 36, 0.2)";
  if (ctx.strokeRect) {
    ctx.strokeRect(cardBX + 24, cardY + 195, cardW - 48, 125);
  } else {
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "italic 15px system-ui, sans-serif";
  renderWrappedText(ctx, `“${aphorismB}”`, cardBX + 40, cardY + 230, cardW - 80, 22, 3);

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(isEn ? "Praise & Totem Aphorism" : "象辞与认知图腾箴言", cardBX + 40, cardY + 300);
  ctx.restore();

  // 6. Synergy & Mutual Strengths Card
  ctx.save();
  const synY = 840;
  const synW = W - 160;
  const synH = 340;
  ctx.fillStyle = "rgba(13, 16, 26, 0.85)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(80, synY, synW, synH, 16);
  } else {
    ctx.rect(80, synY, synW, synH);
  }
  ctx.fill();
  ctx.stroke();

  // Section Header
  ctx.textAlign = "left";
  ctx.font = "900 18px system-ui, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(
    isEn ? "✦ PAIRING DYNAMICS & MUTUAL SYNERGIES" : "✦ 双星化学反应与战力协同解析",
    115,
    synY + 45
  );

  // Dynamics summary text
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillText(comp.pairing_dynamics, 115, synY + 85);

  // Strengths
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.fillStyle = "#CCFF00";
  ctx.fillText(isEn ? "★ Key Synergies:" : "★ 核心协同优势：", 115, synY + 140);

  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  comp.mutual_strengths.slice(0, 2).forEach((s, idx) => {
    ctx.fillText(`• ${s}`, 135, synY + 175 + idx * 30);
  });

  // Differences
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.fillStyle = "#38BDF8";
  ctx.fillText(isEn ? "⚡ Contrast & Divergence:" : "⚡ 风格差异对照：", 115, synY + 250);

  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  comp.mutual_differences.slice(0, 2).forEach((d, idx) => {
    ctx.fillText(`• ${d}`, 135, synY + 285 + idx * 30);
  });
  ctx.restore();

  // 7. Footer: QR code and Brand Banner
  ctx.save();
  const footY = 1220;
  const qrSize = 180;
  const qrX = W - 110 - qrSize;

  // Render QR Code image if possible
  const qrDataUrl = await generateDuelQrCodeDataUrl(
    data.entryUrl || `http://localhost:8000/duel/${pA.sessionId}/${pB.sessionId}`,
    "#07080D",
    "#FFFFFF"
  );

  if (typeof Image !== "undefined") {
    try {
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
      });
      ctx.drawImage(qrImg, qrX, footY + 15, qrSize, qrSize);
    } catch {
      // Fallback placeholder
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(qrX, footY + 15, qrSize, qrSize);
    }
  }

  // Left Brand info
  ctx.textAlign = "left";
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(
    isEn ? "Self-Test · Cognitive Manifold" : "Self-Test · 思维星图",
    115,
    footY + 55
  );

  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(
    isEn
      ? "Scan QR Code to view interactive duel comparison & test your own cognition"
      : "扫码查看交互式双星对决完整战报 · 测测你的二元认知流形",
    115,
    footY + 95
  );

  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#FBBF24";
  ctx.fillText(
    data.entryUrl || `https://self-test.app/duel/${pA.sessionId.substring(0, 10)}...`,
    115,
    footY + 140
  );
  ctx.restore();

  return canvas;
}

/**
 * Generates PNG Blob from DuelPosterData (scale=2 for high DPI)
 */
export async function generateTwinStarsPosterBlob(
  data: DuelPosterData,
  scale: number = 2
): Promise<Blob> {
  const canvas = await renderTwinStarsPosterToCanvas(data, scale);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export canvas to PNG blob"));
    }, "image/png");
  });
}

/**
 * Triggers native download of the Twin Stars Joint Poster PNG
 */
export async function downloadTwinStarsPoster(
  data: DuelPosterData,
  filename?: string
): Promise<void> {
  const blob = await generateTwinStarsPosterBlob(data, 2);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `TwinStars_Duel_${data.participantA.subjectName}_vs_${data.participantB.subjectName}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies the Twin Stars Poster image directly to system clipboard
 */
export async function copyTwinStarsPosterToClipboard(data: DuelPosterData): Promise<boolean> {
  try {
    const blob = await generateTwinStarsPosterBlob(data, 2);
    if (typeof ClipboardItem !== "undefined" && navigator?.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      return true;
    }
  } catch (err) {
    console.warn("Failed to copy poster image to clipboard:", err);
  }
  return false;
}

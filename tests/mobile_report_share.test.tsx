import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { PosterModal } from "../src/frontend/components/share/PosterModal";
import { triggerNativeShare, buildTrackingShareUrl } from "../src/frontend/utils/shareUtils";
import { CognitiveArchetype } from "../src/backend/models";
import { CognitiveMetricsRadar } from "../src/frontend/components/game/CognitiveMetricsRadar";

describe("Mobile Report & Native Share Suite", () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  const sampleReport: any = {
    session_id: "sess_mobile_001",
    subject_name: "探索者007",
    quadrant_code: "Q1-CAL",
    metrics: {
      d_prime: 2.15,
      meta_d_prime: 1.95,
      m_ratio: 0.91,
      calibration_bias: 0.04,
      first_order_accuracy: 0.82,
    },
    diagnostic_profile: {
      archetype: CognitiveArchetype.SOVEREIGN,
      quadrant_code: "Q1-CAL",
      role_title: "人形外挂",
      praise_tagline: "你开了 · 诗人握持",
      strength_tags: ["高维逻辑底蕴", "算力降维压制", "知行绝对自洽", "手术刀级决断"],
      empowering_feedback: "您展现出令人叹为观止的‘人形外挂’级顶尖素养！",
      growth_advice: "具备全维度的战略全局观与决策定力。",
      skills: [
        { icon: "⚡", type: "核心特技", name: "算力透视", desc: "高维逻辑压制" },
        { icon: "🎯", type: "被动特技", name: "精准制导", desc: "手术刀级决断" },
        { icon: "🛡️", type: "觉醒绝技", name: "知行律动", desc: "绝对自省自洽" },
        { icon: "👑", type: "战场羁绊", name: "核心战略指挥官", desc: "全局流形感知" },
      ],
      clinical_summary: "高一元·高二元·知行自洽。",
    },
  };

  describe("1. Native Web Share API & Smooth Clipboard Fallback", () => {
    it("buildTrackingShareUrl 自动追加 UTM 社交追踪参数且保持幂等", () => {
      const url = buildTrackingShareUrl("http://localhost:8000/share/sess_123", "mobile_share", "social");
      expect(url).toContain("utm_source=mobile_share");
      expect(url).toContain("utm_medium=social");
      expect(url).toContain("utm_campaign=archetype_report");

      // 已有参数时保持
      const url2 = buildTrackingShareUrl(url, "other", "other");
      expect(url2).toBe(url);
    });

    it("优先唤起系统原生 Web Share API (navigator.share)", async () => {
      let sharedPayload: any = null;
      const mockShare = mock(async (payload: any) => {
        sharedPayload = payload;
      });

      Object.defineProperty(globalThis, "navigator", {
        value: {
          share: mockShare,
          canShare: () => true,
        },
        configurable: true,
        writable: true,
      });

      const res = await triggerNativeShare({
        title: "Self-Test 画像分享",
        text: "快来测测你的认知！",
        url: "http://localhost:8000/share/sess_mobile_001",
      });

      expect(res.success).toBe(true);
      expect(res.method).toBe("native");
      expect(mockShare).toHaveBeenCalled();
      expect(sharedPayload.title).toBe("Self-Test 画像分享");
      expect(sharedPayload.url).toContain("utm_source=mobile_share");
    });

    it("用户在原生分享面板主动点击取消 (AbortError) 时，优雅判定为 cancelled 且不触发剪贴板复制", async () => {
      const mockShare = mock(async () => {
        const err: any = new Error("Share canceled");
        err.name = "AbortError";
        throw err;
      });

      let clipboardWritten = false;
      const mockWriteText = mock(async () => {
        clipboardWritten = true;
      });

      Object.defineProperty(globalThis, "navigator", {
        value: {
          share: mockShare,
          clipboard: { writeText: mockWriteText },
        },
        configurable: true,
        writable: true,
      });

      const res = await triggerNativeShare({
        title: "Self-Test 画像分享",
        text: "快来测测你的认知！",
        url: "http://localhost:8000/share/sess_mobile_001",
      });

      expect(res.success).toBe(false);
      expect(res.method).toBe("cancelled");
      expect(clipboardWritten).toBe(false);
    });

    it("在不支持 navigator.share 的环境下平滑降级为一键复制带 UTM 的短链", async () => {
      let clipboardText = "";
      const mockWriteText = mock(async (txt: string) => {
        clipboardText = txt;
      });

      Object.defineProperty(globalThis, "navigator", {
        value: {
          clipboard: { writeText: mockWriteText },
        },
        configurable: true,
        writable: true,
      });

      const res = await triggerNativeShare({
        title: "Self-Test 画像分享",
        text: "这是我的认知画像文案",
        url: "http://localhost:8000/share/sess_mobile_001",
      });

      expect(res.success).toBe(true);
      expect(res.method).toBe("clipboard");
      expect(clipboardText).toContain("这是我的认知画像文案");
      expect(clipboardText).toContain("utm_source=mobile_share");
    });
  });

  describe("2. PosterModal Mobile Full-Screen Overlay & Touch Controls", () => {
    it("PosterModal 渲染移动端自适应全屏浮层与原生图片容器", () => {
      const html = renderToString(
        React.createElement(PosterModal, {
          isOpen: true,
          report: sampleReport,
          locale: "zh-CN",
          onClose: () => {},
        })
      );

      // 移动端全屏容器与长按保存提示
      expect(html).toContain("长按上方海报直接保存到手机相册");
      expect(html).toContain("data-testid=\"mobile-native-share-btn\"");
      expect(html).toContain("系统原生分享 / 复制链接");
      expect(html).toContain("保存到相册");
      expect(html).toContain("复制分享文案");

      // 验证角色称号与特技信息在海报与文案中完备
      expect(html).toContain("人形外挂");
      expect(html).toContain("算力透视");

      // 桌面端容器同时作为响应式结构保持
      expect(html).toContain("data-share-poster=\"chinese-mythic\"");
    });

    it("英文环境下 PosterModal 输出西方秘法专属标题与英文操作按钮", () => {
      const htmlEn = renderToString(
        React.createElement(PosterModal, {
          isOpen: true,
          report: {
            ...sampleReport,
            subject_name: "Arthur042",
          },
          locale: "en-US",
          onClose: () => {},
        })
      );

      expect(htmlEn).toContain("Long-press image to save to album");
      expect(htmlEn).toContain("System Native Share / Copy Link");
      expect(htmlEn).toContain("Save Image");
      expect(htmlEn).toContain("The Grand Archmage");
      expect(htmlEn).toContain("data-share-poster=\"western-arcane\"");
    });
  });

  describe("3. CognitiveMetricsRadar Mobile Responsive Scaling", () => {
    it("CognitiveMetricsRadar 具备安全的内嵌 SVG 视口且四维指标完整展示", () => {
      const html = renderToString(
        React.createElement(CognitiveMetricsRadar, {
          metrics: sampleReport.metrics,
          locale: "zh-CN",
        })
      );

      // 校验 SVG 视口与坐标安全（包含负边界，杜绝标签文本溢出）
      expect(html).toContain("viewBox=\"-35 -15 390 350\"");
      expect(html).toContain("辨别力");
      expect(html).toContain("元认知效能 M");
      expect(html).toContain("自洽偏向 Bias");
      expect(html).toContain("综合准确率");
      expect(html).toContain("82");
    });
  });
});

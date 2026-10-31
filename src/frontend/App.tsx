import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Compass,
  Sparkles,
  HelpCircle,
  Flame,
  Shield,
  ArrowRight,
  RotateCcw,
  Download,
  Share2,
  Crown,
  Stars,
  Feather,
  Dices,
  Link2,
  Copy,
  Check,
  Bookmark,
  AlertCircle,
  Activity,
  Lock,
  LogIn,
  ArrowLeft,
  Menu,
  Swords,
} from "lucide-react";

import { generateSubjectCodename as generateRandomCodename } from "../backend/codename_generator";
import { CognitiveArchetype } from "../backend/models";
import { getArchetypeDefinition } from "../backend/archetype_matrix";
import { useLocale } from "./contexts/LocaleContext";
import { useUser } from "./contexts/UserContext";
import { useGameEffects } from "./contexts/GameEffectsContext";
import { LanguageToggle } from "./components/LanguageToggle";
import { ThemeToggle } from "./components/ThemeToggle";
import { GameQuickControls } from "./components/game/GameQuickControls";
import { GamifiedTransition } from "./components/game/GamifiedTransition";
import { MobileAssessmentView } from "./components/game/MobileAssessmentView";
import { CognitiveMetricsRadar } from "./components/game/CognitiveMetricsRadar";
import { PosterModal } from "./components/share/PosterModal";
import { MobileNavDrawer } from "./components/layout/MobileNavDrawer";
import {
  extractSessionIdFromUrl,
  buildSessionReportUrl,
  buildSessionShareUrl,
  saveLastCompletedSession,
  getLastCompletedSession,
  canGuestStartNewSession,
  getReferrerSessionId,
  clearReferrerSessionId,
  buildDuelUrl,
} from "./utils/sessionRoute";
import { triggerNativeShare } from "./utils/shareUtils";
import { UserNav } from "./components/auth/UserNav";

interface TrialPayload {
  stimulus_id: string;
  difficulty_level: number;
  prompt: string;
  options: Record<string, string>;
  has_hint: boolean;
  hint_cost: number;
  hint_tier1_cost: number;
  hint_tier2_cost: number;
  hints_unlocked: number;
  unlocked_hints?: string[] | { tier1?: string; tier2?: string };
  task_type: string;
}

const normalizeUnlockedHints = (raw?: string[] | { tier1?: string; tier2?: string }): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const res: string[] = [];
  if (raw.tier1) res.push(raw.tier1);
  if (raw.tier2) res.push(raw.tier2);
  return res;
};

interface TrialRequest {
  session_id: string;
  trial_index: number;
  phase: string;
  payload: TrialPayload;
}

interface SkillItem {
  icon: string;
  type: string;
  name: string;
  desc: string;
}

interface ReportData {
  session_id: string;
  subject_name: string;
  diagnostic_profile: {
    archetype?: string;
    role_title: string;
    quadrant_code: string;
    praise_tagline: string;
    strength_tags: string[];
    empowering_feedback: string;
    growth_advice: string;
    skills: SkillItem[];
    clinical_summary?: string;
    critical_weakness?: string;
  };
}

const cleanOption = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/^(点阵区|几何构型|符号|命题|特征图形|Dot Matrix|Geometry|Symbol|Proposition|Feature Graph)[：:\s\n]*/gi, "")
    .replace(/·/g, "・")
    .trim();
};

const renderSymbolGrid = (matrix: string[][], isOption: boolean = false) => {
  const cols = matrix[0]?.length || 4;
  const isLarge = cols <= 4;
  const cellSize = isOption
    ? (isLarge ? "w-6 h-6 text-sm" : "w-4 h-4 text-[10px]")
    : (isLarge ? "w-8 h-8 sm:w-9 sm:h-9 text-base sm:text-lg" : "w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm");
  const dotSize = isOption
    ? (isLarge ? "w-1.5 h-1.5" : "w-1 h-1")
    : (isLarge ? "w-2 h-2" : "w-1.5 h-1.5");
  const gap = isOption
    ? (isLarge ? "gap-1" : "gap-0.5")
    : (isLarge ? "gap-1.5" : "gap-1");
  const containerPad = isOption
    ? "p-2 rounded-xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900/30 dark:border-white/20 shadow-[0_1.5px_0_#1c1917] dark:shadow-none"
    : "p-3 sm:p-4 rounded-2xl bg-[#FFFBEB] dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]";

  return (
    <div className={`inline-flex flex-col ${gap} ${containerPad} select-none`}>
      {matrix.map((row, rIdx) => (
        <div key={rIdx} className={`flex ${gap}`}>
          {row.map((cell, cIdx) => {
            const isEmpty = cell === "・" || cell === "·";
            return (
              <div
                key={cIdx}
                className={`${cellSize} flex items-center justify-center rounded-lg transition-all font-black ${
                  isEmpty
                    ? "bg-amber-100/70 dark:bg-[#12121C] border border-stone-400/40 dark:border-white/20 text-stone-500 dark:text-slate-400"
                    : "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-none"
                }`}
              >
                {isEmpty ? (
                  <span className={`${dotSize} rounded-full bg-stone-500 dark:bg-white/40 inline-block`} />
                ) : (
                  <span>{cell}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const renderOption = (rawVal: string) => {
  const val = cleanOption(rawVal);
  const lines = val.split("\n").map(l => l.trim()).filter(Boolean);
  const is2DGrid =
    lines.length >= 2 &&
    lines.every(l => /^[■▲★◆●○□△✦⬡・·\s]+$/.test(l));

  if (is2DGrid) {
    const matrix = lines.map(l => l.split(/\s+/).filter(Boolean));
    const isUniform = matrix.every(r => r.length === matrix[0].length && r.length >= 2);
    if (isUniform) {
      return renderSymbolGrid(matrix, true);
    }
  }

  return (
    <span className="text-xs md:text-sm text-stone-900 dark:text-white leading-relaxed font-mono font-medium whitespace-pre-line pt-0.5 inline-block">
      {val}
    </span>
  );
};

interface CognitiveRadarChartProps {
  metrics?: any;
  isEn?: boolean;
}

const CognitiveRadarChart: React.FC<CognitiveRadarChartProps> = ({ metrics, isEn = false }) => {
  const dPrime = metrics?.d_prime ?? 1.8;
  const mRatio = metrics?.m_ratio ?? 0.85;
  const acc = metrics?.first_order_accuracy ?? 0.75;
  const bias = metrics?.calibration_bias ?? 0.05;

  const dVal = Math.min(1, Math.max(0.2, dPrime / 3.0));
  const mVal = Math.min(1, Math.max(0.2, mRatio / 1.5));
  const aVal = Math.min(1, Math.max(0.2, acc));
  const cVal = Math.min(1, Math.max(0.2, 1 - Math.abs(bias) * 1.2));

  const axes = [
    { label: isEn ? "Acuity d'" : "解题敏锐 d'", val: dVal, display: Number(dPrime).toFixed(2) },
    { label: isEn ? "Metacog M" : "元认知 M", val: mVal, display: Number(mRatio).toFixed(2) },
    { label: isEn ? "Accuracy" : "决断准度", val: aVal, display: `${Math.round(acc * 100)}%` },
    { label: isEn ? "Calibration" : "知行校准", val: cVal, display: `${bias >= 0 ? "+" : ""}${Number(bias).toFixed(2)}` },
  ];

  const cx = 150;
  const cy = 135;
  const R = 85;

  const getCoord = (angle: number, radius: number) => {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  const polyPoints = axes
    .map((ax, idx) => {
      const angle = -Math.PI / 2 + idx * (Math.PI / 2);
      const { x, y } = getCoord(angle, R * ax.val);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-[24px] bg-[#FFFBEB] dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]">
      <div className="space-y-2 text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border border-stone-900 dark:border-black text-[11px] font-black text-stone-900 dark:text-[#08080C] shadow-[0_1.5px_0_#1c1917] dark:shadow-none">
          <Activity className="w-3.5 h-3.5 text-stone-900 dark:text-[#08080C]" />
          <span>{isEn ? "4D Cognitive Manifold Radar" : "4 维认知指标雷达图"}</span>
        </div>
        <h4 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
          {isEn ? "Metacognitive Acuity & Calibration" : "心智敏锐度与决断校准分布"}
        </h4>
        <p className="text-xs text-stone-600 dark:text-slate-200 max-w-xs font-medium leading-relaxed">
          {isEn
            ? "Visualizing Type-1 performance acuity and Type-2 metacognitive self-awareness calibration."
            : "量化一阶任务感知硬实力与二阶反思校准力，全景展现您的心智平衡模型。"}
        </p>
      </div>

      <div className="relative w-[300px] h-[270px] shrink-0 select-none">
        <svg viewBox="0 0 300 270" className="w-full h-full overflow-visible">
          {/* Concentric Grid Webs */}
          {[0.25, 0.5, 0.75, 1.0].map((ring) => {
            const ringPts = axes
              .map((_, idx) => {
                const angle = -Math.PI / 2 + idx * (Math.PI / 2);
                const { x, y } = getCoord(angle, R * ring);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
            return (
              <polygon
                key={ring}
                points={ringPts}
                fill="none"
                stroke="currentColor"
                className="text-stone-900/15 dark:text-white/20"
                strokeWidth={ring === 1.0 ? "1.5" : "1"}
                strokeDasharray={ring === 1.0 ? "none" : "2,2"}
              />
            );
          })}

          {/* Cross Axes Lines */}
          {axes.map((_, idx) => {
            const angle = -Math.PI / 2 + idx * (Math.PI / 2);
            const { x, y } = getCoord(angle, R);
            return (
              <line
                key={idx}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="currentColor"
                className="text-stone-900/20 dark:text-white/25"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Shaded Radar Area */}
          <polygon
            points={polyPoints}
            className="fill-amber-400/40 dark:fill-[#CCFF00]/25 stroke-stone-900 dark:stroke-[#CCFF00]"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Vertex Points & Labels */}
          {axes.map((ax, idx) => {
            const angle = -Math.PI / 2 + idx * (Math.PI / 2);
            const { x, y } = getCoord(angle, R * ax.val);
            const labelCoord = getCoord(angle, R + 24);

            return (
              <g key={idx}>
                <circle
                  cx={x}
                  cy={y}
                  r="4.5"
                  className="fill-stone-950 dark:fill-[#08080C] stroke-stone-900 dark:stroke-[#CCFF00]"
                  strokeWidth="2"
                />
                <text
                  x={labelCoord.x}
                  y={labelCoord.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-stone-900 dark:fill-white text-[10px] font-black font-sans"
                >
                  {ax.label}
                </text>
                <text
                  x={labelCoord.x}
                  y={labelCoord.y + 11}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-amber-800 dark:fill-[#CCFF00] text-[9px] font-mono font-bold"
                >
                  {ax.display}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const renderPrompt = (rawPrompt: string) => {
  if (!rawPrompt) return null;
  // 1. Strip any residual title like "【任务类型：...】" or "[Task Type: ...]"
  const cleaned = rawPrompt
    .replace(/^(【任务类型[：:][^】]+】|\[Task Type[：:][^\]]+\])\s*/gi, "")
    .replace(/·/g, "・");

  // Split into paragraphs separated by double newlines
  const paragraphs = cleaned.split(/\n\s*\n/);

  return (
    <div className="space-y-3.5">
      {paragraphs.map((p, idx) => {
        const rawLines = p.split("\n");
        const cleanLines = rawLines.map(l => l.trim()).filter(Boolean);

        // 1. Check if this paragraph is a 2D symbol grid (e.g. 4x4 rotation or 7x6 density)
        const is2DGrid =
          cleanLines.length >= 2 &&
          cleanLines.every(l => /^[■▲★◆●○□△✦⬡・·\s]+$/.test(l));

        if (is2DGrid) {
          const matrix = cleanLines.map(l => l.split(/\s+/).filter(Boolean));
          const isUniform = matrix.every(r => r.length === matrix[0].length && r.length >= 2);
          if (isUniform) {
            return (
              <div key={idx} className="my-3">
                {renderSymbolGrid(matrix, false)}
              </div>
            );
          }
        }

        // 2. Check if this paragraph is a structured multi-line block (steps, samples, rows)
        const isStructuredBlock =
          cleanLines.length >= 2 &&
          cleanLines.some(l => /^(\s*第\s*\d+\s*行[:：]|\s*\[(样本|第\d步)[^\]]*\])/.test(l));

        if (isStructuredBlock) {
          return (
            <div
              key={idx}
              className="my-3 p-3.5 sm:p-4 rounded-2xl bg-[#FFFBEB] dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-[#38BDF8] shadow-[0_3.5px_0_#1c1917] dark:shadow-[3px_3px_0px_#38BDF8] space-y-2 inline-block min-w-[220px]"
            >
              {cleanLines.map((line, lIdx) => (
                <div key={lIdx} className="font-mono text-sm md:text-base text-stone-950 dark:text-cyan-300 font-black leading-relaxed tracking-wider">
                  {line}
                </div>
              ))}
            </div>
          );
        }

        // 3. Standard text paragraph
        return (
          <p key={idx} className="text-sm md:text-base text-stone-950 dark:text-white leading-relaxed font-sans font-bold whitespace-pre-line">
            {cleanLines.join("\n")}
          </p>
        );
      })}
    </div>
  );
};

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}

interface AppProps {
  inAppLayout?: boolean;
  onNavigate?: (path: string) => void;
}

export default function App({ inAppLayout = false, onNavigate }: AppProps = {}) {
  const isMobile = useIsMobile();
  const { locale, t, formatMessage } = useLocale();
  const { user, openAuthModal, notifySessionChanged, sessionSyncVersion } = useUser();
  const { playSound, triggerHaptic, isReducedMotion, isEcoMode } = useGameEffects();
  const isEn = locale === "en-US";

  const [stage, setStage] = useState<"WELCOME" | "TESTING" | "REPORT">("WELCOME");
  const [subjectName, setSubjectName] = useState("");
  const [totalTrials, setTotalTrials] = useState(30);

  // Active testing state
  const [sessionId, setSessionId] = useState("");
  const [trialData, setTrialData] = useState<TrialRequest | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [initialChoiceBeforeHint, setInitialChoiceBeforeHint] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<"HIGH_BET" | "SAFE_BET">("HIGH_BET");
  const [unlockedHints, setUnlockedHints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Gamified transitions state
  const [portalStarting, setPortalStarting] = useState(false);
  const [settlementState, setSettlementState] = useState<{
    active: boolean;
    stepIndex: number;
  } | null>(null);

  // Report state
  const [report, setReport] = useState<ReportData | null>(null);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [placeholderCodename, setPlaceholderCodename] = useState(() => generateRandomCodename(locale));
  const [reportLoading, setReportLoading] = useState(false);
  const [reportNotFound, setReportNotFound] = useState(false);
  const [copiedPermalink, setCopiedPermalink] = useState(false);
  const [lastSessionRecord, setLastSessionRecord] = useState<{ sessionId: string; timestamp: number } | null>(() => getLastCompletedSession());

  useEffect(() => {
    setPlaceholderCodename(generateRandomCodename(locale));
  }, [locale]);

  useEffect(() => {
    setLastSessionRecord(getLastCompletedSession());
  }, [user, sessionSyncVersion]);

  const navigateTo = useCallback(
    (path: string) => {
      if (onNavigate) {
        onNavigate(path);
      } else if (typeof window !== "undefined") {
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    },
    [onNavigate]
  );

  // 按会话 ID 加载专属报告
  const loadReportById = useCallback(async (targetId: string, updateUrl: boolean = false) => {
    if (!targetId) return;
    setReportLoading(true);
    setReportNotFound(false);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(targetId)}/report?lang=${encodeURIComponent(locale)}`, {
        headers: { "Accept-Language": locale },
      });
      if (!res.ok) {
        setReportNotFound(true);
        return;
      }
      const repData = await res.json();
      setSessionId(targetId);
      setReport(repData);
      setStage("REPORT");
      if (!user) {
        saveLastCompletedSession(targetId);
        setLastSessionRecord(getLastCompletedSession());
      }

      if (updateUrl && typeof window !== "undefined") {
        const targetUrl = buildSessionReportUrl(targetId);
        window.history.pushState({ sessionId: targetId }, "", targetUrl);
      }
    } catch (e: any) {
      setErrorMsg(e.message || t.app.networkErrorFallback);
      setReportNotFound(true);
    } finally {
      setReportLoading(false);
    }
  }, [locale, t, user]);

  // 监听浏览器路由变化与初次加载专用路由 (/report/:id, ?session_id=xxx 等)
  useEffect(() => {
    const handlePopState = () => {
      const targetId = extractSessionIdFromUrl();
      if (targetId) {
        loadReportById(targetId, false);
      } else {
        // 返回首页
        setReport(null);
        setReportNotFound(false);
        setStage("WELCOME");
      }
    };

    // 初次挂载时检查 URL 是否携带专用路由
    const initialSessionId = extractSessionIdFromUrl();
    if (initialSessionId) {
      loadReportById(initialSessionId, false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadReportById]);

  // Memoized localized report: dynamically updates presentation layer on locale change
  const localizedReport = useMemo<ReportData | null>(() => {
    if (!report) return null;
    const rawProfile = (report as any).diagnostic_profile;
    const quadrantCode = (report as any).quadrant_code || rawProfile?.quadrant_code || rawProfile?.archetype || "Q1-CAL";
    const def = getArchetypeDefinition(quadrantCode, locale);

    const skills = def.skills.map((defSkill: any, idx: number) => {
      const origSkill = rawProfile?.skills?.[idx];
      return {
        icon: origSkill?.icon || defSkill.icon || "✨",
        type: defSkill.type || origSkill?.type,
        name: defSkill.name || origSkill?.name,
        desc: defSkill.desc || origSkill?.desc,
      };
    });

    return {
      ...report,
      quadrant_code: def.quadrant_code,
      diagnostic_profile: {
        ...(rawProfile || {}),
        archetype: def.archetype,
        role_title: def.role_title,
        english_title: def.english_title,
        quadrant_code: def.quadrant_code,
        praise_tagline: def.praise_tagline,
        strength_tags: def.strength_tags,
        empowering_feedback: def.empowering_feedback,
        growth_advice: def.growth_advice,
        skills,
        clinical_summary: def.clinical_summary,
      },
    } as any;
  }, [report, locale]);

  // Sync latest report from backend on locale toggle in REPORT phase
  useEffect(() => {
    if (stage !== "REPORT" || !sessionId) return;
    let isCancelled = false;
    fetch(`/api/sessions/${sessionId}/report?lang=${encodeURIComponent(locale)}`, {
      headers: { "Accept-Language": locale },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!isCancelled && data && (data.quadrant_code || data.diagnostic_profile)) {
          setReport(data);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [locale, stage, sessionId]);

  // Current trial hint cost
  const hintsCost = unlockedHints.length === 0 ? 0 : unlockedHints.length === 1 ? 1 : 3;

  // 复制专属会话报告链接
  const handleCopyReportLink = async () => {
    if (!report?.session_id) return;
    const permalink = buildSessionReportUrl(report.session_id);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(permalink);
      }
      setCopiedPermalink(true);
      setTimeout(() => setCopiedPermalink(false), 2500);
    } catch (e) {
      console.warn("Failed to copy link:", e);
    }
  };

  // 终结并展示测评报告卡片 (统一收敛报告落地与无障碍减弱动效适配)
  const finalizeReport = useCallback(
    (repData: ReportData, targetSessionId: string) => {
      setReport(repData);
      setStage("REPORT");
      clearReferrerSessionId();
      playSound("report_reveal");
      if (!user) {
        saveLastCompletedSession(targetSessionId);
        setLastSessionRecord(getLastCompletedSession());
      } else {
        notifySessionChanged();
      }
      if (typeof window !== "undefined") {
        const permalink = buildSessionReportUrl(targetSessionId);
        window.history.pushState({ sessionId: targetSessionId }, "", permalink);
      }
      // 严格尊重无障碍减弱动效偏好：在 reduced 模式下严禁喷射粒子烟花
      if (!isReducedMotion) {
        triggerHaptic("heavy");
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.55 },
          colors: ["#FBBF24", "#10B981", "#FB7185", "#38BDF8"],
        });
      }
    },
    [user, notifySessionChanged, playSound, triggerHaptic, isReducedMotion]
  );

  const settlementTimeoutsRef = useRef<any[]>([]);
  const [pendingReportData, setPendingReportData] = useState<{
    repData: ReportData;
    targetSessionId: string;
  } | null>(null);

  const clearSettlementTimeouts = useCallback(() => {
    settlementTimeoutsRef.current.forEach((id) => clearTimeout(id));
    settlementTimeoutsRef.current = [];
  }, []);

  const handleSkipSettlement = useCallback(() => {
    clearSettlementTimeouts();
    setSettlementState(null);
    if (pendingReportData) {
      finalizeReport(pendingReportData.repData, pendingReportData.targetSessionId);
      setPendingReportData(null);
    }
  }, [clearSettlementTimeouts, pendingReportData, finalizeReport]);

  // Start a new exploration session
  const startSession = async () => {
    const currentUnclaimed = getLastCompletedSession();
    if (!canGuestStartNewSession(Boolean(user), currentUnclaimed?.sessionId)) {
      setLastSessionRecord(currentUnclaimed);
      openAuthModal();
      return;
    }

    setLoading(true);
    setPortalStarting(true);
    playSound("portal");
    triggerHaptic("medium");
    setErrorMsg("");
    const finalName = subjectName.trim() || user?.display_name || placeholderCodename;
    const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const refParam = sp?.get("referrer") || sp?.get("ref") || sp?.get("duel");
    const referrerId = (refParam && refParam !== "1" ? refParam : null) || getReferrerSessionId();

    try {
      const res = await fetch(`/api/sessions/start?lang=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({
          subject_name: finalName,
          total_trials: totalTrials,
          warmup_trials: Math.max(5, Math.floor(totalTrials / 3)),
          referrer_session_id: referrerId || undefined,
        }),
      });
      if (!res.ok) throw new Error(t.app.startErrorFallback);
      const data: TrialRequest = await res.json();
      setSessionId(data.session_id);
      setTrialData(data);
      setSelectedOption(null);
      setInitialChoiceBeforeHint(null);
      setSelectedAction("HIGH_BET");
      setUnlockedHints(normalizeUnlockedHints(data.payload.unlocked_hints));

      // Allow brief portal resonance transition before switching to testing view
      setTimeout(() => {
        setStage("TESTING");
        setPortalStarting(false);
      }, isReducedMotion ? 50 : 350);
    } catch (e: any) {
      setErrorMsg(e.message || t.app.networkErrorFallback);
      setPortalStarting(false);
    } finally {
      setLoading(false);
    }
  };

  // Purchase tiered hint
  const handleBuyHint = async () => {
    if (!sessionId || unlockedHints.length >= 2 || loading) return;
    if (selectedOption && !initialChoiceBeforeHint) {
      setInitialChoiceBeforeHint(selectedOption);
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/hint?lang=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: { "Accept-Language": locale },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || t.app.buyHintErrorFallback);
      }
      const data = await res.json();
      setUnlockedHints(
        data.unlocked_hints
          ? normalizeUnlockedHints(data.unlocked_hints)
          : [...unlockedHints, data.hint]
      );
      playSound("hint");
      triggerHaptic("medium");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit trial answer & action
  const handleSubmitTrial = useCallback(async () => {
    if (!sessionId || loading) return;
    if (!selectedOption) {
      setErrorMsg(t.app.selectOptionWarning);
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const currentDifficulty = trialData?.payload.difficulty_level ?? 1;
      const firstChoice = initialChoiceBeforeHint || selectedOption;
      // 1. Submit Phase 1 (first-order choice prior to hint revision if captured)
      const p1Res = await fetch(`/api/sessions/${sessionId}/phase1?lang=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({ choice: firstChoice }),
      });
      if (!p1Res.ok) {
        const errJson = await p1Res.json().catch(() => ({}));
        throw new Error(errJson.error || t.app.recordChoiceError);
      }

      // 2. Submit Phase 2: action is selectedAction (HIGH_BET or SAFE_BET)
      const p2Res = await fetch(`/api/sessions/${sessionId}/phase2?lang=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({
          action: selectedAction,
          confidence_level: selectedAction === "HIGH_BET" ? 0.95 : 0.50,
          revised_choice: selectedOption,
        }),
      });
      if (!p2Res.ok) {
        const errJson = await p2Res.json().catch(() => ({}));
        throw new Error(errJson.error || t.app.confirmDecisionError);
      }
      const p2Data = await p2Res.json();

      if (p2Data.is_completed) {
        let repData = p2Data.report;
        if (!repData) {
          const repRes = await fetch(`/api/sessions/${sessionId}/report?lang=${encodeURIComponent(locale)}`, {
            headers: { "Accept-Language": locale },
          });
          if (!repRes.ok) throw new Error(t.app.generateReportError);
          repData = await repRes.json();
        }

        // Orchestrate 4-stage Metacognitive Manifold Deduction sequence
        if (isReducedMotion) {
          finalizeReport(repData, sessionId);
        } else {
          setPendingReportData({ repData, targetSessionId: sessionId });
          setSettlementState({ active: true, stepIndex: 0 });
          playSound("settlement_pulse");
          triggerHaptic("light");
          clearSettlementTimeouts();

          settlementTimeoutsRef.current.push(
            setTimeout(() => {
              setSettlementState({ active: true, stepIndex: 1 });
              playSound("settlement_pulse");
              triggerHaptic("light");
            }, 750)
          );

          settlementTimeoutsRef.current.push(
            setTimeout(() => {
              setSettlementState({ active: true, stepIndex: 2 });
              playSound("settlement_pulse");
              triggerHaptic("medium");
            }, 1500)
          );

          settlementTimeoutsRef.current.push(
            setTimeout(() => {
              setSettlementState({ active: true, stepIndex: 3 });
              playSound("settlement_pulse");
              triggerHaptic("heavy");
            }, 2250)
          );

          settlementTimeoutsRef.current.push(
            setTimeout(() => {
              setSettlementState(null);
              setPendingReportData(null);
              finalizeReport(repData, sessionId);
            }, 3000)
          );
        }
      } else {
        // Fetch next trial (隐蔽自适应阶梯，严禁向受测者暴露任何难度变动提示)
        const nextReqRes = await fetch(`/api/sessions/${sessionId}/trial?lang=${encodeURIComponent(locale)}`, {
          headers: { "Accept-Language": locale },
        });
        if (!nextReqRes.ok) throw new Error(t.app.fetchNextTrialError);
        const nextTrial: TrialRequest = await nextReqRes.json();
        playSound("tap");

        setTrialData(nextTrial);
        setSelectedOption(null);
        setInitialChoiceBeforeHint(null);
        setSelectedAction("HIGH_BET");
        setUnlockedHints(normalizeUnlockedHints(nextTrial.payload.unlocked_hints));
      }
    } catch (e: any) {
      setErrorMsg(e.message || t.app.networkErrorFallback);
    } finally {
      setLoading(false);
    }
  }, [
    sessionId,
    selectedOption,
    initialChoiceBeforeHint,
    selectedAction,
    loading,
    locale,
    t,
    trialData,
    isReducedMotion,
    playSound,
    triggerHaptic,
    finalizeReport,
  ]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (stage !== "TESTING") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(key)) {
        if (trialData && trialData.payload.options[key]) {
          setSelectedOption(key);
          playSound("select");
          triggerHaptic("light");
        }
      } else if (key === "1") {
        setSelectedAction("HIGH_BET");
        playSound("wager");
        triggerHaptic("light");
      } else if (key === "2") {
        setSelectedAction("SAFE_BET");
        playSound("wager");
        triggerHaptic("light");
      } else if (key === "H") {
        handleBuyHint();
      } else if (key === "ENTER") {
        if (selectedOption && !loading) {
          handleSubmitTrial();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage, trialData, selectedOption, selectedAction, loading, handleSubmitTrial]);

  const isGuestBlockedByUnclaimed = !canGuestStartNewSession(
    Boolean(user),
    lastSessionRecord?.sessionId
  );

  // 仅在移动端视口挂载专用的移动端答题视图组件，状态机与数据源严格一致
  if (isMobile && stage === "TESTING" && trialData) {
    return (
      <div className="h-screen h-dvh min-h-dvh max-h-dvh w-full overflow-hidden bg-[#FFFDF8] dark:bg-[#08080C] text-stone-900 dark:text-white flex flex-col">
        <MobileAssessmentView
          trialData={trialData}
          totalTrials={totalTrials}
          selectedOption={selectedOption}
          onSelectOption={(key) => {
            setSelectedOption(key);
            playSound("select");
            triggerHaptic("light");
          }}
          selectedAction={selectedAction}
          onSelectAction={(act) => {
            setSelectedAction(act);
            playSound("wager");
            triggerHaptic("light");
          }}
          unlockedHints={unlockedHints}
          hintsCost={hintsCost}
          onBuyHint={handleBuyHint}
          onSubmitTrial={handleSubmitTrial}
          loading={loading}
          errorMsg={errorMsg}
          inAppLayout={inAppLayout}
        />

        {/* 算力推演全屏结算过渡动效 */}
        <GamifiedTransition
          active={Boolean(settlementState?.active)}
          variant="settlement"
          stepIndex={settlementState?.stepIndex ?? 0}
          onSkip={handleSkipSettlement}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh flex flex-col justify-between p-4 md:p-8 max-w-4xl mx-auto selection:bg-[#FBBF24] dark:selection:bg-[#CCFF00] selection:text-stone-950 dark:selection:text-[#08080C] text-stone-900 dark:text-white font-sans pb-[env(safe-area-inset-bottom)]">
      {/* 仅在未进入 App Layout 时展示顶部萌趣导航栏 */}
      {!inAppLayout && (
        <header className="flex items-center justify-between py-4 border-b-2 border-stone-900/10 dark:border-white/15 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigateTo("/");
              }}
              className="flex items-center gap-2.5 group cursor-pointer min-w-0"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FBBF24] dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] group-hover:-translate-y-0.5 active:translate-y-0.5 transition-all shrink-0">
                <Compass className="w-5 h-5 text-stone-950 dark:text-[#CCFF00]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-black tracking-tight text-stone-900 dark:text-white truncate">
                  {t.app.appTitle}
                </h1>
                <p className="text-[11px] font-bold text-stone-500 dark:text-[#CCFF00] font-mono uppercase hidden xs:block truncate">
                  {t.app.appSubtitle}
                </p>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {stage === "TESTING" && trialData && (
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-none shrink-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-stone-700 dark:text-[#08080C] uppercase hidden xs:inline">{t.app.voyageProgress}</span>
                <span className="font-mono text-stone-950 dark:text-[#08080C] font-black text-xs">
                  {String(trialData.trial_index).padStart(2, "0")} / {totalTrials}
                </span>
              </div>
            )}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigateTo("/");
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#0E0E16] hover:bg-amber-50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-xs font-bold text-stone-800 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-stone-900 dark:text-[#CCFF00]" />
              <span>{isEn ? "Official Home" : "返回官网首页"}</span>
            </a>
            
            {/* Desktop Full Controls */}
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle />
              <GameQuickControls />
              <UserNav />
            </div>

            {/* Mobile Hamburger Drawer Menu Button */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label={isEn ? "Open navigation drawer" : "展开导航菜单"}
              className="sm:hidden w-9 h-9 rounded-xl bg-white dark:bg-[#0E0E16] hover:bg-amber-50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-stone-950 dark:text-white flex items-center justify-center shadow-[0_2px_0_#1c1917] dark:shadow-none active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Mobile Drawer */}
      <MobileNavDrawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onNavigate={navigateTo}
      />

      {/* 主体区域 */}
      <main className="flex-1 flex flex-col justify-center">
        {/* 专属报告游戏化聚能加载态 */}
        {reportLoading && (
          <GamifiedTransition
            active={true}
            variant="charge"
            title={t.app.reportLoadingText}
            subtitle={`SESSION: ${extractSessionIdFromUrl() || sessionId || "..."}`}
            fullScreen={false}
          />
        )}

        {/* 会话未找到或已清理提示卡片 */}
        {!reportLoading && reportNotFound && (
          <div className="bg-white dark:bg-[#0E0E16] rounded-[28px] p-8 md:p-12 text-center max-w-lg mx-auto w-full border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] space-y-5 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-[#FFE4E6] dark:bg-rose-950/40 border-2 border-stone-900 dark:border-rose-500/40 text-stone-900 dark:text-rose-300 flex items-center justify-center mx-auto shadow-[0_3px_0_#1c1917] dark:shadow-none">
              <AlertCircle className="w-7 h-7 text-[#F43F5E]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900 dark:text-white mb-2">{t.app.reportNotFoundTitle}</h2>
              <p className="text-xs md:text-sm text-stone-600 dark:text-slate-400 leading-relaxed font-sans font-medium">
                {t.app.reportNotFoundDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setReportNotFound(false);
                setStage("WELCOME");
                navigateTo("/");
              }}
              className="px-6 py-2.5 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] font-black text-xs inline-flex items-center gap-2 cursor-pointer transition-all border-2 border-stone-900 dark:border-black shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none mx-auto"
            >
              <RotateCcw className="w-4 h-4" /> {t.app.backToHomeBtn}
            </button>
          </div>
        )}

        {/* 1A. 游客单画像未认领门禁卡片 */}
        {!reportLoading && !reportNotFound && stage === "WELCOME" && isGuestBlockedByUnclaimed && lastSessionRecord && (
          <div className="bg-white dark:bg-[#0E0E16] rounded-[28px] p-8 md:p-12 text-center max-w-xl mx-auto w-full border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_8px_0_#1c1917] dark:shadow-[6px_6px_0px_#CCFF00] relative space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center mx-auto text-stone-900 dark:text-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black text-xs font-black text-stone-900 dark:text-[#08080C] shadow-[0_2px_0_#1c1917] dark:shadow-none">
                <Crown className="w-3.5 h-3.5 text-stone-900 dark:text-[#08080C]" />
                <span>{isEn ? "1 / 1 Guest Archetype Quota Reached" : "游客单次画像额度已满 (1 / 1)"}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white uppercase tracking-tight">
                {isEn
                  ? "Sign In to Claim Your Unclaimed Archetype First"
                  : "请先登录认领您本机的专属认知画像"}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto font-medium">
                {isEn
                  ? "Guests can hold only one unclaimed cognitive archetype locally. Sign in now to automatically claim your completed result into your Cognitive Assets and unlock unlimited new assessments!"
                  : "游客状态下仅可保有一份本地未认领画像。登录后系统将自动把您的未认领评测记录关联至个人账号并点亮认知资产图鉴，随后即可开启全新测试！"}
              </p>
              <div className="text-[11px] font-mono font-bold text-stone-700 dark:text-[#CCFF00] bg-amber-50 dark:bg-black/60 px-3.5 py-1.5 rounded-xl border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none inline-block">
                UNCLAIMED SESSION: {lastSessionRecord.sessionId}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={openAuthModal}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>{isEn ? "Sign In & Auto-Claim Archetype" : "立即登录 · 自动认领画像"}</span>
              </button>

              <button
                type="button"
                onClick={() => loadReportById(lastSessionRecord.sessionId, true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-amber-50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-stone-900 dark:text-white font-extrabold text-xs sm:text-sm shadow-[0_3px_0_#1c1917] dark:shadow-none active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Bookmark className="w-4 h-4 text-stone-900 dark:text-white" />
                <span>{isEn ? "View Unclaimed Report" : "查看未认领画像报告"}</span>
              </button>
            </div>
          </div>
        )}

        {/* 1B. 欢迎探索阶段：多巴胺轻萌解压 vs 赛博先锋酸性 */}
        {!reportLoading && !reportNotFound && stage === "WELCOME" && !isGuestBlockedByUnclaimed && (
          <div className="bg-white dark:bg-[#0E0E16] rounded-[28px] p-8 md:p-12 text-center max-w-2xl mx-auto w-full border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_8px_0_#1c1917] dark:shadow-[6px_6px_0px_#CCFF00] relative">
            {/* 快速找回上次已完成的会话结果 */}
            {lastSessionRecord && (
              <div className="mb-6 p-4 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-[#FBBF24] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black flex items-center justify-center shrink-0 shadow-[0_2px_0_#1c1917] dark:shadow-none">
                    <Bookmark className="w-4 h-4 text-stone-950 dark:text-[#08080C]" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-black text-stone-900 dark:text-white truncate">{t.app.resumeLastReportBtn}</div>
                    <div className="text-[10px] text-stone-600 dark:text-[#CCFF00] font-mono truncate">{lastSessionRecord.sessionId}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => loadReportById(lastSessionRecord.sessionId, true)}
                  className="px-4 py-2 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] font-black text-xs shrink-0 cursor-pointer transition-all border-2 border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-none active:translate-y-0.5 active:shadow-none flex items-center gap-1"
                >
                  <span>查看</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black text-xs text-stone-900 dark:text-[#08080C] mb-6 font-black shadow-[0_2px_0_#1c1917] dark:shadow-none">
              <Stars className="w-4 h-4 text-amber-500 fill-amber-400 dark:text-[#08080C] dark:fill-[#08080C]" />
              {t.app.welcomeBadge}
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-stone-900 dark:text-white tracking-tight mb-3">
              {t.app.welcomeTitle}
            </h2>

            <p className="text-stone-600 dark:text-slate-200 text-sm md:text-base leading-relaxed mb-8 max-w-lg mx-auto font-medium">
              {t.app.welcomeDesc}
            </p>

            <div className="space-y-5 max-w-sm mx-auto text-left mb-8">
              <div>
                <label className="block text-xs font-extrabold text-stone-800 dark:text-white mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-stone-900 dark:text-[#CCFF00]" /> {t.app.explorerNameLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = generateRandomCodename(locale);
                      setPlaceholderCodename(next);
                      setSubjectName(next);
                    }}
                    className="text-[11px] text-amber-700 dark:text-[#CCFF00] hover:underline font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title={t.app.randomCodenameBtn}
                  >
                    <Dices className="w-3.5 h-3.5" /> {t.app.randomCodenameBtn}
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={formatMessage(t.app.placeholderCodename, { name: placeholderCodename })}
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[#FFFDF8] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#CCFF00] dark:focus:border-[#CCFF00] text-sm font-semibold shadow-[0_2px_0_#1c1917] dark:shadow-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = generateRandomCodename(locale);
                      setPlaceholderCodename(next);
                      setSubjectName(next);
                    }}
                    className="absolute right-3 top-3 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white cursor-pointer transition-colors"
                    title={t.app.randomCodenameBtn}
                  >
                    <Dices className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-stone-800 dark:text-white mb-1.5">{t.app.voyageScaleLabel}</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t.app.scale30, val: 30 },
                    { label: t.app.scale16, val: 16 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setTotalTrials(opt.val)}
                      className={`px-3 py-2.5 rounded-2xl text-xs font-black border-2 border-stone-900 dark:border-white/20 text-center transition-all cursor-pointer ${
                        totalTrials === opt.val
                          ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] scale-[1.02]"
                          : "bg-[#FFFDF8] dark:bg-[#12121C] text-stone-600 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none hover:bg-amber-50 dark:hover:border-[#CCFF00]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 mb-6 rounded-2xl bg-[#FFE4E6] dark:bg-rose-950/50 border-2 border-stone-900 dark:border-rose-500/50 text-rose-700 dark:text-rose-300 font-bold text-xs text-center shadow-[0_2px_0_#1c1917] dark:shadow-none">
                {errorMsg}
              </div>
            )}

            <button
              onClick={startSession}
              disabled={loading}
              className="w-full max-w-sm px-6 py-4 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] font-black text-base border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#FFFFFF] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer mx-auto"
            >
              {loading ? t.app.startingVoyage : t.app.startVoyageBtn}
            </button>
          </div>
        )}

        {/* 2. 答题进行阶段：双模式自适应 (多巴胺轻萌 vs 赛博先锋酸性) */}
        {stage === "TESTING" && trialData && (
          <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* 在 App Layout 内无顶部固定栏时展示内联进度计数器 */}
            {inAppLayout && (
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-slate-400">
                <span className="flex items-center gap-2 font-black text-stone-800 dark:text-white">
                  <Compass className="w-4 h-4 text-stone-900 dark:text-[#CCFF00]" />
                  <span>{t.app.voyageProgress}</span>
                </span>
                <span className="font-mono text-stone-950 dark:text-[#08080C] font-black px-3 py-1 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-none">
                  {String(trialData.trial_index).padStart(2, "0")} / {totalTrials}
                </span>
              </div>
            )}
            {/* 顶部长条进度条 */}
            <div className="w-full h-3.5 bg-[#FEF3C7] dark:bg-[#12121C] rounded-full border-2 border-stone-900 dark:border-white/20 overflow-hidden shadow-[0_2px_0_#1c1917] dark:shadow-none">
              <div
                className="h-full bg-[#10B981] dark:bg-[#CCFF00] transition-all duration-300 rounded-full"
                style={{ width: `${(trialData.trial_index / totalTrials) * 100}%` }}
              />
            </div>

            {/* 核心图形与规律卡片 */}
            <div className="bg-white dark:bg-[#0E0E16] rounded-[24px] p-6 md:p-8 space-y-4 border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]">
              {renderPrompt(trialData.payload.prompt)}

              {/* 灵感启示抽屉 (多级线索) */}
              {unlockedHints.length > 0 && (
                <div className="space-y-2">
                  {unlockedHints.map((hint, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 text-stone-900 dark:text-white text-xs md:text-sm leading-relaxed shadow-[0_2px_0_#1c1917] dark:shadow-none animate-in fade-in slide-in-from-top-2 duration-300"
                    >
                      <div className="font-black text-stone-900 dark:text-[#CCFF00] flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 dark:text-[#CCFF00] dark:fill-[#CCFF00]/20" />
                          {idx === 0 ? t.app.clue1Title : t.app.clue2Title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-black/60 border border-stone-900 dark:border-white/20 text-stone-900 dark:text-[#CCFF00] font-mono">
                          {idx === 0 ? t.app.cost1Pt : t.app.cost2Pt}
                        </span>
                      </div>
                      <div className="font-medium text-stone-800 dark:text-slate-300">{hint}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 线索购买操作栏 */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400">
                  {unlockedHints.length === 0
                    ? t.app.hintHint0
                    : formatMessage(t.app.hintHintN, { count: unlockedHints.length, cost: hintsCost })}
                </span>

                {unlockedHints.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleBuyHint}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-stone-900 dark:text-white bg-white dark:bg-[#12121C] hover:bg-amber-100 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {t.app.buyClue1Btn}
                    <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-black/60 border border-stone-900 dark:border-white/20 font-mono">H</kbd>
                  </button>
                ) : unlockedHints.length === 1 ? (
                  <button
                    type="button"
                    onClick={handleBuyHint}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-stone-900 dark:text-white bg-white dark:bg-[#12121C] hover:bg-amber-100 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {t.app.buyClue2Btn}
                    <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-black/60 border border-stone-900 dark:border-white/20 font-mono">H</kbd>
                  </button>
                ) : (
                  <span className="text-[11px] font-black text-stone-700 dark:text-[#CCFF00] bg-amber-100 dark:bg-black/60 px-2.5 py-1 rounded-full border border-stone-900 dark:border-white/20 flex items-center gap-1">
                    {t.app.cluesAllUnlocked}
                  </span>
                )}
              </div>
            </div>

            {/* 2x2 选项卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {Object.entries(trialData.payload.options).map(([key, rawVal]) => {
                const isSelected = selectedOption === key;
                const badgeColor =
                  key === "A"
                    ? "bg-[#FBBF24]"
                    : key === "B"
                    ? "bg-[#FB7185]"
                    : key === "C"
                    ? "bg-[#34D399]"
                    : "bg-[#38BDF8]";

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedOption(key);
                      playSound("select");
                      triggerHaptic("light");
                    }}
                    className={`p-4 rounded-2xl border-[2.5px] text-left transition-all duration-150 flex items-start gap-3.5 cursor-pointer relative ${
                      isSelected
                        ? "bg-[#D1FAE5] dark:bg-[#0E0E16] border-stone-900 dark:border-[#CCFF00] ring-2 ring-emerald-600 dark:ring-0 shadow-[0_5px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] scale-[1.015]"
                        : "bg-white dark:bg-[#12121C] border-stone-900 dark:border-white/20 text-stone-950 dark:text-white hover:bg-[#FFFBEB] dark:hover:border-[#CCFF00] dark:hover:bg-[#161624] dark:hover:shadow-[2px_2px_0px_#CCFF00] hover:-translate-y-1 hover:shadow-[0_6px_0_#1c1917] shadow-[0_3.5px_0_#1c1917] dark:shadow-none active:translate-y-1.5 active:shadow-none"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs font-mono shrink-0 transition-colors border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none ${badgeColor} ${
                        isSelected
                          ? "dark:bg-[#CCFF00] dark:text-[#08080C] dark:border-[#CCFF00]"
                          : "dark:bg-black/60 dark:text-white"
                      } text-stone-950`}
                    >
                      {key}
                    </span>
                    <div className="flex-1 min-w-0 text-stone-950 dark:text-white">
                      {renderOption(rawVal)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 决断本能选择面板 */}
            <div className="bg-white dark:bg-[#0E0E16] rounded-[24px] p-5 space-y-4 border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_5px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-stone-900 dark:text-white">{t.app.instinctPrompt}</span>
                <span className="text-[11px] font-bold text-stone-600 dark:text-slate-400 font-mono">{t.app.instinctShortcuts}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAction("HIGH_BET");
                    playSound("wager");
                    triggerHaptic("light");
                  }}
                  className={`p-3.5 rounded-2xl border-[2.5px] transition-all cursor-pointer ${
                    selectedAction === "HIGH_BET"
                      ? "bg-[#FFE4E6] dark:bg-[#FF3366] text-stone-950 dark:text-white border-stone-900 dark:border-[#FF3366] shadow-[0_5px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] scale-[1.015]"
                      : "bg-[#FFFDF8] dark:bg-[#0E0E16] text-stone-800 dark:text-white border-stone-900 dark:border-white/20 shadow-[0_2.5px_0_#1c1917] dark:shadow-none hover:bg-rose-50 hover:border-stone-900 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#1c1917] dark:hover:border-[#FF3366] dark:hover:shadow-[2px_2px_0px_#FF3366] active:translate-y-1.5 active:shadow-none"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-black text-xs md:text-sm flex items-center gap-1.5 ${
                      selectedAction === "HIGH_BET" ? "text-rose-900 dark:text-white" : "text-rose-900 dark:text-[#FF3366]"
                    }`}>
                      <Flame className="w-4 h-4 text-rose-600 fill-rose-500 dark:text-current dark:fill-current" />
                      {formatMessage(t.app.highBetTitle, { pos: 10 - hintsCost, neg: 10 + hintsCost })}
                    </span>
                    <kbd className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold ${
                      selectedAction === "HIGH_BET"
                        ? "bg-white/80 dark:bg-black/40 text-stone-950 dark:text-white border-stone-900 dark:border-white/40"
                        : "bg-white dark:bg-black/60 text-stone-800 dark:text-slate-300 border-stone-900 dark:border-white/20"
                    }`}>1</kbd>
                  </div>
                  <div className={`text-[11px] font-bold ${
                    selectedAction === "HIGH_BET" ? "text-stone-800 dark:text-white/90" : "text-stone-700 dark:text-slate-300"
                  }`}>
                    {t.app.highBetDesc}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAction("SAFE_BET");
                    playSound("wager");
                    triggerHaptic("light");
                  }}
                  className={`p-3.5 rounded-2xl border-[2.5px] transition-all cursor-pointer ${
                    selectedAction === "SAFE_BET"
                      ? "bg-[#E0F2FE] dark:bg-[#38BDF8] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-[#38BDF8] shadow-[0_5px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] scale-[1.015]"
                      : "bg-[#FFFDF8] dark:bg-[#0E0E16] text-stone-800 dark:text-white border-stone-900 dark:border-white/20 shadow-[0_2.5px_0_#1c1917] dark:shadow-none hover:bg-sky-50 hover:border-stone-900 hover:-translate-y-0.5 hover:shadow-[0_4px_0_#1c1917] dark:hover:border-[#38BDF8] dark:hover:shadow-[2px_2px_0px_#38BDF8] active:translate-y-1.5 active:shadow-none"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-black text-xs md:text-sm flex items-center gap-1.5 ${
                      selectedAction === "SAFE_BET" ? "text-sky-900 dark:text-[#08080C]" : "text-sky-900 dark:text-[#38BDF8]"
                    }`}>
                      <Shield className="w-4 h-4 text-sky-600 fill-sky-400 dark:text-current dark:fill-current" />
                      {formatMessage(t.app.safeBetTitle, { pos: 3 - hintsCost })}
                    </span>
                    <kbd className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold ${
                      selectedAction === "SAFE_BET"
                        ? "bg-white/80 dark:bg-black/40 text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-white/40"
                        : "bg-white dark:bg-black/60 text-stone-800 dark:text-slate-300 border-stone-900 dark:border-white/20"
                    }`}>2</kbd>
                  </div>
                  <div className={`text-[11px] font-bold ${
                    selectedAction === "SAFE_BET" ? "text-stone-800 dark:text-[#08080C]/90" : "text-stone-700 dark:text-slate-300"
                  }`}>
                    {t.app.safeBetDesc}
                  </div>
                </button>
              </div>

              {/* 异常提示横幅 */}
              {errorMsg && (
                <div className="p-3 rounded-2xl bg-[#FFE4E6] dark:bg-[#FF3366]/20 border-2 border-stone-900 dark:border-[#FF3366] text-rose-700 dark:text-[#FF3366] font-bold text-xs text-center shadow-[0_2px_0_#1c1917] dark:shadow-none">
                  {errorMsg}
                </div>
              )}

              {/* 继续前行主按钮 */}
              <button
                type="button"
                onClick={handleSubmitTrial}
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border-[2.5px] border-stone-900 dark:border-[#CCFF00] ${
                  selectedOption && !loading
                    ? "bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#FFFFFF] active:translate-y-1 active:shadow-none"
                    : "bg-[#E7E5E4] dark:bg-[#12121C] text-stone-400 dark:text-slate-600 shadow-[0_2px_0_#1c1917] dark:shadow-none cursor-not-allowed"
                }`}
              >
                {loading ? (
                  trialData.trial_index >= totalTrials ? t.app.castingCard : t.app.recordingImpression
                ) : !selectedOption ? (
                  t.app.selectOptionFirst
                ) : trialData.trial_index >= totalTrials ? (
                  t.app.finishVoyageBtn
                ) : (
                  t.app.nextTrialBtn
                )}
              </button>
            </div>

            {/* 键盘盲打指引 */}
            <div className="flex items-center justify-center gap-4 text-[11px] font-bold text-stone-500 dark:text-slate-400">
              {t.app.shortcutsGuide}
            </div>
          </div>
        )}

        {/* 3. 最终结果展示页面：双主题自适应 (多巴胺轻萌 vs 赛博先锋酸性) */}
        {stage === "REPORT" && (localizedReport || report) && (() => {
          const displayReport = localizedReport || report!;
          const profile = displayReport.diagnostic_profile;
          return (
            <div className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
              {/* 游客答题完成后的强引导登录收集结果画像卡片 */}
              {!user && (
                <div className="p-4 sm:p-6 rounded-[24px] bg-[#FEF3C7] dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] sm:shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-left">
                    <div className="inline-flex items-center gap-1.5 text-xs font-black text-stone-900 dark:text-[#CCFF00]">
                      <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500 dark:text-[#CCFF00] dark:fill-[#CCFF00]/20" />
                      <span>
                        {isEn
                          ? "Unclaimed Cognitive Archetype Unlocked!"
                          : "恭喜解锁专属认知画像！当前处于未认领游客状态"}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-700 dark:text-slate-300 leading-relaxed font-medium">
                      {isEn
                        ? `Sign in now to claim "${profile.role_title}" into your personal Cognitive Assets codex and unlock unlimited future assessments.`
                        : `立即登录即可将【${profile.role_title}】自动认领并永久收入您的认知资产图鉴，同时解锁无限次新一轮评测与 4D 流形轨迹追踪！`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openAuthModal}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isEn ? "Sign In to Collect Archetype" : "登录收集此结果画像"}</span>
                  </button>
                </div>
              )}

              {/* 专属性格解压/先锋名片大卡片 */}
              <div className="bg-white dark:bg-[#0E0E16] rounded-[28px] p-5 sm:p-8 md:p-12 relative overflow-hidden text-center shadow-[0_6px_0_#1c1917] sm:shadow-[0_8px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] sm:dark:shadow-[6px_6px_0px_#CCFF00] border-[2.5px] border-stone-900 dark:border-white/20">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black text-xs text-stone-900 dark:text-[#08080C] mb-4 font-black shadow-[0_2px_0_#1c1917] dark:shadow-none">
                  <Crown className="w-4 h-4 text-amber-600 fill-amber-400 dark:text-[#08080C] dark:fill-[#08080C]" /> {t.app.archetypeCardHeader}
                </div>

                <div className="text-xs text-stone-500 dark:text-[#CCFF00] mb-3 tracking-widest uppercase font-bold font-mono">
                  {formatMessage(t.app.explorerPrefix, { name: displayReport.subject_name })}
                </div>

                {/* 角色称号：纯色大标题（彻底告别假精致 gradient-text） */}
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-stone-900 dark:text-white uppercase mb-3 break-words">
                  {profile.role_title}
                </h2>

                {/* 专属灵魂 Tagline */}
                <div className="my-4 sm:my-5">
                  <span className="text-sm sm:text-base md:text-xl text-stone-900 dark:text-[#CCFF00] font-black tracking-wide bg-[#FFFBEB] dark:bg-[#12121C] px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-2xl border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2.5px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] inline-block max-w-full break-words">
                    “{profile.praise_tagline}”
                  </span>
                </div>

                {/* 高光标签 */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-lg mx-auto mb-6 sm:mb-8">
                  {profile.strength_tags.map((tag, idx) => {
                    const tagColors = [
                      "bg-[#D1FAE5] text-stone-900", // 开心果绿
                      "bg-[#FEF3C7] text-stone-900", // 芝士黄
                      "bg-[#FFE4E6] text-stone-900", // 蜜桃橘粉
                      "bg-[#E0F2FE] text-stone-900", // 苏打湖蓝
                    ];
                    const colorClass = tagColors[idx % tagColors.length];
                    return (
                      <span
                        key={idx}
                        className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs font-black border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] ${colorClass} dark:bg-[#0E0E16] dark:text-[#CCFF00] break-all`}
                      >
                        #{tag}
                      </span>
                    );
                  })}
                </div>

                {/* 深度赋能评语 */}
                <div className="text-xs sm:text-sm md:text-base text-stone-800 dark:text-slate-200 leading-relaxed max-w-2xl mx-auto text-left bg-[#FFFBEB] dark:bg-[#12121C] p-4 sm:p-6 rounded-2xl border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.8)] space-y-2">
                  <div className="text-xs font-black text-amber-800 dark:text-[#CCFF00] flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-600 fill-amber-400 dark:text-[#CCFF00] dark:fill-[#CCFF00]" /> {t.app.soulResonance}
                  </div>
                  <p className="text-stone-700 dark:text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed font-medium">
                    {profile.empowering_feedback}
                  </p>
                </div>
              </div>

              {/* 四维认知指标雷达图 */}
              <CognitiveMetricsRadar
                metrics={displayReport.metrics || (displayReport as any).metacognitive_metrics || {}}
                locale={locale}
              />

              {/* 专属特技谱系 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-stone-950 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 dark:text-[#CCFF00] dark:fill-[#CCFF00]/20" /> {t.app.innateSkills}
                  </h3>
                  <span className="text-xs text-stone-600 dark:text-slate-400 font-bold">{t.app.arsenalSubtitle}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.skills.map((skill, idx) => {
                    const cardBgColors = [
                      "bg-[#ECFDF5]", // 开心果绿
                      "bg-[#FFFBEB]", // 芝士黄
                      "bg-[#FFF1F2]", // 蜜桃橘粉
                      "bg-[#F0F9FF]", // 苏打湖蓝
                    ];
                    const cardBg = cardBgColors[idx % cardBgColors.length];
                    return (
                      <div
                        key={idx}
                        className={`${cardBg} dark:bg-[#12121C] rounded-2xl p-5 border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.8)] space-y-2 hover:-translate-y-0.5 transition-all`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{skill.icon}</span>
                            <span className="font-black text-sm text-stone-950 dark:text-white">{skill.name}</span>
                          </div>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white dark:bg-[#0E0E16] text-stone-950 dark:text-[#CCFF00] border-2 border-stone-900 dark:border-white/20 font-black shadow-sm">
                            {skill.type}
                          </span>
                        </div>
                        <p className="text-xs text-stone-800 dark:text-slate-300 leading-relaxed pt-1 font-bold">{skill.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 战略建议 */}
              <div className="p-4 sm:p-6 rounded-2xl bg-[#FEF3C7] dark:bg-[#12121C] border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.8)] text-xs md:text-sm text-stone-950 dark:text-white leading-relaxed space-y-1">
                <div className="font-black text-stone-950 dark:text-[#CCFF00] flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-stone-950 dark:text-[#CCFF00]" /> {t.app.strategicAdvice}
                </div>
                <p className="text-stone-800 dark:text-slate-300 text-xs md:text-sm pt-1 font-bold">
                  {profile.growth_advice}
                </p>
              </div>

              {/* 专属永久报告链接卡片 */}
              <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.8)] space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm font-black text-stone-900 dark:text-white flex items-center gap-1.5 font-sans">
                    <Link2 className="w-4 h-4 text-stone-900 dark:text-[#CCFF00]" /> {t.app.permanentLinkTitle}
                  </span>
                  <span className="text-[10px] text-stone-600 dark:text-[#08080C] font-mono font-bold bg-[#FEF3C7] dark:bg-[#CCFF00] px-2 py-0.5 rounded-full border border-stone-900 dark:border-black">
                    ID: {displayReport.session_id}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={buildSessionReportUrl(displayReport.session_id)}
                    className="flex-1 bg-[#FFFDF8] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-stone-900 dark:text-white truncate select-all focus:outline-none shadow-[0_1.5px_0_#1c1917] dark:shadow-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyReportLink}
                    className="px-4 py-2.5 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none shrink-0"
                  >
                    {copiedPermalink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-950 dark:text-[#08080C]" />
                        <span>已复制！</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t.app.copyReportLinkBtn}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed font-sans font-medium">
                  {t.app.permanentLinkDesc}
                </p>
              </div>

              {/* 双星对决应战成功提示横幅 */}
              {(() => {
                const duelReferrerId = displayReport.referrer_session_id || getReferrerSessionId();
                if (!duelReferrerId || duelReferrerId === displayReport.session_id) return null;
                return (
                  <div className="w-full max-w-xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-rose-500/15 border-2 border-rose-500/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Swords className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">
                          {isEn ? "Cognitive Twin Duel Ready!" : "双星对决战报已就绪！"}
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-slate-300">
                          {isEn
                            ? "Compare your 4D cognitive manifold against your challenger and export the joint poster."
                            : "你已完成应战！立即比对双方 4D 认知流形并生成双星联名战报海报。"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const duelPath = buildDuelUrl(duelReferrerId, displayReport.session_id);
                        navigateTo(duelPath);
                      }}
                      className="w-full sm:w-auto shrink-0 min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                    >
                      <Swords className="w-4 h-4" />
                      <span>{isEn ? "Open Duel Report" : "开启双星战报"}</span>
                    </button>
                  </div>
                );
              })()}

              {/* 按钮区 */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-4 w-full max-w-xl mx-auto">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearReferrerSessionId();
                      setStage("WELCOME");
                      setReport(null);
                      setTrialData(null);
                      setSessionId("");
                      navigateTo("/");
                    }}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-3.5 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-stone-50 dark:hover:bg-white/10 text-stone-900 dark:text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-none active:translate-y-1 active:shadow-none"
                  >
                    <RotateCcw className="w-4 h-4" /> {t.app.restartVoyage}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openAuthModal}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-3.5 rounded-2xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-stone-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border-2 border-stone-900 dark:border-[#38BDF8] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] active:translate-y-1 active:shadow-none"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {isEn
                        ? "Sign In & Claim to Start New Test"
                        : "登录认领画像以开启新测试"}
                    </span>
                  </button>
                )}

                {/* 双星对决入口按钮 */}
                {(() => {
                  const duelReferrerId = displayReport.referrer_session_id || getReferrerSessionId();
                  if (!duelReferrerId || duelReferrerId === displayReport.session_id) return null;
                  return (
                    <button
                      type="button"
                      data-testid="report-view-duel-btn"
                      onClick={() => {
                        const duelPath = buildDuelUrl(duelReferrerId, displayReport.session_id);
                        navigateTo(duelPath);
                      }}
                      className="w-full sm:w-auto min-h-[44px] px-6 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:brightness-110 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border-2 border-stone-900 dark:border-rose-400 shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] active:translate-y-1 active:shadow-none"
                    >
                      <Swords className="w-4 h-4 text-white" />
                      <span>{isEn ? "View Twin Duel" : "查看双星对决战报"}</span>
                    </button>
                  );
                })()}

                {/* 生成海报弹窗 */}
                <button
                  type="button"
                  data-testid="generate-poster-btn"
                  onClick={() => setShowPosterModal(true)}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-3.5 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] active:translate-y-1 active:shadow-none"
                >
                  <Sparkles className="w-4 h-4 text-stone-950 dark:text-[#08080C]" />
                  <span>{isEn ? "Generate Poster" : "生成专属海报"}</span>
                </button>

                {/* 优先调起移动端系统原生 Web Share API */}
                <button
                  type="button"
                  data-testid="report-direct-share-btn"
                  onClick={async () => {
                    const text = isEn
                      ? `I unlocked the cognitive archetype [${profile.role_title}]: "${profile.praise_tagline}"! Test your metacognition now:`
                      : `我在 Self-Test 认知测试中解锁了【${profile.role_title}】：“${profile.praise_tagline}”！快来测测你的思维图腾：`;
                    const shareUrl = buildSessionShareUrl(displayReport.session_id);
                    const res = await triggerNativeShare({
                      title: `Self-Test · 认知画像【${profile.role_title}】`,
                      text,
                      url: shareUrl,
                    });
                    if (res.method === "clipboard" && res.success) {
                      setCopiedPermalink(true);
                      setTimeout(() => setCopiedPermalink(false), 2500);
                    }
                  }}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-3.5 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-stone-50 dark:hover:bg-white/10 text-stone-900 dark:text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-1 active:shadow-none"
                >
                  <Share2 className="w-4 h-4 text-stone-950 dark:text-[#CCFF00]" />
                  <span>{isEn ? "System Share" : "系统原生分享"}</span>
                </button>
              </div>
            </div>
          );
        })()}
      </main>

      {/* 统一分享海报弹窗 (多语言自适应分流) */}
      {showPosterModal && (localizedReport || report) && (
        <PosterModal
          isOpen={showPosterModal}
          report={localizedReport || report}
          locale={locale}
          onClose={() => setShowPosterModal(false)}
        />
      )}

      {/* 游戏化开局传送门转场 */}
      <GamifiedTransition
        active={portalStarting}
        variant="portal"
        title={t.gameEffects?.portalStartingTitle || "开启认知试炼"}
        subtitle={t.gameEffects?.portalStartingSubtitle || "正在锚定意识流形 · 构筑认知星阵..."}
      />

      {/* 认知流形算力推演结算转场 */}
      <GamifiedTransition
        active={Boolean(settlementState?.active)}
        variant="settlement"
        title={t.gameEffects?.reportDeductionTitle || "高维认知流形解算"}
        subtitle={t.gameEffects?.reportDeductionSubtitle || "深度推演您的元认知置信矩阵与神级画像..."}
        steps={[
          t.gameEffects?.deductionStep1 || "一阶作答响应与难度梯度聚合",
          t.gameEffects?.deductionStep2 || "二阶置信博弈流形推演 (Meta-d' & M-Ratio)",
          t.gameEffects?.deductionStep3 || "对齐八大认知神级画像与内在特技谱系",
          t.gameEffects?.deductionStep4 || "认知试炼圆满 · 神级画像铸成！",
        ]}
        currentStepIndex={settlementState?.stepIndex ?? 0}
        onSkip={handleSkipSettlement}
      />

      {/* 仅在未进入 App Layout 时展示底部极简脚注 */}
      {!inAppLayout && (
        <footer className="py-4 text-center text-xs text-stone-500 dark:text-slate-400 border-t-2 border-stone-900/10 dark:border-white/10 mt-8 space-y-1.5 font-medium">
          <div>{t.app.footerText}</div>
          <div className="flex items-center justify-center gap-3 text-[11px] text-stone-600 dark:text-slate-400">
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                navigateTo("/privacy");
              }}
              className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors font-bold"
            >
              {t.legal?.privacyPolicy || "隐私政策"}
            </a>
            <span>•</span>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                navigateTo("/terms");
              }}
              className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors font-bold"
            >
              {t.legal?.termsOfService || "服务条款"}
            </a>
            <span>•</span>
            <span className="font-mono font-bold">&copy; {new Date().getFullYear()} Self-Test</span>
          </div>
        </footer>
      )}
    </div>
  );
}

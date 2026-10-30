import React, { useState } from "react";
import {
  Crown,
  Sparkles,
  TrendingUp,
  Share2,
  CheckCircle2,
  Lock,
  LogIn,
  ArrowRight,
  Compass,
} from "lucide-react";
import { GUEST_MOCK_TRAJECTORY_STEPS } from "./guestMockData";
import { getMythicArchetype } from "../share/mythicArchetypes";
import { getArcaneArchetype } from "../share/arcaneArchetypes";
import { useLocale } from "../../contexts/LocaleContext";

interface GuestTrajectoryShowcaseProps {
  onSignIn: () => void;
  onStartTest: () => void;
}

const SHOWCASE_CODES = [
  { code: "Q1-CAL", unlocked: true, count: 2 },
  { code: "Q4-PIO", unlocked: true, count: 1 },
  { code: "Q3-SEN", unlocked: true, count: 1 },
  { code: "Q2-EVO", unlocked: true, count: 3 },
  { code: "Q7-ARB", unlocked: true, count: 2 },
  { code: "Q5-RET", unlocked: false, count: 0 },
  { code: "Q6-GAM", unlocked: false, count: 0 },
  { code: "Q8-DRI", unlocked: false, count: 0 },
];

export const GuestTrajectoryShowcase: React.FC<GuestTrajectoryShowcaseProps> = ({
  onSignIn,
  onStartTest,
}) => {
  const { locale } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  const [activeRunIdx, setActiveRunIdx] = useState<number>(4); // 默认选中第 5 次（最新巅峰态）
  const activeStep =
    GUEST_MOCK_TRAJECTORY_STEPS[activeRunIdx] || GUEST_MOCK_TRAJECTORY_STEPS[4];

  // SVG 坐标系转换: 宽 520, 高 280
  const padL = 48;
  const padR = 28;
  const padT = 24;
  const padB = 38;
  const plotW = 520 - padL - padR;
  const plotH = 280 - padT - padB;

  const toScreenX = (val: number) => padL + (val / 100) * plotW;
  const toScreenY = (val: number) => padT + ((100 - val) / 100) * plotH;

  const polylinePoints = GUEST_MOCK_TRAJECTORY_STEPS.map(
    (s) => `${toScreenX(s.powerX).toFixed(1)},${toScreenY(s.awarenessY).toFixed(1)}`
  ).join(" ");

  return (
    <section
      id="manifold"
      className="py-20 lg:py-28 border-t-2 border-stone-900/10 dark:border-white/15 bg-[#FFFDF8] dark:bg-[#08080C]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
        {/* 顶部标题区 */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black text-xs font-black text-stone-900 dark:text-[#08080C] shadow-[0_2px_0_#1c1917] dark:shadow-none">
            <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400 dark:text-[#08080C] dark:fill-[#08080C]" />
            <span>
              {isEn
                ? "PERSONAL MIND UNIVERSE · PERMANENT RECORD"
                : "点亮你的专属心智宇宙 · 永久留存每一次蜕变"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight uppercase">
            {isEn
              ? "Watch Yourself Evolve & Collect All 8 Archetype Totems"
              : "见证你的每一次思维进阶，集齐八大本命神兽图腾"}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-200 leading-relaxed font-medium">
            {isEn
              ? "Sign in with one click to automatically claim your guest result, track how your decision style evolves over time, and generate high-definition share cards."
              : "一键登录即可自动认领本机刚才的体验成果。每次闯关不仅能点亮新的神兽化身，还能在专属星轨图上看见自己从「凭感觉冲锋」到「算无遗策」的真实成长轨迹。"}
          </p>
        </div>

        {/* 双栏实景互动预览舱 (基于 Mock 数据，零系统路由黑话) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
          {/* 左栏 (7 Cols): 跨场次心智进化轨迹互动预览 */}
          <div className="lg:col-span-7 rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#0E0E16] border-[2.5px] dark:border-2 border-stone-900 dark:border-white/20 shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] flex flex-col justify-between space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-[#CCFF00]" />
                  <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                    {isEn
                      ? "Mind Evolution Trajectory (Interactive Demo)"
                      : "心智成长跃迁轨迹（点击节点查看蜕变历程）"}
                  </h3>
                </div>
                <p className="text-xs text-stone-500 dark:text-slate-300 font-medium mt-0.5">
                  {isEn
                    ? "Demo: Explorer Aether's 5-run journey from impulsive rookie to Grand Archmage"
                    : "演示样本：探索者「苍穹」从第 1 次莽撞试探到第 5 次知行合一的真实进阶路线"}
                </p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 dark:bg-[#CCFF00]/20 border border-emerald-400/30 dark:border-[#CCFF00] text-emerald-800 dark:text-[#CCFF00] font-black self-start sm:self-center shrink-0">
                {isEn ? "5 Runs Tracked" : "已记录 5 次蜕变"}
              </span>
            </div>

            {/* SVG 轨迹互动图 */}
            <div className="relative w-full aspect-[520/280] select-none bg-[#FAF7F0] dark:bg-[#08080C] rounded-2xl border-2 border-stone-900/15 dark:border-white/20 p-2 overflow-hidden">
              <svg viewBox="0 0 520 280" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="traj-line-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="35%" stopColor="#06b6d4" />
                    <stop offset="70%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <radialGradient id="traj-top-right-glow" cx="85%" cy="15%" r="55%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* 右上角高手领地光晕 */}
                <rect
                  x={padL}
                  y={padT}
                  width={plotW}
                  height={plotH}
                  fill="url(#traj-top-right-glow)"
                  rx="10"
                />

                {/* 网格参考线 */}
                {[25, 50, 75].map((pct) => (
                  <g key={`grid-${pct}`}>
                    <line
                      x1={toScreenX(pct)}
                      y1={padT}
                      x2={toScreenX(pct)}
                      y2={padT + plotH}
                      stroke="rgba(0,0,0,0.08)"
                      className="dark:stroke-white/10"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={padL}
                      y1={toScreenY(pct)}
                      x2={padL + plotW}
                      y2={toScreenY(pct)}
                      stroke="rgba(0,0,0,0.08)"
                      className="dark:stroke-white/10"
                      strokeDasharray="3 3"
                    />
                  </g>
                ))}

                {/* 十字黄金分界线 (50%, 50%) */}
                <line
                  x1={toScreenX(58)}
                  y1={padT}
                  x2={toScreenX(58)}
                  y2={padT + plotH}
                  stroke="rgba(99, 102, 241, 0.45)"
                  strokeWidth="1.2"
                  strokeDasharray="5 5"
                />
                <line
                  x1={padL}
                  y1={toScreenY(60)}
                  x2={padL + plotW}
                  y2={toScreenY(60)}
                  stroke="rgba(99, 102, 241, 0.45)"
                  strokeWidth="1.2"
                  strokeDasharray="5 5"
                />

                {/* 四个通俗象限水印提示 */}
                <text
                  x={padL + plotW - 10}
                  y={padT + 18}
                  textAnchor="end"
                  fill="#059669"
                  className="dark:fill-[#CCFF00]"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {isEn ? "Sovereign Zone · High Power & Lucid" : "高手自洽区 · 又强又清醒"}
                </text>
                <text
                  x={padL + 10}
                  y={padT + 18}
                  textAnchor="start"
                  fill="#0284C7"
                  className="dark:fill-[#38BDF8]"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {isEn ? "Awakening Zone · Lucid & Evolving" : "顿悟蓄势区 · 极具自知之明"}
                </text>
                <text
                  x={padL + 10}
                  y={padT + plotH - 10}
                  textAnchor="start"
                  fill="#E11D48"
                  className="dark:fill-[#FF3366]"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {isEn ? "Rookie Charge · Pure Instinct" : "热血试探区 · 凭直觉闯关"}
                </text>

                {/* 演化轨迹发光连线 */}
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="url(#traj-line-grad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 5 个历史场次节点 */}
                {GUEST_MOCK_TRAJECTORY_STEPS.map((step, idx) => {
                  const cx = toScreenX(step.powerX);
                  const cy = toScreenY(step.awarenessY);
                  const isActive = idx === activeRunIdx;

                  return (
                    <g
                      key={step.runIndex}
                      className="cursor-pointer"
                      onClick={() => setActiveRunIdx(idx)}
                      onMouseEnter={() => setActiveRunIdx(idx)}
                    >
                      <circle cx={cx} cy={cy} r={18} fill="transparent" />

                      {isActive && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={14}
                          fill="none"
                          stroke={step.color}
                          strokeWidth="2"
                          opacity="0.7"
                        />
                      )}

                      <circle
                        cx={cx}
                        cy={cy}
                        r={isActive ? 8.5 : 6.5}
                        fill={step.color}
                        stroke="#ffffff"
                        strokeWidth={isActive ? 2.2 : 1.4}
                      />

                      <text
                        x={cx}
                        y={cy - 13}
                        textAnchor="middle"
                        fill={isActive ? "#ffffff" : "#cbd5e1"}
                        fontSize={isActive ? "11" : "9.5"}
                        fontWeight="bold"
                      >
                        #{step.runIndex} {isEn ? step.roleTitleEn.replace("The ", "") : step.roleTitleZh}
                      </text>
                    </g>
                  );
                })}

                {/* 横纵坐标通俗文字标题 */}
                <text
                  x={padL + plotW / 2}
                  y={272}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {isEn ? "Deductive Prowess (Hard Puzzle Solving) →" : "解题破局硬实力（越往右越强） →"}
                </text>
                <text
                  x={16}
                  y={padT + plotH / 2}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="bold"
                  transform={`rotate(-90, 16, ${padT + plotH / 2})`}
                >
                  {isEn ? "Self-Awareness Clarity →" : "清醒自知力（越往上越懂自己） →"}
                </text>
              </svg>
            </div>

            {/* 当前选中节点的详情解说条 */}
            <div className="p-4 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900/15 dark:border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-black text-stone-950 dark:text-[#08080C] border border-stone-900 dark:border-black"
                    style={{ backgroundColor: activeStep.color }}
                  >
                    {isEn ? activeStep.dateLabelEn : activeStep.dateLabelZh}
                  </span>
                  <span className="text-sm font-black text-stone-900 dark:text-white">
                    {isEn
                      ? `${activeStep.roleTitleEn}`
                      : `${activeStep.roleTitleZh} · ${activeStep.totemZh}`}
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-slate-200 font-medium">
                  {isEn ? activeStep.insightEn : activeStep.insightZh}
                </p>
              </div>

              {/* 5 个场次快捷切换按钮 */}
              <div className="flex items-center gap-1.5 shrink-0">
                {GUEST_MOCK_TRAJECTORY_STEPS.map((step, idx) => (
                  <button
                    key={step.runIndex}
                    type="button"
                    onClick={() => setActiveRunIdx(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                      idx === activeRunIdx
                        ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-[#CCFF00] shadow-[0_1.5px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF]"
                        : "bg-white dark:bg-[#0E0E16] text-stone-700 dark:text-slate-300 border-stone-300 dark:border-white/20 hover:text-stone-950 dark:hover:text-white"
                    }`}
                  >
                    #{step.runIndex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右栏 (5 Cols): 八大化身收集图鉴 + 专属泥金分享名片实景预览 */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            {/* 上半卡：八大化身收集进度图鉴 */}
            <div className="rounded-3xl p-6 bg-white dark:bg-[#0E0E16] border-[2.5px] dark:border-2 border-stone-900 dark:border-[#38BDF8] shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#38BDF8] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 dark:text-[#38BDF8] dark:fill-[#38BDF8]" />
                  <h3 className="text-base font-black text-stone-900 dark:text-white">
                    {isEn ? "8-Totem Collection Codex" : "八大心智化身 · 收集图鉴"}
                  </h3>
                </div>
                <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-[#38BDF8]/20 border border-stone-900 dark:border-[#38BDF8] text-stone-900 dark:text-[#38BDF8]">
                  {isEn ? "Demo: 5 / 8 Unlocked" : "演示进度：已点亮 5 / 8"}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {SHOWCASE_CODES.map((item) => {
                  const mythic = getMythicArchetype(item.code);
                  const arcane = getArcaneArchetype(item.code);
                  return (
                    <div
                      key={item.code}
                      className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                        item.unlocked
                          ? "bg-[#FFFBEB] dark:bg-[#12121C] border-stone-900 dark:border-[#38BDF8] shadow-sm dark:shadow-[2px_2px_0px_#38BDF8]"
                          : "bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/10 opacity-70"
                      }`}
                    >
                      <div className="text-lg">
                        {item.unlocked ? (
                          <span style={{ color: mythic.colorScheme.secondaryGold }}>
                            {isEn ? arcane.crestSymbol : mythic.baguaSymbol}
                          </span>
                        ) : (
                          <Lock className="w-4 h-4 text-stone-400 dark:text-slate-400 mx-auto" />
                        )}
                      </div>
                      <div className="text-[11px] font-black text-stone-900 dark:text-white truncate w-full">
                        {isEn
                          ? arcane.roleTitle.replace("The ", "")
                          : mythic.roleTitle}
                      </div>
                      <div className="text-[9px] text-amber-700 dark:text-[#38BDF8] font-bold flex items-center gap-0.5">
                        {item.unlocked ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-[#38BDF8]" />
                            <span>{isEn ? "Lit" : "已点亮"}</span>
                          </>
                        ) : (
                          <span className="text-stone-400 dark:text-slate-400">
                            {isEn ? "Locked" : "待唤醒"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 下半卡：多巴胺解压分享名片与一键登录 CTA */}
            <div className="flex-1 rounded-[28px] p-6 bg-white dark:bg-[#0E0E16] border-[2.5px] dark:border-2 border-stone-900 dark:border-white/20 shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] flex flex-col justify-between space-y-5 relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <div className="flex items-center gap-2 text-xs font-black text-stone-900 dark:text-[#CCFF00]">
                  <Share2 className="w-4 h-4 text-stone-900 dark:text-[#CCFF00]" />
                  <span>
                    {isEn
                      ? "Exclusive High-Fantasy Share Cards"
                      : "生成专属多巴胺解压分享名片"}
                  </span>
                </div>
                <h4 className="text-lg font-black text-stone-900 dark:text-white">
                  {isEn
                    ? "Auto-Claim Guest Record & Unlock Unlimited Tests"
                    : "本机游客记录自动认领，解锁无限次挑战"}
                </h4>
                <p className="text-xs text-stone-600 dark:text-slate-200 leading-relaxed font-medium">
                  {isEn
                    ? "Your guest assessment on this device is automatically bound to your account upon sign-in. Export HD posters to share your innate skills with friends."
                    : "无需繁琐注册，使用常用账号一键登录，本机已完成的游客画像将自动归入你的名下，并可随时导出高清多巴胺名片与好友比拼。"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 relative z-10">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {isEn ? "Sign In · Open My Mind Universe" : "立即登录 · 开启我的心智宇宙"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onStartTest}
                  className="py-3.5 px-4 rounded-2xl bg-white hover:bg-amber-50 dark:bg-[#12121C] dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-stone-900 dark:text-white font-bold text-xs sm:text-sm shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Compass className="w-4 h-4 text-stone-900 dark:text-[#CCFF00]" />
                  <span>{isEn ? "Try Now" : "先测一次"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

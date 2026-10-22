import React, { useState, useEffect } from "react";
import {
  Compass,
  Sparkles,
  ArrowRight,
  Zap,
  Layers,
  Target,
  Bookmark,
  Lock,
  LogIn,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";
import { useUser } from "../contexts/UserContext";
import { LanguageToggle } from "../components/LanguageToggle";
import { AuthModal } from "../components/auth/AuthModal";
import { getLastCompletedSession, canGuestStartNewSession } from "../utils/sessionRoute";
import { GuestGalaxyHero } from "../components/landing/GuestGalaxyHero";
import { ArchetypeStickyScrollBand } from "../components/landing/ArchetypeStickyScrollBand";
import { GuestTrajectoryShowcase } from "../components/landing/GuestTrajectoryShowcase";

interface GuestLandingPageProps {
  onNavigate: (path: string) => void;
}

export const GuestLandingPage: React.FC<GuestLandingPageProps> = ({ onNavigate }) => {
  const { locale, t } = useLocale();
  const { login, openAuthModal, closeAuthModal, isAuthModalOpen } = useUser();
  const isEn = String(locale).toLowerCase().startsWith("en");

  const [unclaimedRecord, setUnclaimedRecord] = useState<{
    sessionId: string;
    timestamp: number;
  } | null>(() => getLastCompletedSession());

  // 供首屏星系点击某个化身时联动滚入第 3 屏画卷
  const [selectedCodeFromHero, setSelectedCodeFromHero] = useState<string | null>(null);

  // 第 2 屏（3 步直觉体验）微互动演示状态
  const [demoWagerMode, setDemoWagerMode] = useState<"BOLD" | "SAFE">("BOLD");
  const [demoHintRevealed, setDemoHintRevealed] = useState<boolean>(false);

  useEffect(() => {
    setUnclaimedRecord(getLastCompletedSession());
  }, []);

  const canStartGuestTest = canGuestStartNewSession(false, unclaimedRecord?.sessionId);

  const handleGuestAction = () => {
    if (!canStartGuestTest && unclaimedRecord?.sessionId) {
      onNavigate(`/report/${unclaimedRecord.sessionId}`);
      return;
    }
    onNavigate("/test");
  };

  const handleSelectArchetypeFromHero = (code: string) => {
    setSelectedCodeFromHero(code);
    const el = document.getElementById("archetypes");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#06080f] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200 overflow-x-clip">
      {/* Ambient Cosmic Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-48 left-1/4 w-[620px] h-[620px] bg-indigo-600/12 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 -right-32 w-[520px] h-[520px] bg-amber-500/10 rounded-full blur-[130px]" />
        <div className="absolute -bottom-48 left-1/3 w-[560px] h-[560px] bg-purple-600/10 rounded-full blur-[130px]" />
      </div>

      {/* Floating Official Website Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#06080f]/80 border-b border-white/[0.08] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("/");
            }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-500 to-purple-500 p-[1px] shadow-lg shadow-amber-500/15">
              <div className="w-full h-full rounded-[11px] bg-[#080b14] flex items-center justify-center">
                <Compass className="w-5 h-5 text-amber-300 group-hover:rotate-45 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>Self-Test · {isEn ? "Mind Star Map" : "思维星图"}</span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                {isEn
                  ? "Discover How Sharp You Are & How Well You Know Yourself"
                  : "照见你的真实推理实力与内心自知边界"}
              </div>
            </div>
          </a>

          {/* Desktop Anchor Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#how-it-works" className="hover:text-amber-300 transition-colors">
              {isEn ? "How It Works" : "三步看懂玩法"}
            </a>
            <a href="#archetypes" className="hover:text-amber-300 transition-colors">
              {isEn ? "8 Mind Archetypes" : "八大心智化身画卷"}
            </a>
            <a href="#manifold" className="hover:text-amber-300 transition-colors">
              {isEn ? "Mind Growth Map" : "专属心智星轨"}
            </a>
          </nav>

          {/* Right Action Controls: 顶部常驻登录按钮 */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <LanguageToggle />

            <button
              type="button"
              onClick={handleGuestAction}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
            >
              <span>
                {!canStartGuestTest
                  ? isEn
                    ? "View Unclaimed Result"
                    : "查看待认领画像"
                  : isEn
                  ? "Free Trial"
                  : "免登录试玩"}
              </span>
            </button>

            <button
              type="button"
              onClick={openAuthModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:brightness-110 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.auth?.signIn || (isEn ? "Sign In" : "探索者登录")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Official Website Content */}
      <main className="relative z-10 flex-1">
        {/* ================================================================= */}
        {/* 第 1 屏：HERO 首屏 (星盘作为全景动态背景全屏铺满，左侧毛玻璃舱体保障文字极高可读性) */}
        {/* ================================================================= */}
        <section className="relative min-h-[calc(100vh-65px)] flex items-center overflow-hidden bg-[#06080f]">
          {/* 1. 星盘全景动态背景：全屏铺满视口，消除任何区域截断与底色不一致 */}
          <div className="absolute inset-0 w-full h-full pointer-events-auto z-0 overflow-hidden flex items-center justify-center">
            <div className="w-full h-full">
              <GuestGalaxyHero onSelectArchetype={handleSelectArchetypeFromHero} />
            </div>
          </div>

          <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-8 py-12 lg:py-16 pointer-events-none">
            {/* Unclaimed Guest Session Alert Banner */}
            {!canStartGuestTest && unclaimedRecord && (
              <div className="pointer-events-auto max-w-2xl mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900/95 to-indigo-500/20 border border-amber-400/40 shadow-2xl shadow-amber-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/25 border border-amber-400/50 flex items-center justify-center shrink-0">
                    <Bookmark className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-sm font-bold text-amber-200 flex items-center gap-2">
                      <span>
                        {isEn
                          ? "You Have an Unclaimed Mind Archetype on This Device"
                          : "检测到本机有一份待认领的专属心智画像"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isEn
                        ? "Sign in to save this archetype to your codex and unlock unlimited tests!"
                        : "立即登录即可将此画像自动归入您的个人资产图鉴！"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/report/${unclaimedRecord.sessionId}`)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition-all cursor-pointer"
                  >
                    {isEn ? "View Result" : "查看报告"}
                  </button>
                  <button
                    type="button"
                    onClick={openAuthModal}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/25 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>{isEn ? "Sign In" : "登录认领"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 左侧文字区域：Apple iOS 18 原生质感超轻薄高透磨砂毛玻璃卡片 (能清晰透过玻璃看到背后的星轨与星球流动) */}
            <div
              className="relative pointer-events-auto max-w-xl lg:max-w-2xl rounded-[32px] border border-white/20 p-7 sm:p-10 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.65),inset_0_1px_1px_0_rgba(255,255,255,0.30)] space-y-6 text-left overflow-hidden z-10 transition-all duration-300"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.12)",
                backdropFilter: "blur(10px) saturate(160%)",
                WebkitBackdropFilter: "blur(10px) saturate(160%)",
              }}
            >
              {/* 表面对角物理光泽微反光 (Surface Specular Sheen) */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />

              {/* 顶部微标：半透明药丸胶囊 */}
              <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.16] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] text-xs font-bold text-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isEn
                    ? "No Subjective Questionnaires · 5-Min Intuitive Mind Game"
                    : "告别主观套路问卷 · 5 分钟直觉闯关照见真实自我"}
                </span>
              </div>

              {/* 主标题：超高清文字阴影确保半透玻璃下的顶级可读性 */}
              <h1 className="relative z-10 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.18] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                {isEn ? (
                  <>
                    How Sharp Are You, and{" "}
                    <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-indigo-300">
                      How Well Do You Know Yourself?
                    </span>
                  </>
                ) : (
                  <>
                    你有多聪明，
                    <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-indigo-300">
                      又有多了解自己？
                    </span>
                  </>
                )}
              </h1>

              {/* 副文本描述 */}
              <p className="relative z-10 text-sm sm:text-base text-slate-100 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
                {isEn
                  ? "True mastery isn't just solving hard puzzles—it's knowing exactly when you're right, when you're guessing, and when to ask for a clue. Through a dynamic visual game, we map your mind across 4 intuitive dimensions and awaken your innate Mythic or Arcane Persona."
                  : "真正的高手不仅能看穿复杂迷局，更清楚自己何时胜券在握、何时身处盲区。在这里，没有容易伪装的性格套路题——通过一场难度随你实力呼吸的直觉闯关，看清你的「解题硬实力」与「清醒自知力」，唤醒潜藏在你思维深处的东方神兽与奥术化身。"}
              </p>

              {/* 行动按钮区：彻底移除重复登录按钮（右上角常驻），仅保留核心免登录开测 CTA */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start gap-4 pt-1">
                {canStartGuestTest ? (
                  <button
                    type="button"
                    onClick={() => onNavigate("/test")}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:brightness-110 text-white font-extrabold text-sm sm:text-base shadow-[0_16px_36px_-8px_rgba(245,158,11,0.45)] border border-white/20 flex items-center justify-center gap-2.5 transform hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 text-amber-200" />
                    <span>
                      {isEn
                        ? "Start 5-Min Mind Challenge (Free)"
                        : "立即开启 5 分钟直觉闯关（免登录体验）"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      unclaimedRecord?.sessionId
                        ? onNavigate(`/report/${unclaimedRecord.sessionId}`)
                        : openAuthModal()
                    }
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:brightness-110 text-white font-extrabold text-sm sm:text-base shadow-[0_16px_36px_-8px_rgba(245,158,11,0.45)] border border-white/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-amber-200" />
                    <span>
                      {isEn
                        ? "View Unclaimed Result"
                        : "查看待认领画像"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 底部三大亮点微标 */}
              <div className="relative z-10 pt-4 grid grid-cols-3 gap-4 border-t border-white/[0.14] text-left">
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-amber-300 drop-shadow-sm">
                    {isEn ? "5 Mins" : "5 分钟沉浸"}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                    {isEn ? "Dynamic Puzzles" : "难度随实力呼吸"}
                  </div>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-indigo-300 drop-shadow-sm">
                    {isEn ? "4 Dimensions" : "四大直觉维度"}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                    {isEn ? "Power & Clarity" : "硬实力 · 自知 · 果敢 · 借力"}
                  </div>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-purple-300 drop-shadow-sm">
                    {isEn ? "8 Totems" : "八大本命化身"}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                    {isEn ? "Collectible Cards" : "神兽图鉴与泥金名片"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 第 2 屏：三步看懂玩法 (带可点击微交互演示，零生涩术语)            */}
        {/* ================================================================= */}
        <section
          id="how-it-works"
          className="py-16 lg:py-24 border-t border-white/[0.06] bg-white/[0.01]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-400">
                {isEn ? "HOW IT WORKS · 3 SIMPLE STEPS" : "HOW IT WORKS · 三步看懂核心玩法"}
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {isEn
                  ? "Why Can It See Through Your True Decision Style?"
                  : "不问一道性格套路题，它如何看穿你的真实本色？"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isEn
                  ? "Anyone can claim to be 'calm and decisive' on a questionnaire. We put you in a real-time intuitive game where every choice naturally reveals your true mind."
                  : "在传统问卷里，谁都可以轻易勾选「我冷静果断」。而在这里，我们用一场充满博弈乐趣的三步闯关，让你在最自然的直觉反应中照见真实的自己。"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1: 眼力与脑力极限挑战 */}
              <div className="p-7 rounded-3xl bg-gradient-to-b from-white/[0.045] to-white/[0.01] border border-white/10 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                      <Target className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-300">
                      {isEn ? "Step 01 · Real Prowess" : "第 1 步 · 测解题硬实力"}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    {isEn
                      ? "Smart Difficulty That Breathes With You"
                      : "遇强则强的动态图形与规律闯关"}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {isEn
                      ? "Solve visual pattern, density, and sequence puzzles. Answer right and the challenge levels up; slip up and it eases back—finding your exact ceiling."
                      : "告别死板题库！你将面对图形旋转、星点疏密与规律推演挑战。答对自动升级难度，答错智能回落，精准摸清你的脑力天花板。"}
                  </p>
                </div>

                {/* 微视觉示意：动态难度阶梯条 */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{isEn ? "Auto-Matching Your Limit" : "实时自适应难度追踪"}</span>
                    <span className="text-cyan-300 font-bold">
                      {isEn ? "Level Up ↑" : "遇强则强 ↑"}
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5 h-10 pt-1">
                    {[35, 50, 68, 55, 74, 88, 80, 95].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-cyan-600/40 to-cyan-300 transition-all"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: 直觉底气押注（带可点击交互体验） */}
              <div className="p-7 rounded-3xl bg-gradient-to-b from-white/[0.045] to-white/[0.01] border border-white/10 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                      <Zap className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-300">
                      {isEn ? "Step 02 · Self-Awareness" : "第 2 步 · 测清醒自知力"}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    {isEn
                      ? "How Sure Are You? Bet on Your Intuition"
                      : "这题有几分把握？全额强攻还是稳健防守"}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {isEn
                      ? "After each answer, choose whether to go All-In or Play Safe. Do you strike hard when right and hold back when unsure, or charge blindly?"
                      : "每选完一题，系统不会立刻剧透对错，而是让你为刚才的决定押注：胜券在握时敢不敢「全额强攻」？拿不准时懂不懂「稳健防守」？"}
                  </p>
                </div>

                {/* 可点击微交互演示：点击体验强攻 vs 稳守 */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{isEn ? "Click to try wagering:" : "点击下方按钮体验抉择："}</span>
                    <span className="text-amber-300 font-bold">
                      {demoWagerMode === "BOLD"
                        ? isEn
                          ? "High Reward / High Risk"
                          : "十拿九稳 · 乘胜追击"
                        : isEn
                        ? "Protected Floor"
                        : "心存疑虑 · 稳守底线"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDemoWagerMode("BOLD")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        demoWagerMode === "BOLD"
                          ? "bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isEn ? "All-In Attack" : "全额强攻"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoWagerMode("SAFE")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        demoWagerMode === "SAFE"
                          ? "bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isEn ? "Safe Guard" : "稳健防守"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: 锦囊线索借力（带可点击交互体验） */}
              <div className="p-7 rounded-3xl bg-gradient-to-b from-white/[0.045] to-white/[0.01] border border-white/10 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300">
                      <Layers className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/25 text-purple-300">
                      {isEn ? "Step 03 · Clue Leverage" : "第 3 步 · 测借力破局智慧"}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    {isEn
                      ? "Stuck in a Fog? Unlock a Strategic Clue"
                      : "遇到盲区死磕到底，还是巧借锦囊一击制胜？"}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {isEn
                      ? "When facing a tough puzzle, you can spend a tiny bit of energy to unlock a clue. Knowing when to borrow external wisdom separates stubbornness from true strategy."
                      : "面对棘手迷局，硬撑蛮干往往满盘皆输。你可以随时消耗微弱能量翻开「线索锦囊」排除干扰——懂得在关键时刻借力打力，才是真正的智者。"}
                  </p>
                </div>

                {/* 可点击微交互演示：解锁锦囊 */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {isEn ? "Interactive Clue Demo:" : "点击体验锦囊妙计："}
                    </span>
                    <span className="text-purple-300 font-bold">
                      {demoHintRevealed
                        ? isEn
                          ? "2 Wrong Options Eliminated!"
                          : "已精准排除 2 个干扰项！"
                        : isEn
                        ? "4 Options in Mist"
                        : "迷雾重重 · 待破局"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDemoHintRevealed((prev) => !prev)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      demoHintRevealed
                        ? "bg-purple-500/25 border-purple-400 text-purple-200"
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-200"
                    }`}
                  >
                    {demoHintRevealed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {isEn
                            ? "Clue Active: Target Locked (Click to Reset)"
                            : "锦囊已生效：胜率飙升（点击重置）"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                        <span>
                          {isEn
                            ? "Unlock Strategic Clue Card"
                            : "翻开「草船借箭」线索锦囊"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 第 3 屏：八大心智化身全景画卷 (纵向滚动自动转横向漫游，到底后继续向下) */}
        {/* ================================================================= */}
        <ArchetypeStickyScrollBand
          selectedCodeFromHero={selectedCodeFromHero}
          onStartTest={handleGuestAction}
        />

        {/* ================================================================= */}
        {/* 第 4 屏：点亮个人心智宇宙 (Mock 进化轨迹 + 8 化身收集图鉴，零路由术语) */}
        {/* ================================================================= */}
        <GuestTrajectoryShowcase
          onSignIn={openAuthModal}
          onStartTest={handleGuestAction}
        />
      </main>

      {/* Footer (Links to standalone /privacy and /terms outside Layout) */}
      <footer className="relative z-10 border-t border-white/[0.08] py-8 px-4 sm:px-8 text-center text-xs text-slate-500 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 font-semibold">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Self-Test · {isEn ? "Mind Star Map" : "思维星图"}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-slate-400">
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/privacy");
              }}
              className="hover:text-amber-300 transition-colors"
            >
              {t.legal?.privacyPolicy || (isEn ? "Privacy Policy" : "隐私政策")}
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/terms");
              }}
              className="hover:text-amber-300 transition-colors"
            >
              {t.legal?.termsOfService || (isEn ? "Terms of Service" : "服务条款")}
            </a>
            <button
              type="button"
              onClick={openAuthModal}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              {t.auth?.signIn || (isEn ? "Explorer Sign In" : "探索者登录")}
            </button>
          </div>

          <div className="font-mono text-[11px] text-slate-600">
            &copy; {new Date().getFullYear()} Self-Test. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Auth Modal for Sign-In from Official Website */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onSelectProvider={(provider) => login(provider)}
      />
    </div>
  );
};

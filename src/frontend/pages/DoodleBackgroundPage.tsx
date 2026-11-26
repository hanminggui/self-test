import React, { useState, useMemo, useCallback } from "react";
import {
  Sliders,
  Copy,
  Check,
  Download,
  Sun,
  Moon,
  Layers,
  ArrowLeft,
  Palette,
  Eye,
  FileCode,
  Send,
  CheckCheck,
  Smile,
  Paperclip,
} from "lucide-react";

interface BgTheme {
  name: string;
  isDark: boolean;
  bgGradStart: string;
  bgGradEnd: string;
  doodleColor: string;
  defaultOpacity: number;
}

const BG_THEMES: BgTheme[] = [
  {
    name: "TG 经典暗蓝 (Telegram Dark)",
    isDark: true,
    bgGradStart: "#0e1621",
    bgGradEnd: "#17212b",
    doodleColor: "#ffffff",
    defaultOpacity: 0.12,
  },
  {
    name: "深空曜石 (Obsidian Space)",
    isDark: true,
    bgGradStart: "#090d16",
    bgGradEnd: "#1e293b",
    doodleColor: "#38bdf8",
    defaultOpacity: 0.14,
  },
  {
    name: "TG 官方经典亮青 (Classic Light)",
    isDark: false,
    bgGradStart: "#89a9c0",
    bgGradEnd: "#b8cad8",
    doodleColor: "#ffffff",
    defaultOpacity: 0.22,
  },
  {
    name: "暖杏柔色 (Warm Apricot)",
    isDark: false,
    bgGradStart: "#fbf6ee",
    bgGradEnd: "#eaddcf",
    doodleColor: "#473b2b",
    defaultOpacity: 0.15,
  },
  {
    name: "幽夜霓虹 (Cyber Violet)",
    isDark: true,
    bgGradStart: "#1a0b2e",
    bgGradEnd: "#0d021f",
    doodleColor: "#c084fc",
    defaultOpacity: 0.16,
  },
];

interface DoodleBackgroundPageProps {
  onNavigate?: (path: string) => void;
}

export const DoodleBackgroundPage: React.FC<DoodleBackgroundPageProps> = ({ onNavigate }) => {
  // Theme & Color parameters
  const [currentTheme, setCurrentTheme] = useState<BgTheme>(BG_THEMES[0]);
  const [patternSize, setPatternSize] = useState<number>(360);
  const [opacity, setOpacity] = useState<number>(0.12);
  const [strokeWidth, setStrokeWidth] = useState<number>(1.8);
  const [doodleColor, setDoodleColor] = useState<string>("#ffffff");
  const [customBgStart, setCustomBgStart] = useState<string>("#0e1621");
  const [customBgEnd, setCustomBgEnd] = useState<string>("#17212b");

  // UI state
  const [showDemoUI, setShowDemoUI] = useState<boolean>(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<"svg" | "css" | null>(null);

  // Generate SVG string
  const svgString = useMemo(() => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <linearGradient id="tg-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${customBgStart}"/>
      <stop offset="100%" stop-color="${customBgEnd}"/>
    </linearGradient>

    <!-- 12 组高频 TG 风格极简线框图元 (24x24) -->
    <g id="plane" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
    </g>
    <g id="star" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2l2.4 7.2h7.6l-6.2 4.5 2.4 7.3-6.2-4.5-6.2 4.5 2.4-7.3-6.2-4.5h7.6z"/>
    </g>
    <g id="ghost" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 19V10a8 8 0 1 1 16 0v9l-3-2-3 2-2-2-2 2-3-2-3 2zM9 10h.01M15 10h.01"/>
    </g>
    <g id="gamepad" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/>
    </g>
    <g id="coffee" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
    </g>
    <g id="rocket" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    </g>
    <g id="chat" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5h.5a8.5 8.5 0 0 1 8 8.5z"/>
    </g>
    <g id="planet" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="6"/><path d="M3 15c4.5 2.5 13.5 2.5 18-6"/>
    </g>
    <g id="heart" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>
    </g>
    <g id="sparkle" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5"/>
    </g>
    <g id="cat" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 8l3-4 3 2.5 3-2.5 3 4v7a6 6 0 0 1-12 0V8zM7 13h.01M13 13h.01"/>
    </g>
    <g id="diamond" stroke="currentColor" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 3h12l4 6-10 12L2 9l4-6zM2 9h20M12 21L8 9l4-6 4 6-4 12z"/>
    </g>

    <pattern id="tg-pattern" width="${patternSize}" height="${patternSize}" patternUnits="userSpaceOnUse" opacity="${opacity}" color="${doodleColor}">
      <use href="#plane" x="30" y="30" transform="rotate(15 42 42) scale(1.3)"/>
      <use href="#star" x="130" y="25" transform="rotate(-10 142 37) scale(1.1)"/>
      <use href="#coffee" x="220" y="40" transform="rotate(8 232 52) scale(1.2)"/>
      <use href="#planet" x="310" y="30" transform="rotate(-15 322 42) scale(1.3)"/>

      <use href="#gamepad" x="70" y="110" transform="rotate(-8 82 122) scale(1.2)"/>
      <use href="#ghost" x="180" y="105" transform="rotate(12 192 117) scale(1.2)"/>
      <use href="#cat" x="270" y="115" transform="rotate(-5 282 127) scale(1.2)"/>

      <use href="#rocket" x="25" y="195" transform="rotate(35 37 207) scale(1.3)"/>
      <use href="#chat" x="120" y="200" transform="rotate(-12 132 212) scale(1.2)"/>
      <use href="#diamond" x="220" y="190" transform="rotate(20 232 202) scale(1.1)"/>
      <use href="#heart" x="315" y="195" transform="rotate(-8 327 207) scale(1.1)"/>

      <use href="#sparkle" x="75" y="280" transform="rotate(15 87 292) scale(0.9)"/>
      <use href="#cat" x="175" y="275" transform="rotate(25 187 287) scale(1.2)"/>
      <use href="#plane" x="265" y="285" transform="rotate(-25 277 297) scale(1.1)"/>

      <circle cx="85" cy="55" r="2" fill="currentColor"/>
      <circle cx="175" cy="60" r="1.5" fill="currentColor"/>
      <circle cx="280" cy="55" r="2" fill="currentColor"/>
      <circle cx="35" cy="140" r="2" fill="currentColor"/>
      <circle cx="130" cy="145" r="1.5" fill="currentColor"/>
      <circle cx="240" cy="150" r="2" fill="currentColor"/>
      <circle cx="335" cy="130" r="1.5" fill="currentColor"/>
      <circle cx="80" cy="225" r="2" fill="currentColor"/>
      <circle cx="180" cy="235" r="1.5" fill="currentColor"/>
      <circle cx="275" cy="235" r="2" fill="currentColor"/>
      <circle cx="35" cy="315" r="2" fill="currentColor"/>
      <circle cx="135" cy="325" r="1.5" fill="currentColor"/>
      <circle cx="230" cy="335" r="2" fill="currentColor"/>
      <circle cx="325" cy="310" r="1.5" fill="currentColor"/>
    </pattern>
  </defs>

  <rect width="100%" height="100%" fill="url(#tg-bg)"/>
  <rect width="100%" height="100%" fill="url(#tg-pattern)"/>
</svg>`;
  }, [customBgStart, customBgEnd, strokeWidth, patternSize, opacity, doodleColor]);

  const applyTheme = (t: BgTheme) => {
    setCurrentTheme(t);
    setCustomBgStart(t.bgGradStart);
    setCustomBgEnd(t.bgGradEnd);
    setDoodleColor(t.doodleColor);
    setOpacity(t.defaultOpacity);
  };

  const handleCopySvg = async () => {
    await navigator.clipboard.writeText(svgString);
    setCopiedType("svg");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyCss = async () => {
    const encoded = encodeURIComponent(svgString);
    const css = `background-image: url("data:image/svg+xml,${encoded}");\nbackground-size: ${patternSize}px ${patternSize}px;\nbackground-repeat: repeat;`;
    await navigator.clipboard.writeText(css);
    setCopiedType("css");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `telegram-doodle-pattern-${patternSize}px.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const svgDataUrl = useMemo(() => {
    return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
  }, [svgString]);

  const isDark = currentTheme.isDark;
  const panelBg = isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.88)";
  const panelBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)";
  const panelText = isDark ? "#f8fafc" : "#0f172a";

  return (
    <div
      className="relative min-h-screen w-full select-none font-sans overflow-x-hidden"
      style={{
        backgroundImage: `url("${svgDataUrl}")`,
        backgroundSize: "cover",
      }}
    >
      {/* ================= REALISTIC TELEGRAM CHAT MOCK UI ================= */}
      {showDemoUI && (
        <div className="relative z-10 min-h-screen flex flex-col justify-between p-4 sm:p-8 pointer-events-auto">
          {/* Top Bar */}
          <header
            className="flex items-center justify-between max-w-2xl w-full mx-auto backdrop-blur-xl px-5 py-3.5 rounded-2xl border shadow-xl transition-all"
            style={{ backgroundColor: panelBg, borderColor: panelBorder, color: panelText }}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (onNavigate ? onNavigate("/") : (window.location.href = "/"))}
                className="p-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
                style={{ borderColor: panelBorder }}
                title="返回主页"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                TG
              </div>
              <div>
                <div className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  Telegram 贴纸壁纸效果
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                </div>
                <div className="text-[11px] opacity-60">5.6 KB 极简矢量 · 4K 无损平铺</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/25">
                Gzip 1.5KB
              </span>
            </div>
          </header>

          {/* Chat Messages Stream (Simulating real Telegram usage) */}
          <main className="max-w-xl w-full mx-auto my-auto py-6 space-y-4">
            {/* Incoming Message */}
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold">
                D
              </div>
              <div
                className="max-w-[80%] p-3.5 rounded-2xl rounded-bl-sm backdrop-blur-md border shadow-lg text-xs sm:text-sm leading-relaxed"
                style={{
                  backgroundColor: isDark ? "rgba(30, 41, 59, 0.75)" : "rgba(255, 255, 255, 0.9)",
                  borderColor: panelBorder,
                  color: panelText,
                }}
              >
                <div className="font-bold text-[11px] text-sky-400 mb-1">Duang · 探索者</div>
                fffuel 的 dddoodle 下载下来 120 个文件有 1MB，做背景太重了！
                <div className="text-[10px] opacity-40 text-right mt-1">21:30</div>
              </div>
            </div>

            {/* Outgoing Message */}
            <div className="flex items-end justify-end gap-2">
              <div
                className="max-w-[82%] p-3.5 rounded-2xl rounded-br-sm shadow-lg text-xs sm:text-sm leading-relaxed text-white"
                style={{
                  backgroundColor: isDark ? "#2563eb" : "#0284c7",
                }}
              >
                这里用 <strong>&lt;defs&gt; + &lt;use&gt; + &lt;pattern&gt;</strong> 将 12 组纸飞机、星球、咖啡等经典图元做了符号复用，整体仅 <strong>5.6KB（Gzip 后 1.5KB）</strong>，还支持无损无限平铺！
                <div className="flex items-center justify-end gap-1 text-[10px] opacity-75 mt-1">
                  <span>21:31</span>
                  <CheckCheck className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Feature Highlights Card */}
            <div
              className="p-5 rounded-3xl backdrop-blur-xl border shadow-xl text-center space-y-3"
              style={{ backgroundColor: panelBg, borderColor: panelBorder, color: panelText }}
            >
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Telegram 贴纸壁纸为什么好看又轻量？
              </h2>
              <p className="text-xs opacity-75 leading-relaxed max-w-md mx-auto font-light">
                核心在于<strong>单色微透明度 (10%~14%) + 角度微偏转手绘感 + 符号平铺复用</strong>。既有高级质感，又绝对不干扰文字阅读。
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopySvg}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-sky-500 hover:bg-sky-400 text-black shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  {copiedType === "svg" ? <Check className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
                  {copiedType === "svg" ? "已复制 SVG" : "复制 SVG 源码"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyCss}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs border hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5"
                  style={{ borderColor: panelBorder }}
                >
                  {copiedType === "css" ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                  {copiedType === "css" ? "已复制 CSS" : "复制 CSS Data URL"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs border hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5"
                  style={{ borderColor: panelBorder }}
                >
                  <Download className="w-3.5 h-3.5" />
                  下载 .svg
                </button>
              </div>
            </div>
          </main>

          {/* Bottom Chat Input Bar Mock */}
          <footer
            className="flex items-center gap-2 max-w-2xl w-full mx-auto backdrop-blur-xl px-4 py-3 rounded-2xl border shadow-xl"
            style={{ backgroundColor: panelBg, borderColor: panelBorder, color: panelText }}
          >
            <Smile className="w-5 h-5 opacity-60 cursor-pointer" />
            <div className="flex-1 text-xs opacity-50 px-2">写一条消息...</div>
            <Paperclip className="w-5 h-5 opacity-60 cursor-pointer" />
            <div className="w-8 h-8 rounded-full bg-sky-500 text-black flex items-center justify-center cursor-pointer shadow">
              <Send className="w-4 h-4" />
            </div>
          </footer>
        </div>
      )}

      {/* ================= FLOATING CONTROL PANEL ================= */}
      <div
        className={`fixed z-30 bottom-6 right-6 transition-all duration-300 pointer-events-auto ${
          isPanelCollapsed ? "w-14 h-14" : "w-[340px] sm:w-[380px] max-h-[85vh] overflow-y-auto"
        }`}
      >
        {isPanelCollapsed ? (
          <button
            type="button"
            onClick={() => setIsPanelCollapsed(false)}
            className="w-14 h-14 rounded-2xl bg-sky-500 hover:bg-sky-400 text-black flex items-center justify-center shadow-2xl cursor-pointer transition transform hover:scale-105"
            title="展开调参面板"
          >
            <Sliders className="w-6 h-6" />
          </button>
        ) : (
          <div
            className="backdrop-blur-2xl rounded-3xl p-5 border shadow-2xl space-y-4 text-xs"
            style={{ backgroundColor: panelBg, borderColor: panelBorder, color: panelText }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: panelBorder }}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Palette className="w-4 h-4 text-sky-400" />
                <span>壁纸参数调校</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowDemoUI(!showDemoUI)}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: panelBorder }}
                  title={showDemoUI ? "隐藏聊天界面（纯看背景壁纸）" : "显示聊天界面"}
                >
                  <Eye className={`w-4 h-4 ${showDemoUI ? "text-sky-400" : "opacity-40"}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: panelBorder }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Presets */}
            <div>
              <div className="font-semibold opacity-70 mb-2 text-[11px]">配色主题预设</div>
              <div className="space-y-1">
                {BG_THEMES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => applyTheme(t)}
                    className="w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer hover:opacity-90"
                    style={{
                      borderColor: currentTheme.name === t.name ? "#38bdf8" : panelBorder,
                      backgroundColor: currentTheme.name === t.name ? "rgba(56, 189, 248, 0.12)" : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${t.bgGradStart}, ${t.bgGradEnd})`,
                        }}
                      />
                      <span className="font-medium text-[11px]">{t.name}</span>
                    </div>
                    {t.isDark ? <Moon className="w-3 h-3 opacity-50" /> : <Sun className="w-3 h-3 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>贴纸透明度 (Opacity)</span>
                  <span className="font-mono">{(opacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.04"
                  max="0.4"
                  step="0.01"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>平铺单元大小 (Pattern Size)</span>
                  <span className="font-mono">{patternSize}px</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="600"
                  step="20"
                  value={patternSize}
                  onChange={(e) => setPatternSize(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>描边粗细 (Stroke Width)</span>
                  <span className="font-mono">{strokeWidth.toFixed(1)}px</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Color Customizer */}
            <div className="flex items-center justify-between pt-1">
              <span className="opacity-70 text-[11px]">贴纸线条颜色</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={doodleColor}
                  onChange={(e) => setDoodleColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-[10px] opacity-80">{doodleColor}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default DoodleBackgroundPage;

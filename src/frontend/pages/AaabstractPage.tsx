import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Sliders,
  Play,
  Pause,
  Copy,
  Check,
  Download,
  Sparkles,
  Sun,
  Moon,
  Layers,
  ArrowLeft,
  RotateCcw,
  Palette,
  Eye,
  Activity,
  Compass,
  Monitor,
  Maximize2,
  FileCode,
} from "lucide-react";

// The exact GLSL Fragment Shader from https://www.fffuel.co/aaabstract/
const AAABSTRACT_FRAG_SHADER = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_complexity;
uniform float u_saturation;
uniform float u_twist;
uniform float u_light;
uniform float u_mix;

void main() {
  vec2 coord = (gl_FragCoord.xy - (u_resolution / 2.)) / max(u_resolution.y, u_resolution.x);
  float len = length(vec2(coord.x, coord.y));

  coord.x -= cos(coord.y + sin(len * u_twist)) * sin(u_time / 10.0);
  coord.y -= sin(coord.x + cos(len * (u_twist / 2.))) * sin(u_time / 5.0);

  float space = cos(atan(sin(len * coord.x), sin(len * coord.y)) * 6.);
  space /= 6.;

  space = fract(space * u_complexity) / 2.2;
  vec3 color = vec3(space);

  color.r *= sin(len * (1.2 - u_mix)) * u_saturation;
  color.g *= sin(len * (3.3 - u_mix)) * u_saturation;
  color.b *= sin(len * (4.3 - u_mix)) * u_saturation;

  if (u_light == 1.0) {
    color.r = cos(len * color.r);
    color.g = cos(len * color.g);
    color.b = cos(len * color.b);
  } else {
    color.r = 1. - abs(cos(len * color.r));
    color.g = 1. - abs(cos(len * color.g));
    color.b = 1. - abs(cos(len * color.b));
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

interface Preset {
  name: string;
  complexity: number;
  saturation: number;
  twist: number;
  mix: number;
  isLight: boolean;
  desc: string;
}

const PRESETS: Preset[] = [
  {
    name: "fffuel 经典浅色 (Default Light)",
    complexity: 10.0,
    saturation: 3.0,
    twist: 4.0,
    mix: 0.0,
    isLight: true,
    desc: "fffuel 官方默认的柔和丝绸波纹",
  },
  {
    name: "极光暗夜 (Aurora Dark)",
    complexity: 12.0,
    saturation: 3.8,
    twist: 5.5,
    mix: 1.2,
    isLight: false,
    desc: "深邃反差、如极光般流动的暗色拓扑",
  },
  {
    name: "高维扭曲 (Deep Distortion)",
    complexity: 18.0,
    saturation: 4.2,
    twist: 12.0,
    mix: 2.5,
    isLight: false,
    desc: "高频折射扭曲，极具现代感科幻背景",
  },
  {
    name: "柔和水彩 (Soft Pastel)",
    complexity: 6.0,
    saturation: 2.2,
    twist: 2.5,
    mix: 0.5,
    isLight: true,
    desc: "低复杂度、大色块呼吸感流体",
  },
  {
    name: "霓虹异相 (Neon Phase)",
    complexity: 15.0,
    saturation: 5.0,
    twist: 8.0,
    mix: 6.0,
    isLight: false,
    desc: "色彩交织碰撞，强烈视觉张力",
  },
];

interface AaabstractPageProps {
  onNavigate?: (path: string) => void;
}

export const AaabstractPage: React.FC<AaabstractPageProps> = ({ onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Shader Uniform Parameters
  const [complexity, setComplexity] = useState<number>(10.0);
  const [saturation, setSaturation] = useState<number>(3.0);
  const [twist, setTwist] = useState<number>(4.0);
  const [mix, setMix] = useState<number>(0.0);
  const [isLight, setIsLight] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // View & Mode Settings
  const [renderEngine, setRenderEngine] = useState<"webgl" | "svg-vector">("webgl");
  const [aspectRatio, setAspectRatio] = useState<"cover" | "1:1" | "16:9" | "4:5">("cover");
  const [showDemoUI, setShowDemoUI] = useState<boolean>(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<"svg" | "css" | null>(null);

  // Time & Animation
  const timeRef = useRef<number>(0);
  const reqIdRef = useRef<number | null>(null);
  const glContextRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    uniforms: {
      resolution: WebGLUniformLocation | null;
      time: WebGLUniformLocation | null;
      complexity: WebGLUniformLocation | null;
      saturation: WebGLUniformLocation | null;
      twist: WebGLUniformLocation | null;
      light: WebGLUniformLocation | null;
      mix: WebGLUniformLocation | null;
    };
  } | null>(null);

  // 1. Initialize WebGL Context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", { preserveDrawingBuffer: true }) ||
      (canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true }) as WebGLRenderingContext | null);

    if (!gl) {
      console.warn("WebGL not supported, falling back to SVG");
      setRenderEngine("svg-vector");
      return;
    }

    // Compile Vertex Shader
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);

    // Compile Fragment Shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, AAABSTRACT_FRAG_SHADER);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error("Fragment shader compile error:", gl.getShaderInfoLog(fs));
      return;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    // Bind Quad Vertices
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    glContextRef.current = {
      gl,
      program,
      uniforms: {
        resolution: gl.getUniformLocation(program, "u_resolution"),
        time: gl.getUniformLocation(program, "u_time"),
        complexity: gl.getUniformLocation(program, "u_complexity"),
        saturation: gl.getUniformLocation(program, "u_saturation"),
        twist: gl.getUniformLocation(program, "u_twist"),
        light: gl.getUniformLocation(program, "u_light"),
        mix: gl.getUniformLocation(program, "u_mix"),
      },
    };
  }, []);

  // 2. Render Animation Loop
  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const delta = (stamp - lastStamp) / 1000;
      lastStamp = stamp;

      if (isPlaying) {
        timeRef.current += delta * speed;
      }

      const ctx = glContextRef.current;
      const canvas = canvasRef.current;
      if (ctx && canvas && renderEngine === "webgl") {
        const { gl, program, uniforms } = ctx;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);

        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.time, timeRef.current);
        gl.uniform1f(uniforms.complexity, complexity);
        gl.uniform1f(uniforms.saturation, saturation);
        gl.uniform1f(uniforms.twist, twist);
        gl.uniform1f(uniforms.light, isLight ? 1.0 : 0.0);
        gl.uniform1f(uniforms.mix, mix);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      reqIdRef.current = requestAnimationFrame(loop);
    };

    reqIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [isPlaying, speed, complexity, saturation, twist, mix, isLight, renderEngine]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (aspectRatio === "cover") {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      } else if (aspectRatio === "1:1") {
        const s = Math.min(window.innerWidth, window.innerHeight, 1080);
        canvas.width = s;
        canvas.height = s;
      } else if (aspectRatio === "16:9") {
        const w = Math.min(window.innerWidth, 1280);
        canvas.width = w;
        canvas.height = Math.round((w * 9) / 16);
      } else if (aspectRatio === "4:5") {
        const h = Math.min(window.innerHeight, 1000);
        canvas.height = h;
        canvas.width = Math.round((h * 4) / 5);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [aspectRatio]);

  // Apply Preset
  const applyPreset = (preset: Preset) => {
    setComplexity(preset.complexity);
    setSaturation(preset.saturation);
    setTwist(preset.twist);
    setMix(preset.mix);
    setIsLight(preset.isLight);
  };

  // Build SVG wrapper embedding the rendered canvas snapshot
  const buildSvgString = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const dataUrl = canvas.toDataURL("image/png");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="100%" height="100%">
  <!-- Generated via aaabstract shader (complexity=${complexity}, saturation=${saturation}, twist=${twist}) -->
  <image width="${canvas.width}" height="${canvas.height}" href="${dataUrl}" />
</svg>`;
  }, [complexity, saturation, twist]);

  // Copy SVG Code
  const handleCopySvg = async () => {
    const svgCode = buildSvgString();
    await navigator.clipboard.writeText(svgCode);
    setCopiedType("svg");
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Copy CSS Data URL
  const handleCopyCss = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const css = `background-image: url("${dataUrl}");\nbackground-size: cover;\nbackground-position: center;`;
    await navigator.clipboard.writeText(css);
    setCopiedType("css");
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Download SVG
  const handleDownloadSvg = () => {
    const svgCode = buildSvgString();
    const blob = new Blob([svgCode], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aaabstract-${isLight ? "light" : "dark"}-c${complexity}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download PNG
  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `aaabstract-${isLight ? "light" : "dark"}-c${complexity}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const uiBg = isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(10, 15, 29, 0.82)";
  const uiBorder = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.15)";
  const uiText = isLight ? "#0f172a" : "#f8fafc";

  return (
    <div className="relative min-h-screen w-full overflow-hidden select-none font-sans bg-black text-slate-100">
      {/* ================= CANVAS / BACKGROUND LAYER ================= */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {renderEngine === "webgl" ? (
          <canvas
            ref={canvasRef}
            className={`transition-all duration-300 ${
              aspectRatio === "cover"
                ? "w-full h-full object-cover"
                : "rounded-2xl shadow-2xl border border-white/20"
            }`}
          />
        ) : (
          /* Pure SVG Vector Fallback Mode (Organic Wavy Filter Effect) */
          <svg className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="svg-fluid-filter" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={`${(0.01 * complexity) / 10} ${(0.02 * twist) / 10}`}
                  numOctaves="3"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale={twist * 15}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
              <linearGradient id="svg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isLight ? "#fbcfe8" : "#3b82f6"} />
                <stop offset="50%" stopColor={isLight ? "#c084fc" : "#8b5cf6"} />
                <stop offset="100%" stopColor={isLight ? "#67e8f9" : "#ec4899"} />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill={isLight ? "#f8fafc" : "#020617"} />
            <g filter="url(#svg-fluid-filter)">
              <circle cx="35%" cy="35%" r="45%" fill="url(#svg-grad)" opacity={0.8} />
              <circle cx="65%" cy="65%" r="40%" fill="url(#svg-grad)" opacity={0.6} />
            </g>
          </svg>
        )}
      </div>

      {/* ================= REALISTIC MOCK PAGE CONTENT ================= */}
      {showDemoUI && (
        <div className="relative z-10 min-h-screen flex flex-col justify-between p-6 sm:p-12 pointer-events-auto">
          {/* Top Navbar */}
          <header
            className="flex items-center justify-between max-w-5xl w-full mx-auto backdrop-blur-xl px-6 py-4 rounded-2xl border shadow-xl transition-all"
            style={{ backgroundColor: uiBg, borderColor: uiBorder, color: uiText }}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate("/");
                  else window.location.href = "/";
                }}
                className="p-2 rounded-xl border hover:opacity-80 transition cursor-pointer"
                style={{ borderColor: uiBorder }}
                title="返回系统首页"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400 animate-spin-slow" />
                <span className="font-bold tracking-tight text-lg">fffuel aaabstract 流体背景</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                GLSL WebGL 60FPS
              </span>
            </div>
          </header>

          {/* Hero Content Card */}
          <main className="max-w-3xl w-full mx-auto my-auto text-center py-10 px-4">
            <div
              className="backdrop-blur-2xl p-8 sm:p-12 rounded-3xl border shadow-2xl transition-all"
              style={{ backgroundColor: uiBg, borderColor: uiBorder, color: uiText }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider mb-6 bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Palette className="w-4 h-4" />
                <span>1:1 完整复刻 fffuel.co/aaabstract 动态渲染引擎</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                有机丝绸波纹背景
              </h1>
              <p className="text-sm sm:text-base opacity-80 max-w-xl mx-auto mb-8 font-light leading-relaxed">
                高分辨率有机的抽象波纹与流体纹理。可在右下角调参面板实时调整复杂度、扭曲度、饱和度与色彩混合，并支持一键导出 SVG / CSS 代码。
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCopySvg}
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center gap-2"
                >
                  {copiedType === "svg" ? <Check className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                  {copiedType === "svg" ? "已复制 SVG 源码" : "复制 SVG 源码"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyCss}
                  className="px-5 py-3 rounded-xl font-bold text-sm border hover:bg-white/10 transition cursor-pointer flex items-center gap-2"
                  style={{ borderColor: uiBorder }}
                >
                  {copiedType === "css" ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                  {copiedType === "css" ? "已复制 CSS" : "复制 CSS 背景"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="px-5 py-3 rounded-xl font-bold text-sm border hover:bg-white/10 transition cursor-pointer flex items-center gap-2"
                  style={{ borderColor: uiBorder }}
                >
                  <Download className="w-4 h-4" />
                  下载 .svg
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="px-4 py-3 rounded-xl font-bold text-sm border hover:bg-white/10 transition cursor-pointer flex items-center gap-2 opacity-80"
                  style={{ borderColor: uiBorder }}
                >
                  下载 .png
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-2 mt-8 pt-6 border-t" style={{ borderColor: uiBorder }}>
                <div>
                  <div className="text-xl font-bold font-mono text-purple-400">{complexity.toFixed(1)}</div>
                  <div className="text-[11px] opacity-60">Complexity</div>
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-pink-400">{saturation.toFixed(2)}</div>
                  <div className="text-[11px] opacity-60">Saturation</div>
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-sky-400">{twist.toFixed(1)}</div>
                  <div className="text-[11px] opacity-60">Distortion</div>
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-emerald-400">{mix.toFixed(1)}</div>
                  <div className="text-[11px] opacity-60">Mixture</div>
                </div>
              </div>
            </div>
          </main>

          {/* Footer note */}
          <footer className="text-center text-xs opacity-50 max-w-md mx-auto">
            Algorithm & GLSL Fragment Shader based on fffuel.co/aaabstract
          </footer>
        </div>
      )}

      {/* ================= FLOATING CONTROL PANEL ================= */}
      <div
        className={`fixed z-30 bottom-6 right-6 transition-all duration-300 pointer-events-auto ${
          isPanelCollapsed ? "w-14 h-14" : "w-[360px] sm:w-[420px] max-h-[85vh] overflow-y-auto"
        }`}
      >
        {isPanelCollapsed ? (
          <button
            type="button"
            onClick={() => setIsPanelCollapsed(false)}
            className="w-14 h-14 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-2xl cursor-pointer transition transform hover:scale-105"
            title="展开调参面板"
          >
            <Sliders className="w-6 h-6" />
          </button>
        ) : (
          <div
            className="backdrop-blur-2xl rounded-3xl p-5 border shadow-2xl space-y-4 text-xs"
            style={{ backgroundColor: uiBg, borderColor: uiBorder, color: uiText }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: uiBorder }}>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm">aaabstract 调参矩阵</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsLight(!isLight)}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: uiBorder }}
                  title={isLight ? "切换暗夜模式" : "切换明亮模式"}
                >
                  {isLight ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDemoUI(!showDemoUI)}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: uiBorder }}
                  title={showDemoUI ? "隐藏页面覆盖层（全屏纯看流体）" : "显示页面卡片覆盖层"}
                >
                  <Eye className={`w-4 h-4 ${showDemoUI ? "text-purple-400" : "opacity-40"}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: uiBorder }}
                  title="收起面板"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Presets */}
            <div>
              <div className="font-semibold opacity-70 mb-2 flex items-center gap-1 text-[11px]">
                <Palette className="w-3.5 h-3.5" />
                <span>官方灵感预设</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-2 rounded-xl border text-left truncate transition hover:opacity-90 cursor-pointer"
                    style={{
                      borderColor: uiBorder,
                      backgroundColor: p.isLight === isLight && p.complexity === complexity ? "rgba(168, 85, 247, 0.15)" : "transparent",
                    }}
                  >
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-[10px] opacity-60 truncate">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              {/* Complexity */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>复杂度 (Complexity)</span>
                  <span className="font-mono">{complexity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="30.0"
                  step="0.5"
                  value={complexity}
                  onChange={(e) => setComplexity(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>色彩饱和度 (Saturation)</span>
                  <span className="font-mono">{saturation.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="6.0"
                  step="0.05"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              {/* Twist / Distortion */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>扭曲折射 (Distortion / Twist)</span>
                  <span className="font-mono">{twist.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="30.0"
                  step="0.2"
                  value={twist}
                  onChange={(e) => setTwist(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Color Mixture */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>混合相位 (Color Mixture)</span>
                  <span className="font-mono">{mix.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="15.0"
                  step="0.2"
                  value={mix}
                  onChange={(e) => setMix(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Animation Speed */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>流动速度 (Speed)</span>
                  <span className="font-mono">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Aspect Ratio Switcher */}
            <div>
              <div className="font-semibold opacity-70 mb-1.5 text-[11px]">画布比例 (Aspect Ratio)</div>
              <div className="grid grid-cols-4 gap-1">
                {(["cover", "1:1", "16:9", "4:5"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r)}
                    className={`py-1.5 rounded-lg border text-center transition cursor-pointer ${
                      aspectRatio === r ? "bg-purple-500/20 text-purple-400 border-purple-400 font-bold" : "border-white/10"
                    }`}
                  >
                    {r === "cover" ? "全屏铺满" : r}
                  </button>
                ))}
              </div>
            </div>

            {/* Play/Pause & Engine Switch */}
            <div className="p-3 rounded-2xl border flex items-center justify-between" style={{ borderColor: uiBorder }}>
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${isPlaying ? "text-emerald-400 animate-pulse" : "opacity-50"}`} />
                <div>
                  <div className="font-semibold">流体实时演算</div>
                  <div className="text-[10px] opacity-60">GLSL 着色器动态流动</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                    isPlaying ? "bg-emerald-500/20 text-emerald-400 border-emerald-400" : "hover:bg-white/10"
                  }`}
                  style={{ borderColor: isPlaying ? undefined : uiBorder }}
                  title={isPlaying ? "暂停演变" : "开始流动"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default AaabstractPage;

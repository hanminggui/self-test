import React from "react";
import { Sparkles } from "lucide-react";

interface ViewLoadingSkeletonProps {
  viewName?: string;
}

export default function ViewLoadingSkeleton({ viewName = "内容视图" }: ViewLoadingSkeletonProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center select-none bg-transparent relative overflow-hidden animate-in fade-in duration-300">
      {/* 背景微光光斑 */}
      <div className="absolute w-72 h-72 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none animate-pulse" />

      {/* 科技感同心圆环呼吸骨架 */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-indigo-500/20 border-t-indigo-400 animate-spin [animation-duration:2.5s]" />
        <div className="absolute inset-3 rounded-full border border-white/5 border-b-cyan-400 animate-spin [animation-duration:4s] [animation-direction:reverse]" />
        <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
          <Sparkles className="w-5 h-5 animate-pulse text-indigo-300" />
        </div>
      </div>

      {/* 状态文字 */}
      <div className="mt-4 flex flex-col items-center gap-1 z-10">
        <div className="text-xs font-medium text-slate-300 tracking-wider">
          正在装载 {viewName} 模块...
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          按需加载代码分块 (Dynamic Code-Splitting)
        </div>
      </div>
    </div>
  );
}

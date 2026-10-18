import React from "react";
import { Compass, Globe, GalleryHorizontal, Disc, LayoutGrid, Layers } from "lucide-react";
import { ViewMode } from "../../types/admin";

interface AdminNavTabsProps {
  viewMode: ViewMode;
  onSelectViewMode: (mode: ViewMode) => void;
}

const NAV_ITEMS: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: "COMPASS", label: "星盘", icon: <Compass className="w-3.5 h-3.5 text-cyan-300" /> },
  { mode: "DOME", label: "半球", icon: <Globe className="w-3.5 h-3.5 text-sky-400" /> },
  { mode: "BAND", label: "画廊", icon: <GalleryHorizontal className="w-3.5 h-3.5 text-emerald-400" /> },
  { mode: "BAGUA", label: "八卦", icon: <Disc className="w-3.5 h-3.5 text-amber-400" /> },
  { mode: "RECT", label: "相图", icon: <LayoutGrid className="w-3.5 h-3.5 text-indigo-300" /> },
  { mode: "TABLE", label: "数据明细", icon: <Layers className="w-3.5 h-3.5 text-purple-300" /> },
];

export default function AdminNavTabs({ viewMode, onSelectViewMode }: AdminNavTabsProps) {
  return (
    <div className="absolute top-3 left-3 z-30 flex items-center p-0.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/10 shadow-xl text-xs select-none">
      {NAV_ITEMS.map((item) => {
        const isActive = viewMode === item.mode;
        return (
          <button
            key={item.mode}
            onClick={() => onSelectViewMode(item.mode)}
            className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs ${isActive
              ? "bg-indigo-600 text-white font-medium shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

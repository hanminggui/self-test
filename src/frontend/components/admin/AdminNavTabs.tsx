import React from "react";
import { Compass, Globe, GalleryHorizontal, Disc, LayoutGrid, Layers } from "lucide-react";
import { ViewMode } from "../../types/admin";
import { useLocale } from "../../contexts/LocaleContext";
import { LanguageToggle } from "../LanguageToggle";

interface AdminNavTabsProps {
  viewMode: ViewMode;
  onSelectViewMode: (mode: ViewMode) => void;
}

export default function AdminNavTabs({ viewMode, onSelectViewMode }: AdminNavTabsProps) {
  const { locale } = useLocale();
  const isEn = locale === "en-US";

  const navItems: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: "COMPASS", label: isEn ? "Compass" : "星盘", icon: <Compass className="w-3.5 h-3.5 text-cyan-300" /> },
    { mode: "DOME", label: isEn ? "Dome" : "半球", icon: <Globe className="w-3.5 h-3.5 text-sky-400" /> },
    { mode: "BAND", label: isEn ? "Band" : "画廊", icon: <GalleryHorizontal className="w-3.5 h-3.5 text-emerald-400" /> },
    { mode: "BAGUA", label: isEn ? "Astrolabe" : "八卦", icon: <Disc className="w-3.5 h-3.5 text-amber-400" /> },
    { mode: "RECT", label: isEn ? "Phase" : "相图", icon: <LayoutGrid className="w-3.5 h-3.5 text-indigo-300" /> },
    { mode: "TABLE", label: isEn ? "Table" : "数据明细", icon: <Layers className="w-3.5 h-3.5 text-purple-300" /> },
  ];

  return (
    <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 p-0.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/10 shadow-xl text-xs select-none">
      <div className="flex items-center">
        {navItems.map((item) => {
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
      <div className="h-4 w-px bg-white/10 mx-0.5" />
      <LanguageToggle className="!py-1 !px-2.5 !text-[11px] !border-none !bg-transparent hover:!bg-white/5" />
    </div>
  );
}

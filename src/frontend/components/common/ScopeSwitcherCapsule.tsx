import React from "react";
import { Globe, Users, User, Sparkles } from "lucide-react";
import { useLocale } from "../../contexts/LocaleContext";

export type ChartScope = "global" | "friends" | "self";

export interface ScopeSwitcherCapsuleProps {
  scope: ChartScope;
  onScopeChange: (nextScope: ChartScope) => void;
  friendCount?: number;
  className?: string;
  disabled?: boolean;
}

export const ScopeSwitcherCapsule: React.FC<ScopeSwitcherCapsuleProps> = ({
  scope,
  onScopeChange,
  friendCount,
  className = "",
  disabled = false,
}) => {
  const { locale } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  const options: Array<{
    id: ChartScope;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }> = [
    {
      id: "global",
      label: isEn ? "Global Macro Cosmos" : "全域宏观星系",
      sublabel: isEn ? "All Explorers" : "全域受测者",
      icon: Globe,
      accentColor: "#38BDF8", // Cyan
    },
    {
      id: "friends",
      label: isEn ? "My Friend Circle" : "好友社交圈",
      sublabel: isEn ? "Referral Network" : "直接引荐网络",
      icon: Users,
      accentColor: "#FBBF24", // Dopamine Amber
    },
    {
      id: "self",
      label: isEn ? "Just Me" : "唯我本体",
      sublabel: isEn ? "Self Profile" : "个人本体轨迹",
      icon: User,
      accentColor: "#CCFF00", // Acid Lime
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={isEn ? "Chart Scope Switcher" : "星图展示范围切换"}
      className={`inline-flex items-center p-1 rounded-2xl bg-[#FFFBEB] dark:bg-[#0E0E16] border-[2px] border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] transition-all select-none ${className}`}
    >
      {options.map((opt) => {
        const IconComponent = opt.icon;
        const isActive = scope === opt.id;

        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            type="button"
            onClick={() => onScopeChange(opt.id)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
              isActive
                ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] font-black scale-[1.02]"
                : "text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-white/5 border-2 border-transparent"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "active:translate-y-0.5"}`}
          >
            <IconComponent
              className={`w-3.5 h-3.5 transition-colors ${
                isActive
                  ? "text-stone-950 dark:text-[#08080C]"
                  : "text-stone-500 dark:text-slate-400"
              }`}
            />
            <span className="tracking-tight whitespace-nowrap">{opt.label}</span>
            {opt.id === "friends" && typeof friendCount === "number" && friendCount > 0 && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  isActive
                    ? "bg-stone-950 text-white dark:bg-[#08080C] dark:text-[#CCFF00]"
                    : "bg-amber-300 dark:bg-white/20 text-stone-900 dark:text-white"
                }`}
              >
                {friendCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

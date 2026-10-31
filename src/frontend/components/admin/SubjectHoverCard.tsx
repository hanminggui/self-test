import React from "react";
import { SubjectPoint } from "../../types/admin";
import { useLocale } from "../../contexts/LocaleContext";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";

interface SubjectHoverCardProps {
  subject: SubjectPoint;
  anchorPos: { x: number; y: number };
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * 通用受测者星宿悬浮预览卡片 (SVG 规范)
 * 全平台各可视化视图 (星盘、半球、八卦、无缝画卷) 统一采用本组件进行受测者悬停预览
 */
export default function SubjectHoverCard({
  subject,
  anchorPos,
  canvasWidth = 880,
  canvasHeight = 560,
}: SubjectHoverCardProps) {
  const { locale } = useLocale();
  const isEn = locale === "en-US";
  const isSubEn = subject.metadata?.locale === "en-US" || subject.locale === "en-US";
  const def = subject.quadrant_code ? getArchetypeDefinition(subject.quadrant_code, locale) : null;
  const roleTitle = def?.role_title || subject.role_title || (isEn ? "Subject" : "受测者");

  // 视口边缘碰撞保护
  const padX = 110;
  const padY = 70;
  const x = Math.min(canvasWidth - padX, Math.max(padX, anchorPos.x));
  const y = Math.min(canvasHeight - padY, Math.max(padY, anchorPos.y - 20));

  const hasSocialOrSimilarity = typeof subject.similarity === "number" || Boolean(subject.avatar_url) || subject.is_friend;
  const cardHeight = hasSocialOrSimilarity ? 92 : 72;
  const cardY = hasSocialOrSimilarity ? -82 : -76;
  const hasAvatar = Boolean(subject.avatar_url);
  const nameX = hasAvatar ? -48 : -75;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <rect
        x="-85"
        y={cardY}
        width="170"
        height={cardHeight}
        rx="8"
        fill="#090d16"
        fillOpacity="0.95"
        stroke={subject.is_friend ? "#10b981" : "rgba(255, 255, 255, 0.2)"}
        strokeWidth={subject.is_friend ? "1.5" : "1"}
        style={{
          filter: subject.is_friend
            ? "drop-shadow(0 0 12px rgba(16, 185, 129, 0.4))"
            : "drop-shadow(0 6px 18px rgba(0,0,0,0.7))",
        }}
      />

      {/* 社交头像 */}
      {hasAvatar && (
        <g>
          <clipPath id={`hover-clip-${subject.id}`}>
            <circle cx="-64" cy="-60" r="9" />
          </clipPath>
          <circle cx="-64" cy="-60" r="10.5" fill="#10b981" />
          <image
            href={subject.avatar_url!}
            x="-73"
            y="-69"
            width="18"
            height="18"
            clipPath={`url(#hover-clip-${subject.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}

      {/* 受测者姓名与语言徽章 */}
      <text
        x={nameX}
        y="-56"
        fill="#ffffff"
        fontSize="10.5"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        {subject.nickname || subject.name}
      </text>

      {/* 语言徽章 */}
      <rect
        x={hasAvatar ? "14" : "18"}
        y="-65"
        width="16"
        height="11"
        rx="2"
        fill={isSubEn ? "rgba(99, 102, 241, 0.25)" : "rgba(148, 163, 184, 0.2)"}
        stroke={isSubEn ? "rgba(129, 140, 248, 0.6)" : "rgba(255, 255, 255, 0.2)"}
        strokeWidth="0.8"
      />
      <text
        x={hasAvatar ? "22" : "26"}
        y="-57"
        textAnchor="middle"
        fill={isSubEn ? "#a5b4fc" : "#94a3b8"}
        fontSize="7.5"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {isSubEn ? "EN" : "ZH"}
      </text>

      <text
        x="75"
        y="-56"
        textAnchor="end"
        fill="#fbbf24"
        fontSize="10"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {subject.final_score}{isEn ? " pts" : "分"}
      </text>

      {/* 画像称号与象区代码 */}
      <text
        x="-75"
        y="-40"
        fill="#38bdf8"
        fontSize="9.5"
        fontWeight="semibold"
        fontFamily="system-ui, sans-serif"
      >
        {roleTitle}
        <tspan fill="#94a3b8" fontSize="8.5" fontFamily="monospace" dx="4">
          ({subject.quadrant_code})
        </tspan>
      </text>

      {/* 4D 流形指标 */}
      <text x="-75" y="-25" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
        D*: <tspan fill="#38bdf8">{(subject.d_star ?? 0.5).toFixed(3)}</tspan>
        {"  "}
        M: <tspan fill="#c084fc">{subject.m_ratio}</tspan>
      </text>
      <text x="-75" y="-13" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
        Bias:{" "}
        <tspan fill="#f1f5f9">
          {subject.calibration_bias > 0
            ? `+${subject.calibration_bias}`
            : subject.calibration_bias}
        </tspan>
        {"  "}
        IVE: <tspan fill="#f59e0b">{(subject.ive ?? 0.5).toFixed(3)}</tspan>
      </text>

      {/* 认知契合度与好友标记 (GitHub Issue #20) */}
      {typeof subject.similarity === "number" && (
        <g>
          <rect
            x="-77"
            y="-2"
            width="154"
            height="18"
            rx="4"
            fill={subject.is_self ? "rgba(245, 158, 11, 0.25)" : "rgba(16, 185, 129, 0.25)"}
            stroke={subject.is_self ? "rgba(245, 158, 11, 0.7)" : "rgba(16, 185, 129, 0.7)"}
            strokeWidth="0.8"
          />
          <text
            x="0"
            y="11"
            textAnchor="middle"
            fill={subject.is_self ? "#fbbf24" : "#34d399"}
            fontSize="8.5"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            {subject.is_self
              ? isEn ? "★ Self Anchor Point (100% Match)" : "★ 唯我本体锚点 (100% 契合)"
              : isEn ? `Cognitive Match Rate: ${subject.similarity}%` : `认知流形契合度: ${subject.similarity}%`}
          </text>
        </g>
      )}
    </g>
  );
}

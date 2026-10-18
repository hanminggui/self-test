import React from "react";
import { SubjectPoint } from "../../types/admin";

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
  // 视口边缘碰撞保护
  const padX = 110;
  const padY = 70;
  const x = Math.min(canvasWidth - padX, Math.max(padX, anchorPos.x));
  const y = Math.min(canvasHeight - padY, Math.max(padY, anchorPos.y - 20));

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <rect
        x="-85"
        y="-76"
        width="170"
        height="72"
        rx="8"
        fill="#090d16"
        fillOpacity="0.95"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth="1"
        style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.7))" }}
      />
      {/* 受测者姓名与得分 */}
      <text
        x="-75"
        y="-56"
        fill="#ffffff"
        fontSize="11"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        {subject.name}
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
        {subject.final_score}分
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
        {subject.role_title || "受测者"}
        <tspan fill="#94a3b8" fontSize="8.5" fontFamily="monospace" dx="4">
          ({subject.quadrant_code})
        </tspan>
      </text>

      {/* 4D 流形指标 */}
      <text x="-75" y="-24" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
        D*: <tspan fill="#38bdf8">{(subject.d_star ?? 0.5).toFixed(3)}</tspan>
        {"  "}
        M: <tspan fill="#c084fc">{subject.m_ratio}</tspan>
      </text>
      <text x="-75" y="-12" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
        Bias:{" "}
        <tspan fill="#f1f5f9">
          {subject.calibration_bias > 0
            ? `+${subject.calibration_bias}`
            : subject.calibration_bias}
        </tspan>
        {"  "}
        IVE: <tspan fill="#f59e0b">{(subject.ive ?? 0.5).toFixed(3)}</tspan>
      </text>
    </g>
  );
}

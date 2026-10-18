import React from "react";
import CognitiveDome from "../../../CognitiveDome";
import { SubjectPoint } from "../../../types/admin";

interface CognitiveDomeViewProps {
  subjects: SubjectPoint[];
  onOpenReport: (sessionId: string) => void;
  octantStatsMap: Record<
    string,
    { count: number; percentage: string; avgDStar: string; avgMRatio: string; avgScore: number }
  >;
  onHoverStatusChange?: (statusText: string | null) => void;
  onActiveSectorChange?: (octantCode: string) => void;
}

export default function CognitiveDomeView(props: CognitiveDomeViewProps) {
  return <CognitiveDome {...props} />;
}

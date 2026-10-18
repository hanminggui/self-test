import React from "react";
import SphericalDataBand from "../../../SphericalDataBand";
import { SubjectPoint } from "../../../types/admin";

interface SphericalDataBandViewProps {
  subjects: SubjectPoint[];
  onOpenReport: (sessionId: string) => void;
  octantStatsMap: Record<
    string,
    { count: number; percentage: string; avgDStar: string; avgMRatio: string; avgScore: number }
  >;
  onHoverStatusChange?: (statusText: string | null) => void;
  onActiveSectorChange?: (octantCode: string) => void;
}

export default function SphericalDataBandView(props: SphericalDataBandViewProps) {
  return <SphericalDataBand {...props} />;
}

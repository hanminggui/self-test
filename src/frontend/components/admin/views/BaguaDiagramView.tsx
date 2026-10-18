import React from "react";
import BaguaDiagram from "../../../BaguaDiagram";
import { SubjectPoint, OctantStatsMap } from "../../../types/admin";

interface BaguaDiagramViewProps {
  subjects: SubjectPoint[];
  onOpenReport: (sessionId: string) => void;
  octantStatsMap: OctantStatsMap;
  onHoverStatusChange?: (statusText: string | null) => void;
  onActiveSectorChange?: (octantCode: string) => void;
}

export default function BaguaDiagramView(props: BaguaDiagramViewProps) {
  return (
    <div className="w-full h-full overflow-hidden">
      <BaguaDiagram {...props} />
    </div>
  );
}

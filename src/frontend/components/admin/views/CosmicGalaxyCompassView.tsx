import React from "react";
import CosmicGalaxyCompass from "../../../CosmicGalaxyCompass";
import { SubjectPoint, OctantStatsMap } from "../../../types/admin";

interface CosmicGalaxyCompassViewProps {
  subjects: SubjectPoint[];
  onOpenReport: (sessionId: string) => void;
  octantStatsMap: OctantStatsMap;
  isRotating: boolean;
  onToggleRotating: () => void;
  onHoverStatusChange?: (statusText: string | null) => void;
  onActiveSectorChange?: (octantCode: string) => void;
}

export default function CosmicGalaxyCompassView(props: CosmicGalaxyCompassViewProps) {
  return (
    <div className="w-full h-full overflow-hidden">
      <CosmicGalaxyCompass {...props} />
    </div>
  );
}

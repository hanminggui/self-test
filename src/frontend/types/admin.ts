import type { AssessmentMetrics, AgentExecutionMetadata } from "../../backend/models";
import type { SupportedLocale } from "../../i18n";

export interface VisualColorToken {
  backgroundColor: string; // hsla 格式
  borderColor: string;     // 高亮边框色
  boxShadow: string;       // 外发光阴影
  hue: number;
}

export interface SubjectPoint {
  id: string;
  name: string;
  subject_type: string;
  locale?: SupportedLocale;
  created_at?: string;
  total_trials?: number;
  warmup_trials?: number;
  total_duration_ms?: number;
  final_score: number;
  formal_score?: number;
  composite_cognitive_score?: number;
  ccs?: number;
  quadrant_code: string;
  is_current?: boolean;
  metrics: AssessmentMetrics;
  agent_metadata?: AgentExecutionMetadata;
  user_id?: string | null;

  // Flattened compatibility properties for direct coordinate access
  first_order_accuracy: number;
  second_order_accuracy: number;
  d_prime: number;
  meta_d_prime: number;
  m_ratio: number;
  calibration_bias: number;
  d_star: number;
  ive: number;
  cognitive_manifold_vector: [number, number, number, number];
  role_title?: string;
  clinical_summary?: string;
  metadata?: any;
}

export interface ScatterData {
  baseline_x: number;
  baseline_y: number;
  median_x: number;
  median_y: number;
  mean_x: number;
  mean_y: number;
  total_count?: number;
  octants?: OctantStatsMap;
  octant_stats?: OctantStatsMap;
  density_summary?: {
    total_count: number;
    mean_x: number;
    mean_y: number;
    variance_x?: number;
    variance_y?: number;
  };
  subjects: SubjectPoint[];
}

export interface OctantSectorConfig {
  code: string;
  name: string;
  subTitle: string;
  startAngle: number; // 0度为正北，顺时针
  endAngle: number;
  centerAngle: number;
  primaryColor: string;
  glowColor: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
  desc: string;
  quadrantName: string;
}

export interface OctantDetailedInfo {
  code: string;
  name: string;
  definition: string;
  features: string;
  tiers: {
    awakened: string;
    core: string;
    passive: string;
    vacuum: string;
  };
}

export interface AxisDetailInfo {
  deg: number;
  axisName: string;
  dimension: string;
  shortName: string;
  value: string;
  definition: string;
  features: string;
  thresholdNote: string;
}

export type ViewMode = "COMPASS" | "DOME" | "BAND" | "BAGUA" | "RECT" | "TABLE";
export type SplitLineType = "BASELINE" | "MEDIAN" | "MEAN";

export interface OctantStatItem {
  count: number;
  percentage: string;
  avgDStar: string;
  avgMRatio: string;
  avgScore: number;
  avg_d_star?: number;
  avg_m_ratio?: number;
  avg_score?: number;
  variance_d_star?: number;
  variance_m_ratio?: number;
  variance_score?: number;
}

export type OctantStatsMap = Record<string, OctantStatItem>;

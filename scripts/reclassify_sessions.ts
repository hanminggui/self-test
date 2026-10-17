import { Database } from "bun:sqlite";
import { classifyCognitiveArchetype, getArchetypeDefinition } from "../src/backend/archetype_matrix";

const db = new Database("data/sessions.sqlite");

const rows = db.query("SELECT id, name, quadrant_code, role_title, d_star, d_prime, m_ratio, calibration_bias, full_report_json FROM completed_sessions").all() as any[];

const updateStmt = db.prepare(`
  UPDATE completed_sessions
  SET role_title = ?,
      quadrant_code = ?,
      full_report_json = ?
  WHERE id = ?
`);

let updatedCount = 0;

for (const r of rows) {
  let hints = 0;
  let brier = 0.2;
  let ive = 0.5;
  let fullJson: any = null;

  try {
    fullJson = JSON.parse(r.full_report_json);
    brier = fullJson.metacognitive_metrics?.brier_score ?? 0.2;
    hints = fullJson.diagnostic_profile?.hints_purchased ?? 0;
    ive = fullJson.metacognitive_metrics?.info_buying_efficiency ?? 0.5;
  } catch (e) {}

  const arch = classifyCognitiveArchetype({
    dStar: r.d_star ?? 0.5,
    dPrime: r.d_prime ?? 1.0,
    mRatio: r.m_ratio ?? 0.8,
    bias: r.calibration_bias ?? 0,
    brier: brier,
    ive: ive,
    hintsCount: hints,
  });

  const def = getArchetypeDefinition(arch);

  if (r.quadrant_code !== def.quadrant_code || r.role_title !== def.role_title) {
    if (fullJson) {
      if (fullJson.diagnostic_profile) {
        fullJson.diagnostic_profile.archetype = arch;
        fullJson.diagnostic_profile.role_title = def.role_title;
        fullJson.diagnostic_profile.quadrant_code = def.quadrant_code;
        // 同步更新激励文案和技能
        fullJson.diagnostic_profile.empowering_feedback = def.empowering_feedback;
        fullJson.diagnostic_profile.growth_advice = def.growth_advice;
        fullJson.diagnostic_profile.praise_tagline = def.praise_tagline;
      }
    }

    updateStmt.run(def.role_title, def.quadrant_code, JSON.stringify(fullJson), r.id);
    console.log(`[Migrated] ${r.name} (${r.id}): ${r.quadrant_code} (${r.role_title}) -> ${def.quadrant_code} (${def.role_title})`);
    updatedCount++;
  }
}

console.log(`Successfully migrated ${updatedCount} sessions.`);

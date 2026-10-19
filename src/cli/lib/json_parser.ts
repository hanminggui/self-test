/**
 * Resilient JSON Parser & Extractor (src/cli/lib/json_parser.ts)
 */

export interface ParsedLLMDecision {
  strategy?: "DECIDE" | "BUY_HINT" | "BUY_HINT_TIER2" | string;
  tier?: number;
  analysis_so_far?: string;
  choice?: "A" | "B" | "C" | "D" | string;
  action?: "HIGH_BET" | "SAFE_BET" | string;
  confidence?: number;
  [key: string]: any;
}

export function cleanAndExtractJson(raw: string): ParsedLLMDecision {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  text = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1");
  text = text.trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(text);
  } catch { }

  // 2. Bracket match & truncated recovery attempt
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { }

    let candidate = match[0];
    const openCount = (candidate.match(/\{/g) || []).length;
    const closeCount = (candidate.match(/\}/g) || []).length;
    if (openCount > closeCount) {
      candidate += "}".repeat(openCount - closeCount);
      try {
        return JSON.parse(candidate);
      } catch { }
    }
  }

  // 3. Fallback regex extractors
  const strategyMatch = text.match(/"strategy"\s*:\s*"(DECIDE|BUY_HINT|BUY_HINT_TIER2)"/i);
  const tierMatch = text.match(/"tier"\s*:\s*([12])/i);
  const analysisMatch = text.match(/"analysis_so_far"\s*:\s*"([^"]*)"/i);
  const choiceMatch = text.match(/"choice"\s*:\s*"([A-D])"/i);
  const actionMatch = text.match(/"action"\s*:\s*"(HIGH_BET|SAFE_BET)"/i);
  const confMatch = text.match(/"confidence"\s*:\s*([0-9]*\.?[0-9]+)/i);

  if (strategyMatch || tierMatch || analysisMatch || choiceMatch || actionMatch || confMatch) {
    const res: ParsedLLMDecision = {};
    if (strategyMatch) res.strategy = strategyMatch[1].toUpperCase();
    if (tierMatch) res.tier = parseInt(tierMatch[1], 10);
    if (analysisMatch) res.analysis_so_far = analysisMatch[1];
    if (choiceMatch) res.choice = choiceMatch[1].toUpperCase();
    if (actionMatch) res.action = actionMatch[1].toUpperCase();
    if (confMatch) res.confidence = Math.min(1, Math.max(0, parseFloat(confMatch[1])));
    return res;
  }

  // 4. Natural language semantic fallback (for non-JSON compliant models or proxies that strip schema)
  const semanticRes: ParsedLLMDecision = {};

  if (/\bBUY_HINT_TIER2\b/i.test(text) || text.includes("BUY_HINT_TIER2")) {
    semanticRes.strategy = "BUY_HINT_TIER2";
  } else if (/\bBUY_HINT\b/i.test(text) || text.includes("BUY_HINT")) {
    semanticRes.strategy = "BUY_HINT";
  } else if (/\bDECIDE\b/i.test(text) || text.includes("DECIDE")) {
    semanticRes.strategy = "DECIDE";
  }

  if (/\bHIGH_BET\b/i.test(text) || text.includes("HIGH_BET")) {
    semanticRes.action = "HIGH_BET";
  } else if (/\bSAFE_BET\b/i.test(text) || text.includes("SAFE_BET")) {
    semanticRes.action = "SAFE_BET";
  }

  const explicitChoice = text.match(/(?:选项|choice|答案|选择|最终答案|推导结果)[^\wA-D]*([A-D])\b/i) ||
                         text.match(/\[([A-D])\]/i) ||
                         text.match(/\b([A-D])\b/);
  if (explicitChoice) {
    semanticRes.choice = explicitChoice[1].toUpperCase();
  }

  const confExplicit = text.match(/(?:把握度|置信度|confidence|确信度)[^\d]*([0-9]*\.?[0-9]+)/i);
  if (confExplicit) {
    let val = parseFloat(confExplicit[1]);
    if (val > 1.0 && val <= 100.0) val = val / 100.0;
    semanticRes.confidence = Math.min(1.0, Math.max(0.0, val));
  }

  if (Object.keys(semanticRes).length > 0) {
    return semanticRes;
  }

  throw new Error("无法从输出中提取有效 JSON 结构");
}

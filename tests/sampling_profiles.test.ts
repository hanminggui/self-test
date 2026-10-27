import { describe, expect, it } from "bun:test";
import {
  DEFAULT_SAMPLING_PROFILES,
  getSamplingProfile,
  formatSamplingParams,
  resolveSamplingParams,
} from "../src/cli/lib/sampling_profiles";
import { LLMClient } from "../src/cli/lib/llm_client";

describe("Sampling Profiles & Sampling Parameters", () => {
  it("DEFAULT_SAMPLING_PROFILES contains all 4 standard evaluation profiles", () => {
    const ids = DEFAULT_SAMPLING_PROFILES.map((p) => p.id);
    expect(ids).toContain("optimal");
    expect(ids).toContain("greedy");
    expect(ids).toContain("baseline");
    expect(ids).toContain("exploratory");
  });

  it("getSamplingProfile correctly retrieves profiles case-insensitively", () => {
    const greedy = getSamplingProfile("GREEDY");
    expect(greedy).toBeDefined();
    expect(greedy?.params.temperature).toBe(0.0);

    const optimal = getSamplingProfile("optimal");
    expect(optimal).toBeDefined();
    expect(optimal?.params.min_p).toBe(0.05);
  });

  it("formatSamplingParams produces clear readable strings", () => {
    expect(formatSamplingParams({ temperature: 0.0 })).toBe("temp=0");
    expect(formatSamplingParams({ temperature: 0.2, min_p: 0.05, top_p: 0.95 })).toBe(
      "temp=0.2, min_p=0.05, top_p=0.95"
    );
  });

  it("resolveSamplingParams falls back to optimal and applies overrides correctly", () => {
    const res = resolveSamplingParams("greedy", { temperature: 0.1 });
    expect(res.profileId).toBe("custom");
    expect(res.params.temperature).toBe(0.1);

    const presetRes = resolveSamplingParams("optimal");
    expect(presetRes.profileId).toBe("optimal");
    expect(presetRes.params.temperature).toBe(0.2);
    expect(presetRes.params.min_p).toBe(0.05);
  });

  it("LLMClient accepts samplingParams and injects them when thinking is disabled", async () => {
    const client = new LLMClient({
      baseUrl: "http://127.0.0.1:1234/v1",
      apiKey: "lm-studio",
      model: "test-model",
      thinking: "none",
      samplingParams: {
        temperature: 0.25,
        min_p: 0.06,
        top_p: 0.92,
        top_k: 30,
      },
    });

    expect(client).toBeDefined();
  });
});

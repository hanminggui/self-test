import { describe, expect, it } from "bun:test";
import {
  extractSessionIdFromUrl,
  buildSessionReportUrl,
} from "../src/frontend/utils/sessionRoute";

describe("Session Route & Permalink Extraction Suite", () => {
  it("通过 Query 参数 ?session_id= 解析目标会话 ID", () => {
    expect(extractSessionIdFromUrl("/", "?session_id=sess_123456", "")).toBe("sess_123456");
    expect(extractSessionIdFromUrl("/", "?session=sess_abc789", "")).toBe("sess_abc789");
    expect(extractSessionIdFromUrl("/", "?report=sess_report_999", "")).toBe("sess_report_999");
    expect(extractSessionIdFromUrl("/", "?id=sess_id_001", "")).toBe("sess_id_001");
  });

  it("通过 Path 路径 /report/:id 专用路由解析", () => {
    expect(extractSessionIdFromUrl("/report/sess_xyz123", "", "")).toBe("sess_xyz123");
    expect(extractSessionIdFromUrl("/report/sess_998877/", "", "")).toBe("sess_998877");
  });

  it("通过兼容路径 /session/:id 与 /session/:id/report 解析", () => {
    expect(extractSessionIdFromUrl("/session/sess_alpha_1", "", "")).toBe("sess_alpha_1");
    expect(extractSessionIdFromUrl("/session/sess_alpha_2/report", "", "")).toBe("sess_alpha_2");
    expect(extractSessionIdFromUrl("/result/sess_result_42", "", "")).toBe("sess_result_42");
  });

  it("通过 Hash 路由 #/report/:id 解析", () => {
    expect(extractSessionIdFromUrl("/", "", "#/report/sess_hash_555")).toBe("sess_hash_555");
    expect(extractSessionIdFromUrl("/", "", "#session_id=sess_hash_666")).toBe("sess_hash_666");
  });

  it("无匹配参数时返回 null", () => {
    expect(extractSessionIdFromUrl("/", "", "")).toBeNull();
    expect(extractSessionIdFromUrl("/admin", "", "")).toBeNull();
    expect(extractSessionIdFromUrl("/", "?other=value", "")).toBeNull();
  });

  it("buildSessionReportUrl 组装合法的永久专属 URL", () => {
    const url = buildSessionReportUrl("sess_demo_100", "http://localhost:8000");
    expect(url).toBe("http://localhost:8000/report/sess_demo_100");
  });
});

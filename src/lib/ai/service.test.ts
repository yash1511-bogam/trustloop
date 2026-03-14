import { describe, it, expect } from "vitest";

// Must mock server-only before importing
vi.mock("server-only", () => ({}));

import { parseTriageResult } from "@/lib/ai/service";

describe("parseTriageResult", () => {
  it("parses valid JSON response", () => {
    const raw = JSON.stringify({
      severity: "P1",
      category: "HALLUCINATION",
      summary: "Model hallucinated customer data",
      nextSteps: ["Disable model", "Notify customers"],
    });
    const result = parseTriageResult(raw);
    expect(result.severity).toBe("P1");
    expect(result.category).toBe("HALLUCINATION");
    expect(result.summary).toBe("Model hallucinated customer data");
    expect(result.nextSteps).toEqual(["Disable model", "Notify customers"]);
  });

  it("extracts JSON from markdown code block", () => {
    const raw = '```json\n{"severity":"P2","category":"LATENCY","summary":"Slow","nextSteps":["Check"]}\n```';
    const result = parseTriageResult(raw);
    expect(result.severity).toBe("P2");
    expect(result.category).toBe("LATENCY");
  });

  it("normalizes severity values", () => {
    expect(parseTriageResult('{"severity":"p1"}').severity).toBe("P1");
    expect(parseTriageResult('{"severity":"p2"}').severity).toBe("P2");
    expect(parseTriageResult('{"severity":"p3"}').severity).toBe("P3");
    expect(parseTriageResult('{"severity":"unknown"}').severity).toBe("P3");
  });

  it("normalizes category values", () => {
    expect(parseTriageResult('{"category":"hallucination"}').category).toBe("HALLUCINATION");
    expect(parseTriageResult('{"category":"data-drift"}').category).toBe("DATA_DRIFT");
    expect(parseTriageResult('{"category":"nonsense"}').category).toBe("OTHER");
  });

  it("defaults missing fields", () => {
    const result = parseTriageResult("{}");
    expect(result.severity).toBe("P3");
    expect(result.category).toBe("OTHER");
    expect(result.summary).toBe("No summary provided.");
    expect(result.nextSteps).toEqual(["Review incident details and confirm owner."]);
  });

  it("truncates summary to 1000 chars", () => {
    const long = "x".repeat(2000);
    const result = parseTriageResult(JSON.stringify({ summary: long }));
    expect(result.summary.length).toBe(1000);
  });

  it("limits nextSteps to 6 items", () => {
    const steps = Array.from({ length: 10 }, (_, i) => `Step ${i}`);
    const result = parseTriageResult(JSON.stringify({ nextSteps: steps }));
    expect(result.nextSteps.length).toBe(6);
  });

  it("throws on response with no JSON", () => {
    expect(() => parseTriageResult("No JSON here at all")).toThrow();
  });
});

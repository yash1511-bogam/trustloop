import { describe, it, expect } from "vitest";
import {
  mapGenericWebhook,
  mapDatadogWebhook,
  mapPagerDutyWebhook,
  mapSentryWebhook,
  mapLangfuseWebhook,
  mapHeliconeWebhook,
  mapArizePhoenixWebhook,
  mapBraintrustWebhook,
} from "@/lib/webhook-mappers";

describe("mapGenericWebhook", () => {
  it("maps title and description", () => {
    const r = mapGenericWebhook({ title: "Alert", description: "Something broke" });
    expect(r.title).toBe("Alert");
    expect(r.description).toBe("Something broke");
    expect(r.channel).toBe("API");
  });

  it("defaults title when empty", () => {
    expect(mapGenericWebhook({}).title).toBe("Webhook incident");
  });

  it("normalizes severity", () => {
    expect(mapGenericWebhook({ severity: "critical" }).severity).toBe("P1");
    expect(mapGenericWebhook({ severity: "high" }).severity).toBe("P2");
    expect(mapGenericWebhook({ severity: "low" }).severity).toBe("P3");
  });
});

describe("mapDatadogWebhook", () => {
  it("maps event_title and event_msg", () => {
    const r = mapDatadogWebhook({ event_title: "CPU spike", event_msg: "CPU > 90%" });
    expect(r.title).toBe("CPU spike");
    expect(r.description).toBe("CPU > 90%");
  });

  it("defaults on empty payload", () => {
    const r = mapDatadogWebhook({});
    expect(r.title).toBe("Datadog alert");
    expect(r.severity).toBe("P3");
  });

  it("maps event_id as sourceTicketRef", () => {
    const r = mapDatadogWebhook({ event_id: "dd-123" });
    expect(r.sourceTicketRef).toBe("dd-123");
  });
});

describe("mapPagerDutyWebhook", () => {
  it("maps incident from messages array", () => {
    const r = mapPagerDutyWebhook({
      messages: [{ incident: { title: "PD Alert", urgency: "high", id: "PD-1" } }],
    });
    expect(r.title).toBe("PD Alert");
    expect(r.severity).toBe("P1");
    expect(r.sourceTicketRef).toBe("PD-1");
  });

  it("defaults on empty payload", () => {
    const r = mapPagerDutyWebhook({});
    expect(r.title).toBe("PagerDuty incident trigger");
    expect(r.severity).toBe("P2");
  });
});

describe("mapSentryWebhook", () => {
  it("maps issue data", () => {
    const r = mapSentryWebhook({
      issue_title: "TypeError",
      data: { level: "fatal", culprit: "app.js" },
      issue_id: "SENTRY-1",
    });
    expect(r.title).toBe("TypeError");
    expect(r.severity).toBe("P1");
    expect(r.sourceTicketRef).toBe("SENTRY-1");
  });

  it("defaults on empty payload", () => {
    const r = mapSentryWebhook({});
    expect(r.title).toBe("Sentry issue");
  });
});

describe("mapLangfuseWebhook", () => {
  it("infers HALLUCINATION from title", () => {
    const r = mapLangfuseWebhook({ title: "Hallucination detected in trace", severity: "P1" });
    expect(r.title).toBe("Hallucination detected in trace");
    expect(r.severity).toBe("P1");
    expect(r.category).toBe("HALLUCINATION");
  });

  it("infers LATENCY from event type", () => {
    const r = mapLangfuseWebhook({ title: "Slow response", eventType: "latency_alert" });
    expect(r.category).toBe("LATENCY");
  });

  it("defaults to MODEL_DEGRADATION on empty payload", () => {
    const r = mapLangfuseWebhook({});
    expect(r.title).toBe("Langfuse anomaly");
    expect(r.severity).toBe("P2");
    expect(r.category).toBe("MODEL_DEGRADATION");
  });
});

describe("mapHeliconeWebhook", () => {
  it("infers LATENCY from default", () => {
    const r = mapHeliconeWebhook({ title: "Cost spike", severity: "P1" });
    expect(r.title).toBe("Cost spike");
    // "cost" in title → OTHER
    expect(r.category).toBe("OTHER");
  });

  it("infers MODEL_DEGRADATION from error rate", () => {
    const r = mapHeliconeWebhook({ title: "Error rate spike", alertType: "error_rate" });
    expect(r.category).toBe("MODEL_DEGRADATION");
  });

  it("defaults to LATENCY on empty payload", () => {
    const r = mapHeliconeWebhook({});
    expect(r.title).toBe("Helicone alert");
    expect(r.severity).toBe("P2");
    expect(r.category).toBe("LATENCY");
  });
});

describe("mapArizePhoenixWebhook", () => {
  it("infers HALLUCINATION from title", () => {
    const r = mapArizePhoenixWebhook({ title: "Hallucination spike detected", severity: "P1" });
    expect(r.category).toBe("HALLUCINATION");
    expect(r.severity).toBe("P1");
  });

  it("defaults to MODEL_DEGRADATION on empty payload", () => {
    const r = mapArizePhoenixWebhook({});
    expect(r.title).toBe("Arize Phoenix alert");
    expect(r.category).toBe("MODEL_DEGRADATION");
  });
});

describe("mapBraintrustWebhook", () => {
  it("infers MODEL_DEGRADATION from regression", () => {
    const r = mapBraintrustWebhook({ title: "Score regression in eval", experiment_id: "exp-1" });
    expect(r.category).toBe("MODEL_DEGRADATION");
    expect(r.sourceTicketRef).toBe("exp-1");
  });

  it("defaults on empty payload", () => {
    const r = mapBraintrustWebhook({});
    expect(r.title).toBe("Braintrust eval alert");
    expect(r.severity).toBe("P2");
  });
});

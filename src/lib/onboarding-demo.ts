import {
  AIIncidentCategory,
  EventType,
  IncidentChannel,
  IncidentSeverity,
  IncidentStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

type SampleIncident = {
  title: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  channel: IncidentChannel;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: AIIncidentCategory;
  modelVersion?: string;
  sourceTicketRef?: string;
  summary?: string;
  events: Array<{
    eventType: EventType;
    body: string;
  }>;
};

export const DEMO_TRIAGE_LIMIT = 3;

const SAMPLE_INCIDENTS: SampleIncident[] = [
  {
    title: "Support copilot promised an unsupported refund exception",
    description:
      "A support escalation showed the assistant promising a refund workflow that product policy does not allow. Customers received conflicting guidance in chat.",
    customerName: "Northstar Labs",
    customerEmail: "ops@northstarlabs.example",
    channel: IncidentChannel.CHAT,
    severity: IncidentSeverity.P2,
    status: IncidentStatus.INVESTIGATING,
    category: AIIncidentCategory.HALLUCINATION,
    modelVersion: "assistant-prod-v42",
    sourceTicketRef: "TL-DEMO-101",
    summary:
      "Likely retrieval mismatch after policy knowledge base drift. Support paused automated chat replies for refund intents.",
    events: [
      {
        eventType: EventType.CREATED,
        body: "Demo incident created from customer support escalation.",
      },
      {
        eventType: EventType.NOTE,
        body: "Support paused automated refund-policy replies while the team validates retrieval freshness.",
      },
    ],
  },
  {
    title: "Inference API error rate climbed above 8%",
    description:
      "Monitoring detected elevated 503s on the inference endpoint and sustained latency spikes for production traffic. Customer requests are intermittently failing.",
    customerName: "Vertex Health",
    customerEmail: "sre@vertexhealth.example",
    channel: IncidentChannel.API,
    severity: IncidentSeverity.P1,
    status: IncidentStatus.NEW,
    category: AIIncidentCategory.AVAILABILITY,
    modelVersion: "inference-gateway-2026-03-01",
    sourceTicketRef: "TL-DEMO-102",
    events: [
      {
        eventType: EventType.CREATED,
        body: "Demo incident logged from synthetic monitoring and customer reports.",
      },
    ],
  },
  {
    title: "Safety classifier started flagging benign content",
    description:
      "A model rollout caused the moderation layer to over-block safe prompts, reducing successful completions for onboarding workflows.",
    customerName: "Mosaic Cloud",
    customerEmail: "team@mosaiccloud.example",
    channel: IncidentChannel.EMAIL,
    severity: IncidentSeverity.P3,
    status: IncidentStatus.NEW,
    category: AIIncidentCategory.MODEL_DEGRADATION,
    modelVersion: "moderation-v18",
    sourceTicketRef: "TL-DEMO-103",
    summary:
      "Recent threshold tuning likely overfit to abuse samples and is now rejecting normal customer prompts.",
    events: [
      {
        eventType: EventType.CREATED,
        body: "Demo incident created after customer onboarding complaints about false-positive blocking.",
      },
    ],
  },
];

export async function createSampleIncidentsForWorkspace(
  executor: PrismaExecutor,
  input: {
    workspaceId: string;
    ownerUserId: string;
  },
): Promise<number> {
  if (
    typeof executor.incident?.count !== "function" ||
    typeof executor.incident?.create !== "function"
  ) {
    return 0;
  }

  const existingCount = await executor.incident.count({
    where: { workspaceId: input.workspaceId },
  });
  if (existingCount > 0) {
    return 0;
  }

  let createdCount = 0;

  for (const sample of SAMPLE_INCIDENTS) {
    const incident = await executor.incident.create({
      data: {
        workspaceId: input.workspaceId,
        ownerUserId: input.ownerUserId,
        title: sample.title,
        description: sample.description,
        customerName: sample.customerName,
        customerEmail: sample.customerEmail,
        channel: sample.channel,
        severity: sample.severity,
        status: sample.status,
        category: sample.category,
        modelVersion: sample.modelVersion,
        sourceTicketRef: sample.sourceTicketRef,
        summary: sample.summary,
        firstRespondedAt:
          sample.status !== IncidentStatus.NEW ? new Date() : null,
      },
    });

    if (sample.events.length > 0) {
      await executor.incidentEvent.createMany({
        data: sample.events.map((event) => ({
          incidentId: incident.id,
          actorUserId: input.ownerUserId,
          eventType: event.eventType,
          body: event.body,
        })),
      });
    }

    createdCount += 1;
  }

  return createdCount;
}

export async function countWorkspaceTriageRuns(
  executor: PrismaExecutor,
  workspaceId: string,
): Promise<number> {
  if (typeof executor.incidentEvent?.count !== "function") {
    return DEMO_TRIAGE_LIMIT;
  }

  return executor.incidentEvent.count({
    where: {
      eventType: EventType.TRIAGE_RUN,
      incident: {
        workspaceId,
      },
    },
  });
}

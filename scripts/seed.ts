import "dotenv/config";
import {
  AIIncidentCategory,
  AiProvider,
  EventType,
  IncidentChannel,
  IncidentSeverity,
  IncidentStatus,
  Role,
  WorkflowType,
} from "@prisma/client";
import { refreshWorkspaceReadModels } from "../src/lib/read-models";
import { prisma } from "../src/lib/prisma";

const DEMO_EMAIL = "demo@trustloop.local";
const DEMO_STYTCH_USER_ID = process.env.SEED_STYTCH_USER_ID ?? "stytch-demo-user";

async function seed(): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { email: DEMO_EMAIL },
    include: { workspace: true },
  });

  if (existing) {
    console.log(`Demo user already exists in workspace ${existing.workspace.name}`);
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: "Acme AI Apps" },
    });

    const user = await tx.user.create({
      data: {
        workspaceId: workspace.id,
        name: "Demo Operator",
        email: DEMO_EMAIL,
        role: Role.OWNER,
        stytchUserId: DEMO_STYTCH_USER_ID,
      },
    });

    await tx.workspaceQuota.create({
      data: {
        workspaceId: workspace.id,
      },
    });

    await tx.workflowSetting.createMany({
      data: [
        {
          workspaceId: workspace.id,
          workflowType: WorkflowType.INCIDENT_TRIAGE,
          provider: AiProvider.OPENAI,
          model: "gpt-4o-mini",
        },
        {
          workspaceId: workspace.id,
          workflowType: WorkflowType.CUSTOMER_UPDATE,
          provider: AiProvider.OPENAI,
          model: "gpt-4o-mini",
        },
      ],
    });

    const incidentA = await tx.incident.create({
      data: {
        workspaceId: workspace.id,
        title: "Copilot promised unsupported refund exception",
        description:
          "A customer reported that our in-app copilot promised a refund policy exception that does not exist. Ticket escalated from support.",
        customerName: "Northstar Labs",
        customerEmail: "ops@northstarlabs.example",
        channel: IncidentChannel.CHAT,
        status: IncidentStatus.INVESTIGATING,
        severity: IncidentSeverity.P2,
        category: AIIncidentCategory.HALLUCINATION,
        ownerUserId: user.id,
        sourceTicketRef: "INT-44931",
        modelVersion: "assistant-prod-v42",
        summary:
          "Likely retrieval mismatch after KB update; response template drift suspected.",
      },
    });

    await tx.incidentEvent.createMany({
      data: [
        {
          incidentId: incidentA.id,
          actorUserId: user.id,
          eventType: EventType.CREATED,
          body: "Incident created from support escalation.",
        },
        {
          incidentId: incidentA.id,
          actorUserId: user.id,
          eventType: EventType.NOTE,
          body: "Support paused auto-replies for refund-policy intents.",
        },
      ],
    });

    const incidentB = await tx.incident.create({
      data: {
        workspaceId: workspace.id,
        title: "Onboarding assistant returned stale pricing tier",
        description:
          "Trial user screenshot shows outdated Enterprise seat minimum in onboarding assistant response.",
        customerName: "Mosaic Cloud",
        customerEmail: "team@mosaiccloud.example",
        channel: IncidentChannel.EMAIL,
        status: IncidentStatus.NEW,
        severity: IncidentSeverity.P3,
        category: AIIncidentCategory.DATA_DRIFT,
        ownerUserId: user.id,
        sourceTicketRef: "INT-44938",
        modelVersion: "assistant-prod-v42",
      },
    });

    await tx.incidentEvent.create({
      data: {
        incidentId: incidentB.id,
        actorUserId: user.id,
        eventType: EventType.CREATED,
        body: "Incident logged after customer onboarding ticket.",
      },
    });

    await tx.incident.create({
      data: {
        workspaceId: workspace.id,
        title: "Inference API returning 503 for 12% of requests",
        description: "Monitoring detected elevated 503 error rate on the inference endpoint. Latency p99 spiked to 8s. Affects production model serving.",
        customerName: "Vertex Health",
        customerEmail: "sre@vertexhealth.example",
        channel: IncidentChannel.API,
        status: IncidentStatus.NEW,
        severity: IncidentSeverity.P1,
        category: AIIncidentCategory.AVAILABILITY,
        ownerUserId: user.id,
        sourceTicketRef: "DD-78421",
      },
    });

    await tx.incident.create({
      data: {
        workspaceId: workspace.id,
        title: "Bias detected in loan approval model outputs",
        description: "Fairness audit flagged statistically significant disparate impact in approval rates across demographic groups for the Q1 model release.",
        channel: IncidentChannel.EMAIL,
        status: IncidentStatus.INVESTIGATING,
        severity: IncidentSeverity.P1,
        category: AIIncidentCategory.BIAS,
        ownerUserId: user.id,
      },
    });

    await tx.incident.create({
      data: {
        workspaceId: workspace.id,
        title: "Customer PII leaked in chatbot response",
        description: "A user reported seeing another customer's order details in a chatbot response. Likely context window contamination.",
        customerName: "SafeGuard Inc",
        customerEmail: "security@safeguard.example",
        channel: IncidentChannel.CHAT,
        status: IncidentStatus.MITIGATED,
        severity: IncidentSeverity.P1,
        category: AIIncidentCategory.DATA_PRIVACY,
        ownerUserId: user.id,
        sourceTicketRef: "SEC-2291",
      },
    });

    return { workspace, user };
  });

  await refreshWorkspaceReadModels(created.workspace.id);

  console.log("Seed complete.");
  console.log(`Workspace: ${created.workspace.name}`);
  console.log(`Demo email: ${DEMO_EMAIL}`);
  console.log(`Demo stytch user id: ${DEMO_STYTCH_USER_ID}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

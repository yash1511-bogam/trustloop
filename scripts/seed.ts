import bcrypt from "bcryptjs";
import {
  AiProvider,
  EventType,
  IncidentChannel,
  IncidentSeverity,
  IncidentStatus,
  Role,
  WorkflowType,
} from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const DEMO_EMAIL = "demo@trustloop.local";
const DEMO_PASSWORD = "demo12345";

async function seed(): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { email: DEMO_EMAIL },
    include: { workspace: true },
  });

  if (existing) {
    console.log(`Demo user already exists in workspace ${existing.workspace.name}`);
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const created = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: "Acme AI Apps" },
    });

    const user = await tx.user.create({
      data: {
        workspaceId: workspace.id,
        name: "Demo Operator",
        email: DEMO_EMAIL,
        passwordHash,
        role: Role.OWNER,
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
        category: "Policy hallucination",
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
        category: "Knowledge freshness",
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

    return { workspace, user };
  });

  console.log("Seed complete.");
  console.log(`Workspace: ${created.workspace.name}`);
  console.log(`Demo login: ${DEMO_EMAIL}`);
  console.log(`Demo password: ${DEMO_PASSWORD}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

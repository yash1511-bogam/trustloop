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

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3600_000);
}

async function seed(): Promise<void> {
  // Wipe existing demo data
  const existingUser = await prisma.user.findFirst({ where: { email: DEMO_EMAIL } });
  if (existingUser) {
    await prisma.workspace.delete({ where: { id: existingUser.workspaceId } });
    console.log("Cleared previous seed data.");
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: "Acme AI Apps",
      slug: "acme-ai",
      statusPageEnabled: true,
      planTier: "pro",
      timezone: "America/New_York",
    },
  });

  const owner = await prisma.user.create({
    data: {
      workspaceId: workspace.id,
      name: "Demo Operator",
      email: DEMO_EMAIL,
      role: Role.OWNER,
      stytchUserId: DEMO_STYTCH_USER_ID,
    },
  });

  await prisma.workspaceMembership.create({
    data: { workspaceId: workspace.id, userId: owner.id, role: Role.OWNER },
  });

  const agent = await prisma.user.create({
    data: {
      workspaceId: workspace.id,
      name: "Sarah Chen",
      email: "sarah@trustloop.local",
      role: Role.AGENT,
      stytchUserId: "stytch-sarah",
    },
  });

  await prisma.workspaceMembership.create({
    data: { workspaceId: workspace.id, userId: agent.id, role: Role.AGENT },
  });

  const manager = await prisma.user.create({
    data: {
      workspaceId: workspace.id,
      name: "James Park",
      email: "james@trustloop.local",
      role: Role.MANAGER,
      stytchUserId: "stytch-james",
    },
  });

  await prisma.workspaceMembership.create({
    data: { workspaceId: workspace.id, userId: manager.id, role: Role.MANAGER },
  });

  await prisma.workspaceQuota.create({ data: { workspaceId: workspace.id } });

  await prisma.workspaceSlaPolicy.create({
    data: {
      workspaceId: workspace.id,
      firstResponseHoursP1: 1,
      firstResponseHoursP2: 4,
      firstResponseHoursP3: 24,
      resolutionHoursP1: 4,
      resolutionHoursP2: 24,
      resolutionHoursP3: 72,
    },
  });

  await prisma.workflowSetting.createMany({
    data: [
      { workspaceId: workspace.id, workflowType: WorkflowType.INCIDENT_TRIAGE, provider: AiProvider.OPENAI, model: "gpt-4o-mini" },
      { workspaceId: workspace.id, workflowType: WorkflowType.CUSTOMER_UPDATE, provider: AiProvider.OPENAI, model: "gpt-4o-mini" },
    ],
  });

  // Tags
  const tagNames = ["model-regression", "customer-facing", "compliance", "infra", "prompt-safety"];
  const tags = await Promise.all(
    tagNames.map((name) => prisma.incidentTag.create({ data: { workspaceId: workspace.id, name } })),
  );

  console.log("Workspace, users, quotas, SLA, tags created.");

  // ── Incidents ──

  // 1. Resolved P2 — hallucination (12 days ago, resolved 10 days ago)
  const inc1 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "Copilot promised unsupported refund exception",
      description: "In-app copilot promised a refund policy exception that does not exist. Ticket escalated from support.",
      customerName: "Northstar Labs", customerEmail: "ops@northstarlabs.example",
      channel: IncidentChannel.CHAT, status: IncidentStatus.RESOLVED, severity: IncidentSeverity.P2,
      category: AIIncidentCategory.HALLUCINATION, ownerUserId: owner.id,
      sourceTicketRef: "INT-44931", modelVersion: "assistant-prod-v42",
      summary: "Retrieval mismatch after KB update; response template drift confirmed and patched.",
      triagedAt: daysAgo(12), resolvedAt: daysAgo(10), firstRespondedAt: daysAgo(12),
      firstCustomerUpdateAt: daysAgo(11), triageRunCount: 1, customerUpdateCount: 2,
      createdAt: daysAgo(12), updatedAt: daysAgo(10),
    },
  });

  // 2. Resolved P3 — data drift (9 days ago, resolved 7 days ago)
  const inc2 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "Onboarding assistant returned stale pricing tier",
      description: "Trial user screenshot shows outdated Enterprise seat minimum in onboarding assistant response.",
      customerName: "Mosaic Cloud", customerEmail: "team@mosaiccloud.example",
      channel: IncidentChannel.EMAIL, status: IncidentStatus.RESOLVED, severity: IncidentSeverity.P3,
      category: AIIncidentCategory.DATA_DRIFT, ownerUserId: agent.id,
      sourceTicketRef: "INT-44938", modelVersion: "assistant-prod-v42",
      summary: "Pricing KB was stale. Updated embeddings and verified output.",
      triagedAt: daysAgo(9), resolvedAt: daysAgo(7), firstRespondedAt: daysAgo(9),
      triageRunCount: 1, customerUpdateCount: 1,
      createdAt: daysAgo(9), updatedAt: daysAgo(7),
    },
  });

  // 3. Mitigated P1 — PII leak (3 days ago)
  const inc3 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "Customer PII leaked in chatbot response",
      description: "A user reported seeing another customer's order details in a chatbot response. Context window contamination.",
      customerName: "SafeGuard Inc", customerEmail: "security@safeguard.example",
      channel: IncidentChannel.CHAT, status: IncidentStatus.MITIGATED, severity: IncidentSeverity.P1,
      category: AIIncidentCategory.DATA_PRIVACY, ownerUserId: owner.id,
      sourceTicketRef: "SEC-2291",
      summary: "Session isolation bug in context window. Hotfix deployed, monitoring.",
      triagedAt: daysAgo(3), firstRespondedAt: hoursAgo(70),
      firstCustomerUpdateAt: hoursAgo(68), triageRunCount: 2, customerUpdateCount: 3,
      createdAt: daysAgo(3), updatedAt: hoursAgo(6),
    },
  });

  // 4. Investigating P1 — bias (2 days ago)
  const inc4 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "Bias detected in loan approval model outputs",
      description: "Fairness audit flagged statistically significant disparate impact in approval rates across demographic groups.",
      channel: IncidentChannel.EMAIL, status: IncidentStatus.INVESTIGATING, severity: IncidentSeverity.P1,
      category: AIIncidentCategory.BIAS, ownerUserId: manager.id,
      triagedAt: daysAgo(2), firstRespondedAt: daysAgo(2), triageRunCount: 1,
      createdAt: daysAgo(2), updatedAt: hoursAgo(4),
    },
  });

  // 5. New P1 — availability (1 day ago)
  const inc5 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "Inference API returning 503 for 12% of requests",
      description: "Monitoring detected elevated 503 error rate on inference endpoint. Latency p99 spiked to 8s.",
      customerName: "Vertex Health", customerEmail: "sre@vertexhealth.example",
      channel: IncidentChannel.API, status: IncidentStatus.NEW, severity: IncidentSeverity.P1,
      category: AIIncidentCategory.AVAILABILITY, ownerUserId: owner.id,
      sourceTicketRef: "DD-78421",
      createdAt: daysAgo(1), updatedAt: hoursAgo(2),
    },
  });

  // 6. Resolved P2 — prompt injection (14 days ago, resolved 13 days ago)
  const inc6 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "Prompt injection bypassed content filter",
      description: "Red team exercise found that a crafted prompt could bypass the output safety filter and return restricted content.",
      channel: IncidentChannel.OTHER, status: IncidentStatus.RESOLVED, severity: IncidentSeverity.P2,
      category: AIIncidentCategory.PROMPT_INJECTION, ownerUserId: agent.id,
      summary: "Added input sanitization layer and updated filter rules.",
      triagedAt: daysAgo(14), resolvedAt: daysAgo(13), firstRespondedAt: daysAgo(14),
      triageRunCount: 1, customerUpdateCount: 0,
      createdAt: daysAgo(14), updatedAt: daysAgo(13),
    },
  });

  // 7. Investigating P2 — model degradation (today)
  const inc7 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "Summarization quality dropped after model update",
      description: "Customer reports indicate summary outputs are less accurate since the v43 model rollout yesterday.",
      customerName: "DataPipe Analytics", customerEmail: "eng@datapipe.example",
      channel: IncidentChannel.SLACK, status: IncidentStatus.INVESTIGATING, severity: IncidentSeverity.P2,
      category: AIIncidentCategory.MODEL_DEGRADATION, ownerUserId: agent.id,
      sourceTicketRef: "SLACK-1192", modelVersion: "assistant-prod-v43",
      triagedAt: hoursAgo(3), firstRespondedAt: hoursAgo(3), triageRunCount: 1,
      createdAt: hoursAgo(5), updatedAt: hoursAgo(1),
    },
  });

  // 8. Resolved P3 — latency (6 days ago, resolved 5 days ago)
  const inc8 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "Embedding search latency exceeded 4s p95",
      description: "Vector search latency spiked after index rebuild. Affecting autocomplete and semantic search features.",
      channel: IncidentChannel.API, status: IncidentStatus.RESOLVED, severity: IncidentSeverity.P3,
      category: AIIncidentCategory.LATENCY, ownerUserId: manager.id,
      summary: "Index shard rebalance completed. Latency back to normal.",
      triagedAt: daysAgo(6), resolvedAt: daysAgo(5), firstRespondedAt: daysAgo(6),
      triageRunCount: 1, customerUpdateCount: 1,
      createdAt: daysAgo(6), updatedAt: daysAgo(5),
    },
  });

  // 9. New P3 — compliance (today)
  const inc9 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "EU customer data processed in US region",
      description: "Audit log review found 3 EU customer requests routed to us-east-1 inference endpoint instead of eu-west-1.",
      customerName: "EuroTech GmbH", customerEmail: "dpo@eurotech.example",
      channel: IncidentChannel.EMAIL, status: IncidentStatus.NEW, severity: IncidentSeverity.P3,
      category: AIIncidentCategory.COMPLIANCE, ownerUserId: owner.id,
      createdAt: hoursAgo(2), updatedAt: hoursAgo(1),
    },
  });

  // 10. Resolved P1 — output filter failure (8 days ago, resolved 7 days ago)
  const inc10 = await prisma.incident.create({
    data: {
      workspaceId: workspace.id, title: "Safety filter failed to block harmful medical advice",
      description: "User reported the health assistant provided specific dosage recommendations that should have been blocked.",
      customerName: "MedAssist Pro", customerEmail: "safety@medassist.example",
      channel: IncidentChannel.CHAT, status: IncidentStatus.RESOLVED, severity: IncidentSeverity.P1,
      category: AIIncidentCategory.OUTPUT_FILTER_FAILURE, ownerUserId: owner.id,
      sourceTicketRef: "SAFE-441",
      summary: "Filter regex missed new pattern. Updated rules and added regression tests.",
      triagedAt: daysAgo(8), resolvedAt: daysAgo(7), firstRespondedAt: daysAgo(8),
      firstCustomerUpdateAt: daysAgo(8), triageRunCount: 2, customerUpdateCount: 2,
      createdAt: daysAgo(8), updatedAt: daysAgo(7),
    },
  });

  const allIncidents = [inc1, inc2, inc3, inc4, inc5, inc6, inc7, inc8, inc9, inc10];
  console.log(`Created ${allIncidents.length} incidents.`);


  // ── Events ──
  const eventData = [
    { incidentId: inc1.id, actorUserId: owner.id, eventType: EventType.CREATED, body: "Incident created from support escalation.", createdAt: daysAgo(12) },
    { incidentId: inc1.id, actorUserId: owner.id, eventType: EventType.TRIAGE_RUN, body: "AI triage: P2 hallucination, retrieval mismatch suspected.", createdAt: daysAgo(12) },
    { incidentId: inc1.id, actorUserId: owner.id, eventType: EventType.NOTE, body: "Support paused auto-replies for refund-policy intents.", createdAt: daysAgo(11) },
    { incidentId: inc1.id, actorUserId: owner.id, eventType: EventType.CUSTOMER_UPDATE, body: "Notified Northstar Labs of fix timeline.", createdAt: daysAgo(11) },
    { incidentId: inc1.id, actorUserId: owner.id, eventType: EventType.STATUS_CHANGED, body: "Status changed to RESOLVED.", createdAt: daysAgo(10) },
    { incidentId: inc2.id, actorUserId: agent.id, eventType: EventType.CREATED, body: "Incident logged after customer onboarding ticket.", createdAt: daysAgo(9) },
    { incidentId: inc2.id, actorUserId: agent.id, eventType: EventType.TRIAGE_RUN, body: "AI triage: P3 data drift, stale pricing KB.", createdAt: daysAgo(9) },
    { incidentId: inc2.id, actorUserId: agent.id, eventType: EventType.STATUS_CHANGED, body: "Status changed to RESOLVED.", createdAt: daysAgo(7) },
    { incidentId: inc3.id, actorUserId: owner.id, eventType: EventType.CREATED, body: "Security report: PII leak in chatbot.", createdAt: daysAgo(3) },
    { incidentId: inc3.id, actorUserId: owner.id, eventType: EventType.TRIAGE_RUN, body: "AI triage: P1 data privacy, session isolation bug.", createdAt: daysAgo(3) },
    { incidentId: inc3.id, actorUserId: owner.id, eventType: EventType.CUSTOMER_UPDATE, body: "Notified SafeGuard of containment steps.", createdAt: daysAgo(3) },
    { incidentId: inc3.id, actorUserId: owner.id, eventType: EventType.NOTE, body: "Hotfix deployed. Monitoring for recurrence.", createdAt: daysAgo(2) },
    { incidentId: inc4.id, actorUserId: manager.id, eventType: EventType.CREATED, body: "Fairness audit flagged bias in loan model.", createdAt: daysAgo(2) },
    { incidentId: inc4.id, actorUserId: manager.id, eventType: EventType.TRIAGE_RUN, body: "AI triage: P1 bias, disparate impact confirmed.", createdAt: daysAgo(2) },
    { incidentId: inc5.id, actorUserId: owner.id, eventType: EventType.CREATED, body: "Datadog alert: 503 spike on inference API.", createdAt: daysAgo(1) },
    { incidentId: inc6.id, actorUserId: agent.id, eventType: EventType.CREATED, body: "Red team found prompt injection bypass.", createdAt: daysAgo(14) },
    { incidentId: inc6.id, actorUserId: agent.id, eventType: EventType.TRIAGE_RUN, body: "AI triage: P2 prompt injection.", createdAt: daysAgo(14) },
    { incidentId: inc6.id, actorUserId: agent.id, eventType: EventType.STATUS_CHANGED, body: "Status changed to RESOLVED.", createdAt: daysAgo(13) },
    { incidentId: inc7.id, actorUserId: agent.id, eventType: EventType.CREATED, body: "Slack report: summarization quality drop.", createdAt: hoursAgo(5) },
    { incidentId: inc7.id, actorUserId: agent.id, eventType: EventType.TRIAGE_RUN, body: "AI triage: P2 model degradation after v43 rollout.", createdAt: hoursAgo(3) },
    { incidentId: inc8.id, actorUserId: manager.id, eventType: EventType.CREATED, body: "Latency alert on embedding search.", createdAt: daysAgo(6) },
    { incidentId: inc8.id, actorUserId: manager.id, eventType: EventType.STATUS_CHANGED, body: "Status changed to RESOLVED.", createdAt: daysAgo(5) },
    { incidentId: inc9.id, actorUserId: owner.id, eventType: EventType.CREATED, body: "Audit found EU data routed to US region.", createdAt: hoursAgo(2) },
    { incidentId: inc10.id, actorUserId: owner.id, eventType: EventType.CREATED, body: "Safety filter bypass reported.", createdAt: daysAgo(8) },
    { incidentId: inc10.id, actorUserId: owner.id, eventType: EventType.TRIAGE_RUN, body: "AI triage: P1 output filter failure.", createdAt: daysAgo(8) },
    { incidentId: inc10.id, actorUserId: owner.id, eventType: EventType.CUSTOMER_UPDATE, body: "Notified MedAssist of remediation.", createdAt: daysAgo(8) },
    { incidentId: inc10.id, actorUserId: owner.id, eventType: EventType.STATUS_CHANGED, body: "Status changed to RESOLVED.", createdAt: daysAgo(7) },
  ];
  await prisma.incidentEvent.createMany({ data: eventData });
  console.log(`Created ${eventData.length} events.`);

  // ── Tag assignments ──
  const tagAssignments = [
    { incidentId: inc1.id, tagId: tags[1].id, assignedByUserId: owner.id },
    { incidentId: inc3.id, tagId: tags[2].id, assignedByUserId: owner.id },
    { incidentId: inc3.id, tagId: tags[1].id, assignedByUserId: owner.id },
    { incidentId: inc4.id, tagId: tags[2].id, assignedByUserId: manager.id },
    { incidentId: inc5.id, tagId: tags[3].id, assignedByUserId: owner.id },
    { incidentId: inc6.id, tagId: tags[4].id, assignedByUserId: agent.id },
    { incidentId: inc7.id, tagId: tags[0].id, assignedByUserId: agent.id },
    { incidentId: inc9.id, tagId: tags[2].id, assignedByUserId: owner.id },
    { incidentId: inc10.id, tagId: tags[4].id, assignedByUserId: owner.id },
    { incidentId: inc10.id, tagId: tags[1].id, assignedByUserId: owner.id },
  ];
  await prisma.incidentTagAssignment.createMany({ data: tagAssignments });

  // ── Status updates (customer-facing) ──
  const statusUpdates = [
    { workspaceId: workspace.id, incidentId: inc1.id, body: "We identified the root cause as a retrieval mismatch in our knowledge base. A fix is being deployed.", publishedAt: daysAgo(11), createdByUserId: owner.id },
    { workspaceId: workspace.id, incidentId: inc1.id, body: "The fix has been deployed and verified. This incident is now resolved.", publishedAt: daysAgo(10), createdByUserId: owner.id },
    { workspaceId: workspace.id, incidentId: inc3.id, body: "We are investigating a data isolation issue. Affected sessions have been terminated.", publishedAt: daysAgo(3), createdByUserId: owner.id },
    { workspaceId: workspace.id, incidentId: inc3.id, body: "A hotfix has been deployed to prevent context window contamination. We are monitoring.", publishedAt: daysAgo(2), createdByUserId: owner.id },
    { workspaceId: workspace.id, incidentId: inc10.id, body: "We identified a gap in our safety filter rules. An emergency update has been pushed.", publishedAt: daysAgo(8), createdByUserId: owner.id },
    { workspaceId: workspace.id, incidentId: inc10.id, body: "Filter rules updated and regression tests added. Incident resolved.", publishedAt: daysAgo(7), createdByUserId: owner.id },
  ];
  await prisma.statusUpdate.createMany({ data: statusUpdates });

  // ── Analytics daily (14 days) ──
  const analyticsData = [
    { day: 14, created: 1, resolved: 0, open: 5, p1: 0, triage: 1, updates: 0 },
    { day: 13, created: 0, resolved: 1, open: 4, p1: 0, triage: 0, updates: 0 },
    { day: 12, created: 1, resolved: 0, open: 5, p1: 0, triage: 1, updates: 1 },
    { day: 11, created: 0, resolved: 0, open: 5, p1: 0, triage: 0, updates: 1 },
    { day: 10, created: 0, resolved: 1, open: 4, p1: 0, triage: 0, updates: 1 },
    { day: 9,  created: 1, resolved: 0, open: 5, p1: 0, triage: 1, updates: 0 },
    { day: 8,  created: 1, resolved: 0, open: 6, p1: 1, triage: 2, updates: 1 },
    { day: 7,  created: 0, resolved: 2, open: 4, p1: 0, triage: 0, updates: 1 },
    { day: 6,  created: 1, resolved: 0, open: 5, p1: 0, triage: 1, updates: 0 },
    { day: 5,  created: 0, resolved: 1, open: 4, p1: 0, triage: 0, updates: 1 },
    { day: 4,  created: 0, resolved: 0, open: 4, p1: 0, triage: 0, updates: 0 },
    { day: 3,  created: 1, resolved: 0, open: 5, p1: 1, triage: 2, updates: 1 },
    { day: 2,  created: 1, resolved: 0, open: 6, p1: 1, triage: 1, updates: 0 },
    { day: 1,  created: 1, resolved: 0, open: 7, p1: 1, triage: 0, updates: 0 },
    { day: 0,  created: 2, resolved: 0, open: 9, p1: 0, triage: 1, updates: 0 },
  ];
  await prisma.incidentAnalyticsDaily.createMany({
    data: analyticsData.map((d) => ({
      workspaceId: workspace.id,
      day: daysAgo(d.day),
      incidentsCreated: d.created,
      incidentsResolved: d.resolved,
      openAtEndOfDay: d.open,
      p1Created: d.p1,
      triageRuns: d.triage,
      customerUpdatesSent: d.updates,
      reminderEmailsSent: 0,
      mttrMinutesAvg: d.resolved > 0 ? Math.floor(Math.random() * 1200 + 300) : null,
    })),
  });
  console.log("Created 15 days of analytics data.");

  // ── Audit logs ──
  const auditData = [
    { action: "incident.create", targetType: "Incident", targetId: inc1.id, summary: "Created incident: Copilot promised unsupported refund exception", createdAt: daysAgo(12) },
    { action: "incident.triage", targetType: "Incident", targetId: inc1.id, summary: "Ran AI triage on incident", createdAt: daysAgo(12) },
    { action: "incident.resolve", targetType: "Incident", targetId: inc1.id, summary: "Resolved incident", createdAt: daysAgo(10) },
    { action: "incident.create", targetType: "Incident", targetId: inc3.id, summary: "Created incident: Customer PII leaked in chatbot response", createdAt: daysAgo(3) },
    { action: "incident.triage", targetType: "Incident", targetId: inc3.id, summary: "Ran AI triage on incident", createdAt: daysAgo(3) },
    { action: "incident.create", targetType: "Incident", targetId: inc5.id, summary: "Created incident: Inference API returning 503", createdAt: daysAgo(1) },
    { action: "workspace.update", targetType: "Workspace", targetId: workspace.id, summary: "Updated SLA policy", createdAt: daysAgo(10) },
    { action: "incident.create", targetType: "Incident", targetId: inc7.id, summary: "Created incident: Summarization quality dropped", createdAt: hoursAgo(5) },
  ];
  await prisma.auditLog.createMany({
    data: auditData.map((a) => ({ workspaceId: workspace.id, actorUserId: owner.id, ...a })),
  });

  // ── Reminder job logs ──
  await prisma.reminderJobLog.createMany({
    data: [
      { workspaceId: workspace.id, incidentId: inc3.id, status: "PROCESSED" as const, createdAt: daysAgo(2), processedAt: daysAgo(2) },
      { workspaceId: workspace.id, incidentId: inc4.id, status: "PROCESSED" as const, createdAt: daysAgo(1), processedAt: daysAgo(1) },
      { workspaceId: workspace.id, incidentId: inc5.id, status: "QUEUED" as const, createdAt: hoursAgo(1) },
    ],
  });

  // ── Maintenance window ──
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(6, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setUTCHours(8, 0, 0, 0);
  await prisma.maintenanceWindow.create({
    data: {
      workspaceId: workspace.id,
      title: "Scheduled model retraining window",
      body: "Inference endpoints may experience elevated latency during the retraining pipeline run.",
      startsAt: tomorrow,
      endsAt: tomorrowEnd,
      createdByUserId: owner.id,
    },
  });

  // ── Refresh read models (executive snapshot) ──
  await refreshWorkspaceReadModels(workspace.id);

  console.log("\nSeed complete.");
  console.log(`Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(`Demo email: ${DEMO_EMAIL}`);
  console.log(`Demo stytch user id: ${DEMO_STYTCH_USER_ID}`);
  console.log(`Incidents: ${allIncidents.length} (${allIncidents.filter(i => i.status === "RESOLVED").length} resolved)`);
  console.log(`Events: ${eventData.length}`);
  console.log(`Status updates: ${statusUpdates.length}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

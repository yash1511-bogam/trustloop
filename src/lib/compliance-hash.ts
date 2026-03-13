import { createHash } from "crypto";

/**
 * Compute a SHA-256 hash for an incident event, chaining from the previous event's hash.
 * This creates a tamper-evident hash chain — if any event is modified or removed,
 * all subsequent hashes will be invalid.
 */
export function computeEventHash(input: {
  previousHash: string | null;
  eventId: string;
  incidentId: string;
  eventType: string;
  body: string;
  actorUserId: string | null;
  createdAt: string;
}): string {
  const payload = [
    input.previousHash ?? "GENESIS",
    input.eventId,
    input.incidentId,
    input.eventType,
    input.body,
    input.actorUserId ?? "",
    input.createdAt,
  ].join("|");

  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Build a full hash chain for an ordered list of incident events.
 * Returns events with their computed hashes and chain validity.
 */
export function buildEventHashChain(
  events: Array<{
    id: string;
    incidentId: string;
    eventType: string;
    body: string;
    actorUserId: string | null;
    createdAt: Date;
  }>,
): Array<{
  eventId: string;
  hash: string;
  previousHash: string | null;
}> {
  let previousHash: string | null = null;
  return events.map((event) => {
    const hash = computeEventHash({
      previousHash,
      eventId: event.id,
      incidentId: event.incidentId,
      eventType: event.eventType,
      body: event.body,
      actorUserId: event.actorUserId,
      createdAt: event.createdAt.toISOString(),
    });
    const entry = { eventId: event.id, hash, previousHash };
    previousHash = hash;
    return entry;
  });
}

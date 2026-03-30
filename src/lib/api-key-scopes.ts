import type { NextRequest } from "next/server";

export const API_KEY_SCOPES = [
  "incidents:read",
  "incidents:write",
  "incidents:triage",
  "incidents:delete",
  "customer-updates:write",
  "customer-updates:approve",
  "status-updates:write",
  "settings:read",
  "settings:write",
  "webhooks:ingest",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_ASSIGNABLE_SCOPES = [
  "incidents:read",
  "incidents:write",
  "incidents:triage",
  "customer-updates:write",
  "status-updates:write",
  "webhooks:ingest",
] as const;

export type AssignableApiKeyScope = (typeof API_KEY_ASSIGNABLE_SCOPES)[number];

const API_KEY_SCOPE_METADATA: Record<
  ApiKeyScope,
  { label: string; description: string; assignable: boolean }
> = {
  "incidents:read": {
    label: "Read incidents",
    description: "List incidents, fetch incident detail, and read customer update drafts.",
    assignable: true,
  },
  "incidents:write": {
    label: "Create and edit incidents",
    description: "Create incidents, update incident fields, and add internal notes.",
    assignable: true,
  },
  "incidents:triage": {
    label: "Run AI triage",
    description: "Trigger AI triage on incidents through the API.",
    assignable: true,
  },
  "incidents:delete": {
    label: "Delete incidents",
    description: "Reserved for future API delete flows.",
    assignable: false,
  },
  "customer-updates:write": {
    label: "Draft customer updates",
    description: "Generate and manage customer-facing update drafts.",
    assignable: true,
  },
  "customer-updates:approve": {
    label: "Approve customer updates",
    description: "Reserved for future approval APIs.",
    assignable: false,
  },
  "status-updates:write": {
    label: "Publish status updates",
    description: "Publish status page updates for incidents.",
    assignable: true,
  },
  "settings:read": {
    label: "Read settings",
    description: "Reserved for future workspace settings APIs.",
    assignable: false,
  },
  "settings:write": {
    label: "Write settings",
    description: "Reserved for future workspace settings APIs.",
    assignable: false,
  },
  "webhooks:ingest": {
    label: "Authenticate webhook intake",
    description: "Use the key on TrustLoop webhook endpoints instead of a signed secret.",
    assignable: true,
  },
};

export const API_KEY_SCOPE_OPTIONS = API_KEY_SCOPES.map((scope) => ({
  id: scope,
  ...API_KEY_SCOPE_METADATA[scope],
}));

export const API_KEY_ASSIGNABLE_SCOPE_OPTIONS = API_KEY_SCOPE_OPTIONS.filter(
  (scope) => scope.assignable,
);

export const API_KEY_USAGE_PRESET_IDS = [
  "read_only",
  "incident_ingest",
  "incident_response",
  "webhook_ingest",
] as const;

export type ApiKeyUsagePresetId = (typeof API_KEY_USAGE_PRESET_IDS)[number];

export const DEFAULT_API_KEY_USAGE_PRESET = "incident_response" as const;

export const API_KEY_USAGE_PRESETS = [
  {
    id: "read_only",
    label: "Read-only",
    description: "Best for dashboards, exports, and systems that only need visibility.",
    scopes: ["incidents:read"],
  },
  {
    id: "incident_ingest",
    label: "Incident intake",
    description: "Create and update incidents from trusted internal automation.",
    scopes: ["incidents:read", "incidents:write"],
  },
  {
    id: "incident_response",
    label: "Incident response",
    description: "Read incidents, update them, run triage, and publish updates.",
    scopes: [
      "incidents:read",
      "incidents:write",
      "incidents:triage",
      "customer-updates:write",
      "status-updates:write",
    ],
  },
  {
    id: "webhook_ingest",
    label: "Webhook intake",
    description: "Authenticate direct webhook delivery into TrustLoop endpoints.",
    scopes: ["webhooks:ingest"],
  },
] as const satisfies ReadonlyArray<{
  id: ApiKeyUsagePresetId;
  label: string;
  description: string;
  scopes: readonly AssignableApiKeyScope[];
}>;

const apiKeyScopeSet = new Set<string>(API_KEY_SCOPES);
const apiKeyUsagePresetMap = new Map(
  API_KEY_USAGE_PRESETS.map((preset) => [preset.id, preset]),
);

export function getApiKeyUsagePreset(
  presetId: string | null | undefined,
): (typeof API_KEY_USAGE_PRESETS)[number] | null {
  if (!presetId) {
    return null;
  }

  return apiKeyUsagePresetMap.get(presetId as ApiKeyUsagePresetId) ?? null;
}

export function scopesForApiKeyUsagePreset(
  presetId: string | null | undefined,
): AssignableApiKeyScope[] {
  const preset = getApiKeyUsagePreset(presetId);
  return preset ? [...preset.scopes] : [];
}

export const API_KEY_EXPIRY_OPTION_IDS = [
  "7_days",
  "30_days",
  "90_days",
  "180_days",
  "365_days",
  "never",
] as const;

export type ApiKeyExpiryOptionId = (typeof API_KEY_EXPIRY_OPTION_IDS)[number];

export const DEFAULT_API_KEY_EXPIRY_OPTION = "90_days" as const;

export const API_KEY_EXPIRY_OPTIONS = [
  {
    id: "7_days",
    label: "7 days",
    description: "Short-lived access for temporary integrations or validation.",
    days: 7,
  },
  {
    id: "30_days",
    label: "30 days",
    description: "Suitable for short production rollouts and partner handoffs.",
    days: 30,
  },
  {
    id: "90_days",
    label: "90 days",
    description: "Recommended default for internal automation and rotating agents.",
    days: 90,
  },
  {
    id: "180_days",
    label: "180 days",
    description: "Long-lived machine access that still rotates on a regular cadence.",
    days: 180,
  },
  {
    id: "365_days",
    label: "1 year",
    description: "Use only for tightly controlled systems with periodic manual review.",
    days: 365,
  },
  {
    id: "never",
    label: "Never expires",
    description: "No automatic expiry. Use only when rotation is handled externally.",
    days: null,
  },
] as const satisfies ReadonlyArray<{
  id: ApiKeyExpiryOptionId;
  label: string;
  description: string;
  days: number | null;
}>;

const apiKeyExpiryOptionMap = new Map(
  API_KEY_EXPIRY_OPTIONS.map((option) => [option.id, option]),
);

export function resolveApiKeyExpiryDate(
  optionId: string | null | undefined,
  baseDate = new Date(),
): Date | null {
  if (!optionId) {
    return null;
  }

  const option = apiKeyExpiryOptionMap.get(optionId as ApiKeyExpiryOptionId);
  if (!option || option.days === null) {
    return null;
  }

  const expiresAt = new Date(baseDate);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + option.days);
  return expiresAt;
}

export function isApiKeyExpired(
  expiresAt: Date | null | undefined,
  at = new Date(),
): boolean {
  return Boolean(expiresAt && expiresAt.getTime() <= at.getTime());
}

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return false;
    }
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function normalizeIpv6(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !/^[0-9a-f:]+$/.test(trimmed) || !trimmed.includes(":")) {
    return null;
  }
  return trimmed;
}

function normalizeCidr(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const [ip, rawBits] = trimmed.split("/");
  if (!ip || !rawBits) {
    return null;
  }

  const bits = Number(rawBits);
  if (!Number.isInteger(bits) || bits < 0) {
    return null;
  }

  if (isIpv4(ip)) {
    if (bits > 32) {
      return null;
    }
    return `${ip}/${bits}`;
  }

  const ipv6 = normalizeIpv6(ip);
  if (!ipv6 || bits > 128) {
    return null;
  }

  return `${ipv6}/${bits}`;
}

function ipv4ToNumber(value: string): number {
  return value.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0);
}

function ipv4Mask(bits: number): number {
  if (bits <= 0) {
    return 0;
  }
  return bits === 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
}

function ipv4MatchesCidr(ip: string, cidr: string): boolean {
  const [network, rawBits] = cidr.split("/");
  if (!network || !rawBits) {
    return false;
  }
  const bits = Number(rawBits);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) {
    return false;
  }

  const mask = ipv4Mask(bits);
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(network) & mask);
}

function ipv6MatchesPrefix(ip: string, cidr: string): boolean {
  const [network, rawBits] = cidr.split("/");
  if (!network || !rawBits) {
    return false;
  }
  const bits = Number(rawBits);
  if (!Number.isInteger(bits) || bits < 0 || bits > 128) {
    return false;
  }

  const normalizedIp = normalizeIpv6(ip);
  const normalizedNetwork = normalizeIpv6(network);
  if (!normalizedIp || !normalizedNetwork) {
    return false;
  }

  if (bits === 0) {
    return true;
  }

  const hexChars = Math.floor(bits / 4);
  const remainder = bits % 4;
  if (normalizedIp.slice(0, hexChars) !== normalizedNetwork.slice(0, hexChars)) {
    return false;
  }
  if (remainder === 0) {
    return true;
  }

  const ipNibble = normalizedIp[hexChars];
  const networkNibble = normalizedNetwork[hexChars];
  if (!ipNibble || !networkNibble) {
    return false;
  }

  const mask = 0xf << (4 - remainder);
  return (
    (Number.parseInt(ipNibble, 16) & mask) ===
    (Number.parseInt(networkNibble, 16) & mask)
  );
}

export function normalizeApiKeyScopes(input: string[] | null | undefined): ApiKeyScope[] {
  if (!input || input.length === 0) {
    return [...API_KEY_SCOPES];
  }

  const values = Array.from(
    new Set(
      input
        .map((scope) => scope.trim())
        .filter((scope): scope is ApiKeyScope => apiKeyScopeSet.has(scope)),
    ),
  );

  return values.length > 0 ? values : [...API_KEY_SCOPES];
}

export function normalizeIpAllowlist(input: string[] | null | undefined): string[] {
  if (!input || input.length === 0) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => normalizeCidr(entry) ?? (isIpv4(entry) ? entry : normalizeIpv6(entry)))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );
}

export function requestIpAddress(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded
      .split(",")
      .map((value) => value.trim())
      .find(Boolean);
    if (first) {
      return first;
    }
  }

  const fallbacks = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
  ];

  for (const value of fallbacks) {
    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function isRequestIpAllowed(request: NextRequest, allowlist: string[]): boolean {
  if (allowlist.length === 0) {
    return true;
  }

  const requestIp = requestIpAddress(request);
  if (!requestIp) {
    return false;
  }

  for (const entry of allowlist) {
    if (entry.includes("/")) {
      if (isIpv4(requestIp) && isIpv4(entry.split("/")[0] ?? "")) {
        if (ipv4MatchesCidr(requestIp, entry)) {
          return true;
        }
        continue;
      }

      if (requestIp.includes(":") && entry.includes(":") && ipv6MatchesPrefix(requestIp, entry)) {
        return true;
      }
      continue;
    }

    if (requestIp.trim().toLowerCase() === entry.trim().toLowerCase()) {
      return true;
    }
  }

  return false;
}

export function apiKeyHasScopes(
  scopes: string[] | null | undefined,
  requiredScopes: ApiKeyScope[] | undefined,
): boolean {
  if (!requiredScopes || requiredScopes.length === 0) {
    return true;
  }

  const available = new Set(normalizeApiKeyScopes(scopes));
  return requiredScopes.every((scope) => available.has(scope));
}

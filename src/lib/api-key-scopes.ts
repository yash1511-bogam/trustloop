import { NextRequest } from "next/server";

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

const apiKeyScopeSet = new Set<string>(API_KEY_SCOPES);

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

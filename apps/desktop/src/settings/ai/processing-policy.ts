export const MEETING_CONTENT_POLICIES = [
  "device_only",
  "meta_services",
  "configured",
] as const;

export type MeetingContentPolicy =
  (typeof MEETING_CONTENT_POLICIES)[number];

export type MeetingContentLocation =
  | "device"
  | "loopback"
  | "lan"
  | "meta"
  | "hosted";

export type MeetingContentEgress =
  | "cloud_sync"
  | "sharing"
  | "web_search"
  | "remote_automation"
  | "local_export";

export function normalizeMeetingContentPolicy(
  value: unknown,
): MeetingContentPolicy {
  return MEETING_CONTENT_POLICIES.includes(value as MeetingContentPolicy)
    ? (value as MeetingContentPolicy)
    : "device_only";
}

export function classifyMeetingContentRoute({
  providerId,
  baseUrl,
  onDevice = false,
}: {
  providerId: string | null | undefined;
  baseUrl: string | null | undefined;
  onDevice?: boolean;
}): MeetingContentLocation {
  if (onDevice || providerId === "apple_foundation") {
    return "device";
  }

  const endpoint = parseEndpoint(baseUrl);
  if (endpoint && isLoopbackHost(endpoint.hostname)) {
    return "loopback";
  }
  if (endpoint && isPrivateNetworkHost(endpoint.hostname)) {
    return "lan";
  }
  if (
    providerId === "meta" &&
    endpoint?.protocol === "https:" &&
    endpoint.hostname.toLowerCase() === "api.meta.ai" &&
    (endpoint.pathname === "/v1" || endpoint.pathname.startsWith("/v1/"))
  ) {
    return "meta";
  }
  return "hosted";
}

export function isMeetingContentRouteAllowed({
  policy,
  ...route
}: {
  policy: MeetingContentPolicy;
  providerId: string | null | undefined;
  baseUrl: string | null | undefined;
  onDevice?: boolean;
}): boolean {
  if (policy === "configured") {
    return true;
  }

  const location = classifyMeetingContentRoute(route);
  if (location === "device" || location === "loopback") {
    return true;
  }
  return policy === "meta_services" && location === "meta";
}

export function isMeetingContentEgressAllowed(
  policy: MeetingContentPolicy,
  egress: MeetingContentEgress,
): boolean {
  return egress === "local_export" || policy === "configured";
}

function parseEndpoint(value: string | null | undefined): URL | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopbackHost(value: string): boolean {
  const hostname = value.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname.startsWith("127.")
  );
}

function isPrivateNetworkHost(value: string): boolean {
  const hostname = value.toLowerCase().replace(/^\[|\]$/g, "");
  const octets = hostname.split(".").map(Number);
  if (octets.length === 4 && octets.every(Number.isInteger)) {
    return (
      octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 169 && octets[1] === 254)
    );
  }
  return (
    hostname.includes(":") &&
    (hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe8") ||
      hostname.startsWith("fe9") ||
      hostname.startsWith("fea") ||
      hostname.startsWith("feb"))
  );
}

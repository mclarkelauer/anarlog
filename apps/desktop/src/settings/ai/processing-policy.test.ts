import { describe, expect, it } from "vitest";

import {
  classifyMeetingContentRoute,
  isMeetingContentEgressAllowed,
  isMeetingContentRouteAllowed,
  normalizeMeetingContentPolicy,
} from "./processing-policy";

describe("normalizeMeetingContentPolicy", () => {
  it("fails closed for unknown values", () => {
    expect(normalizeMeetingContentPolicy("configured")).toBe("configured");
    expect(normalizeMeetingContentPolicy("unknown")).toBe("device_only");
    expect(normalizeMeetingContentPolicy(undefined)).toBe("device_only");
  });
});

describe("isMeetingContentEgressAllowed", () => {
  it("always permits local export", () => {
    expect(isMeetingContentEgressAllowed("device_only", "local_export")).toBe(
      true,
    );
    expect(isMeetingContentEgressAllowed("meta_services", "local_export"))
      .toBe(true);
  });

  it("requires configured mode for other meeting-content egress", () => {
    expect(isMeetingContentEgressAllowed("device_only", "cloud_sync")).toBe(
      false,
    );
    expect(isMeetingContentEgressAllowed("meta_services", "sharing")).toBe(
      false,
    );
    expect(isMeetingContentEgressAllowed("configured", "web_search")).toBe(
      true,
    );
  });
});

describe("classifyMeetingContentRoute", () => {
  it("recognizes device and loopback processing", () => {
    expect(
      classifyMeetingContentRoute({
        providerId: "soniqo",
        baseUrl: "",
        onDevice: true,
      }),
    ).toBe("device");
    expect(
      classifyMeetingContentRoute({
        providerId: "ollama",
        baseUrl: "http://127.0.0.1:11434/v1",
      }),
    ).toBe("loopback");
    expect(
      classifyMeetingContentRoute({
        providerId: "custom",
        baseUrl: "http://[::1]:8000/v1",
      }),
    ).toBe("loopback");
  });

  it("distinguishes LAN, approved Meta, and other hosted routes", () => {
    expect(
      classifyMeetingContentRoute({
        providerId: "custom",
        baseUrl: "http://192.168.1.8:8000/v1",
      }),
    ).toBe("lan");
    expect(
      classifyMeetingContentRoute({
        providerId: "meta",
        baseUrl: "https://api.meta.ai/v1",
      }),
    ).toBe("meta");
    expect(
      classifyMeetingContentRoute({
        providerId: "meta",
        baseUrl: "https://api.meta.ai.example.com/v1",
      }),
    ).toBe("hosted");
    expect(
      classifyMeetingContentRoute({
        providerId: "openai",
        baseUrl: "https://api.openai.com/v1",
      }),
    ).toBe("hosted");
  });
});

describe("isMeetingContentRouteAllowed", () => {
  const local = {
    providerId: "ollama",
    baseUrl: "http://localhost:11434/v1",
  };
  const meta = {
    providerId: "meta",
    baseUrl: "https://api.meta.ai/v1",
  };
  const hosted = {
    providerId: "openai",
    baseUrl: "https://api.openai.com/v1",
  };

  it("allows only device-local routes in device-only mode", () => {
    expect(
      isMeetingContentRouteAllowed({ policy: "device_only", ...local }),
    ).toBe(true);
    expect(
      isMeetingContentRouteAllowed({ policy: "device_only", ...meta }),
    ).toBe(false);
    expect(
      isMeetingContentRouteAllowed({ policy: "device_only", ...hosted }),
    ).toBe(false);
  });

  it("allows approved Meta and local routes in Meta-services mode", () => {
    expect(
      isMeetingContentRouteAllowed({ policy: "meta_services", ...local }),
    ).toBe(true);
    expect(
      isMeetingContentRouteAllowed({ policy: "meta_services", ...meta }),
    ).toBe(true);
    expect(
      isMeetingContentRouteAllowed({ policy: "meta_services", ...hosted }),
    ).toBe(false);
  });

  it("preserves upstream provider behavior in configured mode", () => {
    expect(
      isMeetingContentRouteAllowed({ policy: "configured", ...hosted }),
    ).toBe(true);
  });
});

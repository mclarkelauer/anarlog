import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  policy: "device_only",
  cloudSyncEnabled: false,
}));

vi.mock("~/shared/config", () => ({
  useConfigValues: () => ({
    meeting_content_policy: mocks.policy,
    cloud_sync_enabled: mocks.cloudSyncEnabled,
  }),
}));

import { ProcessingPolicyStatus } from "./processing-policy-status";

describe("ProcessingPolicyStatus", () => {
  afterEach(() => {
    cleanup();
    mocks.policy = "device_only";
    mocks.cloudSyncEnabled = false;
  });

  it("shows local processing and blocked outbound features by default", () => {
    render(<ProcessingPolicyStatus />);

    expect(screen.getAllByText("Local only")).toHaveLength(2);
    expect(screen.getAllByText("Blocked")).toHaveLength(2);
    expect(screen.getByText("Local")).toBeTruthy();
  });

  it("makes broad provider access visible", () => {
    mocks.policy = "configured";
    mocks.cloudSyncEnabled = true;

    render(<ProcessingPolicyStatus />);

    expect(screen.getAllByText("Review provider")).toHaveLength(2);
    expect(screen.getByText("Enabled")).toBeTruthy();
    expect(screen.getByText("Available")).toBeTruthy();
  });
});

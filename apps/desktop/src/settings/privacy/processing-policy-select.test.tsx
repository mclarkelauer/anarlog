import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setSettingValues: vi.fn().mockResolvedValue(undefined),
  applyCloudsyncPreference: vi.fn().mockResolvedValue("ok"),
  value: "device_only",
}));

vi.mock("~/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

vi.mock("~/auth/cloudsync", () => ({
  applyCloudsyncPreference: mocks.applyCloudsyncPreference,
}));

vi.mock("~/shared/config", () => ({
  useConfigValue: () => mocks.value,
}));

vi.mock("~/settings/queries", () => ({
  setSettingValues: mocks.setSettingValues,
}));

vi.mock("@anlg/ui/components/ui/select", async () => {
  const React = await import("react");
  const SelectContext = React.createContext({
    value: "",
    onValueChange: (_value: string) => {},
  });

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>
        {children}
      </SelectContext.Provider>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => {
      const select = React.useContext(SelectContext);
      return (
        <button onClick={() => select.onValueChange(value)}>{children}</button>
      );
    },
    SelectTrigger: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    SelectValue: () => {
      const select = React.useContext(SelectContext);
      return <span>{select.value}</span>;
    },
  };
});

import { ProcessingPolicySelect } from "./processing-policy-select";

describe("ProcessingPolicySelect", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.value = "device_only";
  });

  it("describes the device-only guarantee and persists Meta services", async () => {
    render(<ProcessingPolicySelect />);

    expect(screen.getByText("Audio, transcripts, and notes stay on this Mac."))
      .toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Meta services" }));

    await vi.waitFor(() => {
      expect(mocks.setSettingValues).toHaveBeenCalledWith({
        meeting_content_policy: "meta_services",
        cloud_sync_enabled: false,
      });
      expect(mocks.applyCloudsyncPreference).toHaveBeenCalled();
    });
  });

  it("fails closed when a stored policy is unknown", () => {
    mocks.value = "unknown";

    render(<ProcessingPolicySelect />);

    expect(
      screen.getByRole("button", { name: "Meeting content" }).textContent,
    ).toBe("device_only");
  });
});

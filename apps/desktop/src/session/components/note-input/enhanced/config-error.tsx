import { Trans } from "@lingui/react/macro";

import { Button } from "@anlg/ui/components/ui/button";

import { useTabs } from "~/store/zustand/tabs";

export function ConfigError({
  policyBlocked = false,
}: {
  policyBlocked?: boolean;
}) {
  const openNew = useTabs((state) => state.openNew);

  if (policyBlocked) {
    return (
      <div
        role="alert"
        className="flex h-full min-h-[400px] flex-col items-center justify-center px-6"
      >
        <div className="mb-6 flex max-w-md flex-col gap-2 text-center">
          <p className="text-base font-medium">
            <Trans>Provider blocked by meeting content policy</Trans>
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            <Trans>
              Choose a permitted provider or change the processing mode in
              Privacy settings.
            </Trans>
          </p>
        </div>
        <Button
          className="shadow-none"
          onClick={() =>
            openNew({ type: "settings", state: { tab: "privacy" } })
          }
        >
          <Trans>Open Privacy settings</Trans>
        </Button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex h-full min-h-[400px] flex-col items-center justify-center px-6"
    >
      <div className="mb-6 flex max-w-md flex-col gap-2 text-center">
        <p className="text-base font-medium">
          <Trans>Set up AI summaries</Trans>
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <Trans>
            Start a Pro trial or add your own LLM API key to generate a summary
            from this transcript.
          </Trans>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          className="shadow-none"
          onClick={() =>
            openNew({ type: "settings", state: { tab: "billing" } })
          }
        >
          <Trans>Get Pro</Trans>
        </Button>
        <Button
          variant="outline"
          className="shadow-none"
          onClick={() =>
            openNew({ type: "settings", state: { tab: "intelligence" } })
          }
        >
          <Trans>Add API key</Trans>
        </Button>
      </div>
    </div>
  );
}

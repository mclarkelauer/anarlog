import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";

import {
  isMeetingContentEgressAllowed,
  normalizeMeetingContentPolicy,
} from "~/settings/ai/processing-policy";
import { useConfigValues } from "~/shared/config";

export function ProcessingPolicyStatus() {
  const { t } = useLingui();
  const { meeting_content_policy, cloud_sync_enabled } = useConfigValues([
    "meeting_content_policy",
    "cloud_sync_enabled",
  ] as const);
  const policy = normalizeMeetingContentPolicy(meeting_content_policy);
  const externalEgressAllowed = isMeetingContentEgressAllowed(
    policy,
    "cloud_sync",
  );
  const processingStatus =
    policy === "device_only"
      ? t`Local only`
      : policy === "meta_services"
        ? t`Local or Meta`
        : t`Review provider`;

  return (
    <div
      aria-label={t`Meeting content status`}
      className="bg-card border-border rounded-lg border px-4 py-3"
    >
      <p className="mb-3 text-sm font-medium">
        <Trans>Meeting content status</Trans>
      </p>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-xs">
        <StatusRow
          label={<Trans>Transcription</Trans>}
          value={processingStatus}
        />
        <StatusRow
          label={<Trans>Intelligence</Trans>}
          value={processingStatus}
        />
        <StatusRow
          label={<Trans>Sync</Trans>}
          value={
            externalEgressAllowed
              ? cloud_sync_enabled
                ? t`Enabled`
                : t`Off`
              : t`Blocked`
          }
        />
        <StatusRow
          label={<Trans>Web search</Trans>}
          value={externalEgressAllowed ? t`Available` : t`Blocked`}
        />
        <StatusRow label={<Trans>Markdown export</Trans>} value={t`Local`} />
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: ReactNode; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </>
  );
}

import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anlg/ui/components/ui/select";

import { useAuth } from "~/auth";
import { applyCloudsyncPreference } from "~/auth/cloudsync";
import {
  normalizeMeetingContentPolicy,
  type MeetingContentPolicy,
} from "~/settings/ai/processing-policy";
import { setSettingValues } from "~/settings/queries";
import { SETTING_CONTROL_CLASS, SettingRow } from "~/settings/setting-row";
import { useConfigValue } from "~/shared/config";

export function ProcessingPolicySelect() {
  const { t } = useLingui();
  const auth = useAuth();
  const value = normalizeMeetingContentPolicy(
    useConfigValue("meeting_content_policy"),
  );

  const description =
    value === "device_only"
      ? t`Audio, transcripts, and notes stay on this Mac.`
      : value === "meta_services"
        ? t`Only local providers and approved Meta services can process meeting content.`
        : t`Any provider you configure can process meeting content.`;

  return (
    <SettingRow title={<Trans>Meeting content</Trans>} description={description}>
      {(labelProps) => (
        <Select
          value={value}
          onValueChange={(next) => {
            const policy = normalizeMeetingContentPolicy(next);
            void (async () => {
              await setSettingValues({
                meeting_content_policy: policy,
                ...(policy === "configured"
                  ? {}
                  : { cloud_sync_enabled: false }),
              });
              if (policy !== "configured") {
                await applyCloudsyncPreference(auth.session);
              }
            })().catch((error) => {
              console.error(
                "[privacy] failed to update processing mode",
                error,
              );
            });
          }}
        >
          <SelectTrigger {...labelProps} className={SETTING_CONTROL_CLASS}>
            <SelectValue placeholder={t`Select processing mode`} />
          </SelectTrigger>
          <SelectContent>
            <PolicyOption value="device_only">
              <Trans>Device only</Trans>
            </PolicyOption>
            <PolicyOption value="meta_services">
              <Trans>Meta services</Trans>
            </PolicyOption>
            <PolicyOption value="configured">
              <Trans>Any configured provider</Trans>
            </PolicyOption>
          </SelectContent>
        </Select>
      )}
    </SettingRow>
  );
}

function PolicyOption({
  value,
  children,
}: {
  value: MeetingContentPolicy;
  children: ReactNode;
}) {
  return <SelectItem value={value}>{children}</SelectItem>;
}

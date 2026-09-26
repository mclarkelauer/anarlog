# Local Markdown meeting-notes implementation plan

Status: in progress

Current progress (2026-09-26): Milestone 1 has runtime policy guards for STT,
intelligence, CloudSync and attachment backup, Cloud API snapshots, Chat web
search, sharing, remote automations, and webhooks. Privacy controls and a status
panel are implemented, and fork defaults now favor explicit, local capture.
Dependency-based formatting and test runs are still pending because the npm
registry is returning HTTP 503 from this environment.

Baseline: Anarlog `bf6536144516c21c0c5de93a78df20ea7cd5e240`

Fork: <https://github.com/mclarkelauer/anarlog>

## Outcome

Deliver a macOS desktop application where the user explicitly starts a meeting and a complete Markdown note is written automatically after a 30–60 minute meeting. The user can choose fully local processing or an explicitly labeled Meta-backed path using Muse. Meeting content must fail closed rather than use any unselected provider.

The first release targets the current 24 GB Apple Silicon M3 Mac. It remains a small, upstream-friendly fork instead of a rebrand or rewrite.

## What Anarlog already provides

Do not rebuild these surfaces:

- Bot-free microphone and system-audio capture
- On-device Soniqo, Apple Speech, and whisper.cpp transcription paths
- Local Ollama, LM Studio, Unsloth, and Apple Intelligence adapters
- Editable memo, generated summaries, action items, templates, dictionary, search, and calendar support
- Separate source-channel and speaker-resolution logic
- Chunked recording, low-disk behavior, interrupted-recording recovery, transcript persistence, and pending-summary recovery
- Automatic Markdown export, configurable filename/sections, atomic file replacement, and re-export after enhancement
- Recording indicator, pause/stop controls, disclosure messages, and consent evidence storage
- Audio retention settings

The work below closes workflow and privacy gaps around those capabilities.

## Product decisions

1. **Processing modes are explicit.** `Device only` permits on-device and loopback processing. `Meta services` permits Meta Muse. `Any configured provider` retains upstream Anarlog behavior. Model downloads, application updates, and optional calendar access are independent of these modes.
2. **Fail closed.** An unavailable local transcription or intelligence model blocks that stage and offers a repair action. It never selects Anarlog Cloud or another hosted provider.
3. **Explicit recording.** Calendar detection may prompt and prefill metadata, but recording never begins without a user action.
4. **Markdown is a durable output, not the database.** Anarlog's local SQLite data remains the operational source while processing. A completed Markdown artifact is the portable record.
5. **Delete audio after verified processing by default.** Retention remains user-configurable, but the fork's default is no retained audio after the transcript and Markdown artifact are confirmed.
6. **Benchmark before adding hierarchical summarization.** A one-hour transcript commonly fits a modern local model context window. Add chunk-and-reduce only if tests demonstrate truncation or poor recall.

## Milestone 1: Local Meeting Mode

Add one policy setting and enforce it at request boundaries, not only in the settings UI.

Implementation:

- Add `meeting_content_policy` with `device_only`, `meta_services`, and `configured` values in `apps/desktop/src/settings/schema.ts`; default this fork to `device_only`.
- Add a shared policy module that classifies transcription and intelligence selections as on-device, loopback, LAN, Meta-hosted, or other hosted. Permit only on-device and loopback in `device_only`; permit those plus approved Meta endpoints in `meta_services`. Make LAN an explicit advanced opt-in.
- Guard STT connection construction in `apps/desktop/src/stt/useSTTConnection.ts` and batch-provider resolution in `apps/desktop/src/stt/useRunBatch.ts`.
- Guard intelligence model construction in `apps/desktop/src/ai/` and the settings provider-selection path. A stale hosted selection must not bypass the policy.
- Disable meeting-content egress through Chat web search, CloudSync, sharing, remote webhooks, and hosted automation steps while the policy is active. Local Markdown export remains enabled.
- Add a Privacy settings status panel showing Transcription, Intelligence, Sync, Web search, and Export as local, blocked, or requiring attention.
- Change fork defaults to CloudSync off, telemetry off, crash reporting off, automatic meeting start off, and audio retention `none`. Keep automatic updates available because they contain no meeting content.

Acceptance criteria:

- With Local Meeting Mode active, selecting or retaining any hosted STT/LLM produces a repair prompt and no request containing meeting content.
- Ollama on `127.0.0.1`/`localhost` continues to work.
- Blocking the internet does not prevent recording, transcription, enhancement, search, or Markdown export once models are installed.
- Tests exercise stale settings, provider changes during a meeting, unavailable Ollama, Chat web search, webhook attempts, and CloudSync state.

Primary code areas:

- `apps/desktop/src/settings/schema.ts`
- `apps/desktop/src/settings/privacy/`
- `apps/desktop/src/settings/ai/`
- `apps/desktop/src/stt/capabilities.ts`
- `apps/desktop/src/stt/useSTTConnection.ts`
- `apps/desktop/src/stt/useRunBatch.ts`
- `apps/desktop/src/chat/`
- `apps/desktop/src/automations/`

## Milestone 2: Muse provider track

Muse Voice Transcribe is already implemented in Anarlog for live and batch modes through provider ID `meta` and model `muse-voice-transcribe-1.0`. Muse Spark is already available as an intelligence provider. Treat this milestone as qualification and hardening, not a new adapter.

### Muse Voice transcription

- Make Muse Voice a first-class choice in `meta_services` mode with a clear “audio is sent to Meta” label.
- Use the realtime WebSocket path for 30–60 minute meetings. The current public realtime session limit is 60 minutes; the one-shot transcription endpoint is limited to 10 minutes/32 MB and must not receive a full meeting recording.
- Warn at 55 minutes and rotate or end the stream safely before the 60-minute boundary. Preserve local temporary audio so an interrupted tail can be repaired with an explicitly selected local batch model.
- Verify reconnect behavior, end-of-stream finalization, and exactly-once transcript persistence at the session boundary.
- Preserve Muse diarization labels across turns. Mark generated word timings as interpolated from turn-level timing because Muse does not return word-level timestamps.
- Pass the existing personalization dictionary through Muse `keywords` and language choices through `languageBias`, respecting provider limits.
- Store the Meta Model API key only in the existing OS credential store and never in settings, logs, Markdown, or crash reports.

Muse acceptance criteria:

- A 60-minute realtime fixture completes without crossing the session limit or losing its final turn.
- Two- and multi-speaker fixtures retain stable labels across partial/final events.
- A network interruption produces a visible incomplete range and an opt-in local repair path; it never silently uploads the whole recording to the batch endpoint.
- Markdown identifies `meta / muse-voice-transcribe-1.0` and distinguishes exact turn timing from interpolated word timing.
- `device_only` rejects Muse before audio transmission; `meta_services` permits only the documented Meta API host.

Primary Muse code areas:

- `apps/desktop/src/settings/ai/stt/shared.tsx`
- `apps/desktop/src/stt/model-selection.ts`
- `apps/desktop/src/stt/useRunBatch.ts`
- `crates/owhisper-client/src/adapter/meta/`
- `crates/owhisper-client/src/providers.rs`

## Milestone 3: Private first-run setup

Turn existing settings into a short, testable setup flow.

Implementation:

- Offer two named setup paths: Device only (Soniqo/Apple Speech/whisper.cpp plus Ollama) and Meta services (Muse Voice plus Muse Spark).
- Add a “Private meeting notes” onboarding path.
- Recommend Soniqo Parakeet Batch on Apple Silicon for 30–60 minute meetings; permit Parakeet Streaming or Apple Speech when live text is preferred.
- Recommend Muse Voice realtime—not one-shot batch—for 30–60 minute Meta-backed transcription.
- Detect the existing Ollama server and list compatible local models. Recommend a tool-capable quantized 4B–8B instruction model for a 24 GB Mac, but do not silently download it.
- Ask for the Markdown destination and configure the existing `meeting.completed`/`note.enhanced` automation.
- Ask whether to retain audio; default to deletion after verified transcription/export.
- Configure a default General Meeting template and offer the existing 1:1, standup, interview, and customer-call templates.
- Finish with a preflight test covering permissions, a short recording, transcription, summary generation, and an atomic Markdown write.

Acceptance criteria:

- A new user can reach a successful local test note without creating an account or configuring a hosted provider.
- Setup cannot report success until both local model stages and the export directory pass health checks.
- Cancelled model downloads or missing macOS permissions resume cleanly.

Primary code areas:

- `apps/desktop/src/onboarding/`
- `apps/desktop/src/settings/ai/`
- `apps/desktop/src/settings/automations/`
- `apps/desktop/src/settings/general/`
- `plugins/permissions/` and existing model-download plugins

## Milestone 4: Markdown Meeting Profile

Extend the existing exporter rather than creating a second export path.

Target output:

```markdown
---
title: Weekly product sync
date: 2026-09-26T10:00:00-04:00
duration_minutes: 52
attendees:
  - Alex
  - Sam
transcription_provider: local
meeting_id: ...
---

# Weekly product sync

## Summary
## Decisions
## Action items
- [ ] Alex — send the proposal — due 2026-09-29
## Open questions
## My notes
## Transcript
```

Implementation:

- Extend `MarkdownExportOptions` in `plugins/local-api/src/types.rs` with a versioned profile instead of changing the existing default format globally.
- Add YAML frontmatter, duration, attendees, local provider/model metadata, and stable section ordering.
- Resolve action-item assignee names from participants and render due dates. Preserve unchecked items when either field is missing.
- Add timestamped transcript blocks when word timing exists; fall back to the current plain transcript when it does not.
- Add a choice between embedded transcript and a sibling `<name>.transcript.md` file.
- Preserve the existing filename sanitization, meeting-ID collision protection, temporary-file write, `fsync`, and atomic replacement.
- Store an exporter/profile version in frontmatter so future changes can migrate or regenerate safely.

Acceptance criteria:

- Markdown is valid for plain Markdown readers and Obsidian.
- YAML strings with punctuation, quotes, Unicode, or multiline titles serialize safely.
- Re-export updates the same meeting without overwriting an unrelated file.
- An action item's owner and due date survive export.
- A transcript timestamp links a reader to the corresponding elapsed meeting time.

Primary code areas:

- `plugins/local-api/src/types.rs`
- `plugins/local-api/src/commands.rs`
- `crates/agent-access/src/lib.rs`
- `apps/desktop/src/automations/markdown-export.ts`
- `apps/desktop/src/settings/automations/markdown-export-options.tsx`

## Milestone 5: Guaranteed post-meeting delivery

The existing automation records its latest result but does not provide a durable per-meeting retry queue. Add one so “every meeting” remains true across app exits and transient model/filesystem failures.

Implementation:

- Persist a local export job when recording completes. States: `waiting_for_transcript`, `waiting_for_summary`, `ready`, `writing`, `complete`, and `failed`.
- Resume incomplete jobs at startup using the same local settings-storage pattern as pending auto-enhancement.
- Export an initial transcript/memo artifact after transcription, then atomically replace it after local enhancement completes.
- Retry transient filesystem/model failures with bounded exponential backoff; keep permanent errors visible with a Retry action.
- Add per-meeting processing status and a completion notification that opens the exported file.
- Do not delete temporary audio until transcription is durable. If the selected policy also requires successful Markdown delivery, defer deletion until the final export is confirmed.
- Ensure repeated completion/enhancement events are idempotent.

Acceptance criteria:

- Quit after Stop, relaunch, and still receive the final Markdown file.
- Unmount or make the destination unavailable, restore it, retry, and receive exactly one current file.
- A local LLM outage preserves the transcript artifact and clearly marks summary generation pending.
- No user-authored unrelated file is overwritten.

Primary code areas:

- `apps/desktop/src/automations/engine.ts`
- `apps/desktop/src/services/enhancer/`
- `apps/desktop/src/store/zustand/listener/general-live.ts`
- `plugins/local-api/src/commands.rs`
- `apps/desktop/src/settings/automations/`

## Milestone 6: Trustworthy notes

Improve output quality using existing templates, action-item storage, and transcript structure.

Implementation:

- Ship a fork-specific General Meeting template with Summary, Decisions, Action items, Open questions, and Risks.
- In the prompt, distinguish explicit decisions and commitments from suggestions. Never invent an owner or due date.
- Include short `[mm:ss]` evidence references for decisions and action items when timing is available.
- Use the existing personalization dictionary for names, acronyms, and project terminology in both STT and enhancement.
- Add an explicit “Needs review” group for uncertain action items instead of silently promoting them.
- Only introduce hierarchical chunk summaries when the selected model's context budget cannot safely contain the transcript, memo, template, and response allowance.

Acceptance criteria:

- Every extracted decision/action has transcript support or is labeled uncertain.
- Empty sections are omitted or explicitly state that none were identified; they never contain invented filler.
- User-written memo content remains distinguishable and is never discarded by regeneration.
- The same stored transcript can regenerate a deterministic structure with any supported local model.

Primary code areas:

- `crates/template-app/assets/`
- `crates/template-app/src/enhance.rs`
- `apps/desktop/src/store/zustand/ai-task/task-configs/`
- `apps/desktop/src/templates/`
- `apps/desktop/src/settings/dictionary/`

## Milestone 7: 30–60 minute qualification

Use synthetic or consented fixtures; never commit private meeting recordings.

Test matrix:

- 5-minute smoke fixture for routine development
- 30-minute two-speaker fixture
- 60-minute two-speaker fixture
- 60-minute multi-speaker fixture
- 60-minute Muse realtime fixture, plus provider-limit and reconnect cases
- Network loss, Ollama restart, low disk, app exit after Stop, sleep/wake, destination unavailable, and duplicate completion-event cases

Measure:

- Missing or duplicated transcript spans
- Speaker/source attribution quality
- Time from Stop to transcript and final Markdown
- Peak memory and temporary disk use
- Decision and action-item precision/recall against a hand-authored reference
- Markdown validity and repeatability
- Network requests made while Local Meeting Mode is active

Release gates:

- All meeting-content operations succeed with outbound internet blocked.
- A one-hour fixture completes without lost chunks or an unrecoverable state.
- Recovery tests produce one final Markdown artifact.
- No hosted fallback occurs in automated network-observation tests.
- Existing desktop TypeScript, Rust, formatting, lint, i18n, license-boundary, and relevant CI checks pass.

Relevant existing test infrastructure:

- `crates/audio-mock/`
- `crates/listener-core/src/actors/session/supervisor/reliability_tests.rs`
- `apps/desktop/src/stt/*.test.ts(x)`
- `apps/desktop/src/services/enhancer/*.test.ts`
- `apps/desktop/src/automations/engine.test.ts`
- `plugins/local-api/src/commands.rs` unit tests

## Delivery sequence

Keep each pull request independently usable and easy to rebase onto upstream:

1. Processing policy and fail-closed guards
2. Muse Voice qualification
3. Private/Meta-backed onboarding and preflight
4. Versioned Markdown Meeting Profile
5. Durable export queue and recovery UI
6. Evidence-aware summary template
7. Long-meeting fixtures, benchmarks, and hardening fixes

Do not rebrand the application, modify hosted services, or touch commercially licensed `enterprise/` code in these milestones. Sync from `upstream/main` between milestones and keep fork-only changes behind narrowly scoped settings/profile modules where practical.

## Deferred

- Mobile and watch applications
- Team sharing and hosted synchronization
- CRM, Slack, Notion, and remote webhook automations
- Organization administration
- Full OS-level network denial build; consider it after the content-egress policy is verified
- Pre-meeting briefs and cross-meeting semantic retrieval beyond Anarlog's existing local search

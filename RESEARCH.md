# Local-first Granola-style meeting notes

Research date: 2026-09-26

## Recommendation

Fork [Anarlog](https://github.com/fastrepl/anarlog) (formerly Hyprnote) rather than building the audio, transcription, editor, and model plumbing from scratch. Configure its on-device transcription and connect its intelligence provider to the local Ollama installation. Current Anarlog already supports automatic Markdown export after every meeting, so customization should focus on enforcing local-only processing, improving the Markdown schema, and making export completion durable and visible.

This is the lowest-risk route to a private desktop tool that can handle 30–60 minute meetings. Anarlog is MIT-licensed, has a current packaged Apple Silicon release, stores sessions locally, captures microphone plus computer audio without a meeting bot, supports local transcription, supports Ollama for summaries/chat, and exports Markdown.

Anarlog also already includes bring-your-own-key support for Meta Muse: `muse-voice-transcribe-1.0` for transcription and the `muse-spark` family for summaries. Muse is hosted, not on-device. Its realtime API is the appropriate path for 30–60 minute meetings; the one-shot file endpoint accepts only shorter inputs.

The local machine is a 24 GB Apple Silicon M3 Mac. That is sufficient for an on-device transcription model and a quantized 4B–8B local language model. Ollama is already installed, but no local models are currently listed.

## What Granola actually provides

Granola's product is more than transcription. Its current workflow is:

1. Before: calendar sync, automatic meeting detection, and pre-meeting briefs based on prior meetings and attendees.
2. During: explicit manual start, bot-free capture of microphone and computer audio, background transcription, and an editable area for the user's rough notes.
3. After: enhancement of the user's notes using transcript context, structured notes, decisions, action items, follow-up drafts, and chat over one or many meetings.
4. Organization: search, folders, templates/recipes, speaker tagging, sharing, and integrations.

It supports macOS, Windows, iOS, Android, and Apple Watch, and works independently of the conferencing app (Zoom, Meet, Teams, Slack Huddles, Webex, or in-person meetings).

Granola is not a fully local application. Its security page says it uses transcription providers such as Deepgram and Assembly and AI providers such as OpenAI and Anthropic. It does not retain meeting recordings; on desktop it transcribes in real time, stores transcripts and notes in a US-hosted AWS VPC, and encrypts them in transit and at rest. Notes are private until shared. Third-party model providers are not allowed to train on customer data, but Granola itself uses anonymized data for training unless the user opts out; Enterprise disables that by default. Granola is SOC 2 Type 2 and states GDPR compliance, but does not currently offer a HIPAA BAA.

Current advertised pricing is $0 for Basic with 30 days of history, $14/user/month for Business with unlimited history and advanced integrations, and $35/user/month for Enterprise with organization controls. Pricing and features can change.

## Existing local alternatives

| Project | Fit | Maturity signal on 2026-09-26 | Main concern |
|---|---|---:|---|
| [Anarlog](https://github.com/fastrepl/anarlog) | Best starting point: local capture/storage, local or hosted STT, Ollama/local summaries, editor, search, Markdown export | ~9,399 stars; active; v1.4.27 released 2026-09-25; MIT | Large codebase; verify whether Markdown export can run automatically after every meeting |
| [Muesli (macOS)](https://github.com/scottscotthendo/muesli) | Very close narrow workflow: ScreenCaptureKit, faster-whisper, optional diarization, local summary, automatic Markdown to `~/meetings/` | New, 0 stars, no declared license | Prototype-level and Python-heavy; little maintenance evidence |
| [VoxTape](https://github.com/Lingelo/VoxTape) | Local macOS capture, Whisper, local 3B model, chat, Markdown export | New, 8 stars, no declared license | Immature and ~5 GB initial model setup |
| [Open Granola](https://github.com/anshuman-pandey/open-granola) | Claims nearly complete feature parity and fully offline operation | New, 6 stars, one release window, Apache-2.0 | Claims need code-level validation before trusting it with sensitive meetings |

Anarlog's documented local transcription choices on compatible Macs include Soniqo Parakeet Streaming, Soniqo Parakeet Batch (specifically recommended by its docs for hour-long calls), Apple Speech on macOS 26, and user-selected whisper.cpp models for post-recording transcription. It supports Ollama, LM Studio, or Unsloth for local summaries and chat. If a selected local model is unavailable, it reports an error rather than silently falling back to its cloud service.

## Proposed first version

The first useful version should deliberately omit team/cloud features:

- Manual Start/Stop with an always-visible recording indicator and pause control
- Separate microphone and system-audio capture, so “Me” and “Others” can be labeled without full voice diarization
- Crash-safe local recording and transcript checkpoints
- Editable rough notes during the meeting
- On-device transcription in rolling chunks or as a reliable post-meeting batch
- Local structured-note generation with title, summary, topics, decisions, action items, open questions, and the user's raw notes
- Automatic atomic Markdown write to a user-selected directory after Stop
- Local full-text search and optional calendar-derived title/attendees
- Audio deleted after a verified transcript by default; optional local retention

Speaker identification, cross-meeting semantic chat, pre-meeting briefs, mobile capture, sharing, and third-party integrations should come later. Diarization is particularly easy to underestimate and is unnecessary when the immediate goal is dependable notes.

## Handling 30–60 minute meetings

The app should never hold the whole recording only in memory. At 16 kHz, mono, 16-bit PCM, one hour is about 115 MB per audio stream; separate microphone and system streams are about 230 MB before compression. Chunked local files, periodic metadata checkpoints, and atomic final output keep a crash from losing an hour of conversation.

Long transcripts should be summarized hierarchically: summarize transcript chunks first, then combine those summaries with the user's rough notes into the final template. This prevents context-window failures and makes action-item extraction more consistent. A 4B–8B quantized instruction model is the sensible local range for this 24 GB machine.

Suggested output:

```markdown
---
title: Weekly product sync
date: 2026-09-26T10:00:00-04:00
duration_minutes: 52
attendees: [Alex, Sam]
transcription: local
---

# Weekly product sync

## Summary

## Decisions

## Action items
- [ ] Owner — task — due date

## Open questions

## My notes

## Transcript
<details>
<summary>Show transcript</summary>

...
</details>
```

Use a temporary filename and rename only after the final Markdown has been fully written. Keep the transcript embedded or as a sibling `.transcript.md` based on a preference.

## Privacy and consent

Bot-free is not the same as consent-free. The app should make recording obvious to its user, provide a one-click pause, and offer a configurable consent reminder. Meeting participants should be told before transcription begins; recording/transcription laws vary by jurisdiction.

## Suggested implementation path

1. Install and test the current Anarlog Apple Silicon build with a prerecorded 45–60 minute sample.
2. Select Soniqo Parakeet Batch or a local whisper.cpp model for transcription and Ollama for intelligence; disable hosted providers and optional web-search features.
3. Measure transcript accuracy, elapsed post-processing time, memory, and output quality on this machine.
4. If acceptable, fork Anarlog and add automatic Markdown export plus the exact template above.
5. Only build a smaller native Swift application if Anarlog proves too heavy or cannot guarantee the desired no-network behavior.

## Primary sources

- [Granola product page](https://www.granola.ai/)
- [Granola pricing](https://www.granola.ai/pricing)
- [Granola security and privacy overview](https://www.granola.ai/security)
- [Granola integrations](https://www.granola.ai/integrations)
- [Granola transcript deletion model](https://www.granola.ai/updates/delete-parts-of-transcript)
- [Anarlog repository](https://github.com/fastrepl/anarlog)
- [Anarlog models and providers](https://docs.anarlog.so/models-and-providers)
- Alternative-project repositories linked in the comparison table

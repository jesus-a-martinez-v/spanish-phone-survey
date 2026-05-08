# Spanish Phone Survey Agent — Brainstorm

A quick-and-dirty demo: a Spanish-speaking voice agent that answers an inbound phone number, runs a 4-question survey, and emails a post-call analysis to a recipient. Built on Retell AI. Intended to be handed off to an associate as a sellable demo.

## Goal

Stand up a working inbound number where:

1. A friendly Spanish-speaking AI receptionist answers.
2. It greets the caller, confirms they have time to talk.
3. It runs a 4-question survey, striving to collect all answers but gracefully accepting partial responses.
4. After the call, post-call analysis (sentiment, summary, evaluation matrix) is generated and emailed to a recipient.

## Architecture (split of responsibilities)

**Retell handles:**

- The phone call itself (telephony, STT, LLM, TTS).
- The conversation flow via a single-prompt `retell-llm` response engine (no state machine needed for this scope).
- Native post-call analysis:
  - `analysis_summary_prompt` → call summary.
  - `analysis_user_sentiment_prompt` → sentiment.
  - `post_call_analysis_data` → typed custom fields (string / enum / boolean / number) extracted from the transcript. **This is the evaluation matrix** — one field per survey question, plus any derived dimensions.

**Server-side (small webhook receiver) handles:**

- Receives the `call_analyzed` webhook from Retell.
- Formats the email (summary + sentiment + filled matrix).
- Sends the email (Resend / SendGrid / SMTP — TBD).
- Optional: appends a row to a Google Sheet for a running log to demo with.

This split keeps Retell doing what it's good at (call + extraction) and minimizes server code to just delivery.

## Decisions locked in

| Decision        | Choice                                                                       |
| --------------- | ---------------------------------------------------------------------------- |
| Call direction  | **Inbound only** — easiest demo handoff (associate shares the number)        |
| Spanish variant | **es-419** (Latin American neutral)                                          |
| Voice persona   | **Warm, friendly female** (specific voice ID TBD)                            |
| Delivery        | **Email** with summary + filled matrix                                       |
| Phone number    | **+1 (864) 263-1104** (currently unassigned in Retell account)               |

The other available number, +1 (873) 737-5073, is currently bound to the Marissa (Dentistry on 66) agent and stays as-is.

## Open questions / inputs needed before building

1. **Survey purpose** — one-sentence framing of what the survey is for (shapes the agent's intro and persona). Examples: post-purchase satisfaction, voter intent, B2B lead-gen qualification.
2. **The 4 questions** — in Spanish if available, English if not (translate as needed). For each, the answer type:
   - Open text
   - Yes / no
   - Number or score (e.g., 1–10)
   - Pick from a fixed list
3. **Evaluation matrix** — just the 4 raw answers as fields, or also derived dimensions (e.g., lead quality hot/warm/cold, objection raised yes/no, intent score 1–5)?
4. **Email recipient** — default `jesus@datasmarts.net`. Sender / transport TBD (Resend / SendGrid / own SMTP).

## Conversation design notes

- **Greeting**: friendly Spanish intro, ask if they have a moment to talk.
  - If no → polite goodbye, no pressure.
  - If yes → run survey.
- **"Strive but don't be unreasonable"**: a single-prompt instruction handles this — *"Try to collect all 4 answers, but if the person clearly wants to wrap up after 2 or 3, accept gracefully and don't push."* No state machine required.
- **Tone**: warm, conversational, one question at a time, natural contractions, no corporate-speak.
- **Closing**: brief thanks; mention what happens next (if anything).

## Tradeoffs / caveats

- **Webhook reliability** — Retell webhooks are fire-and-forget. If the receiver is down when fired, the notification is lost. Mitigations: (a) always 200 the webhook and queue work internally, or (b) fall back to polling `call.retrieve` for any calls missing analysis.
- **Quick-and-dirty scope** — no auth, no multi-tenant config, no admin UI. Just enough to demo. Anything more becomes a v2 conversation.
- **Phone number cost** — `+1 (864) 263-1104` already exists in the account so no new purchase needed for the demo.

## Build steps (when ready)

1. Create the `retell-llm` response engine with the Spanish system prompt and `post_call_analysis_data` schema for the matrix.
2. Create the agent — voice ID, language `es-419`, `begin_message`, `analysis_summary_prompt`, `analysis_user_sentiment_prompt`, `webhook_url` pointing at the receiver.
3. Bind the agent to `+1 (864) 263-1104` as `inbound_agents`.
4. Build the webhook receiver (single endpoint) that formats and emails the analysis.
5. Place a test call, verify the email arrives, hand off the number.

## Status

Scoping only. Not yet built. Picking back up tomorrow with the four open questions answered.

# Spanish Phone Survey — Demo Handoff

Inbound Spanish-speaking voice agent that runs the 4-question executive interview from `resources/Evaluación de los candidatos.md`, then emails the scored result and logs it to a Google Sheet. Built on Retell AI + n8n.

## Demo recipe

Two ways to reach Sofía:

| Channel | Where |
| --- | --- |
| **🌐 Web call-back (recommended for DR / Colombia)** | **https://n8n.srv841363.hstgr.cloud/webhook/web-survey** — open in any browser, pick country (🇩🇴 default / 🇨🇴), enter phone, click "Llámame ahora". Sofía calls within seconds — candidate just answers. |
| **📞 Direct dial (US)** | **+1 (864) 263-1104** — dial from any phone with international calling enabled |

| | |
| --- | --- |
| **Language** | Spanish (es-419) — agent only speaks Spanish |
| **Persona** | "Sofía", consultora del Programa de Exportación de Servicios Modernos |
| **What to expect** | Greeting → asks if you have ~15 min → asks name + company → 4 questions, one at a time → close |
| **Email lands at** | jesus@datasmarts.net (within ~30–60s after hangup) |
| **Sheet log** | [Spanish Phone Survey — Demo Log](https://docs.google.com/spreadsheets/d/1dZFeYwBPxReBuN0nS_yXqSrtx_9lAvwVZlthvdH19fo/edit) (one row per call) |

For Dominican Republic / Colombia candidates without international calling, share the **web URL**. They just enter their local number and Retell places the outbound call from `+18642631104` — no toll for them, no microphone permissions, works on any phone. Same agent, same downstream pipeline.

> The first row in the demo sheet is **smoke-test data** ("Test Three / DemoCo"). Delete it before showing live to a client.

## What gets emailed

A clean Spanish HTML email titled `[Encuesta] <verdict> — <candidate name> / <company>` containing:

- **Identity**: candidate name, company, timestamp (Bogotá), questions answered, follow-up requested
- **Matrix de Evaluación** — 4 rows (escalabilidad, diferenciación, enfoque, compromiso), each with a 1–5 score and a one-line observation
- **TOTAL /20** with verdict band:
  - `17–20` → **Candidato A (Top)** — selección inmediata
  - `13–16` → **Candidato B (Apto)** — seleccionable con mentoría
  - `< 13` → **No Apto**
- **Resumen de la llamada** + **Sentimiento**
- Links to the Retell recording and call log

## Resources used (already exist on this server)

| Component | ID / Location |
| --- | --- |
| Retell LLM | `llm_eae40a7d15f589bbcf520882dffd` (gpt-4.1, temp 0.4) |
| Retell Agent | `agent_c08a58dd2fc26d6bbb62911625` v0 |
| Voice | `cartesia-Sofia` (Mexican female) — fallback `11labs-Andrea`, `minimax-Andrea` |
| Phone number | `+18642631104` (Retell-owned, nickname "Spanish Survey") |
| n8n base URL | https://n8n.srv841363.hstgr.cloud/ |
| n8n webhook | https://n8n.srv841363.hstgr.cloud/webhook/retell-survey |
| n8n workflow | `tXttNyCL4uyzSKJj` — "Spanish Phone Survey — Retell Post-Call" |
| n8n setup workflow | `ocI5rUilnRoz9dPs` — "[Setup] Spanish Phone Survey — Create Sheet" (created the sheet once; can stay deactivated) |
| n8n web-call workflow | `Ve1l9T9MVHuLzWWW` — "Spanish Phone Survey — Web Call" (active). Two endpoints: GET `/webhook/web-survey` (form page) + POST `/webhook/web-survey-call` (validates input + triggers Retell outbound) |
| Retell API credential in n8n | `PByYfqjiGV1lhEGm` — "Retell API" (httpHeaderAuth) — used by the outbound-call trigger |
| Gmail credential | `[DataSmarts] Gmail` (OAuth2) — id `PxY342gB7M9eQF5h` |
| Sheets credential | `[DataSmarts] Google Sheets` (OAuth2) — id `qDGPNqnKLwO1pYbS` |
| Google Sheet | `1dZFeYwBPxReBuN0nS_yXqSrtx_9lAvwVZlthvdH19fo` (tab "Calls", 16 columns) |

## Architecture

```
Direct caller (PSTN)               Web visitor (browser)
       │                                  │
       ▼                                  ▼ picks 🇩🇴/🇨🇴 + enters phone
+1 864 263 1104          n8n GET /webhook/web-survey   (form HTML)
       │                                  │  POST /webhook/web-survey-call
       │                                  ▼
       │                  n8n validates + POSTs api.retellai.com/v2/create-phone-call
       │                                  │  from_number=+18642631104, to_number=<E.164>,
       │                                  │  override_agent_id=agent_c08a58dd…
       │                                  ▼
       │                       Retell places outbound call to candidate
       │                                  │
       └─────────► Retell agent (Sofía, es-419) ◄──── candidate answers their phone
                         │ same single-prompt LLM
                         │ same post_call_analysis_data
                         │
                         ▼ POST event=call_analyzed
                    n8n /webhook/retell-survey
                         ├─ IF event=='call_analyzed'
                         ├─ Code: total + verdict
                         ├──► Gmail → jesus@datasmarts.net
                         └──► Google Sheets append
```

## Files in this repo

```
spanish-phone-survey/
├── BRAINSTORM.md                      original framing
├── README.md                          this file
├── resources/
│   └── Evaluación de los candidatos.md  source of truth: questions + rubric
├── retell/
│   ├── llm.json                       LLM config snapshot
│   └── agent.json                     Agent config + phone binding snapshot
└── n8n/
    ├── setup-workflow.json            one-shot sheet creation (already ran)
    ├── workflow.json                  main "post-call → email + sheet" workflow source
    ├── workflow.live.json             full live export from n8n API (large, includes IDs + metadata)
    └── web-survey-workflow.json       web call-back workflow: form page + outbound-call trigger
```

## How to tweak it

| Want to… | Where |
| --- | --- |
| Change the agent's prompt / persona / Spanish wording | edit `retell/llm.json` `general_prompt` and `begin_message`, then `client.llm.update("llm_eae...")` |
| Change the voice | edit `retell/agent.json` `voice_id`, then `client.agent.update(...)`. List options with `client.voice.list()` |
| Tweak score rubric | edit field `description` strings in `agent.json` `post_call_analysis_data`, then `client.agent.update(...)` |
| Change verdict bands | edit the JS in the n8n "Compute Verdict" Code node |
| Change email recipient or template | edit "Send Email" node in n8n |
| Add/rename sheet columns | edit headers in the sheet AND the column map in n8n "Append to Sheet" |
| Pause the survey | deactivate workflow `tXttNyCL4uyzSKJj` in n8n (calls keep working but no email/sheet) — or unbind the phone via `client.phoneNumber.update("+18642631104", { inbound_agents: [] })` |

## Recovery / debugging

- **Webhook delivery is fire-and-forget.** If n8n is down when Retell fires, the email and sheet row are lost. The call recording + transcript + custom analysis data are still preserved in Retell. To replay: `client.call.retrieve(call_id)` returns the same payload — POST it manually to the n8n webhook to recover.
- **Live executions:** https://n8n.srv841363.hstgr.cloud/workflow/tXttNyCL4uyzSKJj/executions
- **Retell call log:** Retell dashboard → Calls → filter by agent `Spanish Survey — Programa Exportación`

## How to add another country

Edit `n8n/web-survey-workflow.json`:

1. In the GET node's HTML, add a new `<option>` to the `<select id="country">` block, e.g. `<option value="+52" data-placeholder="55 1234 5678">🇲🇽 México (+52)</option>`.
2. In the **Validate Input** Code node, add the new dial code to the `allowed` array (e.g. `['+1', '+57', '+52']`).
3. PUT the workflow back to n8n (`PUT /api/v1/workflows/Ve1l9T9MVHuLzWWW`) and toggle deactivate→activate to re-register the webhook.

Note: outbound destinations are also gated by Retell + the underlying SIP carrier (Twilio trunk on this account). If a country fails at the Retell step, check the trunk's allowed-destinations config.

## What's NOT built (out of scope for v1)

- Webhook signature verification (could be added via header auth on the n8n webhook node)
- Auto-deduplication on `call_id` (replays would create duplicate rows/emails)
- Pretty PDF report
- Spanish-localized analytics dashboards
- Multi-tenant or admin UI

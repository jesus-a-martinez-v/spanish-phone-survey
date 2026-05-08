# Spanish Phone Survey — Demo Handoff

Spanish-speaking voice agent that runs the 4-question executive interview from `resources/Evaluación de los candidatos.md`, then emails the scored result and logs it to a Google Sheet. Built on Retell AI + a Vercel SPA + n8n.

## Demo recipe

Two ways to reach Sofía:

| Channel | Where |
| --- | --- |
| **🌐 Web entrypoint (recommended for everyone)** | Open the Vercel SPA in a browser, click **Probar micrófono** → **Iniciar entrevista**. Sofía streams in via WebRTC — no phone, no country gates. |
| **📞 Direct dial (US only)** | **+1 (864) 263-1104** — works from any phone with US calling. International dials hit Twilio trunk geo limits; use the web entrypoint instead. |

| | |
| --- | --- |
| **Language** | Spanish (es-419) — agent only speaks Spanish |
| **Persona** | "Sofía", consultora del Programa de Exportación de Servicios Modernos |
| **What to expect** | Greeting → asks if you have ~15 min → asks name + company → 4 questions, one at a time → close |
| **Email lands at** | jesus@datasmarts.net (within ~30–60s after hangup, **only on successful calls**) |
| **Sheet log** | [Spanish Phone Survey — Demo Log](https://docs.google.com/spreadsheets/d/1dZFeYwBPxReBuN0nS_yXqSrtx_9lAvwVZlthvdH19fo/edit) (one row per successful call) |

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

Failed calls (no answer, declined, dropped, errored) trigger **no email and no sheet row** — the n8n IF node gates on `event = call_analyzed` AND `call_status = ended` AND `duration_ms > 0`.

## Resources used (already exist on this server)

| Component | ID / Location |
| --- | --- |
| Retell LLM | `llm_eae40a7d15f589bbcf520882dffd` (gpt-4.1, temp 0.4) |
| Retell Agent | `agent_c08a58dd2fc26d6bbb62911625` |
| Voice | `cartesia-Sofia` (Mexican female) — fallback `11labs-Andrea`, `minimax-Andrea` |
| Phone number (inbound) | `+18642631104` (custom-imported via DataSmarts Twilio SIP trunk, nickname "Spanish Survey") |
| Web entrypoint | Vercel SPA from `web/` in this repo (single `RETELL_API_KEY` env var). Production URL is the canonical "share this link" demo entrypoint. |
| n8n base URL | https://n8n.srv841363.hstgr.cloud/ |
| n8n post-call webhook | https://n8n.srv841363.hstgr.cloud/webhook/retell-survey |
| n8n post-call workflow | `tXttNyCL4uyzSKJj` — "Spanish Phone Survey — Retell Post-Call" (active) |
| n8n setup workflow | `ocI5rUilnRoz9dPs` — created the sheet once (deactivated) |
| n8n web-call workflow | `Ve1l9T9MVHuLzWWW` — superseded by the Vercel SPA, kept around but **deactivated** |
| Retell API credential in n8n | `PByYfqjiGV1lhEGm` — "Retell API" (httpHeaderAuth, used by the post-call webhook flow) |
| Gmail credential | `[DataSmarts] Gmail` (OAuth2) — id `PxY342gB7M9eQF5h` |
| Sheets credential | `[DataSmarts] Google Sheets` (OAuth2) — id `qDGPNqnKLwO1pYbS` |
| Google Sheet | `1dZFeYwBPxReBuN0nS_yXqSrtx_9lAvwVZlthvdH19fo` (tab "Calls", 16 columns) |

## Architecture

```
US PSTN caller                    Web visitor (browser, WebRTC)
       │                                    │
       ▼                                    ▼ clicks "Iniciar entrevista"
+1 864 263 1104                   Vercel SPA (web/index.html)
       │                                    │  POST /api/create-web-call
       │                                    ▼
       │                         Vercel Edge fn → api.retellai.com/v2/create-web-call
       │                                    │  returns { call_id, access_token }
       │                                    ▼
       │                         Browser opens WebRTC to Retell with access_token
       │                                    │
       └─────────► Retell agent (Sofía, es-419) ◄──── visitor's mic over WebRTC
                         │ single-prompt LLM
                         │ post_call_analysis_data
                         │
                         ▼ POST event=call_analyzed
                    n8n /webhook/retell-survey
                         ├─ IF event==call_analyzed AND call_status==ended AND duration_ms>0
                         ├─ Code: total + verdict
                         ├──► Gmail → jesus@datasmarts.net
                         └──► Google Sheets append
```

## Files in this repo

```
spanish-phone-survey/
├── BRAINSTORM.md                       original framing
├── README.md                           this file
├── resources/
│   └── Evaluación de los candidatos.md    source of truth: questions + rubric
├── retell/
│   ├── llm.json                        LLM config snapshot
│   └── agent.json                      Agent config + phone binding snapshot
├── n8n/
│   ├── setup-workflow.json             one-shot sheet creation (already ran)
│   ├── workflow.json                   post-call workflow source (older snapshot)
│   ├── workflow.live.json              full live export of the post-call workflow
│   └── web-survey-workflow.json        legacy n8n web call-back flow (deactivated, kept for reference)
└── web/                                ⬅ Vercel SPA (canonical web entrypoint)
    ├── index.html                      landing page: mic preflight + level meter + Retell SDK call
    ├── api/create-web-call.js          Vercel Edge fn that mints Retell access tokens
    ├── package.json                    project metadata
    ├── vercel.json                     outputDirectory + Cache + Permissions-Policy headers
    └── README.md                       deploy notes
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
| Tweak the SPA UI / branding | edit `web/index.html`, push, Vercel auto-redeploys |
| Pause the survey | deactivate workflow `tXttNyCL4uyzSKJj` in n8n (calls keep working but no email/sheet) |

## Recovery / debugging

- **Webhook delivery is fire-and-forget.** If n8n is down when Retell fires, the email and sheet row are lost. The call recording + transcript + custom analysis data are still preserved in Retell. To replay: `client.call.retrieve(call_id)` returns the same payload — POST it manually to the n8n webhook to recover.
- **Live n8n executions:** https://n8n.srv841363.hstgr.cloud/workflow/tXttNyCL4uyzSKJj/executions
- **Retell call log:** Retell dashboard → Calls → filter by agent `Spanish Survey — Programa Exportación`
- **Vercel logs:** the Edge fn for `/api/create-web-call` is visible in the Vercel project dashboard under Functions → Logs.

## What's NOT built (out of scope for v1)

- Webhook signature verification (could be added via header auth on the n8n webhook node)
- Auto-deduplication on `call_id` (replays would create duplicate rows/emails)
- Pretty PDF report
- Spanish-localized analytics dashboards
- Multi-tenant or admin UI

# Spanish Phone Survey — Web SPA (Vercel)

Static landing page that places a Retell web call (browser WebRTC) to the Spanish Survey agent. Deploy on Vercel; the post-call webhook is unchanged (still hits the n8n workflow at `n8n.srv841363.hstgr.cloud/webhook/retell-survey`).

## Layout

```
web/
├── index.html              # SPA: mic preflight + level meter + Retell SDK call
├── api/create-web-call.ts  # Vercel Edge function: mints Retell access_token
├── vercel.json             # Cache + Permissions-Policy headers
└── package.json
```

## Deploy

```bash
cd web/
npm i -g vercel        # if you don't have it
vercel login           # browser-based; pick your account
vercel link            # create or link a project
vercel env add RETELL_API_KEY production   # paste the API key when prompted
vercel --prod          # ship
```

Vercel will print a production URL like `https://spanish-survey.vercel.app`. Open it, click "Probar micrófono", then "Iniciar entrevista".

## Env vars

| Name             | Where        | Value                                 |
|------------------|--------------|---------------------------------------|
| `RETELL_API_KEY` | Vercel env   | the same API key the n8n workflow uses |

The agent ID is hard-coded in `api/create-web-call.ts` (`agent_c08a58dd2fc26d6bbb62911625`). Change there if you ever fork the agent.

## Why Vercel and not n8n's webhook

- Clean origin → no cached "deny mic" decision from past failed tests.
- Proper static hosting + edge function → no HTML-as-webhook-response trick.
- Permissions-Policy header explicitly grants mic to the page.
- Trivial to rotate by redeploy.

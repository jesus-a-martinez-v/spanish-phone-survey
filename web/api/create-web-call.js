export const config = { runtime: "edge" };

const AGENT_ID = "agent_c08a58dd2fc26d6bbb62911625";

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    return json({ error: "RETELL_API_KEY not configured" }, 500);
  }
  const r = await fetch("https://api.retellai.com/v2/create-web-call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ agent_id: AGENT_ID }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.access_token) {
    return json({ error: body?.message || `Retell HTTP ${r.status}` }, r.status >= 400 ? r.status : 502);
  }
  return json({ call_id: body.call_id, access_token: body.access_token });
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

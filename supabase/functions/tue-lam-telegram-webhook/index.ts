import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allow = new Set(["https://sancongcu.com", "https://www.sancongcu.com", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173"]);
const response = (body: unknown, status = 200, request?: Request) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": request && allow.has(request.headers.get("origin") ?? "") ? request.headers.get("origin")! : "https://sancongcu.com", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });

function secretKey() {
  if (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? ""; } catch { return ""; }
}
function publishableKey() {
  if (Deno.env.get("SUPABASE_ANON_KEY")) return Deno.env.get("SUPABASE_ANON_KEY")!;
  try { return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default ?? ""; } catch { return ""; }
}
async function db(path: string, init: RequestInit = {}) {
  const base = Deno.env.get("SUPABASE_URL")!;
  const key = secretKey();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  if (key.startsWith("ey")) headers.set("Authorization", `Bearer ${key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${base}/rest/v1/${path}`, { ...init, headers });
}

async function handleBrowserAction(request: Request, payload: Record<string, unknown>) {
  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : "";
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return response({ error: "Phiên chat không hợp lệ." }, 400, request);
  const afterId = Math.max(0, Math.floor(Number(payload.afterId) || 0));
  const result = await db(`tue_lam_chat_messages?session_id=eq.${sessionId}&role=eq.human&id=gt.${afterId}&select=id,content&order=id.asc&limit=20`);
  if (!result.ok) return response({ error: "Chưa tải được phản hồi." }, 503, request);
  return response({ messages: await result.json() }, 200, request);
}

async function handleTelegramUpdate(request: Request, update: Record<string, unknown>) {
  const configResponse = await db("tue_lam_telegram_config?id=eq.1&select=webhook_secret");
  const [config] = configResponse.ok ? await configResponse.json() : [];
  const suppliedSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!config?.webhook_secret || suppliedSecret !== config.webhook_secret) return response({ error: "Unauthorized" }, 401);
  const message = update.message as Record<string, unknown> | undefined;
  if (!message || message.from && (message.from as Record<string, unknown>).is_bot) return response({ ok: true });
  const chat = message.chat as Record<string, unknown> | undefined;
  const targetChatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!targetChatId || String(chat?.id) !== targetChatId) return response({ ok: true });
  const replyTo = message.reply_to_message as Record<string, unknown> | undefined;
  const outgoingId = Number(replyTo?.message_id);
  const text = typeof message.text === "string" ? message.text.trim().slice(0, 3500) : "";
  if (!replyTo || !Number.isFinite(outgoingId) || !text || text.startsWith("/")) return response({ ok: true });
  const sessionResponse = await db(`tue_lam_chat_sessions?telegram_message_id=eq.${outgoingId}&select=id`);
  const [session] = sessionResponse.ok ? await sessionResponse.json() : [];
  if (!session?.id) return response({ ok: true });
  const saved = await db("tue_lam_chat_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ session_id: session.id, role: "human", content: text }) });
  if (!saved.ok) return response({ error: "Could not save reply" }, 503);
  await db(`tue_lam_chat_sessions?id=eq.${session.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ updated_at: new Date().toISOString() }) });
  return response({ ok: true });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": allow.has(request.headers.get("origin") ?? "") ? request.headers.get("origin")! : "https://sancongcu.com", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return response({ error: "Invalid request" }, 400);
  if (payload.action === "poll") {
    const origin = request.headers.get("origin") ?? "";
    if (origin && !allow.has(origin)) return response({ error: "Origin not allowed" }, 403, request);
    try { return await handleBrowserAction(request, payload); } catch { return response({ error: "Poll failed" }, 503, request); }
  }
  try { return await handleTelegramUpdate(request, payload); } catch (error) {
    console.error("Telegram webhook failed", error);
    return response({ error: "Webhook processing failed" }, 503);
  }
});

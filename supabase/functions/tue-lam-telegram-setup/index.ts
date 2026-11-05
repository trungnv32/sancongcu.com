import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function envKey(name: string, legacyName: string) {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  try { return JSON.parse(Deno.env.get(name) ?? "{}").default ?? ""; } catch { return ""; }
}
const allowedOrigins = new Set(["https://sancongcu.com", "https://www.sancongcu.com", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173"]);
const response = (request: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigins.has(request.headers.get("origin") ?? "") ? request.headers.get("origin")! : "https://sancongcu.com", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": allowedOrigins.has(request.headers.get("origin") ?? "") ? request.headers.get("origin")! : "https://sancongcu.com", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (request.method !== "POST") return response(request, { error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization") ?? "";
  const publishable = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secret = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const base = Deno.env.get("SUPABASE_URL");
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!base || !publishable || !secret || !token) return response(request, { error: "Đăng nhập quản trị trước khi kết nối Telegram." }, 401);
  const identity = await fetch(`${base}/auth/v1/user`, { headers: { apikey: publishable, Authorization: `Bearer ${token}` } });
  const user = identity.ok ? await identity.json() : null;
  const email = String(user?.email ?? "").toLowerCase();
  if (!new Set(["sancongcu@gmail.com", "trungnv32@gmail.com"]).has(email)) return response(request, { error: "Tài khoản không có quyền kết nối Telegram." }, 403);

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken || !Deno.env.get("TELEGRAM_CHAT_ID")) return response(request, { error: "Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID." }, 503);
  const webhookSecret = Array.from(crypto.getRandomValues(new Uint8Array(40)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const dbHeaders = { apikey: secret, ...(secret.startsWith("ey") ? { Authorization: `Bearer ${secret}` } : {}), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" };
  const savedSecret = await fetch(`${base}/rest/v1/tue_lam_telegram_config?on_conflict=id`, { method: "POST", headers: dbHeaders, body: JSON.stringify({ id: 1, webhook_secret: webhookSecret, updated_at: new Date().toISOString() }) });
  if (!savedSecret.ok) return response(request, { error: "Không lưu được cấu hình webhook Telegram." }, 503);
  const ref = new URL(base).hostname.split(".")[0];
  const webhookUrl = `https://${ref}.supabase.co/functions/v1/tue-lam-telegram-webhook`;
  const existing = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const existingResult = await existing.json();
  const existingUrl = typeof existingResult?.result?.url === "string" ? existingResult.result.url : "";
  if (existingUrl && existingUrl !== webhookUrl) return response(request, { error: "Bot Telegram đang có webhook khác. Em chưa đổi để tránh làm gián đoạn kết nối hiện tại; cần kiểm tra webhook đang dùng trước." }, 409);
  const registered = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: webhookUrl, secret_token: webhookSecret, allowed_updates: ["message"] }) });
  const result = await registered.json();
  if (!registered.ok || !result.ok) return response(request, { error: "Telegram chưa chấp nhận webhook. Kiểm tra cấu hình bot rồi thử lại." }, 502);
  return response(request, { ok: true });
});

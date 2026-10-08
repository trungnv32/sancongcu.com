import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowedOrigins = new Set([
  "https://sancongcu.com",
  "https://www.sancongcu.com",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://sancongcu.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") {
    return json(request, { error: "Phương thức không được hỗ trợ." }, 405);
  }

  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    return json(request, { error: "Nguồn yêu cầu không hợp lệ." }, 403);
  }

  const payload = await request.json().catch(() => null);
  const phoneNumber = cleanText(payload?.phoneNumber, 40);
  const transcript = cleanText(payload?.transcript, 3000);
  const pageUrl = cleanText(payload?.pageUrl, 300);

  if (!transcript) {
    return json(request, { error: "Thiếu nội dung chat." }, 400);
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    return json(request, { error: "Chưa cấu hình Telegram cho Tuệ Lâm." }, 503);
  }

  const message = [
    "Tuệ Lâm có khách cần hỗ trợ",
    "",
    `SĐT: ${phoneNumber || "Khách chưa để lại SĐT"}`,
    pageUrl ? `Trang: ${pageUrl}` : "",
    "",
    "Nội dung chat:",
    transcript,
  ]
    .filter(Boolean)
    .join("\n");

  const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });

  if (!telegramResponse.ok) {
    const errorPayload = await telegramResponse.json().catch(() => null);
    const telegramError =
      typeof errorPayload?.description === "string"
        ? errorPayload.description
        : "Telegram chưa nhận được tin.";
    return json(request, { error: telegramError }, 502);
  }

  return json(request, { message: "Đã chuyển thông tin về Telegram." });
});

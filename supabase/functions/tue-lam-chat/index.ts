import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { tueLamBrain } from "./brain.ts";

const allowedOrigins = new Set(["https://sancongcu.com", "https://www.sancongcu.com", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173"]);
const headers = (request: Request) => ({ "Access-Control-Allow-Origin": allowedOrigins.has(request.headers.get("origin") ?? "") ? request.headers.get("origin")! : "https://sancongcu.com", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" });
const json = (request: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers(request), "Content-Type": "application/json" } });
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

function getSecretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? ""; } catch { return ""; }
}

async function db(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = getSecretKey();
  if (!url || !key) throw new Error("Supabase server credentials are not configured.");
  const requestHeaders = new Headers(init.headers);
  requestHeaders.set("apikey", key);
  if (key.startsWith("ey")) requestHeaders.set("Authorization", `Bearer ${key}`);
  if (init.body && !requestHeaders.has("Content-Type")) requestHeaders.set("Content-Type", "application/json");
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: requestHeaders });
}

async function telegramSend(text: string, replyMarkup?: Record<string, unknown>) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) throw new Error("Telegram chưa được cấu hình.");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: replyMarkup }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error("Telegram chưa nhận được tin.");
  return result.result as { message_id: number };
}

async function sendHandoff(sessionId: string) {
  const sessionResponse = await db(`tue_lam_chat_sessions?id=eq.${sessionId}&select=page_url,customer_phone`);
  if (!sessionResponse.ok) return;
  const [session] = await sessionResponse.json();
  const messagesResponse = await db(`tue_lam_chat_messages?session_id=eq.${sessionId}&select=role,content,created_at&order=id.desc&limit=18`);
  const rows = messagesResponse.ok ? await messagesResponse.json() : [];
  const transcript = rows.reverse().map((row: { role: string; content: string }) => `${row.role === "customer" ? "Khách" : row.role === "human" ? "Anh Trung" : "Tuệ Lâm"}: ${row.content}`).join("\n").slice(-2600);
  const sent = await telegramSend([
    "Tuệ Lâm — khách cần anh hỗ trợ",
    `SĐT: ${session?.customer_phone || "Chưa cung cấp"}`,
    `Phiên chat: ${sessionId}`,
    session?.page_url ? `Trang: ${session.page_url}` : "",
    "",
    transcript,
    "",
    "Reply trực tiếp tin này để gửi câu trả lời về website cho khách.",
  ].filter(Boolean).join("\n"));
  await db(`tue_lam_chat_sessions?id=eq.${sessionId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ telegram_message_id: sent.message_id, telegram_alerted_at: new Date().toISOString() }) });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headers(request) });
  if (request.method !== "POST") return json(request, { error: "Phương thức không được hỗ trợ." }, 405);
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(request, { error: "Nguồn yêu cầu không hợp lệ." }, 403);
  const payload = await request.json().catch(() => null);
  if (payload?.action === "new-order") {
    const orderCode = clean(payload?.orderCode, 40).toUpperCase();
    if (!/^SC[A-Z0-9]{6,20}$/.test(orderCode)) return json(request, { error: "Mã đơn không hợp lệ." }, 400);
    try {
      const orderResponse = await db(`orders?order_code=eq.${encodeURIComponent(orderCode)}&select=id,order_code,status,total_amount,transfer_note,created_at,order_items(skill_title)&limit=1`);
      const [order] = orderResponse.ok ? await orderResponse.json() : [];
      if (!order) return json(request, { error: "Không tìm thấy đơn hàng." }, 404);
      const claimResponse = await db(`orders?id=eq.${order.id}&tue_lam_telegram_notified_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ tue_lam_telegram_notified_at: new Date().toISOString() }) });
      const [claimed] = claimResponse.ok ? await claimResponse.json() : [];
      if (!claimed) return json(request, { ok: true, alreadyNotified: true });
      const items = (order.order_items ?? []).map((item: { skill_title: string }) => item.skill_title).join(", ");
      try {
        await telegramSend(["Tuệ Lâm — có đơn hàng mới", `Mã đơn: ${order.order_code}`, `Giá trị: ${Number(order.total_amount).toLocaleString("vi-VN")}đ`, `Trạng thái: ${order.status}`, items ? `Sản phẩm: ${items}` : "", `Nội dung chuyển khoản: ${order.transfer_note}`].filter(Boolean).join("\n"));
      } catch (error) {
        await db(`orders?id=eq.${order.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ tue_lam_telegram_notified_at: null }) });
        throw error;
      }
      return json(request, { ok: true });
    } catch (error) {
      console.error("Telegram new order notification failed", error);
      return json(request, { error: "Chưa gửi được thông báo đơn hàng." }, 503);
    }
  }
  const sessionId = clean(payload?.sessionId, 50);
  const content = clean(payload?.message, 1600);
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !content) return json(request, { error: "Thiếu nội dung chat." }, 400);

  try {
    const session = await db("tue_lam_chat_sessions?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: sessionId, page_url: clean(payload?.pageUrl, 300) }) });
    if (!session.ok) throw new Error("Không lưu được phiên chat.");
    const phone = content.match(/(?:\+?84|0)(?:[\s.-]?\d){8,10}/)?.[0] ?? "";
    if (phone) await db(`tue_lam_chat_sessions?id=eq.${sessionId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ customer_phone: phone.replace(/\s/g, " ") }) });
    const inserted = await db("tue_lam_chat_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ session_id: sessionId, role: "customer", content }) });
    if (!inserted.ok) throw new Error("Không lưu được tin nhắn.");

    const historyResponse = await db(`tue_lam_chat_messages?session_id=eq.${sessionId}&select=role,content&order=id.desc&limit=12`);
    const history = historyResponse.ok ? await historyResponse.json() : [];
    const [brainResponse, catalogResponse, trainingResponse, comboResponse] = await Promise.all([
      db("tue_lam_brain?id=eq.1&select=markdown").catch(() => null),
      db("skills?select=id,slug,title,short_description,introduction,benefits,audience,usage_steps,price_usd,activation_price_vnd&status=eq.published&order=sort_order.asc").catch(() => null),
      db("training_courses?select=id,name,duration,price_label,sale_price_label,bonus,highlight&is_visible=eq.true&order=sort_order.asc").catch(() => null),
      db("combos?select=slug,label,title,description,includes,cta_label,status,sort_order&status=eq.published&order=sort_order.asc").catch(() => null),
    ]);
    const [brainRow] = brainResponse?.ok ? await brainResponse.json() : [];
    const catalog = catalogResponse?.ok ? await catalogResponse.json() : [];
    const training = trainingResponse?.ok ? await trainingResponse.json() : [];
    const combos = comboResponse?.ok ? await comboResponse.json() : [];
    const brainText = clean(brainRow?.markdown, 140_000);
    const system = `${tueLamBrain}\n\n${brainText ? `TÀI LIỆU NÃO DO QUẢN TRỊ VIÊN CẬP NHẬT:\n${brainText}` : ""}\n\nDANH MỤC SKILL ĐANG CÔNG KHAI:\n${JSON.stringify(catalog)}\n\nCOMBO WEBSITE ĐANG CÔNG KHAI:\n${JSON.stringify(combos)}\n\nCOMBO ĐÀO TẠO WEBSITE ĐANG HIỆN HÀNH:\n${JSON.stringify(training)}\n\nChỉ dùng danh mục đang công khai để tư vấn sản phẩm. Nếu danh mục trống hoặc thiếu thông tin, nói rõ chưa xác minh.`;
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Chưa cấu hình Gemini API key.");
    const model = Deno.env.get("TUE_LAM_MODEL") ?? "gemini-3.5-flash-lite";
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: history.reverse().map((item: { role: string; content: string }) => ({ role: item.role === "assistant" ? "model" : "user", parts: [{ text: item.content }] })), generationConfig: { temperature: 0.4, maxOutputTokens: 500 } }),
    });
    if (!aiResponse.ok) {
      const providerError = await aiResponse.text().catch(() => "");
      console.error("Gemini API rejected the chat request", aiResponse.status, providerError.slice(0, 1200));
      throw new Error(`Gemini chưa trả lời được (${aiResponse.status}).`);
    }
    const result = await aiResponse.json();
    const reply = clean(result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join(""), 2400);
    if (!reply) throw new Error("Tuệ Lâm chưa tạo được câu trả lời.");
    const savedReply = await db("tue_lam_chat_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ session_id: sessionId, role: "assistant", content: reply }) });
    if (!savedReply.ok) throw new Error("Không lưu được câu trả lời.");
    const savedSessionResponse = await db(`tue_lam_chat_sessions?id=eq.${sessionId}&select=customer_phone`);
    const [savedSession] = savedSessionResponse.ok ? await savedSessionResponse.json() : [];
    const complaint = /(khiếu nại|hoàn tiền|đổi skill|chưa nhận|đã thanh toán|gặp quản lý|người thật|không hài lòng|thất vọng|phàn nàn|phản ánh)/i.test(content);
    const needsHuman = complaint && Boolean(savedSession?.customer_phone);
    let handoffSent = false;
    if (needsHuman) {
      try { await sendHandoff(sessionId); handoffSent = true; } catch (error) { console.error("Telegram handoff failed", error); }
    }
    if (needsHuman && !handoffSent) {
      const fallback = "\n\nHiện em chưa chuyển được thông báo tự động. Anh/chị vui lòng nhắn trực tiếp Zalo 0938.069.668 để anh Trung hỗ trợ nhé.";
      reply += fallback;
      await db("tue_lam_chat_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ session_id: sessionId, role: "assistant", content: fallback.trim() }) });
    }
    return json(request, { reply, handoff: handoffSent });
  } catch (error) {
    console.error("Tuệ Lâm chat failed", error);
    return json(request, { error: error instanceof Error && error.message.includes("Gemini API key") ? "Chatbot chưa được cấu hình Gemini API key." : "Tuệ Lâm đang gặp sự cố kết nối. Anh/chị thử lại sau ít phút hoặc nhắn Zalo 0938.069.668 nhé." }, 503);
  }
});

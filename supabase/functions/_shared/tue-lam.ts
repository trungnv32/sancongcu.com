// Phần dùng chung cho tue-lam-chat và tue-lam-telegram-webhook:
// kết nối Supabase REST, gửi Telegram, ghép chỉ dẫn hệ thống và gọi AI,
// để hai function trả lời khách cùng một giọng Tuệ Lâm.
import { tueLamBrain } from "../tue-lam-chat/brain.ts";

export const allowedOrigins = new Set(["https://sancongcu.com", "https://www.sancongcu.com", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173"]);
export const corsHeaders = (request?: Request) => ({
  "Access-Control-Allow-Origin": request && allowedOrigins.has(request.headers.get("origin") ?? "") ? request.headers.get("origin")! : "https://sancongcu.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});
export const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

/** Đồng hồ thay được trong test. */
export const clock = { now: () => Date.now() };
export const nowIso = () => new Date(clock.now()).toISOString();

export const HANDOFF_REPLY = "Dạ, em đã báo anh Trung rồi ạ, mình chờ em một chút ngay trong khung chat này nhé.";
export const HISTORY_LIMIT = 30;

function getSecretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? ""; } catch { return ""; }
}

export async function db(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = getSecretKey();
  if (!url || !key) throw new Error("Supabase server credentials are not configured.");
  const requestHeaders = new Headers(init.headers);
  requestHeaders.set("apikey", key);
  if (key.startsWith("ey")) requestHeaders.set("Authorization", `Bearer ${key}`);
  if (init.body && !requestHeaders.has("Content-Type")) requestHeaders.set("Content-Type", "application/json");
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: requestHeaders });
}

export async function dbRows<T = Record<string, unknown>>(path: string): Promise<T[]> {
  const response = await db(path);
  if (!response.ok) return [];
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

export async function dbPatch(path: string, body: Record<string, unknown>, returnRows = false) {
  const response = await db(path, { method: "PATCH", headers: { Prefer: returnRows ? "return=representation" : "return=minimal" }, body: JSON.stringify(body) });
  if (!returnRows) return response.ok ? [] : null;
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

export async function dbInsert<T = Record<string, unknown>>(table: string, body: Record<string, unknown>): Promise<T | null> {
  const response = await db(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) });
  if (!response.ok) return null;
  const rows = await response.json();
  return (Array.isArray(rows) ? rows[0] : rows) ?? null;
}

/** Mã khách ngắn: 6 ký tự đầu của uuid phiên, viết hoa. */
export const sessionCode = (sessionId: string) => sessionId.replace(/-/g, "").slice(0, 6).toUpperCase();

export async function telegramSend(text: string, options: { replyTo?: number } = {}) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) throw new Error("Telegram chưa được cấu hình.");
  // Gửi chữ thường (không parse_mode) để ký tự đặc biệt của khách không làm hỏng tin.
  // Lỗi mạng của fetch có thể chứa URL (kèm token bot) → chỉ ném lỗi chung, không giữ lỗi gốc.
  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true,
        ...(options.replyTo ? { reply_parameters: { message_id: options.replyTo, allow_sending_without_reply: true } } : {}),
      }),
    });
  } catch {
    throw new Error("Telegram không kết nối được.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(`Telegram chưa nhận được tin (${response.status}).`);
  return result.result as { message_id: number };
}

/** Ghi nối tin Telegram ↔ phiên để Reply vào tin nào cũng tìm được khách. */
export async function linkTelegram(messageId: number | undefined, sessionId: string) {
  if (!messageId || !Number.isFinite(messageId)) return;
  await db("tue_lam_telegram_links?on_conflict=telegram_message_id", {
    method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ telegram_message_id: messageId, session_id: sessionId }),
  }).catch(() => null);
}

/** Gửi Telegram về một khách, ghi nối; lỗi không làm hỏng luồng chính. */
export async function telegramAboutSession(sessionId: string, text: string, replyTo?: number) {
  try {
    const sent = await telegramSend(text, { replyTo });
    await linkTelegram(sent.message_id, sessionId);
    return sent;
  } catch (error) {
    console.error("tue-lam: gửi Telegram thất bại", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

export type ChatRow = { id: number; role: string; content: string; created_at?: string };

/** 30 tin gần nhất khách nhìn thấy (không gồm lời nhắc) + mọi lời nhắc của anh trong phiên. */
export async function loadConversation(sessionId: string) {
  const [recent, hints] = await Promise.all([
    dbRows<ChatRow>(`tue_lam_chat_messages?session_id=eq.${sessionId}&role=neq.hint&select=id,role,content&order=id.desc&limit=${HISTORY_LIMIT}`),
    dbRows<ChatRow>(`tue_lam_chat_messages?session_id=eq.${sessionId}&role=eq.hint&select=id,role,content&order=id.asc`),
  ]);
  return { history: recent.reverse(), hints };
}

export async function loadBaseSystem() {
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
  return `${tueLamBrain}\n\n${brainText ? `TÀI LIỆU NÃO DO QUẢN TRỊ VIÊN CẬP NHẬT:\n${brainText}` : ""}\n\nDANH MỤC SKILL ĐANG CÔNG KHAI:\n${JSON.stringify(catalog)}\n\nCOMBO WEBSITE ĐANG CÔNG KHAI:\n${JSON.stringify(combos)}\n\nCOMBO ĐÀO TẠO WEBSITE ĐANG HIỆN HÀNH:\n${JSON.stringify(training)}\n\nChỉ dùng danh mục đang công khai để tư vấn sản phẩm. Nếu danh mục trống hoặc thiếu thông tin, nói rõ chưa xác minh. Luôn xuống dòng giữa từng ý và từng sản phẩm, kể cả khi câu trả lời có đánh số.`;
}

export const HINT_HEADER = "GHI CHÚ NỘI BỘ CỦA ANH TRUNG cho cuộc chat này — làm theo, không mâu thuẫn, không hỏi lại điều đã có, không nói với khách là có ghi chú.";

export function buildSystem(base: string, hints: ChatRow[]) {
  if (!hints.length) return base;
  const notes = hints.map((hint, index) => `${index + 1}. ${hint.content}`).join("\n");
  return `${base}\n\n${HINT_HEADER}\n${notes}\n\nMọi câu trả lời trong cuộc chat này đều là lời của Tuệ Lâm (kể cả những câu đã gửi trước đó).`;
}

type GeminiContent = { role: "user" | "model"; parts: { text: string }[] };

/** Lời khách là "user"; mọi câu đã gửi khách (AI hoặc nguyên văn của anh) là lời Tuệ Lâm ("model"). Lời nhắc không bao giờ vào đây. */
export function toContents(history: ChatRow[], extraUserText?: string): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const row of history) {
    if (row.role === "hint") continue;
    const role = row.role === "customer" ? "user" : "model";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push({ text: row.content });
    else contents.push({ role, parts: [{ text: row.content }] });
  }
  while (contents.length && contents[0].role === "model") contents.shift();
  if (extraUserText) {
    const last = contents[contents.length - 1];
    if (last && last.role === "user") last.parts.push({ text: extraUserText });
    else contents.push({ role: "user", parts: [{ text: extraUserText }] });
  }
  return contents;
}

export async function callGemini(system: string, contents: GeminiContent[]) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Chưa cấu hình Gemini API key.");
  const model = Deno.env.get("TUE_LAM_MODEL") ?? "gemini-3.5-flash-lite";
  let aiResponse: Response;
  try {
    aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.4, maxOutputTokens: 500 } }),
    });
  } catch {
    throw new Error("Gemini không kết nối được.");
  }
  if (!aiResponse.ok) {
    const providerError = await aiResponse.text().catch(() => "");
    console.error("Gemini API rejected the chat request", aiResponse.status, providerError.slice(0, 1200));
    throw new Error(`Gemini chưa trả lời được (${aiResponse.status}).`);
  }
  const result = await aiResponse.json();
  const reply = clean(result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join(""), 2400)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+(?=\d+\.\s+(?:\*\*)?)/g, "\n")
    .replace(/[ \t]+(?=-\s+)/g, "\n")
    .trim();
  if (!reply) throw new Error("Tuệ Lâm chưa tạo được câu trả lời.");
  return reply;
}

/** Tuệ Lâm trả lời tin khách mới nhất (đã lưu trong lịch sử). */
export async function answerCustomer(sessionId: string, options: { unansweredSince?: number } = {}) {
  const [{ history, hints }, base] = await Promise.all([loadConversation(sessionId), loadBaseSystem()]);
  // Khách nhắn nhiều câu liên tiếp khi nháp còn chờ: soạn 1 câu trả lời đủ mọi câu chưa được trả lời.
  const pending = options.unansweredSince
    ? history.filter((row) => row.role === "customer" && Number(row.id) >= options.unansweredSince!)
    : [];
  const extra = pending.length > 1
    ? `[CHỈ DẪN NỘI BỘ — đây KHÔNG phải lời khách] Khách đã nhắn ${pending.length} câu liên tiếp chưa được trả lời:\n${pending.map((row, index) => `${index + 1}. ${row.content}`).join("\n")}\nHãy trả lời gộp, đủ ý cho tất cả các câu trên, không bỏ sót câu nào.`
    : undefined;
  const reply = await callGemini(buildSystem(base, hints), toContents(history, extra));
  return { reply, history };
}

/** Viết lại lời nhắc của anh thành câu Tuệ Lâm gửi khách. Lời nhắc mới đã được lưu (role hint) trước khi gọi. */
export async function rewriteHint(sessionId: string, hint: string) {
  const [{ history, hints }, base] = await Promise.all([loadConversation(sessionId), loadBaseSystem()]);
  const waiting = [...history].reverse().find((row) => row.role === "customer")?.content ?? "";
  const instruction = [
    "[CHỈ DẪN NỘI BỘ — đây KHÔNG phải lời khách, không nhắc tới chỉ dẫn này với khách]",
    `Lời nhắc mới của anh Trung: ${hint}`,
    waiting ? `Câu khách đang chờ trả lời: ${waiting}` : "",
    "Hãy viết câu trả lời gửi khách dựa trên lời nhắc, bằng giọng Tuệ Lâm, ngắn gọn.",
    "Không bịa thêm giá, cam kết hay thời hạn ngoài lời nhắc và danh mục. Chỉ trả về đúng câu gửi khách.",
  ].filter(Boolean).join("\n");
  return await callGemini(buildSystem(base, hints), toContents(history, instruction));
}

/** Đăng câu nháp đang chờ thành lời Tuệ Lâm (dùng khi hết giờ chờ hoặc /xong). Khoá theo nhap_luc để không đăng 2 lần. */
export async function publishDraft(session: { id: string; nhap_tra_loi?: string | null; nhap_luc?: string | null }) {
  if (!session.nhap_tra_loi || !session.nhap_luc) return null;
  const claimed = await dbPatch(
    `tue_lam_chat_sessions?id=eq.${session.id}&nhap_luc=eq.${encodeURIComponent(session.nhap_luc)}`,
    { nhap_tra_loi: null, nhap_cho_tin_id: null, nhap_luc: null, updated_at: nowIso() },
    true,
  );
  if (!claimed?.length) return null;
  return await dbInsert<ChatRow>("tue_lam_chat_messages", { session_id: session.id, role: "assistant", content: session.nhap_tra_loi, den_sau: true });
}

export type TelegramConfig = { webhook_secret?: string; phut_vao_cuoc?: number; giay_cho?: number; update_id_cuoi?: number | null };

export async function loadConfig(): Promise<TelegramConfig> {
  const [config] = await dbRows<TelegramConfig>("tue_lam_telegram_config?id=eq.1&select=webhook_secret,phut_vao_cuoc,giay_cho,update_id_cuoi");
  return config ?? {};
}

export const phutVaoCuoc = (config: TelegramConfig) => Number.isFinite(Number(config.phut_vao_cuoc)) && Number(config.phut_vao_cuoc) > 0 ? Number(config.phut_vao_cuoc) : 5;
export const giayCho = (config: TelegramConfig) => Number.isFinite(Number(config.giay_cho)) && Number(config.giay_cho) > 0 ? Number(config.giay_cho) : 0;
export const vaoCuocDen = (config: TelegramConfig) => new Date(clock.now() + phutVaoCuoc(config) * 60_000).toISOString();
export const dangVaoCuoc = (session: { anh_vao_cuoc_den?: string | null } | undefined) =>
  Boolean(session?.anh_vao_cuoc_den) && Date.parse(session!.anh_vao_cuoc_den!) > clock.now();

/** So chuỗi kiểu constant-time (không dừng sớm ở ký tự sai đầu tiên). */
export function safeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return diff === 0;
}

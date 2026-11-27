import {
  allowedOrigins, clock, corsHeaders, dangVaoCuoc, dbInsert, dbPatch, dbRows, giayCho, linkTelegram, loadConfig,
  nowIso, phutVaoCuoc, publishDraft, rewriteHint, safeEqual, sessionCode, telegramAboutSession, telegramSend, vaoCuocDen,
  type ChatRow, type TelegramConfig,
} from "../_shared/tue-lam.ts";

const response = (body: unknown, status = 200, request?: Request) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders(request) } });
const skip = (reason: string) => { console.log(`tue-lam-webhook: bỏ qua (${reason})`); return response({ ok: true }); };

type Session = { id: string; customer_phone?: string; anh_vao_cuoc_den?: string | null; nhap_tra_loi?: string | null; nhap_luc?: string | null; telegram_alerted_at?: string | null };
const SESSION_FIELDS = "id,customer_phone,anh_vao_cuoc_den,nhap_tra_loi,nhap_luc,telegram_alerted_at";

// ---------- Trình duyệt hỏi tin (poll) ----------

/** Giới hạn tần suất nhẹ theo phiên (trong một tiến trình). */
const lastPollAt = new Map<string, number>();
const MIN_POLL_GAP_MS = 1500;
export const resetPollLimiter = () => lastPollAt.clear();

function tooFrequent(sessionId: string) {
  const now = clock.now();
  const last = lastPollAt.get(sessionId) ?? 0;
  if (now - last < MIN_POLL_GAP_MS) return true;
  lastPollAt.set(sessionId, now);
  if (lastPollAt.size > 5000) lastPollAt.clear();
  return false;
}

/** Hết giờ chờ thì đăng câu nháp thành lời Tuệ Lâm (không gọi AI lại). */
async function publishExpiredDraft(session: Session) {
  if (!session.nhap_tra_loi || !session.nhap_luc) return false;
  const config = await loadConfig().catch(() => ({} as TelegramConfig));
  const wait = giayCho(config);
  if (Date.parse(session.nhap_luc) + wait * 1000 > clock.now()) return false;
  const posted = await publishDraft(session);
  if (posted) await telegramAboutSession(session.id, `#${sessionCode(session.id)} hết thời gian chờ, Tuệ Lâm đã tự gửi câu đã soạn: "${session.nhap_tra_loi}"`);
  return Boolean(posted);
}

async function handleBrowserAction(request: Request, payload: Record<string, unknown>) {
  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.toLowerCase() : "";
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return response({ error: "Phiên chat không hợp lệ." }, 400, request);
  if (tooFrequent(sessionId)) return response({ error: "Hỏi tin quá nhanh." }, 429, request);
  const [session] = await dbRows<Session>(`tue_lam_chat_sessions?id=eq.${sessionId}&select=${SESSION_FIELDS}`);
  let draftPending = Boolean(session?.nhap_tra_loi);
  if (session && draftPending && await publishExpiredDraft(session)) draftPending = false;
  const status = { dang_soan: draftPending, da_chuyen: Boolean(session?.telegram_alerted_at) };

  if (payload.action === "lich-su") {
    // Khôi phục khung chat khi tải lại trang. Không bao giờ gồm lời nhắc (hint).
    const rows = await dbRows<ChatRow>(`tue_lam_chat_messages?session_id=eq.${sessionId}&role=in.(customer,assistant,human)&select=id,role,content&order=id.desc&limit=60`);
    const messages = rows.reverse().map((row) => ({ id: row.id, from: row.role === "customer" ? "customer" : "tue-lam", content: row.content }));
    return response({ messages, afterId: messages.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0), ...status }, 200, request);
  }

  const afterId = Math.max(0, Math.floor(Number(payload.afterId) || 0));
  const result = await dbRows<ChatRow>(`tue_lam_chat_messages?session_id=eq.${sessionId}&role=in.(assistant,human)&or=(den_sau.is.true,role.eq.human)&id=gt.${afterId}&select=id,content&order=id.asc&limit=20`);
  // Chỉ trả id + nội dung: không lộ vai trò nội bộ.
  return response({ messages: result.map((row) => ({ id: row.id, content: row.content })), ...status }, 200, request);
}

// ---------- Tin của anh trên Telegram ----------

const HELP = [
  "Cách dùng Tuệ Lâm trên Telegram:",
  "- Reply vào tin của khách (hoặc nhắn #MÃ ở đầu) rồi gõ lời nhắc: Tuệ Lâm viết lại theo giọng của mình và trả lời khách.",
  "- Gõ ! ở đầu: khách nhận đúng nguyên văn.",
  "- /xong: kết thúc, Tuệ Lâm tự chăm khách tiếp.",
  "- /cho 60: tin khách chờ anh 60 giây trước khi Tuệ Lâm tự gửi. /cho 0 để tắt.",
  "- /phut 5: đổi số phút anh vào cuộc.",
  "- /dang: xem khách đang trong chế độ anh vào cuộc.",
].join("\n");

// #mã chỉ nhận ở ĐẦU tin (sau khoảng trắng đầu), không bắt "#" giữa câu.
const CODE_PATTERN = /^\s*#([0-9a-z]{6})(?=\s|$|[:,.])[:,.]?/i;

async function sessionsByCode(code: string) {
  if (!/^[0-9a-f]{6}$/i.test(code)) return [];
  const lower = code.toLowerCase();
  return await dbRows<Session>(`tue_lam_chat_sessions?id=gte.${lower}00-0000-0000-0000-000000000000&id=lte.${lower}ff-ffff-ffff-ffff-ffffffffffff&select=${SESSION_FIELDS}&order=updated_at.desc&limit=3`);
}

async function sessionByTelegramMessage(messageId: number) {
  const [link] = await dbRows<{ session_id: string }>(`tue_lam_telegram_links?telegram_message_id=eq.${messageId}&select=session_id`);
  const filter = link?.session_id ? `id=eq.${link.session_id}` : `telegram_message_id=eq.${messageId}`;
  const [session] = await dbRows<Session>(`tue_lam_chat_sessions?${filter}&select=${SESSION_FIELDS}`);
  return session ?? null;
}

async function activeSessions() {
  return await dbRows<Session>(`tue_lam_chat_sessions?anh_vao_cuoc_den=gt.${encodeURIComponent(nowIso())}&select=${SESSION_FIELDS}&order=anh_vao_cuoc_den.desc&limit=20`);
}

/** Chọn khách: Reply → #mã → đúng 1 khách đang vào cuộc. Không đoán. */
async function resolveTarget(replyToId: number | null, code: string | null): Promise<{ session: Session } | { error: string }> {
  let byReply: Session | null = null;
  if (replyToId) {
    byReply = await sessionByTelegramMessage(replyToId);
    if (!byReply && !code) return { error: "Tin anh Reply không gắn với khách nào. Anh Reply vào tin báo của khách hoặc thêm #mã ở đầu nhé." };
  }
  if (code) {
    const matches = await sessionsByCode(code);
    if (!matches.length) return { error: `Mã #${code.toUpperCase()} không tồn tại. Anh kiểm tra lại mã hoặc bấm Reply vào tin của khách nhé.` };
    if (matches.length > 1) return { error: `Mã #${code.toUpperCase()} trùng nhiều khách. Anh bấm Reply vào đúng tin của khách nhé.` };
    if (byReply && byReply.id !== matches[0].id) return { error: `Tin anh Reply là của #${sessionCode(byReply.id)} nhưng mã ghi #${code.toUpperCase()}. Em chưa gửi để tránh nhầm khách.` };
    return { session: matches[0] };
  }
  if (byReply) return { session: byReply };
  const active = await activeSessions();
  if (active.length === 1) return { session: active[0] };
  if (!active.length) return { error: "Em chưa biết khách nào. Anh bấm Reply vào tin của khách hoặc thêm #mã ở đầu nhé." };
  return { error: `Đang có ${active.length} khách anh vào cuộc: ${active.map((row) => `#${sessionCode(row.id)}`).join(", ")}. Anh bấm Reply hoặc thêm #mã để em gửi đúng người.` };
}

async function reply(text: string, replyTo?: number, sessionId?: string) {
  if (sessionId) return await telegramAboutSession(sessionId, text, replyTo);
  try { return await telegramSend(text, { replyTo }); } catch { console.error("tue-lam-webhook: không gửi được tin báo lại"); return null; }
}

async function handleCommand(command: string, argument: string, messageId: number, replyToId: number | null, code: string | null, config: TelegramConfig) {
  if (command === "/start" || command === "/help" || command === "/huongdan") { await reply(HELP, messageId); return; }
  if (command === "/cho" || command === "/phut") {
    const value = Number(argument);
    const isCho = command === "/cho";
    const [min, max] = isCho ? [0, 600] : [1, 120];
    if (!/^\d+$/.test(argument) || value < min || value > max) {
      await reply(isCho ? "Anh gõ /cho kèm số giây từ 0 đến 600, ví dụ /cho 60." : "Anh gõ /phut kèm số phút từ 1 đến 120, ví dụ /phut 5.", messageId);
      return;
    }
    const saved = await dbPatch("tue_lam_telegram_config?id=eq.1", isCho ? { giay_cho: value, updated_at: nowIso() } : { phut_vao_cuoc: value, updated_at: nowIso() });
    if (!saved) { await reply("Em chưa lưu được cài đặt, anh thử lại sau ít phút nhé.", messageId); return; }
    await reply(isCho
      ? value === 0 ? "✓ Đã tắt chờ. Tuệ Lâm trả lời khách ngay, anh xem và nhắc thêm khi cần." : `✓ Từ giờ mỗi tin khách chờ anh ${value} giây. Anh nhắc hoặc gõ ! trong ${value} giây thì dùng câu của anh, quá giờ Tuệ Lâm tự gửi câu đã soạn.`
      : `✓ Từ giờ mỗi lần anh nhắc, anh vào cuộc ${value} phút.`, messageId);
    return;
  }
  if (command === "/dang") {
    const active = await activeSessions();
    if (!active.length) { await reply("Hiện không có khách nào trong chế độ anh vào cuộc.", messageId); return; }
    const lines = active.map((row) => {
      const minutes = Math.max(1, Math.ceil((Date.parse(row.anh_vao_cuoc_den!) - clock.now()) / 60_000));
      return `#${sessionCode(row.id)} · ${row.customer_phone || "chưa có SĐT"} · còn ${minutes} phút${row.nhap_tra_loi ? " · đang có câu nháp chờ gửi" : ""}`;
    });
    const sent = await reply(`Khách đang vào cuộc (${active.length}):\n${lines.join("\n")}`, messageId);
    if (active.length === 1 && sent) await linkTelegram(sent.message_id, active[0].id);
    return;
  }
  if (command === "/xong") {
    const target = await resolveTarget(replyToId, code);
    if ("error" in target) { await reply(target.error, messageId); return; }
    const session = target.session;
    const posted = await publishDraft(session);
    await dbPatch(`tue_lam_chat_sessions?id=eq.${session.id}`, { anh_vao_cuoc_den: null, updated_at: nowIso() });
    await reply(`✓ Đã kết thúc #${sessionCode(session.id)}. Tuệ Lâm tự chăm khách này tiếp, em không chuyển tin của khách này nữa.${posted ? " Câu nháp đang chờ đã được gửi cho khách." : ""}`, messageId, session.id);
    return;
  }
  void config;
  await reply(`Em chưa hiểu lệnh ${command}.\n\n${HELP}`, messageId);
}

type UpdateState = { claimed: boolean; messageId: number };

async function handleTelegramUpdate(request: Request, update: Record<string, unknown>, state: UpdateState) {
  const config = await loadConfig();
  const suppliedSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!config?.webhook_secret || !safeEqual(suppliedSecret, config.webhook_secret)) return response({ error: "Unauthorized" }, 401);

  // Chống xử lý trùng khi Telegram gửi lại cùng update_id.
  const updateId = Number(update.update_id);
  if (Number.isFinite(updateId) && updateId > 0) {
    if (config.update_id_cuoi != null && updateId <= Number(config.update_id_cuoi)) return skip("update_id lặp");
    const claimed = await dbPatch(`tue_lam_telegram_config?id=eq.1&or=(update_id_cuoi.is.null,update_id_cuoi.lt.${updateId})`, { update_id_cuoi: updateId }, true);
    if (!claimed?.length) return skip("update_id đã xử lý");
  }
  state.claimed = true;

  const message = update.message as Record<string, unknown> | undefined;
  if (!message) return skip("không phải tin nhắn");
  if (message.from && (message.from as Record<string, unknown>).is_bot) return skip("tin của bot");
  const chat = message.chat as Record<string, unknown> | undefined;
  const targetChatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!targetChatId || String(chat?.id) !== targetChatId) return skip("sai chat_id");
  const messageId = Number(message.message_id) || 0;
  state.messageId = messageId;
  const replyTo = message.reply_to_message as Record<string, unknown> | undefined;
  const replyToId = Number(replyTo?.message_id) || null;
  const rawText = typeof message.text === "string" ? message.text.trim().slice(0, 3500) : "";
  if (!rawText) {
    console.log("tue-lam-webhook: tin không có chữ");
    await reply("Em chỉ nhận chữ. Anh gõ nội dung bằng chữ (ảnh, file, sticker, tin thoại em chưa chuyển được cho khách) nhé.", messageId);
    return response({ ok: true });
  }

  const codeMatch = rawText.match(CODE_PATTERN);
  const code = codeMatch ? codeMatch[1] : null;
  const text = codeMatch ? rawText.replace(CODE_PATTERN, "").trim() : rawText;

  if (text.startsWith("/")) {
    const [head, ...rest] = text.split(/\s+/);
    const argument = rest.join(" ").trim();
    // Lệnh cho phép ghi mã ngay sau lệnh: "/xong #ABC123".
    const commandCode = code ?? argument.match(/^#([0-9a-z]{6})$/i)?.[1] ?? null;
    await handleCommand(head.toLowerCase().replace(/@\w+$/, ""), argument, messageId, replyToId, commandCode, config);
    return response({ ok: true });
  }
  if (!text) { await reply("Sau mã khách chưa có nội dung. Anh gõ thêm lời nhắc hoặc ! kèm câu gửi khách nhé.", messageId); return response({ ok: true }); }

  const target = await resolveTarget(replyToId, code);
  if ("error" in target) { console.log("tue-lam-webhook: chưa chọn được khách"); await reply(target.error, messageId); return response({ ok: true }); }
  const session = target.session;
  const shortCode = sessionCode(session.id);
  await linkTelegram(messageId, session.id);

  let sentText: string;
  let verbatim = false;
  if (text.startsWith("!")) {
    sentText = text.slice(1).trim();
    verbatim = true;
    if (!sentText) { await reply("Sau dấu ! chưa có chữ nào. Anh gõ ! kèm đúng câu muốn gửi khách nhé.", messageId, session.id); return response({ ok: true }); }
    const saved = await dbInsert("tue_lam_chat_messages", { session_id: session.id, role: "human", content: sentText, den_sau: true });
    if (!saved) { await reply(`Em chưa lưu được tin cho #${shortCode}, anh gửi lại giúp em nhé.`, messageId, session.id); return response({ ok: true }); }
  } else {
    const hintSaved = await dbInsert("tue_lam_chat_messages", { session_id: session.id, role: "hint", content: text });
    if (!hintSaved) { await reply(`Em chưa lưu được lời nhắc cho #${shortCode}, anh gửi lại giúp em nhé.`, messageId, session.id); return response({ ok: true }); }
    try {
      sentText = await rewriteHint(session.id, text);
    } catch {
      await reply(`Tuệ Lâm chưa viết lại được lời nhắc cho #${shortCode} (lỗi AI). Lời nhắc đã lưu; anh gõ ! kèm câu muốn gửi để em gửi nguyên văn nhé.`, messageId, session.id);
      return response({ ok: true });
    }
    const saved = await dbInsert("tue_lam_chat_messages", { session_id: session.id, role: "assistant", content: sentText, den_sau: true });
    if (!saved) { await reply(`Em chưa lưu được câu trả lời cho #${shortCode}, anh gửi lại giúp em nhé.`, messageId, session.id); return response({ ok: true }); }
  }
  await dbPatch(`tue_lam_chat_sessions?id=eq.${session.id}`, { nhap_tra_loi: null, nhap_cho_tin_id: null, nhap_luc: null, anh_vao_cuoc_den: vaoCuocDen(config), updated_at: nowIso() });
  await reply(`${verbatim ? `✓ Tuệ Lâm đã gửi nguyên văn cho #${shortCode}` : `✓ Tuệ Lâm đã trả lời #${shortCode}`}: "${sentText}"\n(Anh vào cuộc thêm ${phutVaoCuoc(config)} phút${dangVaoCuoc(session) ? "" : ", em sẽ chuyển tin tiếp theo của khách sang đây"}.)`, messageId, session.id);
  return response({ ok: true });
}

export async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return response({ error: "Invalid request" }, 400);
  if (payload.action === "poll" || payload.action === "lich-su") {
    const origin = request.headers.get("origin") ?? "";
    if (origin && !allowedOrigins.has(origin)) return response({ error: "Origin not allowed" }, 403, request);
    try { return await handleBrowserAction(request, payload); } catch { return response({ error: "Poll failed" }, 503, request); }
  }
  const state: UpdateState = { claimed: false, messageId: 0 };
  try { return await handleTelegramUpdate(request, payload, state); } catch (error) {
    console.error("Telegram webhook failed", error instanceof Error ? error.message : "unknown");
    // Đã giành update_id (Telegram sẽ không gửi lại): báo anh gửi lại, không ném tiếp.
    if (state.claimed && state.messageId) {
      try { await telegramSend("Em gặp lỗi khi xử lý tin này, anh gửi lại giúp em.", { replyTo: state.messageId }); } catch { /* bỏ qua */ }
    }
    // Trả 200 để Telegram không gửi lặp mãi.
    return response({ ok: true, error: "Webhook processing failed" });
  }
}

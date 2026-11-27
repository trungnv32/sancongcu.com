import {
  allowedOrigins, answerCustomer, clean, corsHeaders, dangVaoCuoc, db, dbInsert, dbPatch, dbRows, giayCho,
  HANDOFF_REPLY, linkTelegram, loadConfig, nowIso, sessionCode, telegramAboutSession, telegramSend, vaoCuocDen,
  type ChatRow,
} from "../_shared/tue-lam.ts";

const json = (request: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json" } });

const roleLabel = (role: string) => role === "customer" ? "Khách" : role === "hint" ? "Anh nhắc" : role === "human" ? "Tuệ Lâm (lời anh)" : "Tuệ Lâm";

// Nhận biết khách cần người thật. Khách hay viết tắt: "a" = anh, "e" = em, "ad" = admin.
const XUNG = "(?:a|anh|e|em|c|chị|chi|mình|minh|tôi|toi|t)";
const HANDOFF_PATTERN = new RegExp([
  "tư vấn riêng", "người thật", "nhân viên tư vấn", "tư vấn viên", "muốn gặp", "cần gặp", "gặp quản lý",
  `gặp (?:${XUNG} )?(?:trung|admin|ad|sếp|chủ|founder|quản lý|nhân viên|người phụ trách)(?![\\p{L}])`,
  `gặp (?:a|anh)(?![\\p{L}])`,
  `(?:nói chuyện|chat|gọi|liên hệ) (?:với |trực tiếp (?:với )?)?(?:${XUNG} )?(?:trung|admin|ad|người thật)(?![\\p{L}])`,
  "nói chuyện trực tiếp",
  `chuyển (?:cho )?(?:anh|a|người|nhân viên|admin|ad)(?![\\p{L}])`,
  `cho ${XUNG} gặp`,
].join("|"), "iu");
const COMPLAINT_PATTERN = /(khiếu nại|hoàn tiền|đổi skill|chưa nhận|đã thanh toán|gặp quản lý|người thật|không hài lòng|thất vọng|phàn nàn|phản ánh)/iu;
// AI tự nói "đã/sẽ chuyển cho bộ phận…" thì phải chuyển thật, không để khách tưởng đã chuyển.
const AI_HUA_CHUYEN = /((?:đã|sẽ|để) (?:chuyển|báo|gửi)[^.\n]{0,40}(?:bộ phận|người phụ trách|anh trung|admin|nhân viên))|(bộ phận (?:hỗ trợ|phụ trách)[^.\n]{0,30}liên hệ)|(người phụ trách[^.\n]{0,30}liên hệ)/iu;

export function canChuyenNguoiThat(content: string, history: ChatRow[], reply: string, coSdtMoi: boolean): boolean {
  const khach = history.filter((item) => item.role === "customer").map((item) => item.content).join("\n");
  const daXinSdt = history.some((item) => item.role === "assistant" && /xin (?:số điện thoại|sđt|số đt)/iu.test(item.content));
  if (HANDOFF_PATTERN.test(content) || COMPLAINT_PATTERN.test(content)) return true;
  if (coSdtMoi && daXinSdt && (HANDOFF_PATTERN.test(khach) || COMPLAINT_PATTERN.test(khach))) return true;
  return AI_HUA_CHUYEN.test(reply);
}

type SessionRow = { customer_phone?: string; page_url?: string; anh_vao_cuoc_den?: string | null; telegram_message_id?: number | null; nhap_tra_loi?: string | null; nhap_cho_tin_id?: number | null };

async function sendHandoff(sessionId: string, session: SessionRow, phutVaoCuocDen: string) {
  const rows = await dbRows<ChatRow>(`tue_lam_chat_messages?session_id=eq.${sessionId}&select=role,content,created_at&order=id.desc&limit=18`);
  const transcript = rows.reverse().map((row) => `${roleLabel(row.role)}: ${row.content}`).join("\n").slice(-2600);
  const code = sessionCode(sessionId);
  const sent = await telegramSend([
    `Tuệ Lâm — khách #${code} cần anh hỗ trợ`,
    `SĐT: ${session?.customer_phone || "Chưa cung cấp"}`,
    session?.page_url ? `Trang: ${session.page_url}` : "",
    "",
    transcript,
    "",
    `Cách trả lời: Reply tin này (hoặc nhắn #${code} …).`,
    "- Gõ bình thường: Tuệ Lâm viết lại lời anh nhắc rồi trả lời khách.",
    "- Gõ ! ở đầu: gửi đúng nguyên văn cho khách.",
    "- /xong: Tuệ Lâm tự chăm khách này tiếp.",
  ].join("\n").replace(/\n{3,}/g, "\n\n"));
  await linkTelegram(sent.message_id, sessionId);
  await dbPatch(`tue_lam_chat_sessions?id=eq.${sessionId}`, {
    ...(session?.telegram_message_id ? {} : { telegram_message_id: sent.message_id }),
    telegram_alerted_at: nowIso(),
    anh_vao_cuoc_den: phutVaoCuocDen,
    updated_at: nowIso(),
  });
}

async function handleNewOrder(request: Request, payload: Record<string, unknown>) {
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
    console.error("Telegram new order notification failed", error instanceof Error ? error.message : "unknown");
    return json(request, { error: "Chưa gửi được thông báo đơn hàng." }, 503);
  }
}

export async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Phương thức không được hỗ trợ." }, 405);
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(request, { error: "Nguồn yêu cầu không hợp lệ." }, 403);
  const payload = await request.json().catch(() => null);
  if (payload?.action === "new-order") return await handleNewOrder(request, payload);

  const sessionId = clean(payload?.sessionId, 50).toLowerCase();
  const content = clean(payload?.message, 1600);
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !content) return json(request, { error: "Thiếu nội dung chat." }, 400);

  let inCall = false;
  let customerMessageId = 0;
  try {
    const sessionUpsert = await db("tue_lam_chat_sessions?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: sessionId, page_url: clean(payload?.pageUrl, 300) }) });
    if (!sessionUpsert.ok) throw new Error("Không lưu được phiên chat.");
    const phoneInMessage = content.match(/(?:\+?84|0)(?:[\s.-]?\d){8,10}/)?.[0] ?? "";
    if (phoneInMessage) await dbPatch(`tue_lam_chat_sessions?id=eq.${sessionId}`, { customer_phone: phoneInMessage.replace(/\s/g, " ") });
    const customerRow = await dbInsert<ChatRow>("tue_lam_chat_messages", { session_id: sessionId, role: "customer", content });
    if (!customerRow) throw new Error("Không lưu được tin nhắn.");
    customerMessageId = Number(customerRow.id) || 0;

    const [[session], config] = await Promise.all([
      dbRows<SessionRow>(`tue_lam_chat_sessions?id=eq.${sessionId}&select=customer_phone,page_url,anh_vao_cuoc_den,telegram_message_id,nhap_tra_loi,nhap_cho_tin_id`),
      loadConfig().catch(() => ({})),
    ]);
    inCall = dangVaoCuoc(session);
    const wait = giayCho(config);
    // Đang có nháp chờ (chưa gửi khách) → câu khách trước đó chưa được trả lời: nháp mới phải trả lời cả câu đó.
    const unansweredSince = inCall && wait > 0 && session?.nhap_tra_loi && session?.nhap_cho_tin_id ? Number(session.nhap_cho_tin_id) : undefined;

    let reply: string;
    let history: ChatRow[];
    try {
      ({ reply, history } = await answerCustomer(sessionId, { unansweredSince }));
    } catch (error) {
      if (inCall) await telegramAboutSession(sessionId, `#${sessionCode(sessionId)} Khách: ${content}\nTuệ Lâm chưa trả lời được (lỗi AI). Anh Reply với ! ở đầu để gửi nguyên văn nhé.`);
      throw error;
    }

    // Anh đang vào cuộc: chuyển tin sang Telegram, không xét chuyển người thật lần nữa.
    if (inCall) {
      const code = sessionCode(sessionId);
      if (wait > 0) {
        // nhap_cho_tin_id giữ id câu khách CŨ NHẤT chưa được trả lời.
        await dbPatch(`tue_lam_chat_sessions?id=eq.${sessionId}`, { nhap_tra_loi: reply, nhap_cho_tin_id: unansweredSince ?? customerMessageId, nhap_luc: nowIso(), updated_at: nowIso() });
        await telegramAboutSession(sessionId, `#${code} Khách: ${content}\nTuệ Lâm định trả lời${unansweredSince ? " (gộp cả câu khách nhắn trước, thay nháp cũ)" : ""} (tự gửi sau ${wait} giây): ${reply}\n\nReply để nhắc lại, hoặc gõ ! ở đầu để gửi câu khác.`);
        return json(request, { dang_soan: true, cho: wait, handoff: false });
      }
      const saved = await dbInsert("tue_lam_chat_messages", { session_id: sessionId, role: "assistant", content: reply });
      if (!saved) throw new Error("Không lưu được câu trả lời.");
      await telegramAboutSession(sessionId, `#${code} Khách: ${content}\nTuệ Lâm đã trả lời: ${reply}`);
      return json(request, { reply, handoff: false, vao_cuoc: true });
    }

    const needsHuman = canChuyenNguoiThat(content, history, reply, Boolean(phoneInMessage));
    const [savedSession] = phoneInMessage ? await dbRows<SessionRow>(`tue_lam_chat_sessions?id=eq.${sessionId}&select=customer_phone,page_url,telegram_message_id`) : [session];
    const phone = savedSession?.customer_phone;
    let handoffSent = false;
    if (needsHuman && phone) {
      try { await sendHandoff(sessionId, savedSession!, vaoCuocDen(config)); handoffSent = true; } catch (error) { console.error("Telegram handoff failed", error instanceof Error ? error.message : "unknown"); }
    }
    if (needsHuman && !phone) {
      reply = "Dạ, để bộ phận hỗ trợ liên hệ với mình, anh/chị cho em xin số điện thoại ạ.";
    } else if (needsHuman && handoffSent) {
      reply = HANDOFF_REPLY;
    } else if (needsHuman && !handoffSent) {
      reply = "Dạ, em xin lỗi, hiện thông tin chưa gửi được đến bộ phận hỗ trợ. Anh/chị vui lòng nhắn Zalo https://zalo.me/0938069668 để được hỗ trợ trực tiếp ạ.";
    }
    const savedReply = await dbInsert("tue_lam_chat_messages", { session_id: sessionId, role: "assistant", content: reply });
    if (!savedReply) throw new Error("Không lưu được câu trả lời.");
    return json(request, { reply, handoff: handoffSent });
  } catch (error) {
    console.error("Tuệ Lâm chat failed", error instanceof Error ? error.message : "unknown");
    return json(request, { error: error instanceof Error && error.message.includes("Gemini API key") ? "Chatbot chưa được cấu hình Gemini API key." : "Tuệ Lâm đang gặp sự cố kết nối. Anh/chị thử lại sau ít phút hoặc nhắn Zalo 0938.069.668 nhé." }, 503);
  }
}

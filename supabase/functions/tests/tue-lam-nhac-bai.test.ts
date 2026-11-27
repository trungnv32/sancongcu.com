// Test chế độ "nhắc bài" Tuệ Lâm × Telegram, chạy hoàn toàn trên máy:
// Supabase REST giả trong bộ nhớ, Telegram giả, Gemini giả. Không gọi dịch vụ thật.
// Chạy: deno test --no-config --node-modules-dir=none --allow-env supabase/functions/tests/tue-lam-nhac-bai.test.ts
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { handler as chatHandler } from "../tue-lam-chat/handler.ts";
import { handler as webhookHandler, resetPollLimiter } from "../tue-lam-telegram-webhook/handler.ts";
import { clock, HANDOFF_REPLY, HINT_HEADER, safeEqual } from "../_shared/tue-lam.ts";

Deno.env.set("SUPABASE_URL", "https://fake.supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "ey-fake-service-key");
Deno.env.set("TELEGRAM_BOT_TOKEN", "fake-bot-token");
Deno.env.set("TELEGRAM_CHAT_ID", "777");
Deno.env.set("GEMINI_API_KEY", "fake-gemini-key");
Deno.env.set("TUE_LAM_MODEL", "fake-model");

const SECRET = "s3cret-webhook";
const S1 = "abc12300-0000-4000-8000-000000000001";
const S2 = "def45600-0000-4000-8000-000000000002";
const T0 = Date.parse("2026-11-27T10:00:00.000Z");

// ---------------- Supabase REST giả ----------------
type Row = Record<string, unknown>;
const ROLES = new Set(["customer", "assistant", "human", "hint"]);
const PK: Record<string, string> = { tue_lam_chat_sessions: "id", tue_lam_chat_messages: "id", tue_lam_telegram_config: "id", tue_lam_telegram_links: "telegram_message_id" };

class FakeDb {
  tables: Record<string, Row[]> = { tue_lam_chat_sessions: [], tue_lam_chat_messages: [], tue_lam_telegram_config: [], tue_lam_telegram_links: [], skills: [], combos: [], training_courses: [], tue_lam_brain: [] };
  seq = 0;
  defaults(table: string, row: Row): Row {
    const now = new Date(clock.now()).toISOString();
    if (table === "tue_lam_chat_sessions") return { page_url: "", customer_phone: "", telegram_message_id: null, telegram_alerted_at: null, anh_vao_cuoc_den: null, nhap_tra_loi: null, nhap_cho_tin_id: null, nhap_luc: null, created_at: now, updated_at: now, ...row };
    if (table === "tue_lam_chat_messages") return { id: ++this.seq, den_sau: false, created_at: now, ...row };
    if (table === "tue_lam_telegram_config") return { id: 1, phut_vao_cuoc: 5, giay_cho: 0, update_id_cuoi: null, updated_at: now, ...row };
    return { created_at: now, ...row };
  }
  messages(sessionId?: string) { return this.tables.tue_lam_chat_messages.filter((row) => !sessionId || row.session_id === sessionId); }
  session(id: string) { return this.tables.tue_lam_chat_sessions.find((row) => row.id === id)!; }
  config() { return this.tables.tue_lam_telegram_config[0]; }
}

function compare(a: unknown, b: string) {
  if (typeof a === "number") return a - Number(b);
  const left = String(a);
  return left < b ? -1 : left > b ? 1 : 0;
}
function test(row: Row, column: string, expression: string): boolean {
  const dot = expression.indexOf(".");
  const op = expression.slice(0, dot);
  const value = expression.slice(dot + 1);
  const cell = row[column];
  switch (op) {
    case "eq": return cell !== null && cell !== undefined && (typeof cell === "boolean" ? String(cell) === value : compare(cell, value) === 0);
    case "neq": return cell !== null && cell !== undefined && compare(cell, value) !== 0;
    case "gt": return cell !== null && cell !== undefined && compare(cell, value) > 0;
    case "gte": return cell !== null && cell !== undefined && compare(cell, value) >= 0;
    case "lt": return cell !== null && cell !== undefined && compare(cell, value) < 0;
    case "lte": return cell !== null && cell !== undefined && compare(cell, value) <= 0;
    case "is": return value === "null" ? cell === null || cell === undefined : String(cell) === value;
    case "in": return value.replace(/^\(|\)$/g, "").split(",").includes(String(cell));
    default: throw new Error(`Fake DB chưa hỗ trợ toán tử ${op}`);
  }
}
const RESERVED = new Set(["select", "order", "limit", "on_conflict"]);
function applyFilters(rows: Row[], params: URLSearchParams) {
  return rows.filter((row) => {
    for (const [key, value] of params.entries()) {
      if (RESERVED.has(key)) continue;
      if (key === "or") {
        const parts = value.replace(/^\(|\)$/g, "").split(",");
        if (!parts.some((part) => { const i = part.indexOf("."); return test(row, part.slice(0, i), part.slice(i + 1)); })) return false;
        continue;
      }
      if (!test(row, key, value)) return false;
    }
    return true;
  });
}
function project(rows: Row[], select: string | null) {
  if (!select || select === "*" || select.includes("(")) return rows.map((row) => ({ ...row }));
  const columns = select.split(",");
  return rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? null])));
}
const jsonResponse = (body: unknown, status = 200) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function handleRest(fake: FakeDb, url: URL, init: RequestInit) {
  const table = url.pathname.replace("/rest/v1/", "");
  const params = url.searchParams;
  const method = (init.method ?? "GET").toUpperCase();
  const prefer = new Headers(init.headers).get("Prefer") ?? "";
  const rows = fake.tables[table];
  if (!rows) return jsonResponse({ message: `bảng ${table} không có` }, 404);
  if (method === "GET") {
    let result = applyFilters(rows, params);
    const order = params.get("order");
    if (order) {
      const [column, direction] = order.split(".");
      result = [...result].sort((a, b) => (compare(a[column], String(b[column])) || 0) * (direction === "desc" ? -1 : 1));
    }
    const limit = Number(params.get("limit"));
    if (limit) result = result.slice(0, limit);
    return jsonResponse(project(result, params.get("select")));
  }
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const returned: Row[] = [];
  if (method === "POST") {
    for (const input of Array.isArray(body) ? body : [body]) {
      if (table === "tue_lam_chat_messages" && !ROLES.has(String(input.role))) return jsonResponse({ message: "vi phạm check role" }, 400);
      const key = params.get("on_conflict") ?? PK[table];
      const existing = key ? rows.find((row) => input[key] !== undefined && row[key] === input[key]) : undefined;
      if (existing) {
        if (prefer.includes("merge-duplicates")) { Object.assign(existing, input); returned.push(existing); continue; }
        if (prefer.includes("ignore-duplicates")) continue;
        return jsonResponse({ message: "duplicate key" }, 409);
      }
      const row = fake.defaults(table, input);
      rows.push(row);
      returned.push(row);
    }
    return prefer.includes("return=representation") ? jsonResponse(project(returned, null), 201) : jsonResponse(null, 201);
  }
  if (method === "PATCH") {
    for (const row of applyFilters(rows, params)) { Object.assign(row, body); returned.push(row); }
    return prefer.includes("return=representation") ? jsonResponse(project(returned, null)) : jsonResponse(null, 204);
  }
  return jsonResponse({ message: "method" }, 405);
}

// ---------------- Telegram + Gemini giả ----------------
type TgSent = { message_id: number; text: string; reply_to?: number };
type GeminiRequest = { systemInstruction: { parts: { text: string }[] }; contents: { role: string; parts: { text: string }[] }[] };

let fake: FakeDb;
let telegram: TgSent[];
let gemini: GeminiRequest[];
let geminiFails = false;
let telegramNetworkFails = false;
let dbThrowOnMessageInsert = false;
let nextTgId = 1000;
let externalCalls: string[];

const REWRITE_REPLY = "Dạ, combo 3 skill bên em là 990.000đ, tặng kèm cài đặt ạ.";
const NORMAL_REPLY = "Dạ, em Tuệ Lâm đây, em hỗ trợ mình ngay ạ.";

globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  externalCalls.push(url.host);
  if (dbThrowOnMessageInsert && url.pathname.endsWith("/tue_lam_chat_messages") && (init.method ?? "GET") === "POST") throw new TypeError("mạng Supabase giả bị đứt");
  if (url.host === "fake.supabase.test") return handleRest(fake, url, init);
  if (url.host === "api.telegram.org") {
    // Giống lỗi thật của Deno: thông báo lỗi chứa nguyên URL (có token bot).
    if (telegramNetworkFails) throw new TypeError(`error sending request for url (${url.href})`);
    const body = JSON.parse(String(init.body));
    assertEquals(body.chat_id, "777");
    assert(!("parse_mode" in body), "Telegram phải gửi chữ thường");
    const sent = { message_id: nextTgId++, text: body.text, reply_to: body.reply_parameters?.message_id };
    telegram.push(sent);
    return jsonResponse({ ok: true, result: { message_id: sent.message_id } });
  }
  if (url.host === "generativelanguage.googleapis.com") {
    const body = JSON.parse(String(init.body)) as GeminiRequest;
    gemini.push(body);
    if (geminiFails) return jsonResponse({ error: "down" }, 500);
    const lastParts = body.contents.at(-1)?.parts.map((part) => part.text).join("\n") ?? "";
    const text = lastParts.includes("[CHỈ DẪN NỘI BỘ") ? REWRITE_REPLY : NORMAL_REPLY;
    return jsonResponse({ candidates: [{ content: { parts: [{ text }] } }] });
  }
  throw new Error(`Gọi ra ngoài không được phép trong test: ${url.host}`);
}) as typeof fetch;

function setup() {
  fake = new FakeDb();
  fake.tables.tue_lam_telegram_config.push(fake.defaults("tue_lam_telegram_config", { webhook_secret: SECRET }));
  telegram = []; gemini = []; externalCalls = []; geminiFails = false; telegramNetworkFails = false; dbThrowOnMessageInsert = false;
  clock.now = () => T0;
  resetPollLimiter();
}
const advance = (ms: number) => { const base = clock.now(); clock.now = () => base + ms; };

async function chat(sessionId: string, message: string) {
  const response = await chatHandler(new Request("https://fn.test/tue-lam-chat", { method: "POST", headers: { origin: "https://sancongcu.com", "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, message, pageUrl: "https://sancongcu.com/" }) }));
  const raw = await response.text();
  return { status: response.status, raw, body: JSON.parse(raw) };
}
let updateSeq = 5000;
async function tg(message: Record<string, unknown>, options: { secret?: string; updateId?: number } = {}) {
  const update = { update_id: options.updateId ?? ++updateSeq, message: { message_id: nextTgId++, chat: { id: 777 }, from: { id: 1, is_bot: false }, ...message } };
  const response = await webhookHandler(new Request("https://fn.test/tue-lam-telegram-webhook", { method: "POST", headers: { "x-telegram-bot-api-secret-token": options.secret ?? SECRET, "Content-Type": "application/json" }, body: JSON.stringify(update) }));
  return { status: response.status, body: await response.json() };
}
async function browser(action: "poll" | "lich-su", sessionId: string, afterId = 0) {
  resetPollLimiter();
  const response = await webhookHandler(new Request("https://fn.test/tue-lam-telegram-webhook", { method: "POST", headers: { origin: "https://sancongcu.com", "Content-Type": "application/json" }, body: JSON.stringify({ action, sessionId, afterId }) }));
  const raw = await response.text();
  return { status: response.status, raw, body: JSON.parse(raw) };
}
async function handoff(sessionId: string, phone = "0912345678") {
  const result = await chat(sessionId, `Em muốn gặp người thật, số em ${phone}`);
  assertEquals(result.body.reply, HANDOFF_REPLY);
  assertEquals(result.body.handoff, true);
  return telegram.at(-1)!;
}
const lastTg = () => telegram.at(-1)!;
const HINT = "báo giá combo 3 skill là 990k, tặng cài đặt";

// ---------------- Các ca kiểm ----------------

Deno.test("01 chuyển người thật: Telegram có #mã, câu khách thấy đúng câu anh chốt, có bảng nối", async () => {
  setup();
  const alert = await handoff(S1);
  assertStringIncludes(alert.text, "Tuệ Lâm — khách #ABC123 cần anh hỗ trợ");
  assertStringIncludes(alert.text, "SĐT: 0912345678");
  assert(fake.tables.tue_lam_telegram_links.some((row) => row.telegram_message_id === alert.message_id && row.session_id === S1));
  assertEquals(fake.session(S1).telegram_message_id, alert.message_id);
  assertEquals(fake.session(S1).anh_vao_cuoc_den, new Date(T0 + 5 * 60_000).toISOString());
});

Deno.test("02 Reply → nhắc bài → lời Tuệ Lâm đến sau + báo lại Telegram", async () => {
  setup();
  const alert = await handoff(S1);
  await chat(S1, "Combo 3 skill giá bao nhiêu vậy em?");
  const before = gemini.length;
  const result = await tg({ text: HINT, reply_to_message: { message_id: alert.message_id } });
  assertEquals(result.status, 200);
  assertEquals(gemini.length, before + 1);
  const hint = fake.messages(S1).find((row) => row.role === "hint");
  assertEquals(hint?.content, HINT);
  const answer = fake.messages(S1).at(-1)!;
  assertEquals([answer.role, answer.content, answer.den_sau], ["assistant", REWRITE_REPLY, true]);
  assertStringIncludes(lastTg().text, `✓ Tuệ Lâm đã trả lời #ABC123: "${REWRITE_REPLY}"`);
  const poll = await browser("poll", S1, 0);
  assertEquals(poll.body.messages.map((row: { content: string }) => row.content), [REWRITE_REPLY]);
  // Reply vào tin báo lại (không phải tin báo đầu) vẫn tìm được khách.
  const again = await tg({ text: "!Dạ mình cần thêm gì cứ nhắn em nhé", reply_to_message: { message_id: lastTg().message_id } });
  assertEquals(again.status, 200);
  assertEquals(fake.messages(S1).at(-1)!.content, "Dạ mình cần thêm gì cứ nhắn em nhé");
});

Deno.test("03 lời nhắc gửi AI: nằm trong chỉ dẫn hệ thống dạng ghi chú nội bộ, không phải lời khách", async () => {
  setup();
  const alert = await handoff(S1);
  await tg({ text: HINT, reply_to_message: { message_id: alert.message_id } });
  const rewrite = gemini.at(-1)!;
  assertStringIncludes(rewrite.systemInstruction.parts[0].text, HINT_HEADER);
  assertStringIncludes(rewrite.systemInstruction.parts[0].text, `1. ${HINT}`);
  const lastUser = rewrite.contents.at(-1)!;
  assertEquals(lastUser.role, "user");
  assertStringIncludes(lastUser.parts.at(-1)!.text, "[CHỈ DẪN NỘI BỘ — đây KHÔNG phải lời khách");
  assertStringIncludes(lastUser.parts.at(-1)!.text, "Không bịa thêm giá");
  // Tin khách tiếp theo: lời nhắc chỉ ở chỉ dẫn hệ thống, không có trong contents.
  await chat(S1, "Vậy em gửi link mua cho chị nhé");
  const next = gemini.at(-1)!;
  assertStringIncludes(next.systemInstruction.parts[0].text, HINT);
  const allContentText = next.contents.flatMap((content) => content.parts.map((part) => part.text)).join("\n");
  assert(!allContentText.includes(HINT), "Lời nhắc không được nằm trong lịch sử như lời khách");
  // Câu Tuệ Lâm đã trả lời theo nhắc bài là lời "model".
  assert(next.contents.some((content) => content.role === "model" && content.parts.some((part) => part.text === REWRITE_REPLY)));
});

Deno.test("04 lịch sử gửi AI tối đa 30 tin, lời nhắc cũ hơn 30 tin vẫn có trong chỉ dẫn; 'human' là lời Tuệ Lâm", async () => {
  setup();
  fake.tables.tue_lam_chat_sessions.push(fake.defaults("tue_lam_chat_sessions", { id: S1 }));
  fake.tables.tue_lam_chat_messages.push(fake.defaults("tue_lam_chat_messages", { session_id: S1, role: "hint", content: "khách này là khách quen, ưu tiên giảm 10%" }));
  fake.tables.tue_lam_chat_messages.push(fake.defaults("tue_lam_chat_messages", { session_id: S1, role: "customer", content: "tin cũ nhất" }));
  for (let index = 0; index < 40; index++) {
    fake.tables.tue_lam_chat_messages.push(fake.defaults("tue_lam_chat_messages", { session_id: S1, role: index % 2 ? "assistant" : "customer", content: `tin ${index}` }));
  }
  fake.tables.tue_lam_chat_messages.push(fake.defaults("tue_lam_chat_messages", { session_id: S1, role: "human", content: "câu nguyên văn của anh" }));
  await chat(S1, "tin mới nhất của khách");
  const request = gemini.at(-1)!;
  const parts = request.contents.flatMap((content) => content.parts);
  assert(parts.length <= 30, `gửi ${parts.length} tin`);
  assert(parts.length >= 29, `gửi ${parts.length} tin`);
  assertEquals(parts.at(-1)!.text, "tin mới nhất của khách");
  assert(!parts.some((part) => part.text === "tin cũ nhất"));
  assertStringIncludes(request.systemInstruction.parts[0].text, "khách này là khách quen, ưu tiên giảm 10%");
  assert(request.contents.some((content) => content.role === "model" && content.parts.some((part) => part.text === "câu nguyên văn của anh")));
  assertEquals(request.contents[0].role, "user");
});

Deno.test("05 '!' gửi nguyên văn, không gọi AI", async () => {
  setup();
  const alert = await handoff(S1);
  const before = gemini.length;
  await tg({ text: "!Chị chờ em 5 phút nhé", reply_to_message: { message_id: alert.message_id } });
  assertEquals(gemini.length, before);
  const last = fake.messages(S1).at(-1)!;
  assertEquals([last.role, last.content, last.den_sau], ["human", "Chị chờ em 5 phút nhé", true]);
  assertStringIncludes(lastTg().text, '✓ Tuệ Lâm đã gửi nguyên văn cho #ABC123: "Chị chờ em 5 phút nhé"');
  const poll = await browser("poll", S1, 0);
  assertEquals(poll.body.messages, [{ id: last.id, content: "Chị chờ em 5 phút nhé" }]);
});

Deno.test("06 #mã chọn đúng khách khi có 2 khách đang vào cuộc", async () => {
  setup();
  await handoff(S1);
  await handoff(S2, "0987654321");
  await tg({ text: "#DEF456 !Dạ em gửi chị link nhé" });
  assertEquals(fake.messages(S2).at(-1)!.content, "Dạ em gửi chị link nhé");
  assert(!fake.messages(S1).some((row) => row.content === "Dạ em gửi chị link nhé"));
  assertStringIncludes(lastTg().text, "#DEF456");
});

Deno.test("07 không Reply, không mã: đúng 1 khách → gửi và báo lại mã", async () => {
  setup();
  await handoff(S1);
  await tg({ text: "!Dạ em đây ạ" });
  assertEquals(fake.messages(S1).at(-1)!.content, "Dạ em đây ạ");
  assertStringIncludes(lastTg().text, "#ABC123");
});

Deno.test("08 không Reply, không mã: 2 khách → hỏi lại, không gửi ai", async () => {
  setup();
  await handoff(S1);
  await handoff(S2, "0987654321");
  const count = fake.messages().length;
  await tg({ text: "!Dạ em đây ạ" });
  assertEquals(fake.messages().length, count);
  assertStringIncludes(lastTg().text, "Đang có 2 khách anh vào cuộc");
  assertStringIncludes(lastTg().text, "#ABC123");
  assertStringIncludes(lastTg().text, "#DEF456");
});

Deno.test("09 không Reply, không mã, 0 khách → báo chưa biết khách nào", async () => {
  setup();
  await tg({ text: "chào" });
  assertStringIncludes(lastTg().text, "Em chưa biết khách nào");
  assertEquals(fake.messages().length, 0);
});

Deno.test("10 mã không tồn tại / Reply vào tin lạ → báo lý do", async () => {
  setup();
  await handoff(S1);
  await tg({ text: "#FFFFFF !xin chào" });
  assertStringIncludes(lastTg().text, "Mã #FFFFFF không tồn tại");
  await tg({ text: "#K3F9A2 !xin chào" });
  assertStringIncludes(lastTg().text, "Mã #K3F9A2 không tồn tại");
  await tg({ text: "!xin chào", reply_to_message: { message_id: 1 } });
  assertStringIncludes(lastTg().text, "không gắn với khách nào");
  assert(!fake.messages(S1).some((row) => row.content === "xin chào"));
});

Deno.test("11 /xong: kết thúc, tin khách sau đó không chuyển Telegram nữa", async () => {
  setup();
  const alert = await handoff(S1);
  await tg({ text: "/xong", reply_to_message: { message_id: alert.message_id } });
  assertEquals(fake.session(S1).anh_vao_cuoc_den, null);
  assertStringIncludes(lastTg().text, "✓ Đã kết thúc #ABC123");
  const count = telegram.length;
  const result = await chat(S1, "Cảm ơn em nhé");
  assertEquals(result.body.reply, NORMAL_REPLY);
  assertEquals(telegram.length, count);
});

Deno.test("12 đang vào cuộc, chờ 0 giây: Tuệ Lâm trả lời ngay + chuyển Telegram", async () => {
  setup();
  await handoff(S1);
  const count = telegram.length;
  const result = await chat(S1, "Skill nào làm video nhanh?");
  assertEquals(result.body.reply, NORMAL_REPLY);
  assertEquals(telegram.length, count + 1);
  assertStringIncludes(lastTg().text, "#ABC123 Khách: Skill nào làm video nhanh?");
  assertStringIncludes(lastTg().text, `Tuệ Lâm đã trả lời: ${NORMAL_REPLY}`);
  assert(fake.tables.tue_lam_telegram_links.some((row) => row.telegram_message_id === lastTg().message_id));
});

Deno.test("13 /cho 60 → khách thấy 'đang soạn', hết 60 giây poll đăng nháp (không gọi AI lại)", async () => {
  setup();
  await handoff(S1);
  await tg({ text: "/cho 60" });
  assertEquals(fake.config().giay_cho, 60);
  assertStringIncludes(lastTg().text, "chờ anh 60 giây");
  const result = await chat(S1, "Có hoàn tiền không em?");
  assertEquals(result.body.dang_soan, true);
  assert(!("reply" in result.body), "Chưa được trả câu trả lời ngay");
  assertStringIncludes(lastTg().text, `Tuệ Lâm định trả lời (tự gửi sau 60 giây): ${NORMAL_REPLY}`);
  const calls = gemini.length;
  advance(30_000);
  let poll = await browser("poll", S1, 0);
  assertEquals([poll.body.messages.length, poll.body.dang_soan], [0, true]);
  advance(31_000);
  poll = await browser("poll", S1, 0);
  assertEquals(poll.body.messages.map((row: { content: string }) => row.content), [NORMAL_REPLY]);
  assertEquals(poll.body.dang_soan, false);
  assertEquals(gemini.length, calls);
  assertStringIncludes(lastTg().text, "hết thời gian chờ");
  // Poll lần nữa không đăng lặp.
  poll = await browser("poll", S1, poll.body.messages[0].id);
  assertEquals(poll.body.messages.length, 0);
  assertEquals(fake.messages(S1).filter((row) => row.content === NORMAL_REPLY && row.den_sau).length, 1);
});

Deno.test("14 /cho 60: anh gõ ! trong 60 giây thì dùng câu của anh, nháp bị bỏ", async () => {
  setup();
  await handoff(S1);
  await tg({ text: "/cho 60" });
  await chat(S1, "Có hoàn tiền không em?");
  advance(20_000);
  await tg({ text: "!Dạ có ạ, nếu skill lỗi bên em hoàn 100% trong 24 giờ" });
  assertEquals(fake.session(S1).nhap_tra_loi, null);
  advance(60_000);
  const poll = await browser("poll", S1, 0);
  assertEquals(poll.body.messages.map((row: { content: string }) => row.content), ["Dạ có ạ, nếu skill lỗi bên em hoàn 100% trong 24 giờ"]);
  assertEquals(poll.body.dang_soan, false);
});

Deno.test("15 /phut đổi số phút vào cuộc; /phut 5 về mặc định; số sai bị từ chối", async () => {
  setup();
  const alert = await handoff(S1);
  await tg({ text: "/phut 7" });
  assertEquals(fake.config().phut_vao_cuoc, 7);
  await tg({ text: "!ok", reply_to_message: { message_id: alert.message_id } });
  assertEquals(fake.session(S1).anh_vao_cuoc_den, new Date(T0 + 7 * 60_000).toISOString());
  await tg({ text: "/phut 5" });
  assertEquals(fake.config().phut_vao_cuoc, 5);
  assertStringIncludes(lastTg().text, "✓ Từ giờ mỗi lần anh nhắc, anh vào cuộc 5 phút");
  await tg({ text: "/phut 0" });
  assertEquals(fake.config().phut_vao_cuoc, 5);
  assertStringIncludes(lastTg().text, "từ 1 đến 120");
  await tg({ text: "/cho@SancongcuBot 0" });
  assertEquals(fake.config().giay_cho, 0);
});

Deno.test("16 hết 5 phút kể từ lần nhắc gần nhất → không chuyển tin khách nữa", async () => {
  setup();
  const alert = await handoff(S1);
  advance(3 * 60_000);
  await tg({ text: "!Dạ em đây", reply_to_message: { message_id: alert.message_id } });
  advance(4 * 60_000); // 4 phút sau lần nhắc: vẫn vào cuộc
  let count = telegram.length;
  await chat(S1, "còn đó không em");
  assertEquals(telegram.length, count + 1);
  advance(60_001); // quá 5 phút sau lần nhắc
  count = telegram.length;
  const result = await chat(S1, "thôi chị tự xem");
  assertEquals(result.body.reply, NORMAL_REPLY);
  assertEquals(telegram.length, count);
});

Deno.test("17 tin ảnh / không chữ → báo lý do 'chỉ nhận chữ'", async () => {
  setup();
  await handoff(S1);
  const count = fake.messages().length;
  await tg({ photo: [{ file_id: "x" }] });
  assertStringIncludes(lastTg().text, "Em chỉ nhận chữ");
  assertEquals(fake.messages().length, count);
});

Deno.test("18 sai secret → 401, không làm gì", async () => {
  setup();
  await handoff(S1);
  const count = telegram.length;
  const result = await tg({ text: "!hack" }, { secret: "sai" });
  assertEquals(result.status, 401);
  assertEquals(telegram.length, count);
  assert(!fake.messages(S1).some((row) => row.content === "hack"));
  const noSecret = await tg({ text: "!hack" }, { secret: "" });
  assertEquals(noSecret.status, 401);
});

Deno.test("19 sai chat_id → bỏ qua im lặng", async () => {
  setup();
  await handoff(S1);
  const count = telegram.length;
  const result = await tg({ text: "!hack", chat: { id: 12345 } });
  assertEquals(result.status, 200);
  assertEquals(telegram.length, count);
  assert(!fake.messages(S1).some((row) => row.content === "hack"));
});

Deno.test("20 update_id lặp → bỏ qua, không gửi khách 2 lần", async () => {
  setup();
  await handoff(S1);
  await tg({ text: "!Dạ em đây" }, { updateId: 9001 });
  await tg({ text: "!Dạ em đây" }, { updateId: 9001 });
  await tg({ text: "!Dạ em đây" }, { updateId: 9000 });
  assertEquals(fake.messages(S1).filter((row) => row.content === "Dạ em đây").length, 1);
  assertEquals(fake.config().update_id_cuoi, 9001);
});

Deno.test("21 poll / lịch sử / response KHÔNG BAO GIỜ chứa lời nhắc (role hint)", async () => {
  setup();
  const alert = await handoff(S1);
  const SECRET_HINT = "ghi-chu-bi-mat-chi-anh-biet giảm 30% nếu khách hỏi";
  await tg({ text: SECRET_HINT, reply_to_message: { message_id: alert.message_id } });
  const outputs: string[] = [];
  outputs.push((await chat(S1, "Còn ưu đãi gì không em?")).raw);
  await tg({ text: "/cho 30" });
  outputs.push((await chat(S1, "Thế còn combo 5?")).raw);
  advance(31_000);
  outputs.push((await browser("poll", S1, 0)).raw);
  outputs.push((await browser("lich-su", S1)).raw);
  for (const output of outputs) {
    assert(!output.includes(SECRET_HINT), `lộ lời nhắc: ${output.slice(0, 200)}`);
    assert(!output.includes('"hint"'), "lộ role hint");
    assert(!output.includes('"role"'), "lộ vai trò nội bộ");
  }
  const history = JSON.parse(outputs[3]);
  assert(history.messages.length >= 4);
  assert(history.messages.every((row: { from: string }) => row.from === "customer" || row.from === "tue-lam"));
  assertEquals(history.da_chuyen, true);
  // Lời nhắc vẫn được lưu trong CSDL cho AI dùng.
  assert(fake.messages(S1).some((row) => row.role === "hint" && row.content === SECRET_HINT));
});

Deno.test("22 /dang liệt kê khách đang vào cuộc; Reply vào danh sách 1 khách vẫn tìm được", async () => {
  setup();
  await tg({ text: "/dang" });
  assertStringIncludes(lastTg().text, "không có khách nào");
  await handoff(S1);
  await tg({ text: "/dang" });
  assertStringIncludes(lastTg().text, "#ABC123 · 0912345678 · còn 5 phút");
  await tg({ text: "!Dạ em đây", reply_to_message: { message_id: lastTg().message_id } });
  assertEquals(fake.messages(S1).at(-1)!.content, "Dạ em đây");
});

Deno.test("23 AI lỗi khi nhắc bài → báo anh dùng !, lời nhắc vẫn lưu, khách không nhận gì", async () => {
  setup();
  const alert = await handoff(S1);
  geminiFails = true;
  await tg({ text: HINT, reply_to_message: { message_id: alert.message_id } });
  assertStringIncludes(lastTg().text, "chưa viết lại được");
  const poll = await browser("poll", S1, 0);
  assertEquals(poll.body.messages.length, 0);
});

Deno.test("24 poll quá nhanh bị giới hạn nhẹ; phiên lạ / origin lạ bị chặn", async () => {
  setup();
  const first = await browser("poll", S1, 0);
  assertEquals(first.status, 200);
  const fast = await webhookHandler(new Request("https://fn.test/x", { method: "POST", headers: { origin: "https://sancongcu.com" }, body: JSON.stringify({ action: "poll", sessionId: S1, afterId: 0 }) }));
  assertEquals(fast.status, 429);
  await fast.body?.cancel();
  const bad = await browser("poll", "khong-phai-uuid", 0);
  assertEquals(bad.status, 400);
  resetPollLimiter();
  const evil = await webhookHandler(new Request("https://fn.test/x", { method: "POST", headers: { origin: "https://evil.example" }, body: JSON.stringify({ action: "poll", sessionId: S1, afterId: 0 }) }));
  assertEquals(evil.status, 403);
  await evil.body?.cancel();
});

Deno.test("25 so secret constant-time đúng/sai", () => {
  assert(safeEqual("abc", "abc"));
  assert(!safeEqual("abc", "abd"));
  assert(!safeEqual("abc", "abcd"));
  assert(!safeEqual("", "x"));
});

async function captureLogs<T>(work: () => Promise<T>) {
  const logs: string[] = [];
  const original = { error: console.error, log: console.log, warn: console.warn };
  const sink = (...args: unknown[]) => { logs.push(args.map((arg) => arg instanceof Error ? `${arg.message} ${arg.stack}` : typeof arg === "string" ? arg : JSON.stringify(arg)).join(" ")); };
  console.error = sink; console.log = sink; console.warn = sink;
  try { return { result: await work(), logs }; } finally { Object.assign(console, original); }
}

Deno.test("27 Telegram đứt mạng: lỗi và log không bao giờ chứa URL/token bot", async () => {
  setup();
  const { telegramSend } = await import("../_shared/tue-lam.ts");
  telegramNetworkFails = true;
  let message = "";
  try { await telegramSend("thử"); } catch (error) { message = (error as Error).message + String((error as Error).stack) + String((error as Error & { cause?: unknown }).cause ?? ""); }
  assert(message.length > 0, "phải ném lỗi");
  assert(!message.includes("fake-bot-token") && !message.includes("api.telegram.org"), `lỗi lộ URL: ${message}`);
  const { result, logs } = await captureLogs(() => chat(S1, "Em muốn gặp người thật, số em 0912345678"));
  assertStringIncludes(result.body.reply, "zalo.me");
  const { logs: logs2 } = await captureLogs(async () => {
    telegramNetworkFails = false;
    const alertBody = await chat(S2, "Em muốn gặp người thật, số em 0987654321");
    telegramNetworkFails = true;
    await tg({ text: "!Dạ em đây" });
    return alertBody;
  });
  const all = [...logs, ...logs2].join(" | ");
  assert(logs.length + logs2.length > 0, "phải có log lỗi để kiểm");
  assert(!all.includes("fake-bot-token") && !all.includes("api.telegram.org/bot"), `log lộ token: ${all}`);
});

Deno.test("28 lỗi bất ngờ sau khi đã giành update_id → vẫn 200 và báo anh gửi lại", async () => {
  setup();
  await handoff(S1);
  dbThrowOnMessageInsert = true;
  const { result } = await captureLogs(() => tg({ text: "!Dạ em đây" }, { updateId: 7001 }));
  assertEquals(result.status, 200);
  assertEquals(lastTg().text, "Em gặp lỗi khi xử lý tin này, anh gửi lại giúp em.");
  assertEquals(lastTg().reply_to, nextTgId - 2); // trả lời đúng tin của anh (id cấp trước tin báo lỗi)
  assertEquals(fake.config().update_id_cuoi, 7001);
  // Lỗi khi Telegram cũng đứt: không ném tiếp, vẫn 200.
  telegramNetworkFails = true;
  const again = await captureLogs(() => tg({ text: "!Dạ em đây" }, { updateId: 7002 }));
  assertEquals(again.result.status, 200);
  // Sai secret (chưa giành update_id) → không báo gì.
  telegramNetworkFails = false;
  const count = telegram.length;
  await tg({ text: "!x" }, { secret: "sai", updateId: 7003 });
  assertEquals(telegram.length, count);
});

Deno.test("29 #mã chỉ nhận ở đầu tin, '#' giữa câu không chọn khách", async () => {
  setup();
  await handoff(S1);
  await handoff(S2, "0987654321");
  const count = fake.messages().length;
  await tg({ text: "!Dạ mã giảm giá của chị là #DEF456 nhé" });
  assertEquals(fake.messages().length, count);
  assertStringIncludes(lastTg().text, "Đang có 2 khách anh vào cuộc");
  await tg({ text: "  #DEF456 !Dạ em chào chị" });
  assertEquals(fake.messages(S2).at(-1)!.content, "Dạ em chào chị");
  await tg({ text: "#abc123: !Dạ em chào anh, mã #DEF456 là của khách khác" });
  assertEquals(fake.messages(S1).at(-1)!.content, "Dạ em chào anh, mã #DEF456 là của khách khác");
  // Đúng 1 khách vào cuộc + '#' giữa câu → vẫn gửi nguyên câu (kể cả '#') cho khách đó.
  await tg({ text: "/xong #DEF456" });
  await tg({ text: "!Chị nhập mã #SALE10 khi thanh toán nhé" });
  assertEquals(fake.messages(S1).at(-1)!.content, "Chị nhập mã #SALE10 khi thanh toán nhé");
});

Deno.test("30 /cho 60 + khách nhắn 2 câu khi đang có nháp → nháp mới trả lời cả 2 câu, đăng 1 lần", async () => {
  setup();
  await handoff(S1);
  await tg({ text: "/cho 60" });
  await chat(S1, "Combo 5 skill giá bao nhiêu?");
  const firstId = fake.messages(S1).filter((row) => row.role === "customer").at(-1)!.id;
  advance(10_000);
  const second = await chat(S1, "À cho chị hỏi thêm có xuất hoá đơn không?");
  assertEquals(second.body.dang_soan, true);
  const request = gemini.at(-1)!;
  const lastUser = request.contents.at(-1)!;
  const lastText = lastUser.parts.map((part) => part.text).join(" | ");
  assertEquals(lastUser.role, "user");
  assertStringIncludes(lastText, "Combo 5 skill giá bao nhiêu?");
  assertStringIncludes(lastText, "có xuất hoá đơn không?");
  assertStringIncludes(lastText, "Khách đã nhắn 2 câu liên tiếp chưa được trả lời");
  assertEquals(fake.session(S1).nhap_cho_tin_id, firstId);
  assertStringIncludes(lastTg().text, "gộp cả câu khách nhắn trước");
  advance(61_000);
  const poll = await browser("poll", S1, 0);
  assertEquals(poll.body.messages.length, 1);
  assertEquals(poll.body.dang_soan, false);
  // Không còn nháp: câu tiếp theo không bị coi là gộp.
  await chat(S1, "Cảm ơn em");
  const plain = gemini.at(-1)!.contents.at(-1)!.parts.map((part) => part.text).join(" | ");
  assert(!plain.includes("câu liên tiếp"));
});

Deno.test("26 test không gọi dịch vụ thật nào", () => {
  assert(externalCalls.every((host) => ["fake.supabase.test", "api.telegram.org", "generativelanguage.googleapis.com"].includes(host)));
  assertEquals(Deno.env.get("SUPABASE_URL"), "https://fake.supabase.test");
});

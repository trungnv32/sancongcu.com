import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Minus, Send, Sparkles, X } from "lucide-react";

import tueLamAvatar from "@/assets/tue-lam-chat-avatar.png";
import { supabase } from "@/lib/supabase";

type ChatMessage = {
  id: number;
  role: "agent" | "customer";
  content: string;
};

function renderAgentMessage(content: string) {
  const normalized = content
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+(?=\d+\.\s+(?:\*\*)?)/g, "\n")
    .replace(/[ \t]+(?=-\s+)/g, "\n");

  return normalized.split("\n").map((line, lineIndex) => (
    <span key={`${lineIndex}-${line}`}>
      {lineIndex > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
          : <span key={partIndex}>{part}</span>,
      )}
    </span>
  ));
}

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: "agent",
    content:
      "Em chào anh/chị, em là Tuệ Lâm, KOL và đại sứ thương hiệu của Sancongcu.com. Anh/chị đang cần tìm skill AI, hỏi cách dùng, hay cần hỗ trợ đơn hàng ạ?",
  },
];

const quickReplies = ["Tư vấn skill phù hợp", "Hướng dẫn mua hàng", "Hỗ trợ đơn hàng"];

type PollMessage = { id: number; content: string };
type PollResponse = { messages?: PollMessage[]; dang_soan?: boolean; da_chuyen?: boolean; afterId?: number };
type HistoryMessage = { id: number; from: "customer" | "tue-lam"; content: string };

const SESSION_KEY = "tue-lam-chat-session";
const afterIdKey = (sessionId: string) => `tue-lam-chat-after:${sessionId}`;
const OPEN_POLL_MS = 4000;
const CLOSED_POLL_MS = 20000;

export function SancongcuSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [customerMessageCount, setCustomerMessageCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [chatSessionId, setChatSessionId] = useState("");
  // Đã chuyển người thật: hỏi tin mới kể cả khi khách đóng khung chat.
  const [handedOff, setHandedOff] = useState(false);
  // Tuệ Lâm đang soạn câu trả lời (chế độ chờ duyệt).
  const [isDrafting, setIsDrafting] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const afterIdRef = useRef(0);
  const isOpenRef = useRef(isOpen);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) setHasUnread(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const messageList = messageListRef.current;
    if (!messageList) return;
    const frame = window.requestAnimationFrame(() => {
      messageList.scrollTo({ top: messageList.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, isSending, isDrafting, messages]);

  const rememberAfterId = (sessionId: string, id: number) => {
    if (id <= afterIdRef.current) return;
    afterIdRef.current = id;
    window.sessionStorage.setItem(afterIdKey(sessionId), String(id));
  };

  useEffect(() => {
    let sessionId = window.sessionStorage.getItem(SESSION_KEY);
    const isReturning = Boolean(sessionId);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    const activeSessionId = sessionId;
    afterIdRef.current = Number(window.sessionStorage.getItem(afterIdKey(activeSessionId))) || 0;
    setChatSessionId(activeSessionId);
    if (!isReturning || !supabase) return;
    // Tải lại trang: khôi phục cuộc chat của phiên này (không bao giờ có ghi chú nội bộ).
    void supabase.functions.invoke("tue-lam-telegram-webhook", {
      body: { action: "lich-su", sessionId: activeSessionId },
    }).then(({ data, error }) => {
      if (error || !Array.isArray(data?.messages)) return;
      const history = data.messages as HistoryMessage[];
      if (history.length) {
        setMessages([...initialMessages, ...history.map((message) => ({
          id: message.id,
          role: message.from === "customer" ? ("customer" as const) : ("agent" as const),
          content: message.content,
        }))]);
        setCustomerMessageCount(history.filter((message) => message.from === "customer").length);
      }
      rememberAfterId(activeSessionId, Number(data.afterId) || 0);
      if (data.da_chuyen) setHandedOff(true);
      setIsDrafting(Boolean(data.dang_soan));
    });
  }, []);

  const shouldPoll = handedOff || isDrafting;
  useEffect(() => {
    if (!shouldPoll || !chatSessionId || !supabase) return;
    const client = supabase;
    const timer = window.setInterval(() => {
      void client.functions.invoke("tue-lam-telegram-webhook", {
        body: { action: "poll", sessionId: chatSessionId, afterId: afterIdRef.current },
      }).then(({ data, error }) => {
        if (error || !data) return;
        const result = data as PollResponse;
        setIsDrafting(Boolean(result.dang_soan));
        if (!Array.isArray(result.messages) || !result.messages.length) return;
        const incoming = result.messages;
        setMessages((current) => {
          const currentIds = new Set(current.map((message) => message.id));
          const unseen = incoming.filter((message) => !currentIds.has(message.id));
          return unseen.length ? [...current, ...unseen.map((message) => ({ id: message.id, role: "agent" as const, content: message.content }))] : current;
        });
        rememberAfterId(chatSessionId, Math.max(...incoming.map((message) => message.id)));
        if (!isOpenRef.current) setHasUnread(true);
      });
    }, isOpen ? OPEN_POLL_MS : CLOSED_POLL_MS);
    return () => window.clearInterval(timer);
  }, [chatSessionId, isOpen, shouldPoll]);

  const sendMessage = async (content: string) => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    const nextCustomerMessageCount = customerMessageCount + 1;
    const customerMessage: ChatMessage = {
      id: Date.now(), role: "customer", content: trimmedContent,
    };
    setMessages((current) => [...current, customerMessage]);
    setCustomerMessageCount(nextCustomerMessageCount);
    setDraft("");
    setIsSending(true);

    try {
      if (!supabase) throw new Error("Chưa kết nối được dịch vụ chat.");
      const { data, error } = await supabase.functions.invoke("tue-lam-chat", {
        body: {
          sessionId: chatSessionId,
          message: trimmedContent,
          pageUrl: window.location.href,
        },
      });
      if (error) throw error;
      if (data?.handoff || data?.vao_cuoc) setHandedOff(true);
      if (data?.dang_soan) {
        // Anh Trung đang xem: câu trả lời sẽ đến qua lượt hỏi tin.
        setHandedOff(true);
        setIsDrafting(true);
        return;
      }
      if (!data?.reply) throw new Error(data?.error ?? "Chưa nhận được phản hồi.");
      const agentMessage: ChatMessage = { id: Date.now() + 1, role: "agent", content: data.reply };
      setMessages((current) => [...current, agentMessage]);
    } catch (error) {
      console.error("Không gửi được tin nhắn Tuệ Lâm:", error);
      setMessages((current) => [...current, {
        id: Date.now() + 2,
        role: "agent",
        content: "Em chưa kết nối được để trả lời lúc này. Anh/chị có thể nhắn Zalo hỗ trợ qua https://zalo.me/0938069668, hoặc thử lại sau ít phút ạ.",
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(draft);
  };

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          aria-label="Chat hỗ trợ Tuệ Lâm"
          className="w-[calc(100vw-2rem)] max-w-[24rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45)]"
        >
          <header className="flex items-center justify-between bg-[linear-gradient(135deg,#276cf3,#0a0a0a)] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-lg">
                <img
                  src={tueLamAvatar}
                  alt="Tuệ Lâm"
                  className="h-full w-full rounded-full object-cover"
                />
                <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold leading-tight tracking-normal">
                  Tuệ Lâm
                </h2>
                <p className="flex items-center gap-1 text-xs font-medium text-blue-100">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  KOL Sancongcu.com
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Thu nhỏ chat hỗ trợ"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Minus className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Đóng chat hỗ trợ"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div ref={messageListRef} className="max-h-[min(22rem,calc(100vh-20rem))] min-h-[12rem] space-y-3 overflow-y-auto bg-slate-950 px-4 py-4 max-[420px]:max-h-[calc(100vh-18rem)]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${
                  message.role === "customer" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "agent" && (
                  <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white p-0.5 shadow-sm">
                    <img
                      src={tueLamAvatar}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "customer"
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md bg-slate-900 text-slate-100 ring-1 ring-white/10"
                  } whitespace-pre-wrap`}
                >
                  {message.role === "agent" ? renderAgentMessage(message.content) : message.content}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-1">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  disabled={!chatSessionId || isSending}
                  onClick={() => sendMessage(reply)}
                  className="rounded-full border border-blue-300/35 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-200 hover:bg-blue-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
              {isSending && <p className="px-2 text-xs text-slate-300">Tuệ Lâm đang trả lời…</p>}
              {!isSending && isDrafting && (
                <p role="status" className="w-full px-2 pt-1 text-xs text-slate-300">Tuệ Lâm đang soạn câu trả lời…</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
            <label htmlFor="sancongcu-support-message" className="sr-only">
              Nhắn tin cho Tuệ Lâm
            </label>
            <input
              id="sancongcu-support-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={isSending || !chatSessionId}
              autoComplete="off"
              placeholder="Nhắn tin cho Tuệ Lâm..."
              className="min-h-11 min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <button
              type="submit"
              aria-label="Gửi tin nhắn"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={isOpen ? "Ẩn chat hỗ trợ Tuệ Lâm" : hasUnread ? "Mở chat hỗ trợ Tuệ Lâm, có tin nhắn mới" : "Mở chat hỗ trợ Tuệ Lâm"}
        onClick={() => setIsOpen((current) => !current)}
        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_18px_45px_-15px_rgba(37,99,235,0.65)] ring-4 ring-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        <span className="absolute inset-0 rounded-full bg-blue-500 opacity-35 blur-md transition group-hover:opacity-50" />
        <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white">
          {isOpen ? (
            <X className="h-7 w-7 text-blue-600" aria-hidden="true" />
          ) : (
            <>
              <img
                src={tueLamAvatar}
                alt=""
                className="h-full w-full object-cover"
              />
              <MessageCircle
                className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-blue-600 p-0.5 text-white"
                aria-hidden="true"
              />
            </>
          )}
        </span>
        {!isOpen && (
          hasUnread ? (
            <span
              data-testid="tue-lam-unread-dot"
              className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-red-500"
            />
          ) : (
            <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
          )
        )}
      </button>
    </div>
  );
}

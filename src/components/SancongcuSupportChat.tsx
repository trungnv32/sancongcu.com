import { FormEvent, useState } from "react";
import { Bot, MessageCircle, Minus, Send, Sparkles, X } from "lucide-react";

import tueLamAvatar from "@/assets/tue-lam-chat-avatar.png";

type ChatMessage = {
  id: number;
  role: "agent" | "customer";
  content: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: "agent",
    content:
      "Em chào anh/chị, em là Tuệ Lâm, KOL và đại sứ thương hiệu của Sancongcu.com. Anh/chị đang cần tìm skill AI, hỏi cách dùng, hay cần hỗ trợ đơn hàng ạ?",
  },
  {
    id: 2,
    role: "agent",
    content:
      "Sau này Tuệ Lâm sẽ được kết nối với AI Agent đã nạp dữ liệu của Sancongcu để chăm sóc khách hàng tự động.",
  },
];

const quickReplies = ["Tư vấn skill phù hợp", "Hướng dẫn mua hàng", "Hỗ trợ đơn hàng"];

export function SancongcuSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");

  const sendMessage = (content: string) => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        role: "customer",
        content: trimmedContent,
      },
      {
        id: Date.now() + 1,
        role: "agent",
        content:
          "Tuệ Lâm đã ghi nhận câu hỏi của anh/chị. Khi kết nối AI Agent, phần này sẽ trả lời theo dữ liệu thật của Sancongcu.",
      },
    ]);
    setDraft("");
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

          <div className="max-h-[min(22rem,calc(100vh-20rem))] min-h-[12rem] space-y-3 overflow-y-auto bg-slate-950 px-4 py-4 max-[420px]:max-h-[calc(100vh-18rem)]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${
                  message.role === "customer" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "agent" && (
                  <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                    <Bot className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  </div>
                )}
                <p
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "customer"
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md bg-slate-900 text-slate-100 ring-1 ring-white/10"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-1">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => sendMessage(reply)}
                  className="rounded-full border border-blue-300/35 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-200 hover:bg-blue-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
                >
                  {reply}
                </button>
              ))}
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
        aria-label={isOpen ? "Ẩn chat hỗ trợ Tuệ Lâm" : "Mở chat hỗ trợ Tuệ Lâm"}
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
          <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
        )}
      </button>
    </div>
  );
}

import { LoaderCircle, Mail, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { FreeResource } from "@/lib/site-content";
import { supabase } from "@/lib/supabase";

type RequestStatus = "idle" | "sending" | "sent" | "error";

/**
 * Form "Nhận link tải" dùng chung cho Kho tài nguyên miễn phí và các trang chi tiết tài nguyên.
 * Gửi về edge function free-resource-request: lưu lead và gửi link tải qua email.
 */
export function FreeResourceDownloadDialog({
  resource,
  onClose,
}: {
  resource: FreeResource;
  onClose: () => void;
}) {
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");
  const [requestMessage, setRequestMessage] = useState("");

  async function requestDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") || "").trim();
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();
    if (!email) {
      setRequestStatus("error");
      setRequestMessage("Anh/chị vui lòng nhập email.");
      return;
    }

    setRequestStatus("sending");
    setRequestMessage("");
    const { data, error } = await supabase.functions.invoke("free-resource-request", {
      body: { resourceId: resource.id, fullName, email },
    });

    if (error) {
      setRequestStatus("error");
      setRequestMessage(error.message || "Chưa gửi được email. Vui lòng thử lại.");
      return;
    }

    setRequestStatus("sent");
    setRequestMessage(
      data?.message || "Đã gửi link tải vào email của anh/chị. Vui lòng kiểm tra hộp thư.",
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/45 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Nhận link tải
            </p>
            <h2 className="mt-2 text-2xl leading-tight">{resource.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nhập thông tin, hệ thống sẽ gửi link tải tài nguyên vào email.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border hover:bg-muted"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={(event) => void requestDownload(event)} className="mt-5 space-y-4">
          <label className="block text-sm font-bold">
            Tên
            <input
              name="full_name"
              autoComplete="name"
              className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary"
            />
          </label>
          <label className="block text-sm font-bold">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary"
              placeholder="email@domain.com"
            />
          </label>
          {requestMessage && (
            <p
              className={`rounded-xl p-3 text-sm leading-6 ${
                requestStatus === "sent"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {requestMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={requestStatus === "sending" || requestStatus === "sent"}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 text-sm font-bold text-primary-foreground shadow-brand disabled:opacity-60"
          >
            {requestStatus === "sending" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            Gửi link tải qua email
          </button>
        </form>
      </div>
    </div>
  );
}

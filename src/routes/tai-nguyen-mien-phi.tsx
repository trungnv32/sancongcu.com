import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, LoaderCircle, Mail, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import sanCongCuLogo from "@/assets/sancongcu-logo-transparent.png";
import {
  defaultSitePages,
  type FreeResource,
  type SitePage,
} from "@/lib/site-content";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/tai-nguyen-mien-phi")({
  head: () => ({
    meta: [
      { title: "Kho tài nguyên miễn phí — sancongcu.com" },
      {
        name: "description",
        content: "Tải tài liệu, mẫu prompt và file hướng dẫn miễn phí từ sancongcu.com.",
      },
    ],
  }),
  component: FreeResourcesPage,
});

function FreeResourcesPage() {
  const fallbackPage = defaultSitePages.find((page) => page.slug === "tai-nguyen-mien-phi")!;
  const [page, setPage] = useState<SitePage>(fallbackPage);
  const [resources, setResources] = useState<FreeResource[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [selectedResource, setSelectedResource] = useState<FreeResource | null>(null);
  const [requestStatus, setRequestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      try {
        const [pageResult, resourceResult] = await Promise.all([
          supabase
            .from("site_pages")
            .select("id,slug,menu_label,eyebrow,title,summary,content_blocks,cta_label,cta_href,is_visible,sort_order")
            .eq("slug", "tai-nguyen-mien-phi")
            .maybeSingle(),
          supabase
            .from("free_resources")
            .select("id,title,description,file_url,file_name,sort_order,is_visible")
            .eq("is_visible", true)
            .neq("file_url", "")
            .order("sort_order"),
        ]);
        if (pageResult.data) setPage(pageResult.data as SitePage);
        setResources((resourceResult.data ?? []) as FreeResource[]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function requestDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selectedResource) return;
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    if (!email) {
      setRequestStatus("error");
      setRequestMessage("Anh/chị vui lòng nhập email.");
      return;
    }

    setRequestStatus("sending");
    setRequestMessage("");
    const { data, error } = await supabase.functions.invoke("free-resource-request", {
      body: { resourceId: selectedResource.id, fullName, email },
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
    <main className="min-h-screen bg-soft-gradient">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="block w-44 sm:w-52" aria-label="Về trang chủ sancongcu.com">
            <img src={sanCongCuLogo} alt="sancongcu.com" className="h-auto w-full" />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Trang chủ
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {page.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">{page.title}</h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">{page.summary}</p>
        </div>
        <div className="mt-8 grid gap-3 rounded-3xl border border-primary/10 bg-card p-5 shadow-card sm:grid-cols-2">
          {page.content_blocks.map((block) => (
            <p key={block} className="rounded-2xl bg-secondary p-4 text-sm leading-7 text-muted-foreground">
              {block}
            </p>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        {isLoading ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card">
            <p className="font-semibold text-primary">Đang tải tài nguyên...</p>
          </div>
        ) : resources.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <article
                key={resource.id}
                className="flex min-h-72 flex-col rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="size-6" />
                </div>
                <h2 className="mt-5 text-xl leading-snug">{resource.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                  {resource.description || "Tài nguyên miễn phí từ sancongcu.com."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedResource(resource);
                    setRequestStatus("idle");
                    setRequestMessage("");
                  }}
                  className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 text-sm font-bold text-primary-foreground shadow-brand transition hover:opacity-90"
                >
                  <Download className="size-4" />
                  Tải về
                </button>
                {resource.file_name && (
                  <p className="mt-2 truncate text-center text-xs text-muted-foreground">
                    {resource.file_name}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-primary/30 bg-card p-8 text-center shadow-card">
            <FileText className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 text-2xl">Tài nguyên đang được cập nhật</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              Bạn có thể tải file trong trang quản trị. Khi tài nguyên được bật hiển thị, khách hàng
              sẽ thấy nút tải tại đây.
            </p>
          </div>
        )}
      </section>

      {selectedResource && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/45 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Nhận link tải
                </p>
                <h2 className="mt-2 text-2xl leading-tight">{selectedResource.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Nhập thông tin, hệ thống sẽ gửi link tải tài nguyên vào email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResource(null)}
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
                disabled={requestStatus === "sending"}
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
      )}
    </main>
  );
}

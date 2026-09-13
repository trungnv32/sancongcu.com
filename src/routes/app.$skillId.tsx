import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleUserRound, Download, ImagePlus, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import fallback from "@/assets/tue-lam-03-standing.jpg";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/$skillId")({ component: SkillWebapp });
type Config = { price_vnd?: number; input_limit?: number };
type Skill = {
  title: string;
  introduction: string;
  thumbnail_path: string | null;
  webapp_config: Config;
};
type Job = {
  id: string;
  status: string;
  quoted_amount_vnd: number;
  created_at: string;
  error_message?: string | null;
  output_urls: string[];
};
const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

function SkillWebapp() {
  const { skillId } = Route.useParams();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loaded, setLoaded] = useState(!supabase);
  const [files, setFiles] = useState<File[]>([]);
  const [instruction, setInstruction] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [balance, setBalance] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = Math.max(0, skill?.webapp_config?.price_vnd ?? 15000);
  const inputLimit = Math.min(4, Math.max(1, skill?.webapp_config?.input_limit ?? 1));

  const loadJobs = async () => {
    if (!supabase) return;
    const { data } = await supabase.functions.invoke("webapp-generate", {
      body: { action: "history" },
    });
    if (data?.jobs) setJobs(data.jobs as Job[]);
  };
  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("skills")
        .select("title,introduction,thumbnail_path,webapp_config")
        .eq("slug", skillId)
        .eq("status", "published")
        .eq("webapp_enabled", true)
        .maybeSingle();
      setSkill(data as Skill | null);
      setLoaded(true);
    })();
  }, [skillId]);
  useEffect(() => {
    if (!supabase) return;
    const loadAccount = async (userId?: string) => {
      setSignedIn(Boolean(userId));
      if (!userId) {
        setBalance(0);
        setJobs([]);
        return;
      }
      const { data } = await supabase
        .from("wallets")
        .select("balance_vnd")
        .eq("user_id", userId)
        .maybeSingle();
      setBalance(data?.balance_vnd ?? 0);
      void loadJobs();
    };
    void supabase.auth.getSession().then(({ data }) => void loadAccount(data.session?.user.id));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => void loadAccount(session?.user.id),
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  async function generate() {
    if (!supabase || !files.length || creating) return;
    setCreating(true);
    setError(null);
    const requestId = crypto.randomUUID();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setCreating(false);
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }
    const makeBody = () => {
      const body = new FormData();
      body.set("skill_slug", skillId);
      body.set("instruction", instruction);
      body.set("request_id", requestId);
      body.set("session_token", `Bearer ${session.access_token}`);
      files.forEach((file) => body.append("images[]", file));
      return body;
    };
    let data: { error?: string; job?: Job } | null = null;
    try {
      const response = await fetch("/api/webapp-generate.php", {
        method: "POST",
        body: makeBody(),
      });
      data = (await response.json().catch(() => null)) as typeof data;
      if (!response.ok) throw new Error(data?.error || "Dịch vụ tạo ảnh đang gặp sự cố.");
    } catch (requestError) {
      setCreating(false);
      console.error("Webapp generation failed", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể kết nối dịch vụ tạo ảnh. Vui lòng thử lại.",
      );
      return;
    }
    setCreating(false);
    if (data?.error) {
      setError(data.error);
      return;
    }
    if (data?.job) setJobs((current) => [data.job as Job, ...current]);
    setBalance((current) => Math.max(0, current - price));
    setFiles([]);
    setInstruction("");
  }
  if (!loaded)
    return (
      <main className="grid min-h-dvh place-items-center bg-soft-gradient">
        <LoaderCircle className="size-8 animate-spin text-primary" />
      </main>
    );
  if (!skill)
    return (
      <main className="grid min-h-dvh place-items-center bg-soft-gradient px-5 text-center">
        <section className="max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold">Webapp này chưa sẵn sàng</h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            Skill chưa bật phiên bản dùng trực tiếp trên web hoặc chưa được công bố.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-foreground px-5 py-3 font-bold text-background"
          >
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  return (
    <main className="min-h-dvh overflow-x-hidden bg-soft-gradient">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            to="/skill/$skillId"
            params={{ skillId }}
            className="min-h-11 py-2 text-sm font-semibold sm:text-base"
          >
            ← Chi tiết Skill
          </Link>
          <Link
            to="/tai-khoan"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold hover:bg-muted"
          >
            <CircleUserRound className="size-4" />{" "}
            {signedIn ? `Số dư: ${money(balance)}` : "Đăng nhập"}
          </Link>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Webapp Skill</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{skill.title}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{skill.introduction}</p>
          <label className="mt-8 grid min-h-64 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 p-5 text-center transition hover:bg-primary/10">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                setFiles(Array.from(event.target.files ?? []).slice(0, inputLimit));
                event.target.value = "";
              }}
            />
            <span>
              <ImagePlus className="mx-auto size-9 text-primary" />
              <span className="mt-3 block font-bold">
                {files.length ? `Đã chọn ${files.length} ảnh` : "Tải ảnh sản phẩm lên"}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {inputLimit === 1 ? "Chỉ cần 1 ảnh" : `Tối đa ${inputLimit} ảnh`}
                {" · JPG, PNG hoặc WebP · 10 MB/ảnh"}
              </span>
              {inputLimit === 1 && (
                <span className="mt-2 block max-w-xl text-sm leading-6 text-muted-foreground">
                  Không cần ảnh đẹp, nhưng nên đầy đủ thành phần, nên lật 1 góc mặt dưới chăn để AI
                  không tạo sai chi tiết.
                </span>
              )}
            </span>
          </label>
          {files.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {files.map((file) => (
                <span
                  key={`${file.name}-${file.lastModified}`}
                  className="shrink-0 rounded-lg bg-muted px-3 py-2 text-xs font-medium"
                >
                  {file.name}
                </span>
              ))}
            </div>
          )}
          <label className="mt-6 block text-sm font-bold">
            Yêu cầu thêm{" "}
            <span className="font-normal text-muted-foreground">
              (không bắt buộc)
            </span>
            <textarea
              value={instruction}
              onChange={(event) => {
                setInstruction(event.target.value);
                setError(null);
              }}
              maxLength={1000}
              rows={5}
              placeholder="Ví dụ: tạo ảnh chính diện, nền phòng ngủ sáng, không thêm chữ…"
              className="input mt-2 min-h-32 resize-y leading-7"
            />
          </label>
          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setInstruction("");
                  setError(null);
                }}
                className="mt-3 font-bold underline underline-offset-4"
              >
                Đặt lại yêu cầu
              </button>
            </div>
          )}
        </section>
        <aside className="h-fit rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
          <img
            src={skill.thumbnail_path || fallback}
            alt=""
            className="aspect-square w-full rounded-2xl object-cover"
          />
          <h2 className="mt-5 text-xl font-bold">Tạo ảnh theo lượt</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {money(price)} / ảnh. Nếu tạo không thành công, hệ thống tự hoàn tiền.
          </p>
          {signedIn ? (
            <button
              type="button"
              disabled={!files.length || creating || balance < price}
              onClick={() => void generate()}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-5 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating && <LoaderCircle className="size-4 animate-spin" />}
              {creating
                ? "Đang tạo ảnh…"
                : !files.length
                  ? "Cần ảnh đầu vào"
                  : balance < price
                    ? "Số dư chưa đủ"
                    : `Tạo ảnh · ${money(price)}`}
            </button>
          ) : (
            <Link
              to="/tai-khoan"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-gradient px-5 py-3 font-bold text-primary-foreground"
            >
              Đăng nhập để dùng app
            </Link>
          )}
          <Link
            to="/tai-khoan"
            hash="so-du"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-4 text-sm font-bold hover:bg-muted"
          >
            Nạp số dư
          </Link>
        </aside>
      </main>
      {signedIn && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
          <h2 className="text-xl font-bold">Kết quả gần đây</h2>
          {jobs.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Bạn chưa tạo ảnh nào bằng Webapp này.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <article
                  key={job.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {job.output_urls?.map((url) => (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        key={url}
                        className="group relative"
                      >
                        <img
                          src={url}
                          alt="Ảnh được tạo"
                          className="aspect-square w-full rounded-xl object-cover"
                        />
                        <span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-background/90 opacity-0 transition group-hover:opacity-100">
                          <Download className="size-4" />
                        </span>
                      </a>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-bold">
                    {job.status === "succeeded"
                      ? "Đã tạo ảnh"
                      : job.status === "failed"
                        ? "Tạo ảnh không thành công · đã hoàn tiền"
                        : "Đang xử lý"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(job.created_at).toLocaleString("vi-VN")} ·{" "}
                    {money(job.quoted_amount_vnd)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

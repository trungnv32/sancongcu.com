import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleUserRound, Download, ImagePlus, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import fallback from "@/assets/tue-lam-03-standing.jpg";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/$skillId")({ component: SkillWebapp });
type Config = { price_vnd?: number; input_limit?: number; input_min?: number };
type LogoPosition = "none" | "top-left" | "top-right" | "center";
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
  const [logo, setLogo] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("");
  const [selectedOutputCount, setSelectedOutputCount] = useState(1);
  const [includeCover, setIncludeCover] = useState(false);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("none");
  const [signedIn, setSignedIn] = useState(false);
  const [balance, setBalance] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pricePerImage = Math.max(0, skill?.webapp_config?.price_vnd ?? 15000);
  const inputLimit = Math.min(4, Math.max(1, skill?.webapp_config?.input_limit ?? 1));
  const inputMin = Math.min(inputLimit, Math.max(1, skill?.webapp_config?.input_min ?? 1));
  const unitPrice = logoPosition === "none" ? pricePerImage : 6000;
  const totalPrice = selectedOutputCount * unitPrice;

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
    const body = new FormData();
    body.set("skill_slug", skillId);
    body.set("instruction", instruction);
    body.set("output_count", String(selectedOutputCount));
    body.set("include_cover", String(includeCover));
    body.set("logo_position", logoPosition);
    files.forEach((file) => body.append("images", file));
    if (logo) body.set("logo", logo);
    const { data, error: requestError } = await supabase.functions.invoke("webapp-generate", {
      body,
    });
    setCreating(false);
    if (requestError || data?.error) {
      setError(data?.error || "Không thể kết nối dịch vụ tạo ảnh. Vui lòng thử lại.");
      return;
    }
    if (data?.job) setJobs((current) => [data.job as Job, ...current]);
    setBalance((current) => Math.max(0, current - totalPrice));
    setFiles([]);
    setLogo(null);
    setInstruction("");
    setIncludeCover(false);
    setLogoPosition("none");
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
                {inputMin > 1 ? `Tối thiểu ${inputMin}` : "Tối đa 1"} · tối đa {inputLimit} ảnh ·
                JPG, PNG hoặc WebP · 10 MB/ảnh
              </span>
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              Số lượng ảnh (các góc chụp khác nhau)
              <select
                value={selectedOutputCount}
                onChange={(event) => setSelectedOutputCount(Number(event.target.value))}
                className="input mt-2 h-12"
              >
                {Array.from({ length: 4 }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count} ảnh
                  </option>
                ))}
              </select>
            </label>
            <div className="flex min-h-12 items-center gap-3 self-end rounded-xl border border-border bg-muted/40 px-4 text-sm font-bold">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeCover}
                  onChange={(event) => setIncludeCover(event.target.checked)}
                  className="size-4 accent-primary"
                />
                Có ảnh bìa
              </label>
              <a
                href={skill.thumbnail_path || fallback}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                (xem ảnh mẫu)
              </a>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {logoPosition === "none"
              ? `${money(pricePerImage)} / ảnh · tổng ${money(totalPrice)}.`
              : `Logo: 6.000đ / ảnh · tổng ${money(totalPrice)}.`}{" "}
            Ảnh bìa được tính trong số lượng ảnh đã chọn.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              Vị trí logo
              <select
                value={logoPosition}
                onChange={(event) => setLogoPosition(event.target.value as LogoPosition)}
                className="input mt-2 h-12"
              >
                <option value="none">Không logo</option>
                <option value="top-left">Trái trên</option>
                <option value="top-right">Phải trên</option>
                <option value="center">Ở giữa</option>
              </select>
            </label>
            <label className="block text-sm font-bold">
              Tải logo PNG trong suốt
              <input
                type="file"
                accept="image/png"
                onChange={(event) => {
                  setLogo(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
                className="input mt-2 block h-12 w-full cursor-pointer px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:font-semibold"
              />
              <span className="mt-1 block font-normal text-muted-foreground">
                {logo ? logo.name : "Chỉ dùng khi bạn chọn vị trí logo."}
              </span>
            </label>
          </div>
          <label className="mt-6 block text-sm font-bold">
            Yêu cầu thêm{" "}
            <span className="font-normal text-muted-foreground">
              (không bắt buộc, nên ghi tên bộ ga, thành phần bộ ga, ví dụ 1 ga 2 vỏ gối, 1 chăn hè
              trần mỏng, chất liệu và đặc tính)
            </span>
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              maxLength={1000}
              rows={5}
              placeholder="Ví dụ: Bộ chăn ga poly cotton, 1 ga 2 vỏ gối 1 chăn hè trần mỏng, chất cotton, thấm hút tốt, giặt máy được, mọi kích thước"
              className="input mt-2 min-h-32 resize-y leading-7"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive"
            >
              {error}
            </p>
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
            {logoPosition === "none" ? money(pricePerImage) : "6.000đ"} / ảnh · tổng{" "}
            {money(totalPrice)} cho {selectedOutputCount} ảnh. Nếu tạo không thành công, hệ thống tự
            hoàn tiền.
          </p>
          {signedIn ? (
            <button
              type="button"
              disabled={files.length < inputMin || creating || balance < totalPrice}
              onClick={() => void generate()}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-5 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating && <LoaderCircle className="size-4 animate-spin" />}
              {creating
                ? "Đang tạo ảnh…"
                : files.length < inputMin
                  ? `Cần ${inputMin} ảnh đầu vào`
                  : balance < totalPrice
                    ? "Số dư chưa đủ"
                    : `Tạo ảnh · ${money(totalPrice)}`}
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

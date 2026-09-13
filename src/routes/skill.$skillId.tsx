import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import fallback from "@/assets/tue-lam-03-standing.jpg";
import { getProductContent, productTitles } from "@/lib/product-content";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/skill/$skillId")({ component: Detail });

type Skill = {
  id: string;
  title: string;
  introduction: string;
  benefits: string[];
  audience: string[];
  usage_steps: string[];
  payment_note: string;
  thumbnail_path: string | null;
  price_usd: number;
  activation_price_vnd: number;
  webapp_enabled: boolean;
};
type Media = {
  id: string;
  path: string;
  alt: string;
  media_type: "input" | "output" | "other";
  sort_order: number;
};

const defaultUsage = [
  "Chuẩn bị thông tin đầu vào.",
  "Dán câu lệnh và kiểm tra kết quả.",
  "Lưu và áp dụng kết quả.",
];
const defaultPaymentNote = [
  "Chuyển khoản theo hướng dẫn.",
  "Gửi bill qua Zalo 0938 069 668.",
  "Sau khi được xác nhận, bạn sẽ nhận link tải Skill và hướng dẫn sử dụng riêng qua Zalo.",
].join("\n");

function mediaLabel(type: Media["media_type"]) {
  return type === "input" ? "Đầu vào" : type === "output" ? "Đầu ra" : "Minh họa";
}

function Detail() {
  const { skillId } = Route.useParams();
  const local = getProductContent(skillId);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [activeImageId, setActiveImageId] = useState("main");
  const [loaded, setLoaded] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("skills")
        .select(
          "id,title,introduction,benefits,audience,usage_steps,payment_note,thumbnail_path,price_usd,activation_price_vnd,webapp_enabled",
        )
        .eq("slug", skillId)
        .eq("status", "published")
        .maybeSingle();
      if (data) {
        setSkill(data as Skill);
        const { data: gallery } = await supabase
          .from("skill_media")
          .select("id,path,alt,media_type,sort_order")
          .eq("skill_id", data.id)
          .order("sort_order");
        const priority = { input: 0, output: 1, other: 2 };
        setMedia(
          ((gallery ?? []) as Media[]).sort(
            (a, b) =>
              priority[a.media_type] - priority[b.media_type] || a.sort_order - b.sort_order,
          ),
        );
      }
      setLoaded(true);
    })();
  }, [skillId]);

  if (!loaded && !local)
    return <main className="grid min-h-screen place-items-center">Đang tải…</main>;

  const title = skill?.title ?? productTitles[skillId];
  const intro = skill?.introduction ?? local?.introduction;
  const benefits = skill?.benefits ?? local?.includes ?? [];
  const audience = skill?.audience?.filter(Boolean) ?? [];
  if (!title || !intro)
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <Link to="/" className="rounded-full bg-black px-6 py-3 font-bold text-white">
          Không tìm thấy Skill — Về trang chủ
        </Link>
      </main>
    );

  const priority: Record<Media["media_type"], number> = { input: 0, output: 1, other: 2 };
  const hero: Media = {
    id: "main",
    path: skill?.thumbnail_path || fallback,
    alt: title,
    media_type: "output",
    sort_order: -1,
  };
  const images: Media[] = [hero, ...media].sort(
    (a, b) => priority[a.media_type] - priority[b.media_type] || a.sort_order - b.sort_order,
  );
  const activeImage = images.find((image) => image.id === activeImageId) ?? images[0];
  const usageSteps = skill?.usage_steps?.filter(Boolean).length ? skill.usage_steps : defaultUsage;
  const paymentLines = (skill?.payment_note || defaultPaymentNote)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const choose = () => {
    const key = "sancongcu-cart";
    const cart = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    localStorage.setItem(key, JSON.stringify(cart.includes(skillId) ? cart : [...cart, skillId]));
    window.location.href = "/#danh-muc-1";
  };
  const chooseCombo = (comboSize: 5 | 10) => {
    const key = "sancongcu-cart";
    const cart = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    localStorage.setItem(key, JSON.stringify(cart.includes(skillId) ? cart : [...cart, skillId]));
    localStorage.setItem("sancongcu-combo-size", String(comboSize));
    window.location.href = "/#danh-muc-1";
  };
  const activate = () => {
    window.location.href = `/?activate=${encodeURIComponent(skillId)}#danh-muc-1`;
  };

  return (
    <main className="skill-detail min-h-screen overflow-x-hidden bg-soft-gradient">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="shrink-0 text-sm sm:text-base">
            ← Tất cả Skill
          </Link>
          <span className="shrink-0 text-sm sm:text-base">
            {(skill?.price_usd ?? 1.99).toFixed(2)}$ / Skill
          </span>
        </div>
      </header>
      <section className="skill-detail__hero mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="min-w-0">
          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-card shadow-card sm:rounded-3xl">
            <img
              src={activeImage.path}
              alt={activeImage.alt}
              className="size-full object-contain"
            />
          </div>
          <div
            className="mt-3 flex max-w-full gap-3 overflow-x-auto pb-2"
            aria-label="Ảnh minh họa Skill"
          >
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImageId(image.id)}
                aria-label={`Xem ảnh ${mediaLabel(image.media_type)} ${index + 1}`}
                aria-pressed={activeImageId === image.id}
                className={`w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-card text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeImageId === image.id ? "border-primary" : "border-transparent"}`}
              >
                <img
                  src={image.path}
                  alt=""
                  className="aspect-square w-full bg-muted object-contain"
                />
                <span className="block truncate p-1 text-center text-[10px]">
                  {mediaLabel(image.media_type)}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="break-words text-3xl leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-5 break-words text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {intro}
          </p>
          <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-2xl">Bạn nhận được gì</h2>
            <ul className="mt-4 space-y-3 break-words text-base leading-7">
              {benefits.map((benefit, index) => (
                <li key={`${benefit}-${index}`}>• {benefit}</li>
              ))}
            </ul>
          </section>
          {audience.length > 0 && (
            <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-2xl">Sản phẩm này phù hợp với ai</h2>
              <ul className="mt-4 space-y-3 break-words text-base leading-7">
                {audience.map((item, index) => (
                  <li key={`${item}-${index}`}>• {item}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="relative mt-6 overflow-hidden rounded-2xl bg-foreground p-5 text-background shadow-card sm:p-6">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/40 blur-3xl"
            />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
                Ưu đãi kích hoạt
              </p>
              <h2 className="mt-2 text-2xl leading-tight">Mua nhiều hơn, giá rẻ hơn</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-background/75">
                Chọn thêm Skill để nhận mức giá ưu đãi cho cả combo.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-background/20 bg-background/10 p-4">
                  <p className="text-sm font-bold">Combo 5 Skill</p>
                  <p className="mt-1 text-sm text-background/75">Tự chọn bất kỳ 5 Skill</p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-3xl font-extrabold">8$</p>
                    <span className="rounded-full bg-background/15 px-3 py-1 text-xs font-bold">
                      Tiết kiệm 20%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => chooseCombo(5)}
                    className="mt-4 min-h-12 w-full rounded-full border border-background/40 px-4 py-3 text-sm font-bold transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Chọn Combo 5 Skill
                  </button>
                </div>
                <div className="rounded-xl border border-primary/70 bg-primary/20 p-4 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]">
                  <p className="text-sm font-bold">Combo 10 skill + ChatGPT Plus</p>
                  <p className="mt-1 text-sm text-background/85">Tự chọn bất kỳ 10 Skill</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-primary-foreground">
                    Tặng ChatGPT Plus 1 tháng, sẵn sử dụng
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-extrabold">25$</p>
                    <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-foreground">
                      Tiết kiệm 50%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => chooseCombo(10)}
                    className="mt-4 min-h-12 w-full rounded-full bg-background px-4 py-3 text-sm font-bold text-foreground transition hover:bg-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
                  >
                    Chọn Combo 10 skill + ChatGPT Plus
                  </button>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-background/15 pt-5">
                <div>
                  <p className="text-sm text-background/70">Kích hoạt riêng Skill này</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {skill?.activation_price_vnd?.toLocaleString("vi-VN") ?? "51.000"}đ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={activate}
                  className="min-h-12 rounded-full bg-background px-5 py-3 text-sm font-bold text-foreground transition hover:bg-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  Kích hoạt Skill lẻ →
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
      <section className="skill-detail__actions mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 sm:px-6 sm:pb-20">
        <section className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:rounded-3xl sm:p-7">
          <h2 className="text-2xl">Hướng dẫn sử dụng</h2>
          <ol className="mt-5 space-y-3 break-words text-base leading-7">
            {usageSteps.map((step, index) => (
              <li key={`${step}-${index}`}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </section>
        <section className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:rounded-3xl sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
            Kích hoạt & bàn giao
          </p>
          <h2 className="mt-2 text-2xl">
            Phí kích hoạt: {skill?.activation_price_vnd?.toLocaleString("vi-VN") ?? "51.000"}đ
          </h2>
          <div className="mt-5 space-y-3">
            {paymentLines.map((line, index) => (
              <p
                key={`${line}-${index}`}
                className="break-words rounded-xl bg-muted p-3 text-base leading-7"
              >
                {line}
              </p>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:flex">
            <button
              type="button"
              onClick={choose}
              className="min-h-12 rounded-full border border-border px-5 py-3 font-bold transition hover:bg-muted"
            >
              Chọn Skill này
            </button>
            <button
              type="button"
              onClick={activate}
              className="min-h-12 rounded-full bg-brand-gradient px-5 py-3 font-bold text-primary-foreground transition hover:opacity-90"
            >
              Kích hoạt ngay
            </button>
          </div>
        </section>
        <section className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:rounded-3xl sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Lưu ý sử dụng</p>
          <h2 className="mt-2 text-2xl">Chọn cách dùng phù hợp với bạn</h2>
          <ul className="mt-4 space-y-3 text-base leading-7 text-muted-foreground">
            <li>• Bản cài đặt Skill chạy trên tài khoản ChatGPT Plus hoặc Claude Pro.</li>
            <li>• Nên chạy trên máy tính để thao tác và cài đặt thuận tiện.</li>
          </ul>
          {skill?.webapp_enabled && (
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <p className="text-lg font-bold text-foreground">
                Không muốn cài đặt, không có ChatGPT Plus?
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Dùng ngay trên app, không phải cài gì, trả tiền theo lượt sử dụng, chỉ từ 5.000đ /
                ảnh.
              </p>
              <Link
                to="/app/$skillId"
                params={{ skillId }}
                className="mt-4 inline-flex min-h-11 items-center rounded-full bg-brand-gradient px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                Dùng ngay trên app →
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

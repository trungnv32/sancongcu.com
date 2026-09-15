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
  "Cài đặt câu lệnh vào ChatGPT hoặc Claude trong lần đầu sử dụng.",
  "Chuẩn bị ảnh, nội dung hoặc thông tin đầu vào theo đúng hướng dẫn của Skill.",
  "Nhập yêu cầu mong muốn càng rõ càng tốt để AI hiểu đúng kết quả cần tạo.",
  "Có thể yêu cầu thêm tính năng, phong cách hoặc giới hạn riêng nếu công việc cần.",
  "Tải kết quả về và sử dụng cho bài đăng, quảng cáo hoặc quy trình bán hàng.",
];
const handoffSteps = [
  'Bấm chọn "Kích hoạt", có thể chọn nhiều skill hoặc combo giá sẽ rẻ hơn',
  "Thanh toán bằng mã QR",
  "Gửi bill đến số 0938.069.668",
  "Skill sẽ được gửi đến bạn và đầy đủ hướng dẫn sử dụng bằng hình ảnh",
  "Cài vào ChatGPT hoặc Claude của bạn và sử dụng",
  "Bạn được add vào nhóm Zalo hỗ trợ và cập nhật free trong vòng 1 năm",
];

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
    setLoaded(false);
    setActiveImageId("main");
    void (async () => {
      try {
        const { data } = await supabase
          .from("skills")
          .select(
            "id,title,introduction,benefits,audience,usage_steps,thumbnail_path,price_usd,activation_price_vnd,webapp_enabled",
          )
          .eq("slug", skillId)
          .eq("status", "published")
          .maybeSingle();
        setSkill((data as Skill | null) ?? null);
        setMedia([]);
        if (data) {
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
      } finally {
        setLoaded(true);
      }
    })();
  }, [skillId]);

  if (!loaded)
    return <main className="grid min-h-screen place-items-center bg-soft-gradient">Đang tải…</main>;

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
  const choose = () => {
    const key = "sancongcu-cart";
    const cart = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    localStorage.setItem(key, JSON.stringify(cart.includes(skillId) ? cart : [...cart, skillId]));
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
            <h2 className="skill-detail__section-title">Bạn nhận được gì</h2>
            <ul className="skill-detail__body-list mt-4 space-y-2.5 break-words">
              {benefits.map((benefit, index) => (
                <li key={`${benefit}-${index}`}>• {benefit}</li>
              ))}
            </ul>
          </section>
          {audience.length > 0 && (
            <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="skill-detail__section-title">Sản phẩm này phù hợp với ai</h2>
              <ul className="skill-detail__body-list mt-4 space-y-2.5 break-words">
                {audience.map((item, index) => (
                  <li key={`${item}-${index}`}>• {item}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </section>
      <section className="skill-detail__actions mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 sm:px-6 sm:pb-20">
        <section className="min-w-0 bg-background p-0 sm:p-0">
          <h2 className="skill-detail__section-title">Hướng dẫn sử dụng</h2>
          <ol className="skill-detail__body-list mt-6 space-y-3.5 break-words">
            {usageSteps.map((step, index) => (
              <li key={`${step}-${index}`}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </section>
        <section className="min-w-0 rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:p-7">
          <p className="text-sm font-bold uppercase tracking-[.24em] text-primary">
            Kích hoạt & bàn giao
          </p>
          <h2 className="skill-detail__section-title mt-4">
            Phí kích hoạt: {skill?.activation_price_vnd?.toLocaleString("vi-VN") ?? "51.000"}đ
          </h2>
          <div className="mt-5 space-y-3">
            {handoffSteps.map((line, index) => (
              <p
                key={`${line}-${index}`}
                className="skill-detail__body-copy break-words rounded-[1.25rem] bg-muted px-4 py-3"
              >
                {line}
              </p>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:flex">
            <button
              type="button"
              onClick={choose}
              className="min-h-14 rounded-full border border-border px-7 py-4 text-lg font-bold transition hover:bg-muted"
            >
              Chọn Skill này
            </button>
            <button
              type="button"
              onClick={activate}
              className="min-h-14 rounded-full bg-brand-gradient px-8 py-4 text-lg font-bold text-primary-foreground transition hover:opacity-90"
            >
              Kích hoạt ngay
            </button>
          </div>
        </section>
        <section className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:rounded-3xl sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Lưu ý sử dụng</p>
          <h2 className="skill-detail__section-title mt-2">Chọn cách dùng phù hợp với bạn</h2>
          <ul className="skill-detail__body-list mt-4 space-y-2.5 text-muted-foreground">
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

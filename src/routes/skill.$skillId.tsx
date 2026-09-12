import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import fallback from "@/assets/tue-lam-03-standing.jpg";
import { getProductContent, productTitles } from "@/lib/product-content";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/skill/$skillId")({ component: Detail });

type Skill = { id: string; title: string; introduction: string; benefits: string[]; usage_steps: string[]; payment_note: string; thumbnail_path: string | null; price_usd: number; activation_price_vnd: number };
type Media = { id: string; path: string; alt: string; media_type: "input" | "output" | "other"; sort_order: number };

const defaultUsage = ["Chuẩn bị thông tin đầu vào.", "Dán câu lệnh và kiểm tra kết quả.", "Lưu và áp dụng kết quả."];
const defaultPaymentNote = ["Chuyển khoản theo hướng dẫn.", "Gửi bill qua Zalo 0938 069 668.", "Sau khi được xác nhận, bạn sẽ nhận link tải Skill và hướng dẫn sử dụng riêng qua Zalo."].join("\n");

function mediaLabel(type: Media["media_type"]) {
  return type === "input" ? "Đầu vào" : type === "output" ? "Đầu ra" : "Minh họa";
}

function Detail() {
  const { skillId } = Route.useParams();
  const local = getProductContent(skillId);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.from("skills").select("id,title,introduction,benefits,usage_steps,payment_note,thumbnail_path,price_usd,activation_price_vnd").eq("slug", skillId).eq("status", "published").maybeSingle();
      if (data) {
        setSkill(data as Skill);
        const { data: gallery } = await supabase.from("skill_media").select("id,path,alt,media_type,sort_order").eq("skill_id", data.id).order("sort_order");
        const priority = { input: 0, output: 1, other: 2 };
        setMedia(((gallery ?? []) as Media[]).sort((a, b) => priority[a.media_type] - priority[b.media_type] || a.sort_order - b.sort_order));
      }
      setLoaded(true);
    })();
  }, [skillId]);

  if (!loaded && !local) return <main className="grid min-h-screen place-items-center">Đang tải…</main>;

  const title = skill?.title ?? productTitles[skillId];
  const intro = skill?.introduction ?? local?.introduction;
  const benefits = skill?.benefits ?? local?.includes ?? [];
  if (!title || !intro) return <main className="grid min-h-screen place-items-center p-6 text-center"><Link to="/" className="rounded-full bg-black px-6 py-3 font-bold text-white">Không tìm thấy Skill — Về trang chủ</Link></main>;

  const images: Media[] = [{ id: "main", path: skill?.thumbnail_path || fallback, alt: title, media_type: "other", sort_order: -1 }, ...media];
  const activeImage = images[active] ?? images[0];
  const usageSteps = skill?.usage_steps?.filter(Boolean).length ? skill.usage_steps : defaultUsage;
  const paymentLines = (skill?.payment_note || defaultPaymentNote).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const choose = () => {
    const key = "sancongcu-cart";
    const cart = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    localStorage.setItem(key, JSON.stringify(cart.includes(skillId) ? cart : [...cart, skillId]));
    window.location.href = "/#danh-muc-1";
  };
  const activate = () => { window.location.href = `/?activate=${encodeURIComponent(skillId)}#danh-muc-1`; };

  return <main className="skill-detail min-h-screen overflow-x-hidden bg-soft-gradient">
    <header className="border-b border-border bg-background"><div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><Link to="/" className="shrink-0 text-sm sm:text-base">← Tất cả Skill</Link><span className="shrink-0 text-sm sm:text-base">{(skill?.price_usd ?? 1.99).toFixed(2)}$ / Skill</span></div></header>
    <section className="skill-detail__hero mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="min-w-0"><div className="aspect-square w-full overflow-hidden rounded-2xl bg-card shadow-card sm:rounded-3xl"><img src={activeImage.path} alt={activeImage.alt} className="size-full object-contain" /></div><div className="mt-3 flex max-w-full gap-3 overflow-x-auto pb-2" aria-label="Ảnh minh họa Skill">{images.map((image, index) => <button key={image.id} type="button" onClick={() => setActive(index)} aria-label={`Xem ảnh ${mediaLabel(image.media_type)} ${index + 1}`} aria-pressed={active === index} className={`w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-card text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active === index ? "border-primary" : "border-transparent"}`}><img src={image.path} alt="" className="aspect-square w-full bg-muted object-contain" /><span className="block truncate p-1 text-center text-[10px]">{mediaLabel(image.media_type)}</span></button>)}</div></div>
      <div className="min-w-0"><h1 className="break-words text-3xl leading-tight sm:text-4xl">{title}</h1><p className="mt-5 break-words text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{intro}</p><section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="text-2xl">Bạn nhận được gì</h2><ul className="mt-4 space-y-3 break-words text-base leading-7">{benefits.map((benefit, index) => <li key={`${benefit}-${index}`}>• {benefit}</li>)}</ul></section></div>
    </section>
    <section className="skill-detail__actions mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 sm:px-6 sm:pb-20">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:rounded-3xl sm:p-7"><h2 className="text-2xl">Hướng dẫn sử dụng</h2><ol className="mt-5 space-y-3 break-words text-base leading-7">{usageSteps.map((step, index) => <li key={`${step}-${index}`}>{index + 1}. {step}</li>)}</ol></section>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:rounded-3xl sm:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Kích hoạt & bàn giao</p><h2 className="mt-2 text-2xl">Phí kích hoạt: {skill?.activation_price_vnd?.toLocaleString("vi-VN") ?? "51.000"}đ</h2><div className="mt-5 space-y-3">{paymentLines.map((line, index) => <p key={`${line}-${index}`} className="break-words rounded-xl bg-muted p-3 text-base leading-7">{line}</p>)}</div><div className="mt-6 grid gap-3 sm:flex"><button type="button" onClick={choose} className="min-h-12 rounded-full border border-border px-5 py-3 font-bold transition hover:bg-muted">Chọn Skill này</button><button type="button" onClick={activate} className="min-h-12 rounded-full bg-brand-gradient px-5 py-3 font-bold text-primary-foreground transition hover:opacity-90">Kích hoạt ngay</button></div></section>
    </section>
  </main>;
}

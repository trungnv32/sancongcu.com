import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import fallbackImage from "@/assets/tue-lam-03-standing.jpg";
import { getProductContent, productTitles } from "@/lib/product-content";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/skill/$skillId")({ component: SkillDetail });
type Skill = { id: string; title: string; introduction: string; benefits: string[]; usage_steps: string[]; payment_note: string; thumbnail_path: string | null; price_usd: number; activation_price_vnd: number };
type Media = { id: string; path: string; alt: string; caption: string; media_type: "input" | "output" | "other"; sort_order: number };

function SkillDetail() {
  const { skillId } = Route.useParams();
  const local = getProductContent(skillId);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loaded, setLoaded] = useState(!supabase);
  const [activeImage, setActiveImage] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.from("skills").select("id,title,introduction,benefits,usage_steps,payment_note,thumbnail_path,price_usd,activation_price_vnd").eq("slug", skillId).eq("status", "published").maybeSingle();
      if (data) {
        setSkill(data as Skill);
        const { data: gallery } = await supabase.from("skill_media").select("id,path,alt,caption,media_type,sort_order").eq("skill_id", data.id).order("sort_order");
        setMedia((gallery ?? []) as Media[]);
      }
      setLoaded(true);
    })();
  }, [skillId]);
  if (!loaded && !local) return <main className="grid min-h-screen place-items-center bg-soft-gradient">Đang tải Skill…</main>;
  const title = skill?.title ?? productTitles[skillId];
  const introduction = skill?.introduction ?? local?.introduction;
  const benefits = skill?.benefits ?? local?.includes ?? [];
  const price = skill?.price_usd ?? 1.99;
  const images = [{ id: "main", path: skill?.thumbnail_path || fallbackImage, alt: title ?? "Skill", media_type: "other" as const }, ...media];
  if (!title || !introduction) return <main className="grid min-h-screen place-items-center bg-soft-gradient"><div className="text-center"><h1 className="text-3xl">Không tìm thấy Skill</h1><Link to="/" className="mt-6 inline-block rounded-full bg-foreground px-5 py-3 text-background">Về trang chủ</Link></div></main>;
  return <main className="min-h-screen bg-soft-gradient"><header className="border-b border-border bg-background/90 backdrop-blur"><div className="mx-auto flex max-w-6xl justify-between px-6 py-4"><Link to="/" className="font-semibold hover:text-primary">← Tất cả Skill</Link><span className="font-semibold">{price.toFixed(2)}$ / Skill</span></div></header><section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2"><div><img src={images[activeImage]?.path} alt={images[activeImage]?.alt} className="aspect-[4/5] w-full rounded-3xl object-cover shadow-card" /><div className="mt-3 flex gap-3 overflow-x-auto pb-2">{images.map((image, index) => <button key={image.id} onClick={() => setActiveImage(index)} className={`w-20 shrink-0 overflow-hidden rounded-xl border-2 ${activeImage === index ? "border-primary" : "border-transparent"}`}><img src={image.path} alt={image.alt} className="aspect-square w-full object-cover" /><span className="block bg-card p-1 text-[10px] font-semibold">{image.media_type === "input" ? "Đầu vào" : image.media_type === "output" ? "Đầu ra" : "Minh họa"}</span></button>)}</div></div><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">AI Skill thực hành</p><h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{title}</h1><p className="mt-5 text-lg leading-8 text-muted-foreground">{introduction}</p><section className="mt-8 rounded-2xl border border-border bg-card p-6"><h2 className="text-2xl">Bạn nhận được gì</h2><ul className="mt-4 space-y-3 leading-7">{benefits.map((item) => <li key={item}>• {item}</li>)}</ul></section><a href="#kich-hoat" className="mt-6 inline-flex rounded-full bg-brand-gradient px-6 py-3 font-bold text-primary-foreground shadow-brand">Kích hoạt Skill · {price.toFixed(2)}$</a></div></section><section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 lg:grid-cols-2"><section className="rounded-3xl border border-border bg-card p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Hướng dẫn sử dụng</p><h2 className="mt-2 text-3xl">Làm theo từng bước</h2><ol className="mt-6 space-y-4">{(skill?.usage_steps?.length ? skill.usage_steps : ["Chuẩn bị thông tin đầu vào theo hướng dẫn.", "Dán câu lệnh và kiểm tra kết quả.", "Tinh chỉnh, lưu và áp dụng vào công việc."]).map((step, index) => <li key={step} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span><p className="leading-7">{step}</p></li>)}</ol></section><section id="kich-hoat" className="rounded-3xl bg-foreground p-7 text-background"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-glow">Kích hoạt & bàn giao</p><h2 className="mt-2 text-3xl">Phí kích hoạt: {skill?.activation_price_vnd?.toLocaleString("vi-VN") ?? "51.000"}đ</h2><p className="mt-4 leading-7 text-background/75">{skill?.payment_note || "Chuyển khoản theo hướng dẫn, gửi bill qua Zalo 0938 069 668. Sau khi được xác nhận, bạn sẽ nhận link tải Skill và hướng dẫn sử dụng riêng qua Zalo."}</p><Link to="/" className="mt-6 inline-flex rounded-full bg-background px-5 py-3 font-bold text-foreground">Quay lại để kích hoạt</Link></section></section></main>;
}

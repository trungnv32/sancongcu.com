import { createFileRoute, Link } from "@tanstack/react-router";
import { ImagePlus, LoaderCircle, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import fallback from "@/assets/tue-lam-03-standing.jpg";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/$skillId")({ component: SkillWebapp });

type SkillWebappConfig = {
  title: string;
  introduction: string;
  thumbnail_path: string | null;
  webapp_enabled: boolean;
};

function SkillWebapp() {
  const { skillId } = Route.useParams();
  const [skill, setSkill] = useState<SkillWebappConfig | null>(null);
  const [loaded, setLoaded] = useState(!supabase);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("skills")
        .select("title,introduction,thumbnail_path,webapp_enabled")
        .eq("slug", skillId)
        .eq("status", "published")
        .eq("webapp_enabled", true)
        .maybeSingle();
      setSkill(data as SkillWebappConfig | null);
      setLoaded(true);
    })();
  }, [skillId]);

  if (!loaded) {
    return (
      <main className="grid min-h-screen place-items-center bg-soft-gradient">
        <LoaderCircle className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!skill) {
    return (
      <main className="grid min-h-screen place-items-center bg-soft-gradient px-5 text-center">
        <section className="max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold">Webapp này chưa sẵn sàng</h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            Skill chưa bật phiên bản dùng trực tiếp trên web hoặc chưa được công bố.
          </p>
          <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-foreground px-5 py-3 font-bold text-background">
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-soft-gradient">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/skill/$skillId" params={{ skillId }} className="text-sm font-semibold sm:text-base">
            ← Chi tiết Skill
          </Link>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold"
          >
            <WalletCards className="size-4" />
            Ví của tôi
          </button>
        </div>
      </header>
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Webapp Skill</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{skill.title}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{skill.introduction}</p>
          <label className="mt-8 grid min-h-64 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 p-5 text-center transition hover:bg-primary/10">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            <span>
              <ImagePlus className="mx-auto size-9 text-primary" />
              <span className="mt-3 block font-bold">{selectedFile ? selectedFile.name : "Tải ảnh sản phẩm lên"}</span>
              <span className="mt-1 block text-sm text-muted-foreground">JPG, PNG hoặc WebP</span>
            </span>
          </label>
        </section>
        <aside className="h-fit rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
          <img src={skill.thumbnail_path || fallback} alt="" className="aspect-square w-full rounded-2xl object-cover" />
          <h2 className="mt-5 text-xl font-bold">Tạo ảnh theo lượt</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Chỉ từ 5.000đ / ảnh. Chi phí sẽ được hiển thị và xác nhận trước khi tạo.</p>
          <button
            type="button"
            disabled={!selectedFile}
            className="mt-5 min-h-12 w-full rounded-full bg-brand-gradient px-5 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tạo ảnh
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">Tính năng tạo ảnh và ví sẽ được kết nối ở bước tiếp theo.</p>
        </aside>
      </section>
    </main>
  );
}

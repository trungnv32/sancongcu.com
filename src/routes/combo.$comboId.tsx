import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import fallback from "@/assets/tue-lam-03-standing.jpg";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/combo/$comboId")({ component: ComboDetail });

type ComboSkillRow = {
  sort_order: number;
  skills: {
    slug: string;
    title: string;
    short_description: string;
    thumbnail_path: string | null;
    status: "draft" | "published" | "hidden";
  } | null;
};

type Combo = {
  id: string;
  slug: string;
  label: string;
  title: string;
  description: string;
  includes: string;
  page_title: string;
  page_description: string;
};

function ComboDetail() {
  const { comboId } = Route.useParams();
  const [combo, setCombo] = useState<Combo | null>(null);
  const [skills, setSkills] = useState<ComboSkillRow[]>([]);
  const [loaded, setLoaded] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    setLoaded(false);
    void (async () => {
      const { data } = await supabase
        .from("combos")
        .select("id,slug,label,title,description,includes,page_title,page_description")
        .eq("slug", comboId)
        .eq("status", "published")
        .maybeSingle();
      setCombo((data as Combo | null) ?? null);
      if (data) {
        const { data: comboSkills } = await supabase
          .from("combo_skills")
          .select("sort_order, skills(slug,title,short_description,thumbnail_path,status)")
          .eq("combo_id", data.id)
          .order("sort_order");
        setSkills(
          ((comboSkills ?? []) as unknown as ComboSkillRow[]).filter(
            (item) => item.skills?.status === "published",
          ),
        );
      }
      setLoaded(true);
    })();
  }, [comboId]);

  if (!loaded) {
    return (
      <main className="grid min-h-dvh place-items-center bg-soft-gradient">
        <LoaderCircle className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!combo) {
    return (
      <main className="grid min-h-dvh place-items-center bg-soft-gradient px-5 text-center">
        <section className="max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold">Không tìm thấy combo</h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            Combo này chưa được công bố hoặc đã bị ẩn khỏi website.
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
  }

  return (
    <main className="min-h-dvh bg-soft-gradient">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="size-4" />
            Về trang chủ
          </Link>
        </div>
      </header>
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">{combo.label}</p>
        <h1 className="mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">
          {combo.page_title || combo.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
          {combo.page_description || combo.description}
        </p>
        {combo.includes && (
          <p className="mt-6 max-w-2xl text-xs font-bold uppercase tracking-[.16em] text-foreground/70">
            {combo.includes}
          </p>
        )}
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
              Skill trong combo
            </p>
            <h2 className="mt-2 text-2xl font-bold">Bộ công cụ bao gồm</h2>
          </div>
        </div>
        {skills.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Combo này chưa gắn Skill cụ thể. Bạn có thể cập nhật trong trang admin.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((item) => {
              const skill = item.skills;
              if (!skill) return null;
              return (
                <article
                  key={skill.slug}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                >
                  <Link to="/skill/$skillId" params={{ skillId: skill.slug }} className="block">
                    <img
                      src={skill.thumbnail_path || fallback}
                      alt={skill.title}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                    <div className="p-5">
                      <h3 className="text-lg font-bold">{skill.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {skill.short_description}
                      </p>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

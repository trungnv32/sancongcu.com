import { createFileRoute, Link } from "@tanstack/react-router";
import tueLamStanding from "@/assets/tue-lam-03-standing.jpg";
import { getProductContent, productTitles } from "@/lib/product-content";

export const Route = createFileRoute("/skill/$skillId")({ component: SkillDetail });

function SkillDetail() {
  const { skillId } = Route.useParams();
  const content = getProductContent(skillId);
  const title = productTitles[skillId];

  if (!content || !title) {
    return (
      <main className="grid min-h-screen place-items-center bg-soft-gradient px-6 text-center">
        <div>
          <h1 className="text-3xl">Không tìm thấy Skill</h1>
          <Link
            to="/"
            className="mt-6 inline-block rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background"
          >
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-soft-gradient">
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-sm font-semibold text-foreground transition hover:text-primary"
          >
            ← Tất cả Skill
          </Link>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            $2 / Skill
          </span>
        </div>
      </header>
      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-2 md:items-center md:py-20">
        <img
          src={tueLamStanding}
          alt="Tuệ Lâm đại diện cho SanCongCu"
          className="aspect-[4/5] w-full rounded-3xl object-cover shadow-card"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            AI skill thực hành
          </p>
          <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{content.introduction}</p>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl">Bạn nhận được gì</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              {content.includes.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <Link
            to="/"
            hash="danh-muc-1"
            className="mt-8 inline-block rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-90"
          >
            Chọn Skill · $2
          </Link>
        </div>
      </section>
    </main>
  );
}

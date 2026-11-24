import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  Gamepad2,
  Gift,
  LayoutGrid,
  MessageCircle,
  MousePointerClick,
  Play,
  Send,
  Sparkles,
  Smartphone,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import sanCongCuLogo from "@/assets/sancongcu-logo-transparent.png";
import { FreeResourceDownloadDialog } from "@/components/FreeResourceDownloadDialog";
import { nguoiQueGames, gameSrc, thumbSrc, type NguoiQueGame } from "@/lib/game-nguoi-que";
import { freeResourceDetailPages, type FreeResource } from "@/lib/site-content";
import { supabase } from "@/lib/supabase";

const PAGE_PATH = "/tai-nguyen/game-nguoi-que";
const PAGE_TITLE = "Tự làm game vui bằng AI — chơi thử 19 game người que miễn phí | sancongcu.com";
const PAGE_DESCRIPTION =
  "Chơi thử ngay 19 game người que và tải miễn phí Skill Game Người Que. Bạn kể ý tưởng bằng tiếng Việt, AI sẽ tự làm ra game để bạn chơi và gửi cho bạn bè, không cần biết lập trình.";
/** Tài nguyên trong bảng free_resources được nhận diện theo tên file zip tải lên trong admin. */
const FILE_PREFIX = freeResourceDetailPages.find((page) => page.href === PAGE_PATH)!.fileNamePrefix;

export const Route = createFileRoute("/tai-nguyen/game-nguoi-que")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: "Tự làm game vui bằng AI — chơi thử ngay | sancongcu.com" },
      { property: "og:description", content: PAGE_DESCRIPTION },
    ],
  }),
  component: GameNguoiQuePage,
});

const features = [
  {
    icon: Wand2,
    title: "Kể ý tưởng, AI làm ra game",
    text: "Bạn gõ ý tưởng bằng tiếng Việt, ví dụ “làm game người que né deadline”. AI sẽ hỏi lại vài điều để chốt cách chơi, rồi tự làm game cho bạn.",
  },
  {
    icon: Gamepad2,
    title: "Đúng chất người que vui nhộn",
    text: "Người que nét mực trên nền giấy chấm bi, chuyển động mượt và có âm thanh vui tai. Chỉ cần một thao tác để chơi: chạm, giữ, vuốt hoặc ngắm.",
  },
  {
    icon: Sparkles,
    title: "AI tự chơi thử và tự sửa lỗi",
    text: "Trước khi giao game, AI tự chơi thử trên khung điện thoại và máy tính, tìm lỗi và chỉnh độ khó cho vừa tay, nên bạn nhận được game đã chạy ổn.",
  },
  {
    icon: Send,
    title: "Gửi bạn bè là chơi được ngay",
    text: "Mỗi game chỉ là một file. Bạn gửi qua Zalo, Messenger hay email, người nhận bấm vào là chơi, không phải cài thêm gì.",
  },
  {
    icon: Smartphone,
    title: "Chơi tốt trên điện thoại",
    text: "Game tự vừa với màn hình dọc của điện thoại lẫn màn hình ngang của máy tính. Chơi bằng cách chạm màn hình hay dùng bàn phím đều được.",
  },
  {
    icon: LayoutGrid,
    title: "Kèm sẵn 19 game mẫu",
    text: "Trong gói có sẵn 19 game mẫu bằng tiếng Việt để bạn chơi và lấy ý tưởng, kèm tài liệu hướng dẫn có hình minh hoạ.",
  },
];

const steps = [
  {
    title: "Cài Skill Game Người Que",
    text: (
      <>
        Bạn tải gói skill về, giải nén, rồi mở ứng dụng Claude (phần <strong>Claude Code</strong>)
        và nhắn: <strong>“Cài skill này giúp mình”</strong>. AI sẽ tự cài mọi thứ cần thiết, bạn
        không phải gõ lệnh hay cài thêm phần mềm nào. Việc này chỉ làm một lần.
      </>
    ),
  },
  {
    title: "Mô tả game bạn muốn bằng lời bình thường",
    text: (
      <>
        Bạn kể ý tưởng như đang nói chuyện với bạn bè, ví dụ “làm game người que né deadline”. AI sẽ
        hỏi lại vài điều để chốt cách chơi, rồi tự làm game và tự chơi thử để sửa lỗi.
      </>
    ),
  },
  {
    title: "Chơi game hoặc gửi cho bạn bè",
    text: (
      <>
        Làm xong, AI tự mở game lên để bạn chơi ngay. Muốn chia sẻ, bạn gửi file game qua Zalo,
        Messenger hay email, người nhận bấm vào là chơi. Muốn sửa gì, bạn cứ nói tiếp với AI.
      </>
    ),
  },
];

const samplePrompts = [
  "làm game người que né deadline",
  "làm game người que hứng đơn hàng rơi từ trên xuống",
  "làm game người que chạm để nhảy qua ổ gà trên đường đi làm",
  "làm game người que giữ để lấy đà ném dép trúng con gián",
  "chưa có ý tưởng, gợi ý cho tôi 3 game người que vui",
  "cho game nhanh hơn và thêm vật cản",
];

const faqs = [
  {
    q: "Skill này có mất phí không?",
    a: "Gói skill được tặng miễn phí. Để AI làm game cho bạn, bạn cần có tài khoản Claude gói trả phí (Pro hoặc Max) của riêng mình. Ngoài ra bạn không phải trả thêm gì để làm game hay chơi game.",
  },
  {
    q: "Không biết lập trình có làm được không?",
    a: "Được. Bạn chỉ cần kể ý tưởng bằng tiếng Việt, mọi phần kỹ thuật như viết game, chơi thử và sửa lỗi đều do AI làm. Ngay cả bước cài đặt, bạn cũng chỉ cần nhắn “Cài skill này giúp mình” là AI tự lo.",
  },
  {
    q: "Máy tính của tôi có dùng được không?",
    a: "Máy tính Windows hoặc Mac thông thường đều dùng được, không cần máy cấu hình mạnh. Bạn cần có mạng ở lần cài đầu tiên để AI tải về những công cụ cần thiết.",
  },
  {
    q: "Nếu đang cài hay đang làm game mà bị lỗi thì sao?",
    a: "Bạn không cần tự sửa. Bạn chỉ cần nhắn cho AI điều bạn đang thấy, ví dụ “cài bị lỗi rồi, sửa giúp mình” hoặc “game bị màn hình trắng, sửa giúp mình”, AI sẽ tự tìm nguyên nhân và xử lý.",
  },
  {
    q: "Muốn đưa game lên website thì sao?",
    a: "Mỗi game chỉ là một file, nên bạn gửi file đó cho người quản lý website là đưa lên được ngay. Bạn cũng có thể gửi thẳng file cho khách hoặc bạn bè để họ chơi.",
  },
  {
    q: "Game làm ra có được dùng cho thương hiệu của tôi không?",
    a: "Được. Bộ gốc dùng giấy phép mã nguồn mở MIT, bạn chỉ cần giữ nguyên file LICENSE đi kèm là có thể dùng, sửa và chia sẻ. Hãy dùng ý tưởng của riêng bạn, đừng sao chép game thương mại của người khác.",
  },
];

function Section({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-6 px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function DownloadButton({
  isLoading,
  canDownload,
  onOpen,
  variant = "solid",
}: {
  isLoading: boolean;
  canDownload: boolean;
  onOpen: () => void;
  variant?: "solid" | "large";
}) {
  return (
    <button
      type="button"
      disabled={!canDownload}
      onClick={onOpen}
      data-testid="skill-download"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient font-bold text-primary-foreground shadow-brand transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
        variant === "large" ? "min-h-14 px-8 text-base" : "min-h-12 px-6 text-sm"
      }`}
    >
      <Download className="size-4" />
      {isLoading ? "Đang kiểm tra..." : canDownload ? "Tải skill miễn phí" : "Sắp mở tải"}
    </button>
  );
}

const dottedPaper = {
  backgroundColor: "#ffffff",
  backgroundImage: "radial-gradient(rgba(31,41,55,.13) 1.2px, transparent 1.2px)",
  backgroundSize: "24px 24px",
};

function GameCard({ game, onPlay }: { game: NguoiQueGame; onPlay: (game: NguoiQueGame) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPlay(game)}
      data-game={game.slug}
      className="group relative flex flex-col rounded-2xl bg-white p-3 text-left shadow-[0_0_0_1px_rgba(15,23,42,.08),0_1px_2px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(39,108,243,.35),0_10px_24px_-12px_rgba(15,23,42,.35)] focus-visible:outline-2 focus-visible:outline-primary sm:p-4"
      aria-label={`Chơi ${game.name}`}
    >
      {game.badge && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-[#fde68a] px-2.5 py-0.5 text-[11px] font-extrabold text-[#78350f]">
          {game.badge}
        </span>
      )}
      <span className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl">
        <img
          src={thumbSrc(game.slug)}
          alt=""
          loading="lazy"
          className="max-h-full max-w-full object-contain p-2 transition group-hover:scale-105"
        />
      </span>
      <span className="mt-2 flex items-center gap-2 text-[15px] font-extrabold leading-snug text-foreground sm:text-base">
        {game.name}
      </span>
      <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-[13px]">
        {game.tagline}
      </span>
      {game.note && (
        <span className="mt-2 w-fit rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {game.note}
        </span>
      )}
    </button>
  );
}

function GamePlayer({
  game,
  onClose,
  onSwitch,
}: {
  game: NguoiQueGame;
  onClose: () => void;
  onSwitch: (game: NguoiQueGame) => void;
}) {
  const [showList, setShowList] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-foreground/60 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Đang chơi: ${game.name}`}
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-dvh w-full flex-col overflow-hidden bg-white sm:h-[min(88dvh,820px)] sm:max-w-5xl sm:rounded-3xl sm:shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-5 sm:py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold sm:text-lg">{game.name}</p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{game.tagline}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowList((value) => !value)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 text-sm font-bold transition hover:border-primary hover:text-primary"
            >
              <LayoutGrid className="size-4" />
              <span className="hidden sm:inline">Chọn game khác</span>
              <span className="sm:hidden">Game khác</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full border border-border transition hover:bg-muted"
              aria-label="Đóng trình chơi"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="relative flex-1">
          <iframe
            key={game.slug}
            ref={frameRef}
            src={gameSrc(game.slug)}
            title={game.name}
            onLoad={() => frameRef.current?.focus()}
            allow="autoplay; fullscreen"
            className="absolute inset-0 h-full w-full border-0"
          />
          {showList && (
            <div className="absolute inset-0 overflow-y-auto bg-white/95 p-3 backdrop-blur-sm sm:p-5">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
                {nguoiQueGames.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => {
                      setShowList(false);
                      onSwitch(item);
                    }}
                    className={`flex flex-col items-center rounded-xl border p-2 text-center text-xs font-bold leading-tight transition hover:border-primary ${
                      item.slug === game.slug
                        ? "border-primary bg-primary/5"
                        : "border-border bg-white"
                    }`}
                  >
                    <img
                      src={thumbSrc(item.slug)}
                      alt=""
                      loading="lazy"
                      className="mb-1.5 h-14 w-full object-contain sm:h-16"
                    />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PromptRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-card">
      <span className="min-w-0 break-words text-sm font-semibold text-foreground">{text}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-bold transition hover:border-primary hover:text-primary"
        aria-label={`Chép câu mẫu: ${text}`}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Đã chép" : "Chép"}
      </button>
    </li>
  );
}

function GameNguoiQuePage() {
  const [resource, setResource] = useState<FreeResource | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [playing, setPlaying] = useState<NguoiQueGame | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      try {
        const { data } = await supabase
          .from("free_resources")
          .select("id,title,description,thumbnail_url,file_url,file_name,sort_order,is_visible")
          .eq("is_visible", true)
          .neq("file_url", "")
          .ilike("file_name", `${FILE_PREFIX}%`)
          .order("sort_order")
          .limit(1);
        setResource(((data ?? [])[0] as FreeResource | undefined) ?? null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const downloadProps = {
    isLoading,
    canDownload: Boolean(resource),
    onOpen: () => setIsDialogOpen(true),
  };

  return (
    <main className="min-h-dvh bg-soft-gradient text-foreground">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link to="/" className="block w-40 sm:w-52" aria-label="Về trang chủ sancongcu.com">
            <img src={sanCongCuLogo} alt="sancongcu.com" className="h-auto w-full" />
          </Link>
          <Link
            to="/tai-nguyen-mien-phi"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Kho tài nguyên miễn phí</span>
            <span className="sm:hidden">Kho miễn phí</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-10 text-center sm:px-6 sm:pt-14">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.14em] text-primary">
          <Gift className="size-3.5" /> Skill miễn phí
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-[1.1] sm:text-5xl">
          Tự làm game vui bằng AI — <span className="text-primary">chơi thử ngay</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
          Bấm vào một game bên dưới để chơi thử ngay. Nếu thích, bạn tải skill về, kể ý tưởng bằng
          tiếng Việt cho AI, và AI sẽ làm ra game người que của riêng bạn để chơi và gửi cho bạn bè.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="#choi-thu"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-white px-6 text-sm font-bold transition hover:border-primary hover:text-primary"
          >
            <Play className="size-4" /> Chơi thử ngay
          </a>
        </div>
      </section>

      {/* Lưới game */}
      <section id="choi-thu" className="mx-auto max-w-6xl scroll-mt-4 px-3 pb-6 sm:px-6">
        <div className="rounded-3xl p-3 sm:p-6" style={dottedPaper}>
          <p className="mb-4 flex items-center justify-center gap-2 text-center text-sm font-semibold text-muted-foreground">
            <MousePointerClick className="size-4 text-primary" /> {nguoiQueGames.length} game · bấm
            vào thẻ để chơi
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {nguoiQueGames.map((game) => (
              <GameCard key={game.slug} game={game} onPlay={setPlaying} />
            ))}
          </div>
        </div>
      </section>

      {/* Tính năng */}
      <Section eyebrow="Skill này làm được gì" title="Biến một câu ý tưởng thành game chơi được">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-card p-6 shadow-card"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold leading-snug">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Cài đặt & sử dụng */}
      <Section
        id="cach-dung"
        eyebrow="Cài đặt & sử dụng"
        title="Chỉ 3 bước, phần kỹ thuật để AI lo"
      >
        <ol className="grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-primary/15 bg-white p-6 shadow-card"
            >
              <span className="grid size-9 place-items-center rounded-full bg-brand-gradient text-sm font-extrabold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-extrabold leading-snug">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground [&_strong]:text-foreground">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Câu lệnh mẫu */}
      <Section
        eyebrow="Câu mẫu để bắt đầu"
        title="Chưa biết nói gì? Bạn chép một câu dưới đây và gửi cho AI"
      >
        <ul className="grid gap-3 lg:grid-cols-2">
          {samplePrompts.map((text) => (
            <PromptRow key={text} text={text} />
          ))}
        </ul>
      </Section>

      {/* FAQ */}
      <Section eyebrow="Câu hỏi thường gặp" title="Trước khi tải về">
        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={item.q} className="rounded-2xl border border-border bg-card shadow-card">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3 text-left font-bold"
                >
                  {item.q}
                  <ChevronDown
                    className={`size-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* CTA cuối */}
      <section className="mx-auto max-w-6xl px-5 pb-10 sm:px-6">
        <div className="rounded-3xl bg-foreground p-7 text-background sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-background/70">
                <Gift className="size-4" /> Miễn phí · Kèm 19 game mẫu
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight">Nhận Skill Game Người Que</h2>
              <p className="mt-3 text-sm leading-7 text-background/75">
                Bạn nhập email, link tải sẽ được gửi về hộp thư của bạn trong vài phút. Tải về xong,
                bạn nhờ AI cài giúp rồi kể ý tưởng game đầu tiên để thử ngay.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <DownloadButton {...downloadProps} variant="large" />
              <a
                href="https://zalo.me/0938069668"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-background/30 px-6 text-sm font-bold transition hover:bg-background/10"
              >
                <MessageCircle className="size-4" /> Cần hỗ trợ cài đặt
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 pb-24 text-center sm:px-6">
        <p className="text-[11px] leading-5 text-muted-foreground/80">
          Bản Việt hoá dựa trên một dự án mã nguồn mở, giấy phép{" "}
          <a
            href="/game-nguoi-que/LICENSE.txt"
            className="underline underline-offset-2 hover:text-primary"
          >
            MIT
          </a>
          .
        </p>
      </footer>

      {playing && (
        <GamePlayer game={playing} onClose={() => setPlaying(null)} onSwitch={setPlaying} />
      )}
      {isDialogOpen && resource && (
        <FreeResourceDownloadDialog resource={resource} onClose={() => setIsDialogOpen(false)} />
      )}
    </main>
  );
}

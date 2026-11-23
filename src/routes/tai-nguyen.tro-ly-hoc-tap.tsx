import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronDown,
  Clock,
  Download,
  FileAudio,
  FolderArchive,
  Gift,
  HardDrive,
  Laptop,
  MessageCircle,
  NotebookPen,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import sanCongCuLogo from "@/assets/sancongcu-logo-transparent.png";
import { FreeResourceDownloadDialog } from "@/components/FreeResourceDownloadDialog";
import { freeResourceDetailPages, type FreeResource } from "@/lib/site-content";
import { supabase } from "@/lib/supabase";

const PAGE_TITLE = "Trợ lý học tập AI miễn phí — học thay bạn, nhớ hộ bạn | sancongcu.com";
const PAGE_DESCRIPTION =
  "Tải miễn phí Trợ lý học tập chạy bằng Claude Code: xem hết video YouTube, Zoom, Facebook, PDF, ghi chú đủ để làm lại được và trả lời bạn kèm đúng bài, đúng phút.";
const FILE_PREFIX = freeResourceDetailPages[0].fileNamePrefix;

export const Route = createFileRoute("/tai-nguyen/tro-ly-hoc-tap")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: "Trợ lý học tập AI — quà tặng miễn phí từ sancongcu.com" },
      { property: "og:description", content: PAGE_DESCRIPTION },
    ],
  }),
  component: StudyAssistantPage,
});

const features = [
  {
    icon: FileAudio,
    title: "Học thay bạn",
    text: "Gửi link YouTube, Facebook, video Zoom hoặc file PDF. Trợ lý nghe hết bài, lấy lời giảng có mốc thời gian, không bỏ đoạn nào.",
  },
  {
    icon: NotebookPen,
    title: "Ghi chú đủ để làm lại",
    text: "Mỗi bài thành một ghi chú: tóm tắt, dàn ý theo phút, cách làm từng bước, lệnh và prompt chép nguyên văn.",
  },
  {
    icon: Search,
    title: "Hỏi là có, kèm đúng phút",
    text: "Hỏi “bài nào nói về webhook?”, trợ lý trả lời kèm tên bài và phút thứ mấy. Gõ không dấu vẫn tìm ra.",
  },
  {
    icon: Wrench,
    title: "Làm theo bài đã học",
    text: "Nhờ viết kịch bản, lên kế hoạch, làm theo quy trình, trợ lý làm đúng công thức trong bài đã học và ghi rõ nguồn.",
  },
  {
    icon: Target,
    title: "Theo dõi tiến độ khoá học",
    text: "Biết khoá nào đã học tới đâu, còn thiếu bài nào, nên xem bài nào tiếp theo.",
  },
  {
    icon: BookOpenCheck,
    title: "Ôn tập khi bạn muốn",
    text: "Bật chế độ ôn bằng thẻ hỏi–đáp, tự hẹn ngày ôn lại. Không muốn ôn thì trợ lý chỉ học thay, không làm phiền.",
  },
];

const steps = [
  {
    title: "Gửi bài",
    text: "Gõ /hoc kèm link video, hoặc thả file Zoom, PDF vào thư mục của trợ lý.",
  },
  {
    title: "Trợ lý nghe và đọc",
    text: "Dùng phụ đề có sẵn, video không phụ đề thì AI tự nghe ngay trên máy bạn.",
  },
  {
    title: "Ghi chú và cất vào kho",
    text: "Viết ghi chú làm lại được, cất vào kho tra cứu riêng, cập nhật tiến độ.",
  },
  {
    title: "Hỏi lại bất cứ lúc nào",
    text: "Gõ /tra hoặc hỏi thẳng bằng tiếng Việt, nhận câu trả lời kèm nguồn.",
  },
];

const audiences = [
  "Người đi làm mua nhiều khoá học nhưng không có thời gian xem hết",
  "Chủ shop, người kinh doanh online đang học marketing, bán hàng, AI",
  "Giáo viên, coach, người đào tạo muốn lưu lại kiến thức để dùng lại",
  "Sinh viên học qua video bài giảng, buổi Zoom ghi hình",
  "Người mới học AI muốn có một trợ lý thật chạy trên máy mình",
];

const packageItems = [
  "Bộ não trợ lý: quy trình học thay, tra cứu, tiến độ, ôn tập",
  "File cài tự động: Windows bấm đúp là chạy, Mac 1 lệnh",
  "Kho tra cứu riêng trên máy, tìm được cả khi gõ không dấu",
  "4 lệnh nhanh: /hoc · /tra · /tien-do · /on-tap",
  "Bộ hướng dẫn cài đặt, sử dụng và bảng xử lý lỗi thường gặp",
  "Bài mẫu chạy thử không cần mạng để kiểm tra mọi thứ hoạt động",
];

const requirements = [
  { icon: Laptop, title: "Máy Windows 10/11 hoặc Mac", text: "Không cần card đồ hoạ." },
  {
    icon: Sparkles,
    title: "Tài khoản Claude trả phí",
    text: "Gói Pro hoặc Max của riêng bạn, để dùng Claude Code (ứng dụng Claude Desktop, tab Code).",
  },
  {
    icon: HardDrive,
    title: "Ổ đĩa trống từ 3 GB",
    text: "Chủ yếu cho phần AI nghe giọng nói, tải một lần.",
  },
  {
    icon: Clock,
    title: "15–20 phút cài đặt",
    text: "File cài tự lo Python, ffmpeg và các thư viện cần thiết.",
  },
];

const faqs = [
  {
    q: "Trợ lý này có mất phí không?",
    a: "Gói trợ lý tặng miễn phí. Bạn chỉ cần có sẵn tài khoản Claude trả phí (Pro hoặc Max) của riêng mình để chạy Claude Code.",
  },
  {
    q: "Tôi không biết lập trình có dùng được không?",
    a: "Được. Cài bằng cách bấm đúp file cài đặt và làm theo hướng dẫn từng bước. Khi dùng, bạn chỉ cần nói chuyện bằng tiếng Việt với trợ lý.",
  },
  {
    q: "Ghi chú và dữ liệu học của tôi nằm ở đâu?",
    a: "Ghi chú, kho tra cứu và tiến độ nằm trong thư mục trợ lý trên máy bạn. Khi xử lý bài, nội dung được gửi qua tài khoản Claude của bạn như mọi cuộc trò chuyện với Claude.",
  },
  {
    q: "Máy cấu hình thường có chạy được không?",
    a: "Chạy được. Video có phụ đề xong trong vài phút. Video không phụ đề cần AI nghe trên máy, mất khoảng 1–1,5 lần thời lượng video; trợ lý chạy nền, bạn vẫn làm việc khác.",
  },
  {
    q: "Học được những nguồn nào?",
    a: "YouTube, video Facebook, file Zoom ghi hình, mp4, mp3, file phụ đề, PDF và slide. Trang khoá học cần đăng nhập thì bạn tải video về rồi thả vào thư mục của trợ lý.",
  },
  {
    q: "Có dùng cho khoá học trả phí được không?",
    a: "Được, để bạn tự học. Không chia sẻ lại nội dung khoá học của người khác.",
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

function ChatPreview() {
  return (
    <figure className="overflow-hidden rounded-3xl border border-border bg-white shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-green-300" />
        <span className="ml-3 text-[11px] font-semibold text-muted-foreground">
          Claude Code · TroLyHocTap
        </span>
      </div>
      <div className="space-y-3 p-4 text-sm leading-6 sm:p-5">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
          /hoc youtu.be/… khoá Marketing, bài 3
        </p>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-secondary px-4 py-3 text-foreground">
          <p className="font-bold">Đã học xong bài 3 · 42 phút</p>
          <p className="mt-1 text-muted-foreground">
            Ghi chú: 5 bước viết hook, 3 mẫu kịch bản, prompt chép nguyên văn. Làm được ngay: viết
            lại mở đầu video theo công thức ở phút 12:30.
          </p>
        </div>
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
          bài nào nói về công thức hook?
        </p>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-secondary px-4 py-3 text-foreground">
          <p>
            Bài 3, <strong>phút 12:30</strong>: hook 3 giây gồm câu hỏi gây tò mò + con số + lời hứa
            kết quả. Mở đúng phút:{" "}
            <span className="text-primary underline">youtu.be/…&amp;t=750</span>
          </p>
        </div>
      </div>
      <figcaption className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        Hình minh hoạ cách trò chuyện với trợ lý
      </figcaption>
    </figure>
  );
}

function StudyAssistantPage() {
  const [resource, setResource] = useState<FreeResource | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const canDownload = Boolean(resource);

  function DownloadButton({ className = "" }: { className?: string }) {
    return (
      <button
        type="button"
        disabled={!canDownload}
        onClick={() => setIsDialogOpen(true)}
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-bold text-primary-foreground shadow-brand transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <Download className="size-4" />
        {isLoading ? "Đang tải..." : canDownload ? "Tải miễn phí" : "Sắp mở tải"}
      </button>
    );
  }

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
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-10 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.14em] text-primary">
            <Gift className="size-3.5" /> Quà tặng miễn phí
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.1] sm:text-5xl">
            Trợ lý học tập AI: <span className="text-primary">học thay bạn</span>, nhớ hộ bạn
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
            Khoá học mua rồi để đó, video dài 2 tiếng không có thời gian xem, xem xong lại quên? Gửi
            bài cho trợ lý. Trợ lý xem hết, ghi chú đủ để bạn làm lại được, và trả lời bạn kèm đúng
            bài, đúng phút.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <DownloadButton />
            <a
              href="#cach-hoat-dong"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-white px-6 text-sm font-bold transition hover:border-primary hover:text-primary"
            >
              Xem cách hoạt động
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "Chạy trên máy của bạn",
              "Windows & Mac",
              "Không cần biết lập trình",
              "Tìm không dấu vẫn ra",
            ].map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold"
              >
                <Check className="size-3.5 text-primary" /> {item}
              </span>
            ))}
          </div>
        </div>
        <ChatPreview />
      </section>

      {/* Tính năng */}
      <Section
        eyebrow="Trợ lý làm được gì"
        title="Một người học hộ chăm chỉ, nhớ lâu, trả lời có nguồn"
      >
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

      {/* Cách hoạt động */}
      <Section
        id="cach-hoat-dong"
        eyebrow="Cách hoạt động"
        title="Gửi bài, rồi quên nó đi. Cần thì hỏi lại."
      >
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-primary/15 bg-white p-6 shadow-card"
            >
              <span className="grid size-9 place-items-center rounded-full bg-brand-gradient text-sm font-extrabold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-extrabold">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Phù hợp + Gói có gì */}
      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">
            Phù hợp với ai
          </p>
          <h2 className="mt-3 text-2xl font-black">Dành cho người bận nhưng vẫn muốn học</h2>
          <ul className="mt-6 space-y-3">
            {audiences.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7">
                <Check className="mt-1 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">
            Bạn nhận được gì
          </p>
          <h2 className="mt-3 flex items-center gap-2 text-2xl font-black">
            <FolderArchive className="size-6 text-primary" /> Một gói tải về, cài là dùng
          </h2>
          <ul className="mt-6 space-y-3">
            {packageItems.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7">
                <Check className="mt-1 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-2xl bg-secondary p-4 text-xs leading-6 text-muted-foreground">
            Gói chỉ có khung và cơ chế, kho trống. Trợ lý hỏi tên, công việc, khoá đang học ở lần mở
            đầu tiên rồi tự làm quen với bạn.
          </p>
        </div>
      </section>

      {/* Cần chuẩn bị */}
      <Section eyebrow="Cần chuẩn bị" title="Bạn cần có gì để chạy trợ lý">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {requirements.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <Icon className="size-6 text-primary" />
              <h3 className="mt-3 font-extrabold leading-snug">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 grid gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-5 text-sm leading-7 sm:grid-cols-3 sm:p-6">
          <p>
            <strong className="text-foreground">1. Giải nén</strong> gói tải về vào một thư mục cố
            định, tên không dấu.
          </p>
          <p>
            <strong className="text-foreground">2. Chạy file cài</strong>: Windows bấm đúp{" "}
            <code>CAI_DAT.bat</code>, Mac chạy <code>bash cai_dat.sh</code>.
          </p>
          <p>
            <strong className="text-foreground">3. Mở Claude Code</strong> trong thư mục đó, gõ
            “Chào trợ lý”.
          </p>
        </div>
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
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <div className="rounded-3xl bg-foreground p-7 text-background sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-background/70">
                <ShieldCheck className="size-4" /> Miễn phí · Ghi chú và kho học nằm trên máy bạn
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight">
                Nhận Trợ lý học tập ngay hôm nay
              </h2>
              <p className="mt-3 text-sm leading-7 text-background/75">
                Nhập email, link tải gửi về hộp thư của bạn trong vài phút. Cài xong, gửi bài học
                đầu tiên để thử.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <DownloadButton />
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

      {isDialogOpen && resource && (
        <FreeResourceDownloadDialog resource={resource} onClose={() => setIsDialogOpen(false)} />
      )}
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Gift,
  HardDrive,
  Laptop,
  Lightbulb,
  MessageCircle,
  Mic,
  Monitor,
  PackageOpen,
  ShieldCheck,
  Timer,
  Usb,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import sanCongCuLogo from "@/assets/sancongcu-logo-transparent.png";
import { FreeResourceDownloadDialog } from "@/components/FreeResourceDownloadDialog";
import { freeResourceDetailPages, type FreeResource } from "@/lib/site-content";
import { supabase } from "@/lib/supabase";

const PAGE_PATH = "/tai-nguyen/ghi-am-thanh-chu";
const PAGE_TITLE =
  "Ghi Âm Thành Chữ — phần mềm miễn phí chuyển ghi âm cuộc họp thành văn bản tiếng Việt | sancongcu.com";
const PAGE_DESCRIPTION =
  "Tải miễn phí phần mềm Ghi Âm Thành Chữ cho máy tính Windows: ghi âm cuộc họp rồi chuyển thành văn bản tiếng Việt ngay trên máy của bạn, không cần mạng, file ghi âm không gửi đi đâu.";
/** Tài nguyên trong bảng free_resources được nhận diện theo tên file tải lên trong admin. */
const FILE_PREFIX = freeResourceDetailPages.find((page) => page.href === PAGE_PATH)!.fileNamePrefix;

export const Route = createFileRoute("/tai-nguyen/ghi-am-thanh-chu")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      {
        property: "og:title",
        content: "Ghi Âm Thành Chữ — biến cuộc họp thành văn bản | sancongcu.com",
      },
      { property: "og:description", content: PAGE_DESCRIPTION },
    ],
  }),
  component: GhiAmThanhChuPage,
});

const features = [
  {
    icon: Mic,
    title: "Ghi âm thẳng trong ứng dụng",
    text: "Bạn không cần thêm phần mềm ghi âm nào khác. Mở ứng dụng lên là chọn được micro muốn dùng, bấm một nút để bắt đầu, có đồng hồ đếm giờ và nút tạm dừng khi cuộc họp giải lao.",
  },
  {
    icon: ShieldCheck,
    title: "Máy tắt đột ngột vẫn còn bản ghi",
    text: "Trong lúc ghi, tiếng được lưu dần xuống ổ đĩa vài giây một lần. Nếu máy mất điện hoặc bạn lỡ đóng cửa sổ giữa buổi họp, lần sau mở lại ứng dụng bạn vẫn nghe lại và chuyển thành chữ được phần đã ghi.",
  },
  {
    icon: Clock,
    title: "Chịu được cuộc họp dài 2 đến 3 tiếng",
    text: "Ứng dụng xử lý file dài mà không bị đứng giữa chừng. Bạn có thể dừng lại nghỉ rồi mở ra làm tiếp, phần đã chuyển xong vẫn được giữ nguyên.",
  },
  {
    icon: FileText,
    title: "Sửa văn bản và lưu thành file Word",
    text: "Chữ hiện ra ngay trong ứng dụng để bạn đọc lại và sửa những chỗ nghe chưa đúng, sau đó lưu thành file Word hoặc file văn bản thường. Có sẵn khung biên bản cuộc họp để bạn điền nhanh.",
  },
  {
    icon: WifiOff,
    title: "Chạy ngay trên máy, không cần mạng",
    text: "Sau khi cài xong, ứng dụng làm việc hoàn toàn trên máy tính của bạn. File ghi âm không được gửi lên mạng và cũng không gửi cho chúng tôi, nên nội dung cuộc họp chỉ mình bạn giữ.",
  },
  {
    icon: Timer,
    title: "Nhanh hơn ngồi gõ lại rất nhiều",
    text: "Một cuộc họp dài 1 tiếng thường mất khoảng 5 đến 8 phút để máy chuyển thành chữ, tuỳ tốc độ máy của bạn. Trong lúc đó bạn cứ làm việc khác, ứng dụng sẽ báo khi xong.",
  },
];

const steps = [
  {
    title: "Tải về và mở ứng dụng",
    text: (
      <>
        Bạn nhập tên và email để nhận đường dẫn tải, sau đó mở ứng dụng lên. Ứng dụng sẽ tự hiện ra
        trong trình duyệt quen thuộc của bạn, giao diện hoàn toàn bằng tiếng Việt.
      </>
    ),
  },
  {
    title: "Đưa tiếng vào ứng dụng",
    text: (
      <>
        Nếu đã có sẵn file ghi âm, bạn kéo file thả vào ô là xong. Nếu chưa có, bạn bấm{" "}
        <strong>Ghi âm ngay trong ứng dụng</strong>, chọn micro rồi bấm bắt đầu để ứng dụng ghi lại
        buổi họp giúp bạn.
      </>
    ),
  },
  {
    title: "Nhận văn bản, sửa lại rồi lưu",
    text: (
      <>
        Máy chạy xong sẽ hiện toàn bộ văn bản. Bạn đọc lại, sửa những chỗ nghe chưa đúng ngay trong
        ô chữ, rồi lưu thành file Word để gửi cho đồng nghiệp hoặc lưu vào hồ sơ cuộc họp.
      </>
    ),
  },
];

const requirements = [
  { icon: Monitor, label: "Windows 10 hoặc Windows 11, bản 64-bit" },
  { icon: Laptop, label: "Máy tính thông thường, không cần card đồ hoạ rời" },
  { icon: HardDrive, label: "4 GB RAM trở lên và khoảng 600 MB chỗ trống trong ổ đĩa" },
  { icon: Timer, label: "Cuộc họp 1 tiếng mất khoảng 5 đến 8 phút để chuyển thành chữ" },
];

const honestNotes = [
  {
    title: "Đặt micro gần người nói thì chữ chính xác hơn nhiều",
    text: "Nếu để máy ở cuối phòng họp, tiếng nhỏ và lẫn tạp âm nên văn bản sẽ sai nhiều chỗ. Bạn chỉ cần để máy tính hoặc micro gần người đang nói là chất lượng tốt hơn hẳn.",
  },
  {
    title: "Từ tiếng Anh và tên riêng có thể bị nghe sai",
    text: "Ứng dụng nghe tiếng Việt là chính, nên tên người, tên công ty hay thuật ngữ tiếng Anh đôi khi ra sai chính tả. Bạn sửa lại trực tiếp trong ô văn bản trước khi lưu là được.",
  },
];

const downloadOptions = [
  {
    icon: PackageOpen,
    name: "Bản cài đặt",
    file: "Cai-Dat-Ghi-Am-Thanh-Chu.exe",
    text: "Dành cho máy tính riêng của bạn và dùng lâu dài. Bạn mở file này, bấm theo hướng dẫn là cài xong, sau đó có sẵn biểu tượng ngoài màn hình để mở nhanh mỗi lần họp.",
    recommended: true,
  },
  {
    icon: Usb,
    name: "Bản chạy ngay",
    file: "GhiAmThanhChu-ban-chay-ngay.zip",
    text: "Dành cho máy công ty không cho cài phần mềm, hoặc khi bạn muốn chép qua USB sang máy khác. Bạn giải nén thư mục ra rồi mở thẳng ứng dụng, không phải cài gì cả.",
    recommended: false,
  },
];

const faqs = [
  {
    q: "Phần mềm này có mất phí không?",
    a: "Hoàn toàn miễn phí. Bạn chỉ cần để lại tên và email, đường dẫn tải sẽ được gửi vào hộp thư của bạn. Bạn không phải trả phí hằng tháng và cũng không bị giới hạn số cuộc họp.",
  },
  {
    q: "Nội dung cuộc họp của tôi có bị gửi đi đâu không?",
    a: "Không. Sau khi cài xong, toàn bộ việc nghe và chuyển thành chữ diễn ra ngay trên máy tính của bạn, ứng dụng không cần mạng để làm việc này. File ghi âm và văn bản nằm trong máy bạn, chúng tôi không nhận được gì cả.",
  },
  {
    q: "Tôi nên chọn bản cài đặt hay bản chạy ngay?",
    a: "Nếu đây là máy tính riêng của bạn, hãy chọn bản cài đặt cho tiện dùng lâu dài. Nếu là máy công ty không cho phép cài phần mềm, hoặc bạn muốn chép sang máy khác qua USB, hãy chọn bản chạy ngay rồi giải nén ra là dùng được.",
  },
  {
    q: "Máy tôi dùng macOS có chạy được không?",
    a: "Bản hiện tại chỉ chạy trên máy tính Windows 10 và Windows 11, bản 64-bit. Nếu bạn dùng máy Mac, bạn cứ để lại email, khi nào có bản cho máy Mac chúng tôi sẽ báo bạn.",
  },
  {
    q: "File ghi âm dạng nào thì dùng được?",
    a: "Những dạng phổ biến đều được, ví dụ mp3, m4a, wav, hoặc cả file video mp4 quay lại buổi họp trực tuyến. Bạn kéo file thả vào ứng dụng là ứng dụng tự nhận.",
  },
  {
    q: "Đang chuyển dở mà tôi phải tắt máy thì sao?",
    a: "Phần đã làm xong vẫn được giữ lại trong máy. Lần sau mở ứng dụng lên, bạn sẽ thấy bản ghi cũ và có thể nghe lại, làm tiếp hoặc xoá đi cho gọn ổ đĩa.",
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
      data-testid="mo-form-nhan-link"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient font-bold text-primary-foreground shadow-brand transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
        variant === "large" ? "min-h-14 px-8 text-base" : "min-h-12 px-6 text-sm"
      }`}
    >
      <Download className="size-4" />
      {isLoading ? "Đang kiểm tra..." : canDownload ? "Nhận link tải qua email" : "Sắp mở tải"}
    </button>
  );
}

function GhiAmThanhChuPage() {
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
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-6 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.14em] text-primary">
            <Gift className="size-3.5" /> Phần mềm miễn phí
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.1] sm:text-5xl">
            Cuộc họp vừa xong đã có <span className="text-primary">biên bản bằng chữ</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
            Ghi Âm Thành Chữ là phần mềm cho máy tính Windows, giúp bạn biến file ghi âm cuộc họp
            thành văn bản tiếng Việt. Bạn không phải ngồi nghe lại và gõ tay từng câu nữa. Mọi việc
            chạy ngay trên máy của bạn, không cần mạng và file ghi âm không được gửi đi đâu.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <DownloadButton {...downloadProps} variant="large" />
            <a
              href="#cach-dung"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-border bg-white px-6 text-sm font-bold transition hover:border-primary hover:text-primary"
            >
              Xem cách dùng
            </a>
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            Bạn để lại tên và email, đường dẫn tải sẽ được gửi vào hộp thư của bạn trong vài phút.
          </p>
        </div>
        <figure className="overflow-hidden rounded-3xl border border-border bg-white shadow-card">
          <img
            src="/ghi-am-thanh-chu/man-hinh-ra-chu.png"
            alt="Màn hình ứng dụng Ghi Âm Thành Chữ sau khi chuyển xong, hiện văn bản tiếng Việt để đọc lại và sửa"
            width={1366}
            height={900}
            className="h-auto w-full"
          />
          <figcaption className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            Màn hình ứng dụng sau khi chuyển xong một bản ghi
          </figcaption>
        </figure>
      </section>

      {/* Tính năng */}
      <Section eyebrow="Ứng dụng làm được gì" title="Ghi âm, chuyển thành chữ và lưu lại biên bản">
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

      {/* Cách dùng */}
      <Section id="cach-dung" eyebrow="Cách dùng" title="Chỉ 3 bước, ai cũng làm được">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <ol className="grid gap-4">
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
          <figure className="overflow-hidden rounded-3xl border border-border bg-white shadow-card">
            <img
              src="/ghi-am-thanh-chu/man-hinh-dang-ghi.png"
              alt="Màn hình ứng dụng Ghi Âm Thành Chữ lúc đang ghi âm, có đồng hồ đếm giờ và nút tạm dừng"
              width={1366}
              height={900}
              loading="lazy"
              className="h-auto w-full"
            />
            <figcaption className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              Lúc đang ghi âm: có đồng hồ, thanh báo tiếng vào micro và nút tạm dừng
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* Máy cần gì */}
      <Section eyebrow="Máy của bạn cần gì" title="Máy tính văn phòng bình thường là chạy được">
        <ul className="grid gap-3 sm:grid-cols-2">
          {requirements.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-start gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-card"
            >
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="text-sm font-semibold leading-7 text-foreground">{label}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Nói thật */}
      <Section eyebrow="Nói thật với bạn" title="Hai điều bạn nên biết trước khi dùng">
        <div className="grid gap-4 lg:grid-cols-2">
          {honestNotes.map((note) => (
            <article
              key={note.title}
              className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-card"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <Lightbulb className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold leading-snug">{note.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{note.text}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Hai bản tải */}
      <Section eyebrow="Hai bản để bạn chọn" title="Bạn nên tải bản nào?">
        <div className="grid gap-4 lg:grid-cols-2">
          {downloadOptions.map(({ icon: Icon, name, file, text, recommended }) => (
            <article
              key={name}
              className={`rounded-2xl border bg-white p-6 shadow-card ${
                recommended ? "border-primary/40" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-extrabold leading-snug">{name}</h3>
                {recommended && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-primary">
                    Nên chọn
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
              <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">
                Tên file: {file}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground">
          Trong email gửi cho bạn có một đường dẫn tới trang tải. Ở trang đó bạn sẽ thấy cả hai bản
          và chỉ cần bấm vào tên file của bản mình chọn là máy bắt đầu tải về. Mỗi bản nặng khoảng
          100 MB, bạn nên tải khi đang dùng wifi.
        </p>
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
                <Gift className="size-4" /> Miễn phí · Dành cho máy tính Windows
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight">Nhận Ghi Âm Thành Chữ</h2>
              <p className="mt-3 text-sm leading-7 text-background/75">
                Bạn nhập tên và email, đường dẫn tải sẽ được gửi về hộp thư của bạn trong vài phút.
                Cuộc họp sắp tới bạn chỉ việc bật ứng dụng lên ghi âm, phần đánh máy đã có ứng dụng
                lo.
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
          Ứng dụng có dùng một số phần mềm nguồn mở. Toàn văn giấy phép nằm trong thư mục GIAY-PHEP
          đi kèm bản tải về.
        </p>
      </footer>

      {isDialogOpen && resource && (
        <FreeResourceDownloadDialog resource={resource} onClose={() => setIsDialogOpen(false)} />
      )}
    </main>
  );
}

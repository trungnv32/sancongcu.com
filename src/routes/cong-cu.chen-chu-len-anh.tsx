import { createFileRoute } from "@tanstack/react-router";
import { CircleUserRound, ImagePlus, LayoutTemplate, ShieldCheck, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import sanCongCuLogo from "@/assets/sancongcu-logo-transparent.png";
import { supabase } from "@/lib/supabase";
import { toolPageCspHeader } from "@/lib/tool-page-security";

const PAGE_PATH = "/cong-cu/chen-chu-len-anh";

/** Ứng dụng vẽ ảnh chạy trong khung riêng (trang tĩnh trong public/, có chính sách bảo mật CSP riêng). */
const APP_SRC = "/cong-cu-app/chen-chu-len-anh/app.html";
/** Phông Be Vietnam Pro tự phục vụ (bản cắt gọn đủ tiếng Việt, giấy phép OFL đi kèm trong thư mục ứng dụng). */
const SELF_HOSTED_FONT_CSS = [400, 500, 800]
  .map(
    (weight) =>
      `@font-face{font-family:"Be Vietnam Pro";font-style:normal;font-weight:${weight === 800 ? "600 900" : weight};font-display:swap;src:url("/cong-cu-app/chen-chu-len-anh/fonts/bvp-${weight}.woff2") format("woff2")}`,
  )
  .join("");
const PAGE_TITLE =
  "Chèn chữ lên ảnh online miễn phí — thêm tiêu đề, nhãn thương hiệu | sancongcu.com";
const PAGE_DESCRIPTION =
  "Công cụ chèn chữ lên ảnh miễn phí bằng tiếng Việt: thêm tiêu đề, cụm chữ nổi bật, nhãn thương hiệu, chọn từ 21 mẫu đẹp rồi lưu ảnh về máy. Ảnh được xử lý ngay trên máy của bạn, không cần cài đặt.";

export const Route = createFileRoute("/cong-cu/chen-chu-len-anh")({
  headers: () => ({
    // Chính sách bảo mật gửi kèm trang khi máy chủ trả trang này (tải trực tiếp).
    "Content-Security-Policy": toolPageCspHeader,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
  }),
  head: () => ({
    styles: [{ children: SELF_HOSTED_FONT_CSS }],
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: "Chèn chữ lên ảnh online miễn phí | sancongcu.com" },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:url", content: `https://sancongcu.com${PAGE_PATH}` },
    ],
    links: [{ rel: "canonical", href: `https://sancongcu.com${PAGE_PATH}` }],
  }),
  component: ChenChuLenAnhPage,
});

const steps = [
  {
    icon: ImagePlus,
    title: "Chọn ảnh của bạn",
    text: "Bạn bấm “Chọn ảnh từ máy”, kéo ảnh thả vào khung, hoặc dán ảnh vừa sao chép. Ảnh JPG, PNG hay WEBP đều dùng được.",
  },
  {
    icon: LayoutTemplate,
    title: "Chọn mẫu và nhập chữ",
    text: "Bạn chọn một mẫu chữ có sẵn rồi gõ tiêu đề của mình. Muốn tô màu một cụm chữ, bạn đặt cụm đó giữa hai cặp dấu sao. Phông chữ, màu và vị trí đều đổi được.",
  },
  {
    icon: Download,
    title: "Lưu ảnh về máy",
    text: "Bạn bấm “Lưu ảnh” là có ngay ảnh đẹp để đăng Facebook, Instagram, TikTok hay làm ảnh bìa YouTube.",
  },
];

const faqs = [
  {
    q: "Công cụ này có mất phí không?",
    a: "Không. Bạn dùng miễn phí 5 mẫu mà không cần tài khoản. Khi đăng ký tài khoản miễn phí trên sancongcu.com, bạn mở được thêm 16 mẫu đẹp khác.",
  },
  {
    q: "Ảnh của tôi có bị gửi lên mạng không?",
    a: "Không. Ảnh được xử lý ngay trong trình duyệt trên máy của bạn và không được gửi về máy chủ của sancongcu.com. Ảnh chỉ rời máy khi bạn tự bấm nút “Tạo bằng AI”, lúc đó một bản thu nhỏ được gửi thẳng tới hãng AI mà bạn đã chọn.",
  },
  {
    q: "Nút “Tạo bằng AI” dùng thế nào?",
    a: "Đây là phần không bắt buộc. Nếu bạn có khoá sử dụng của một hãng AI, ứng dụng sẽ xem ảnh và gợi ý 5 tiêu đề tiếng Việt cùng chỗ đặt chữ hợp lý. Khoá chỉ nằm tạm trong trang và tự mất khi bạn đóng trang, trừ khi bạn tự chọn nhớ khoá trên máy riêng của mình.",
  },
  {
    q: "Dùng trên điện thoại được không?",
    a: "Được. Bạn mở trang này bằng trình duyệt trên điện thoại, chọn ảnh trong máy, gõ chữ rồi lưu ảnh như bình thường.",
  },
];

function ChenChuLenAnhPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const loggedInRef = useRef(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Chỉ báo cho khung ứng dụng biết "đã đăng nhập hay chưa" (true/false), không gửi thông tin tài khoản.
    const sendState = () => {
      frameRef.current?.contentWindow?.postMessage(
        { loai: "scc-dang-nhap", daDangNhap: loggedInRef.current },
        window.location.origin,
      );
    };
    const update = (value: boolean) => {
      loggedInRef.current = value;
      setLoggedIn(value);
      sendState();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if ((event.data as { loai?: string } | null)?.loai === "scc-hoi-dang-nhap") sendState();
    };
    window.addEventListener("message", onMessage);
    if (!supabase) {
      update(false);
      return () => window.removeEventListener("message", onMessage);
    }
    void supabase.auth.getSession().then(({ data }) => update(Boolean(data.session)));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) =>
      update(Boolean(session)),
    );
    return () => {
      window.removeEventListener("message", onMessage);
      subscription.subscription.unsubscribe();
    };
  }, []);

  const accountHref = loggedIn
    ? "/tai-khoan"
    : `/tai-khoan?mode=login&quay-lai=${encodeURIComponent(PAGE_PATH)}`;

  return (
    <main className="min-h-dvh bg-soft-gradient text-foreground">
      {/* Liên kết rời trang dùng thẻ <a> thường để tải lại trang đầy đủ (không mang theo chính sách bảo mật của trang công cụ). */}
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="/"
              className="block w-28 shrink-0 sm:w-36"
              aria-label="Về trang chủ sancongcu.com"
            >
              <img src={sanCongCuLogo} alt="sancongcu.com" className="h-auto w-full" />
            </a>
            <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
            <h1 className="hidden truncate text-base font-bold sm:block">Chèn chữ lên ảnh</h1>
          </div>
          <a
            href={accountHref}
            className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-border px-3 text-sm font-bold transition hover:border-primary hover:text-primary"
          >
            <CircleUserRound className="size-4" />
            {loggedIn ? "Tài khoản" : "Đăng nhập"}
          </a>
        </div>
      </header>

      <iframe
        ref={frameRef}
        src={APP_SRC}
        title="Công cụ chèn chữ lên ảnh"
        className="block w-full border-0 bg-[#F5F8FF]"
        style={{ height: "calc(100dvh - 3.5rem)" }}
        referrerPolicy="no-referrer"
      />

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        <h2 className="text-2xl font-bold sm:hidden">Chèn chữ lên ảnh</h2>
        <p className="mt-3 max-w-3xl leading-8 text-muted-foreground sm:mt-0">
          Công cụ giúp bạn thêm tiêu đề, cụm chữ nổi bật và nhãn thương hiệu lên ảnh chỉ trong vài
          phút, không cần biết thiết kế và không phải cài thêm phần mềm. Mọi chữ trên giao diện đều
          bằng tiếng Việt, phông chữ hiển thị đủ dấu.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex gap-3 rounded-2xl border border-primary/15 bg-card p-5 shadow-card">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary" />
          <p className="text-sm leading-7 text-muted-foreground">
            <strong className="text-foreground">Ảnh của bạn ở lại trên máy của bạn.</strong> Trang
            công cụ không gắn mã quảng cáo hay mã theo dõi của bên thứ ba. Ảnh và khoá AI (nếu có)
            không được gửi về máy chủ của sancongcu.com.
          </p>
        </div>

        <h2 className="mt-12 text-2xl font-bold">Câu hỏi thường gặp</h2>
        <div className="mt-5 grid gap-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <summary className="cursor-pointer font-bold">{item.q}</summary>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          <a href="/tai-nguyen-mien-phi" className="font-bold text-primary hover:underline">
            Xem thêm tài nguyên miễn phí
          </a>{" "}
          ·{" "}
          <a href="/" className="font-bold text-primary hover:underline">
            Về trang chủ sancongcu.com
          </a>
        </p>
      </section>
    </main>
  );
}

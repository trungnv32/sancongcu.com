import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, CreditCard, MousePointer2, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/huong-dan-mua-hang")({
  component: PurchaseGuideDraft,
});

function BrowserIllustration({
  label,
  title,
  action,
  detail,
  highlight = "button",
}: {
  label: string;
  title: string;
  action: string;
  detail: string;
  highlight?: "button" | "cart" | "price";
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-green-300" />
        <span className="ml-3 flex-1 rounded-full bg-white px-3 py-1 text-[10px] text-muted-foreground">
          sancongcu.com
        </span>
      </div>
      <div className="grid min-h-44 grid-cols-[1fr_0.85fr] gap-3 p-4 sm:p-5">
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{label}</span>
          <p className="mt-2 text-sm font-extrabold leading-snug text-foreground">{title}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
        <div className="flex flex-col justify-center gap-2 rounded-xl bg-slate-50 p-3">
          <div className="h-2 w-4/5 rounded bg-slate-200" />
          <div className="h-2 w-3/5 rounded bg-slate-200" />
          <div className="mt-1 rounded-lg border border-slate-200 bg-white p-2">
            <div className="mb-2 h-2 w-4/5 rounded bg-slate-200" />
            <div className="mb-2 h-2 w-3/5 rounded bg-slate-100" />
            <div
              className={`mt-2 flex min-h-8 items-center justify-center gap-1 rounded-full px-2 text-center text-[10px] font-bold ${
                highlight === "button"
                  ? "bg-blue-600 text-white ring-4 ring-blue-200"
                  : "bg-slate-900 text-white"
              }`}
            >
              {highlight === "cart" && <ShoppingCart className="size-3" />}
              {highlight === "price" && <CreditCard className="size-3" />}
              {action}
            </div>
          </div>
          {highlight === "button" && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700">
              <MousePointer2 className="size-3" /> Bấm vào nút được khoanh
            </span>
          )}
        </div>
      </div>
      <figcaption className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        Hình minh họa thao tác · Giao diện có thể thay đổi nhẹ theo thiết bị
      </figcaption>
    </figure>
  );
}

function GuideStep({
  number,
  title,
  children,
  visual,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  visual: React.ReactNode;
}) {
  return (
    <article className="grid gap-5 rounded-3xl border border-border bg-white p-5 shadow-card sm:grid-cols-[1fr_1fr] sm:items-center sm:p-7">
      <div>
        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
          {number}
        </span>
        <h3 className="mt-3 text-xl font-extrabold leading-snug">{title}</h3>
        <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">{children}</div>
      </div>
      {visual}
    </article>
  );
}

function PurchaseGuideDraft() {
  return (
    <main className="min-h-dvh bg-soft-gradient text-foreground">
      <header className="border-b border-border bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="size-4" /> Về trang chủ
          </Link>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            HƯỚNG DẪN TỪNG BƯỚC
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 pb-10 pt-12 text-center sm:pt-16">
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-primary">Hướng dẫn từng bước</p>
        <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Cách mua Skill trên sancongcu.com</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
          Bạn không cần rành công nghệ. Chỉ cần chọn đúng cách mua, bấm theo hướng dẫn và làm theo thông tin hiện trên màn hình.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {["Skill lẻ", "Combo 01 · 02 · 03", "Combo 5 hoặc 10 kèm hướng dẫn", "Số lượng tùy ý"].map((item) => (
            <span key={item} className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold">{item}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-5 px-5 pb-12">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 text-sm leading-7">
          <strong className="text-foreground">Trước khi bắt đầu:</strong> Mở trang chủ và tìm đúng Skill hoặc combo bạn cần. Nút màu xanh thường là bước mua ngay; giỏ hàng dùng khi bạn muốn chọn nhiều Skill rồi thanh toán cùng lúc.
        </div>

        <div className="pt-5">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">Cách 1</p>
          <h2 className="mt-2 text-3xl font-black">Mua một Skill riêng lẻ</h2>
        </div>
        <GuideStep number="1" title="Tìm Skill muốn mua" visual={<BrowserIllustration label="Danh mục Skill" title="Chọn công cụ phù hợp" detail="Kéo xuống danh mục, xem tên và mô tả của Skill." action="Mua ngay · 1.99$" />}>
          <p>Ở trang chủ, kéo xuống danh mục Skill. Mỗi thẻ có tên, hình và mô tả ngắn. Chọn Skill phù hợp với công việc bạn muốn làm.</p>
        </GuideStep>
        <GuideStep number="2" title="Bấm “Mua ngay”" visual={<BrowserIllustration label="Thẻ Skill" title="Skill bạn đã chọn" detail="Nút mua nằm ở phần dưới thẻ Skill." action="Mua ngay · 1.99$" highlight="button" />}>
          <p>Bấm nút <strong className="text-foreground">Mua ngay</strong> trên thẻ Skill. Màn hình thanh toán sẽ hiện ra cùng mã QR và số tiền cần chuyển.</p>
        </GuideStep>

        <div className="pt-8">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">Cách 2</p>
          <h2 className="mt-2 text-3xl font-black">Mua combo chọn sẵn 01, 02 hoặc 03</h2>
        </div>
        <p className="rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm leading-7 text-muted-foreground">
          Đây là các combo chọn sẵn cho những mục đích cụ thể. Bạn có thể thêm nguyên combo vào giỏ, hoặc kết hợp với các Skill lẻ khác. Giá sẽ được tính theo tổng số Skill trong giỏ, giống như khi bạn thêm từng Skill lẻ.
        </p>
        <GuideStep number="1" title="Xem ba combo trên trang chủ" visual={<BrowserIllustration label="Các combo gợi ý" title="Combo 01 · Combo 02 · Combo 03" detail="Mỗi combo có danh sách Skill phù hợp với một mục tiêu." action="Khám phá combo →" />}>
          <p>Kéo đến phần các combo gợi ý. Bấm <strong className="text-foreground">Khám phá combo</strong> nếu muốn đọc nội dung và xem các Skill bên trong.</p>
        </GuideStep>
        <GuideStep number="2" title="Bấm “Thêm vào giỏ”" visual={<BrowserIllustration label="Trang chi tiết combo" title="Bộ Skill đã chọn sẵn" detail="Nút này thêm các Skill của combo vào giỏ hàng." action="Thêm vào giỏ" highlight="cart" />}>
          <p>Bấm <strong className="text-foreground">Thêm vào giỏ</strong>. Các Skill thuộc combo sẽ được thêm vào giỏ; Skill đã có trong giỏ sẽ không bị thêm lặp.</p>
          <p>Giỏ hàng mở ra để bạn kiểm tra danh sách và tổng tiền. Bạn có thể tiếp tục thêm Skill lẻ hoặc combo khác; ưu đãi được tính theo tổng số Skill trong giỏ.</p>
        </GuideStep>

        <div className="pt-8">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">Cách 3</p>
          <h2 className="mt-2 text-3xl font-black">Mua combo 5 hoặc 10 kèm buổi đào tạo</h2>
        </div>
        <div className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm leading-7 text-muted-foreground">
          <p>Các Skill lẻ và combo chọn sẵn ở trên đã có hướng dẫn sử dụng (HDSD) và các buổi Zoom cộng đồng để giúp bạn sử dụng thành thạo sản phẩm. Bạn cũng được tham gia cộng đồng để chia sẻ và hỏi đáp.</p>
          <p>Nếu muốn được đào tạo chuyên sâu hơn, bạn có thể chọn các combo dưới đây. Ngoài hướng dẫn sử dụng Skill, các buổi đào tạo còn có module kiến thức đi từ cơ bản, giải thích gốc rễ cho người mới: hiểu bản chất AI, cách AI hoạt động và cách sử dụng hiệu quả. Bạn cũng sẽ học cách tự tạo sản phẩm hoặc công cụ phục vụ công việc của mình.</p>
        </div>
        <GuideStep number="1" title="Tìm mục “Combo ưu đãi”" visual={<BrowserIllustration label="Combo ưu đãi" title="Các gói có buổi đào tạo" detail="Kéo xuống phần Combo ưu đãi trên trang chủ." action="Combo 5 Skill + đào tạo" />}>
          <p>Trên trang chủ, mở mục <strong className="text-foreground">Combo ưu đãi</strong>. Ở đây có các gói combo 5 hoặc 10 Skill kèm các buổi đào tạo.</p>
        </GuideStep>
        <GuideStep number="2" title="Chọn đúng gói và xem quyền lợi" visual={<BrowserIllustration label="Thông tin gói" title="Giá · số Skill · số buổi hướng dẫn" detail="Đọc kỹ mô tả gói và quà tặng (nếu có)." action="Chọn combo này" highlight="price" />}>
          <p>Đọc tên gói, số Skill, số buổi đào tạo và giá đang hiển thị. Chỉ chọn gói phù hợp với nhu cầu của bạn.</p>
          <p>Bấm <strong className="text-foreground">Chọn combo này</strong> để tạo đơn cho gói đó. Đây là gói riêng có đào tạo; không nhầm với combo 5 Skill tự chọn trong giỏ.</p>
        </GuideStep>

        <div className="pt-8">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">Cách 4</p>
          <h2 className="mt-2 text-3xl font-black">Tự chọn số lượng Skill bất kỳ</h2>
        </div>
        <GuideStep number="1" title="Thêm lần lượt các Skill vào giỏ" visual={<BrowserIllustration label="Thẻ Skill" title="Chọn bao nhiêu Skill tùy nhu cầu" detail="Bấm nút thêm vào giỏ trên từng Skill." action="Thêm vào giỏ" highlight="button" />}>
          <p>Với từng Skill bạn muốn mua, bấm <strong className="text-foreground">Thêm vào giỏ</strong>. Có thể chọn ít, nhiều hoặc kết hợp Skill từ các danh mục khác nhau.</p>
          <p>Muốn chọn nhiều Skill, quay lại danh mục và tiếp tục thêm. Nút nổi ở cuối màn hình cho biết số Skill và tổng tiền hiện tại.</p>
        </GuideStep>
        <GuideStep number="2" title="Mở giỏ, kiểm tra và thanh toán" visual={<BrowserIllustration label="Giỏ hàng" title="Danh sách Skill và tổng tiền" detail="Bỏ Skill không cần rồi bấm mua ngay." action="Mua ngay →" highlight="cart" />}>
          <p>Bấm vùng <strong className="text-foreground">Giỏ hàng</strong> để xem từng món. Bấm dấu xóa cạnh Skill nếu bạn đổi ý; nút <strong className="text-foreground">Xóa tất cả</strong> làm trống toàn bộ giỏ.</p>
          <p>Giá ưu đãi tự tính theo số lượng: đủ 5 Skill áp dụng combo 5; đủ 10 áp dụng combo 10; nếu nhiều hơn, hệ thống tính các nhóm combo và Skill lẻ còn lại. Kiểm tra tổng tiền rồi bấm <strong className="text-foreground">Mua ngay</strong>.</p>
        </GuideStep>

        <div className="pt-8">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">Thanh toán và nhận hàng</p>
          <h2 className="mt-2 text-3xl font-black">Làm theo thông tin trên mã QR</h2>
        </div>
        <GuideStep number="1" title="Quét mã QR hoặc chuyển khoản theo hướng dẫn" visual={<BrowserIllustration label="Màn hình thanh toán" title="Quét QR bằng ứng dụng ngân hàng" detail="Kiểm tra người nhận, số tiền và nội dung chuyển khoản." action="Mã QR · Số tiền · Nội dung" highlight="price" />}>
          <p>Dùng ứng dụng ngân hàng trên điện thoại để quét mã QR. Nếu không quét được, nhập thông tin chuyển khoản hiển thị trên màn hình.</p>
          <p>Trước khi xác nhận, kiểm tra đúng <strong className="text-foreground">số tiền</strong> và <strong className="text-foreground">nội dung chuyển khoản</strong> website cung cấp. Không tự sửa nội dung chuyển khoản.</p>
        </GuideStep>
        <GuideStep number="2" title="Gửi xác nhận để nhận Skill và hỗ trợ" visual={<BrowserIllustration label="Hoàn tất đơn" title="Gửi ảnh xác nhận thanh toán" detail="Liên hệ Zalo hỗ trợ theo thông tin website." action="Gửi bill qua Zalo" />}>
          <p>Sau khi chuyển khoản thành công, lưu lại ảnh xác nhận giao dịch và gửi cho đội ngũ hỗ trợ qua Zalo theo hướng dẫn trên website.</p>
          <p>Với combo có buổi đào tạo, trao đổi lịch học cùng đội ngũ hỗ trợ. Giữ lại mã đơn để tiện tra cứu nếu cần.</p>
        </GuideStep>

        <aside className="rounded-3xl bg-foreground p-6 text-background sm:p-8">
          <h2 className="text-2xl font-black">Nếu cần người hỗ trợ</h2>
          <p className="mt-3 text-sm leading-7 text-background/75">Bạn có thể nhắn Zalo hỗ trợ, gửi tên Skill hoặc combo muốn mua và ảnh màn hình bạn đang thấy. Đội ngũ sẽ hướng dẫn tiếp từng bước.</p>
          <a href="https://zalo.me/0938069668" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-gradient px-5 text-sm font-bold text-primary-foreground">
            <Check className="size-4" /> Nhắn Zalo hỗ trợ
          </a>
        </aside>
      </section>
      <footer className="border-t border-border bg-white px-5 py-6 text-center text-xs text-muted-foreground">
        Hướng dẫn mua hàng trên sancongcu.com
      </footer>
    </main>
  );
}

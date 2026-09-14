import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import kolGraduation from "@/assets/kol-graduation.asset.json";
import kolGymVideo from "@/assets/kol-gym-video.mp4.asset.json";
import tueLamStanding from "@/assets/tue-lam-03-standing.jpg";
import tueLamStraight from "@/assets/tue-lam-04-straigh.jpg";
import tueLamHall3 from "@/assets/tue-lam-hall-3-video-studio.png";
import tueLamHall4 from "@/assets/tue-lam-hall-4-enterprise-office.png";
import tueLamHall5 from "@/assets/tue-lam-hall-5-learning-studio.png";
import sanCongCuLogo from "@/assets/sancongcu-logo-transparent.png";
import techcombankPaymentQr from "@/assets/techcombank-payment-qr.jpg";
import { getProductContent } from "@/lib/product-content";
import {
  createFallbackTransferOrder,
  createSavedTransferOrder,
  type TransferOrder,
} from "@/lib/commerce";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "sancongcu.com — AI Skill cho người bán hàng" },
      {
        name: "description",
        content:
          "Công cụ AI viết sẵn theo từng ngành nghề, giúp người bán hàng áp dụng ngay mà không cần giỏi công nghệ.",
      },
      { property: "og:title", content: "sancongcu.com — AI Skill cho người bán hàng" },
      {
        property: "og:description",
        content: "Công cụ AI viết sẵn theo từng ngành nghề, dễ dùng và ứng dụng ngay.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: kolGraduation.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: kolGraduation.url },
    ],
  }),
  component: Landing,
});

type Product = {
  id: string;
  title: string;
  description?: string;
  tag: string;
  image?: string;
  video?: string;
  emoji?: string;
  visible?: boolean;
};

const skillPriceUsd = 1.99;
const paymentZaloUrl = "https://zalo.me/0938069668";
type ComboSize = 5 | 10;

function getSavedComboSize(): ComboSize | null {
  if (typeof window === "undefined") return null;
  const value = Number(window.localStorage.getItem("sancongcu-combo-size"));
  return value === 5 || value === 10 ? value : null;
}

type Category = {
  id: string;
  title: string;
  subtitle: string;
  poster: string;
  visible?: boolean;
  products: Product[];
};

const combos = [
  {
    name: "Combo Bắt đầu bán hàng với AI",
    description: "Đi từ định vị thương hiệu đến nội dung bán hàng rõ ràng, dễ triển khai.",
    includes: "Thương hiệu · Nội dung · Kịch bản chốt đơn",
    href: "#danh-muc-1",
  },
  {
    name: "Combo Nội dung ra đơn mỗi ngày",
    description: "Biến một ý tưởng thành bài viết, hình ảnh và video phục vụ quảng cáo.",
    includes: "Hình ảnh · Video · Quảng cáo",
    href: "#danh-muc-2",
  },
  {
    name: "Combo Tối ưu chuyển đổi",
    description: "Xây trang bán hàng, ưu đãi và hành trình theo dõi khách hàng nhất quán.",
    includes: "Landing page · Copywriting · Chăm sóc khách hàng",
    href: "#danh-muc-4",
  },
];

const categories: Category[] = [
  {
    id: "poster",
    title: "Danh mục I · Thương hiệu & Bán hàng",
    subtitle: "Skill AI giúp người bán hàng xây thương hiệu và nội dung chạm đúng khách hàng.",
    poster: tueLamStraight,
    products: [
      {
        id: "graduation",
        title: "Skill · Sân Khấu Vinh Danh",
        tag: "Signature",
        image: tueLamStraight,
      },
      { id: "launch", title: "Skill · Ra Mắt Thương Hiệu", tag: "Premium", image: tueLamStanding },
      { id: "honor", title: "Skill · Định Vị Chuyên Gia", tag: "Advanced", image: tueLamStraight },
      {
        id: "workshop",
        title: "Skill · Diễn Thuyết Workshop",
        tag: "Master",
        image: tueLamStanding,
      },
      {
        id: "story-brand",
        title: "Skill · Kể Chuyện Thương Hiệu",
        tag: "Story",
        image: tueLamStraight,
      },
      { id: "pr-media", title: "Skill · Xuất Hiện Truyền Thông", tag: "PR", image: tueLamStanding },
    ],
  },
  {
    id: "lifestyle",
    title: "Danh mục II · Hình ảnh & Nội dung",
    subtitle: "Skill AI giúp bạn tạo hình ảnh, nội dung và câu chuyện bán hàng nhanh hơn.",
    poster: tueLamStanding,
    products: [
      {
        id: "gym",
        title: "Skill · Selfie Chuyển Động",
        tag: "Video Pack",
        image: tueLamStanding,
        video: kolGymVideo.url,
      },
      { id: "outfit", title: "Skill · Phối Đồ Bán Hàng", tag: "Style", image: tueLamStraight },
      { id: "street", title: "Skill · Street Storytelling", tag: "Story", image: tueLamStanding },
      { id: "studio", title: "Skill · Chân Dung Cao Cấp", tag: "Luxury", image: tueLamStraight },
      { id: "travel", title: "Skill · Lifestyle Du Lịch", tag: "Journey", image: tueLamStanding },
      { id: "daily", title: "Skill · Nhật Ký Đời Thường", tag: "Daily", image: tueLamStraight },
    ],
  },
  {
    id: "video",
    title: "Danh mục III · Video & Quảng cáo",
    subtitle: "Skill AI hỗ trợ từ kịch bản, video ngắn đến nội dung quảng cáo dễ triển khai.",
    poster: tueLamHall3,
    products: [
      {
        id: "tvc-brand",
        title: "Skill · TVC Thương Hiệu",
        tag: "Cinematic",
        image: tueLamStanding,
      },
      { id: "script", title: "Skill · Kịch Bản 30 Giây", tag: "Script", image: tueLamStraight },
      { id: "reels", title: "Skill · Reels Chuyển Cảnh", tag: "Reels", image: tueLamStanding },
      { id: "unbox", title: "Skill · Video Review Sản Phẩm", tag: "Review", image: tueLamStraight },
      {
        id: "livestream",
        title: "Skill · Livestream Bán Hàng",
        tag: "Live",
        image: tueLamStanding,
      },
      { id: "voice", title: "Skill · Giọng Đọc & Lồng Tiếng", tag: "Audio", image: tueLamStraight },
    ],
  },
  {
    id: "landing",
    title: "Danh mục IV · Trang bán hàng & Chuyển đổi",
    subtitle: "Skill AI cho landing page, copywriting và các điểm chạm giúp khách ra quyết định.",
    poster: tueLamHall4,
    products: [
      { id: "hero", title: "Skill · Landing Chốt Đơn", tag: "Funnel", image: tueLamStanding },
      { id: "copy", title: "Skill · Copywriting Bán Hàng", tag: "Copy", image: tueLamStraight },
      { id: "offer", title: "Skill · Thiết Kế Offer", tag: "Offer", image: tueLamStanding },
      {
        id: "checkout",
        title: "Skill · Tối Ưu Thanh Toán",
        tag: "Checkout",
        image: tueLamStraight,
      },
      { id: "upsell", title: "Skill · Upsell & Combo", tag: "Growth", image: tueLamStanding },
      { id: "trust", title: "Skill · Chứng Thực Khách Hàng", tag: "Trust", image: tueLamStraight },
    ],
  },
  {
    id: "course",
    title: "Danh mục V · Khóa học & Đào tạo",
    subtitle: "Skill AI giúp đóng gói kiến thức, thiết kế bài giảng và vận hành đào tạo.",
    poster: tueLamHall5,
    products: [
      {
        id: "curriculum",
        title: "Skill · Thiết Kế Giáo Trình",
        tag: "Blueprint",
        image: tueLamStanding,
      },
      { id: "slide", title: "Skill · Slide Giảng Dạy", tag: "Deck", image: tueLamStraight },
      { id: "record", title: "Skill · Quay Bài Giảng", tag: "Studio", image: tueLamStanding },
      {
        id: "community",
        title: "Skill · Vận Hành Cộng Đồng",
        tag: "Community",
        image: tueLamStraight,
      },
      {
        id: "webinar",
        title: "Skill · Webinar Chốt Học Viên",
        tag: "Webinar",
        image: tueLamStanding,
      },
      { id: "affiliate", title: "Skill · Hệ Thống Affiliate", tag: "Scale", image: tueLamStraight },
    ],
  },
];

function Landing() {
  const [cart, setCart] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("sancongcu-cart") || "[]") as string[];
    } catch {
      return [];
    }
  });
  const [comboSize, setComboSize] = useState<ComboSize | null>(getSavedComboSize);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutTitle, setCheckoutTitle] = useState<string | null>(null);
  const [transferOrder, setTransferOrder] = useState<TransferOrder | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  useEffect(() => {
    window.localStorage.setItem("sancongcu-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (comboSize) window.localStorage.setItem("sancongcu-combo-size", String(comboSize));
    else window.localStorage.removeItem("sancongcu-combo-size");
  }, [comboSize]);
  useEffect(() => {
    if (comboSize && cart.length > comboSize) setComboSize(null);
  }, [cart.length, comboSize]);
  useEffect(() => {
    if (cart.length === 0) setIsCartOpen(false);
  }, [cart.length]);
  const [catalog, setCatalog] = useState<Category[] | null>(null);
  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const [hallResult, skillResult] = await Promise.all([
        supabase
          .from("halls")
          .select("id, slug, name, description, poster_path, is_visible, sort_order")
          .eq("is_visible", true)
          .order("sort_order"),
        supabase
          .from("skills")
          .select("id, hall_id, slug, title, short_description, thumbnail_path, status, sort_order")
          .eq("status", "published")
          .order("sort_order"),
      ]);
      if (hallResult.error || skillResult.error || !skillResult.data?.length) return;
      const dynamicCatalog = hallResult.data.map((hall) => ({
        id: hall.slug,
        title: hall.name,
        subtitle: hall.description,
        poster: hall.poster_path || tueLamStanding,
        visible: hall.is_visible,
        products: skillResult.data
          .filter((skill) => skill.hall_id === hall.id)
          .map((skill) => ({
            id: skill.slug,
            title: skill.title,
            description: skill.short_description,
            tag: "AI Skill",
            image: skill.thumbnail_path || hall.poster_path || tueLamStanding,
            visible: skill.status === "published",
          })),
      }));
      setCatalog(dynamicCatalog);
    })();
  }, []);
  const activeCategories = catalog ?? categories;
  const add = (id: string) => setCart((c) => (c.includes(id) ? c : [...c, id]));
  const remove = (id: string) => setCart((current) => current.filter((item) => item !== id));
  const clearCart = () => {
    setCart([]);
    setComboSize(null);
  };
  const total = comboSize === 5 ? 8 : comboSize === 10 ? 25 : cart.length * skillPriceUsd;
  const comboReady = !comboSize || cart.length === comboSize;
  const comboGift = comboSize === 10;
  const cartItems = cart.map((id) => ({
    id,
    title:
      activeCategories.flatMap((category) => category.products).find((product) => product.id === id)
        ?.title ?? "Skill đã chọn",
  }));
  const visibleCategories = activeCategories.filter(
    (category) =>
      category.visible !== false && category.products.some((product) => product.visible !== false),
  );
  const startCheckout = async (products: Product[], selectedComboSize: ComboSize | null = null) => {
    if (products.length === 0) return;
    setCheckoutTitle(
      products.length === 1 ? products[0].title : `${products.length} Skill đã chọn`,
    );
    setCheckoutError(null);
    setIsSavingOrder(true);

    // Render a usable QR before waiting for the database. The same code is
    // passed to Supabase immediately after the first paint.
    const immediateOrder = createFallbackTransferOrder(
      products.map((product) => product.id),
      selectedComboSize,
    );
    setTransferOrder(immediateOrder);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      if (!supabase) {
        throw new Error("Kết nối đặt hàng chưa sẵn sàng.");
      }
      const { data, error } = await supabase.rpc("create_pending_order", {
        p_skill_slugs: products.map((product) => product.id),
        p_order_code: immediateOrder.orderCode,
        p_combo_size: selectedComboSize ?? null,
      });
      const savedOrder = data?.[0];
      if (error) throw error;
      if (!savedOrder) throw new Error("Không thể tạo mã đơn.");
      setTransferOrder(
        createSavedTransferOrder({
          orderCode: savedOrder.order_code,
          amount: savedOrder.total_amount,
          transferNote: savedOrder.transfer_note,
          productCount: savedOrder.product_count,
        }),
      );
    } catch (error) {
      console.error("Không thể tạo đơn kích hoạt", error);
      setCheckoutError("Chưa thể tạo mã đơn. Vui lòng thử lại trước khi chuyển khoản.");
    } finally {
      setIsSavingOrder(false);
    }
  };
  const handleChooseSkill = (product: Product) => {
    add(product.id);
  };
  const handleSingleSkillCheckout = async (product: Product) => {
    await startCheckout([product]);
  };
  const handleCartCheckout = async () => {
    const selectedProducts = activeCategories
      .flatMap((category) => category.products)
      .filter((product) => cart.includes(product.id));
    if (comboSize && selectedProducts.length !== comboSize) return;
    await startCheckout(selectedProducts, comboSize);
  };
  useEffect(() => {
    const activateId = new URLSearchParams(window.location.search).get("activate");
    if (!activateId || checkoutTitle) return;
    const product = activeCategories
      .flatMap((category) => category.products)
      .find((item) => item.id === activateId);
    if (product) {
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      void startCheckout([product]);
    }
  }, [activeCategories, checkoutTitle]);

  return (
    <main className="min-h-screen bg-soft-gradient">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex min-w-0 items-center">
            <div className="w-44 shrink-0 sm:w-52">
              <img src={sanCongCuLogo} alt="sancongcu.com" className="h-auto w-full" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {comboSize
                ? `Combo ${comboSize} · ${cart.length}/${comboSize} Skill`
                : `${cart.length} skill`}{" "}
              · {total.toFixed(2)}$
            </span>
            <Link
              to="/tai-khoan"
              className="rounded-full bg-foreground px-4 py-2 font-medium text-background transition hover:opacity-90"
            >
              Tài khoản
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-14 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          AI skill viết sẵn · Dễ dùng · Ứng dụng ngay
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-tight sm:text-5xl md:text-6xl">
          Công cụ AI giúp bạn <em className="text-gradient not-italic">bán hàng dễ hơn</em>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm text-muted-foreground sm:text-base">
          Không cần am hiểu công nghệ phức tạp. Chọn đúng skill AI cho ngành nghề của bạn, làm theo
          hướng dẫn và áp dụng ngay vào công việc kinh doanh.
        </p>
      </section>

      {/* Danh mục có thể ẩn bằng visible: false trong dữ liệu categories */}
      <div className="mx-auto max-w-6xl space-y-14 px-6 pb-24">
        {visibleCategories.map((cat, idx) => (
          <CategoryRow
            key={cat.id}
            anchorId={`danh-muc-${idx + 1}`}
            category={cat}
            cart={cart}
            onChoose={handleChooseSkill}
            onActivate={handleSingleSkillCheckout}
          />
        ))}
      </div>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 rounded-3xl bg-card p-8 shadow-card sm:grid-cols-3 sm:p-12">
          {[
            { t: "Dễ áp dụng", d: "Skill được viết sẵn theo việc thực tế của người bán hàng." },
            {
              t: "Kích hoạt tức thì",
              d: "Làm theo từng bước rõ ràng, không cần biết công nghệ chuyên sâu.",
            },
            {
              t: "Đúng ngành nghề",
              d: "Chọn công cụ phù hợp để biến AI thành trợ lý cho công việc của bạn.",
            },
          ].map((f) => (
            <div key={f.t}>
              <div className="mb-3 h-10 w-10 rounded-xl bg-brand-gradient shadow-brand" />
              <h3 className="text-xl">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Combo CTA */}
      <section id="combo" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Chọn nhanh theo mục tiêu
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Một lộ trình sẵn sàng để bạn bắt đầu</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Không cần tự ghép từng công cụ. Chọn combo phù hợp với công việc kinh doanh đang cần ưu
            tiên.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {combos.map((combo, index) => (
            <article
              key={combo.name}
              className="flex min-h-72 flex-col rounded-3xl border border-border bg-card p-7 shadow-card"
            >
              <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Combo 0{index + 1}
              </span>
              <h3 className="mt-5 text-2xl leading-tight">{combo.name}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{combo.description}</p>
              <p className="mt-5 text-xs font-medium uppercase tracking-[0.12em] text-foreground/70">
                {combo.includes}
              </p>
              <a
                href={combo.href}
                className="mt-auto pt-7 text-sm font-semibold text-primary transition hover:text-foreground"
              >
                Khám phá combo →
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ / CTA */}
      <section id="faq" className="mx-auto max-w-3xl px-6 pb-32 text-center">
        <h2 className="text-4xl sm:text-5xl">
          Để AI làm phần khó, bạn tập trung <span className="text-gradient">bán hàng</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Khám phá những AI skill viết sẵn để đưa vào công việc kinh doanh ngay hôm nay.
        </p>
        <a
          href="#danh-muc-1"
          className="mt-8 inline-block rounded-full bg-brand-gradient px-8 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:scale-[1.02]"
        >
          Xem danh mục Skill →
        </a>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 sancongcu.com</p>
          <nav
            aria-label="Thông tin và chính sách"
            className="flex flex-wrap justify-center gap-x-4 gap-y-2"
          >
            {[
              "Thông tin đơn vị",
              "Điều khoản sử dụng",
              "Chính sách bảo mật",
              "Thanh toán & hoàn tiền",
              "Quy trình cung cấp Skill",
              "Liên hệ hỗ trợ",
            ].map((item) => (
              <a
                key={item}
                href="#faq"
                className="transition hover:text-foreground hover:underline"
              >
                {item}
              </a>
            ))}
          </nav>
          <p>AI skill cho người bán hàng</p>
        </div>
      </footer>

      {/* Cart sticky */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-sm items-center justify-between rounded-full bg-foreground px-5 py-3 text-background shadow-brand">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-haspopup="dialog"
            className="min-h-10 min-w-0 text-left text-sm transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="block">
              ⚡{" "}
              {comboSize
                ? `Combo ${comboSize} · ${cart.length}/${comboSize} Skill`
                : `${cart.length} skill`}{" "}
              · <strong>{total.toFixed(2)}$</strong>
            </span>
            {comboGift && (
              <span className="block text-xs text-background/75">+ ChatGPT Plus 1 tháng</span>
            )}
          </button>
          <button
            onClick={handleCartCheckout}
            disabled={!comboReady}
            className="rounded-full bg-brand-gradient px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {comboReady ? "Kích hoạt →" : `Chọn thêm ${comboSize! - cart.length} Skill`}
          </button>
        </div>
      )}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-h-[80dvh] max-w-md overflow-y-auto rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>Giỏ Skill đã chọn</DialogTitle>
            <DialogDescription>
              {comboSize
                ? `Combo ${comboSize}: ${cart.length}/${comboSize} Skill · ${total.toFixed(2)}$`
                : `${cart.length} Skill · ${total.toFixed(2)}$`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</p>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label={`Xóa ${item.title} khỏi giỏ hàng`}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ))}
            {comboGift && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary">
                Quà tặng: ChatGPT Plus 1 tháng
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={clearCart}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Xóa tất cả
            </button>
            <p className="text-right text-sm font-bold">Tổng: {total.toFixed(2)}$</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCartOpen(false);
              void handleCartCheckout();
            }}
            disabled={!comboReady}
            className="min-h-12 w-full rounded-full bg-brand-gradient px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {comboReady ? "Kích hoạt đơn hàng →" : `Chọn thêm ${comboSize! - cart.length} Skill`}
          </button>
        </DialogContent>
      </Dialog>
      <PaymentDialog
        title={checkoutTitle}
        order={transferOrder}
        error={checkoutError}
        isSavingOrder={isSavingOrder}
        onClose={() => {
          setCheckoutTitle(null);
          setCheckoutError(null);
          setIsSavingOrder(false);
        }}
      />
    </main>
  );
}

function CategoryRow({
  anchorId,
  category,
  cart,
  onChoose,
  onActivate,
}: {
  anchorId: string;
  category: Category;
  cart: string[];
  onChoose: (product: Product) => void;
  onActivate: (product: Product) => void;
}) {
  const visibleProducts = category.products.filter((product) => product.visible !== false);

  if (visibleProducts.length === 0) return null;

  return (
    <section id={anchorId}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            AI SKILL
          </p>
          <h2 className="hall-card__title mt-1">{category.title}</h2>
          <p className="hall-card__subtitle mt-1 text-muted-foreground">{category.subtitle}</p>
        </div>
        <a
          href="#faq"
          className="shrink-0 text-sm font-medium text-primary transition hover:opacity-80"
        >
          Xem skill →
        </a>
      </div>

      <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-6">
        {visibleProducts.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            inCart={cart.includes(p.id)}
            onChoose={() => onChoose(p)}
            onActivate={() => onActivate(p)}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  inCart,
  onChoose,
  onActivate,
}: {
  product: Product;
  inCart: boolean;
  onChoose: () => void;
  onActivate: () => void;
}) {
  const description =
    product.description ||
    getProductContent(product.id)?.summary ||
    "Thông tin Skill đang được cập nhật.";
  return (
    <article className="group w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-brand sm:w-auto">
      <Link
        to="/skill/$skillId"
        params={{ skillId: product.id }}
        aria-label={`Xem chi tiết ${product.title}`}
        className="relative block aspect-[3/4] overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        {product.video ? (
          <video
            src={product.video}
            poster={product.image}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-gradient text-5xl">
            <span className="drop-shadow-md">{product.emoji ?? "✨"}</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
          {product.tag}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-brand">
          1.99$
        </span>
      </Link>
      <div className="space-y-2 p-3">
        <h3 className="skill-card__title font-display">{product.title}</h3>
        <p className="skill-card__description text-xs leading-5 text-muted-foreground">
          {description}
        </p>
        <Link
          to="/skill/$skillId"
          params={{ skillId: product.id }}
          className="block w-full rounded-full border border-border px-3 py-2 text-center text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
        >
          Xem chi tiết
        </Link>
        <button
          onClick={onChoose}
          disabled={inCart}
          className="w-full rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background transition hover:opacity-90 disabled:cursor-default disabled:opacity-60"
        >
          {inCart ? "Đã chọn · 1.99$" : "Chọn Skill · 1.99$"}
        </button>
        <button
          onClick={onActivate}
          className="w-full rounded-full bg-brand-gradient px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Kích hoạt · 1.99$
        </button>
      </div>
    </article>
  );
}

function PaymentDialog({
  title,
  order,
  error,
  isSavingOrder,
  onClose,
}: {
  title: string | null;
  order: TransferOrder | null;
  error: string | null;
  isSavingOrder: boolean;
  onClose: () => void;
}) {
  if (!title) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Phí kích hoạt Skill
            </p>
            <h2 id="payment-title" className="mt-2 text-2xl">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ thanh toán"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-xl transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ×
          </button>
        </div>
        {error ? (
          <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </p>
        ) : !order ? (
          <p className="mt-6 rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
            Đang tạo hướng dẫn chuyển khoản…
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            <img
              src={order.payment.qrUrl ?? techcombankPaymentQr}
              alt="Mã QR thanh toán chuyển khoản"
              className="mx-auto w-52 rounded-2xl border border-border"
            />
            <TransferInstructions order={order} />
          </div>
        )}
        {order && isSavingOrder && !error && (
          <p className="mt-3 text-center text-xs text-muted-foreground">Đang lưu mã đơn…</p>
        )}
        {order && (
          <a
            href={paymentZaloUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 block w-full rounded-full bg-brand-gradient px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Gửi bill qua Zalo 0938 069 668 →
          </a>
        )}
        {order && (
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
            Sau khi gửi bill và được xác nhận, bạn sẽ nhận link tải Skill và hướng dẫn sử dụng riêng
            qua Zalo.
          </p>
        )}
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Tôi đã hiểu
        </button>
      </section>
    </div>
  );
}

function TransferInstructions({ order }: { order: TransferOrder }) {
  return (
    <div className="space-y-3 rounded-2xl bg-secondary p-5 text-sm">
      <p className="flex justify-between gap-4">
        <span className="text-muted-foreground">Số tiền</span>
        <strong>{formatVnd(order.amount)}</strong>
      </p>
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        Nội dung chuyển khoản: <strong className="text-foreground">{order.transferNote}</strong>
      </p>
    </div>
  );
}

function formatVnd(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabase, supabaseUrl } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Hall = {
  id: string;
  slug: string;
  name: string;
  description: string;
  poster_path: string | null;
  is_visible: boolean;
  sort_order: number;
};

type Skill = {
  id: string;
  hall_id: string | null;
  slug: string;
  title: string;
  short_description: string;
  introduction: string;
  benefits: string[];
  audience: string[];
  usage_steps: string[];
  payment_note: string;
  thumbnail_path: string | null;
  price_usd: number;
  activation_price_vnd: number;
  status: "draft" | "published" | "hidden";
  sort_order: number;
};

type Media = {
  id: string;
  skill_id: string;
  path: string;
  alt: string;
  caption: string;
  media_type: "input" | "output" | "other";
  sort_order: number;
};

type OrderItem = {
  id: string;
  skill_id: string | null;
  skill_title: string;
  unit_amount: number;
};

type Order = {
  id: string;
  order_code: string;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  total_amount: number;
  transfer_note: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  created_at: string;
  order_items: OrderItem[];
};

type SkillPackage = {
  id: string;
  skill_id: string;
  version: string;
  file_path: string;
  file_name: string;
  content_type: string;
  byte_size: number;
  is_active: boolean;
  created_at: string;
};

type SkillEntitlement = {
  id: string;
  order_item_id: string;
  skill_package_id: string;
  install_token: string;
  install_count: number;
  max_installs: number;
  revoked_at: string | null;
};

const adminEmails = new Set(["sancongcu@gmail.com", "trungnv32@gmail.com"]);
const statusLabel = { draft: "Bản nháp", published: "Đang hiển thị", hidden: "Đã ẩn" };

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `skill-${Date.now()}`
  );
}

function lines(value: string[]) {
  return value.join("\n");
}

function toLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createInstallToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function installUrl(token: string) {
  return `${supabaseUrl}/functions/v1/skill-install?token=${encodeURIComponent(token)}`;
}

function AdminPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [packages, setPackages] = useState<SkillPackage[]>([]);
  const [entitlements, setEntitlements] = useState<SkillEntitlement[]>([]);
  const [selectedHallId, setSelectedHallId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newHallName, setNewHallName] = useState("");

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [selectedSkillId, skills],
  );
  const selectedHall = useMemo(
    () => halls.find((hall) => hall.id === selectedHallId) ?? null,
    [selectedHallId, halls],
  );
  const selectedMedia = useMemo(
    () =>
      media
        .filter((item) => item.skill_id === selectedSkillId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [media, selectedSkillId],
  );

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email?.toLowerCase() ?? null);
      setIsLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSessionEmail(nextSession?.user.email?.toLowerCase() ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionEmail && adminEmails.has(sessionEmail)) void loadCatalog();
  }, [sessionEmail]);

  async function loadCatalog() {
    if (!supabase) return;
    setIsLoading(true);
    setError(null);
    const [hallResult, skillResult, mediaResult, orderResult, packageResult, entitlementResult] =
      await Promise.all([
        supabase.from("halls").select("*").order("sort_order").order("name"),
        supabase.from("skills").select("*").order("sort_order").order("title"),
        supabase.from("skill_media").select("*").order("sort_order"),
        supabase
          .from("orders")
          .select("*, order_items(id, skill_id, skill_title, unit_amount)")
          .order("created_at", { ascending: false }),
        supabase.from("skill_packages").select("*").order("created_at", { ascending: false }),
        supabase.from("skill_entitlements").select("*"),
      ]);
    const requestError =
      hallResult.error ??
      skillResult.error ??
      mediaResult.error ??
      orderResult.error ??
      packageResult.error ??
      entitlementResult.error;
    if (requestError) {
      setError(`Không thể tải dữ liệu: ${requestError.message}`);
    } else {
      const nextHalls = (hallResult.data ?? []) as Hall[];
      const nextSkills = (skillResult.data ?? []) as Skill[];
      setHalls(nextHalls);
      setSkills(nextSkills);
      setMedia((mediaResult.data ?? []) as Media[]);
      setOrders((orderResult.data ?? []) as Order[]);
      setPackages((packageResult.data ?? []) as SkillPackage[]);
      setEntitlements((entitlementResult.data ?? []) as SkillEntitlement[]);
      setSelectedHallId((current) => current ?? nextHalls[0]?.id ?? null);
      setSelectedSkillId((current) => current ?? nextSkills[0]?.id ?? null);
    }
    setIsLoading(false);
  }

  async function updateOrderStatus(
    order: Order,
    field: "confirmed" | "delivered",
    checked: boolean,
  ) {
    if (!supabase) return;
    setError(null);
    const status: Order["status"] = checked
      ? field === "confirmed"
        ? "confirmed"
        : "delivered"
      : field === "confirmed"
        ? "pending"
        : order.confirmed_at
          ? "confirmed"
          : "pending";
    const update =
      field === "confirmed"
        ? {
            status,
            confirmed_at: checked ? new Date().toISOString() : null,
            delivered_at: checked ? order.delivered_at : null,
          }
        : { status, delivered_at: checked ? new Date().toISOString() : null };
    const { data, error: updateError } = await supabase
      .from("orders")
      .update(update)
      .eq("id", order.id)
      .select("*, order_items(id, skill_id, skill_title, unit_amount)")
      .single();
    if (updateError) setError(updateError.message);
    else if (data)
      setOrders((current) => current.map((item) => (item.id === data.id ? (data as Order) : item)));
  }

  async function copyInstallLink(token: string) {
    const url = installUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        "Đã sao chép link cài đặt Skill. Gửi link này kèm lời nhắn “Hãy cài Skill từ link này” cho khách.",
      );
    } catch {
      setError("Không thể tự sao chép. Hãy thử lại trên kết nối HTTPS.");
    }
  }

  async function createOrCopyInstallLink(order: Order, item: OrderItem, regenerate = false) {
    if (!supabase) return;
    if (!order.confirmed_at) {
      setError("Hãy tick “Đã thanh toán” trước khi tạo link cài đặt cho khách.");
      return;
    }
    if (!item.skill_id) {
      setError(`Không xác định được Skill cho mục “${item.skill_title}”.`);
      return;
    }
    const activePackage = packages.find(
      (itemPackage) => itemPackage.skill_id === item.skill_id && itemPackage.is_active,
    );
    if (!activePackage) {
      setError(
        `Skill “${item.skill_title}” chưa có gói cài đặt. Hãy tải SKILL.md hoặc ZIP trong trang chỉnh sửa Skill.`,
      );
      return;
    }
    const existing = entitlements.find(
      (entitlement) => entitlement.order_item_id === item.id && !entitlement.revoked_at,
    );
    if (existing && !regenerate) {
      await copyInstallLink(existing.install_token);
      return;
    }
    setIsSaving(true);
    setError(null);
    const nextToken = createInstallToken();
    const request = existing
      ? supabase
          .from("skill_entitlements")
          .update({
            skill_package_id: activePackage.id,
            install_token: nextToken,
            install_count: 0,
            last_installed_at: null,
            revoked_at: null,
          })
          .eq("id", existing.id)
          .select()
          .single()
      : supabase
          .from("skill_entitlements")
          .insert({
            order_item_id: item.id,
            skill_package_id: activePackage.id,
            install_token: nextToken,
          })
          .select()
          .single();
    const { data, error: createError } = await request;
    setIsSaving(false);
    if (createError) setError(createError.message);
    else if (data) {
      const entitlement = data as SkillEntitlement;
      setEntitlements((current) =>
        existing
          ? current.map((itemEntitlement) =>
              itemEntitlement.id === entitlement.id ? entitlement : itemEntitlement,
            )
          : [...current, entitlement],
      );
      if (regenerate) {
        setNotice("Đã tạo link mới với phiên bản Skill hiện hành. Link cũ không còn sử dụng được.");
      }
      await copyInstallLink(entitlement.install_token);
    }
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const normalized = email.trim().toLowerCase();
    if (!adminEmails.has(normalized)) {
      setError("Email này chưa có quyền quản trị.");
      return;
    }
    setError(null);
    setIsSaving(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setIsSaving(false);
    if (authError) setError(authError.message);
    else setSent(true);
  }

  async function saveSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selectedSkill) return;
    const form = new FormData(event.currentTarget);
    setIsSaving(true);
    setError(null);
    const update = {
      hall_id: String(form.get("hall_id") || "") || null,
      slug: slugify(String(form.get("slug") || selectedSkill.title)),
      title: String(form.get("title") || "").trim(),
      short_description: String(form.get("short_description") || "").trim(),
      introduction: String(form.get("introduction") || "").trim(),
      benefits: toLines(String(form.get("benefits") || "")),
      audience: toLines(String(form.get("audience") || "")),
      usage_steps: toLines(String(form.get("usage_steps") || "")),
      payment_note: String(form.get("payment_note") || "").trim(),
      thumbnail_path: String(form.get("thumbnail_path") || "").trim() || null,
      price_usd: Number(form.get("price_usd") || 1.99),
      activation_price_vnd: Number(form.get("activation_price_vnd") || 51000),
      status: String(form.get("status")) as Skill["status"],
      sort_order: Number(form.get("sort_order") || 0),
    };
    const { data, error: saveError } = await supabase
      .from("skills")
      .update(update)
      .eq("id", selectedSkill.id)
      .select()
      .single();
    setIsSaving(false);
    if (saveError) setError(saveError.message);
    else if (data) {
      setSkills((current) =>
        current.map((skill) => (skill.id === data.id ? (data as Skill) : skill)),
      );
      setNotice("Đã lưu thay đổi của Skill.");
    }
  }

  async function createSkill() {
    if (!supabase) return;
    setIsSaving(true);
    setError(null);
    const number = skills.length + 1;
    const { data, error: createError } = await supabase
      .from("skills")
      .insert({
        hall_id: selectedHallId,
        slug: `skill-moi-${Date.now()}`,
        title: `Skill mới ${number}`,
        short_description: "Mô tả ngắn cho Skill.",
        status: "draft",
        sort_order: number,
      })
      .select()
      .single();
    setIsSaving(false);
    if (createError) setError(createError.message);
    else if (data) {
      setSkills((current) => [...current, data as Skill]);
      setSelectedSkillId(data.id);
      setNotice("Đã tạo Skill nháp. Hãy điền nội dung rồi lưu.");
    }
  }

  async function createHall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !newHallName.trim()) return;
    setIsSaving(true);
    const { data, error: createError } = await supabase
      .from("halls")
      .insert({
        name: newHallName.trim(),
        slug: slugify(newHallName),
        description: "Mô tả danh mục.",
        sort_order: halls.length + 1,
      })
      .select()
      .single();
    setIsSaving(false);
    if (createError) setError(createError.message);
    else if (data) {
      setHalls((current) => [...current, data as Hall]);
      setSelectedHallId(data.id);
      setNewHallName("");
      setNotice("Đã thêm danh mục mới.");
    }
  }

  async function toggleHall(hall: Hall) {
    if (!supabase) return;
    const { error: toggleError } = await supabase
      .from("halls")
      .update({ is_visible: !hall.is_visible })
      .eq("id", hall.id);
    if (toggleError) setError(toggleError.message);
    else
      setHalls((current) =>
        current.map((item) =>
          item.id === hall.id ? { ...item, is_visible: !item.is_visible } : item,
        ),
      );
  }

  async function toggleSkillVisibility(skill: Skill) {
    const client = supabase;
    if (!client) return;
    const status: Skill["status"] = skill.status === "published" ? "hidden" : "published";
    const { data, error: toggleError } = await client
      .from("skills")
      .update({ status })
      .eq("id", skill.id)
      .select()
      .single();
    if (toggleError) setError(toggleError.message);
    else if (data)
      setSkills((current) => current.map((item) => (item.id === data.id ? (data as Skill) : item)));
  }

  async function saveHall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selectedHall) return;
    const form = new FormData(event.currentTarget);
    setIsSaving(true);
    const update = {
      name: String(form.get("hall_name") || "").trim(),
      slug: slugify(String(form.get("hall_slug") || selectedHall.name)),
      description: String(form.get("hall_description") || "").trim(),
      poster_path: String(form.get("hall_poster_path") || "").trim() || null,
      sort_order: Number(form.get("hall_sort_order") || 0),
    };
    const { data, error: saveError } = await supabase
      .from("halls")
      .update(update)
      .eq("id", selectedHall.id)
      .select()
      .single();
    setIsSaving(false);
    if (saveError) setError(saveError.message);
    else if (data) {
      setHalls((current) =>
        current
          .map((hall) => (hall.id === data.id ? (data as Hall) : hall))
          .sort((a, b) => a.sort_order - b.sort_order),
      );
      setNotice("Đã lưu tên, mô tả và thứ tự danh mục.");
    }
  }

  async function uploadFile(
    event: ChangeEvent<HTMLInputElement>,
    target: "thumbnail" | "gallery",
    mediaType: Media["media_type"] = "other",
  ) {
    const files = Array.from(event.target.files ?? []);
    const client = supabase;
    if (!client || files.length === 0 || !selectedSkill) return;
    if (files.some((file) => !file.type.startsWith("image/"))) {
      setError("Chỉ tải lên tệp ảnh.");
      return;
    }
    setIsSaving(true);
    setError(null);
    const uploadOne = async (file: File, index: number) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${selectedSkill.id}/${target}-${Date.now()}-${index}.${ext}`;
      const { error: uploadError } = await client.storage
        .from("skill-media")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      return client.storage.from("skill-media").getPublicUrl(path).data.publicUrl;
    };
    try {
      const urls = await Promise.all(files.map(uploadOne));
      if (target === "thumbnail") {
        const { data, error: updateError } = await client
          .from("skills")
          .update({ thumbnail_path: urls[0] })
          .eq("id", selectedSkill.id)
          .select()
          .single();
        if (updateError) throw updateError;
        if (data)
          setSkills((current) =>
            current.map((skill) => (skill.id === data.id ? (data as Skill) : skill)),
          );
      } else {
        const { data, error: insertError } = await client
          .from("skill_media")
          .insert(
            urls.map((path, index) => ({
              skill_id: selectedSkill.id,
              path,
              alt: selectedSkill.title,
              media_type: mediaType,
              sort_order: selectedMedia.length + index + 1,
            })),
          )
          .select();
        if (insertError) throw insertError;
        if (data) setMedia((current) => [...current, ...(data as Media[])]);
        setNotice(`Đã tải ${urls.length} ảnh vào gallery.`);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh lên.");
    }
    event.target.value = "";
    setIsSaving(false);
  }

  async function uploadSkillPackage(event: ChangeEvent<HTMLInputElement>, version: string) {
    const file = event.target.files?.[0];
    const client = supabase;
    if (!client || !file || !selectedSkill) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    const isMarkdown = extension === "md" || file.type === "text/markdown";
    const isZip =
      extension === "zip" ||
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed";
    if (!isMarkdown && !isZip) {
      setError("Gói cài đặt phải là tệp SKILL.md hoặc tệp ZIP.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Gói cài đặt tối đa 25 MB.");
      return;
    }
    const cleanVersion = version.trim() || "1.0.0";
    const path = `${selectedSkill.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, "-")}`;
    const contentType = isMarkdown ? "text/markdown" : "application/zip";
    setIsSaving(true);
    setError(null);
    try {
      const { error: uploadError } = await client.storage
        .from("skill-packages")
        .upload(path, file, { contentType });
      if (uploadError) throw uploadError;
      const { error: deactivateError } = await client
        .from("skill_packages")
        .update({ is_active: false })
        .eq("skill_id", selectedSkill.id)
        .eq("is_active", true);
      if (deactivateError) throw deactivateError;
      const { data, error: packageError } = await client
        .from("skill_packages")
        .insert({
          skill_id: selectedSkill.id,
          version: cleanVersion,
          file_path: path,
          file_name: file.name,
          content_type: contentType,
          byte_size: file.size,
          is_active: true,
        })
        .select()
        .single();
      if (packageError) throw packageError;
      if (data) {
        setPackages((current) => [
          data as SkillPackage,
          ...current.map((itemPackage) =>
            itemPackage.skill_id === selectedSkill.id
              ? { ...itemPackage, is_active: false }
              : itemPackage,
          ),
        ]);
      }
      setNotice(`Đã tải gói ${file.name} và đặt làm phiên bản cài đặt hiện hành.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải gói Skill lên.");
    }
    event.target.value = "";
    setIsSaving(false);
  }

  async function updateMedia(item: Media, values: Partial<Media>) {
    if (!supabase) return;
    const { data, error: updateError } = await supabase
      .from("skill_media")
      .update(values)
      .eq("id", item.id)
      .select()
      .single();
    if (updateError) setError(updateError.message);
    else if (data)
      setMedia((current) =>
        current.map((mediaItem) => (mediaItem.id === item.id ? (data as Media) : mediaItem)),
      );
  }

  async function deleteMedia(item: Media) {
    if (!supabase || !window.confirm("Xóa ảnh minh họa này?")) return;
    const { error: deleteError } = await supabase.from("skill_media").delete().eq("id", item.id);
    if (deleteError) setError(deleteError.message);
    else setMedia((current) => current.filter((mediaItem) => mediaItem.id !== item.id));
  }

  async function deleteSkill() {
    if (
      !supabase ||
      !selectedSkill ||
      !window.confirm(`Xóa “${selectedSkill.title}”? Thao tác này không thể hoàn tác.`)
    )
      return;
    const { error: deleteError } = await supabase
      .from("skills")
      .delete()
      .eq("id", selectedSkill.id);
    if (deleteError) setError(deleteError.message);
    else {
      setSkills((current) => current.filter((skill) => skill.id !== selectedSkill.id));
      setSelectedSkillId(null);
      setNotice("Đã xóa Skill.");
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <SetupMessage
        title="Chưa có cấu hình Supabase"
        message="Thêm VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY để mở khu vực quản trị."
      />
    );
  }
  if (isLoading) return <LoadingPage />;
  if (!sessionEmail)
    return (
      <LoginPage
        email={email}
        setEmail={setEmail}
        isSaving={isSaving}
        sent={sent}
        error={error}
        onSubmit={sendMagicLink}
      />
    );
  if (!adminEmails.has(sessionEmail))
    return (
      <SetupMessage
        title="Tài khoản chưa được cấp quyền"
        message={`Email ${sessionEmail} đã đăng nhập nhưng chưa có quyền quản trị.`}
      />
    );

  return (
    <main className="admin-page min-h-screen overflow-x-hidden bg-[#f6f8fc] text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-background text-foreground transition hover:border-primary hover:text-primary"
              aria-label="Về trang chủ"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                SanCongCu
              </p>
              <h1 className="truncate text-lg font-bold">Quản trị nội dung</h1>
            </div>
          </div>
          <button
            onClick={() => void supabase?.auth.signOut()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" /> <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="admin-layout mx-auto grid max-w-[1600px] gap-5 p-4 sm:p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-sm lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-2">
            <h2 className="font-bold">Danh mục</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
              {halls.length}
            </span>
          </div>
          <div className="space-y-1">
            {halls.map((hall) => (
              <button
                key={hall.id}
                onClick={() => {
                  setSelectedHallId(hall.id);
                  setSelectedSkillId(skills.find((skill) => skill.hall_id === hall.id)?.id ?? null);
                }}
                className={`flex min-h-12 w-full items-center gap-2 rounded-xl px-3 text-left text-sm transition ${selectedHallId === hall.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${hall.is_visible ? "bg-emerald-400" : "bg-muted-foreground"}`}
                />
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {hall.name.replace(/^Danh mục [IVX]+ · /, "")}
                </span>
                <ChevronRight className="size-4 opacity-70" />
              </button>
            ))}
          </div>
          <form onSubmit={createHall} className="mt-4 border-t border-border pt-4">
            <label className="sr-only" htmlFor="new-hall">
              Tên danh mục mới
            </label>
            <input
              id="new-hall"
              value={newHallName}
              onChange={(event) => setNewHallName(event.target.value)}
              placeholder="Tên danh mục mới"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-primary focus:ring-2"
            />
            <button
              disabled={isSaving || !newHallName.trim()}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4" />
              Thêm danh mục
            </button>
          </form>
        </aside>

        <section className="admin-content min-w-0 space-y-5">
          {error && <Alert tone="error" text={error} onClose={() => setError(null)} />}
          {notice && <Alert tone="success" text={notice} onClose={() => setNotice(null)} />}
          <OrdersPanel
            orders={orders}
            entitlements={entitlements}
            onStatusChange={updateOrderStatus}
            onInstallLink={createOrCopyInstallLink}
            onRegenerateInstallLink={(order, item) => createOrCopyInstallLink(order, item, true)}
          />
          {selectedHall && (
            <form
              onSubmit={(event) => void saveHall(event)}
              onChange={(event) => {
                const input = event.target as unknown as HTMLInputElement;
                if (input.name === "hall_name") {
                  const slugInput = event.currentTarget.elements.namedItem(
                    "hall_slug",
                  ) as HTMLInputElement | null;
                  if (slugInput) slugInput.value = slugify(input.value);
                }
              }}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    Chỉnh sửa sảnh
                  </p>
                  <h2 className="mt-1 text-xl font-bold">{selectedHall.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleHall(selectedHall)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold transition hover:bg-muted"
                  >
                    {selectedHall.is_visible ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                    {selectedHall.is_visible ? "Đang hiển thị" : "Đang ẩn"}
                  </button>
                  <button
                    disabled={isSaving}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-bold text-background disabled:opacity-60"
                  >
                    <Save className="size-4" />
                    Lưu sảnh
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <CountInput
                  label="Tên sảnh"
                  name="hall_name"
                  defaultValue={selectedHall.name}
                  maxLength={100}
                />
                <CountInput
                  label="Đường dẫn sảnh"
                  name="hall_slug"
                  defaultValue={selectedHall.slug}
                  maxLength={100}
                />
                <Field label="Thứ tự hiển thị">
                  <input
                    name="hall_sort_order"
                    inputMode="numeric"
                    type="number"
                    defaultValue={selectedHall.sort_order}
                    className="input"
                  />
                </Field>
                <Field label="URL poster sảnh">
                  <input
                    name="hall_poster_path"
                    defaultValue={selectedHall.poster_path ?? ""}
                    className="input"
                  />
                </Field>
              </div>
              <div className="mt-4">
                <CountInput
                  label="Mô tả sảnh"
                  name="hall_description"
                  defaultValue={selectedHall.description}
                  maxLength={300}
                  multiline
                  rows={4}
                />
              </div>
            </form>
          )}

          <section className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
              <div>
                <h2 className="font-bold">Skill trong danh mục</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chọn một Skill để chỉnh sửa toàn bộ nội dung.
                </p>
              </div>
              <button
                onClick={() => void createSkill()}
                disabled={isSaving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-bold text-primary-foreground shadow-brand transition hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="size-4" />
                Tạo Skill
              </button>
            </div>
            <div className="flex min-w-0 max-w-full gap-3 overflow-x-auto p-4 sm:p-5">
              {skills
                .filter((skill) => !selectedHallId || skill.hall_id === selectedHallId)
                .map((skill) => (
                  <div
                    key={skill.id}
                    className={`w-52 shrink-0 overflow-hidden rounded-xl border text-left transition ${selectedSkillId === skill.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                  >
                    <button
                      onClick={() => setSelectedSkillId(skill.id)}
                      className="block w-full text-left"
                    >
                      <div className="aspect-[16/9] bg-muted">
                        {skill.thumbnail_path ? (
                          <img
                            src={skill.thumbnail_path}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-xs font-semibold text-muted-foreground">
                            Chưa có ảnh
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-bold">{skill.title}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {statusLabel[skill.status]}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => void toggleSkillVisibility(skill)}
                      className={`m-3 mt-0 inline-flex min-h-9 w-[calc(100%-1.5rem)] items-center justify-center rounded-lg text-xs font-bold ${skill.status === "published" ? "border border-border hover:bg-muted" : "bg-primary text-primary-foreground"}`}
                    >
                      {skill.status === "published" ? "Ẩn Skill" : "Hiển thị"}
                    </button>
                  </div>
                ))}
              {skills.filter((skill) => !selectedHallId || skill.hall_id === selectedHallId)
                .length === 0 && (
                <p className="py-5 text-sm text-muted-foreground">
                  Chưa có Skill trong danh mục này.
                </p>
              )}
            </div>
          </section>

          {selectedSkill ? (
            <SkillEditor
              skill={selectedSkill}
              halls={halls}
              media={selectedMedia}
              isSaving={isSaving}
              onSave={saveSkill}
              onDelete={deleteSkill}
              onToggleVisibility={toggleSkillVisibility}
              onUpload={uploadFile}
              packages={packages.filter((itemPackage) => itemPackage.skill_id === selectedSkill.id)}
              onUploadPackage={uploadSkillPackage}
              onMediaUpdate={updateMedia}
              onMediaDelete={deleteMedia}
            />
          ) : (
            <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <ImagePlus className="mx-auto size-8 text-primary" />
              <h2 className="mt-4 text-lg font-bold">Chọn hoặc tạo một Skill</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Nội dung chi tiết, gallery và hướng dẫn sẽ xuất hiện ở đây.
              </p>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function OrdersPanel({
  orders,
  entitlements,
  onStatusChange,
  onInstallLink,
  onRegenerateInstallLink,
}: {
  orders: Order[];
  entitlements: SkillEntitlement[];
  onStatusChange: (
    order: Order,
    field: "confirmed" | "delivered",
    checked: boolean,
  ) => Promise<void>;
  onInstallLink: (order: Order, item: OrderItem) => Promise<void>;
  onRegenerateInstallLink: (order: Order, item: OrderItem) => Promise<void>;
}) {
  return (
    <section
      id="orders"
      className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Quản lý đơn
          </p>
          <h2 className="mt-1 text-xl font-bold">Đơn kích hoạt Skill</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Đơn được lưu ngay khi khách mở phần thanh toán.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold">
          {orders.length} đơn
        </span>
      </div>
      {orders.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">Chưa có đơn kích hoạt nào.</p>
      ) : (
        <div className="min-w-0 max-w-full overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Mã đơn</th>
                <th className="px-5 py-3">Skill đặt</th>
                <th className="px-5 py-3">Link cài đặt</th>
                <th className="px-5 py-3">Số tiền</th>
                <th className="px-5 py-3">Nội dung CK</th>
                <th className="px-5 py-3">Thời gian</th>
                <th className="px-5 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-border align-top">
                  <td className="px-5 py-4 font-bold">{order.order_code}</td>
                  <td className="px-5 py-4">
                    <ul className="space-y-2">
                      {order.order_items.map((item) => (
                        <li key={item.id} className="font-medium">
                          {item.skill_title}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      {order.order_items.map((item) => {
                        if (!item.skill_id) {
                          return (
                            <p
                              key={item.id}
                              className="min-w-56 pt-2 text-xs font-medium text-muted-foreground"
                            >
                              Quà tặng được bàn giao cùng đơn.
                            </p>
                          );
                        }
                        const entitlement = entitlements.find(
                          (entry) => entry.order_item_id === item.id && !entry.revoked_at,
                        );
                        const installLink = entitlement
                          ? installUrl(entitlement.install_token)
                          : null;
                        return (
                          <div key={item.id} className="min-w-56 space-y-2">
                            <button
                              type="button"
                              onClick={() => void onInstallLink(order, item)}
                              disabled={!order.confirmed_at}
                              title={
                                !order.confirmed_at
                                  ? "Tick “Đã thanh toán” trước khi tạo link"
                                  : undefined
                              }
                              className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold transition ${order.confirmed_at ? "bg-primary text-primary-foreground hover:opacity-90" : "cursor-not-allowed bg-muted text-muted-foreground"}`}
                            >
                              <Copy className="size-3.5" />
                              {entitlement ? "Sao chép link" : "Tạo link"}
                            </button>
                            {entitlement && (
                              <button
                                type="button"
                                onClick={() => void onRegenerateInstallLink(order, item)}
                                className="ml-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold transition hover:bg-muted"
                              >
                                Tạo lại link
                              </button>
                            )}
                            {installLink ? (
                              <input
                                aria-label={`Link cài đặt ${item.skill_title}`}
                                value={installLink}
                                readOnly
                                onFocus={(event) => event.currentTarget.select()}
                                className="input h-9 min-w-56 px-2 py-1 text-[11px] font-normal"
                              />
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {order.confirmed_at
                                  ? "Tạo link để gửi cho khách."
                                  : "Chờ xác nhận thanh toán."}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {new Intl.NumberFormat("vi-VN").format(order.total_amount)}đ
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{order.transfer_note}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(order.confirmed_at)}
                          onChange={(event) =>
                            void onStatusChange(order, "confirmed", event.target.checked)
                          }
                        />
                        Đã thanh toán
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(order.delivered_at)}
                          disabled={!order.confirmed_at}
                          onChange={(event) =>
                            void onStatusChange(order, "delivered", event.target.checked)
                          }
                        />
                        Đã gửi Skill
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SkillEditor({
  skill,
  halls,
  media,
  isSaving,
  onSave,
  onDelete,
  onToggleVisibility,
  onUpload,
  packages,
  onUploadPackage,
  onMediaUpdate,
  onMediaDelete,
}: {
  skill: Skill;
  halls: Hall[];
  media: Media[];
  isSaving: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: () => Promise<void>;
  onToggleVisibility: (skill: Skill) => Promise<void>;
  onUpload: (
    event: ChangeEvent<HTMLInputElement>,
    target: "thumbnail" | "gallery",
    mediaType?: Media["media_type"],
  ) => Promise<void>;
  packages: SkillPackage[];
  onUploadPackage: (event: ChangeEvent<HTMLInputElement>, version: string) => Promise<void>;
  onMediaUpdate: (item: Media, values: Partial<Media>) => Promise<void>;
  onMediaDelete: (item: Media) => Promise<void>;
}) {
  const [galleryType, setGalleryType] = useState<Media["media_type"]>("other");
  const [packageVersion, setPackageVersion] = useState("1.0.0");
  const activePackage = packages.find((itemPackage) => itemPackage.is_active);
  return (
    <form onSubmit={(event) => void onSave(event)} className="admin-editor min-w-0 space-y-5">
      <section className="admin-card min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Trình chỉnh sửa
            </p>
            <h2 className="mt-1 text-2xl font-bold">{skill.title}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-brand transition hover:opacity-90">
              <Upload className="size-4" />
              Tải poster đại diện
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => void onUpload(event, "thumbnail")}
              />
            </label>
            <button
              type="button"
              onClick={() => void onDelete()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-destructive/30 px-4 text-sm font-bold text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              Xóa
            </button>
            <button
              disabled={isSaving}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-bold text-primary-foreground shadow-brand transition hover:opacity-90 disabled:opacity-60"
            >
              {isSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSaving ? "Đang lưu" : "Lưu Skill"}
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <CountInput
            label="Tên Skill"
            name="title"
            defaultValue={skill.title}
            maxLength={120}
            required
          />
          <CountInput
            label="Đường dẫn thân thiện"
            name="slug"
            defaultValue={skill.slug}
            maxLength={120}
            required
          />
          <Field label="Thuộc danh mục">
            <select name="hall_id" defaultValue={skill.hall_id ?? ""} className="input">
              <option value="">Chưa phân loại</option>
              {halls.map((hall) => (
                <option key={hall.id} value={hall.id}>
                  {hall.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trạng thái">
            <select name="status" defaultValue={skill.status} className="input">
              <option value="draft">Bản nháp</option>
              <option value="published">Hiển thị trên web</option>
              <option value="hidden">Ẩn khỏi web</option>
            </select>
          </Field>
          <Field label="Giá hiển thị (USD)">
            <input
              name="price_usd"
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              defaultValue={skill.price_usd}
              className="input"
            />
          </Field>
          <Field label="Phí kích hoạt (VND)">
            <input
              name="activation_price_vnd"
              inputMode="numeric"
              type="number"
              min="0"
              step="1000"
              defaultValue={skill.activation_price_vnd}
              className="input"
            />
          </Field>
          <Field label="Thứ tự trong danh mục">
            <input
              name="sort_order"
              inputMode="numeric"
              type="number"
              defaultValue={skill.sort_order}
              className="input"
            />
          </Field>
        </div>
        <div className="mt-5">
          <CountInput
            label="Mô tả ngắn — hiển thị trên thẻ Skill"
            name="short_description"
            defaultValue={skill.short_description}
            maxLength={360}
            multiline
            rows={6}
          />
        </div>
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Cài đặt cho AI agent
              </p>
              <h3 className="mt-1 font-bold">Gói cài đặt Skill</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Tải SKILL.md nếu Skill chỉ có hướng dẫn; dùng ZIP nếu kèm scripts, references hoặc
                assets.
              </p>
            </div>
            {activePackage && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Đang dùng: v{activePackage.version}
              </span>
            )}
          </div>
          <div className="mt-4 grid min-w-0 gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field label="Phiên bản gói">
              <input
                value={packageVersion}
                onChange={(event) => setPackageVersion(event.target.value)}
                maxLength={40}
                placeholder="Ví dụ: 1.0.0"
                className="input h-11"
              />
            </Field>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:opacity-90">
              <Upload className="size-4" />
              Tải gói Skill
              <input
                type="file"
                accept=".md,.zip,text/markdown,application/zip,application/x-zip-compressed"
                className="sr-only"
                onChange={(event) => void onUploadPackage(event, packageVersion)}
              />
            </label>
          </div>
          {activePackage ? (
            <p className="admin-token mt-3 text-sm text-muted-foreground">
              Tệp hiện hành:{" "}
              <span className="font-semibold text-foreground">{activePackage.file_name}</span> ·{" "}
              {Math.max(1, Math.round(activePackage.byte_size / 1024))} KB
            </p>
          ) : (
            <p className="mt-3 text-sm text-amber-700">
              Chưa có gói cài đặt; đơn hàng chưa thể tạo link bàn giao tự động.
            </p>
          )}
        </div>
      </section>
      <section className="grid min-w-0 max-w-full gap-5 xl:grid-cols-2">
        <section className="admin-poster-card min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h3 className="font-bold">Poster đại diện Skill</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Dùng cho thẻ Skill và ảnh Hero trên trang chi tiết. Bấm “Tải poster đại diện” ở đầu form
            để thay ảnh.
          </p>
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="min-w-0 space-y-3">
              <div className="admin-poster-preview aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                {skill.thumbnail_path ? (
                  <img
                    src={skill.thumbnail_path}
                    alt="Ảnh đại diện Skill"
                    className="block size-full max-w-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-sm text-muted-foreground">
                    Chưa có ảnh
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void onToggleVisibility(skill)}
                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${skill.status === "published" ? "border border-border bg-background hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90"}`}
              >
                {skill.status === "published" ? (
                  <>
                    <EyeOff className="size-4" />
                    Ẩn Skill
                  </>
                ) : (
                  <>
                    <Eye className="size-4" />
                    Hiển thị
                  </>
                )}
              </button>
            </div>
            <div className="min-w-0 space-y-3">
              <Field label="URL ảnh">
                <input
                  name="thumbnail_path"
                  defaultValue={skill.thumbnail_path ?? ""}
                  placeholder="https://…"
                  className="input admin-token"
                />
              </Field>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold transition hover:bg-muted">
                <Upload className="size-4" />
                Tải ảnh lên
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => void onUpload(event, "thumbnail")}
                />
              </label>
            </div>
          </div>
        </section>
        <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h3 className="font-bold">Gallery đầu vào / đầu ra</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn loại ảnh và tải nhiều ảnh cùng lúc; các ảnh sẽ có thể lướt trên trang chi tiết.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              aria-label="Loại ảnh sắp tải"
              value={galleryType}
              onChange={(event) => setGalleryType(event.target.value as Media["media_type"])}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="input">Ảnh đầu vào</option>
              <option value="output">Ảnh đầu ra</option>
              <option value="other">Ảnh minh họa khác</option>
            </select>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:opacity-90">
              <ImagePlus className="size-4" />
              Tải nhiều ảnh
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => void onUpload(event, "gallery", galleryType)}
              />
            </label>
          </div>
          <div className="mt-4 flex max-w-full gap-3 overflow-x-auto pb-2">
            {media.map((item) => (
              <div
                key={item.id}
                className="w-40 shrink-0 overflow-hidden rounded-xl border border-border"
              >
                <img src={item.path} alt={item.alt} className="aspect-square w-full object-cover" />
                <div className="space-y-2 p-2">
                  <select
                    aria-label="Loại minh họa"
                    value={item.media_type}
                    onChange={(event) =>
                      void onMediaUpdate(item, {
                        media_type: event.target.value as Media["media_type"],
                      })
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
                  >
                    <option value="input">Đầu vào</option>
                    <option value="output">Đầu ra</option>
                    <option value="other">Khác</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void onMediaDelete(item)}
                    className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" />
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h3 className="font-bold">Trang chi tiết Skill</h3>
        <div className="mt-5 grid gap-5">
          <CountInput
            label="Giới thiệu"
            name="introduction"
            defaultValue={skill.introduction}
            maxLength={2200}
            multiline
            rows={9}
          />
          <CountInput
            label="Bạn nhận được gì — mỗi dòng là một lợi ích"
            name="benefits"
            defaultValue={lines(skill.benefits)}
            maxLength={1800}
            multiline
            rows={8}
          />
          <CountInput
            label="Sản phẩm này phù hợp với ai — mỗi dòng là một nhóm đối tượng"
            name="audience"
            defaultValue={lines(skill.audience ?? [])}
            maxLength={1400}
            multiline
            rows={6}
          />
          <CountInput
            label="Hướng dẫn sử dụng — mỗi dòng là một bước"
            name="usage_steps"
            defaultValue={lines(skill.usage_steps)}
            maxLength={2600}
            multiline
            rows={10}
          />
          <CountInput
            label="Hướng dẫn thanh toán / lưu ý bàn giao"
            name="payment_note"
            defaultValue={skill.payment_note}
            maxLength={1400}
            multiline
            rows={7}
          />
        </div>
      </section>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-foreground">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}
function CountInput({
  label,
  name,
  defaultValue,
  maxLength,
  multiline = false,
  rows = 1,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  maxLength: number;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => setValue(defaultValue), [defaultValue]);
  const counter = (
    <p
      className={`mt-1 text-right text-xs ${value.length > maxLength * 0.9 ? "text-amber-700" : "text-muted-foreground"}`}
    >
      {value.length}/{maxLength} ký tự · còn {Math.max(0, maxLength - value.length)}
    </p>
  );
  return (
    <label className="block text-sm font-semibold text-foreground">
      <span className="mb-2 block">{label}</span>
      {multiline ? (
        <textarea
          key={`${name}-${defaultValue}`}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={maxLength}
          rows={rows}
          required={required}
          className="input min-h-36 resize-y leading-7"
        />
      ) : (
        <input
          key={`${name}-${defaultValue}`}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={maxLength}
          required={required}
          className="input h-12"
        />
      )}
      {counter}
    </label>
  );
}
function Alert({
  tone,
  text,
  onClose,
}: {
  tone: "error" | "success";
  text: string;
  onClose: () => void;
}) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${tone === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-600/20 bg-emerald-50 text-emerald-800"}`}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1">{text}</p>
      <button onClick={onClose} className="font-bold" aria-label="Đóng thông báo">
        ×
      </button>
    </div>
  );
}
function LoadingPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-soft-gradient">
      <LoaderCircle className="size-8 animate-spin text-primary" />
    </main>
  );
}
function SetupMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-soft-gradient px-5 text-center">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
        <CircleAlert className="mx-auto size-8 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{message}</p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-foreground px-5 text-sm font-bold text-background"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
function LoginPage({
  email,
  setEmail,
  isSaving,
  sent,
  error,
  onSubmit,
}: {
  email: string;
  setEmail: (value: string) => void;
  isSaving: boolean;
  sent: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-soft-gradient px-5">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">SanCongCu</p>
        <h1 className="mt-3 text-3xl font-bold">Đăng nhập quản trị</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Nhập email quản trị. Chúng tôi sẽ gửi một liên kết đăng nhập an toàn, không cần mật khẩu.
        </p>
        {error && (
          <div className="mt-5">
            <Alert tone="error" text={error} onClose={() => {}} />
          </div>
        )}
        {sent ? (
          <div className="mt-6 rounded-xl bg-primary/10 p-4 text-sm leading-6 text-primary">
            <Check className="mb-2 size-5" />
            Đã gửi liên kết. Hãy mở email và bấm liên kết để quay lại trang quản trị.
          </div>
        ) : (
          <form onSubmit={(event) => void onSubmit(event)} className="mt-6">
            <Field label="Email quản trị">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="input"
              />
            </Field>
            <button
              disabled={isSaving}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 font-bold text-primary-foreground shadow-brand transition hover:opacity-90 disabled:opacity-60"
            >
              {isSaving && <LoaderCircle className="size-4 animate-spin" />}
              {isSaving ? "Đang gửi" : "Gửi liên kết đăng nhập"}
            </button>
          </form>
        )}
        <Link
          to="/"
          className="mt-5 inline-flex text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          ← Về trang chủ
        </Link>
      </section>
    </main>
  );
}

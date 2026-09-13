import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CircleUserRound,
  History,
  LoaderCircle,
  LogOut,
  Save,
  Settings,
  WalletCards,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/tai-khoan")({ component: AccountPage });

type Profile = { display_name: string; email: string | null; phone: string | null };
type Wallet = { balance_vnd: number };
type WalletLedgerItem = {
  id: string;
  entry_type: "topup" | "hold" | "charge" | "release" | "refund" | "adjustment";
  direction: "credit" | "debit";
  amount_vnd: number;
  note: string;
  created_at: string;
};
type Topup = {
  id: string;
  amount_vnd: number;
  credited_amount_vnd: number;
  transfer_code: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};
const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const parseAmount = (value: string) => Number(value.replace(/\D/g, "")) || 0;
const formatAmountInput = (value: string) => {
  const amount = parseAmount(value);
  return amount ? amount.toLocaleString("vi-VN") : "";
};
const topupCreditFor = (amount: number) => {
  if (amount === 100000) return 110000;
  if (amount === 200000) return 250000;
  if (amount === 500000) return 750000;
  return amount;
};
const topupOptions = [
  { amount: 10000 },
  { amount: 20000 },
  { amount: 50000 },
  { amount: 100000, discount: "Ưu đãi 10%" },
  { amount: 200000, discount: "Ưu đãi 25%" },
  { amount: 500000, discount: "Ưu đãi 50%" },
];

function normalizePhone(value: string) {
  const cleaned = value.replace(/[\s().-]/g, "");
  if (/^0\d{9}$/.test(cleaned)) return `+84${cleaned.slice(1)}`;
  if (/^84\d{9}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}

function phoneLoginEmail(phone: string) {
  return `phone-${phone.replace(/\D/g, "")}@phone.sancongcu.invalid`;
}

function translateAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Email/số điện thoại hoặc mật khẩu chưa đúng. Vui lòng thử lại.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Hãy kiểm tra hộp thư rồi thử đăng nhập lại.";
  }
  if (normalized.includes("user already registered")) {
    return "Email hoặc số điện thoại này đã được đăng ký. Hãy đăng nhập thay vì tạo tài khoản mới.";
  }
  if (normalized.includes("password should be")) {
    return "Mật khẩu chưa đủ điều kiện. Hãy dùng ít nhất 6 ký tự.";
  }
  return "Không thể hoàn tất yêu cầu. Vui lòng kiểm tra thông tin và thử lại.";
}

const ledgerLabels: Record<WalletLedgerItem["entry_type"], string> = {
  topup: "Nạp tiền",
  hold: "Tạm giữ chi phí",
  charge: "Sử dụng Webapp",
  release: "Hoàn giữ tiền",
  refund: "Hoàn tiền",
  adjustment: "Điều chỉnh số dư",
};

function AccountPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<WalletLedgerItem[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [activeTopup, setActiveTopup] = useState<Topup | null>(null);
  const [topupAmount, setTopupAmount] = useState("50.000");
  const [showTopup, setShowTopup] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const topupCreditPreview = topupCreditFor(parseAmount(topupAmount));
  const [fullName, setFullName] = useState("");
  const [identityType, setIdentityType] = useState<"email" | "phone">("email");
  const [identity, setIdentity] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordConfirmationTouched, setPasswordConfirmationTouched] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const load = async (id: string | null) => {
      setUserId(id);
      if (!id) {
        setProfile(null);
        setWallet(null);
        setLedger([]);
        setActiveTopup(null);
        return;
      }
      const [profileResult, walletResult, ledgerResult, topupResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,email,phone")
          .eq("user_id", id)
          .maybeSingle(),
        supabase.from("wallets").select("balance_vnd").eq("user_id", id).maybeSingle(),
        supabase
          .from("wallet_ledger")
          .select("id,entry_type,direction,amount_vnd,note,created_at")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("wallet_topups")
          .select("id,amount_vnd,credited_amount_vnd,transfer_code,status,created_at")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setProfile((profileResult.data as Profile | null) ?? null);
      setDisplayName((profileResult.data as Profile | null)?.display_name ?? "");
      setWallet((walletResult.data as Wallet | null) ?? null);
      setLedger((ledgerResult.data as WalletLedgerItem[] | null) ?? []);
      setTopups((topupResult.data as Topup[] | null) ?? []);
    };
    void supabase.auth.getUser().then(({ data }) => void load(data.user?.id ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user.id ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const commonOptions = { data: { full_name: fullName.trim() } };
    if (mode === "signup" && password !== passwordConfirmation) {
      setError("Mật khẩu nhập lại chưa khớp.");
      setPasswordConfirmationTouched(true);
      setBusy(false);
      return;
    }
    if (
      mode === "signup" &&
      identityType === "phone" &&
      normalizePhone(identity) !== normalizePhone(phoneConfirmation)
    ) {
      setError("Số điện thoại nhập lại chưa khớp.");
      setBusy(false);
      return;
    }
    const normalizedIdentity =
      identityType === "phone" ? normalizePhone(identity) : identity.trim();
    if (identityType === "phone" && !/^\+\d{8,15}$/.test(normalizedIdentity)) {
      setError("Hãy nhập số điện thoại hợp lệ, ví dụ 0912 345 678.");
      setBusy(false);
      return;
    }
    if (mode === "signup" && identityType === "phone") {
      const { data, error: signupError } = await supabase.functions.invoke("phone-signup", {
        body: { phone: normalizedIdentity, password, fullName: fullName.trim() },
      });
      if (signupError || data?.error) {
        setError(data?.error || "Không thể tạo tài khoản. Vui lòng thử lại.");
        setBusy(false);
        return;
      }
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: phoneLoginEmail(normalizedIdentity),
        password,
      });
      setBusy(false);
      if (loginError) {
        setError(translateAuthError(loginError.message));
        return;
      }
      setNotice("Tạo tài khoản thành công. Số dư của bạn đã sẵn sàng.");
      return;
    }
    const result =
      mode === "signup"
        ? identityType === "email"
          ? await supabase.auth.signUp({
              email: normalizedIdentity,
              password,
              options: commonOptions,
            })
          : await supabase.auth.signUp({
              phone: normalizedIdentity,
              password,
              options: commonOptions,
            })
        : identityType === "email"
          ? await supabase.auth.signInWithPassword({ email: normalizedIdentity, password })
          : await supabase.auth.signInWithPassword({
              email: phoneLoginEmail(normalizedIdentity),
              password,
            });
    setBusy(false);
    if (result.error) {
      setError(translateAuthError(result.error.message));
      return;
    }
    if (
      mode === "signup" &&
      identityType === "email" &&
      result.data.user?.identities?.length === 0
    ) {
      setError(
        "Email này đã có tài khoản. Nếu bạn từng đăng nhập bằng Google, hãy bấm “Tiếp tục với Google”.",
      );
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setNotice(
        identityType === "email"
          ? "Hãy kiểm tra email để xác nhận tài khoản trước khi đăng nhập."
          : "Tài khoản đã được tạo. Bạn có thể đăng nhập bằng số điện thoại và mật khẩu.",
      );
      return;
    }
    setNotice("Đăng nhập thành công. Ví của bạn đã sẵn sàng.");
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/tai-khoan` },
    });
    if (authError) {
      setError(translateAuthError(authError.message));
      setBusy(false);
    }
  }

  async function saveAccountSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !userId) return;
    setBusy(true);
    setError(null);
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", userId)
      .select("display_name,email,phone")
      .single();
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setProfile(data as Profile);
    setNotice("Đã lưu cài đặt tài khoản.");
  }

  async function createTopup() {
    if (!supabase) return;
    const amount = parseAmount(topupAmount);
    if (!Number.isInteger(amount) || amount < 5000) {
      setError("Số tiền nạp tối thiểu là 5.000đ.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error: topupError } = await supabase.rpc("create_wallet_topup", {
      p_amount_vnd: amount,
    });
    setBusy(false);
    if (topupError || !data) {
      setError("Không thể tạo yêu cầu nạp tiền. Vui lòng thử lại.");
      return;
    }
    setTopups((current) => [data as Topup, ...current]);
    setActiveTopup(data as Topup);
    setNotice("Đã tạo mã nạp tiền. Hãy chuyển khoản đúng số tiền và nội dung bên dưới.");
  }

  if (!supabase) {
    return (
      <main className="grid min-h-screen place-items-center bg-soft-gradient p-6">
        Chưa kết nối dịch vụ tài khoản.
      </main>
    );
  }

  if (userId) {
    return (
      <main className="min-h-screen bg-soft-gradient px-4 py-8 sm:px-6 sm:py-12">
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-card p-5 shadow-card sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
                Tài khoản SanCongCu
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Xin chào{profile?.display_name ? `, ${profile.display_name}` : ""}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Quản lý số dư và các Webapp Skill của bạn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold hover:bg-muted"
            >
              <LogOut className="size-4" /> Đăng xuất
            </button>
          </div>
          <section id="so-du" className="mt-8 rounded-2xl bg-foreground p-5 text-background sm:p-6">
            <div className="flex items-center gap-2 text-background/70">
              <WalletCards className="size-5" /> Số dư
            </div>
            <p className="mt-3 text-4xl font-extrabold">
              {(wallet?.balance_vnd ?? 0).toLocaleString("vi-VN")}đ
            </p>
            <p className="mt-2 text-sm text-background/70">
              Số dư sẽ được dùng khi tạo ảnh hoặc dùng Webapp Skill.
            </p>
            <button
              type="button"
              onClick={() => setShowTopup((value) => !value)}
              className="mt-5 min-h-11 rounded-full bg-background px-5 py-3 text-sm font-bold text-foreground transition hover:bg-background/90"
            >
              {showTopup ? "Đóng nạp tiền" : "Nạp tiền"}
            </button>
            {showTopup && (
              <div className="mt-5 rounded-2xl bg-background p-4 text-foreground sm:p-5">
                <h2 className="text-lg font-bold">Nạp số dư bằng chuyển khoản</h2>
                <label className="mt-4 block text-sm font-bold">
                  Số tiền muốn nạp
                  <input
                    value={topupAmount}
                    onChange={(event) => setTopupAmount(formatAmountInput(event.target.value))}
                    inputMode="numeric"
                    className="input mt-2 h-12"
                    placeholder="Ví dụ: 50.000"
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {topupOptions.map(({ amount, discount }) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTopupAmount(amount.toLocaleString("vi-VN"))}
                      aria-pressed={parseAmount(topupAmount) === amount}
                      className={`relative min-h-14 rounded-xl border px-3 py-2 text-left text-sm font-extrabold transition hover:border-primary hover:bg-primary/5 ${
                        parseAmount(topupAmount) === amount
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card"
                      }`}
                    >
                      <span className="whitespace-nowrap">{formatVnd(amount)}</span>
                      {discount && (
                        <span className="absolute -right-1 -top-2 whitespace-nowrap rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                          {discount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {topupCreditPreview > parseAmount(topupAmount) && (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    Ưu đãi nạp tiền: chuyển {formatVnd(parseAmount(topupAmount))}, số dư nhận được{" "}
                    {formatVnd(topupCreditPreview)}.
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void createTopup()}
                  className="mt-4 min-h-12 w-full rounded-full bg-brand-gradient px-4 font-bold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? "Đang tạo mã nạp…" : "Tạo mã nạp tiền"}
                </button>
                {activeTopup && (
                  <div className="mt-5 rounded-xl bg-muted p-4 text-sm">
                    <img
                      src={`https://img.vietqr.io/image/TCB-8663769668-compact2.png?amount=${activeTopup.amount_vnd}&addInfo=${encodeURIComponent(activeTopup.transfer_code)}&accountName=${encodeURIComponent("HỘ KINH DOANH SUMOI")}`}
                      alt="Mã QR nạp tiền"
                      className="mx-auto w-48 rounded-xl border border-border"
                    />
                    <p className="mt-4 flex justify-between gap-3">
                      <span>Số tiền</span>
                      <strong>{formatVnd(activeTopup.amount_vnd)}</strong>
                    </p>
                    {activeTopup.credited_amount_vnd > activeTopup.amount_vnd && (
                      <p className="mt-2 font-bold text-emerald-700">
                        Số dư nhận được: {formatVnd(activeTopup.credited_amount_vnd)} · tặng thêm{" "}
                        {formatVnd(activeTopup.credited_amount_vnd - activeTopup.amount_vnd)}
                      </p>
                    )}
                    <p className="mt-2 border-t border-border pt-3">
                      Nội dung CK:{" "}
                      <strong className="font-mono">{activeTopup.transfer_code}</strong>
                    </p>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Sau khi chuyển khoản, số dư sẽ được cộng khi quản trị xác nhận.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
          <section className="mt-6 grid gap-4 rounded-2xl border border-border p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                Email
              </p>
              <p className="mt-2 break-all font-semibold">{profile?.email || "Chưa liên kết"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                Số điện thoại
              </p>
              <p className="mt-2 font-semibold">{profile?.phone || "Chưa liên kết"}</p>
            </div>
          </section>
          <section id="cai-dat" className="mt-6 rounded-2xl border border-border p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Settings className="size-5 text-primary" />
              <h2 className="text-xl font-bold">Cài đặt tài khoản</h2>
            </div>
            <form onSubmit={(event) => void saveAccountSettings(event)} className="mt-5">
              <label className="block text-sm font-bold">
                Tên hiển thị
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="input mt-2 h-12"
                  maxLength={80}
                />
              </label>
              <button
                disabled={busy}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-gradient px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}{" "}
                Lưu cài đặt
              </button>
            </form>
          </section>
          <section id="lich-su" className="mt-6 rounded-2xl border border-border p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              <h2 className="text-xl font-bold">Lịch sử sử dụng</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Mọi khoản nạp, sử dụng, hoàn tiền và điều chỉnh số dư sẽ được lưu tại đây.
            </p>
            {ledger.length ? (
              <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
                {ledger.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="font-bold">{ledgerLabels[item.entry_type]}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("vi-VN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.created_at))}
                        {item.note ? ` · ${item.note}` : ""}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 font-extrabold ${item.direction === "credit" ? "text-emerald-700" : "text-destructive"}`}
                    >
                      {item.direction === "credit" ? "+" : "−"}
                      {item.amount_vnd.toLocaleString("vi-VN")}đ
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 rounded-xl bg-muted p-5 text-sm leading-6 text-muted-foreground">
                Chưa có giao dịch. Lịch sử sẽ xuất hiện sau khi bạn nạp tiền hoặc sử dụng Webapp.
              </div>
            )}
          </section>
          <Link
            to="/"
            className="mt-7 inline-flex min-h-11 items-center rounded-full bg-brand-gradient px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Khám phá Webapp Skill →
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-soft-gradient px-4 py-8 sm:px-6">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-card sm:p-8">
        <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-primary">
          ← Về trang chủ
        </Link>
        <p className="mt-7 text-xs font-bold uppercase tracking-[.16em] text-primary">SanCongCu</p>
        <h1 className="mt-2 text-3xl font-bold">
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>
        <p className="mt-2 leading-7 text-muted-foreground">
          Một tài khoản dùng cho mọi Webapp Skill.
        </p>
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={busy}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 font-bold text-muted-foreground transition hover:bg-muted disabled:opacity-60"
        >
          {busy ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <CircleUserRound className="size-5" />
          )}
          Tiếp tục với Google
        </button>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          hoặc
          <span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={(event) => void submit(event)}>
          {mode === "signup" && (
            <label className="block text-sm font-bold">
              Tên hiển thị
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="input mt-2 h-12"
                placeholder="Tên của bạn"
              />
            </label>
          )}
          <div
            className={`mt-4 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-bold ${mode === "signup" ? "" : "mt-0"}`}
          >
            <button
              type="button"
              onClick={() => setIdentityType("email")}
              aria-pressed={identityType === "email"}
              className={`min-h-10 rounded-lg px-3 transition ${identityType === "email" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setIdentityType("phone")}
              aria-pressed={identityType === "phone"}
              className={`min-h-10 rounded-lg px-3 transition ${identityType === "phone" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              Số điện thoại
            </button>
          </div>
          <label className="mt-4 block text-sm font-bold">
            {identityType === "email" ? "Email" : "Số điện thoại"}
            <input
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              className="input mt-2 h-12"
              type={identityType === "email" ? "email" : "tel"}
              inputMode={identityType === "email" ? "email" : "tel"}
              placeholder={identityType === "email" ? "email@domain.com" : "+84…"}
              required
              autoComplete="username"
            />
          </label>
          {mode === "signup" && identityType === "phone" && (
            <label className="mt-4 block text-sm font-bold">
              Nhập lại số điện thoại
              <input
                value={phoneConfirmation}
                onChange={(event) => setPhoneConfirmation(event.target.value)}
                className="input mt-2 h-12"
                type="tel"
                inputMode="tel"
                placeholder="Nhập lại đúng số điện thoại ở trên"
                required
                autoComplete="tel"
              />
              <span className="mt-2 block text-xs font-normal leading-5 text-muted-foreground">
                Nhập lại số điện thoại để hạn chế lỗi gõ nhầm.
              </span>
            </label>
          )}
          <label className="mt-4 block text-sm font-bold">
            Mật khẩu
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={6}
              className="input mt-2 h-12"
              placeholder="Tối thiểu 6 ký tự"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {mode === "signup" && (
            <label className="mt-4 block text-sm font-bold">
              Nhập lại mật khẩu
              <input
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                onBlur={() => setPasswordConfirmationTouched(true)}
                type="password"
                minLength={6}
                aria-invalid={passwordConfirmationTouched && password !== passwordConfirmation}
                aria-describedby={
                  passwordConfirmationTouched && password !== passwordConfirmation
                    ? "password-confirmation-error"
                    : undefined
                }
                className="input mt-2 h-12"
                placeholder="Nhập lại mật khẩu"
                required
                autoComplete="new-password"
              />
              {passwordConfirmationTouched && password !== passwordConfirmation && (
                <span
                  id="password-confirmation-error"
                  className="mt-2 block text-xs font-medium text-red-700"
                >
                  Mật khẩu nhập lại chưa khớp.
                </span>
              )}
            </label>
          )}
          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium leading-6 text-red-700"
            >
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
          <button
            disabled={busy}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setNotice(null);
            setPhoneConfirmation("");
            setPasswordConfirmation("");
            setPasswordConfirmationTouched(false);
          }}
          className="mt-5 w-full text-sm font-bold text-primary hover:underline"
        >
          {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </section>
    </main>
  );
}

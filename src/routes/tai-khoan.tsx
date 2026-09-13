import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CircleUserRound, LoaderCircle, LogOut, WalletCards } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/tai-khoan")({ component: AccountPage });

type Profile = { display_name: string; email: string | null; phone: string | null };
type Wallet = { balance_vnd: number };

function AccountPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [identityType, setIdentityType] = useState<"email" | "phone">("email");
  const [identity, setIdentity] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState("");
  const [password, setPassword] = useState("");
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
        return;
      }
      const [profileResult, walletResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,email,phone")
          .eq("user_id", id)
          .maybeSingle(),
        supabase.from("wallets").select("balance_vnd").eq("user_id", id).maybeSingle(),
      ]);
      setProfile((profileResult.data as Profile | null) ?? null);
      setWallet((walletResult.data as Wallet | null) ?? null);
    };
    void supabase.auth.getUser().then(({ data }) => void load(data.user?.id ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user.id ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/tai-khoan` },
    });
    if (authError) {
      setError(authError.message);
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const commonOptions = { data: { full_name: fullName.trim() } };
    if (
      mode === "signup" &&
      identityType === "phone" &&
      identity.trim() !== phoneConfirmation.trim()
    ) {
      setError("Số điện thoại nhập lại chưa khớp.");
      setBusy(false);
      return;
    }
    const result =
      mode === "signup"
        ? identityType === "email"
          ? await supabase.auth.signUp({ email: identity.trim(), password, options: commonOptions })
          : await supabase.auth.signUp({ phone: identity.trim(), password, options: commonOptions })
        : identityType === "email"
          ? await supabase.auth.signInWithPassword({ email: identity.trim(), password })
          : await supabase.auth.signInWithPassword({ phone: identity.trim(), password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
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
                Quản lý ví và các Webapp Skill của bạn.
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
          <section className="mt-8 rounded-2xl bg-foreground p-5 text-background sm:p-6">
            <div className="flex items-center gap-2 text-background/70">
              <WalletCards className="size-5" /> Ví SanCongCu
            </div>
            <p className="mt-3 text-4xl font-extrabold">
              {(wallet?.balance_vnd ?? 0).toLocaleString("vi-VN")}đ
            </p>
            <p className="mt-2 text-sm text-background/70">
              Số dư sẽ được dùng khi tạo ảnh hoặc dùng Webapp Skill.
            </p>
            <button
              type="button"
              disabled
              className="mt-5 min-h-11 rounded-full bg-background px-5 py-3 text-sm font-bold text-foreground opacity-60"
            >
              Nạp tiền — sắp mở
            </button>
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
          Một tài khoản, một ví, dùng cho mọi Webapp Skill.
        </p>
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={busy}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 font-bold transition hover:bg-muted disabled:opacity-60"
        >
          <CircleUserRound className="size-5" /> Tiếp tục với Google
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
                Chúng tôi dùng bước này để hạn chế lỗi gõ nhầm số; hiện chưa gửi SMS xác thực.
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
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
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
          }}
          className="mt-5 w-full text-sm font-bold text-primary hover:underline"
        >
          {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </section>
    </main>
  );
}

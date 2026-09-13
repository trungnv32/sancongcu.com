import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sancongcu.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(value: string) {
  const cleaned = value.replace(/[\s().-]/g, "");
  if (/^0\d{9}$/.test(cleaned)) return `+84${cleaned.slice(1)}`;
  if (/^84\d{9}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Phương thức không được hỗ trợ." }, 405);

  const origin = request.headers.get("origin");
  if (origin && origin !== "https://sancongcu.com") {
    return json({ error: "Nguồn yêu cầu không hợp lệ." }, 403);
  }

  const payload = await request.json().catch(() => null);
  const phone = normalizePhone(typeof payload?.phone === "string" ? payload.phone : "");
  const password = typeof payload?.password === "string" ? payload.password : "";
  const fullName =
    typeof payload?.fullName === "string" ? payload.fullName.trim().slice(0, 80) : "";

  if (!/^\+\d{8,15}$/.test(phone)) {
    return json({ error: "Số điện thoại không hợp lệ." }, 400);
  }
  if (password.length < 6) {
    return json({ error: "Mật khẩu cần có ít nhất 6 ký tự." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return json({ error: "Dịch vụ tài khoản chưa sẵn sàng." }, 503);

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const internalEmail = `phone-${phone.replace(/\D/g, "")}@phone.sancongcu.invalid`;
  const { error } = await admin.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone_number: phone },
  });

  if (error) {
    const isDuplicate = /already been registered|already exists/i.test(error.message);
    return json(
      {
        error: isDuplicate
          ? "Số điện thoại này đã được đăng ký. Hãy đăng nhập."
          : "Không thể tạo tài khoản. Vui lòng thử lại.",
      },
      isDuplicate ? 409 : 500,
    );
  }

  return json({ message: "Đã tạo tài khoản." }, 201);
});

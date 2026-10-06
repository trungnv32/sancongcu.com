import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://sancongcu.com",
  "https://www.sancongcu.com",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://sancongcu.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") {
    return json(request, { error: "Phương thức không được hỗ trợ." }, 405);
  }

  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    return json(request, { error: "Nguồn yêu cầu không hợp lệ." }, 403);
  }

  const payload = await request.json().catch(() => null);
  const resourceId = typeof payload?.resourceId === "string" ? payload.resourceId.trim() : "";
  const fullName = typeof payload?.fullName === "string" ? payload.fullName.trim().slice(0, 120) : "";
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (!resourceId || !isEmail(email)) {
    return json(request, { error: "Thông tin nhận tài nguyên chưa hợp lệ." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESOURCE_FROM_EMAIL") ?? "Sancongcu <noreply@sancongcu.com>";

  if (!url || !serviceRoleKey) {
    return json(request, { error: "Dịch vụ tài nguyên chưa sẵn sàng." }, 503);
  }
  if (!resendApiKey) {
    return json(request, { error: "Chưa cấu hình dịch vụ gửi email." }, 503);
  }

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: resource, error: resourceError } = await admin
    .from("free_resources")
    .select("id,title,description,file_url,file_name,is_visible")
    .eq("id", resourceId)
    .eq("is_visible", true)
    .maybeSingle();

  if (resourceError) return json(request, { error: "Không thể đọc tài nguyên." }, 500);
  if (!resource || !resource.file_url) {
    return json(request, { error: "Tài nguyên này chưa sẵn sàng để tải." }, 404);
  }

  const { data: lead } = await admin
    .from("free_resource_leads")
    .insert({
      resource_id: resource.id,
      resource_title: resource.title,
      full_name: fullName,
      email,
      file_url: resource.file_url,
      file_name: resource.file_name ?? "",
      email_status: "pending",
    })
    .select("id")
    .single();

  const subject = `Link tải: ${resource.title}`;
  const safeName = fullName.replace(/[<>&"]/g, "");
  const safeTitle = String(resource.title).replace(/[<>&"]/g, "");
  const greeting = safeName ? `Chào ${safeName},` : "Chào anh/chị,";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <p>${greeting}</p>
      <p>Đây là link tải tài nguyên <strong>${safeTitle}</strong> từ sancongcu.com:</p>
      <p><a href="${resource.file_url}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Tải tài nguyên</a></p>
      <p>Nếu nút không mở được, anh/chị có thể dùng link này:<br><a href="${resource.file_url}">${resource.file_url}</a></p>
      <p>Chúc anh/chị sử dụng hiệu quả.</p>
      <p>Email này chỉ gửi, vui lòng không reply lại email này.</p>
    </div>
  `;

  const mailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject,
      html,
    }),
  });

  const mailPayload = await mailResponse.json().catch(() => null);

  if (!mailResponse.ok) {
    const resendError =
      typeof mailPayload?.message === "string"
        ? mailPayload.message
        : typeof mailPayload?.error === "string"
          ? mailPayload.error
          : "Resend chưa gửi được email.";
    if (lead?.id) {
      await admin
        .from("free_resource_leads")
        .update({
          email_status: "failed",
          email_error: resendError.slice(0, 500),
        })
        .eq("id", lead.id);
    }
    return json(request, { error: `Resend báo lỗi: ${resendError}` }, 502);
  }

  if (lead?.id) {
    await admin
      .from("free_resource_leads")
      .update({
        email_status: "sent",
        resend_email_id: typeof mailPayload?.id === "string" ? mailPayload.id : "",
        sent_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  }

  return json(request, { message: "Đã gửi link tải vào email. Vui lòng kiểm tra hộp thư." });
});

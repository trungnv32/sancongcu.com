import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function response(body: string, status = 200, contentType = "text/markdown; charset=utf-8") {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET")
    return response("Method not allowed", 405, "text/plain; charset=utf-8");

  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token || token.length < 32) return response("Không tìm thấy quyền cài đặt Skill.", 404);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return response("Dịch vụ cài đặt đang chưa sẵn sàng.", 503);

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: entitlement, error } = await admin
    .from("skill_entitlements")
    .select(
      "id, install_count, max_installs, revoked_at, skill_packages!inner(file_path, file_name, content_type, skills!inner(slug, title))",
    )
    .eq("install_token", token)
    .maybeSingle();

  if (
    error ||
    !entitlement ||
    entitlement.revoked_at ||
    entitlement.install_count >= entitlement.max_installs
  ) {
    return response("Không tìm thấy quyền cài đặt Skill.", 404);
  }

  const packageRow = entitlement.skill_packages as unknown as {
    file_path: string;
    file_name: string;
    content_type: string;
    skills: { slug: string; title: string } | { slug: string; title: string }[];
  } | null;
  if (!packageRow?.file_path) return response("Gói cài đặt chưa hoàn chỉnh.", 503);
  const skill = Array.isArray(packageRow.skills) ? packageRow.skills[0] : packageRow.skills;
  if (!skill) return response("Gói cài đặt chưa hoàn chỉnh.", 503);

  const { error: countError } = await admin
    .from("skill_entitlements")
    .update({
      install_count: entitlement.install_count + 1,
      last_installed_at: new Date().toISOString(),
    })
    .eq("id", entitlement.id);
  if (countError) return response("Không thể xác thực quyền cài đặt. Vui lòng thử lại.", 503);

  const isMarkdown =
    packageRow.content_type === "text/markdown" ||
    packageRow.file_name.toLowerCase().endsWith(".md");
  if (isMarkdown) {
    const { data: file, error: downloadError } = await admin.storage
      .from("skill-packages")
      .download(packageRow.file_path);
    if (downloadError || !file) return response("Không thể đọc gói Skill. Vui lòng thử lại.", 503);
    return response(await file.text());
  }

  const { data: signed, error: signedError } = await admin.storage
    .from("skill-packages")
    .createSignedUrl(packageRow.file_path, 600, { download: packageRow.file_name });
  if (signedError || !signed?.signedUrl)
    return response("Không thể chuẩn bị gói Skill. Vui lòng thử lại.", 503);

  return response(`---
name: sancongcu-install-${skill.slug}
description: "Cài đặt gói Skill đã được cấp quyền từ SanCongCu."
---

# Gói cài đặt: ${skill.title}

Đây là gói Skill đã được cấp quyền. Hãy tải tệp ZIP bên dưới, giải nén vào thư mục
Skill cá nhân của người dùng dưới tên \`${skill.slug}\`, giữ nguyên cấu trúc tệp trong
gói và xác nhận có \`SKILL.md\` ở thư mục gốc. Không chạy script hoặc cài phần mềm hệ
thống nếu người dùng chưa chấp thuận.

Tải gói trong 10 phút: ${signed.signedUrl}
`);
});

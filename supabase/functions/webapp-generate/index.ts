import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://sancongcu.com", "http://localhost:8080"]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sancongcu.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function message(error: unknown) {
  const value = error instanceof Error ? error.message : String(error);
  if (value.includes("INSUFFICIENT_BALANCE"))
    return "Số dư không đủ. Hãy nạp thêm tiền để tiếp tục.";
  if (value.includes("WEBAPP_UNAVAILABLE")) return "Webapp này hiện chưa sẵn sàng.";
  return "Không thể tạo ảnh lúc này. Số dư của bạn sẽ được hoàn lại nếu đã bị trừ.";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Phương thức không được hỗ trợ." }, 405);
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin))
    return json({ error: "Nguồn yêu cầu không hợp lệ." }, 403);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return json({ error: "Dịch vụ chưa sẵn sàng." }, 503);
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: authData } = token ? await auth.auth.getUser(token) : { data: { user: null } };
  if (!authData.user) return json({ error: "Vui lòng đăng nhập để sử dụng Webapp." }, 401);
  const db = createClient(url, serviceRole, { auth: { persistSession: false } });

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await request.json().catch(() => ({}));
    if (payload.action !== "history") return json({ error: "Yêu cầu không hợp lệ." }, 400);
    const { data: jobs, error } = await db
      .from("webapp_jobs")
      .select(
        "id,status,quoted_amount_vnd,output_paths,error_message,created_at,completed_at,skills(title)",
      )
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return json({ error: "Không thể tải lịch sử." }, 500);
    const items = await Promise.all(
      (jobs ?? []).map(async (job) => {
        const urls = await Promise.all(
          ((job.output_paths as string[]) ?? []).map(
            async (path) =>
              (await db.storage.from("webapp-outputs").createSignedUrl(path, 3600)).data
                ?.signedUrl ?? null,
          ),
        );
        return { ...job, output_urls: urls.filter(Boolean) };
      }),
    );
    return json({ jobs: items });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey)
    return json({ error: "Dịch vụ tạo ảnh đang được cấu hình. Vui lòng quay lại sau." }, 503);
  const form = await request.formData();
  const slug = String(form.get("skill_slug") || "").trim();
  const instruction = String(form.get("instruction") || "").trim();
  const requestedOutputCount = Number(form.get("output_count") || 1);
  const includeCover = String(form.get("include_cover") || "false") === "true";
  const logoPosition = String(form.get("logo_position") || "none");
  const files = form.getAll("images").filter((item): item is File => item instanceof File);
  const logo = form.get("logo");
  if (!slug || files.length < 1) return json({ error: "Hãy tải ít nhất một ảnh sản phẩm." }, 400);
  if (
    files.some(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 10 * 1024 * 1024,
    )
  )
    return json({ error: "Mỗi ảnh phải là JPG, PNG hoặc WebP và tối đa 10 MB." }, 400);
  if (logo instanceof File && (logo.type !== "image/png" || logo.size > 5 * 1024 * 1024))
    return json({ error: "Logo phải là ảnh PNG trong suốt và tối đa 5 MB." }, 400);
  if (!["none", "top-left", "top-right", "center"].includes(logoPosition))
    return json({ error: "Vị trí logo không hợp lệ." }, 400);
  if (logoPosition !== "none" && !(logo instanceof File))
    return json({ error: "Hãy tải logo PNG trước khi chọn vị trí hiển thị logo." }, 400);
  const { data: skill } = await db
    .from("skills")
    .select("id,title,webapp_config")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("webapp_enabled", true)
    .maybeSingle();
  if (!skill) return json({ error: "Webapp này hiện chưa sẵn sàng." }, 404);
  const config = (skill.webapp_config ?? {}) as Record<string, unknown>;
  const limit = Math.max(1, Math.min(4, Number(config.input_limit) || 1));
  const minInput = Math.min(limit, Math.max(1, Number(config.input_min) || 1));
  if (files.length < minInput)
    return json({ error: `Webapp này cần tối thiểu ${minInput} ảnh đầu vào.` }, 400);
  if (files.length > limit)
    return json({ error: `Webapp này nhận tối đa ${limit} ảnh đầu vào.` }, 400);
  const outputCount = Math.max(1, Math.min(4, requestedOutputCount));
  const stamp = `${authData.user.id}/${crypto.randomUUID()}`;
  const inputPaths: string[] = [];
  try {
    for (const [index, file] of files.entries()) {
      const extension =
        file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${stamp}/input-${index}.${extension}`;
      const { error } = await db.storage
        .from("webapp-inputs")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      inputPaths.push(path);
    }
    if (logo instanceof File) {
      const logoPath = `${stamp}/logo.png`;
      const { error } = await db.storage
        .from("webapp-inputs")
        .upload(logoPath, logo, { contentType: "image/png" });
      if (error) throw error;
      inputPaths.push(logoPath);
    }
    const { data: job, error: jobError } = await db.rpc("webapp_start_job", {
      p_user_id: authData.user.id,
      p_skill_id: skill.id,
      p_input_paths: inputPaths,
      p_instruction: instruction,
      p_output_count: outputCount,
      p_has_logo: logo instanceof File && logoPosition !== "none",
    });
    if (jobError || !job) throw jobError ?? new Error("Không thể tạo lượt xử lý.");
    const hardRequirements = [
      "RÀNG BUỘC BẮT BUỘC CỦA WEBAPP: các lựa chọn dưới đây có ưu tiên cao hơn mọi yêu cầu thêm của khách. Nếu có mâu thuẫn, bỏ qua phần mâu thuẫn trong yêu cầu thêm và tuân thủ các ràng buộc này.",
      `Chỉ tạo đúng ${outputCount} ảnh đầu ra, không nhiều hơn và không ít hơn.`,
      includeCover
        ? "Có đúng 1 ảnh bìa nổi bật trong tổng số ảnh đầu ra; các ảnh còn lại là ảnh sản phẩm theo yêu cầu."
        : "Không tạo ảnh bìa; chỉ tạo ảnh sản phẩm.",
      logo instanceof File && logoPosition !== "none"
        ? `Dùng logo PNG tham chiếu được tải kèm, giữ nguyên logo và đặt logo ở vị trí ${
            { "top-left": "trái trên", "top-right": "phải trên", center: "chính giữa" }[
              logoPosition as "top-left" | "top-right" | "center"
            ]
          }. Không thay đổi, không vẽ lại logo.`
        : "Không thêm logo vào ảnh.",
      "Giữ chính xác sản phẩm trong ảnh tham chiếu; không thêm chữ, logo hay watermark trừ khi được yêu cầu bởi ràng buộc bắt buộc ở trên.",
    ];
    const prompt = [
      String(config.prompt_template || ""),
      instruction
        ? `Yêu cầu thêm của khách (chỉ áp dụng khi không mâu thuẫn với ràng buộc bắt buộc): ${instruction}`
        : "",
      ...hardRequirements,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      const openaiForm = new FormData();
      openaiForm.append("model", String(config.model || "gpt-image-2"));
      openaiForm.append("prompt", prompt);
      openaiForm.append("size", "1024x1024");
      openaiForm.append("n", String(outputCount));
      // Pass every reference image in upload order; each Skill prompt defines their role.
      files.forEach((file) => openaiForm.append("image", file, file.name));
      if (logo instanceof File && logoPosition !== "none")
        openaiForm.append("image", logo, logo.name);
      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: openaiForm,
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data))
        throw new Error(result?.error?.message || "AI không thể tạo ảnh.");
      const outputPaths: string[] = [];
      for (const [index, image] of result.data.entries()) {
        if (!image.b64_json) continue;
        const bytes = Uint8Array.from(atob(image.b64_json), (char) => char.charCodeAt(0));
        const path = `${stamp}/output-${index}.png`;
        const { error } = await db.storage
          .from("webapp-outputs")
          .upload(path, bytes, { contentType: "image/png" });
        if (error) throw error;
        outputPaths.push(path);
      }
      if (!outputPaths.length) throw new Error("AI không trả về ảnh đầu ra.");
      await db.rpc("webapp_complete_job", { p_job_id: job.id, p_output_paths: outputPaths });
      const urls = await Promise.all(
        outputPaths.map(
          async (path) =>
            (await db.storage.from("webapp-outputs").createSignedUrl(path, 3600)).data?.signedUrl,
        ),
      );
      return json({ job: { ...job, status: "succeeded", output_urls: urls.filter(Boolean) } });
    } catch (generationError) {
      await db.rpc("webapp_fail_job", {
        p_job_id: job.id,
        p_error: generationError instanceof Error ? generationError.message : "Không thể tạo ảnh.",
      });
      return json({ error: message(generationError), refunded: true }, 502);
    }
  } catch (error) {
    return json({ error: message(error) }, 400);
  }
});

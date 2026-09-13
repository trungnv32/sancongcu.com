import { createServerFn } from "@tanstack/react-start";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://hxcucycjemuudlvaxhdk.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_5i2cKVLcW3jcq8JKJclBqw_1VMgRfO4";

type GenerationResponse = {
  error?: string;
  job?: unknown;
};

/**
 * Browser uploads reach this same-origin server endpoint first. The endpoint
 * only relays the request and never trusts the browser identity itself: the
 * supplied Supabase access token is verified again by webapp-generate.
 */
export const generateWebappImage = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Dữ liệu ảnh không hợp lệ.");

    const accessToken = data.get("_access_token");
    if (typeof accessToken !== "string" || !accessToken) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
    data.delete("_access_token");
    return { accessToken, body: data };
  })
  .handler(async ({ data }): Promise<GenerationResponse> => {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/webapp-generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.accessToken}`,
          apikey: supabasePublishableKey,
          "X-Client-Info": "sancongcu-webapp-server",
        },
        body: data.body,
      });
      const payload = (await response.json().catch(() => null)) as GenerationResponse | null;
      if (!response.ok) {
        return { error: payload?.error || "Dịch vụ tạo ảnh đang gặp sự cố. Vui lòng thử lại." };
      }
      return payload ?? { error: "Dịch vụ tạo ảnh trả về dữ liệu không hợp lệ." };
    } catch (error) {
      console.error("Webapp generation relay failed", error);
      return { error: "Không thể gửi yêu cầu tạo ảnh. Vui lòng thử lại." };
    }
  });

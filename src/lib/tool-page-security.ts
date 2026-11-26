import { supabaseUrl } from "./supabase";

/**
 * Trang công cụ (/cong-cu/...) xử lý ảnh và khoá AI của khách ngay trên trình duyệt, nên:
 * - không gắn script bên thứ ba (Cloudflare beacon, chat hỗ trợ), không tải phông từ Google;
 * - có chính sách bảo mật (CSP) chặt: chỉ chạy mã của chính web, chỉ gọi mạng tới chính web,
 *   Supabase của web (để đăng nhập) và 4 hãng AI mà khách tự chọn.
 */
export const isToolPath = (pathname: string) => pathname.startsWith("/cong-cu/");

const supabaseOrigin = (() => {
  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return "";
  }
})();

const AI_ORIGINS =
  "https://kymaapi.com https://generativelanguage.googleapis.com https://api.anthropic.com https://api.openai.com";

const baseDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  // Google Fonts chỉ để các trang khác hiển thị đúng khi khách bấm Quay lại; trang công cụ không tải.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace(/^https:/, "wss:")} ${AI_ORIGINS}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

/** Dùng trong thẻ <meta> (thẻ meta không hỗ trợ frame-ancestors). */
export const toolPageCspMeta = baseDirectives.join("; ");
/** Dùng làm header HTTP khi máy chủ trả trang công cụ. */
export const toolPageCspHeader = [...baseDirectives, "frame-ancestors 'self'"].join("; ");

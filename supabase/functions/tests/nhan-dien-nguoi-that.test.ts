// Nhận biết khách cần người thật (lỗi thật 27/11: "Cho a gặp a Trung" không được chuyển Telegram).
import { assert, assertFalse } from "jsr:@std/assert@1";
import { canChuyenNguoiThat } from "../tue-lam-chat/handler.ts";

type Row = { role: string; content: string };
const H = (...rows: Row[]) => rows as never;

Deno.test("31 viết tắt 'Cho a gặp a Trung' → chuyển người thật", () => {
  assert(canChuyenNguoiThat("Cho a gặp a Trung", H(), "Dạ, anh/chị cho em xin số điện thoại ạ.", false));
  for (const c of ["cho e gặp anh trung", "gặp admin", "muốn nói chuyện với a Trung", "chat trực tiếp với ad", "gặp a", "cho mình gặp người thật", "liên hệ anh trung"]) {
    assert(canChuyenNguoiThat(c, H(), "", false), c);
  }
});

Deno.test("32 khách để lại SĐT sau khi đã xin số cho yêu cầu gặp người thật → chuyển", () => {
  const h = H({ role: "customer", content: "Cho a gặp a Trung" }, { role: "assistant", content: "Dạ, anh/chị vui lòng cho em xin số điện thoại và nội dung cần trao đổi ạ." });
  assert(canChuyenNguoiThat("0912717374", h, "Dạ em ghi nhận rồi ạ.", true));
});

Deno.test("33 AI tự nói 'đã chuyển cho bộ phận' → phải chuyển thật", () => {
  assert(canChuyenNguoiThat("Chuyển chưa e", H(), "Dạ, em đã chuyển thông tin số điện thoại của anh cho bộ phận phụ trách rồi ạ.", false));
  assert(canChuyenNguoiThat("ok", H(), "Người phụ trách sẽ liên hệ lại với anh/chị sớm nhất ạ.", false));
});

Deno.test("34 câu thường không bị chuyển nhầm", () => {
  for (const c of ["bên em có khoá học AI nào không", "ảnh sản phẩm làm sao", "anh muốn mua skill edit video", "giá bao nhiêu", "gặp khó khăn khi cài"]) {
    assertFalse(canChuyenNguoiThat(c, H(), "Dạ, bên em có combo đào tạo ạ.", false), c);
  }
});

Deno.test("35 câu khách thấy không nhắc tên nhân sự nội bộ", async () => {
  const { HANDOFF_REPLY } = await import("../_shared/tue-lam.ts");
  assertFalse(/trung/i.test(HANDOFF_REPLY));
  const src = await Deno.readTextFile(new URL("../tue-lam-chat/handler.ts", import.meta.url));
  for (const m of src.matchAll(/reply = "([^"]+)"/g)) assertFalse(/trung/i.test(m[1]), m[1]);
});

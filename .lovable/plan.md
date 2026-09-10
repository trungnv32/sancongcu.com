
# Kế hoạch: Nâng cấp thành gian hàng thương mại điện tử

## Mục tiêu
Biến trang landing hiện tại thành một "chợ" thương mại điện tử chuyên nghiệp với 3 gian hàng (danh mục), mỗi gian là 1 hàng ngang chứa nhiều sản phẩm nhỏ. Giữ nguyên màu sắc coral/peach brand Lovable, giữ nguyên 2 ảnh/video hiện có, mỗi sản phẩm $2.

## Cấu trúc 3 gian hàng (mỗi hàng ngang = 1 danh mục)

**Gian 1 — Poster Sự Kiện KOL AI** (4 sản phẩm)
- Sản phẩm nổi bật: `KOL AI — Lễ Tốt Nghiệp` (dùng ảnh `kol-graduation` có sẵn)
- 3 sản phẩm giả lập cùng chủ đề: Poster Ra Mắt, Poster Vinh Danh, Poster Workshop

**Gian 2 — Lifestyle & Gym** (4 sản phẩm)
- Sản phẩm nổi bật: `KOL AI Gym Selfie` (dùng video `kol-gym-video` có sẵn, autoplay loop)
- 3 sản phẩm giả lập: Gym Outfit, Street Style, Studio Portrait

**Gian 3 — Ads & Affiliate Pack** (4 sản phẩm)
- 4 sản phẩm giả lập: Banner FB Ads, Story IG, TikTok Cover, Landing Hero

Tổng: 12 sản phẩm, tất cả đều **$2**. 2 sản phẩm dùng asset thật, 10 sản phẩm giả lập dùng placeholder từ gradient brand (không tạo ảnh mới, tiết kiệm và giữ đồng bộ màu).

## Layout mới

```text
[Header: logo + giỏ hàng ($ tổng)]
[Hero rút gọn: 1 dòng tagline + CTA]

── Gian 1: Poster Sự Kiện ─────────────── xem tất cả →
[card] [card] [card] [card]      ← hàng ngang, scroll ngang trên mobile

── Gian 2: Lifestyle & Gym ────────────── xem tất cả →
[card] [card▶video] [card] [card]

── Gian 3: Ads & Affiliate ────────────── xem tất cả →
[card] [card] [card] [card]

[Features 3 cột] [Footer]
```

- Card sản phẩm **nhỏ hơn**: aspect `3/4`, chiều rộng ~240px, hiển thị 4 cột trên desktop, 2 cột tablet, scroll ngang trên mobile (`overflow-x-auto snap-x`).
- Mỗi card: ảnh/video + tên + giá $2 + nút "+ Thêm" nhỏ gọn.
- Giỏ hàng nổi (sticky bottom) hiển thị số lượng + tổng tiền + nút Thanh toán — giữ như hiện tại nhưng compact hơn.

## Thay đổi kỹ thuật (chỉ 1 file)

Chỉ sửa `src/routes/index.tsx`:
- Định nghĩa mảng `categories` gồm 3 nhóm, mỗi nhóm có `title` + `products[]`.
- Placeholder cho 10 sản phẩm giả lập: `<div>` nền `bg-brand-gradient` + icon/emoji + tag danh mục (không cần ảnh thật).
- Component `ProductCard` nhỏ tái sử dụng cho cả ảnh, video, và placeholder.
- Component `CategoryRow` render tiêu đề + hàng ngang card.
- Giữ nguyên: header, hero (rút gọn 1 chút), features, FAQ, footer, cart sticky, toàn bộ token màu và utility trong `src/styles.css`.

## Không thay đổi
- `src/styles.css` (màu sắc, gradient, shadow, font).
- Ảnh & video hiện có.
- Meta/SEO trong route head.
- Bất kỳ file nào khác.

Bạn duyệt kế hoạch này để mình triển khai nhé?

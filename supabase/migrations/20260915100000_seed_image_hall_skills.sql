-- Seed the image-skill hall with SanCongCu-owned copy and neutralized product data.
-- No source-site owner names, phone numbers, or brand claims are carried over.

insert into public.halls (id, slug, name, description, poster_path, is_visible, sort_order)
values (
  gen_random_uuid(),
  'image-hall',
  'Danh mục I · Skill Hình Ảnh',
  '8 skill xử lý ảnh thường phải thuê ngoài, đóng gói để người bán hàng tự làm nhanh.',
  '/skill-posters/skill-thuong-hieu-overlay.jpg',
  true,
  1
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  poster_path = excluded.poster_path,
  is_visible = excluded.is_visible,
  sort_order = excluded.sort_order;

with image_hall as (
  select id from public.halls where slug = 'image-hall'
),
seed(slug, title, short_description, introduction, benefits, audience, usage_steps, thumbnail_path, sort_order) as (
  values
    (
      'thuong-hieu-overlay',
      'Skill · Thương Hiệu & Text Overlay',
      'Chèn tiêu đề, điểm nhấn và badge thương hiệu lên ảnh để có bài đăng chỉn chu trong vài phút.',
      'Skill giúp bạn biến ảnh có sẵn thành hình đăng bán hàng có tiêu đề, điểm nhấn, bố cục chữ và nhận diện sancongcu rõ ràng.',
      array['Tạo ảnh bài đăng 4:5 có chữ dễ đọc', 'Có khung chọn câu hook, từ khóa nhấn màu và badge', 'Phù hợp cho Facebook, Instagram, Zalo và quảng cáo đơn giản'],
      array['Người bán hàng cần đăng ảnh nhanh', 'Chủ shop muốn ảnh đồng bộ nhận diện', 'Người làm nội dung không rành thiết kế'],
      array['Chuẩn bị ảnh gốc và câu tiêu đề ngắn', 'Chọn cụm từ cần nhấn mạnh và màu thương hiệu', 'Chạy hướng dẫn để xuất ảnh đã chèn chữ và kiểm tra dấu tiếng Việt'],
      '/skill-posters/skill-thuong-hieu-overlay.jpg',
      10
    ),
    (
      'poster-san-pham',
      'Skill · Poster Sản Phẩm',
      'Từ một ảnh sản phẩm, dựng bộ poster quảng cáo đồng bộ cho bài đăng, ads và chiến dịch bán hàng.',
      'Skill hướng dẫn tạo bộ poster sản phẩm nhất quán từ một ảnh đầu vào, tập trung vào lợi ích, giá trị và bối cảnh bán hàng.',
      array['Gợi ý nhiều concept poster cho cùng một sản phẩm', 'Có cấu trúc headline, lợi ích và lời kêu gọi hành động', 'Dễ dùng cho sản phẩm vật lý, quà tặng hoặc dịch vụ'],
      array['Chủ shop cần ảnh quảng cáo sản phẩm', 'Người chạy ads cần nhiều biến thể visual', 'Đội bán hàng muốn đồng bộ chiến dịch'],
      array['Chuẩn bị ảnh sản phẩm rõ nét', 'Chọn phong cách poster và thông điệp chính', 'Tạo các biến thể rồi chọn ảnh phù hợp để đăng hoặc chạy ads'],
      '/skill-posters/skill-poster-san-pham.jpg',
      20
    ),
    (
      'xoa-nen-anh',
      'Skill · Xóa Nền Ảnh',
      'Tách nền ảnh sản phẩm hoặc chân dung, xuất nền trong suốt để ghép vào poster, sàn thương mại hoặc catalogue.',
      'Skill giúp tách chủ thể khỏi nền cũ để dùng trong poster, ảnh sản phẩm, ảnh đại diện hoặc bố cục bán hàng mới.',
      array['Xuất ảnh nền trong suốt dễ tái sử dụng', 'Có checklist kiểm tra viền tóc, viền sản phẩm và bóng đổ', 'Phù hợp khi cần ghép sản phẩm vào nhiều bối cảnh'],
      array['Shop thương mại điện tử', 'Người làm catalogue sản phẩm', 'Người cần ảnh sạch để thiết kế tiếp'],
      array['Chọn ảnh có chủ thể rõ', 'Chạy bước tách nền theo hướng dẫn', 'Kiểm tra mép chủ thể và xuất bản PNG hoặc ảnh nền mới'],
      '/skill-posters/skill-xoa-nen-anh.jpg',
      30
    ),
    (
      'xoa-logo-vat-the',
      'Skill · Xóa Logo, Vật Thể',
      'Xóa logo, watermark, chữ thừa, người lạ hoặc vật thể gây rối để ảnh trông sạch và chuyên nghiệp hơn.',
      'Skill hướng dẫn làm sạch ảnh bằng cách khoanh vùng chi tiết không mong muốn và phục hồi nền tự nhiên quanh vùng đó.',
      array['Xóa chi tiết thừa mà vẫn giữ bố cục ảnh', 'Có quy trình kiểm tra vùng phục hồi sau khi xử lý', 'Dùng được cho ảnh sản phẩm, ảnh sự kiện và ảnh đăng bài'],
      array['Người cần làm sạch ảnh trước khi đăng', 'Chủ shop có ảnh sản phẩm bị vướng chữ hoặc vật thể', 'Người làm nội dung muốn ảnh gọn gàng hơn'],
      array['Xác định vùng cần xóa', 'Chạy xử lý và so sánh trước sau', 'Lặp lại ở vùng nhỏ nếu ảnh còn dấu xử lý'],
      '/skill-posters/skill-xoa-logo-vat-the.jpg',
      40
    ),
    (
      'chinh-sua-anh',
      'Skill · Chỉnh Sửa Ảnh',
      'Làm nét, cân sáng màu, làm đẹp khuôn mặt và xử lý ảnh mờ mà vẫn giữ cảm giác tự nhiên.',
      'Skill đưa ảnh mờ, thiếu sáng hoặc lệch màu về trạng thái sạch hơn, dễ dùng hơn cho hồ sơ cá nhân, bài đăng và nội dung bán hàng.',
      array['Cân sáng, màu và độ nét theo từng bước', 'Giữ ảnh tự nhiên, hạn chế làm biến dạng người thật', 'Có checklist soát da, mắt, nền và chi tiết sản phẩm'],
      array['Người bán hàng dùng ảnh thật', 'Cá nhân xây thương hiệu', 'Shop cần cứu ảnh chụp chưa đủ sáng'],
      array['Chọn ảnh cần chỉnh và mục tiêu chỉnh sửa', 'Chạy quy trình làm nét, cân màu và làm đẹp nhẹ', 'Soát lại khuôn mặt, chữ và chi tiết quan trọng trước khi dùng'],
      '/skill-posters/skill-chinh-sua-anh.jpg',
      50
    ),
    (
      'tang-chat-luong-4k',
      'Skill · Tăng Chất Lượng 4K',
      'Phóng to ảnh nhỏ hoặc ảnh bị vỡ hạt thành phiên bản sắc nét hơn để đăng bán, làm banner hoặc in ấn.',
      'Skill giúp nâng độ phân giải ảnh để ảnh cũ, ảnh nhỏ hoặc ảnh tải về từ nguồn nội bộ trông rõ hơn khi dùng trong thiết kế.',
      array['Tăng kích thước ảnh với quy trình kiểm tra chi tiết', 'Có hướng dẫn chọn mức phóng to phù hợp', 'Hữu ích cho banner, poster và ảnh sản phẩm lớn'],
      array['Người có ảnh gốc nhỏ', 'Chủ shop cần ảnh rõ hơn để in hoặc đăng', 'Người thiết kế cần nguồn ảnh đủ kích thước'],
      array['Kiểm tra kích thước và mức vỡ hạt của ảnh', 'Chọn mức nâng chất lượng phù hợp', 'Soát lại chữ, khuôn mặt và viền sản phẩm sau khi xuất'],
      '/skill-posters/skill-tang-chat-luong-4k.jpg',
      60
    ),
    (
      'multishot',
      'Skill · Multishot',
      'Từ một ảnh tham chiếu, tạo nhiều góc nhìn nhất quán để làm keyframe video, storyboard hoặc bộ hình chiến dịch.',
      'Skill biến một ảnh tham chiếu thành nhiều góc máy cùng phong cách, giúp dựng storyboard, keyframe video hoặc bộ ảnh chiến dịch nhất quán hơn.',
      array['Tạo các góc rộng, trung, cận và góc hành động', 'Giữ cùng nhân vật, trang phục và không khí hình ảnh', 'Có prompt gợi ý cho video hoặc storyboard tiếp theo'],
      array['Người làm video từ ảnh', 'Người cần storyboard nhanh', 'Chủ thương hiệu muốn bộ hình nhất quán'],
      array['Chuẩn bị ảnh tham chiếu rõ nhân vật hoặc sản phẩm', 'Chọn số góc máy và bối cảnh cần tạo', 'Dùng ảnh đầu ra làm keyframe hoặc tư liệu chiến dịch'],
      '/skill-posters/skill-multishot.jpg',
      70
    ),
    (
      'hoan-doi-nhan-vat',
      'Skill · Hoán Đổi Nhân Vật',
      'Đưa một nhân vật cố định vào bối cảnh mới, giữ nhận diện nhất quán cho bộ ảnh thương hiệu hoặc sản phẩm.',
      'Skill giúp đặt nhân vật đại diện vào nhiều bối cảnh khác nhau, phục vụ ảnh thương hiệu, ảnh chiến dịch và nội dung bán hàng lặp lại.',
      array['Giữ nhận diện nhân vật qua nhiều bối cảnh', 'Có cấu trúc mô tả trang phục, gương mặt, ánh sáng và bố cục', 'Phù hợp cho bộ ảnh thương hiệu cá nhân hoặc đại diện shop'],
      array['Cá nhân xây thương hiệu', 'Shop có nhân vật đại diện', 'Người cần nhiều ảnh cùng một nhận diện'],
      array['Chuẩn bị ảnh nhân vật và ảnh bối cảnh nếu có', 'Mô tả rõ trang phục, góc máy và mục tiêu ảnh', 'Kiểm tra lại gương mặt, tay, chữ và chi tiết nhận diện trước khi dùng'],
      '/skill-posters/skill-hoan-doi-nhan-vat.jpg',
      80
    )
)
insert into public.skills (
  id,
  hall_id,
  slug,
  title,
  short_description,
  introduction,
  benefits,
  audience,
  usage_steps,
  payment_note,
  thumbnail_path,
  price_usd,
  activation_price_vnd,
  status,
  sort_order
)
select
  gen_random_uuid(),
  image_hall.id,
  seed.slug,
  seed.title,
  seed.short_description,
  seed.introduction,
  to_jsonb(seed.benefits),
  to_jsonb(seed.audience),
  to_jsonb(seed.usage_steps),
  'Sau khi thanh toán được xác nhận, bạn nhận link cài đặt Skill và hướng dẫn sử dụng riêng qua Zalo hỗ trợ của sancongcu.com.',
  seed.thumbnail_path,
  1.99,
  51000,
  'published',
  seed.sort_order
from seed
cross join image_hall
on conflict (slug) do update set
  hall_id = excluded.hall_id,
  title = excluded.title,
  short_description = excluded.short_description,
  introduction = excluded.introduction,
  benefits = excluded.benefits,
  audience = excluded.audience,
  usage_steps = excluded.usage_steps,
  payment_note = excluded.payment_note,
  thumbnail_path = excluded.thumbnail_path,
  price_usd = excluded.price_usd,
  activation_price_vnd = excluded.activation_price_vnd,
  status = excluded.status,
  sort_order = excluded.sort_order;

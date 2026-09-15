-- Seed the sales-video editing hall with SanCongCu-owned copy.
-- Source-site owner names, phone numbers, and brand claims are intentionally excluded.

insert into public.halls (id, slug, name, description, poster_path, is_visible, sort_order)
values (
  gen_random_uuid(),
  'video-edit-hall',
  'Danh mục II · Edit Video Bán Hàng',
  '8 kiểu edit dựng sẵn để AI hỗ trợ cắt, dựng, thêm phụ đề và xuất video bán hàng.',
  '/skill-posters/skill-edit-video-tu-dong.jpg',
  true,
  2
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  poster_path = excluded.poster_path,
  is_visible = excluded.is_visible,
  sort_order = excluded.sort_order;

with video_hall as (
  select id from public.halls where slug = 'video-edit-hall'
),
seed(slug, title, short_description, introduction, benefits, audience, usage_steps, thumbnail_path, sort_order) as (
  values
    (
      'edit-video-tu-dong',
      'Skill · Edit Video Nói Chuyện Tự Động',
      'Cắt gọn video nói chuyện, thêm thumbnail mở đầu và phụ đề động để video dễ xem hơn.',
      'Skill giúp bạn biến video nói chuyện thô thành bản dựng gọn gàng, có mở đầu rõ ý, phụ đề dễ theo dõi và nhịp xem tự nhiên hơn.',
      array['Cắt bỏ khoảng lặng và đoạn thừa trong video nói chuyện', 'Tạo thumbnail hoặc khung mở đầu có hook rõ ràng', 'Thêm phụ đề động để người xem dễ nắm ý chính'],
      array['Người bán hàng quay video bằng điện thoại', 'Chủ shop cần video đăng đều mỗi ngày', 'Cá nhân xây kênh bằng video nói chuyện'],
      array['Chuẩn bị video gốc và mục tiêu nội dung', 'Chạy hướng dẫn để cắt gọn, tạo mở đầu và phụ đề', 'Kiểm tra phụ đề, nhịp cắt và xuất video để đăng'],
      '/skill-posters/skill-edit-video-tu-dong.jpg',
      110
    ),
    (
      'video-hieu-ung-cao-cap',
      'Skill · Video Hiệu Ứng Cao Cấp',
      'Dựng video talking-head với zoom theo cảm xúc, overlay, âm thanh và crop bám mặt chuyên nghiệp.',
      'Skill dành cho video nói chuyện cần cảm giác cao cấp hơn: có zoom đúng nhịp, lớp phủ minh họa, âm thanh nhấn và khung hình bám mặt người nói.',
      array['Thêm zoom, punch-in và crop bám mặt theo điểm nhấn', 'Gợi ý overlay, hiệu ứng chữ và âm thanh phù hợp', 'Có checklist so sánh trước sau để giữ video sạch và chuyên nghiệp'],
      array['Creator muốn video talking-head cuốn hơn', 'Coach, chuyên gia và người bán hàng cần video chỉn chu', 'Đội nội dung cần dựng nhanh nhiều video cùng phong cách'],
      array['Chuẩn bị video nói chuyện rõ mặt và rõ tiếng', 'Chọn phong cách hiệu ứng và mức độ chuyển động', 'Xuất bản sau khi kiểm tra crop, overlay, âm lượng và phụ đề'],
      '/skill-posters/skill-video-hieu-ung-cao-cap.jpg',
      120
    ),
    (
      'video-coach-toi-gian',
      'Skill · Video Hướng Dẫn Tối Giản',
      'Tạo video hướng dẫn sạch, sang với tiêu đề lớn, các bước hiện dần và nhạc nền dẫn dắt.',
      'Skill giúp biến nội dung hướng dẫn thành video tối giản, dễ hiểu, phù hợp cho coach, chuyên gia, đào tạo hoặc tư vấn bán hàng.',
      array['Dựng bố cục tiêu đề trắng lớn và dễ đọc', 'Hiển thị từng bước theo nội dung nói', 'Giữ phong cách sạch, ít rối và dễ dùng lại nhiều lần'],
      array['Coach và chuyên gia tư vấn', 'Người bán khóa học hoặc dịch vụ', 'Người cần video giải thích ngắn gọn'],
      array['Chuẩn bị nội dung hướng dẫn hoặc video gốc', 'Chia nội dung thành các bước rõ ràng', 'Dựng video với tiêu đề, nhạc nền và các bước hiện dần'],
      '/skill-posters/skill-video-coach-toi-gian.jpg',
      130
    ),
    (
      'video-infographic',
      'Skill · Video Talking-head Infographic',
      'Thêm lớp phủ infographic xen kẽ vào video nói chuyện để nội dung rõ ý và chuyên nghiệp hơn.',
      'Skill hỗ trợ dựng video talking-head có lớp phủ infographic, giúp số liệu, ý chính và cấu trúc nội dung hiện rõ trên màn hình.',
      array['Tạo lớp phủ infographic để minh họa ý đang nói', 'Giữ video nói chuyện không bị đơn điệu', 'Phù hợp cho nội dung chuyên môn, bán hàng và đào tạo'],
      array['Người chia sẻ kiến thức hoặc phân tích sản phẩm', 'Creator muốn video có lớp thông tin rõ hơn', 'Đội marketing cần video giải thích chuyên nghiệp'],
      array['Chuẩn bị video gốc và danh sách ý chính', 'Chọn đoạn cần hiện infographic hoặc số liệu', 'Dựng, kiểm tra độ dễ đọc và xuất video'],
      '/skill-posters/skill-video-infographic.jpg',
      140
    ),
    (
      'cat-video-dai-thanh-short',
      'Skill · Cắt Video Dài Thành Short',
      'Tìm đoạn hay trong video dài, cắt thành short 9:16 và giữ khung hình bám sát người nói.',
      'Skill giúp tái sử dụng video dài thành nhiều short dễ đăng TikTok, Reels, Shorts hoặc Facebook, tập trung vào đoạn có khả năng giữ chân người xem.',
      array['Tìm đoạn hook, insight hoặc khoảnh khắc đáng cắt', 'Crop 9:16 bám sát mặt người nói', 'Có cấu trúc tiêu đề, phụ đề và nhịp cắt cho short'],
      array['Người có livestream, webinar hoặc video dài', 'Podcaster và creator cần tái chế nội dung', 'Shop muốn tạo nhiều short từ một buổi quay'],
      array['Tải video dài và xác định mục tiêu cắt', 'Chọn đoạn tiềm năng, crop dọc và thêm phụ đề', 'Xuất nhiều short để đăng thử và đo hiệu quả'],
      '/skill-posters/skill-cat-video-dai-thanh-short.jpg',
      150
    ),
    (
      'cat-podcast-2-nguoi',
      'Skill · Cắt Podcast 2 Người Thành Short',
      'Cắt podcast hoặc phỏng vấn 2 người thành short, tự chuyển khung theo người đang nói.',
      'Skill hỗ trợ biến video phỏng vấn hoặc podcast 2 người thành short dọc, có khung chuyển 1 người hoặc 2 người theo mạch hội thoại.',
      array['Nhận diện đoạn đối thoại có điểm nhấn để cắt short', 'Gợi ý khung hình theo người đang nói', 'Giữ nhịp chuyển cảnh tự nhiên trong video phỏng vấn'],
      array['Kênh podcast và phỏng vấn', 'Người làm nội dung chuyên gia', 'Đội marketing có video trò chuyện dài'],
      array['Chuẩn bị video podcast hoặc phỏng vấn 2 người', 'Chọn đoạn hội thoại có hook hoặc insight', 'Dựng khung dọc, phụ đề và kiểm tra chuyển người nói'],
      '/skill-posters/skill-cat-podcast-2-nguoi.jpg',
      160
    ),
    (
      'ghep-clip-theo-nhac',
      'Skill · Ghép Nhiều Clip Theo Nhạc',
      'Ghép nhiều clip rời thành video liền mạch, canh nhịp chuyển cảnh theo beat nhạc.',
      'Skill giúp bạn dựng montage từ nhiều clip rời, biến tư liệu thô thành video ngắn có nhịp, phù hợp cho trend, recap, sản phẩm hoặc hậu trường.',
      array['Sắp xếp nhiều clip thành mạch xem liền lạc', 'Canh chuyển cảnh theo beat nhạc', 'Phù hợp cho video lifestyle, recap và quảng cáo ngắn'],
      array['Shop có nhiều clip sản phẩm rời', 'Người làm recap sự kiện hoặc hậu trường', 'Creator muốn dựng video trend nhanh hơn'],
      array['Chuẩn bị các clip ngắn và bản nhạc nền', 'Chọn nhịp cắt, thứ tự clip và điểm chuyển cảnh', 'Xuất video sau khi kiểm tra beat, chữ và độ mượt'],
      '/skill-posters/skill-ghep-clip-theo-nhac.jpg',
      170
    ),
    (
      'highlight-theo-nhac',
      'Skill · AI Cắt Highlight Theo Nhạc',
      'Chọn khoảnh khắc ấn tượng nhất từ video dài và dựng thành highlight quảng cáo theo nhạc.',
      'Skill hỗ trợ tìm đoạn nổi bật nhất trong video dài rồi dựng thành highlight ngắn có nhịp, dùng cho quảng cáo, teaser hoặc bài đăng kéo sự chú ý.',
      array['Tìm khoảnh khắc mạnh nhất từ video dài', 'Dựng highlight theo nhịp nhạc và cảm xúc', 'Có cấu trúc mở đầu, cao trào và kết thúc gọn'],
      array['Người có video sự kiện, bán hàng hoặc review dài', 'Đội ads cần teaser ngắn', 'Creator muốn rút video dài thành đoạn ấn tượng'],
      array['Chuẩn bị video dài và mục tiêu highlight', 'Chọn đoạn cao trào, nhạc nền và nhịp cắt', 'Kiểm tra thông điệp cuối và xuất video để đăng hoặc chạy quảng cáo'],
      '/skill-posters/skill-highlight-theo-nhac.jpg',
      180
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
  video_hall.id,
  seed.slug,
  seed.title,
  seed.short_description,
  seed.introduction,
  to_jsonb(seed.benefits),
  to_jsonb(seed.audience),
  to_jsonb(seed.usage_steps),
  'Bấm chọn "Kích hoạt", thanh toán bằng mã QR, gửi bill đến Zalo 0938.069.668. Skill sẽ được bàn giao kèm hướng dẫn sử dụng và cập nhật trong nhóm hỗ trợ sancongcu.com.',
  seed.thumbnail_path,
  1.99,
  51000,
  'published',
  seed.sort_order
from seed
cross join video_hall
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

export type ProductContent = {
  summary: string;
  introduction: string;
  includes: string[];
};

const makeContent = (summary: string, focus: string): ProductContent => ({
  summary,
  introduction: `Skill được đóng gói để bạn làm ${focus} theo từng bước rõ ràng. Chỉ cần chuẩn bị đúng thông tin đầu vào, làm theo hướng dẫn và áp dụng ngay cho công việc bán hàng.`,
  includes: [
    "Mẫu câu lệnh và checklist triển khai",
    "Hướng dẫn chuẩn bị đầu vào",
    "Gợi ý xử lý các lỗi thường gặp",
  ],
});

export const productContent: Record<string, ProductContent> = {
  "thuong-hieu-overlay": makeContent(
    "Chèn tiêu đề, điểm nhấn và badge thương hiệu lên ảnh để có bài đăng chỉn chu trong vài phút.",
    "một ảnh đăng bán hàng có chữ, bố cục và nhận diện rõ ràng",
  ),
  "poster-san-pham": makeContent(
    "Từ một ảnh sản phẩm, dựng bộ poster quảng cáo đồng bộ cho bài đăng, ads và chiến dịch bán hàng.",
    "một bộ poster sản phẩm đồng nhất",
  ),
  "xoa-nen-anh": makeContent(
    "Tách nền ảnh sản phẩm hoặc chân dung, xuất nền trong suốt để ghép vào poster, sàn thương mại hoặc catalogue.",
    "một ảnh đã tách nền sạch để dùng lại linh hoạt",
  ),
  "xoa-logo-vat-the": makeContent(
    "Xóa logo, watermark, chữ thừa, người lạ hoặc vật thể gây rối để ảnh trông sạch và chuyên nghiệp hơn.",
    "một ảnh đã được làm sạch các chi tiết không mong muốn",
  ),
  "chinh-sua-anh": makeContent(
    "Làm nét, cân sáng màu, làm đẹp khuôn mặt và xử lý ảnh mờ mà vẫn giữ cảm giác tự nhiên.",
    "một ảnh sáng, rõ và dễ dùng cho truyền thông",
  ),
  "tang-chat-luong-4k": makeContent(
    "Phóng to ảnh nhỏ hoặc ảnh bị vỡ hạt thành phiên bản sắc nét hơn để đăng bán, làm banner hoặc in ấn.",
    "một ảnh độ phân giải cao hơn",
  ),
  multishot: makeContent(
    "Từ một ảnh tham chiếu, tạo nhiều góc nhìn nhất quán để làm keyframe video, storyboard hoặc bộ hình chiến dịch.",
    "một bộ nhiều góc ảnh giữ cùng nhân vật và khoảnh khắc",
  ),
  "hoan-doi-nhan-vat": makeContent(
    "Đưa một nhân vật cố định vào bối cảnh mới, giữ nhận diện nhất quán cho bộ ảnh thương hiệu hoặc sản phẩm.",
    "một ảnh nhân vật nhất quán trong bối cảnh mới",
  ),
  graduation: makeContent(
    "Dựng thông điệp vinh danh giàu cảm xúc để nâng tầm hình ảnh chuyên gia và thương hiệu.",
    "một nội dung vinh danh thuyết phục",
  ),
  launch: makeContent(
    "Lên bộ thông điệp ra mắt rõ lợi ích, đúng khách hàng và dễ dùng ngay cho chiến dịch bán hàng.",
    "một chiến dịch ra mắt có cấu trúc",
  ),
  honor: makeContent(
    "Định vị chuyên môn, điểm khác biệt và bằng chứng để khách hàng hiểu vì sao nên chọn bạn.",
    "một hồ sơ chuyên gia đáng tin",
  ),
  workshop: makeContent(
    "Thiết kế chủ đề, dàn ý và lời kêu gọi hành động cho workshop có khả năng thu hút học viên.",
    "một workshop dẫn tới chuyển đổi",
  ),
  "story-brand": makeContent(
    "Biến câu chuyện thương hiệu thành nội dung gần gũi, có cảm xúc và hỗ trợ quyết định mua.",
    "một câu chuyện thương hiệu dễ nhớ",
  ),
  "pr-media": makeContent(
    "Chuẩn bị góc thông tin, thông điệp và nội dung xuất hiện truyền thông một cách chuyên nghiệp.",
    "một bài giới thiệu truyền thông",
  ),
  gym: makeContent(
    "Lập ý tưởng nội dung chuyển động ngắn để hình ảnh cá nhân trở nên sống động và tự nhiên hơn.",
    "một nội dung selfie chuyển động",
  ),
  outfit: makeContent(
    "Gợi ý phối trang phục, bối cảnh và thông điệp để hình ảnh bán hàng nhất quán với thương hiệu.",
    "một concept hình ảnh bán hàng",
  ),
  street: makeContent(
    "Tạo kịch bản kể chuyện đời thường để sản phẩm xuất hiện tự nhiên và dễ được khách hàng tin tưởng.",
    "một câu chuyện đường phố có điểm chạm sản phẩm",
  ),
  studio: makeContent(
    "Lên concept chân dung cao cấp, ánh sáng và thông điệp dành cho chuyên gia hoặc chủ doanh nghiệp.",
    "một bộ chân dung thương hiệu chỉn chu",
  ),
  travel: makeContent(
    "Kết hợp trải nghiệm du lịch và sản phẩm để tạo nội dung lifestyle có khả năng thu hút.",
    "một bài lifestyle giàu cảm hứng",
  ),
  daily: makeContent(
    "Biến khoảnh khắc thường ngày thành chất liệu đăng bài đều đặn mà không bị gượng ép.",
    "một chuỗi nội dung đời thường",
  ),
  "tvc-brand": makeContent(
    "Xây ý tưởng TVC ngắn, thông điệp và nhịp cảnh phù hợp cho một video quảng cáo thương hiệu.",
    "một video quảng cáo có kịch bản",
  ),
  script: makeContent(
    "Viết kịch bản 30 giây mở đầu thu hút, nêu lợi ích rõ và chốt bằng lời kêu gọi hành động.",
    "một video bán hàng ngắn",
  ),
  reels: makeContent(
    "Lên mạch cảnh và câu chữ cho Reels chuyển cảnh nhanh, dễ quay bằng điện thoại.",
    "một video Reels mượt mà",
  ),
  unbox: makeContent(
    "Dựng khung review sản phẩm giúp nói đúng lợi ích, trả lời băn khoăn và tăng niềm tin mua hàng.",
    "một video review đáng tin",
  ),
  livestream: makeContent(
    "Chuẩn bị flow livestream từ mở đầu, giới thiệu sản phẩm đến xử lý câu hỏi và chốt đơn.",
    "một buổi livestream có cấu trúc",
  ),
  voice: makeContent(
    "Soạn lời đọc và chỉ dẫn giọng phù hợp để video bán hàng rõ ràng, tự nhiên và có cảm xúc.",
    "một bản lồng tiếng bán hàng",
  ),
  hero: makeContent(
    "Viết cấu trúc landing page dẫn khách từ vấn đề đến lợi ích, bằng chứng và hành động mua.",
    "một landing page chốt đơn",
  ),
  copy: makeContent(
    "Tạo copywriting theo sản phẩm và khách hàng mục tiêu, dùng được cho bài đăng, quảng cáo và landing page.",
    "một bộ nội dung bán hàng thuyết phục",
  ),
  offer: makeContent(
    "Đóng gói ưu đãi rõ giá trị, giới hạn và lý do hành động để khách dễ ra quyết định hơn.",
    "một offer dễ hiểu và hấp dẫn",
  ),
  checkout: makeContent(
    "Rà soát thông điệp và điểm chạm trước thanh toán để giảm do dự và hạn chế khách bỏ giỏ hàng.",
    "một quy trình thanh toán dễ hoàn tất",
  ),
  upsell: makeContent(
    "Thiết kế đề xuất nâng cấp và combo phù hợp với nhu cầu thực tế của từng nhóm khách hàng.",
    "một combo tăng giá trị đơn hàng",
  ),
  trust: makeContent(
    "Khai thác phản hồi, case study và bằng chứng xã hội để tăng độ tin cậy cho trang bán hàng.",
    "một hệ thống chứng thực khách hàng",
  ),
  curriculum: makeContent(
    "Thiết kế giáo trình có mục tiêu, bài tập và trình tự học dễ theo cho sản phẩm đào tạo.",
    "một khung chương trình đào tạo",
  ),
  slide: makeContent(
    "Biến nội dung chuyên môn thành slide mạch lạc, dễ giảng và dễ tiếp thu.",
    "một bộ slide giảng dạy",
  ),
  record: makeContent(
    "Lập checklist quay bài giảng từ kịch bản, góc máy đến nhịp truyền tải để tự tin trước ống kính.",
    "một bài giảng quay sẵn",
  ),
  community: makeContent(
    "Lên lịch hoạt động, nội dung và cách tạo tương tác để cộng đồng học viên duy trì giá trị.",
    "một cộng đồng học tập chủ động",
  ),
  webinar: makeContent(
    "Chuẩn bị webinar từ chủ đề, nội dung đến lời mời hành động phù hợp với hành trình học viên.",
    "một webinar tạo đăng ký",
  ),
  affiliate: makeContent(
    "Xây hệ thống affiliate từ thông điệp tuyển cộng tác viên đến cách hỗ trợ và theo dõi hiệu quả.",
    "một chương trình affiliate có thể vận hành",
  ),
};

export const getProductContent = (id: string) => productContent[id];

export const productTitles: Record<string, string> = {
  "thuong-hieu-overlay": "Skill · Thương Hiệu & Text Overlay",
  "poster-san-pham": "Skill · Poster Sản Phẩm",
  "xoa-nen-anh": "Skill · Xóa Nền Ảnh",
  "xoa-logo-vat-the": "Skill · Xóa Logo, Vật Thể",
  "chinh-sua-anh": "Skill · Chỉnh Sửa Ảnh",
  "tang-chat-luong-4k": "Skill · Tăng Chất Lượng 4K",
  multishot: "Skill · Multishot",
  "hoan-doi-nhan-vat": "Skill · Hoán Đổi Nhân Vật",
  graduation: "Skill · Sân Khấu Vinh Danh",
  launch: "Skill · Ra Mắt Thương Hiệu",
  honor: "Skill · Định Vị Chuyên Gia",
  workshop: "Skill · Diễn Thuyết Workshop",
  "story-brand": "Skill · Kể Chuyện Thương Hiệu",
  "pr-media": "Skill · Xuất Hiện Truyền Thông",
  gym: "Skill · Selfie Chuyển Động",
  outfit: "Skill · Phối Đồ Bán Hàng",
  street: "Skill · Street Storytelling",
  studio: "Skill · Chân Dung Cao Cấp",
  travel: "Skill · Lifestyle Du Lịch",
  daily: "Skill · Nhật Ký Đời Thường",
  "tvc-brand": "Skill · TVC Thương Hiệu",
  script: "Skill · Kịch Bản 30 Giây",
  reels: "Skill · Reels Chuyển Cảnh",
  unbox: "Skill · Video Review Sản Phẩm",
  livestream: "Skill · Livestream Bán Hàng",
  voice: "Skill · Giọng Đọc & Lồng Tiếng",
  hero: "Skill · Landing Chốt Đơn",
  copy: "Skill · Copywriting Bán Hàng",
  offer: "Skill · Thiết Kế Offer",
  checkout: "Skill · Tối Ưu Thanh Toán",
  upsell: "Skill · Upsell & Combo",
  trust: "Skill · Chứng Thực Khách Hàng",
  curriculum: "Skill · Thiết Kế Giáo Trình",
  slide: "Skill · Slide Giảng Dạy",
  record: "Skill · Quay Bài Giảng",
  community: "Skill · Vận Hành Cộng Đồng",
  webinar: "Skill · Webinar Chốt Học Viên",
  affiliate: "Skill · Hệ Thống Affiliate",
};

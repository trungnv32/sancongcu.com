export type SiteMenuItem = {
  id: string;
  label: string;
  href: string;
  parent_id: string | null;
  description: string;
  sort_order: number;
  is_visible: boolean;
};

export type SitePage = {
  id: string;
  slug: string;
  menu_label: string;
  eyebrow: string;
  title: string;
  summary: string;
  content_blocks: string[];
  cta_label: string;
  cta_href: string;
  is_visible: boolean;
  sort_order: number;
};

export type FreeResource = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  file_url: string;
  file_name: string;
  sort_order: number;
  is_visible: boolean;
};

export type TrainingCourse = {
  id: string;
  name: string;
  duration: string;
  price_label: string;
  amount_vnd: number;
  sale_price_label: string;
  sale_amount_vnd: number | null;
  transfer_label: string;
  bonus: string;
  highlight: string;
  sort_order: number;
  is_visible: boolean;
};

export const defaultTrainingCourses: TrainingCourse[] = [
  {
    id: "khoa-hinh-anh-cap-toc",
    name: "Combo skill làm hình ảnh",
    duration: "Combo 5 skill hình ảnh + 2 buổi HDSD",
    price_label: "999k",
    amount_vnd: 999000,
    sale_price_label: "",
    sale_amount_vnd: null,
    transfer_label: "COMBO HINHANH",
    bonus: "Kèm 5 skill hình ảnh tự chọn",
    highlight: "Phù hợp khi bạn muốn tự tạo ảnh bán hàng, poster, ảnh sản phẩm nhanh.",
    sort_order: 1,
    is_visible: true,
  },
  {
    id: "khoa-video-cap-toc",
    name: "Combo skill làm video",
    duration: "Combo 5 skill edit video + 2 buổi HDSD",
    price_label: "999k",
    amount_vnd: 999000,
    sale_price_label: "",
    sale_amount_vnd: null,
    transfer_label: "COMBO VIDEO",
    bonus: "Kèm 5 skill hình ảnh + video tùy chọn",
    highlight: "Dành cho nhu cầu dựng video ngắn, video bán hàng và nội dung đăng mạng xã hội.",
    sort_order: 2,
    is_visible: true,
  },
  {
    id: "khoa-tao-skill-website",
    name: "Combo skill thương mại + làm website",
    duration: "Combo 5 skill thương mại + 2 buổi HDSD",
    price_label: "999k",
    amount_vnd: 999000,
    sale_price_label: "",
    sale_amount_vnd: null,
    transfer_label: "COMBO SKILL WEBSITE",
    bonus: "Kèm 5 skill tùy chọn",
    highlight: "Gồm các skill phục vụ công việc thương mại và hướng dẫn làm website giới thiệu hoặc bán sản phẩm.",
    sort_order: 3,
    is_visible: true,
  },
  {
    id: "khoa-automation-vibe-coding",
    name: "Combo Automation + vibe coding",
    duration: "Combo 10 skill kèm 4 buổi HDSD",
    price_label: "1.999k",
    amount_vnd: 1999000,
    sale_price_label: "",
    sale_amount_vnd: null,
    transfer_label: "COMBO AUTOMATION VIBECODING",
    bonus: "Kèm 10 skill tùy chọn",
    highlight: "Gồm 10 skill tùy chọn và 4 buổi hướng dẫn sử dụng về hình ảnh, video, tự động hóa và vibe coding.",
    sort_order: 4,
    is_visible: true,
  },
  {
    id: "khoa-tong-hop",
    name: "Combo All In One - Toàn bộ skill",
    duration: "Combo toàn bộ skill + 8 buổi HDSD",
    price_label: "3.999.000đ",
    amount_vnd: 3999000,
    sale_price_label: "",
    sale_amount_vnd: null,
    transfer_label: "COMBO ALL IN ONE",
    bonus: "Kèm toàn bộ skill và update trọn đời",
    highlight:
      "Lộ trình đầy đủ để làm chủ hình ảnh, video, skill, website, automation và vibe coding.",
    sort_order: 5,
    is_visible: true,
  },
];

export const defaultSitePages: SitePage[] = [
  {
    id: "about",
    slug: "ve-chung-toi",
    menu_label: "Về chúng tôi",
    eyebrow: "Về sancongcu.com",
    title: "Nơi tập hợp công cụ AI thực dụng cho công việc hàng ngày",
    summary:
      "Sancongcu.com giúp bạn tìm đúng công cụ cho đúng việc: bán hàng, nội dung, hình ảnh, video, đào tạo, chăm sóc khách hàng và tự động hóa quy trình.",
    content_blocks: [
      "Chúng tôi chọn lọc và đóng gói các công cụ mới, thực dụng và dễ áp dụng để bạn có thể dùng ngay trong công việc hằng ngày, thay vì phải tự mò từng phần mềm riêng lẻ.",
      "Các công cụ được phân chia theo mục đích và ngành nghề cụ thể, giúp người mới cũng dễ tìm được điểm bắt đầu phù hợp với nhu cầu thật của mình.",
      "Ngoài các công cụ trả phí, sancongcu.com còn có kho tài nguyên miễn phí để bạn thử nghiệm, học cách ứng dụng AI và nâng cấp quy trình làm việc từng bước.",
      "Nếu bạn có kinh nghiệm, quy trình hoặc công cụ riêng, bạn có thể hợp tác cùng chúng tôi để đóng gói và bán sản phẩm số trên sancongcu.com.",
    ],
    cta_label: "Khám phá công cụ",
    cta_href: "#danh-muc-1",
    is_visible: true,
    sort_order: 1,
  },
  {
    id: "services",
    slug: "dich-vu",
    menu_label: "Dịch vụ",
    eyebrow: "Dịch vụ triển khai",
    title: "Đưa AI vào công việc theo đúng nhu cầu của bạn",
    summary:
      "Từ đào tạo, coaching đến xây website, workflow và chatbot, sancongcu.com hỗ trợ bạn biến ý tưởng thành hệ thống có thể dùng trong vận hành thật.",
    content_blocks: [],
    cta_label: "",
    cta_href: "",
    is_visible: true,
    sort_order: 3,
  },
  {
    id: "training",
    slug: "khoa-huan-luyen",
    menu_label: "Combo ưu đãi",
    eyebrow: "Combo skill ưu đãi",
    title: "Chọn combo skill phù hợp với công việc của bạn",
    summary:
      "Các combo gồm bộ skill thực hành kèm buổi hướng dẫn sử dụng, giúp bạn nhanh chóng áp dụng AI vào công việc và tạo sản phẩm thực tế.",
    content_blocks: [
      "Mỗi combo cung cấp một nhóm skill theo đúng nhu cầu: hình ảnh, video, thương mại, website, automation hoặc trọn bộ.",
      "Các buổi HDSD đi kèm giúp bạn cài đặt, làm quen và áp dụng skill vào những tình huống công việc thực tế.",
      "Bạn có thể chọn combo vừa đủ cho nhu cầu hiện tại hoặc combo All In One để sử dụng toàn bộ skill và nhận hướng dẫn đầy đủ.",
    ],
    cta_label: "Nhận tư vấn lộ trình",
    cta_href: "https://zalo.me/0938069668",
    is_visible: true,
    sort_order: 4,
  },
  {
    id: "free-resources",
    slug: "tai-nguyen-mien-phi",
    menu_label: "Kho miễn phí",
    eyebrow: "Kho tài nguyên miễn phí",
    title: "Tải tài liệu, mẫu prompt và file hướng dẫn miễn phí",
    summary:
      "Một trang riêng để bạn đăng các tài nguyên miễn phí cho khách hàng tải về, dùng thử và quay lại khám phá các công cụ phù hợp hơn.",
    content_blocks: [
      "Bạn có thể đăng checklist, file mẫu, bộ prompt, tài liệu hướng dẫn, bảng tính hoặc tài nguyên dùng thử để khách tải về.",
      "Mỗi tài nguyên nên có tên rõ ràng, mô tả ngắn về lợi ích và file tải trực tiếp để khách dễ chọn đúng thứ họ cần.",
    ],
    cta_label: "Xem kho tài nguyên",
    cta_href: "/tai-nguyen-mien-phi",
    is_visible: true,
    sort_order: 2,
  },
];

export const defaultServiceItems: SiteMenuItem[] = [
  {
    id: "service-inhouse",
    label: "Đào tạo AI in-house",
    href: "#dich-vu",
    parent_id: "services",
    description: "Đào tạo đội ngũ cách sử dụng và ứng dụng AI vào công việc thực tế.",
    sort_order: 1,
    is_visible: true,
  },
  {
    id: "service-coaching",
    label: "Đào tạo nhóm nhỏ / coaching",
    href: "#dich-vu",
    parent_id: "services",
    description: "Kèm nhóm nhỏ hoặc coaching ngắn hạn để giải quyết mục tiêu cụ thể.",
    sort_order: 2,
    is_visible: true,
  },
  {
    id: "service-website",
    label: "Làm website bán hàng",
    href: "#dich-vu",
    parent_id: "services",
    description: "Xây website bán hàng gọn, rõ thông điệp và dễ triển khai chiến dịch.",
    sort_order: 3,
    is_visible: true,
  },
  {
    id: "service-workflow",
    label: "Xây workflow công việc",
    href: "#dich-vu",
    parent_id: "services",
    description: "Thiết kế luồng làm việc cho doanh nghiệp, đội nhóm hoặc cá nhân.",
    sort_order: 4,
    is_visible: true,
  },
  {
    id: "service-chatbot",
    label: "Chatbot CSKH / tuyển dụng",
    href: "#dich-vu",
    parent_id: "services",
    description: "Xây chatbot chăm sóc khách hàng, tuyển dụng và onboarding nhân sự.",
    sort_order: 5,
    is_visible: true,
  },
];

export const defaultTopMenuItems: SiteMenuItem[] = [
  {
    id: "about",
    label: "Về chúng tôi",
    href: "#ve-chung-toi",
    parent_id: null,
    description: "",
    sort_order: 1,
    is_visible: true,
  },
  {
    id: "services",
    label: "Dịch vụ",
    href: "#dich-vu",
    parent_id: null,
    description: "",
    sort_order: 3,
    is_visible: true,
  },
  {
    id: "training",
    label: "Combo ưu đãi",
    href: "#khoa-huan-luyen",
    parent_id: null,
    description: "",
    sort_order: 4,
    is_visible: true,
  },
  {
    id: "free-resources",
    label: "Kho miễn phí",
    href: "/tai-nguyen-mien-phi",
    parent_id: null,
    description: "",
    sort_order: 2,
    is_visible: true,
  },
];

export const defaultMenuItems: SiteMenuItem[] = [...defaultTopMenuItems, ...defaultServiceItems];

export function mergeSitePages(savedPages: SitePage[] | null | undefined) {
  const saved = savedPages ?? [];
  const savedIds = new Set(saved.map((page) => page.id));
  return [...saved, ...defaultSitePages.filter((page) => !savedIds.has(page.id))].sort(
    (a, b) => a.sort_order - b.sort_order || a.menu_label.localeCompare(b.menu_label),
  );
}

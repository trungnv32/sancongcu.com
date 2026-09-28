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
  file_url: string;
  file_name: string;
  sort_order: number;
  is_visible: boolean;
};

export type SiteConfig = {
  id: "main";
  zalo_group_url: string;
  zalo_group_qr_url: string;
  support_zalo_url: string;
  support_zalo_qr_url: string;
  payment_qr_url: string;
};

export const defaultSiteConfig: SiteConfig = {
  id: "main",
  zalo_group_url: "https://zalo.me/g/8nwpbixavealgevx4p1b",
  zalo_group_qr_url: "",
  support_zalo_url: "https://zalo.me/0938069668",
  support_zalo_qr_url: "",
  payment_qr_url: "",
};

export function siteConfigFromPage(page: SitePage | null | undefined): SiteConfig {
  if (!page) return defaultSiteConfig;
  if (page.content_blocks.length >= 5) {
    return {
      id: "main",
      zalo_group_url: page.content_blocks[0] || defaultSiteConfig.zalo_group_url,
      zalo_group_qr_url: page.content_blocks[1] || "",
      support_zalo_url: page.content_blocks[2] || defaultSiteConfig.support_zalo_url,
      support_zalo_qr_url: page.content_blocks[3] || "",
      payment_qr_url: page.content_blocks[4] || "",
    };
  }
  return {
    id: "main",
    zalo_group_url: page.eyebrow || defaultSiteConfig.zalo_group_url,
    zalo_group_qr_url: page.title || "",
    support_zalo_url: page.summary || defaultSiteConfig.support_zalo_url,
    support_zalo_qr_url: page.cta_label || "",
    payment_qr_url: page.cta_href || "",
  };
}

export function siteConfigToPage(config: SiteConfig) {
  return {
    id: "site-config",
    slug: "site-config",
    menu_label: "Cấu hình chung",
    eyebrow: "Cấu hình liên hệ",
    title: "Cấu hình QR Zalo và thanh toán",
    summary: "Dữ liệu cấu hình dùng tạm khi bảng site_config chưa được tạo.",
    content_blocks: [
      config.zalo_group_url,
      config.zalo_group_qr_url,
      config.support_zalo_url,
      config.support_zalo_qr_url,
      config.payment_qr_url,
    ],
    cta_label: "",
    cta_href: "",
    is_visible: false,
    sort_order: 999,
    updated_at: new Date().toISOString(),
  };
}

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
    menu_label: "Khoá huấn luyện",
    eyebrow: "Học từ con số 0",
    title: "Hướng dẫn sử dụng AI đến khi tạo được sản phẩm thực tế",
    summary:
      "Lộ trình dành cho người mới: hiểu AI, dùng đúng công cụ, tạo sản phẩm, tối ưu kinh doanh và mở thêm nguồn thu từ dịch vụ AI.",
    content_blocks: [
      "Khóa huấn luyện bắt đầu từ nền tảng rất dễ hiểu: AI có thể làm gì, nên dùng trong việc nào và cách đặt yêu cầu để nhận kết quả tốt.",
      "Bạn sẽ thực hành trên các tình huống thật như viết nội dung bán hàng, tạo hình ảnh, dựng video, xây landing page, thiết kế chatbot và sắp xếp workflow.",
      "Mục tiêu không chỉ là biết dùng công cụ, mà là biết biến AI thành trợ lý làm việc, tạo ra sản phẩm cụ thể hoặc dịch vụ có thể bán cho khách hàng.",
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
    label: "Khoá huấn luyện",
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

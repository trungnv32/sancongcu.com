/**
 * Danh sách game người que chơi thử trên /tai-nguyen/game-nguoi-que.
 * File game (đã Việt hoá) nằm ở public/game-nguoi-que/games/<slug>.html,
 * ảnh thẻ ở public/game-nguoi-que/thumbs/<slug>.webp.
 * Mã nguồn gốc giấy phép MIT — xem public/game-nguoi-que/LICENSE.txt.
 */
export type NguoiQueGame = {
  slug: string;
  name: string;
  tagline: string;
  badge?: "Mới";
  note?: string;
};

export const nguoiQueGames: NguoiQueGame[] = [
  {
    slug: "ne-deadline",
    name: "Né Deadline",
    tagline: "Chạm để nhảy qua deadline, chụp ly cà phê lấy điểm",
    badge: "Mới",
  },
  {
    slug: "punching",
    name: "Đấm Tứ Phía",
    tagline: "Lâu la kéo đến hai bên, chạm bên nào đấm bên đó",
  },
  { slug: "rolling", name: "Lăn Cả Vũ Trụ", tagline: "Lăn cuốn mọi thứ, chạy trước cơn lở tuyết" },
  { slug: "chopping", name: "Tiều Phu Tốc Độ", tagline: "Chặt cây, né cành, nhớ mài rìu cho sắc" },
  {
    slug: "stacks",
    name: "Cần Cẩu Xếp Hộp",
    tagline: "Xếp hộp cao nhất có thể, rơi một hộp là thua",
  },
  {
    slug: "hoops",
    name: "Mười Quả Bóng Rổ",
    tagline: "Mười lần ném, vào gọn không chạm vành ăn ba điểm",
  },
  {
    slug: "skirmish",
    name: "Đại Chiến Người Que",
    tagline: "Thả quân, dựng rào, xem hai phe hỗn chiến",
  },
  { slug: "gaps", name: "Vẽ Cầu Qua Hố", tagline: "Anh ấy chạy không ngừng, bạn vẽ cầu cho kịp" },
  {
    slug: "slowmo",
    name: "Nhảy Quay Chậm",
    tagline: "Nhảy xoay chậm giữa phòng, tiếp đất bằng chân",
  },
  { slug: "planks", name: "Xếp Ván Cắt Thừa", tagline: "Thả tấm ván, phần thò ra bị cắt mất" },
  {
    slug: "crossing",
    name: "Nhảy Qua Đường",
    tagline: "Qua đường, qua sông, qua ray, mỗi vùng một vẻ",
  },
  {
    slug: "typing",
    name: "Gõ Phím Hạ Địch",
    tagline: "Gõ đúng chữ trên biển để hạ gục lâu la",
    note: "Cần bàn phím",
  },
  { slug: "bopping", name: "Đừng Để Bóng Rơi", tagline: "Đánh bóng bay lên, đừng để chạm sàn" },
  { slug: "stomping", name: "Sàn Toàn Gai", tagline: "Sàn toàn gai, nhún trên đầu địch mà đi" },
  { slug: "knockdown", name: "Bắn Đổ Tháp", tagline: "Ngắm, bắn, hạ đổ mọi khối trên kệ" },
  { slug: "slicing", name: "Dã Ngoại Hỗn Loạn", tagline: "Chém đồ ăn trước khi hỏng, né lũ ong" },
  {
    slug: "selves",
    name: "Bản Sao Quá Khứ",
    tagline: "Mỗi lượt cũ phát lại, phối hợp với chính bạn",
  },
  { slug: "glider", name: "Máy Bay Giấy", tagline: "Giữ để bay lên, thả để lượn qua từng phòng" },
  {
    slug: "stones",
    name: "Nhảy Đá Qua Sông",
    tagline: "Giữ lấy đà, nhảy đá qua sông, đáp giữa tâm",
  },
];

export const gameSrc = (slug: string) => `/game-nguoi-que/games/${slug}.html`;
export const thumbSrc = (slug: string) => `/game-nguoi-que/thumbs/${slug}.webp`;

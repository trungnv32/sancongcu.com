update public.site_menu_items
set href = '#combo-uu-dai'
where id = 'training';

update public.site_pages
set slug = 'combo-uu-dai'
where id = 'training';

update public.training_courses
set
  highlight = 'Gồm 10 skill tùy chọn và 4 buổi HDSD về Automation + Vibe Coding.',
  updated_at = now()
where id = 'khoa-automation-vibe-coding';

update public.training_courses
set
  highlight = 'Lộ trình đầy đủ để làm chủ hình ảnh, video, skill, website, automation và vibe coding. Hướng dẫn bạn cách tạo ra sản phẩm và thương mại hoá để kiếm tiền từ AI.',
  updated_at = now()
where id = 'khoa-tong-hop';

alter table public.training_courses
  drop constraint if exists training_courses_duration_check;

alter table public.training_courses
  add constraint training_courses_duration_check
  check (char_length(duration) <= 60);

update public.training_courses
set
  duration = case id
    when 'khoa-hinh-anh-cap-toc' then 'Combo 5 Skill hình ảnh + 02 buổi đào tạo'
    when 'khoa-video-cap-toc' then 'Combo 5 Skill edit video + 02 buổi đào tạo'
    when 'khoa-tao-skill-website' then 'Combo 5 Skill thương mại + 02 buổi đào tạo'
    when 'khoa-automation-vibe-coding' then 'Combo 10 Skill + 04 buổi đào tạo'
    when 'khoa-tong-hop' then 'Combo toàn bộ Skill + 08 buổi đào tạo'
  end,
  highlight = case id
    when 'khoa-automation-vibe-coding' then 'Gồm 10 skill tùy chọn và 04 buổi đào tạo về hình ảnh, video, tự động hóa và vibe coding.'
    else highlight
  end,
  updated_at = now()
where id in (
  'khoa-hinh-anh-cap-toc',
  'khoa-video-cap-toc',
  'khoa-tao-skill-website',
  'khoa-automation-vibe-coding',
  'khoa-tong-hop'
);

update public.site_pages
set
  summary = 'Các combo gồm bộ Skill thực hành kèm buổi đào tạo, giúp bạn nhanh chóng áp dụng AI vào công việc và tạo sản phẩm thực tế.',
  content_blocks = array[
    'Mỗi combo cung cấp một nhóm Skill theo đúng nhu cầu: hình ảnh, video, thương mại, website, automation hoặc trọn bộ.',
    'Các buổi đào tạo đi kèm giúp bạn làm quen và áp dụng Skill vào những tình huống công việc thực tế.',
    'Bạn có thể chọn combo vừa đủ cho nhu cầu hiện tại hoặc combo All In One để sử dụng toàn bộ Skill và tham gia các buổi đào tạo.'
  ]::text[]
where id = 'training';

alter table public.training_courses
  drop constraint if exists training_courses_duration_check;

alter table public.training_courses
  add constraint training_courses_duration_check
  check (char_length(duration) <= 70);

update public.training_courses
set
  duration = replace(duration, 'buổi HDSD', 'buổi chuyên sâu'),
  highlight = replace(highlight, 'buổi HDSD', 'buổi chuyên sâu'),
  bonus = replace(bonus, 'buổi HDSD', 'buổi chuyên sâu'),
  updated_at = now()
where duration like '%buổi HDSD%'
   or highlight like '%buổi HDSD%'
   or bonus like '%buổi HDSD%';

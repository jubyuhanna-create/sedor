-- شغّل هالكود كامل مرة وحدة داخل Supabase Dashboard -> SQL Editor -> New query

create extension if not exists "pgcrypto";

-- جدول المستخدمين (تسجيل الدخول)
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  display_name text not null,
  access_role text not null check (access_role in ('admin', 'employee')) default 'employee',
  created_at timestamptz default now()
);

-- جدول خانات الجدول (الأيام / المشمرات / التفקידים)
create table if not exists schedule_entries (
  id uuid primary key default gen_random_uuid(),
  shift_name text not null,       -- 'משמרת בוקר' | 'משמרת ערב'
  position_name text not null,    -- 'מלצרים' | 'בר' | 'מטבח' | ...
  day_name text not null,         -- 'שני' ... 'ראשון'
  employee_name text not null default '',
  updated_at timestamptz default now(),
  unique (shift_name, position_name, day_name)
);

-- صف وحيد يحدد هل الجدول منشور أو لا
create table if not exists schedule_status (
  id int primary key default 1,
  is_published boolean not null default false,
  published_at timestamptz,
  constraint single_row check (id = 1)
);

insert into schedule_status (id, is_published)
values (1, false)
on conflict (id) do nothing;

-- تعطيل الوصول المباشر من المتصفح (نحن نستخدم service role key من السيرفر فقط)
alter table employees enable row level security;
alter table schedule_entries enable row level security;
alter table schedule_status enable row level security;
-- لا نضيف أي policy لأن كل الاستدعاءات تمر عبر API routes بمفتاح service role

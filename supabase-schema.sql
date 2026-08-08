-- TimXeDien.com — schema cho Supabase (thay thế Vercel Blob)
-- Chạy 1 lần trong Supabase SQL Editor

create table if not exists orders (
  code text primary key,
  name text not null,
  phone text not null,
  car text,
  car_id text,
  mode text default 'day',
  time_range text,
  pickup text,
  total numeric default 0,
  note text,
  admin_note text,
  user_phone text,
  status text default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists orders_user_phone_idx on orders (user_phone);
create index if not exists orders_created_idx on orders (created_at desc);

create table if not exists users (
  phone text primary key,
  name text not null,
  salt text not null,
  pass_hash text not null,
  id_front_path text,
  id_back_path text,
  license_path text,
  verify_status text default 'unverified', -- unverified | pending | verified | rejected
  verify_note text,
  verified_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists leads (
  id text primary key,
  name text not null,
  phone text not null,
  topic text,
  message text,
  source text,
  booking jsonb,
  status text default 'new',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists leads_created_idx on leads (created_at desc);

-- Hợp đồng điện tử đã ký — mỗi dòng là 1 lần ký, giữ nguyên nội dung tại
-- thời điểm ký (đổi mẫu hợp đồng sau này không ảnh hưởng hợp đồng cũ).
create table if not exists contracts (
  id bigint generated always as identity primary key,
  order_code text not null references orders (code) on delete cascade,
  user_phone text not null,
  content text not null,
  signed_at timestamptz default now(),
  ip text,
  user_agent text
);
create index if not exists contracts_order_idx on contracts (order_code);

-- Khoá truy cập trực tiếp qua API công khai của Supabase — chỉ server
-- (dùng service_role key) mới đọc/ghi được, trình duyệt không đụng được vào.
alter table orders enable row level security;
alter table users enable row level security;
alter table leads enable row level security;
alter table contracts enable row level security;

-- TimXeDien.com — schema cho Supabase (thay thế Vercel Blob)
-- Chạy 1 lần trong Supabase SQL Editor

-- Kho xe thực tế (từng chiếc, theo biển số) — dùng để ghép xe cho đơn thuê.
create table if not exists vehicles (
  id bigint generated always as identity primary key,
  car_id text not null,      -- khớp carId trong FLEET (vd: "vf3")
  car_name text not null,    -- tên hiển thị (vd: "VinFast VF 3")
  plate text not null unique,
  color text,
  year text,
  reg_no text,
  reg_date date,
  reg_owner text,
  status text default 'available', -- available | rented | maintenance | inactive
  note text,
  created_at timestamptz default now()
);
create index if not exists vehicles_car_id_idx on vehicles (car_id);
create index if not exists vehicles_status_idx on vehicles (status);

-- Danh sách tài xế (dịch vụ thuê xe có tài xế)
create table if not exists drivers (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  license_number text,
  status text default 'available', -- available | busy | off
  note text,
  created_at timestamptz default now()
);

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
  car_plate text,
  car_color text,
  car_year text,
  car_reg_no text,
  car_reg_date date,
  car_reg_owner text,
  vehicle_id bigint references vehicles (id) on delete set null,
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
  id_number text,
  id_issued_at date,
  id_issued_by text,
  license_number text,
  license_issued_at date,
  license_issued_by text,
  address_perm text,
  address_temp text,
  google_id text unique,
  email text,
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
  signature_data text,
  signer_name text,
  content_hash text,
  signed_at timestamptz default now(),
  ip text,
  user_agent text
);
create index if not exists contracts_order_idx on contracts (order_code);
alter table contracts add column if not exists signature_data text;
alter table contracts add column if not exists signer_name text;
alter table contracts add column if not exists content_hash text;

-- ==== Quản trị nội dung frontend (admin sửa được, không cần deploy code) ====

-- Thông tin chung của website (1 dòng duy nhất, id luôn = 1)
create table if not exists site_config (
  id int primary key default 1,
  brand text,
  slogan text,
  hotline text,
  hotline_display text,
  zalo text,
  email text,
  address text,
  map_link text,
  facebook text,
  tiktok text,
  updated_at timestamptz default now(),
  constraint site_config_single_row check (id = 1)
);

-- Đội xe cho thuê hiển thị ở trang chủ (khác với "vehicles" — đó là xe THẬT theo
-- biển số dùng để ghép vào đơn; đây là "mẫu xe" trong bảng giá/catalogue)
create table if not exists fleet_cars (
  id text primary key,           -- slug, vd "vf6" — khớp car_id bên bảng vehicles
  name text not null,
  segment text,                  -- mini | suv | 7cho | dichvu (dùng cho bộ lọc)
  segment_label text,
  seats int default 5,
  range_text text,               -- vd "460 km/sạc"
  price_day bigint default 0,
  price_month bigint default 0,
  over_km bigint default 0,
  img_path text,                 -- đường dẫn ảnh trong bucket "car-images" (public)
  tag text,
  description text,
  features jsonb default '[]',   -- mảng chuỗi
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists fleet_cars_active_idx on fleet_cars (active, sort_order);

create table if not exists faqs (
  id bigint generated always as identity primary key,
  question text not null,
  answer text not null,
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists faqs_active_idx on faqs (active, sort_order);

create table if not exists reviews (
  id bigint generated always as identity primary key,
  name text not null,
  role text,
  stars int default 5,
  text text not null,
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists reviews_active_idx on reviews (active, sort_order);

-- Khoá truy cập trực tiếp qua API công khai của Supabase — chỉ server
-- (dùng service_role key) mới đọc/ghi được, trình duyệt không đụng được vào.
alter table orders enable row level security;
alter table users enable row level security;
alter table leads enable row level security;
alter table contracts enable row level security;
alter table vehicles enable row level security;
alter table drivers enable row level security;
alter table site_config enable row level security;
alter table fleet_cars enable row level security;
alter table faqs enable row level security;
alter table reviews enable row level security;

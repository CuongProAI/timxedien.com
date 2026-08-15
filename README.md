# ⚡ TimXeDien.com — Website cho thuê xe điện Cần Thơ

Website bán hàng theo mô hình **Green Future (greenfuture.tech)**, giai đoạn này tập
trung khu vực **Cần Thơ**: thuê xe điện VinFast tự lái theo **ngày / tháng / năm**,
**bán xe điện đã qua sử dụng**, **tư vấn phụ kiện xe điện** — kèm **tài khoản khách
hàng theo dõi đơn** và **trang quản trị mini-CRM**.

## 🚀 Xem thử ngay trên máy

Mở `index.html` bằng trình duyệt. Toàn bộ giao diện + đặt xe chạy được ngay
(đơn lưu trong trình duyệt, khách được hướng qua Zalo/hotline). Các tính năng
**tài khoản, theo dõi đơn, trang admin** chỉ hoạt động sau khi deploy lên Vercel.

## 📄 Các trang

| Trang | Nội dung |
|---|---|
| `index.html` | Trang bán hàng chính: tìm xe nhanh, đội xe + giá ngày/tháng, đặt xe online, thuê dài hạn, máy tính tiết kiệm, FAQ, liên hệ |
| `xe-cu.html` | Bán xe điện đã qua sử dụng: kiểm định 105 điểm, bảo hành pin, trả góp, thu mua & ký gửi |
| `phu-kien.html` | Phụ kiện xe điện: sạc, phim cách nhiệt, PPF, camera... tư vấn & báo giá theo xe |
| `tai-khoan.html` | Khách đăng ký / đăng nhập, theo dõi đơn thuê theo timeline: chờ xác nhận → xác nhận → giao xe → đang thuê → hoàn tất |
| `admin.html` | **Quản trị (mini-CRM)**: tổng quan doanh thu, xử lý đơn thuê theo trạng thái, tư vấn, danh sách khách hàng, xuất Excel |

## ✏️ Chỉnh sửa nội dung — chỉ cần sửa 1 file

Tất cả nội dung động nằm trong [`js/data.js`](js/data.js):

- `CONFIG` — hotline, Zalo, email, tiền cọc, phí giao xe, mức giảm giá, giới hạn km
- `FLEET` — đội xe cho thuê (giá ngày/tháng, phụ phí vượt km, mô tả)
- `USED_CARS` — danh sách xe cũ đang bán (giá, odo, % pin, trạng thái đang bán/đã cọc/đã bán)
- `ACCESSORIES` + `ACCESSORY_CATS` — danh mục phụ kiện & giá tham khảo
- `PICKUP_POINTS`, `REVIEWS`, `FAQS`, `AREAS`, `ORDER_STATUS`

Ảnh xe trong `images/cars/` — thay bằng ảnh thật, giữ tên file hoặc sửa đường dẫn trong `data.js`.

## ☁️ Deploy lên Vercel

```bash
cd timxedien
npx vercel          # lần đầu: tạo project mới tên "timxedien"
npx vercel --prod   # đưa lên production
```

Dữ liệu (đơn thuê, tài khoản, yêu cầu tư vấn) lưu trong **Supabase** (Postgres) — tạo 1 project Supabase, chạy schema SQL trong `supabase-schema.sql`, rồi cấu hình trong **Vercel Dashboard → Settings → Environment Variables**:

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL project Supabase, dạng `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Khoá "secret"/"service_role" trong Project Settings → API Keys (KHÔNG phải khoá publishable/anon) |
| `ADMIN_KEY` | ✅ | Mật khẩu đăng nhập trang `/admin` |
| `SESSION_SECRET` | ✅ nên có | Chuỗi ngẫu nhiên dài ký phiên đăng nhập của khách |
| `TELEGRAM_BOT_TOKEN` | ⬜ | Bot Telegram báo đơn mới về điện thoại bạn |
| `TELEGRAM_CHAT_ID` | ⬜ | Chat ID nhận thông báo |

Sau đó **Settings → Domains** — trỏ tên miền `timxedien.com`

> Nếu dự án Supabase đã được tạo từ phiên bản cũ, hãy chạy lại `supabase-schema.sql`
> trong SQL Editor. Các lệnh `add column if not exists` sẽ bổ sung nơi lưu nét ký,
> họ tên người ký và mã kiểm tra nội dung mà không xóa dữ liệu hợp đồng cũ.

## 🔁 Luồng vận hành hằng ngày

1. Khách đặt xe trên web → đơn lưu vào Supabase + **báo Telegram ngay**
2. Bạn mở **`/admin`** → tab *Đơn thuê xe* → gọi khách → bấm **➡ Đã xác nhận**
3. Giao xe: bấm **➡ Đang giao xe** → khách ký nhận: **➡ Đang thuê** → trả xe: **➡ Hoàn tất**
4. Khách mở **`/tai-khoan`** thấy đúng trạng thái từng bước + ghi chú bạn gửi
5. Yêu cầu tư vấn (xe cũ, phụ kiện, dài hạn) nằm ở tab *Tư vấn*

## 🧩 API (Vercel serverless)

| Endpoint | Chức năng |
|---|---|
| `POST /api/orders` | Khách tạo đơn thuê (kèm token nếu đã đăng nhập) |
| `GET /api/orders` | Khách xem đơn của mình (token) / admin xem tất cả (x-admin-key) |
| `POST /api/orders {action}` | Admin đổi trạng thái, ghi chú gửi khách, xóa đơn |
| `POST /api/auth` | Đăng ký / đăng nhập khách hàng (mật khẩu băm scrypt) |
| `GET /api/auth` | Lấy thông tin tài khoản từ token |
| `POST /api/lead` · `GET/POST /api/leads` | Nhận & quản trị yêu cầu tư vấn |
| `GET /api/users` | Admin xem danh sách khách đã đăng ký |

## 📁 Cấu trúc

```
timxedien/
├── index.html          # Trang bán hàng chính
├── xe-cu.html          # Xe điện đã qua sử dụng
├── phu-kien.html       # Phụ kiện xe điện
├── tai-khoan.html      # Tài khoản khách + theo dõi đơn
├── admin.html          # Quản trị mini-CRM (cần ADMIN_KEY)
├── css/style.css
├── js/data.js          # ⭐ DỮ LIỆU — sửa giá/xe/liên hệ tại đây
├── js/app.js           # Chức năng trang chủ
├── js/page.js          # Khung dùng chung trang con
├── js/auth.js          # Phiên đăng nhập phía khách
├── api/                # orders, auth, users, lead, leads
└── images/cars/        # Ảnh các dòng xe
```

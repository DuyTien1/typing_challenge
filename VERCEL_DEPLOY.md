# 🚀 Hướng Dẫn Deploy FastTyping Trên Vercel & Kết Nối CSDL Supabase

Tài liệu này hướng dẫn chi tiết cách triển khai toàn bộ ứng dụng **FastTyping – Đấu Trường Tốc Ký & Tu Tiên Gõ Phím** lên nền tảng **Vercel** kết hợp cơ sở dữ liệu **Supabase PostgreSQL**.

---

## 🏗️ Kiến Trúc Hệ Thống (Serverless Architecture)

- **Frontend (Giao diện người dùng):** Được build bởi Vite, phân phối tốc độ cao trên mạng lưới toàn cầu Vercel Edge CDN.
- **Backend API:** Chạy dưới dạng **Vercel Serverless Functions** (`/api/index.ts`), tự động scale theo lưu lượng truy cập mà không lo bị treo hoặc tốn chi phí máy chủ.
- **Database (Cơ sở dữ liệu):** Sử dụng **Supabase PostgreSQL** với Connection Pooler IPv4, tự động khởi tạo bảng (`server/schema.sql`) và lưu trữ vĩnh viễn:
  - Tài khoản người chơi, cảnh giới tu vi, mật khẩu mã hóa & phiên đăng nhập (`app_users`)
  - Danh sách Tông môn, cống hiến & bang hội chiến (`app_sects`)
  - Chợ Phường Thị P2P & nhật ký giao dịch (`app_market_listings`, `app_market_logs`)
  - Bảng Vàng WPM Toàn Cầu các thể thức (`app_leaderboards`)
  - Danh sách Bàn Cổ Thần Thức xử phạt (`app_banned_users`)
  - Phòng đua thời gian thực & tán gẫu liên máy chủ (`app_game_rooms`, `app_chat_messages`)

---

## 📋 Bước 1: Tạo Database Trên Supabase

1. Truy cập [supabase.com](https://supabase.com) và đăng nhập hoặc đăng ký tài khoản miễn phí.
2. Bấm **New Project**, đặt tên (vd: `fasttyping-db`) và nhập mật khẩu quản trị cơ sở dữ liệu (hãy ghi nhớ mật khẩu này).
3. **Chọn Region:** Khuyến nghị chọn **Singapore (ap-southeast-1)** để có độ trễ (ping) thấp nhất về Việt Nam (< 35ms).
4. Sau khi project khởi tạo xong:
   - Vào **Project Settings** (biểu tượng bánh răng ở thanh bên trái) -> Chọn mục **Database**.
   - Cuộn xuống phần **Connection string** -> Chọn tab **URI**.
   - Chọn chế độ **Connection pooling** (chế độ Transaction hoặc Session, port **6543** hoặc **5432**).
   - Sao chép chuỗi kết nối dạng:
     ```text
     postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```
   - Thay `[YOUR-PASSWORD]` bằng mật khẩu bạn đã đặt ở bước 2.

> **💡 Lưu ý:** Hệ thống FastTyping có cơ chế tự động khởi tạo toàn bộ bảng khi kết nối lần đầu. Nếu bạn có sẵn dữ liệu cũ từ các file JSON (`users.json`, `sects.json`...), bạn có thể chạy lệnh di chuyển dữ liệu một lần:
> ```bash
> npx tsx scripts/migrate-to-supabase.ts "YOUR_SUPABASE_DATABASE_URL"
> ```

---

## ⚡ Bước 2: Deploy Lên Vercel

1. Đẩy toàn bộ mã nguồn của bạn lên GitHub hoặc GitLab.
2. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub/GitLab.
3. Bấm nút **Add New...** -> Chọn **Project**.
4. Chọn repository chứa mã nguồn FastTyping và bấm **Import**.
5. Trong giao diện cấu hình Deploy:
   - **Framework Preset:** Vercel sẽ tự động nhận diện là **Vite** (hoặc chọn Vite).
   - **Root Directory:** Để `./` (mặc định).
   - **Build and Output Settings:** Đã được cấu hình tự động thông qua file `vercel.json` (Build command: `vite build`, Output directory: `dist`).
6. Mở rộng mục **Environment Variables** (Biến môi trường) và thêm các biến sau:

| Tên Biến | Giá Trị Mẫu | Mô Tả |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` | Chuỗi kết nối Supabase PostgreSQL Connection Pooler |
| `GEMINI_API_KEY` | `AIzaSy...` | *(Tùy chọn)* API key của Google Gemini cho tính năng AI Huấn Luyện Viên cá nhân hóa |
| `NODE_ENV` | `production` | Môi trường chạy production |

7. Bấm nút **Deploy**. Vercel sẽ tiến hành build frontend và đóng gói Serverless API trong khoảng 1 phút.

---

## ✅ Bước 3: Kiểm Tra Hoạt Động

Sau khi deploy thành công:
1. Mở liên kết website được cấp bởi Vercel (vd: `https://fasttyping-challenge.vercel.app`).
2. Kiểm tra sức khỏe kết nối CSDL tại endpoint:
   ```text
   https://<your-vercel-domain>/api/health
   ```
   Kết quả trả về sẽ hiển thị:
   ```json
   {
     "status": "healthy",
     "database": {
       "configured": true,
       "connected": true,
       "type": "postgresql_supabase",
       "latencyMs": 28,
       "tablesVerified": true
     }
   }
   ```
3. Đăng ký tài khoản mới hoặc đăng nhập, tạo phòng đua, chat và lưu trữ dữ liệu tu tiên. Toàn bộ dữ liệu sẽ được lưu trữ vĩnh viễn trên Supabase!

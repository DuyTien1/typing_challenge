# 🚀 HƯỚNG DẪN TRIỂN KHAI BACKEND RIÊNG BIỆT TRÊN RAILWAY VỚI POSTGRESQL

Tài liệu này hướng dẫn chi tiết cách triển khai Backend của **FastTyping - Tu Tiên Đạo** lên **Railway** kết hợp với cơ sở dữ liệu **PostgreSQL** để thay thế hoàn toàn các file JSON local (`users.json`, `market.json`, `sects.json`, v.v.).

---

## 🌟 Ưu điểm của mô hình này:
1. **Không còn lưu file local:** Dữ liệu người chơi, tu vi, đan dược, bảng xếp hạng, chợ P2P được lưu an toàn 100% trong PostgreSQL.
2. **Real-time mượt mà:** Máy chủ Backend chạy liên tục (Dedicated Process), duy trì kết nối phòng đua và chat SSE không bao giờ bị ngắt quãng hay giới hạn thời gian chạy như Serverless.
3. **Miễn phí khởi đầu:** Railway tặng $5 credit miễn phí hàng tháng, đủ cho cả Backend Node.js và PostgreSQL.

---

## 🛠️ BƯỚC 1: TẠO DỰ ÁN VÀ DATABASE POSTGRESQL TRÊN RAILWAY

1. Truy cập [https://railway.com/](https://railway.com/) và đăng nhập bằng tài khoản **GitHub**.
2. Nhấn nút **"+ New Project"**.
3. Chọn **"Provision PostgreSQL"** (Tạo cơ sở dữ liệu PostgreSQL trước).
   - Railway sẽ tạo ngay lập tức 1 Database PostgreSQL trong 3 giây.
   - Database này sẽ tự động sinh ra biến môi trường `DATABASE_URL`.

---

## 🚀 BƯỚC 2: DEPLOY BACKEND SERVICE TỪ REPOSITORY GITHUB

1. Trong giao diện Project trên Railway vừa tạo, nhấn nút **"+ Create"** (hoặc **"+ New"** ở góc phải).
2. Chọn **"GitHub Repo"** và chọn repository chứa mã nguồn FastTyping của bạn.
3. Railway sẽ tự động liên kết service này vào cùng project.

---

## ⚙️ BƯỚC 3: CẤU HÌNH BIẾN MÔI TRƯỜNG TRÊN RAILWAY

1. Nhấp vào service Backend vừa tạo -> Chọn tab **"Variables"**.
2. Nhấn **"Add Reference"** (hoặc gõ tên biến):
   - Chọn biến `DATABASE_URL` từ dịch vụ PostgreSQL vừa tạo ở Bước 1. *(Railway sẽ tự động điền connection string bí mật dạng `postgresql://postgres:...`)*.
3. Thêm các biến môi trường bổ sung:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
4. *(Tùy chọn)* Nếu dùng Gemini AI:
   - `GEMINI_API_KEY` = `(Khóa API Gemini của bạn)`

---

## 🌐 BƯỚC 4: TẠO PUBLIC DOMAIN CHO BACKEND

1. Vẫn trong service Backend trên Railway, chuyển sang tab **"Settings"**.
2. Cuộn xuống mục **"Networking"** -> Nhấn **"Generate Domain"**.
3. Railway sẽ cung cấp cho bạn 1 đường link công khai, ví dụ:
   `https://fasttyping-production.up.railway.app`

---

## 🔗 BƯỚC 5: TRIỂN KHAI HOẶC KẾT NỐI FRONTEND

Dự án hiện tại hỗ trợ chạy Full-Stack nguyên khối (Frontend + Backend phục vụ cùng lúc trên cùng domain).
- **Nếu chạy Full-Stack trên Railway**: Bạn chỉ cần deploy repository, hệ thống sẽ tự động build và phục vụ cả giao diện React lẫn API trên cùng 1 domain duy nhất (không cần cấu hình thêm biến API URL).
- Nếu triển khai Frontend tách rời trên Vercel, các yêu cầu API có thể được định tuyến qua rewrite proxy trong `vercel.json`.

---

## 🧪 BƯỚC 6: KIỂM TRA HOẠT ĐỘNG (VERIFICATION)

1. **Kiểm tra Healthcheck:**
   Mở trình duyệt truy cập:
   `https://<domain-railway-cua-ban>/api/health`
   Kết quả trả về dạng:
   ```json
   { "status": "ok", "activeRooms": 0, "registeredUsers": 1 }
   ```
2. **Kiểm tra Database đã tự động khởi tạo:**
   - Vào Railway -> Bấm vào service **PostgreSQL** -> Chọn tab **"Data"**.
   - Bạn sẽ thấy các bảng đã được code tự động khởi tạo từ `server/schema.sql`:
     - `app_users`
     - `app_sects`
     - `app_market_listings`
     - `app_market_logs`
     - `app_leaderboards`
     - `app_banned_users`
   - Bảng `app_users` sẽ tự động có sẵn tài khoản quản trị viên:
     - **Tài khoản:** `admin`
     - **Mật khẩu:** `admin123`

Chúc mừng bạn đã triển khai thành công Backend kiến trúc MMO Game chuyên nghiệp không phụ thuộc file local! 🎉

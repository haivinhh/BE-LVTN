# 🖥️ Backend — REST API Thương Mại Điện Tử

> REST API xây dựng bằng **Node.js + Express**, kết nối cơ sở dữ liệu **PostgreSQL (Supabase)**, xác thực bằng **JWT** (Access Token + Refresh Token qua httpOnly cookie), tích hợp thanh toán **ZaloPay** và gửi mail qua **Nodemailer**.

---

## 🗂️ Mục lục

- [Tổng quan](#-tổng-quan)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [Biến môi trường](#-biến-môi-trường)
- [Cơ chế xác thực JWT](#-cơ-chế-xác-thực-jwt)
- [Phân quyền](#-phân-quyền)
- [API Reference](#-api-reference)

---

## 🌐 Tổng quan

Backend cung cấp RESTful API cho:

- **Khách hàng**: đăng ký, đăng nhập, xem sản phẩm, quản lý giỏ hàng, đặt hàng, thanh toán, quản lý tài khoản
- **Nhân viên**: xác nhận đơn hàng, quản lý sản phẩm, danh mục, khách hàng, xem thống kê
- **Admin**: toàn quyền quản lý nhân viên và hệ thống

---

## ⚙️ Công nghệ sử dụng

| Thư viện | Phiên bản | Mục đích |
|---|---|---|
| Express | ^4.19.2 | HTTP framework |
| PostgreSQL (pg) | ^8.12.0 | Cơ sở dữ liệu |
| jsonwebtoken | ^9.0.2 | Tạo & xác thực JWT |
| bcryptjs | ^2.4.3 | Hash mật khẩu |
| cookie-parser | ^1.4.6 | Đọc httpOnly cookie |
| cors | ^2.8.5 | Cho phép cross-origin từ Frontend |
| dotenv | ^16.4.5 | Quản lý biến môi trường |
| nodemailer | ^6.9.14 | Gửi email (quên mật khẩu) |
| axios | ^1.7.3 | Gọi API ZaloPay |
| crypto-js | ^4.2.0 | Tạo HMAC signature cho ZaloPay |
| moment | ^2.30.1 | Xử lý ngày giờ |

---

## 📁 Cấu trúc thư mục

```
├── server.js                  # Khởi động server (port 3001)
├── app.js                     # Cấu hình Express, CORS, middleware
│
└── src/
    ├── config/
    │   └── dbConfig.js        # Kết nối PostgreSQL qua Pool
    │
    ├── models/
    │   └── db.js              # Export connection pool
    │
    ├── middleware/
    │   └── (verifyToken...)   # Xác thực token trong controller
    │
    ├── routes/
    │   └── index.js           # Toàn bộ định tuyến API
    │
    ├── controllers/
    │   ├── customersController.js      # Đăng ký, đăng nhập, tài khoản KH
    │   ├── customersAccController.js   # Quản lý khách hàng (nhân viên)
    │   ├── usersController.js          # Nhân viên (đăng nhập, quản lý)
    │   ├── adminController.js          # Admin quản lý nhân viên
    │   ├── productController.js        # Sản phẩm
    │   ├── danhMucSPController.js      # Danh mục sản phẩm
    │   ├── dongDTController.js         # Dòng điện thoại
    │   ├── loaiDienThoaiController.js  # Loại điện thoại
    │   ├── cartController.js           # Giỏ hàng, đơn hàng
    │   ├── orderController.js          # Quản lý đơn hàng (nhân viên)
    │   ├── ShipController.js           # Đơn vị vận chuyển
    │   ├── forgotPasswordController.js # Quên mật khẩu qua email
    │   ├── middlewareController.js     # Verify token middleware
    │   ├── statisticsController.js     # Thống kê doanh thu
    │   └── ZALOPAY/                    # Tích hợp ZaloPay
    │
    └── mailService.js                  # Cấu hình gửi email
```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu
- Node.js >= 16
- PostgreSQL (hoặc Supabase)

### Các bước

```bash
# 1. Cài đặt dependencies
npm install

# 2. Tạo file .env (xem mục Biến môi trường bên dưới)

# 3. Khởi động server
npm start
# → Server chạy tại http://localhost:3001
```

---

## 🔑 Biến môi trường

Tạo file `.env` ở thư mục gốc:

```env
# Database (PostgreSQL / Supabase)
DB_HOST=your_db_host
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# JWT
JWT_ACCESS_KEY=your_access_token_secret
JWT_REFRESH_KEY=your_refresh_token_secret

# Email (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# ZaloPay
ZALOPAY_APP_ID=your_app_id
ZALOPAY_KEY1=your_key1
ZALOPAY_KEY2=your_key2
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2
```

---

## 🔒 Cơ chế xác thực JWT

| Token | Nơi lưu | Thời hạn | Mục đích |
|---|---|---|---|
| **Access Token** | Redux store (FE) | 120 giây | Xác thực mỗi request |
| **Refresh Token** | `httpOnly cookie` | 365 ngày | Làm mới Access Token |

**Luồng làm mới token:**

```
Request với Access Token hết hạn
    │
    ▼
FE interceptor phát hiện token hết hạn
    │
    ▼
POST /api/refreshtokencus  (gửi kèm cookie tự động)
    │
    ▼
Server verify Refresh Token (JWT verify)
    │
    ├─ Hợp lệ → cấp Access Token mới + Refresh Token mới
    └─ Không hợp lệ → 403 → FE tự đăng xuất
```

> **Lưu ý:** Refresh Token được xác thực hoàn toàn qua JWT signature — không dùng whitelist in-memory (tránh mất state khi server restart).

---

## 🛡️ Phân quyền

| Middleware | Áp dụng cho |
|---|---|
| `verifyToken` | Route cần đăng nhập (khách hàng) |
| `verifyTokenAndIsEmployee` | Route dành cho nhân viên + admin |
| `verifyTokenAndIsAdmin` | Route chỉ dành cho admin |

---

## 📡 API Reference

Base URL: `http://localhost:3001/api`

Các route cần xác thực phải gửi header: `token: Bearer <accessToken>`

---

### 👤 Khách hàng

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/cusregister` | ❌ | Đăng ký tài khoản |
| POST | `/cuslogin` | ❌ | Đăng nhập |
| POST | `/cuslogout` | ✅ | Đăng xuất, xóa cookie |
| POST | `/refreshtokencus` | ❌ (cookie) | Làm mới Access Token |
| GET | `/getcusbyid` | ✅ | Lấy thông tin khách hàng |
| PUT | `/updateuser` | ✅ | Cập nhật thông tin |
| POST | `/changepassword` | ✅ | Đổi mật khẩu |
| GET | `/address` | ✅ | Lấy địa chỉ |
| PUT | `/address` | ✅ | Cập nhật địa chỉ |
| POST | `/forgot-password` | ❌ | Yêu cầu reset mật khẩu qua email |
| POST | `/reset-password` | ❌ | Đặt lại mật khẩu |

---

### 🛒 Giỏ hàng & Đơn hàng (Khách hàng)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/cart` | ✅ | Lấy giỏ hàng |
| POST | `/cart/add` | ✅ | Thêm / cập nhật sản phẩm vào giỏ |
| PUT | `/cart/updatecartitem` | ✅ | Cập nhật số lượng |
| DELETE | `/cart/deletecartitem` | ✅ | Xóa sản phẩm khỏi giỏ |
| GET | `/detailcart` | ✅ | Chi tiết giỏ hàng hiện tại |
| GET | `/getdetailcart/:idDonHang` | ✅ | Chi tiết đơn hàng theo ID |
| POST | `/cancelorder` | ✅ | Hủy đơn hàng |
| POST | `/paycod` | ✅ | Thanh toán COD |

---

### 💳 Thanh toán ZaloPay

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/createpayment` | ✅ | Tạo đơn thanh toán ZaloPay |
| POST | `/callback` | ❌ | Webhook callback từ ZaloPay |
| POST | `/check-order-status/:app_trans_id` | ✅ | Kiểm tra trạng thái đơn |
| POST | `/refund` | ✅ | Yêu cầu hoàn tiền |
| POST | `/processRefundAndCheckStatus` | ✅ | Hoàn tiền + kiểm tra trạng thái |

---

### 📦 Sản phẩm (Public)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/sanpham` | ❌ | Lấy tất cả sản phẩm |
| GET | `/sanpham/detail/:idSanPham` | ❌ | Chi tiết sản phẩm |
| GET | `/sanpham/danhmuc/:idDanhMuc` | ❌ | Lọc theo danh mục |
| GET | `/sanpham/search/:productName` | ❌ | Tìm kiếm sản phẩm |
| GET | `/sanpham/filter` | ❌ | Lọc nâng cao |
| GET | `/danhmucsp` | ❌ | Lấy danh sách danh mục |

---

### 🔧 Quản lý (Nhân viên / Admin)

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| POST | `/sanpham` | Nhân viên | Thêm sản phẩm |
| PUT | `/sanpham/:id` | Nhân viên | Cập nhật sản phẩm |
| DELETE | `/sanpham/:id` | Nhân viên | Xóa sản phẩm |
| GET | `/getallcart` | Nhân viên | Tất cả đơn hàng |
| GET | `/getallcartwaiting` | Nhân viên | Đơn chờ xác nhận |
| POST | `/confirmorder` | Nhân viên | Xác nhận đơn |
| GET | `/getallcartdelivery` | Nhân viên | Đơn đang giao |
| POST | `/confirmdone` | Nhân viên | Xác nhận giao thành công |
| GET | `/getallcartdone` | Nhân viên | Đơn đã hoàn thành |
| GET | `/getallusers` | Admin | Danh sách nhân viên |
| POST | `/user/add` | Admin | Thêm nhân viên |
| PUT | `/users/:idNhanVien` | Admin | Cập nhật nhân viên |
| DELETE | `/users/:idNhanVien` | Admin | Xóa nhân viên |

---

### 📊 Thống kê (Nhân viên)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/getmostsoldproducts` | Sản phẩm bán chạy |
| POST | `/gettopcustomers` | Khách hàng mua nhiều nhất |
| POST | `/getrevenuebyyear` | Doanh thu theo năm |

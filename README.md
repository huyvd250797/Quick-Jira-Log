# Quick Jira Log V0.1.0

Web app cá nhân để logwork nhanh vào Jira `https://task.ascvn.com.vn`.

## Bạn chỉ thao tác 2 bước

1. Đăng nhập bằng **ID Jira + Password**.
2. Nhập **KEY / PROJECT / TimeSpent / Date / Description** rồi bấm **LOG WORK**.

Không có ô Jira URL, API Token, OAuth, Client ID hay cấu hình kết nối ở giao diện.

## Quy tắc tự xếp giờ

- Ca sáng: `08:00 - 12:00`
- Ca chiều: `13:30 - 17:30`
- Tối đa: `8h/ngày`
- App đọc worklog hiện có của chính tài khoản trong ngày để tránh chồng giờ.
- Ưu tiên giờ trống sớm nhất.
- Tự tách thành nhiều worklog nếu đi qua giờ nghỉ trưa hoặc gặp worklog đã có.

Ví dụ ngày trống, nhập `5h`:

- `08:00 - 12:00` = 4h
- `13:30 - 14:30` = 1h

## Xác thực Jira

App thử theo thứ tự:

1. Jira REST session `/rest/auth/1/session` bằng ID + password.
2. Nếu Jira không hỗ trợ session endpoint, fallback HTTP Basic Auth và kiểm tra `/rest/api/2/myself`.

Sau khi login, thông tin xác thực được mã hóa AES-256-GCM trong **HttpOnly + Secure cookie**. Frontend không đọc được password/session.

> Với fallback Basic Auth, password cần nằm bên trong cookie đã mã hóa để backend tiếp tục gọi Jira. Nó không được lưu vào localStorage hoặc hiển thị lại trên UI.

## Deploy Vercel

### 1. Upload/import source lên Vercel

Không cần build framework; đây là static frontend + Vercel Functions thuần Node.js.

### 2. Environment Variables

Bắt buộc tạo:

```env
APP_SESSION_SECRET=<chuỗi ngẫu nhiên tối thiểu 32 ký tự>
```

Có thể tạo bằng:

```bash
openssl rand -hex 32
```

Tùy chọn:

```env
SESSION_MAX_AGE_SECONDS=43200
```

Mặc định phiên app tồn tại tối đa 12 giờ.

### 3. Deploy

Không cần cấu hình Jira URL. Source đã cố định:

`https://task.ascvn.com.vn`

## Nếu login không được

Khả năng Jira công ty đang dùng SSO/CAPTCHA/MFA hoặc REST session/basic auth bị tắt. Khi đó gửi lại response/error hiển thị trên app để điều chỉnh connector login, giao diện vẫn giữ nguyên chỉ ID + Password.

## Cấu trúc

- `index.html` / `styles.css` / `app.js`: giao diện mobile-first.
- `api/login.js`: đăng nhập Jira.
- `api/status.js`: kiểm tra phiên.
- `api/logout.js`: đăng xuất.
- `api/worklog.js`: kiểm tra issue, đọc worklog trong ngày, xếp giờ và logwork.
- `lib/scheduler.js`: engine ca sáng/chiều.
- `lib/session.js`: mã hóa session.
- `lib/jira.js`: Jira REST connector.

## Test scheduler

```bash
npm test
```

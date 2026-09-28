# Quick Jira Log V0.4.0 – Bulk Logwork & Flexible Filters

Web app cá nhân để logwork nhanh vào `https://task.ascvn.com.vn` từ mobile/desktop.

## Điểm mới V0.4.0

### 1. Bulk Logwork
- Bật **Chọn nhiều** tại danh sách issue của Jira Filter.
- Chọn tối đa 20 issue.
- Mỗi issue có `TimeSpent` và `Description` riêng; Description mặc định lấy từ Summary.
- Chọn một `Date` chung cho batch.
- Backend đọc worklog đã có và tự xếp các issue lần lượt vào thời gian còn trống.
- Issue sau không bao giờ được xếp đè issue trước trong cùng batch.
- Trước khi tạo từng issue, backend đọc worklog Jira lại để giảm tối đa rủi ro trùng giờ khi dữ liệu vừa thay đổi.
- Chỉ log trong:
  - `08:00–12:00`
  - `13:30–17:30`
- Nếu giữa batch xảy ra lỗi, app cố rollback các worklog vừa tạo của batch.

### 2. Flexible Jira Filters
- Không còn hard-code `[HuyVo] - No Work Logged`.
- Sau khi login, app tải danh sách Jira Filter của tài khoản.
- Có dropdown chuyển filter ngay trong app.
- Nhớ filter dùng gần nhất trên thiết bị.
- Có nút tải lại danh sách filter và nút refresh issue riêng.
- Backend ưu tiên `filter/my`; nếu Jira phiên bản cũ không hỗ trợ sẽ fallback qua filter search/Favourite.

### 3. Mobile zoom lock
- Viewport khóa `maximum-scale=1` và `user-scalable=no`.
- Chặn gesture zoom trên Safari/iOS.
- Form control dùng font-size 16px ở mobile để iPhone không tự zoom khi focus input.

## Luồng sử dụng

1. Đăng nhập bằng `ID Jira + Password`.
2. Chọn Jira Filter muốn dùng.
3. Có 2 cách:
   - **Log đơn:** chạm issue → nhập TimeSpent/Date → Log Work.
   - **Bulk:** bấm `Chọn nhiều` → chọn issue → `Tiếp tục` → nhập TimeSpent từng issue → `LOG BULK`.

## Quy tắc xếp giờ

App chỉ sử dụng 2 khung giờ:

```text
08:00–12:00
13:30–17:30
```

Ví dụ ngày đã có:

```text
08:00–09:00  đã log
10:00–11:00  đã log
```

Bulk gồm:

```text
TASK-A  2h
TASK-B  2h
```

Có thể được xếp:

```text
TASK-A
09:00–10:00  1h
11:00–12:00  1h

TASK-B
13:30–15:30  2h
```

## Deploy Vercel

Environment Variables:

```env
APP_SESSION_SECRET=<chuỗi ngẫu nhiên tối thiểu 32 ký tự>
SESSION_MAX_AGE_SECONDS=43200
```

Tạo secret ví dụ:

```bash
openssl rand -hex 32
```

Không cần cấu hình Jira URL trong UI; app dùng cố định:

```text
https://task.ascvn.com.vn
```

## Bảo mật

- Password Jira không lưu `localStorage`.
- Jira auth/session được mã hóa trong HttpOnly cookie.
- Request thay đổi dữ liệu kiểm tra same-origin.
- Backend chỉ gọi Jira từ server-side.

## Kiểm tra source

```bash
npm test
```

Test bao gồm parser TimeSpent, khung giờ làm việc, chống overlap và xếp lịch tuần tự cho Bulk Logwork.

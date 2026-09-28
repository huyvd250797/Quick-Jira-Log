# Quick Jira Log V0.3.0 – Quick Input & Templates

Web app cá nhân để logwork nhanh lên Jira `https://task.ascvn.com.vn`.

## Luồng sử dụng

1. Đăng nhập bằng ID + Password Jira.
2. Chọn KEY từ filter `[HuyVo] - No Work Logged` hoặc nhập KEY bằng tay.
3. App tự lấy PROJECT + Summary và điền Description.
4. Chọn TimeSpent bằng preset hoặc nhập tay.
5. Chọn Date, chỉnh Description nếu cần.
6. Bấm `LOG WORK`.
7. Backend tự né worklog đã tồn tại và chỉ xếp giờ trong:
   - 08:00–12:00
   - 13:30–17:30

## Mới trong V0.3.0

- Hiển thị version rõ ngay trên giao diện.
- Preset TimeSpent: `30m`, `1h`, `2h`, `4h`.
- Nhớ TimeSpent gần nhất.
- Nhớ PROJECT gần nhất.
- Recent KEY: lưu tối đa 8 issue log gần đây trên thiết bị.
- Quick Repeat: nạp lại issue/time/description của lần log gần nhất, ngày tự chuyển về hôm nay.
- Description Templates:
  - lưu Description hiện tại thành mẫu;
  - áp dụng nhanh từ dropdown;
  - quản lý/xóa mẫu;
  - tối đa 30 mẫu.
- Template hỗ trợ biến:
  - `{summary}`
  - `{key}`
  - `{project}`
  - `{date}`

Dữ liệu Quick Input/Template chỉ lưu trong `localStorage` của trình duyệt hiện tại. Password Jira không được lưu ở đây.

## Cấu hình Vercel

Biến môi trường bắt buộc:

```env
APP_SESSION_SECRET=<chuỗi ngẫu nhiên tối thiểu 32 ký tự>
```

Jira URL đã được cấu hình cố định trong app: `https://task.ascvn.com.vn`.

## Bảo vệ worklog

Logic V0.2.1 tiếp tục được giữ nguyên:

- đọc worklog của chính user trong ngày trước khi tạo;
- không xếp trùng thời gian;
- không log trước 08:00;
- không log trong 12:00–13:30;
- không log sau 17:30;
- tự chia segment nếu TimeSpent đi qua giờ nghỉ trưa hoặc gặp khoảng đã có worklog;
- validate segment lần cuối trước khi POST lên Jira.

## Test

```bash
npm test
```

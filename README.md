# Quick Jira Log V1.0.0 – Stable Personal Release

Web app cá nhân để logwork nhanh vào `https://task.ascvn.com.vn`.

## Điểm mới V1.0.0

### Dark mode / Light mode
- Nút chuyển theme ở góc header.
- Có lựa chọn Sáng/Tối trong `⚙ Cài đặt`.
- Theme được ghi nhớ trên thiết bị.

### Header an toàn hơn
- `⚙ Cài đặt` được đưa lên góc trên bên phải.
- `Đăng xuất` đổi thành icon riêng trong card trạng thái Jira.
- Bấm icon đăng xuất có bước xác nhận để tránh thao tác nhầm.

### Stable Personal Release
- Giữ JQL Sub-task cố định, không phụ thuộc Saved Filter.
- Giữ Worklog Guard và khung giờ `08:00–12:00` / `13:30–17:30`.
- Auto Done sau logwork nếu workflow cho phép.
- Worklog History & Correction, Bulk Logwork, Recent KEY, preset TimeSpent, Quick Repeat, Description Template và PWA.
- Giữ toàn bộ Production Hardening của V0.9.0.

## Deploy Vercel

```env
APP_SESSION_SECRET=<random-secret-tối-thiểu-32-ký-tự>
SESSION_MAX_AGE_SECONDS=43200
```

Jira URL cố định: `https://task.ascvn.com.vn`

## Version

`V1.0.0`

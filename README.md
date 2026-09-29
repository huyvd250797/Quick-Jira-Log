# Quick Jira Log V0.8.0 – Worklog History & Correction

Web app cá nhân để logwork nhanh vào `https://task.ascvn.com.vn`.

## Điểm mới V0.8.0

- Splash/loading khi mở app.
  - Nếu app session còn hạn: splash kiểm tra session rồi vào thẳng app, không flash màn hình login.
  - Session status dùng thông tin đã mã hóa trong app cookie để mở nhanh hơn; Jira vẫn kiểm tra thật ở API kế tiếp.
- Sau khi logwork thành công, app tự tìm transition phù hợp để chuyển issue sang `Done`.
  - Nếu issue đã Done: bỏ qua.
  - Nếu workflow không có transition Done hoặc user không có quyền transition: worklog vẫn được giữ và app báo cảnh báo.
- Worklog History & Correction trong `⚙ Cài đặt`.
  - Xem worklog thật của chính user trên Jira theo ngày.
  - Sửa Date / Start / TimeSpent / Description.
  - Xóa worklog.
  - Khi sửa, backend vẫn kiểm tra overlap và chỉ cho phép trong `08:00–12:00` / `13:30–17:30`.
- Logo/icon mới: clock + check, dùng thống nhất cho header, splash, favicon, Apple Touch Icon và PWA.
- Tối ưu thời gian logwork:
  - tái sử dụng identity trong encrypted session, giảm một Jira round-trip;
  - giảm stabilization wait từ 1.2s xuống 250ms;
  - một lần stable Worklog Guard tạo kế hoạch đầy đủ, không quét toàn bộ Jira lại trước từng segment;
  - Bulk dùng một kế hoạch chung thay vì rescan trước từng segment.
- Version hiển thị: `V0.8.0`.

## Quy tắc thời gian

App chỉ được tạo/sửa worklog trong:

- 08:00–12:00
- 13:30–17:30

Không được overlap với worklog hiện có của user trong ngày.

## Deploy Vercel

Environment Variables giữ nguyên:

```env
APP_SESSION_SECRET=<random-secret-tối-thiểu-32-ký-tự>
SESSION_MAX_AGE_SECONDS=43200
```

Jira URL được cố định trong app:

`https://task.ascvn.com.vn`

## Lưu ý Auto Done

Jira workflow phải có transition mà app nhận diện được là `Done`, `Hoàn thành`, `Complete/Completed`, `Close/Closed` hoặc `Resolve/Resolved`, hoặc target status thuộc status category `done`.

Nếu workflow không cho phép transition trực tiếp từ trạng thái hiện tại sang Done, logwork vẫn thành công nhưng trạng thái sẽ không thay đổi.

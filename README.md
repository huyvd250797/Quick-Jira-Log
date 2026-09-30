# Quick Jira Log V1.3.0 – Overtime & Mobile Navigation Fix

## Thay đổi chính

- Fix taskbar trên mobile: sau khi đăng nhập, taskbar **Kiểm tra** và **Worklog đã log** hiển thị cố định phía dưới.
- Đổi nhãn đăng nhập thành **Username / Password**.
- Khung giờ logwork thường: `08:00–12:00` và `13:00–17:30`.
- Worklog thường giữ giới hạn tối đa `8h` cho mỗi lần log.
- Bổ sung **Overtime (OT)** cho từng Sub-task ở log đơn và Log tất cả.
- OT Thứ 2–Thứ 6: tự xếp từ `17:30–23:59`.
- OT Thứ 7/CN: tự xếp trong `08:00–12:00` và `13:00–17:30`.
- Sub-task bật OT được cập nhật field Jira tên **Overtime** trước khi hoàn tất. App tự tìm field này trong Edit Meta/Field metadata.
- Nếu Jira không có hoặc không cho phép cập nhật field **Overtime**, app chặn OT và trả lỗi rõ ràng để tránh logwork OT nhưng không được đánh dấu trên Jira.
- Vẫn giữ chống trùng giờ, To Do → In Progress → Done, Worklog History/Correction, Planner và PWA.

## Lưu ý Jira

Field **Overtime** cần tồn tại trên Jira và tài khoản hiện tại phải có quyền Edit Issue. Với checkbox/select, app ưu tiên option `Overtime`, `OT`, `Yes/True/Có`, hoặc option duy nhất của field.

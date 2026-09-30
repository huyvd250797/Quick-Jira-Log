# Quick Jira Log V1.3.1 – Worktime & Mobile Bottom Sheet Fix

## Thay đổi chính

- Khung giờ logwork thường được sửa đúng về `08:00–12:00` và `13:30–17:30`.
- OT Thứ 2–Thứ 6: tự xếp từ `17:30–23:59`.
- OT Thứ 7/CN: tự xếp trong `08:00–12:00` và `13:30–17:30`.
- Trên mobile, chọn một Sub-task hoặc bấm **Log tất cả** sẽ mở editor dạng **bottom sheet**; nền phía sau bị khóa scroll để giao diện gọn hơn.
- Khi nhập/chỉnh `TimeSpent`, ngày hoặc OT, app gọi Jira để lập **Dự kiến** theo các worklog thực tế đã có trong ngày và hiển thị khoảng giờ sẽ log.
- Bulk Logwork cũng hiển thị Dự kiến riêng cho từng Sub-task theo đúng thứ tự xếp lịch của batch.
- Giữ Username / Password, taskbar mobile, field Jira **Overtime**, chống trùng giờ, To Do → In Progress → Done, History/Correction, Planner và PWA.

## Lưu ý Jira

Field **Overtime** cần tồn tại trên Jira và tài khoản hiện tại phải có quyền Edit Issue. Với checkbox/select, app ưu tiên option `Overtime`, `OT`, `Yes/True/Có`, hoặc option duy nhất của field.

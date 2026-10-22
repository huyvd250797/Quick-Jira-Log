# Quick Jira Log V1.30.0 — Thống kê dự án

Chức năng mới theo yêu cầu Boss: xem giờ và số Subtask đã log theo từng thành viên trong một dự án. Dùng taskbar Dự án trên mobile hoặc công cụ Thống kê dự án ở PC.

## Hoàn thành

- Lọc dự án, tuần/tháng hiện tại hoặc khoảng tối đa 93 ngày; biểu đồ giờ, 3 KPI, tỷ trọng, lọc/sort người, drilldown từng worklog.
- Tác giả thực tế, Subtask duy nhất, giờ công việc cha, ngày Việt Nam, OT native/unknown.
- Đọc theo nhóm/đủ trang, validation, session, no-store, giới hạn và lỗi tạm tính; khóa loading, reset tài khoản.
- Source Node24/Vercel sẵn cấu hình, không thêm DB/runtime package. Chi tiết quy tắc và giới hạn trong README.

## Kiểm chứng

- `npm run test`: đạt toàn bộ logic/API cũ và thống kê mới.
- Browser thống kê: Chromium, 4 viewport (PC,390,320,ngang844), cả light/dark, frontend và router/session thật với Jira giả lập; đạt lọc, drilldown, XSS/CSP, khóa nền, partial, taskbar4 cột và không tràn viền.
- Hồi quy browser editor ảnh: chọn/chèn/upload/khôi phục sau tạo, đọc lại/zoom đạt 4 viewport. Hồi quy calendar-experience: giữ vị trí/partial save/retry/unknown/readback đạt 4 viewport.
- Chưa kiểm tra Jira công ty và iPhone/Safari thật; chưa push GitHub/deploy. Không tuyên bố số liệu toàn dự án nếu quyền chỉ cho xem một phần. Đọc nhiều request không phải snapshot tại một thời điểm.

## Phiên bản tiếp theo đề xuất

V1.31.0 — Phân tích Sub-task Type theo thành viên: phân bổ giờ theo trường Sub-task Type thật trên Jira, drilldown nhóm. Chưa chốt/chưa xây dựng.

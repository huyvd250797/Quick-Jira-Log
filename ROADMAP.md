# Quick Jira Log — Roadmap

## V1.13.1 — Sửa Sub-task Type: đã xây dựng

- Đọc custom field riêng thay vì Issue Type, cộng giờ theo giá trị Jira đang chọn.
- Tự tìm field ID, xử lý trùng tên/field bị chặn, phân biệt null với chưa đọc được.
- Kiểm thử cùng một Issue Type Sub-task nhưng nhiều giá trị Testing/Supporting/Developing.

## V1.13.0 — Tổng hợp giờ & Overtime: đã xây dựng

- Thay Kiểm tra bằng Tổng hợp, giữ guard logwork.
- Chọn tuần/tháng/ngày/dự án; KPI giờ thường, OT và tổng giờ.
- Mục tiêu cá nhân không cộng OT; phân bổ giờ theo dự án và Sub-task Type thực tế Jira.
- Bấm biểu đồ xem và chỉnh sửa/xóa worklog; tải lại sau thay đổi.
- Xử lý dữ liệu thiếu, chưa biết OT, phân trang Jira, cache, lỗi và race chuyển kỳ.
- Responsive PC/mobile và PWA V1.13.0.

## Bước tiếp theo — đối soát sau deploy

- Đối chiếu tổng giờ/OT và tên Sub-task Type với dữ liệu Jira thật.
- Kiểm tra trên iPhone/Safari và deployment Vercel đang dùng.
- Chỉ xác định bản nâng cấp tiếp sau khi có phản hồi; chưa thêm xuất Excel, cấu hình ngày nghỉ hoặc loại báo cáo khác.

## Nền tảng đã có

- V1.12.1: native !update form, token/cookie Jira và xác minh sau lưu.
- V1.12.0: tạo Overtime cho log đơn/Bulk, đủ 8h thường vẫn log OT, rollback khi đồng bộ thất bại.
- V1.11.x: lịch tuần/tháng, fullscreen, bottom sheet, màu dự án, OT, lưu đăng nhập.

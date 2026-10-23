# Quick Jira Log V1.31.0 — Loading nền & bộ lọc thống kê

Theo yêu cầu Boss, thay loading đọc dữ liệu toàn màn hình bằng tác vụ nền và mở rộng phạm vi thống kê, không thay luồng ghi logwork hay cấp phép app.

## Đã xây dựng

- Loading lịch/Subtask/giờ đã log/tổng hợp/tra cứu và popup đọc không khóa nền. Tác vụ nhìn thấy khi chuyển màn hình; thống kê có nút Mở, tiến độ X/Y — %, tạm dừng/tiếp tục và thử phần lỗi.
- Tất cả/một dự án; toàn thời gian, năm, tháng, tuần bất kỳ và ngày tùy chọn. Bỏ giới hạn tổng 5.000 issue, 10.000 worklog/issue và 93 ngày; phân trang nhỏ theo năng lực server.
- Snapshot bộ lọc, dọn/hủy tác vụ theo phiên, bỏ phản hồi cũ; lỗi/unknown OT không chuyển thành số liệu đầy đủ giả. API chỉ đọc theo session hiện có.
- Các thao tác ghi Jira vẫn có xác nhận/chống trùng/khóa lúc gửi; core API ghi, giờ ca, Overtime, lịch kéo thả và editor ảnh không được viết lại.

## Kiểm chứng

- `npm run test`: toàn bộ logic/API và thống kê mới đạt.
- Chromium frontend thật → router/session → Jira giả lập: 1440×900,390×844,320×683,844×390; loading nền, đổi màn hình/mở badge, fullscreen PC, tiến độ, pause/resume, phạm vi/năm/tháng/tuần/ngày/toàn thời gian, retry không trùng, stale/account cleanup, CSP, layout sáng/tối và bảo vệ ghi đạt.
- Browser hồi quy editor ảnh/upload/create-recovery/zoom, lịch giữ vị trí/partial save/retry/unknown/readback và sửa Story/Task/Bug đạt bốn viewport.
- Syntax/JSON/HTML assets/PWA cache/source ZIP được kiểm tra. Không dùng tài khoản Jira công ty hoặc iPhone/Safari thật. Chưa push GitHub/deploy.

## Giới hạn cần biết

Thời gian đọc vẫn phụ thuộc Jira và khối lượng dữ liệu. Tiến độ là các công việc đã xử lý, bao gồm mục có lỗi được báo riêng. Quét nhiều request không phải snapshot. Chỉ dữ liệu được quyền xem; toàn thời gian có thể nhiều lượt đọc. Tác vụ trong RAM, không phải background job chạy khi đóng/reload app; mobile có thể treo trang khi chuyển ra ngoài app. Chi tiết trong README.

## Kế tiếp đề xuất

V1.32.0 — Phân tích Sub-task Type theo thành viên: phân bổ giờ theo trường custom thật trên Jira, drilldown từng nhóm. Chưa chốt/chưa xây dựng.

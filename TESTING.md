# Kiểm tra V1.9.0

Ngày: 16/10/2026. Runtime: Node.js v24.19.0.

## Đã chạy

- `npm test`: toàn bộ regression hiện có và test mới V1.9.0 đều đạt.
- `node --check`: app.js, lib/ui-tools.js, lib/jira.js, handlers/worklog-history.js, sw.js.
- Kiểm tra HTML: ID không trùng, form sửa nằm trong vùng cuộn lịch sử.
- Playwright + Chromium headless: desktop 1440×1000 và cấu hình thiết bị iPhone 13, phản hồi API giả lập.
- Kiểm tra trực quan ảnh render: form ghi giờ, danh sách cao hơn, lịch tháng; giao diện sáng/tối.

## Các thao tác đã xác minh bằng trình duyệt

1. Icon con mắt đổi password/text và đổi lại.
2. Preset 1h → tăng 30 phút → 1h 30m → giảm → 1h.
3. ArrowUp/ArrowDown ở ô giờ, giới hạn nút giảm tại 30m.
4. Bulk tăng giờ một dòng đồng bộ tổng thời gian.
5. Cửa sổ lịch sử cao hơn 90% viewport; vùng kết quả lớn hơn 43% viewport trên cả hai cấu hình.
6. Lịch tháng 10 có 31 ngày, tháng 11 có 30 ngày; chọn ngày xem worklog.
7. Bấm sự kiện lịch mở form sửa; tăng 30m và lưu gọi API, tải lại lịch.
8. Lỗi tải được giữ lại trên màn hình thay vì biến thành thông báo không có dữ liệu.
9. Chuyển ngày khi request cũ trả chậm: kết quả cũ không ghi đè ngày mới.
10. Không có lỗi JavaScript chưa xử lý; form ghi giờ không cuộn ngang sau khi dùng stepper.

## Giới hạn xác minh

- Không dùng tài khoản hoặc ghi dữ liệu lên Jira thật trong quá trình kiểm tra.
- Mô phỏng kích thước iPhone trong Chromium không thay thế kiểm tra Safari/PWA trên iPhone vật lý.
- Chưa deploy production. Giữ nguyên cấu hình hiện tại và đối chiếu dữ liệu Jira sau khi Boss triển khai.
- Hiệu năng tháng phụ thuộc số issue/worklog và phản hồi Jira, không dùng thời gian mock làm cam kết tốc độ production.

# Changelog

## V1.10.0 — Weekly Calendar, Dashboard & Live Progress

### Added
- Lịch tuần/tháng; tuần mặc định T2–T6, bật thêm T7/CN; điều hướng qua tháng/năm.
- Tổng giờ /8h trong tiêu đề từng ngày, tổng tuần /40h phía trên lưới và số giờ còn thiếu.
- Block theo giờ bắt đầu/thời lượng, chia cột khi overlap; mở form xem/sửa/xóa trực tiếp từ block.
- Dashboard hôm nay/tuần này với định dạng Xh Ym, mục tiêu và giờ còn thiếu; giờ cuối tuần riêng.
- Tiến trình server qua NDJSON trên POST đơn/Bulk, % theo giai đoạn, số worklog đã tạo, thời gian đã chạy và ETA.
- Test tuần giao tháng/năm, tổng giờ, layout overlap và HTTP streaming tích hợp.

### Improved
- Dashboard làm mới sau ghi/sửa/xóa, khi quay lại app và khi đổi ngày Việt Nam.
- Cache range dùng chung giữa lịch/dashboard, chống phản hồi cũ ghi cache sau đổi tài khoản hoặc mutation.
- Stream thiếu kết quả cuối được phân loại chưa xác định; chỉ đạt 100% khi nhận thành công.
- Giữ khả năng gọi API bằng JSON; không thêm runtime dependency, database hoặc biến môi trường bắt buộc.
- Đồng bộ version app, manifest, PWA cache và tài liệu triển khai.

## V1.9.0 — Time Stepper & Worklog Calendar

### Added
- Nút tăng/giảm 30 phút và ArrowUp/ArrowDown trong TimeSpent của form đơn, Bulk và sửa worklog.
- Icon hiện/ẩn mật khẩu đăng nhập, nhãn trợ năng và trạng thái aria-pressed.
- Chuyển kiểu xem Danh sách/Lịch, lịch tháng từ Thứ 2 đến Chủ nhật, tổng giờ/số worklog từng ngày, danh sách giờ trong ngày và mở form sửa từ sự kiện.
- API lịch sử hỗ trợ khoảng ngày tối đa 31 ngày; truy vấn tháng theo issue một lần, lọc tác giả/timestamp theo giờ Việt Nam.
- Test helpers, tháng nhuận, timezone, lọc tác giả và tình huống API tải một phần/lỗi.

### Improved
- Worklog đã log gần toàn màn hình mobile; desktop rộng/cao hơn; bộ lọc gọn và một vùng cuộn chính.
- Mở lịch sử tự tải dữ liệu; làm mới sau sửa/xóa và bỏ cache tháng sau mutation.
- Mô tả trùng Summary không lặp lại trong thẻ lịch sử.
- Phân biệt lỗi truy vấn, tải thiếu và kết quả rỗng; bỏ phản hồi request cũ khi đổi ngày/kiểu xem.
- Cập nhật version, manifest và cache PWA; bổ sung helper mới vào app shell.

### Deployment
- Không thêm thư viện runtime, database hoặc biến môi trường bắt buộc mới.
- Tiếp tục dùng một Vercel Function qua api/index.js và các biến môi trường của V1.8.0.

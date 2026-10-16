# Changelog

## V1.10.5 — Desktop Worklog Details Popup

- Hiển thị cùng form chi tiết/sửa/xóa trong native dialog trên PC từ 900px; mobile giữ form inline.
- Popup có tên công việc đầy đủ, lỗi thao tác hiển thị tại chỗ, Escape/nền/Đóng, focus bàn phím và giữ vị trí lịch.
- Dùng chung form và dữ liệu khi đổi kích thước PC/mobile, không trùng ID hoặc handler.
- Giữ API, xác nhận xóa, làm mới dữ liệu sau mutation; đồng bộ version/PWA cache.

## V1.10.4 — Readable Mobile Duration

- Tăng chiều rộng ô TimeSpent trong Bulk mobile lên tối đa 192px để không cắt giá trị giờ/phút.
- Chuyển preset giờ xuống hàng riêng, cho phép xuống dòng, giữ nút tăng/giảm 30 phút.
- Trên mobile ngang thấp, cho header/footer Bulk cuộn theo nội dung để vẫn thao tác được ô nhập.
- Giữ nguyên giao diện PC và nghiệp vụ/API. Đồng bộ version và cache PWA.

## V1.10.3 — Desktop Calendar Workspace

- Tái bố cục lịch PC từ 900px: chuyển kiểu xem lên header, toolbar ngang và ô ngày 144px.
- Mở rộng cửa sổ và chiều cao lịch; PC hẹp tự xếp toolbar hai hàng.
- Một vùng cuộn nội dung lịch, bỏ cuộn lồng của lưới tuần; giữ header ngày sticky.
- Lưới 5/7 ngày vừa chiều rộng PC, tăng cỡ chữ block và thu gọn header ngày.
- Mobile giữ nguyên CSS/bố cục V1.10.2; không thay đổi xử lý worklog hoặc API.
- Đồng bộ version app và cache PWA.

## V1.10.2 — Compact Calendar Navigation

- Ẩn bộ lọc ngày/KEY và nút Tìm của Danh sách khi xem Lịch.
- Thêm ô Đến ngày trong thanh điều hướng cố định; tự chuyển đến tuần/tháng chứa ngày được chọn.
- Đồng bộ ngày giữa ô chọn, trước/sau, Hôm nay và ngày trong lưới.
- Lịch không dùng KEY ẩn; giữ KEY khi quay lại Danh sách. Thêm nút ↻ tải lại lịch.
- Đồng bộ version và PWA cache; không thay đổi API.

## V1.10.1 — Fixed Calendar Controls

- Đưa điều hướng kỳ và cụm Tuần/Tháng ra ngoài historyResults để không bị cuộn khuất hoặc header lưới lịch che trên mobile.
- Giữ cụm điều khiển hiển thị khi lịch đang tải; ẩn trong chế độ Danh sách và ẩn tổng tuần cũ khi dữ liệu chưa sẵn sàng.
- Đồng bộ version app/manifest/PWA cache, giữ nguyên nghiệp vụ và API.

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

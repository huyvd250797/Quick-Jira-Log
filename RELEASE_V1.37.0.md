# V1.37.0 — Thống kê dự án: Man-days & mốc log đầu tiên

## Đã bổ sung

- Bốn block cùng hàng: Tổng giờ, Ngày (Man-days), Thành viên có log, Subtask. Đổi tên “Subtask duy nhất” thành “Subtask”; vẫn đếm số mã Subtask khác nhau, không cộng trùng theo người.
- Man-days = tổng giây worklog trong kỳ / 28.800. Bao gồm giờ thường và OT như Tổng giờ; hiển thị tối đa 2 số thập phân, tính từ giây gốc. Ví dụ 16h = 2 Man-days. Không phải số ngày lịch hoặc ngày có phát sinh worklog.
- Ô Thành viên cho phép nhập tên/tài khoản, tìm không dấu và chọn gợi ý. Chỉ tìm thành viên có worklog trong kết quả đang xem, không tự thêm người không có log. Chọn Tất cả hoặc nút × để xóa lọc. Hỗ trợ bàn phím ↑/↓, Enter, Escape.
- Mốc Log Subtask đầu tiên gồm ngày giờ Việt Nam, người ghi worklog, mã Subtask mở Jira. Dùng thời điểm `worklog.started`, không dùng ngày tạo Subtask hay ngày nhập bản ghi.
- Mốc lấy trên toàn thời gian của phạm vi Một dự án/Tất cả dự án đã áp dụng, không bị giới hạn bởi kỳ thống kê hoặc thành viên đang lọc. Khi xem tất cả dự án, đây là mốc sớm nhất chung trong phạm vi đó; muốn mốc riêng từng dự án hãy chọn Một dự án.
- Giữ mốc đầu tiên từ các trang worklog đã đọc, kể cả trang không có worklog trong kỳ. So sánh thời điểm thực theo múi giờ, không so sánh chuỗi ISO. Bỏ qua Story/Task/Bug khi tìm mốc, dù giờ của chúng vẫn được cộng vào Tổng giờ.
- Giữ toàn bộ kết quả/tiến độ/mốc đầu tiên qua checkpoint tải nền. Checkpoint từ bản cũ chưa có mốc sẽ hiển thị “Cập nhật thống kê để xác định mốc log đầu tiên”; bấm Xem thống kê để đọc lại. Không tự dùng mốc đầu kỳ thay thế.
- Chuẩn hóa input/select 44px, viền, khoảng cách, focus, mũi tên chọn và màu nút; hàng Thành viên/Sắp xếp/Mốc log rộng đầy đủ trên PC. Mobile thu gọn theo chiều rộng, 4 KPI cùng hàng; gợi ý có cuộn và chọn phía trên/dưới theo khoảng trống. Hỗ trợ sáng/tối.

## Cách dùng

1. Mở Thống kê dự án, chọn phạm vi/dự án/kỳ và bấm Xem thống kê.
2. Đọc Man-days cạnh Tổng giờ. Nhập tên hoặc tài khoản vào Thành viên rồi chọn gợi ý để lọc danh sách đã tải.
3. Xem mốc Log Subtask đầu tiên bên cạnh bộ lọc trên PC; trên mobile nằm ngay dưới cùng nhóm. Đổi tháng/năm không đổi mốc toàn thời gian nếu dữ liệu Jira không đổi.

## Độ chính xác và giới hạn

Mốc chỉ phản ánh worklog Subtask còn tồn tại và tài khoản hiện tại có quyền xem. Không thể kết luận đây là ngày khởi động chính thức của dự án nếu có dữ liệu bị xóa, ẩn hoặc được ghi lùi ngày. Thiếu trang, lỗi quyền hoặc danh sách thay đổi khi tải sẽ ghi “Tạm tính”; dùng Thử lại phần lỗi/Xem thống kê để đối chiếu. Lỗi đối chiếu OT không tự làm thay đổi ngày worklog gốc.

Không tăng số lượt đọc Jira để tìm mốc: tái sử dụng quy trình đọc worklog có phân trang hiện hữu, giữ một bản ghi sớm nhất cho mỗi issue. Tìm thành viên chạy trên kết quả đã tải, không gọi thêm API nhân sự. Không thay đổi luồng ghi/sửa/xóa logwork, OT, lịch và Working Tree; không đổi DB, dependency runtime hay biến môi trường.

## Nâng cấp

Giải nén, triển khai toàn bộ source theo README với Node 24. Khi PWA báo V1.37.0, bấm Cập nhật. Source chưa push/deploy. Có thể quay lại source V1.36.0; không cần reset dữ liệu. Chạy lại thống kê nếu đang xem checkpoint được tạo trước bản này.

## Kiểm tra

Xem TESTING.md: unit/API, phân trang/múi giờ, browser PC/mobile/sáng/tối, tải nền/khôi phục và cập nhật PWA. API Jira dùng dữ liệu mô phỏng; chưa xác minh Jira công ty và iPhone/Safari vật lý.

## Đề xuất tiếp theo — chưa xây dựng

V1.38.0 — Logwork từ Tra cứu: chọn nhiều Subtask đủ điều kiện rồi chuyển sang luồng Log tất cả hiện có, xem trước và xác nhận. Đề xuất cũ mang số V1.37.0 được chuyển thành V1.38.0; không nằm trong bản nâng cấp thống kê này.

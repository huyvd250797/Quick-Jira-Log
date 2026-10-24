# Quick Jira Log V1.33.2 — Cố định form & nhận biết ngày log

- Cố định khung Log tất cả: kéo ở header/footer/vùng ngoài danh sách không làm trôi giao diện. Chặn wheel/touch truyền cuộn ra nền và tại biên danh sách; danh sách và textarea vẫn cuộn bên trong. Chỉ tay nắm trên cùng còn cho phép chủ động kéo đóng sheet.
- Hiển thị thứ cạnh ngày trong Log tất cả, form log đơn và phần chọn Subtask trên lịch.
- Ngày thường có thanh tiến độ: dưới 8h xanh dương, đúng 8h xanh lá, trên 8h đỏ; tính từ giờ thường đã log + đang nhập, không cộng OT. Giữ giới hạn/kiểm tra ghi hiện có.
- Theo yêu cầu cập nhật cuối cùng: T7/CN không có thanh mục tiêu 8h hoặc nhắc thiếu giờ, dùng nền tím xám nhẹ riêng ở form và cột/tiêu đề lịch tuần. Giữ trạng thái ngày đang chọn bằng viền.
- Bấm ô trống ngoài 08:00–12:00 và 13:30–17:30: phản hồi đỏ khoảng 1,2 giây, thông báo giờ hợp lệ và không mở form/không gửi lệnh ghi. Các ô hợp lệ giữ đúng giờ bắt đầu; xem/sửa worklog OT đã có và luồng log OT riêng vẫn giữ nguyên.

## Cập nhật

Giải nén **Quick-Jira-Log_v1.33.2.zip**, mở **Quick-Jira-Log-V1.33.2**, Node24.x: `npm ci`, `npm test`. Giữ cấu hình Vercel và APP_SESSION_SECRET. Không thêm dependency runtime, biến môi trường, database hoặc migration; không cần xóa dữ liệu website. Version/cache PWA 1.33.2. Hướng dẫn local/GitHub/deploy chi tiết được kế thừa bên dưới; chưa push/deploy.

Đã chạy unit/API và Chromium PC 1440px, mobile 390/320px, ngang 844px; kiểm tra kéo/wheel/cảm ứng thực qua mô phỏng, màu 2h/8h/9h, ngày cuối tuần, form/payload OT, ô hợp lệ và ô ngoài giờ. Chưa kiểm chứng Safari/iPhone vật lý hoặc Jira công ty. Xem TESTING.md.

**Kế tiếp đề xuất V1.34.0 — Phân tích Sub-task Type theo thành viên:** phân bổ giờ theo trường thật trên Jira và mở công việc trong từng loại; chưa chốt/chưa triển khai.


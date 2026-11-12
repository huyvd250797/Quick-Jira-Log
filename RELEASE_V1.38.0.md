# Quick Jira Log V1.38.0 — Design System & Navigation

- Điều hướng giữa **Tổng quan, Tra cứu, Lịch và Thống kê**. Thanh điều hướng nằm trên ở PC, nằm dưới ở mobile, đánh dấu màn hiện tại. Trên mobile, mở **Cài đặt và công cụ** để vào **Tổng hợp giờ & Overtime**.
- Tổng quan, Tra cứu và Logwork dùng chung kiểu tiêu đề, màu sáng/tối, viền, ô nhập và focus. Tên Subtask dài xuống dòng. Kết quả Tra cứu hiển thị điều kiện lọc đang dùng, trạng thái tải, rỗng và lỗi.
- Bộ lọc Tra cứu trên PC mở trong panel. Trên mobile, bottom sheet có vùng cuộn, **Hủy** hoàn lại lựa chọn cũ và **Áp dụng** thực hiện tìm kiếm.
- Form Logwork tách vùng cuộn khỏi thanh hành động. **Hủy** ở trái, **Xác nhận** ở phải. Trên mobile, chiều cao form và hộp xác nhận bám theo vùng nhìn khi bàn phím mở. **Log & Next** vẫn có ở form log đơn thông thường.
- Giữ từ khóa, bộ lọc và vị trí cuộn của kết quả Tra cứu, ngày và kiểu xem Lịch, dự án và kỳ Thống kê trong phiên. Luồng lịch nháp vẫn yêu cầu xử lý bản nháp trước khi chuyển sang màn khác.

## Chạy và nâng cấp

1. Giải nén ZIP rồi mở thư mục chứa `package.json` bằng Node.js 24.x. Chạy `npm ci` rồi `npm test`.
2. Để chạy local với API, cấu hình biến trong `.env.example`, chạy `vercel dev`, mở URL Vercel CLI hiển thị và đăng nhập Jira.
3. Với Vercel đã kết nối GitHub, tích hợp source vào nhánh deploy rồi push. Dùng Framework Preset **Other**, Node 24.x, Build Command để trống và Output Directory mặc định. Giữ các biến môi trường của dự án hiện tại.
4. Sau deploy, kiểm tra phiên bản **V1.38.0** ở footer. Nếu đã cài PWA, bấm **Cập nhật** khi app báo có bản mới. Kiểm tra bộ lọc và vị trí cuộn khi chuyển màn, sau đó mở Logwork trên điện thoại để thử nút **Xác nhận** khi bàn phím đang hiện.

**Không cần chạy migration mới.** Có thể triển khai lại source V1.37.7 để quay về bản trước.

**Phiên bản kế tiếp đề xuất** là V1.39.0 — Tra cứu & Logwork, bổ sung chọn nhiều Subtask từ Tra cứu và đưa vào Log tất cả.

## Kiểm tra

- `npm test` với bộ hồi quy Node.js.
- Kiểm tra cấu trúc HTML, cú pháp JavaScript và mô phỏng điều hướng qua Tra cứu, Lịch, Thống kê và Tổng quan. Kiểm tra trạng thái mục đang mở và chặn chuyển màn khi còn nháp lịch.
- Bộ kiểm thử trình duyệt Tra cứu đã được mở rộng cho khôi phục bộ lọc/cuộn, hủy bộ lọc mobile và giữ ngày/dự án/kỳ khi chuyển màn. Chromium bị môi trường chặn lúc tạo socket nên chưa xác minh bố cục thực tế, thao tác với bàn phím ảo và Jira thật.

# V1.37.6 — Member Man-days & Ranking

- **Thống kê dự án → thẻ thành viên** hiển thị Man-days ở góc dưới bên phải, sau phần phân loại giờ.
- Man-days bằng tổng giây đã log của thành viên trong kỳ chia 28.800, gồm giờ thường, OT và giờ chưa xác định OT. Hiển thị tối đa hai chữ số thập phân theo định dạng tiếng Việt. Ví dụ 8h thường + 2h OT = 1,25 Man-days.
- Số thứ tự đứng trước tên và bắt đầu từ 1 theo danh sách đang hiển thị. Với **Giờ đã log**, người có nhiều giờ nhất đứng đầu. Số thứ tự cập nhật khi đổi sang Subtask đã log, Tên thành viên hoặc lọc một thành viên.

## Chạy và nâng cấp

1. Giải nén ZIP, mở thư mục chứa `package.json` và `vercel.json`, dùng Node.js 24.x. Chạy `npm ci` và `npm test`.
2. Để chạy local với API, cấu hình biến trong `.env.example` rồi chạy `vercel dev` tại thư mục source. Mở URL do Vercel CLI hiển thị và đăng nhập Jira.
3. Với Vercel đã kết nối GitHub, tích hợp source vào nhánh triển khai rồi đẩy commit. Dùng Framework Preset **Other**, Node 24.x, Build Command để trống và Output Directory mặc định. Nếu dự án đã có cấu hình, tiếp tục dùng các biến môi trường hiện tại. Xem mục **Triển khai Vercel** bên dưới để biết các biến dùng trên máy chủ.
4. Kiểm tra phiên bản V1.37.6 ở footer rồi mở **Thống kê dự án**, tải một báo cáo và đổi tùy chọn **Sắp xếp**. Nếu đã cài PWA, bấm **Cập nhật** khi ứng dụng báo có bản mới.

**Không cần chạy migration mới.** Có thể quay về source V1.37.5 nếu cần rollback.

**Đề xuất tiếp theo:** V1.38.0 — Logwork từ Tra cứu, đưa Subtask đã chọn sang luồng Log tất cả để xem trước và xác nhận.

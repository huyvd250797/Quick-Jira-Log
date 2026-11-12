# Quick Jira Log V1.37.7 — Faster Bulk Preview

- **Log tất cả → Lịch sắp log** mở ngay sau khi đối chiếu xong giờ đã log. Các khung đã xác minh xuất hiện dưới nhãn **ĐÃ LOG**, sau đó bổ sung mã, mô tả và phân loại OT trong nền.
- Dò issue của người dùng bằng một truy vấn JQL theo khoảng tuần thay cho bảy truy vấn theo ngày. Nếu truy vấn khoảng tuần lỗi hoặc bị cắt kết quả, máy chủ quay lại dò từng ngày. Dùng chung kết quả đọc worklog theo issue trong lần đối chiếu và giới hạn tối đa 12 lượt đọc issue đồng thời.
- Lịch tuần tiếp tục hiển thị đủ bảy ngày. Chế độ Theo tuần chỉ phân bổ vào thứ Hai đến thứ Sáu. Bước **Xác nhận log** vẫn đối chiếu dữ liệu mới và máy chủ kiểm tra lại vị trí chính xác trước khi ghi Jira.

## Chạy và nâng cấp

1. Giải nén source. Dùng Node.js 24.x và chạy `npm ci` rồi `npm test` trong thư mục chứa `package.json`.
2. Để chạy local với API, lấy cấu hình từ `.env.example`, chạy `vercel dev` và đăng nhập Jira ở URL Vercel CLI hiển thị.
3. Với Vercel đã kết nối GitHub, tích hợp source vào nhánh deploy rồi push. Giữ Framework Preset **Other**, Node.js 24.x và các biến môi trường đang dùng. Để trống Build Command và dùng Output Directory mặc định. Xem phần **Triển khai Vercel** bên dưới để biết cấu hình chi tiết.
4. Sau khi deploy, kiểm tra footer hiển thị V1.37.7. Nếu dùng PWA, bấm **Cập nhật** khi có thông báo. Mở **Log tất cả → Theo tuần**, chọn vài Subtask rồi kiểm tra lịch nháp mở trước khi mô tả worklog xuất hiện. Kiểm tra việc đổi vị trí lịch nháp và xác nhận bằng dữ liệu thử.

**Không cần chạy migration mới.** Có thể quay lại source V1.37.6 khi cần rollback.

**Đề xuất tiếp theo:** V1.38.0 — Logwork từ Tra cứu, chọn Subtask và đưa sang **Log tất cả** để xem trước và xác nhận.

## Kiểm tra

- `npm test` kiểm tra chức năng hiện có, truy vấn tuần, trường hợp truy vấn tuần bị cắt và kiểm tra lại giờ trước khi ghi.
- Kiểm tra JavaScript mô phỏng 4 Subtask với dữ liệu chi tiết trả chậm. Lịch mở với khung đã đối chiếu, việc làm giàu dữ liệu đợi thao tác kéo kết thúc và bảo toàn bản nháp. Chưa đo độ trễ trên Jira thật.
- Bộ kiểm thử trình duyệt đã được cập nhật cho luồng tải chi tiết trong nền. Chromium của môi trường build bị chặn khi tạo socket nên chưa chạy được bộ kiểm thử này.

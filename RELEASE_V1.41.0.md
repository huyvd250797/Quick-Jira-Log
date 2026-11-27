# Quick Jira Log V1.41.0 — Holiday-Aware Auto Logwork

Bổ sung lịch nghỉ ứng dụng để phân bổ logwork tự động né các ngày Boss yêu cầu; kéo thả và chọn ngày thủ công vẫn được phép.

| Mốc nghỉ hằng năm | Cách xác định |
| --- | --- |
| 01/01 | Dương lịch |
| Giỗ Tổ Hùng Vương | Mùng 10 tháng 3 âm lịch Việt Nam (UTC+7), tính lại từng năm |
| 30/04 | Dương lịch |
| 01/05 | Dương lịch |
| 27/07 | Dương lịch theo lịch nghỉ Boss yêu cầu |
| 02/09 | Dương lịch |
| 24/11 | Dương lịch theo lịch nghỉ Boss yêu cầu |

Lịch nghỉ này là quy tắc vận hành của ứng dụng theo danh sách đã giao, độc lập với chủ đề giao diện. Không suy ra ngày nghỉ từ theme, không tự thêm nghỉ bù hoặc kỳ nghỉ Tết chưa được cấu hình phạm vi.

## Hành vi

- Theo tuần: vẫn phân bổ trong các ngày T2–T6 của tuần đã chọn, nhưng bỏ các ngày nghỉ kể trên. Thiếu chỗ thì hiển thị các task chưa xếp; không tự log các task này hoặc lấn sang tuần khác.
- Theo ngày: nếu ngày chọn là ngày nghỉ, lịch nháp chuyển tới ngày làm việc tiếp theo, đi qua cả chuỗi ngày nghỉ/T7/CN. Ví dụ 30/04/2026 → 04/05/2026; 01/01/2027 → 04/01/2027. Hiển thị ngày nguồn/ngày đích trước khi xác nhận ghi Jira.
- Mở form log một task: ngày mặc định trùng ngày nghỉ được gợi ý sang ngày làm việc tiếp theo; hiển thị thông tin ngày đã bỏ qua. Nếu mở từ một ô lịch có ngày/giờ cụ thể, giữ đúng lựa chọn thủ công.
- Kéo tay trong lịch xem trước được dùng cả bảy ngày đang hiển thị, kể cả ngày nghỉ/T7/CN. Lịch kiểm tra trùng giờ, phạm vi và khung giờ như trước; không có rào chặn mới đối với ngày nghỉ.
- Vẫn có thể chọn ngày nghỉ trực tiếp trong form. Gửi chính xác ngày/giờ thủ công đã chọn, không tự chuyển ngày ở backend.
- Khi ngày nghỉ đẩy lịch sang tuần khác, phần xem trước và đối chiếu Jira mở ở tuần chứa ngày đích. Kéo tay giới hạn trong bảy ngày của tuần xem trước đó; muốn log ngày ở tuần khác dùng lịch thông thường hoặc chọn ngày trên form.
- Hiển thị giải thích ở form đơn, form hàng loạt, lịch nháp và tooltip ngày nghỉ. Không thay đổi worklog cũ, target tiến độ, dữ liệu tài khoản hoặc chủ đề.

## Cài đặt / kiểm tra

Dùng Node.js 24.x. Giải nén và vào thư mục Quick-Jira-Log, chạy `npm ci`, `npm test`. Có thể chạy riêng `npm run test:work-holidays`. Giữ cấu hình môi trường và cách deploy của bản hiện tại. Không cần chạy migration mới. Sau deploy cập nhật PWA để tải cache V1.41.0 và module lịch nghỉ mới.

Kiểm thử đã đạt: toàn bộ `npm test`; lịch dương và đối chiếu âm lịch độc lập nhiều năm; chuỗi ngày nghỉ/cuối tuần và chuyển năm; tự phân bổ đủ/thiếu chỗ; giữ thời lượng; phạm vi preview; kéo tay cả Chủ nhật Giỗ Tổ; dùng cùng module trên browser/Node; API/router thật với Jira giả lập ghi đúng ngày nghỉ thủ công. Không gửi dữ liệu lên Jira thật. Kiểm tra cú pháp JavaScript và đủ tài nguyên PWA đạt.

Chưa nghiệm thu thao tác thực tế trên PC/iPhone: Chromium trong môi trường kiểm thử không khởi chạy được. Chưa push GitHub hoặc deploy trong lần bàn giao này.

Bản kế tiếp đề xuất: V1.41.1 — Work Holiday Settings: thêm/sửa ngày nghỉ riêng và khoảng nghỉ Tết, sau khi Boss chốt phạm vi. Chưa xây dựng.

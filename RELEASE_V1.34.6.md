# Quick Jira Log V1.34.6 — Hướng dẫn bay từ icon i & đối chiếu giờ trống gọn hơn

## Thay đổi

- Bấm icon **i**: modal hướng dẫn bay từ vị trí icon ra giữa màn hình. Bấm **Đã hiểu** hoặc **X**: thu modal về icon, backdrop nhạt dần. Chuyển động380ms bằng transform/opacity, trả focus về i; giảm chuyển động thì mở/đóng ngay. Mở tự động khi vào Log tất cả vẫn giữ cơ chế cũ.
- **X không lưu checkbox**. Chỉ Đã hiểu lưu Không hiện lại lần sau theo tài khoản trên thiết bị. Escape/đổi tài khoản hủy hiệu ứng; không ghi lựa chọn.
- Bỏ câu nhắc “mỗi Subtask chỉ log trong một ngày” khỏi hướng dẫn và đoạn giải thích liên quan. Đổi nhãn thành **Bật Phân bổ tự động / Tắt Phân bổ tự động**. Chỉ sửa cách diễn đạt, không đổi quy tắc phân bổ đang hoạt động.
- Lịch đã log trong xem trước có lớp đen trong suốt **55%** (từ28%), giữ hue dự án/OT nhưng trầm rõ so với nháp mới. Không tác động màu hoặc swap lịch thật ở lịch thông thường.

## Tối ưu đối chiếu giờ trống

- Frontend gửi các ngày cần đối chiếu trong một request `day-audit&dates=...` (tối đa7 ngày), thay cho7 request riêng.
- Backend vẫn khám phá/đối chiếu từng ngày, nhưng chia sẻ đọc worklog theo issue và nguồn recent trong cùng một request chỉ đọc. Một issue xuất hiện cả7 ngày chỉ đọc worklog một lần thay vì7 lần. Tối đa3 ngày song song,4 luồng issue/ngày để hạn chế tải Jira.
- Snapshot chỉ tồn tại trong request hiện tại, không dùng lại khi xác nhận lưu, request sau hoặc tài khoản khác. Kiểm tra ngày/tác giả, pagination, nguồn bổ trợ, guard dữ liệu mới và dừng khi thiếu quyền vẫn giữ. Nếu cần stabilization scan hôm nay, vòng hai đọc mới, không tái dùng snapshot.
- Backend cũ chưa hỗ trợ request nhiều ngày: client có fallback từng ngày. Lỗi401/403/server không được bỏ qua bằng fallback. Progress vẫn phản ánh hoàn tất các ngày, không dùng thời gian giả.
- Kiểm thử fixture7 ngày cùng một issue: giảm số lần GET worklog **7→1**, tổng giờ/ngày và tác giả đúng. Đây là giảm truy vấn lặp trong fixture; chưa đo tốc độ mạng/Jira công ty, không cam kết tỷ lệ thời gian thực tế.

## Chạy / nâng cấp

Giải nén **Quick-Jira-Log_v1.34.6.zip**, vào **Quick-Jira-Log-V1.34.6**. Node24.x; giữ cấu hình Vercel và APP_SESSION_SECRET hiện có.

```bash
npm ci
npm test
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:batch-ui
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:update-live
```

Không thêm database, dependency runtime hoặc env. Giữ lựa chọn hướng dẫn và dữ liệu đăng nhập hiện có. Version/cache/PWA1.34.6. Hướng dẫn local/GitHub/Vercel đầy đủ ở phần triển khai kế thừa bên dưới. Chưa push/deploy/Jira thật/iPhone thật.

**Kế tiếp đề xuất V1.35.0 — Phân tích Sub-task Type theo thành viên:** giờ, tỷ trọng, số Subtask theo custom field Jira thật và mở chi tiết nhóm. Chưa xây dựng.

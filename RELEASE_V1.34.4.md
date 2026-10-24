# Quick Jira Log V1.34.4 — Màu lịch đã log, bảo vệ giờ cũ & hướng dẫn theo tài khoản

## Đã thay đổi

1. **Màu lịch đã log:** giữ nguyên màu dự án/màu mặc định/màu Overtime của lịch thường. Chỉ thêm lớp phủ nền đen nhẹ khoảng12% ở light và14% ở dark để màu trầm hơn; không đổi thành nền đen/xám, không làm mờ toàn bộ chữ. Nhãn Đã log và cơ chế chỉ xem được giữ.
2. **Chỉ đổi chỗ/xếp trùng giữa các lịch nháp:** không được kéo, co giãn hoặc đặt đè lịch nháp lên giờ đã log. Nếu chạm vùng đã log, vùng kéo báo lỗi và khi thả có thông báo; bản nháp không đổi, không có nút chấp nhận xếp đè giờ cũ.
3. **Hướng dẫn mới:** 5 bước, ví dụ auto theo tuần40h/5 Subtask; giải thích bật/tắt tự động, xem trước, kéo/nhấn giữ, dấu ngang, bỏ khỏi lượt log và xác nhận ghi. Không hứa chia đủ40h khi thiếu Subtask hoặc thiếu giờ trống.
4. **Tự mở hướng dẫn:** mỗi lần mở Log tất cả sẽ hiện modal, trừ khi tài khoản đã lưu lựa chọn Không hiện lại lần sau. Checkbox và Đã hiểu luôn nằm ở chân modal, không phải cuộn tìm.
5. **Lưu lựa chọn sau Đã hiểu:** tick Không hiện lại rồi bấm Đã hiểu mới ghi nhớ. Đóng bằng X/Escape không lưu thay đổi. Icon i vẫn mở lại hướng dẫn; bỏ tick rồi Đã hiểu để bật lại hướng dẫn tự động.

## Ghi nhớ theo tài khoản

Lựa chọn được giữ riêng bằng username/ID tài khoản Jira, trên trình duyệt/thiết bị hiện tại; không dùng tên hiển thị. Đổi tài khoản không dùng nhầm lựa chọn của nhau. Đổi thiết bị hoặc xóa dữ liệu web sẽ hiện hướng dẫn lại. Không thêm database hoặc đồng bộ thiết lập lên Jira. Nếu trình duyệt không cho lưu, app thông báo và vẫn dùng được; lần sau hướng dẫn sẽ hiện lại.

## Chặn xếp đè ở cả giao diện và khi ghi

- Validator không cho bỏ qua `occupied` (giờ đã log), dù request có cờ chấp nhận xếp trùng. Backend vẫn đọc giờ Jira thật trước khi tạo. Khi có worklog mới xuất hiện sau lúc xem trước, lần lưu bị chặn nếu đụng giờ đó.
- Các lịch nháp chồng giờ có xác nhận được gom theo nhóm liên quan cùng ngày và gửi chung một request. Chỉ các đoạn mới trong request đó được phép chồng nhau; không tạo ngoại lệ cho worklog đã có trên Jira.
- Nhóm độc lập tiếp tục gửi riêng. Giữ request ID ổn định cho nhóm, không gửi lại nhóm thành công. Lỗi đã hoàn tác đầy đủ cho chỉnh/xác nhận lại cả nhóm; mất phản hồi/hoàn tác chưa đủ khóa cả nhóm để kiểm tra Jira, tránh gửi trùng.
- Jira không có transaction nguyên tuần. Backend dùng cơ chế hoàn tác các đoạn vừa tạo của nhóm nếu lỗi; không sửa/xóa worklog cũ. Quyền Jira, TimeSpent/một Subtask một ngày, khung giờ và OT legacy được giữ.

Các chức năng ngày→ngày khác trong tuần, chọn tuần trong ô calendar, resize/tách trưa, màu dự án, xem trước rồi xác nhận của V1.34.3 vẫn có.

## Cài đặt và kiểm thử

Giải nén **Quick-Jira-Log_v1.34.4.zip**, vào **Quick-Jira-Log-V1.34.4**. Node24.x; giữ nguyên Vercel và APP_SESSION_SECRET:

```bash
npm ci
npm test
# UI cần Playwright/Chromium riêng cho QA:
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:batch-ui
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:compact
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:update-live
```

Không thêm dependency runtime, env, database hay migration. Version/cache/PWA1.34.4. Hướng dẫn local/GitHub/Vercel đầy đủ được kế thừa trong README bên dưới. Chưa push/deploy; chưa có Jira công ty hoặc Safari/iPhone thật để thử.

**Kế tiếp đề xuất V1.35.0 — Phân tích Sub-task Type theo thành viên**: giờ/tỷ trọng/số Subtask theo custom field thật và xem chi tiết nhóm. Chưa xây dựng.

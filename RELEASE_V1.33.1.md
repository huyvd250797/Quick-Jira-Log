# Quick Jira Log V1.33.1 — Log tất cả gọn hơn & chọn ô lịch chính xác

## Thay đổi của bản này

- Thiết kế lại Log tất cả trên PC/mobile: tiêu đề và số Subtask gọn; ngày và Phân bổ giờ cùng hàng; khối giờ thường rút gọn. Header/footer cố định trong khung, chỉ danh sách cuộn, không còn tiêu đề Subtask bị header đè lên. PC hai cột, điện thoại một cột; màn hình ngang dùng header hai phần.
- Mỗi dòng Subtask có OT cạnh ô thời lượng, bỏ mô tả giải thích OT lặp lại; giữ preset 30m/1h/2h/3h/4h, nút tăng/giảm, giờ OT tùy chọn và phần sửa mô tả có thể mở. Giữ khoảng cách giữa thẻ và vùng bấm. Footer gộp Tổng, Hủy và Log tất cả trên một hàng.
- Khi ngày log là T7/CN, form đơn và Log tất cả không nhắc còn thiếu giờ để đủ 8h, không hiển thị mục tiêu /8h hoặc thanh tiến độ mục tiêu ngày. Vẫn hiển thị giờ đã log/đang nhập, lỗi tải và cảnh báo vượt giới hạn hiện có. Không thay quy tắc ghi/giới hạn backend hoặc cách phân bổ giờ khi chủ động bấm nút.
- Lịch tuần luôn hiển thị T2–CN; bỏ nút bật/tắt T7/CN. Cấu hình cũ của phiên phục hồi không ẩn cuối tuần trở lại. Mục tiêu tuần 40h vẫn theo T2–T6, giờ cuối tuần được theo dõi riêng như trước.
- Ô trống 30 phút có phản hồi sáng/viền khi nhấn và giữ chọn trong lúc mở form. Bấm bất kỳ vị trí nào trong ô 08:00–08:30 lấy giờ bắt đầu 08:00; ô tiếp theo lấy 08:30. Form và request logwork dùng đúng ngày/giờ đã chọn. Kéo thả vẫn snap gần nhất như cũ; lịch người khác chỉ xem, ô trống không mở form ghi.

## Cài đặt, cập nhật và phạm vi

Giải nén **Quick-Jira-Log_v1.33.1.zip**, mở **Quick-Jira-Log-V1.33.1**. Node24.x: `npm ci`, `npm test`. Chạy kiểm thử giao diện mới (môi trường QA riêng có Playwright/Chromium): `QJL_CHROMIUM_PATH=/path/to/chromium npm run test:compact`.

Giữ nguyên cấu hình Vercel/APP_SESSION_SECRET và dữ liệu trình duyệt. Không thêm dependency runtime, biến môi trường, database hoặc migration. PWA shell/version 1.33.1, bổ sung logwork-compact.css. Có thể thay source và deploy theo hướng dẫn bên dưới; không cần xóa dữ liệu website. Chưa push/deploy.

Đã kiểm thử unit/API, giao diện Chromium PC 1440px/mobile 390px/320px/ngang 844px ở light/dark, luồng gửi form đơn/hàng loạt, OT, mô tả, ngày/giờ ô lịch, chỉ xem người khác, cuộn riêng và hồi quy lịch/sửa/xóa/lưu nháp. Chưa kiểm chứng trực tiếp Jira công ty hoặc Safari/iPhone vật lý. Xem TESTING.md và RELEASE_V1.33.1.md.

**Kế tiếp đề xuất: V1.34.0 — Phân tích Sub-task Type theo thành viên:** phân bổ giờ theo trường thật trên Jira và mở các công việc trong từng nhóm. Chưa chốt/chưa triển khai.


## Tệp chính thay đổi

index.html/app.js: form gọn, trạng thái ngày cuối tuần, lịch 7 ngày và hit target. calendar-interactions.js: click exact30 phút, selection và đóng xóa chọn. resume-state.js: không phục hồi toggle cuối tuần cũ. logwork-compact.css: bố cục riêng và press feedback. sw/manifest/package: version và asset. Tests và tài liệu được cập nhật; handler/lib backend giữ nguyên.

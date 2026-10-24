# Quick Jira Log V1.34.2 — Xem trước & chỉnh lịch logwork

## Luồng sử dụng

1. Mở **Log tất cả**, chọn Theo ngày/Theo tuần. Nút cuối form luôn là **Xem trước logwork**, không còn tên Phân bổ giờ/Phân bổ giờ tự động.
2. Theo tuần: mở calendar của ô **Tuần logwork**, chọn một ngày bất kỳ. App xác định tuần chứa ngày đó và hiển thị từ T2 đến CN ngay dưới ô. Khi phân bổ chỉ dùng T2–T6. Không còn combobox danh sách tuần cố định.
3. Bật **Phân bổ tự động** để app tự chia giờ; bỏ bật để nhập **TimeSpent**, giữ nguyên thời lượng từng Subtask.
4. Bấm Xem trước logwork: nút đổi thành **Đang xử lý… N%**, có thanh tiến độ và pha xử lý. Tiến độ tính theo các ngày đối chiếu và các bước chuẩn bị/lấy lịch, không phải thời gian ước tính. Khóa các điều khiển của form khi đang chuẩn bị để tránh đổi dữ liệu giữa chừng. Lỗi trả về nút Xem trước, không ghi Jira.
5. Lịch nháp mở sau khi chuẩn bị xong. PC kéo block/nhóm đổi vị trí; mobile giữ để vào chế độ chỉnh rồi kéo. Kéo tay nắm dưới của block để giảm/tăng TimeSpent, kể cả khi Subtask đã có hai phần sáng/chiều.
6. Kéo cạnh đến 17:30 từ 08:00 tạo đúng 8h, chia **08:00–12:00 + 13:30–17:30**. Giờ nghỉ không được tính. Thu ngắn nhóm có thể gom lại thành một block.
7. Bấm block chưa log → **Bỏ khỏi lịch xem trước** để bỏ toàn bộ các phần của Subtask khỏi lượt log. Không xóa issue/Subtask trên Jira, không gọi API xóa worklog thật. Danh sách đã bỏ được liệt kê khi xác nhận.
8. Kéo vào vùng vừa: tự đổi chỗ nguyên nhóm. Hỗ trợ nhiều block nhỏ vừa vị trí nguồn và cả lịch 8h đã chia hai phần sáng/chiều. Các phần của mỗi Subtask vẫn nằm cùng một ngày; hiệu ứng đổi chỗ dùng cơ chế bay của lịch hiện tại.
9. Nếu không thể đổi chỗ, app cảnh báo **xếp trùng**. Hủy → giữ nguyên lịch; đồng ý → đặt đúng vị trí đã chọn, không di chuyển/xóa lịch bị trùng. Đánh dấu các nhóm liên quan và nhắc lại ở bước xác nhận cuối.
10. Chỉ **Xác nhận log** mới ghi. Đóng lịch nháp quay về form Log tất cả, giữ dữ liệu đã nhập như V1.34.1.

## Xếp trùng: phạm vi và kiểm tra

- Cơ chế này chỉ mở rộng nhánh **exactPlan** của xem trước, có cờ chấp nhận thật từ giao diện và xác nhận cuối. Cả hai Subtask nháp liên quan nhận chấp nhận xếp trùng để thứ tự ghi không làm dòng thứ hai bị chặn sai.
- Backend vẫn đọc quyền/dữ liệu thật, kiểm tra Subtask, ngày, thời lượng và khung giờ. Không thể dùng cờ xếp trùng để log giờ nghỉ, quá 8h cho một Subtask, tự trùng hai đoạn của cùng Subtask hoặc sai tổng TimeSpent.
- Nếu xếp trùng được chấp nhận, tổng giờ các Subtask của ngày có thể vượt 8h do cộng cả thời gian chồng nhau. Tổng giờ vẫn cộng đúng các worklog; **giờ trống** được tính theo phần thời gian còn trống thực tế, không trừ hai lần chỗ bị chồng.
- Worklog đã có trên Jira/đã gửi trong lượt hiện tại vẫn chỉ xem, không bị resize/xóa/đổi chỗ trong preview. Có thể chọn xếp trùng vào giờ đã log sau cảnh báo, lịch đã có được giữ nguyên.
- Lượt ghi không chấp nhận xếp trùng vẫn chặn xung đột; log đơn/Bulk Overtime legacy giữ guard hiện tại. Luồng ngày nhập tay có OT vẫn dùng xác nhận native WorklogPRO cũ, không đi qua phân bổ giờ thường.
- Giữ idempotency, rollback theo Subtask và trạng thái từng dòng. Unknown khóa, không tự retry; cần đối chiếu Jira. Không cam kết transaction toàn tuần.

## Cài đặt / kiểm tra

Giải nén **Quick-Jira-Log_v1.34.2.zip**, vào **Quick-Jira-Log-V1.34.2**. Giữ nguyên cấu hình Vercel/APP_SESSION_SECRET. Node24.x:

```bash
npm ci
npm test
# UI cần Playwright/Chromium riêng cho QA:
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:batch-ui
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:compact
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:update-live
```

Không thêm dependency runtime, database, migration hay env mới. SW/cache/version đồng bộ 1.34.2 và có thêm lib/batch-review.js. Cập nhật PWA khi đang mở được giữ từ V1.34.1; lần đầu dùng tính năng mới cần deploy source này. Không tự reload trong lượt ghi.

Đã kiểm thử unit/API với Jira giả lập và Chromium PC/mobile, gồm pointer chuột và cảm ứng mô phỏng. Chưa có Jira công ty hoặc iPhone/Safari thật để đối chiếu, chưa push/deploy. Bản nháp chỉ giữ trong phiên, không tự gửi lại sau reload.

**Kế tiếp đề xuất V1.35.0 — Phân tích Sub-task Type theo thành viên**: giờ, tỷ trọng, số Subtask theo custom field thật và mở nhóm xem chi tiết. Chưa xây dựng.

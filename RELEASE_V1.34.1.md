# Quick Jira Log V1.34.1 — Phân bổ giờ gọn hơn & cập nhật ngay trong app

## Thao tác mới

1. Mở **Log tất cả**, chọn radio **Theo ngày** hoặc **Theo tuần**.
2. Theo ngày dùng **Ngày logwork** và hiển thị thứ; theo tuần dùng một combobox **Tuần logwork**, mỗi lựa chọn hiển thị từ thứ Hai đến Chủ nhật. App chỉ phân bổ T2–T6. Danh sách tuần trải từ 104 tuần trước đến 104 tuần sau ngày đang chọn; chọn một ngày khác ở chế độ ngày để chuyển vùng tuần.
3. Checkbox **Phân bổ tự động** mặc định bật. Danh sách ẩn TimeSpent/preset/OT và thẻ tổng giờ đang nhập; app tự chia phần giờ trống cho Subtask. Dữ liệu đã nhập trước đó được giữ, không bị đổi khi bật/tắt.
4. Bỏ checkbox để nhập **TimeSpent** cho từng Subtask. App giữ nguyên thời lượng, tìm ngày đủ chỗ và ghép các khoảng trống trong cùng ngày. Mỗi Subtask chỉ nằm trong một ngày; không đủ chỗ sẽ báo chưa phân bổ.
5. Chỉ một nút **Phân bổ giờ tự động** (hoặc **Phân bổ giờ** khi nhập tay) ở chân form. Không còn nút phân bổ trên đầu, Log tất cả/Xem lịch tuần cho luồng giờ thường.
6. Bấm phân bổ giờ thường → lịch **Lịch sắp log**. Thanh thông tin chỉ còn hai dòng nhỏ, ẩn nút đổi ngày/chế độ không sử dụng, giữ màu dự án, zoom và fullscreen. Xác nhận mới ghi Jira; các block cũ chỉ xem.
7. Bấm **X** → xác nhận rời bản xem trước → quay lại đúng form Log tất cả, giữ ngày/tuần, checkbox, TimeSpent, mô tả và vị trí danh sách. Các dòng đã ghi thành công hoặc chưa rõ kết quả bị loại khỏi lần phân bổ tiếp theo để tránh log trùng. Không thay đổi/xóa worklog đã ghi.

## Bảo toàn quy tắc và luồng cũ

- Giờ thường 08:00–12:00, 13:30–17:30; tuần chỉ T2–T6; mỗi Subtask tối đa 8h/ngày và không trải hai ngày.
- Có thể tách qua giờ nghỉ trong cùng ngày; không xếp đè giờ đã log. Giữ kiểm tra trước ghi và trạng thái từng dòng của V1.34.0.
- Phân bổ tuần không hỗ trợ OT. Khi nhập tay ở chế độ ngày và có OT, giữ luồng xác nhận Bulk Overtime native WorklogPRO hiện có (không dùng lịch phân bổ giờ thường). Log đơn/OT và các API ghi cũ được giữ.
- Bản nháp xem trước chỉ trong phiên đang mở. Reload không tự phát lại lệnh ghi.

## Cập nhật không cần đóng app

- Kiểm tra service worker mới khi mở app; kiểm tra nền mỗi 60 giây khi app đang hiển thị và khi quay lại app/focus/online (có hạn chế lặp truy vấn trong 15 giây).
- Khi bản mới tải thành công, hiện banner Cập nhật. Bấm cập nhật → lưu checkpoint thống kê hiện có → kích hoạt worker chờ → tự tải lại giao diện mới ngay, không cần thoát/mở lại app.
- Không tự reload. Nếu đang ghi/đang đối chiếu phân bổ, yêu cầu đợi xong; nếu có bản nháp thì hỏi trước khi tải lại. Không báo nhầm lần cài service worker đầu tiên là có bản cập nhật.
- Trình duyệt chỉ kiểm tra được khi app đang hoạt động/có mạng; không cam kết phát hiện ngay thời điểm deploy. Để có cơ chế này, bản V1.34.1 cần được triển khai và tải lên thiết bị trước.
- Tham khảo vòng đời chính thức: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/update và https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updatefound_event.

## Cài đặt / kiểm tra

Giải nén **Quick-Jira-Log_v1.34.1.zip**, mở thư mục **Quick-Jira-Log-V1.34.1**. Giữ nguyên cấu hình Vercel và APP_SESSION_SECRET. Node24.x:

```bash
npm ci
npm test
# Kiểm thử giao diện cần Playwright và Chromium riêng cho QA:
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:batch-ui
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:compact
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:update-live
```

Không thêm dependency runtime, database, migration hoặc biến môi trường. SW/cache/version đồng bộ 1.34.1. Hướng dẫn local/GitHub/Vercel chi tiết kế thừa ở README bên dưới. Chưa push/deploy; chưa thử Jira công ty hoặc Safari/iPhone thật.

**Tiếp theo đề xuất V1.35.0 — Phân tích Sub-task Type theo thành viên:** giờ, tỷ trọng và số Subtask theo trường thật trên Jira; mở nhóm để xem worklog. Chưa xây dựng.

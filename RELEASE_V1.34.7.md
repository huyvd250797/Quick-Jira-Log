# Quick Jira Log V1.34.7 — Progress xem trước tăng theo xử lý thực tế

## Đã chỉnh

- Đối chiếu nhiều ngày truyền tiến độ NDJSON ngay khi xử lý, thay vì đợi toàn bộ kết quả JSON. Progress tăng sau các nguồn khám phá issue, đọc worklog và hoàn thành từng ngày. Giữ API JSON khi client không yêu cầu stream.
- Client nhận tiến độ cập nhật thanh %, chỉ tăng không lùi; chừa phần tiến độ cho tạo nháp/tải lịch và chỉ đạt100% khi lịch xem trước đã được dựng. Nút giữ Đang xử lý…, progress hiển thị %.
- Không dùng timer để tự tăng %; mạng/Jira chưa có bước hoàn thành thì % có thể tạm dừng. Không tự gửi lại request khi stream bị gián đoạn; thông báo đối chiếu chưa hoàn tất, không mở preview thiếu dữ liệu.401/403 được trả ở kết quả stream; lỗi không báo100% thành công.
- Giữ tối ưu đối chiếu nhiều ngày và shared read theo issue trong từng request của1.34.6; không cache snapshot sang lần lưu. Dữ liệu mới vẫn được đối chiếu trước ghi Jira.
- Giảm lớp phủ đen trên lịch đã log trong xem trước từ55% về **45%**. Màu dự án/OT vẫn nhìn xuyên qua; lịch nháp mới và lịch thật ngoài preview không bị đổi.

## Chạy / cập nhật

Giải nén **Quick-Jira-Log_v1.34.7.zip**, vào **Quick-Jira-Log-V1.34.7**. Dùng Node24.x và cấu hình Vercel/APP_SESSION_SECRET hiện tại.

```bash
npm ci
npm test
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:batch-ui
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:update-live
```

Không thêm dependency, database hoặc env. Version/cache/PWA1.34.7. README kế thừa bên dưới có hướng dẫn local/GitHub/Vercel. Chưa push/deploy, chưa thử Jira công ty hoặc iPhone/Safari vật lý. Proxy/hosting cần giữ streaming (đã gửi Cache-Control no-transform và X-Accel-Buffering no); nếu hạ tầng đệm toàn bộ response, tiến độ chỉ nhận được khi proxy trả dữ liệu.

**Kế tiếp đề xuất V1.35.0 — Phân tích Sub-task Type theo thành viên:** giờ, tỷ trọng, số Subtask và chi tiết nhóm theo custom field Jira thật. Chưa xây dựng.

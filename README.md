# Quick Jira Log V1.8.0 – Performance & Reliability Hardening

Nâng cấp trực tiếp từ **V1.7.3 – Motion, Safe Submit & Fast History**.

## Trọng tâm phiên bản

### 1. Fast Jira Pipeline
- Bulk Logwork lấy metadata nhiều Sub-task bằng **1 JQL batch** thay vì `getIssue()` riêng từng KEY.
- Các bước độc lập tiếp tục chạy song song có giới hạn; các thao tác ghi Jira vẫn không retry mù.
- Worklog History dùng batch metadata + concurrency 12, đồng thời có cache ngắn ở client và server.
- `day-audit` có cache 15 giây để Log 1/Log tất cả/Planner dùng lại kết quả gần nhất; cache bị xóa ngay sau Log/Sửa/Xóa.
- Các GET trùng nhau trên client được dedupe để tránh cùng một màn hình gửi nhiều request giống nhau.

### 2. Durable Protection trên Vercel
- Idempotency có thể dùng **Upstash Redis / Vercel KV REST** nếu cấu hình biến môi trường; khi không cấu hình vẫn fallback an toàn về in-memory như các bản trước.
- Khi Redis được bật, request ID của Log 1/Bulk được giữ xuyên nhiều Serverless Instance để giảm nguy cơ double-submit.
- Login rate-limit cũng dùng Redis khi có cấu hình, fallback về memory nếu Redis tạm lỗi.
- Không retry tự động các request ghi Jira như POST/PUT/DELETE.

### 3. Performance Diagnostics
- Các API chính trả `performance` theo từng phase và header `Server-Timing`.
- Có thể bật log client bằng localStorage key `quick-jira-log:debug-performance=1` để xem timing trong DevTools.
- Jira timeout tiếp tục fail rõ ràng thay vì spinner vô hạn.

### 4. PWA Update Reliability
- Service Worker không còn tự `skipWaiting` ngay khi cài bản mới.
- Khi có version mới, app hiển thị banner **CÓ PHIÊN BẢN MỚI → CẬP NHẬT**.
- Chỉ khi người dùng bấm Cập nhật mới activate SW mới và reload, tránh tình trạng HTML/JS cũ-mới trộn lẫn sau deploy.

### 5. Productivity
- Thêm `Ctrl/Cmd + K` để focus nhanh ô tìm Sub-task trên desktop.
- Giữ nguyên `/` để tìm nhanh và `Ctrl/Cmd + Enter` để Log.

## Redis/KV tùy chọn
Không bắt buộc để deploy. Nếu muốn chống double-submit/rate-limit bền vững giữa nhiều Serverless Instance, cấu hình một trong hai bộ biến:

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

hoặc:

```env
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

Nếu không cấu hình Redis/KV, app dùng fallback in-memory. Nếu đã cấu hình Redis/KV nhưng store bị lỗi, thao tác ghi sẽ **fail closed** thay vì âm thầm fallback để tránh nguy cơ double-submit xuyên instance.

## Giữ nguyên
- Jira Auth Classification + CAPTCHA Guard.
- Daily Capacity 8h, OT, chống overlap, rollback.
- Smart Bulk Allocation chủ động.
- Late Worklog Warning từ N-2 trở về trước.
- Animation nhẹ + xác nhận trước khi Log.
- Desktop modal / mobile bottom sheet / sticky header.

**© 2026 HuyVo. All rights reserved.**

# Quick Jira Log V1.7.3 – Motion, Safe Submit & Fast History

Nâng cấp trực tiếp từ **V1.7.2 – Bulk Log Layout Optimization**.

## Trọng tâm phiên bản

- Bổ sung animation nhẹ khi mở/đóng modal, bottom sheet, tool overlay, correction panel và result card.
- Chuyển động ngắn 150–180ms, chỉ dùng fade + translate/scale rất nhẹ; tự tắt khi thiết bị bật `prefers-reduced-motion`.
- Mọi thao tác **LOG WORK / LOG & NEXT / LOG TẤT CẢ** đều có bước xác nhận trước khi gửi Jira để tránh bấm nhầm.
- Popup xác nhận hiển thị đúng Sub-task/ngày/TimeSpent/OT hoặc số lượng Sub-task + tổng thời gian của Bulk.
- Không phát sinh request Jira trước khi người dùng bấm **XÁC NHẬN LOG**.

## Fast Worklog History

- Nếu nhập KEY cụ thể: đọc trực tiếp issue/worklog, không chạy các JQL quét ngày không cần thiết.
- Khi tìm theo ngày: ưu tiên `worklogAuthor = currentUser()`; chỉ fallback quét `worklogDate` rộng khi Jira không hỗ trợ truy vấn author.
- Metadata issue được lấy theo batch tối đa 100 KEY/request thay vì gọi `getIssue()` riêng từng issue.
- Metadata và worklog chạy song song; worklog dùng concurrency 12 có kiểm soát.
- Cache kết quả tìm kiếm 20 giây trên client; tự invalidate sau Log/Sửa/Xóa worklog hoặc đổi tài khoản.
- Nhấn Enter tại ô KEY có thể tìm ngay.

## Các chức năng giữ nguyên

- Jira Auth Classification + CAPTCHA Guard.
- Daily Capacity 8h, OT, chống overlap, rollback và idempotency.
- Smart Bulk Allocation chủ động.
- Late Worklog Warning từ N-2 trở về trước.
- Desktop modal / mobile bottom sheet / sticky header.

## Thông tin

**© 2026 HuyVo. All rights reserved.**

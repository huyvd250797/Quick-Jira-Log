# Quick Jira Log V1.4.0 – Zero-Friction UX & Visual System

Nâng cấp trực tiếp từ **V1.3.4 – Mobile Bottom Sheet UX & Preview**.

## Thay đổi chính

- Bỏ hoàn toàn tính **Dự kiến giờ logwork trước khi gửi** để không phát sinh request Jira khi đang nhập TimeSpent.
- Scheduler/guard vẫn chạy **khi bấm Log** để né worklog đã có và đảm bảo khung giờ an toàn.
- Sau khi Jira tạo worklog thành công, app hiển thị rõ **Sub-task + ngày + từng khung giờ đã log + thời lượng**.
- Toast thành công của log đơn hiển thị ngay `KEY · HH:mm–HH:mm`.
- Chuẩn hóa visual system: control height, focus state, button state, selected issue state, success result, card elevation và mobile bottom-sheet action.
- Sub-task đang chọn được highlight rõ trên desktop.
- Mobile bottom sheet giữ thao tác kéo xuống để đóng và nút Log luôn dễ chạm.
- Giữ nguyên khung giờ thường `08:00–12:00` và `13:30–17:30`, OT và toàn bộ engine chống overlap.
- Backend vẫn chỉ có **01 Vercel Serverless Function** (`api/index.js`).

## Luồng log mới

1. Chọn Sub-task.
2. Nhập/chọn TimeSpent, ngày, Description và OT nếu cần.
3. Không gọi API để tính Dự kiến trong lúc nhập.
4. Bấm Log → engine mới kiểm tra worklog hiện có, xếp giờ, tạo worklog và chuyển trạng thái.
5. Thành công → hiện chính xác Sub-task đã log vào thời gian nào.

## Tác giả

Quick Jira Log được xây dựng từ ý tưởng của **HuyVo** với sự hỗ trợ của AI.  
**© 2026 HuyVo. All rights reserved.**

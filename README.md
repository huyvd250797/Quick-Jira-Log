# Quick Jira Log V1.6.2 – Desktop Modal & Capacity Sync

Nâng cấp trực tiếp từ **V1.6.1 – Sticky Capacity Header**.

## Thay đổi chính

- Trên **PC**, Log tất cả và Log 1 Sub-task được mở trong **modal lớn**; trang nền được khóa cuộn và nội dung cuộn bên trong modal.
- **Tiến độ giờ thường / 8h** nằm trong header sticky của modal, nên khi cuộn xuống nhiều Sub-task vẫn luôn nhìn thấy tiến độ.
- Fix Log 1 Sub-task: bấm preset **30m / 1h / 2h / 3h / 4h** sẽ tính lại tiến độ ngay lập tức, giống Log tất cả.
- Có thể bấm **Esc** để đóng modal PC.
- Đưa **Tiến độ giờ thường / 8h** lên vùng header của **Log tất cả**, vì vậy khi cuộn qua nhiều Sub-task người dùng vẫn luôn nhìn thấy tổng giờ đã log và đang nhập.
- Header tiến độ hoạt động dạng **sticky** trên cả mobile bottom sheet và desktop khi nội dung dài vượt viewport.
- Bổ sung **Tiến độ giờ thường / 8h** tương tự cho **Log 1 Sub-task**: hiển thị **Đã log trước đó + Đang nhập = Tổng dự kiến / 8h** theo ngày đang chọn.
- Khi thay đổi ngày, TimeSpent, preset hoặc bật/tắt OT, tiến độ của Log 1 được cập nhật tức thời.
- Nếu tổng giờ thường dự kiến vượt 8h, giao diện cảnh báo và khóa **LOG WORK / LOG & NEXT**; OT được tách riêng và không cộng vào mốc 8h.
- Giữ nguyên bottom sheet cao 95dvh, action bar sticky sát đáy và pipeline Fast Logwork của V1.6.0.
- Giữ nguyên cơ chế chống overlap, idempotency, rollback và giới hạn 8h phía server.

## Thông tin

**© 2026 HuyVo. All rights reserved.**

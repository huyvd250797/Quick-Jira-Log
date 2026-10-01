# Quick Jira Log V1.6.1 – Sticky Capacity Header

Nâng cấp trực tiếp từ **V1.6.0 – Daily Capacity & Fast Logwork**.

## Thay đổi chính

- Đưa **Tiến độ giờ thường / 8h** lên vùng header của **Log tất cả**, vì vậy khi cuộn qua nhiều Sub-task người dùng vẫn luôn nhìn thấy tổng giờ đã log và đang nhập.
- Header tiến độ hoạt động dạng **sticky** trên cả mobile bottom sheet và desktop khi nội dung dài vượt viewport.
- Bổ sung **Tiến độ giờ thường / 8h** tương tự cho **Log 1 Sub-task**: hiển thị **Đã log trước đó + Đang nhập = Tổng dự kiến / 8h** theo ngày đang chọn.
- Khi thay đổi ngày, TimeSpent, preset hoặc bật/tắt OT, tiến độ của Log 1 được cập nhật tức thời.
- Nếu tổng giờ thường dự kiến vượt 8h, giao diện cảnh báo và khóa **LOG WORK / LOG & NEXT**; OT được tách riêng và không cộng vào mốc 8h.
- Giữ nguyên bottom sheet cao 95dvh, action bar sticky sát đáy và pipeline Fast Logwork của V1.6.0.
- Giữ nguyên cơ chế chống overlap, idempotency, rollback và giới hạn 8h phía server.

## Thông tin

**© 2026 HuyVo. All rights reserved.**

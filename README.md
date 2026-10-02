# Quick Jira Log V1.7.2 – Bulk Log Layout Optimization

Nâng cấp trực tiếp từ **V1.7.1 – Instant Bulk Defaults & Manual Smart Allocation**.

## Trọng tâm phiên bản

- Thu gọn layout **Log tất cả** để xem được nhiều Sub-task hơn nhưng vẫn giữ khoảng thở, không gây cảm giác chật.
- Đưa **Ngày logwork** lên sticky header để cuộn xuống vẫn luôn biết đang log ngày nào.
- Bỏ các đoạn mô tả/giải thích dài trong Bulk modal; chỉ giữ thông tin chức năng cần thiết.
- Giữ **Tiến độ giờ thường / 8h** trong sticky header và đặt **Tự động phân bổ** ngay cạnh trạng thái tiến độ.
- Tối ưu TimeSpent + preset + OT theo bố cục ngang trên desktop; mobile vẫn responsive và thao tác một tay.
- Description tiếp tục thu gọn mặc định, chỉ mở khi người dùng cần sửa.

## Smart Bulk Allocation giữ nguyên

- Mỗi Sub-task mở Bulk mặc định **1h** để dùng ngay.
- Không tự phân bổ khi mở modal.
- Chỉ khi người dùng bấm **TỰ ĐỘNG PHÂN BỔ**, app mới đọc phần giờ còn thiếu tới 8h và chia lại TimeSpent.
- Người dùng luôn có thể sửa TimeSpent, preset, OT hoặc bỏ Sub-task trước khi Log.

## Reliability giữ nguyên

- Jira Auth Classification + CAPTCHA Guard.
- Late Worklog Warning từ N-2 trở về trước.
- Daily Capacity 8h, OT, chống overlap, rollback và idempotency.
- Desktop modal / mobile bottom sheet / sticky header.
- Log 1, Log tất cả, Planner, History và workflow transition.

## Thông tin

**© 2026 HuyVo. All rights reserved.**

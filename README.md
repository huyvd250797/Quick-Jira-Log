# Quick Jira Log V1.7.1 – Instant Bulk Defaults & Manual Smart Allocation

Hotfix UX nâng cấp trực tiếp từ **V1.7.0 – Fast Interaction & UX Polish**.

## Trọng tâm phiên bản

Mở **Log tất cả** phải dùng được ngay, không chờ app tính phân bổ. Mọi Sub-task mặc định có **TimeSpent = 1h**. Người dùng có thể bấm **LOG TẤT CẢ** ngay, chỉnh tay, hoặc chủ động bấm **TỰ ĐỘNG PHÂN BỔ** khi muốn app tính phần giờ còn thiếu tới 8h.

## Smart Bulk Time Allocation – chỉ chạy khi người dùng yêu cầu

Khi mở **Log tất cả**:

1. Danh sách hiển thị ngay, mỗi Sub-task mặc định **1h**.
2. `day-audit` chỉ chạy nền để cập nhật thanh tiến độ và không tự sửa TimeSpent.
3. Nếu người dùng bấm **TỰ ĐỘNG PHÂN BỔ**, app lấy số giờ đã log, tính `Giờ còn thiếu = 8h - giờ thường đã log`, rồi phân bổ lại toàn bộ TimeSpent.
4. Người dùng vẫn có thể sửa TimeSpent, preset, OT hoặc bỏ Sub-task trước khi bấm **LOG TẤT CẢ**.
5. Sau khi đã phân bổ tự động, nút đổi thành **PHÂN BỔ LẠI**.

Ví dụ: đã log **1h**, còn **7h**, có **6 Sub-task** → khi bấm Tự động phân bổ sẽ điền **1h + 1h + 1h + 1h + 1h + 2h = 7h**.

- Nếu quỹ giờ nhỏ hơn 1h/Sub-task, app ưu tiên block 30m khi có thể.
- Nếu quỹ giờ nhỏ hơn 30m/Sub-task, app vẫn chia theo phút để giảm nhập tay.
- OT không được cộng vào mốc 8h giờ thường.
- Auto Allocation chỉ chạy khi người dùng bấm nút và **không tự gửi Jira**.
- Khi người dùng đã sửa thủ công, app không tự ghi đè; chỉ chia lại khi người dùng chủ động bấm **TỰ ĐỘNG PHÂN BỔ / PHÂN BỔ LẠI**.

## UX Polish

- Bulk item chỉ có nhãn **AUTO** sau khi người dùng chủ động chạy Tự động phân bổ.
- Description được thu gọn mặc định thành **Sửa Description**, vì nội dung đã kế thừa Summary; chỉ mở khi cần chỉnh.
- Mobile Bulk compact hơn để nhìn được nhiều Sub-task trong cùng một màn hình.
- Daily Capacity sticky vẫn hiển thị `Đã log + Đang nhập = x/8h` trong suốt quá trình cuộn.
- Mở Bulk không chờ phân bổ; `day-audit` chạy nền. Khi người dùng bấm Tự động phân bổ, app tái sử dụng kết quả đang có hoặc chờ đúng một lượt kiểm tra nếu cần.

## Reliability giữ nguyên

- Jira Auth Classification + CAPTCHA Guard V1.6.5.
- Late Worklog Warning từ N-2 trở về trước.
- Daily Capacity 8h, OT, chống overlap, rollback và idempotency.
- Desktop modal / mobile bottom sheet / sticky header.
- Log 1, Log tất cả, Planner, History và workflow transition.

## Thông tin

**© 2026 HuyVo. All rights reserved.**

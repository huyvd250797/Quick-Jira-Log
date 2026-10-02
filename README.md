# Quick Jira Log V1.7.0 – Fast Interaction & UX Polish

Nâng cấp trực tiếp từ **V1.6.5 – Jira Auth Classification Fix**.

## Trọng tâm phiên bản

Giảm thao tác khi dùng **Log tất cả**, giúp người dùng có thể mở Bulk Logwork và bấm Log ngay mà không phải nhập TimeSpent cho từng Sub-task nếu không muốn chỉnh tay.

## Smart Bulk Time Allocation

Khi mở **Log tất cả**:

1. App dùng kết quả kiểm tra giờ trong ngày vốn đã có từ `day-audit`.
2. Tính `Giờ còn thiếu = 8h - giờ thường đã log`.
3. Tự phân bổ phần giờ còn thiếu cho toàn bộ Sub-task đang chọn.
4. Người dùng vẫn có thể sửa TimeSpent, preset, OT hoặc bỏ Sub-task trước khi bấm **LOG TẤT CẢ**.
5. Có nút **PHÂN BỔ LẠI** khi muốn app tính lại sau khi chỉnh danh sách.

Ví dụ: đã log **1h**, còn **7h**, có **6 Sub-task** → tự điền **1h + 1h + 1h + 1h + 1h + 2h = 7h**.

- Nếu quỹ giờ nhỏ hơn 1h/Sub-task, app ưu tiên block 30m khi có thể.
- Nếu quỹ giờ nhỏ hơn 30m/Sub-task, app vẫn chia theo phút để giảm nhập tay.
- OT không được cộng vào mốc 8h giờ thường.
- Auto Allocation chỉ đề xuất dữ liệu trên giao diện, **không tự gửi Jira**.
- Khi người dùng đã sửa thủ công, app không tự ghi đè; chỉ chia lại khi bấm **PHÂN BỔ LẠI**.

## UX Polish

- Bulk item có nhãn **AUTO** để nhận biết TimeSpent do app tự phân bổ.
- Description được thu gọn mặc định thành **Sửa Description**, vì nội dung đã kế thừa Summary; chỉ mở khi cần chỉnh.
- Mobile Bulk compact hơn để nhìn được nhiều Sub-task trong cùng một màn hình.
- Daily Capacity sticky vẫn hiển thị `Đã log + Đang nhập = x/8h` trong suốt quá trình cuộn.
- Không phát sinh thêm request Jira chỉ để tính phân bổ; thuật toán chạy tức thời trên client sau khi có dữ liệu `day-audit`.

## Reliability giữ nguyên

- Jira Auth Classification + CAPTCHA Guard V1.6.5.
- Late Worklog Warning từ N-2 trở về trước.
- Daily Capacity 8h, OT, chống overlap, rollback và idempotency.
- Desktop modal / mobile bottom sheet / sticky header.
- Log 1, Log tất cả, Planner, History và workflow transition.

## Thông tin

**© 2026 HuyVo. All rights reserved.**

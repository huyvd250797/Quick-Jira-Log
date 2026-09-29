# Quick Jira Log V1.2.0 – Editable Log Date Hotfix

V1.2.0 giữ nguyên Focused Logwork UX của V1.1.0 và bổ sung lại quyền chọn/cập nhật Ngày logwork. KEY, Project và Summary tiếp tục lấy từ Jira; người dùng chỉ chỉnh Ngày logwork, TimeSpent và Description.

## Luồng Logwork cá nhân

- Không hiển thị form nhập KEY/PROJECT/Date thủ công trên dashboard.
- Màn hình chính ưu tiên danh sách **Sub-task chưa logwork**.
- Chỉ khi bấm một Sub-task, form **Logwork Sub-task** mới xuất hiện.
- KEY, Project, Summary và ngày logwork được nạp tự động và khóa chỉnh sửa.
- Người dùng chỉ nhập/chỉnh:
  - `TimeSpent`
  - `Description`
- Description mặc định lấy theo Summary của Jira.
- Ngày logwork mặc định là ngày hiện tại.

## Log tất cả

- Bỏ luồng `Chọn nhiều → Chọn đang hiện → Tiếp tục`.
- Thay bằng một nút **LOG TẤT CẢ**.
- Một lần bấm sẽ tự chọn toàn bộ Sub-task chưa logwork và mở ngay Bulk editor.
- Trong Bulk editor chỉ chỉnh `TimeSpent` và `Description` cho từng Sub-task.
- Ngày Bulk tự lấy ngày hiện tại và không cho nhập thủ công.

## Settings / Worklog tools

Hai nghiệp vụ phụ được gom thành nhóm thu gọn để giao diện bớt dày:

1. **Kiểm tra & lập kế hoạch**
   - xem giờ đã logwork;
   - xem giờ còn trống;
   - `Đã bận` đổi thành `Đã logwork`.

2. **Tìm & chỉnh sửa worklog đã log**
   - tìm lại Sub-task đã log trên Jira theo ngày/KEY;
   - xem chi tiết worklog;
   - sửa hoặc xóa worklog;
   - nút hành động đổi thành `TÌM WORKLOG ĐÃ LOG` để rõ nghĩa.

## Giữ nguyên

- Jira fixed JQL Sub-task chưa logwork.
- Chống log trùng giờ.
- Chỉ xếp giờ trong `08:00–12:00` và `13:30–17:30`.
- To Do → In Progress → Done.
- Dark/Light mode.
- PWA.
- Worklog History & Correction.
- Desktop/mobile responsive.
- Idempotency, retry/backoff và session hardening.

## Deploy

Giữ nguyên Environment Variables của bản trước và deploy source lên Vercel. Không cần thay đổi database.

## V1.2.0 – Streamlined Navigation & Bulk Selection

- `LOG TẤT CẢ` mặc định đưa toàn bộ Sub-task chưa logwork vào batch; có thể bấm `×` để loại từng Sub-task chưa cần log.
- Bỏ hoàn toàn Mẫu Description và Quản lý mẫu.
- Desktop: `Kiểm tra & lập kế hoạch` và `Worklog đã log` là hai nút truy cập trực tiếp cạnh Dark/Light mode.
- Mobile: hai chức năng trên nằm ở taskbar cố định phía dưới.
- Settings chỉ giữ các cấu hình ứng dụng/PWA, giao diện và lịch sử thao tác.

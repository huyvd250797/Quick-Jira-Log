# Quick Jira Log V1.32.0 — Loading animation & khôi phục thống kê

## Bàn giao

- Dashboard và các vùng đọc dùng skeleton/animation tại chỗ; các thao tác đọc tiếp tục chạy nền. Lỗi và quyền vẫn hiển thị; bảo vệ thao tác ghi giữ nguyên.
- Thiết kế lại thẻ tiến độ thống kê: bấm trực tiếp, bỏ Mở/chevron; kéo đổi vị trí và nhớ vị trí trong viewport mobile.
- Tiến độ màn hình thống kê gọn hơn, cách tính thu gọn.
- Tăng trang issue 50→100, worklog 100→500 và hàng đợi đọc 3→5. Tổng giờ có trước, native OT đối chiếu riêng theo nhóm; UI tiến độ được giới hạn tần suất dựng lại.
- IndexedDB lưu atomically từng trang/cursor theo username/runID, khôi phục bộ lọc/tác vụ và tiếp tục sau reload; giữ ảnh chụp các màn hình chỉ đọc. Không lưu thêm credential hay tự replay thao tác ghi.
- PWA không tự reload khi service worker tiếp quản. Nút cập nhật yêu cầu flush checkpoint trước reload.
- Node24/Vercel và các biến môi trường hiện hành giữ nguyên; không thêm dependency runtime hoặc dịch vụ bên ngoài.

## Kết quả kiểm thử

npm test và bốn bộ Chromium background-loading/calendar-experience/jira-editor-images/jira-parent-edit đạt PC/mobile nhỏ/mobile/ngang, với Jira giả lập. Reload giữa thống kê, không đọc lại trang commit/không cộng trùng, pause sau reload, scope/account isolation, quota warning và kéo/bấm thẻ đạt. Chi tiết TESTING.md.

## Giới hạn

Đây là checkpoint phía thiết bị, không phải job server chạy khi app đã đóng. iOS có thể treo JavaScript và thu hồi kho lưu; chỉ tiếp tục được từ phần đã commit khi mở lại và kho vẫn còn. Checkpoint thống kê giữ đến lượt quét mới/logout; ảnh chụp các màn hình khác chỉ dùng tối đa 24h. Logout chủ động xóa. Dữ liệu khôi phục ghi thời điểm lưu, cần chạy thống kê mới nếu muốn đối chiếu hoàn toàn sau khi Jira thay đổi. Chưa kiểm chứng Jira công ty/Safari iPhone thật hoặc tốc độ thực tế. Chưa push/deploy.

## Kế tiếp — đề xuất

V1.33.0 — Phân tích Sub-task Type theo thành viên: phân bổ giờ theo custom field thật của Jira, drilldown công việc từng nhóm. Chưa xây dựng, chờ Boss chọn.

# V1.36.0 — Working Tree: Truy cập nhanh

## Chức năng
- Icon ☆/★ ghim/bỏ ghim Epic, Story, Task, Bug từ danh sách Working Tree và chi tiết công việc. Mục Đã ghim dạng thẻ gọn, thu gọn được, có icon loại và Status. Không ghim Subtask trong bản này. Tối đa 30 mục/tài khoản/thiết bị.
- Bấm Epic ghim mở danh sách con; Story/Task/Bug ghim mở chi tiết để tiếp tục tạo Subtask bằng luồng hiện có. Đọc lại quyền/thông tin công việc trên Jira trước khi mở mục ghim/tiếp tục; ghim không cấp thêm quyền truy cập.
- Nhớ Project, phạm vi, từ khóa và vị trí cuộn trong danh sách gốc; nhớ Epic gần nhất, từ khóa, Status/Assignee và vị trí cuộn trong Epic. Khi đóng chi tiết, danh sách và vị trí vẫn giữ nguyên.
- Sau tải lại app, mở Working Tree tự tải lại danh sách Project gần nhất. Bấm Tiếp tục · EPIC-KEY để mở lại Epic gần nhất, không tự mở modal khi vào app.
- Khôi phục phân trang tối đa 10 trang đã xem (250 công việc) mỗi danh sách để tránh tải lại quá nhiều khi vừa vào app. Vị trí có thể dịch chuyển nếu Jira thay đổi dữ liệu hoặc vượt phạm vi khôi phục này. Dữ liệu danh sách lấy mới từ Jira, không lưu toàn bộ task/description/worklog.
- Bộ lọc thu gọn trong Epic: Status, Assignee (Tất cả/Tôi/Chưa được giao/Chọn người khác). Chọn người từ kết quả Jira. Hiển thị điều kiện đang áp dụng và nút Xóa lọc. Không tự focus ô nhập khi mở.
- Lọc Status/Assignee bằng JQL phía Jira, giữ đúng quan hệ Epic Link và hỗ trợ công việc khác Project thuộc cùng Epic; kết hợp tìm gần đúng mã/tên và phân trang. Không lọc riêng những mục đã tải về.
- Ghim/vị trí lưu localStorage theo username, có kiểm tra và giới hạn dữ liệu. Không lưu mật khẩu/token, không đồng bộ ghim điện thoại-PC, không thêm database. Khi trình duyệt chặn lưu, thông báo và giữ trong phiên. Đăng xuất đổi tài khoản xóa trạng thái đang hiển thị nhưng giữ tùy chọn riêng của từng tài khoản trên thiết bị.

## Hướng dẫn
Working Tree → chọn Project → Tìm → ☆ trên Epic hoặc Story để ghim. Mở mục trong Đã ghim để đi thẳng vào danh sách/chi tiết. Trong Epic, mở Bộ lọc rồi chọn Status/Assignee; xóa lọc để quay lại toàn bộ danh sách. Đóng/mở app → Working Tree → Tiếp tục để quay lại Epic trước đó.

## Nâng cấp / triển khai
Không đổi dependency runtime, DB hoặc biến môi trường. Node 24; `npm test`; kiểm tra UI `npm run test:tree-quick` khi đã cài Playwright/Chromium. Deploy như README phía dưới; PWA báo V1.36.0 thì Cập nhật. Chưa push/deploy trong lần bàn giao. Rollback bằng source V1.35.8; tùy chọn mới nằm riêng namespace và không ảnh hưởng logwork cũ.

## Kiểm tra
Xem TESTING.md. Jira/API được mô phỏng; chưa xác minh Jira công ty hoặc iPhone/Safari vật lý. Giữ nguyên logwork, OT, kéo thả/lưu lịch và luồng tạo công việc/Subtask.

## Đề xuất tiếp theo — chưa xây dựng
V1.37.0 — Logwork từ Tra cứu: chọn nhiều Subtask đủ điều kiện trong kết quả/chi tiết rồi chuyển sang Log tất cả hiện có, giữ xem trước và xác nhận. Chỉ triển khai khi Boss chọn.

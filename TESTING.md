# Kiểm tra V1.10.1

Ngày: 16/10/2026. Runtime: Node.js v24.19.0.

## Hotfix V1.10.1

- Đã chạy npm test: toàn bộ kiểm tra logic/API trước đây đều đạt.
- Kiểm tra vị trí và hit-test bằng Playwright/Chromium: desktop 1440×1000, cấu hình iPhone 13, mobile 315×683 và landscape 844×390.
- Cuộn historyResults đến cuối, cuộn dọc/ngang lưới tuần: tọa độ hai nút Tuần/Tháng giữ nguyên, luôn nằm trong viewport và không bị phần tử khác che.
- Chuyển sang Tháng khi đang cuộn ở cuối; cuộn lịch tháng rồi chuyển về Tuần thành công.
- Chuyển Danh sách ẩn thanh điều khiển lịch.
- Đã xem ảnh render giao diện tối trên màn hình mobile nhỏ. Không có lỗi JavaScript hoặc trùng ID.
- Kiểm tra dùng dữ liệu giả lập; chưa xác minh Safari trên iPhone vật lý hoặc Jira thật.

## Kiểm tra tự động

`npm test` đã chạy đạt toàn bộ regression V1.8/V1.9 và test mới V1.10.0.

- Scheduling, OT, overlap/timezone, auth/CAPTCHA, workflow transition, bulk allocation, idempotency/cache và API lịch sử.
- Tuần qua biên tháng/năm; tuần bắt đầu T2; định dạng Xh Ym và các giá trị 0h 0m.
- Dashboard đúng mục tiêu 8h/ngày T2–T6 và 40h/tuần; giờ cuối tuần riêng; số giờ còn thiếu không âm.
- Geometry block đúng số phút, và các block trùng giờ được phân lane.
- HTTP stream thực qua Node server cục bộ với Jira giả lập: Log đơn/Bulk, dữ liệu progress về trước kết quả cuối, phần trăm không giảm, lỗi không có 100%, idempotent replay không tạo worklog lại, API JSON vẫn tương thích.
- `node --check` cho app.js, handlers/worklog.js, handlers/bulk-worklog.js, lib/ui-tools.js và các module thay đổi.
- HTML có 165 ID duy nhất, không trùng.

## Kiểm tra trình duyệt

Playwright và Chromium headless, cấu hình desktop 1440×1000 và iPhone 13, timezone Asia/Ho_Chi_Minh. Các API đọc dùng dữ liệu giả lập; API POST trong bài kiểm tra UI dùng local HTTP server truyền từng chunk progress.

Các kịch bản đã đạt trên cả hai cấu hình:

1. Dashboard 3h 30m hôm nay → cần thêm 4h 30m; 33h 0m tuần → cần thêm 7h 0m; cuối tuần 2h riêng.
2. Lịch tuần mặc định 5 ngày, tiêu đề ngày /8h và tổng tuần /40h.
3. Block 30m/1h/2h lần lượt cao 30/60/120 CSS pixel, đúng vị trí trên trục giờ.
4. Mở block, tăng 30 phút rồi lưu; dashboard và lịch tải lại sau sửa.
5. Xóa từ block qua xác nhận; tải lại dữ liệu sau xóa.
6. Bật T7/CN, đổi Tuần/Tháng, tháng 10 có 31 ngày.
7. Tuần chứa 01/11/2026 hiển thị từ 26/10/2026; Hôm nay quay về tuần hiện tại.
8. Log đơn/Bulk hiển thị % khi server còn đang xử lý; ETA có nhãn ước tính; chỉ đạt 100% sau kết quả cuối.
9. Stream kết thúc thiếu kết quả cuối: dừng trước 100%, thông báo chưa xác định, không tự POST lại.
10. Dashboard tải lỗi hiển thị —; dữ liệu tải một phần hiển thị tạm tính và không kết luận số giờ còn thiếu chính xác.
11. Không có lỗi JavaScript chưa xử lý hoặc tràn ngang toàn trang; lưới tuần cuộn ngang trong vùng riêng.
12. Kiểm tra ảnh render desktop/mobile cho dashboard, tuần và tiến trình; lịch sáng/tối có độ tương phản và bố cục phù hợp.

## Phạm vi xác minh

- Các kiểm tra dùng tài khoản/dữ liệu giả lập; không đăng nhập hoặc ghi lên Jira thật.
- Chưa deploy production hoặc chạy Safari/PWA trên iPhone vật lý.
- Số đo kích thước block không phải số đo hiệu năng Jira. ETA và mức phản hồi stream cần được kiểm tra trên kết nối Jira/hosting thực tế sau triển khai.
- Giới hạn worklog qua nửa đêm, mục tiêu ngày nghỉ và dữ liệu tải thiếu được ghi trong README.md.

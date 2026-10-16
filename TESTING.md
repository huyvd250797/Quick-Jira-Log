# Kiểm tra V1.10.4

Ngày: 16/10/2026. Runtime: Node.js v24.19.0.

## Mobile TimeSpent V1.10.4

- npm test đạt toàn bộ kiểm tra hiện có.
- Playwright/Chromium với dữ liệu/API giả lập: mobile 315×683, 390×844, 430×932, ngang 844×390 và PC 1366×768; không có lỗi JavaScript.
- Đo kích thước chữ thực tế với canvas theo font input: trên mobile, 3h 30m cần khoảng 67px, 12h 30m khoảng 78px; vùng chữ khả dụng 124px, group rộng 192px. Kiểm tra thêm 16h.
- Preset 3h → tăng thành 3h 30m → 4h → giảm thành 3h 30m; draft nhận đúng giá trị. 16h vô hiệu nút tăng theo giới hạn hiện có.
- Preset nằm dưới ô nhập và đều nhìn thấy; không tràn ngang trang. Kiểm tra thao tác thực qua click, không dùng force click.
- Mobile ngang thấp: header/footer cuộn khỏi vùng nhập, bấm preset và tăng/giảm thành công.
- Đã xem ảnh render mobile sáng/tối; PC giữ CSS bố cục cũ. Chưa kiểm tra Safari/iPhone vật lý hoặc ghi lên Jira thật.

## Desktop Calendar Workspace V1.10.3

- npm test đạt toàn bộ kiểm tra hiện có; node --check app.js đạt.
- Playwright/Chromium với API giả lập: PC 1440×900, 1366×768, 960×720, 1920×1080; thêm iPhone 13, 315×683 và 844×390.
- PC chỉ có một phần tử nội dung cuộn dọc (#historyResults), không có cuộn lồng ở lưới tuần. Header ngày giữ ở đầu vùng lịch khi cuộn.
- Ô chọn ngày rộng 144px. Chiều cao vùng kết quả lần lượt khoảng 699px, 567px, 476px và 879px trên bốn kích thước PC nêu trên, khi tải xong dữ liệu thông thường.
- Chọn ngày giao tháng, trước/sau, Hôm nay, đổi Tuần/Tháng, mở/đóng sửa, API lỗi/tải thiếu và thử lại đều đạt.
- Workflow desktop/iPhone: dashboard, block đúng tỷ lệ giờ, tăng 30m rồi lưu, xóa từ block, tiến trình log đơn/Bulk và stream bị ngắt đều đạt.
- Danh sách/Lịch trên header PC hiển thị và bấm được; quay lại Danh sách vẫn giữ KEY, tìm kiếm và bố cục cũ.
- Đối chiếu tự động V1.10.2 và V1.10.3 ở 390×844, 315×683, 844×390 cho cả Tuần và Tháng: tọa độ, kích thước, hiển thị, cỡ chữ, padding, màu và overflow của các phần chính giống nhau. Tắt animation trong bài đối chiếu để lấy trạng thái ổn định.
- Đã kiểm tra ảnh PC sáng/tối; không có lỗi JavaScript hoặc tràn ngang toàn trang. Các thử nghiệm dùng dữ liệu giả lập, chưa xác minh Safari/iPhone vật lý hoặc Jira thật.

## Giao diện lịch V1.10.2

- Đã chạy npm test và node --check app.js: đạt toàn bộ bộ kiểm tra hiện có.
- Playwright/Chromium với API giả lập: desktop 1440×1000, iPhone 13, mobile 315×683, ngang 844×390; không có lỗi JavaScript.
- Danh sách hiển thị bộ lọc ngày/KEY và nút Tìm; Lịch ẩn cả cụm này và hiển thị ô Đến ngày trong thanh cố định.
- KEY giữ nguyên khi chuyển qua lại; yêu cầu lịch tuần/tháng không gửi KEY ẩn, yêu cầu Danh sách gửi lại đúng KEY.
- Chọn 01/11/2026: lịch tuần tải 26/10–01/11; lịch tháng tải 01/11–30/11. Chọn 15/12 chuyển đúng tháng 12.
- Nút trước/sau, Hôm nay, chọn ô ngày tháng và tiêu đề ngày tuần đồng bộ ô Đến ngày.
- Nút ↻ tải lại thành công; kiểm tra dữ liệu thiếu, API lỗi và thử lại. Thông báo lịch không hướng dẫn bấm nút Tìm đã ẩn.
- Cuộn dọc/ngang: Tuần/Tháng, ô chọn ngày và nút tải lại giữ nguyên vị trí, vẫn hiển thị và hit-test được; mở/đóng form sửa vẫn thành công.
- Đã kiểm tra ảnh giao diện sáng/tối. Màn hình ngang dùng thanh điều hướng hai cột để tăng vùng xem lịch; không tràn ngang toàn trang.
- Dữ liệu giả lập, chưa kiểm tra Jira thật hoặc Safari trên iPhone vật lý.

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
- HTML có 168 ID duy nhất, không trùng.

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

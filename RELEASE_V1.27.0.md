# Quick Jira Log V1.27.0 — Sửa thông tin Subtask

## Chức năng và cách sử dụng

1. Vào Công việc Jira, tìm hoặc chọn filter, mở một Subtask (có thể mở từ tab Subtask của công việc cha).
2. Bấm **Cập nhật → Sửa thông tin Subtask**. App tải giá trị hiện tại, Edit Issues và edit metadata của đúng Subtask.
3. Sửa **Summary**, **Sub-task Type**, **Estimate**, **Description**. Trường Jira không cho sửa sẽ bị khóa và có lý do. Sub-task Type là custom field thực tế, không phải Issue Type; app không đổi loại issue hoặc công việc cha.
4. Description dùng editor trực quan của V1.26.0: định dạng, màu, tiêu đề, bảng, danh sách, Wiki và xem trước. Mô tả không đụng tới được giữ nguyên chuỗi gốc, không bị chuyển lại định dạng khi chỉ sửa trường khác. Macro nâng cao giữ ở Wiki. Mô tả không phải chuỗi wiki hoặc quá 20.000 ký tự không được sửa trong app.
5. Estimate là **Original Estimate**, nhập giờ/phút như `2h 30m`, `90m`, `0m`. App dùng phút để không đoán độ dài ngày/tuần của Jira; không nhận `d`, `w` hay số thập phân trong form sửa này. Giữ Remaining Estimate nếu Jira trả về giá trị số hợp lệ. Không sửa thời gian đã log. Chưa có chức năng xóa Original Estimate về null; dùng 0m để đặt bằng 0.
6. Bấm **Xem lại thay đổi**: chỉ liệt kê trường thay đổi với giá trị hiện tại và sau khi lưu. Description mới có bản xem trước. Bấm Quay lại giữ phần đang sửa; chỉ **Lưu thay đổi** mới gửi Jira.
7. App đọc lại quyền, metadata, thời điểm cập nhật và lựa chọn trước khi PUT, chỉ gửi trường thực sự đổi. Sau PUT đọc lại để xác nhận đúng dữ liệu và cha/Issue Type; thành công sẽ có toast và cập nhật chi tiết cùng thẻ kết quả đang mở.

Đóng form rồi mở lại trong cùng chi tiết giữ phần đang sửa. Đổi công việc, tải lại chi tiết hoặc đăng xuất sẽ xóa phần sửa trong bộ nhớ. Nút Tải lại có bước xác nhận bỏ nội dung đang sửa. Không lưu bản sửa vào local storage.

## Quyền, lỗi và đối chiếu

- Quyền và edit screen/workflow Jira quyết định trường có thể sửa. Không dùng create metadata để suy đoán quyền sửa; không bypass field screen/security/validator. Nếu thiếu quyền hoặc trường không có trên edit screen, hiển thị lý do và có đường Mở Jira.
- Tìm custom field theo tên Sub-task Type bằng cơ chế hiện có; nếu trùng tên có thể dùng biến tùy chọn sẵn có `JIRA_SUBTASK_TYPE_FIELD_ID` với ID thật. Lựa chọn theo `allowedValues` của đúng issue, không hardcode Developing/Testing hoặc ID riêng của công ty.
- Nếu Subtask hoặc metadata đã thay đổi sau lúc mở form, chặn trước gửi và yêu cầu tải lại/xem lại. Đây là kiểm tra trước ghi, không phải khóa giao dịch tuyệt đối: thay đổi đồng thời trong khoảng giữa kiểm tra và PUT vẫn phụ thuộc Jira. Không gửi trường không đổi để giảm nguy cơ ghi đè.
- Jira từ chối sẽ hiện lỗi và giữ phần đang sửa. Mất phản hồi hoặc chưa đối chiếu được sẽ không báo thành công, không tự gửi lại. Khóa nút lưu trong phiên theo tài khoản/mã issue; mở Jira kiểm tra, sau đó bấm Tôi đã kiểm tra trên Jira để tải dữ liệu mới. Nếu tải lại cả app thì khóa trong bộ nhớ không còn; luôn đối chiếu Jira trước khi gửi yêu cầu mới sau một lỗi chưa rõ kết quả.
- Dùng cơ chế idempotency hiện có, không tự retry PUT. Với nhiều serverless instance nên dùng Redis tùy chọn đã có của app để chia sẻ trạng thái idempotency. Chưa kiểm thử Redis thật trong bản này.

## Source, chạy và triển khai

Giải nén `Quick-Jira-Log_v1.27.0.zip`, mở `Quick-Jira-Log-V1.27.0`. Node **24.x**; chạy `npm ci`, `npm test`. Không thêm dependency runtime, biến môi trường bắt buộc, database hoặc migration. Giữ cấu hình Vercel và `APP_SESSION_SECRET` đang dùng. Hướng dẫn GitHub/Vercel và cấu hình gốc tiếp tục nằm trong README phía dưới. Bản này bàn giao source; chưa push/deploy.

API mới: GET `/api?action=jira-subtask-edit-options&key=CAL-2`, POST `/api?action=jira-subtask-edit` nhận key, revision, expectedUpdated, requestId, values. Backend whitelist bốn alias trường, dùng ID custom field của server; session HttpOnly, kiểm tra origin, no-store và giới hạn body 96 KiB.

Version, manifest và cache shell PWA đã đổi 1.27.0. Sau triển khai tải lại app và kiểm tra nhãn bản mới. Rollback deployment không hoàn tác các giá trị đã sửa trên Jira; dùng lịch sử Jira để đối chiếu nếu cần khôi phục. Không thay đổi luồng logwork, lịch hoặc Overtime.

## Kiểm thử và giới hạn xác minh

- `npm test`: toàn bộ logic/API kế thừa và bộ mới `tests/jira-subtask-edit-tests.js`.
- `npm run test:subtask-edit-ui`: Chromium PC1440×900, mobile390×844/320×683, ngang844×390; chạy frontend → router/session thật → mock Jira editmeta/PUT → đọc lại, không mock kết quả thành công ngay ở frontend.
- Hồi quy `npm run test:editor-ui`, `npm run test:update-ui`: editor/tạo công việc/Subtask và cập nhật trạng thái/người nhận/ưu tiên/bình luận theo luồng cũ.
- Chưa thao tác Jira công ty, Safari/iPhone vật lý hoặc triển khai thật. Sau deploy cần thử một Subtask có quyền sửa, kiểm tra bốn trường trên Jira; trường bị khóa, validator công ty, legacy time tracking, custom type và chỉnh sửa đồng thời.

## Phiên bản kế tiếp — đề xuất chưa xây dựng

**V1.28.0 — Sửa thông tin Story/Task/Bug:** mở rộng luồng sửa Summary, Estimate và Description cho công việc cha; xem lại trước/sau, kiểm tra edit metadata và đối chiếu sau lưu theo từng loại. Chờ Boss chọn.

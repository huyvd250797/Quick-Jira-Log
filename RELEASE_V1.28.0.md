# Quick Jira Log V1.28.0 — Sửa thông tin Story/Task/Bug

## Cách sử dụng

1. Mở Story, Task hoặc Bug từ kết quả tra cứu/filter Jira.
2. Bấm **Cập nhật → Sửa thông tin Story/Task/Bug** (tên nút theo loại đang xem).
3. Sửa **Summary**, **Estimate**, **Description** theo quyền và edit screen Jira của chính công việc đó. Những trường không được phép sửa bị khóa, có lý do và đường Mở Jira.
4. Bấm **Xem lại thay đổi** để xem giá trị trước/sau; mô tả mới có xem trước định dạng. Quay lại giữ nội dung; chỉ **Lưu thay đổi** mới gửi Jira.
5. Sau khi Jira ghi và app đọc lại xác nhận, có toast; chi tiết và thẻ trong danh sách đang mở cập nhật giá trị mới.

Description dùng editor trực quan hiện có: đậm/nghiêng, màu, tiêu đề, danh sách, bảng, Soạn thảo/Wiki/Xem trước. Mô tả không sửa giữ nguyên chuỗi gốc khi chỉ thay trường khác. Macro nâng cao tiếp tục sửa trong Wiki; mô tả không phải chuỗi wiki hoặc dài quá 20.000 ký tự chỉ xem/mở Jira để sửa.

Estimate là **Original Estimate**, dùng giờ/phút (`2h 30m`, `90m`, `0m`), giữ Remaining Estimate khi Jira trả về số hợp lệ. Không nhận đơn vị ngày/tuần hoặc số thập phân trong form sửa để tránh đoán cấu hình Jira. Không xóa Estimate về null; dùng 0m đặt bằng 0. Quyền/legacy time tracking/validator Jira vẫn quyết định có được ghi hay không.

Đóng/mở lại form trong cùng chi tiết giữ phần đang sửa; Tải lại có bước xác nhận thay bằng dữ liệu mới. Đổi issue, tải lại chi tiết, tải lại app hoặc đăng xuất xóa bản sửa trong bộ nhớ. Không lưu draft vào thiết bị.

## Phạm vi và tính chính xác

- Hỗ trợ loại Jira có tên Story, Task, Bug (không phân biệt hoa/thường), có `subtask: false`; không hardcode issue type ID. Epic và các loại custom/đổi tên chưa được mở trong bản này. Subtask tiếp tục dùng luồng bốn trường của V1.27.0.
- Công việc cha chỉ có ba trường trên; không hiện hoặc phụ thuộc trường Sub-task Type. Backend có endpoint riêng, không nhận ghi custom Sub-task Type, parent hay issuetype qua chức năng sửa công việc cha.
- Dùng chung bộ xử lý quyền/metadata/validation với Subtask nhưng phân biệt scope phía server. Mỗi lần lưu đọc lại Edit Issues, editmeta, updated và revision; chỉ gửi trường thực sự đổi. Metadata/quyền/loại/updated thay đổi thì yêu cầu tải lại và xem lại trước khi gửi.
- Sau PUT kiểm tra lại giá trị các trường đổi, issue type ID và quan hệ parent (kể cả công việc không có parent). Không đổi issue type, cha, Subtask con, luồng logwork/lịch/OT trong source này. Thông báo và automation Jira vẫn áp dụng bình thường.
- Kiểm tra updated trước PUT không phải khóa giao dịch tuyệt đối; vẫn có cửa sổ thay đổi đồng thời giữa kiểm tra và ghi. Chỉ gửi trường thay đổi giúp giảm ghi đè dữ liệu khác.
- Không tự retry PUT. Mất phản hồi hoặc chưa đối chiếu được không báo thành công và khóa lưu trong phiên theo tài khoản/mã issue. Mở Jira đối chiếu, rồi bấm Tôi đã kiểm tra trên Jira để tải dữ liệu mới. Khóa trong bộ nhớ mất khi tải lại app; sau lỗi chưa rõ luôn kiểm tra Jira trước khi gửi yêu cầu mới.
- Dùng idempotency hiện có; production nhiều serverless instance nên giữ cấu hình Redis tùy chọn đã có. Không thêm lưu trữ hoặc biến môi trường bắt buộc.

## Source và triển khai

Giải nén `Quick-Jira-Log_v1.28.0.zip`, mở thư mục `Quick-Jira-Log-V1.28.0`. Node **24.x**; `npm ci`, `npm test`. Giữ cấu hình Vercel và APP_SESSION_SECRET hiện tại. Không thêm dependency runtime, database hoặc migration. Hướng dẫn GitHub/Vercel/cấu hình đầy đủ tiếp tục nằm trong README bên dưới. Bản này chỉ bàn giao source, chưa push/deploy.

API mới: GET `/api?action=jira-parent-edit-options&key=CAL-2`; POST `/api?action=jira-parent-edit` nhận key, revision, expectedUpdated, requestId và values (`summary`, `estimate`, `description`). Session HttpOnly, kiểm tra origin, no-store, giới hạn body 96 KiB. API Subtask cũ giữ nguyên URL và phạm vi.

Version, manifest và cache shell cập nhật 1.28.0. Sau deploy tải lại PWA và kiểm tra nhãn phiên bản. Có thể rollback deployment; rollback app không hoàn tác các giá trị đã sửa trên Jira. Dùng lịch sử Jira để đối chiếu khi cần khôi phục dữ liệu.

## Kiểm thử và giới hạn

- `npm test`: bộ logic/API kế thừa, Subtask và `tests/jira-parent-edit-tests.js` mới: cả Story/Task/Bug với ID khác nhau, whitelist, quyền, readonly, stale/schema/type conflict, parent, Estimate/remaining, replay/lost response/readback, CSRF/hết phiên và nội dung quá giới hạn.
- `npm run test:parent-edit-ui`: Chromium PC1440×900, mobile390×844/320×683, ngang844×390. Frontend chạy qua router/session thật, mock Jira tại fetch; đọc/sửa/xem lại/giữ draft/xác nhận/đối chiếu, danh sách cập nhật, xung đột, mất phản hồi, khóa quyền và dark/light. Các viewport lần lượt thử Story, Task, Bug, Story.
- `npm run test:subtask-edit-ui` và `npm run test:update-ui`: hồi quy sửa Subtask và các thao tác cập nhật nhanh cũ.
- Chưa truy cập Jira công ty, Safari/iPhone vật lý, Redis thật hoặc deploy. Sau triển khai cần thử một Story/Task/Bug có quyền, kiểm tra dữ liệu thật, validator/edit screen/time tracking của công ty và hồi quy lịch/logwork/OT.

## Phiên bản kế tiếp — đề xuất, chưa xây dựng

**V1.29.0 — Lịch sử thay đổi Jira:** xem ai đã sửa, thời điểm và giá trị trước/sau trong chi tiết công việc; hỗ trợ tải thêm và lọc theo trường để đối chiếu các lần cập nhật. Chờ Boss chọn.

# Quick Jira Log V1.29.0 — Ảnh trong trình soạn thảo

## Soạn mô tả có ảnh

- Khi tạo công việc/Subtask hoặc sửa thông tin Story/Task/Bug/Subtask, mở **Ảnh**, chọn ảnh PNG/JPEG/GIF/WebP/AVIF. Có thể dán ảnh từ clipboard vào vùng Soạn thảo hoặc kéo tệp ảnh vào vị trí con trỏ trên PC. Trên mobile dùng Chọn ảnh từ bộ chọn tệp/Photos. HEIC/SVG chưa hỗ trợ; chọn bản JPEG khi cần.
- Đặt con trỏ trước khi chọn hoặc bấm Chèn. Ảnh xuất hiện đúng vị trí trong mô tả; chữ trước/sau giữ nguyên. Chạm ảnh trong Soạn thảo để chọn cỡ 240/480/960px hoặc nguyên cỡ, hoặc Xóa vị trí ảnh. Muốn đổi vị trí: xóa vị trí cũ, đặt con trỏ mới rồi Chèn lại từ danh sách ảnh. Nhiều vị trí có thể dùng chung một ảnh, chỉ đính kèm một tệp.
- Có thể chèn ảnh đính kèm hiện có của issue từ danh sách trong panel Ảnh. Cú pháp ảnh đơn giản `!filename!`, `!filename|width=480!` được giữ qua Soạn thảo/Wiki/Xem trước. Cú pháp nâng cao chưa hỗ trợ vẫn ở Wiki, không tự làm mất nội dung. Ảnh chưa tải/không hỗ trợ xem trực tiếp có placeholder hoặc đường mở Jira.
- Chọn ảnh chỉ giữ File/blob trong bộ nhớ trình duyệt. Không tải Jira khi chọn, chèn, xem trước hoặc quay lại từ xác nhận. Chỉ tải các ảnh mới còn được tham chiếu trong mô tả khi bấm xác nhận lưu/tạo. Xóa vị trí trước xác nhận thì ảnh không dùng không được tải lên. Tối đa 10 ảnh trong bản nháp, 3 MiB/ảnh hoặc giới hạn Jira thấp hơn. Tệp chưa dùng vẫn chiếm một vị trí trong danh sách cho tới khi reset bản nháp.
- Giữ nguyên byte ảnh, không nén hoặc chuyển định dạng. Tên đính kèm được tạo riêng `qjl-<mã ngẫu nhiên>.<đuôi>` để tránh trùng tên trong Jira wiki; tên tệp gốc vẫn hiện trong danh sách đang soạn. Bản nháp ảnh không lưu lâu dài trên thiết bị, không được khôi phục sau tải lại app/đăng xuất.

## Xác nhận, tải ảnh và phục hồi lỗi

**Sửa công việc đang có:** xem lại nội dung trước/sau cùng ảnh rồi xác nhận. App đọc lại metadata/updated trước tải, đính kèm tuần tự, đối chiếu lại các trường gốc và revision, rồi lưu thay đổi với updated mới. Nếu ngoài app sửa dữ liệu trong quá trình này, app dừng thay vì ghi đè; ảnh đã đính kèm vẫn ở Jira. Không tự xóa tệp đã tải khi hủy/xóa vị trí hoặc khi một bước sau lỗi.

**Tạo công việc mới:** xác nhận tạo → tạo issue với phần mô tả chữ → tải ảnh → hoàn thiện Description chứa ảnh. Nếu mô tả chỉ có ảnh, phần mô tả ban đầu là “Ảnh đính kèm đang được bổ sung.”. Không ghi tham chiếu ảnh chưa tồn tại vào mô tả ban đầu. Cần quyền Create Issues, Create Attachments và Edit Issues/Description sau khi tạo; workflow hoặc edit screen có thể hạn chế bước cuối.

Nếu bước ảnh/mô tả lỗi sau khi tạo, biên nhận ghi rõ issue đã tạo, có **Kiểm tra & tiếp tục ảnh** để hoàn thiện trên chính mã đó. Không gọi tạo issue lần nữa. Tệp đã xác nhận không tải lại. Khi mất phản hồi tải ảnh, đối chiếu tên ngẫu nhiên và size duy nhất trên danh sách Jira; nếu chưa chứng minh được thì yêu cầu Boss kiểm tra Jira trước khi thử phần còn thiếu. Nếu mất phản hồi ghi mô tả, đọc lại thấy đúng mô tả cuối thì xác nhận hoàn tất; nếu chưa rõ, không tự gửi lại.

Giữ trang đang mở để tiếp tục ảnh. Đóng/mở form giữ bộ nhớ trong phiên; reset bản nháp, đổi context khiến form bị dọn, tải lại app hoặc đăng xuất sẽ mất File đang chờ. Khi đó đối chiếu issue/tệp trên Jira rồi chọn lại tệp thiếu; không tạo lại issue đã có. Nếu kết quả tạo issue chưa rõ và chưa có mã đáng tin cậy, app không tự tải ảnh vào một issue đoán được.

## Xem ảnh lớn trong chi tiết

- Bấm ảnh trong Description hoặc Xem ảnh ở tab tệp để mở popup.
- Nút **+ / −**, thanh kéo **100–500%**, **Vừa khung**; PC dùng bánh xe và double click, kéo chuột để xem phần ảnh đang phóng. Mobile dùng pinch hai ngón, chạm hai lần và kéo ảnh. Khung ảnh chặn pan ra ngoài; đổi kích thước/xoay màn hình thì fit lại.
- Đóng popup/mở ảnh khác đưa về vừa khung; không làm zoom hoặc kéo giao diện phía sau.
- Ảnh lớn hơn giới hạn proxy hiện có dùng thumbnail nếu Jira có. Popup ghi rõ đang xem thumbnail; phóng to không tạo thêm độ nét, mở Jira để lấy ảnh gốc. Giới hạn proxy/bảo vệ phiên của các bản trước giữ nguyên.

## Cài đặt, kiểm thử và triển khai

Giải nén `Quick-Jira-Log_v1.29.0.zip`, dùng `Quick-Jira-Log-V1.29.0`. Node **24.x**: `npm ci`, `npm run test`. Không thêm dependency runtime, database, migration hoặc biến môi trường bắt buộc; giữ APP_SESSION_SECRET và cấu hình Vercel hiện tại. Cấu hình CSP thêm `blob:` chỉ ở img-src để preview ảnh cục bộ; script/connect vẫn cùng origin. Version/cache shell/manifest đổi 1.29.0. Hướng dẫn GitHub/Vercel đầy đủ nằm tiếp trong README. Source chưa push/deploy.

Backend thêm GET/POST `jira-description-edit-options` / `jira-description-edit` để hoàn thiện Description sau tạo. Chỉ nhận trường Description, vẫn Edit Issues/editmeta, revision/updated, origin/session, idempotency và đọc lại sau ghi; không nhận sửa Summary/parent/type qua endpoint này. Tải tệp tiếp tục qua endpoint Jira attachment đã có; không thêm host hoặc kho lưu trữ ngoài.

- `npm run test`: logic/API kế thừa, renderer/codec ảnh, chữ ký định dạng/giới hạn file, CSP và scope Description riêng.
- `npm run test:images-ui`: Chromium bốn viewport 1440×900,390×844,320×683,844×390 với CSP Vercel. Frontend → session/router thật → mock Jira multipart/upload/PUT → readback; vị trí ảnh, cỡ, preview không ghi, Subtask/Story, mất phản hồi ảnh không trùng, tạo xong thiếu quyền ảnh/tiếp tục không tạo lại, mất phản hồi mô tả/đọc lại, paste ảnh, zoom/pan/pinch.
- Hồi quy editor/tạo công việc, sửa công việc cha, đính kèm và chi tiết ảnh: `test:editor-ui`, `test:parent-edit-ui`, `test:attachments-ui`, `test:detail-fixes`.
- Chưa kiểm chứng Jira công ty, Safari/iPhone vật lý, clipboard hệ điều hành thật, Redis thật hoặc deploy. Pinch/paste được mô phỏng trong Chromium. Sau deploy cần thử Photos iPhone, quyền Attach/Edit sau Create, Jira wiki/renderedFields và workflow công ty; kiểm tra lịch/logwork/OT tiếp tục như cũ.

Rollback deployment không xóa issue, ảnh hay các cập nhật đã ghi Jira. Không có migration. Ảnh/nội dung bản nháp chỉ tồn tại trong bộ nhớ; không dựa vào rollback để phục hồi bản nháp.

## Phiên bản kế tiếp — đề xuất chưa xây dựng

**V1.30.0 — Logwork từ mọi công việc:** mở rộng logwork từ chi tiết/tra cứu Jira tới các Subtask được phép log, không phụ thuộc danh sách filter logwork đang mở; chọn thời điểm, xem lại và ghi theo ràng buộc giờ hiện hành. Chờ Boss chọn.

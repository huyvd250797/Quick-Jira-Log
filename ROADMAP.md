# Trạng thái V1.12.0

## Đã triển khai V1.12.0

- Native form WorklogPRO: session/token động, đúng worklog, bảo toàn các thuộc tính khác.
- GET read-back theo endpoint native latest; không báo thành công chỉ dựa vào HTTP 200.
- Tạo OT cho từng task trong log đơn/Bulk; hỗ trợ ngày đủ 8h, batch trộn thường/OT và giờ xếp sớm nhất.
- Hoàn tác worklog mới khi đồng bộ OT thất bại; thông báo riêng nếu hoàn tác chưa hết.
- Core 403 khi sửa thông tin thường có thể chuyển sang native form, giữ OT thực.
- Cần đối soát Jira thật sau triển khai; chưa có xác minh quyền/session/form trên deployment thực tế.

## Phiên bản kế tiếp dự kiến — V1.12.1

- Củng cố adapter theo kết quả chạy thực tế trên Jira, đặc biệt token/phiên và thông báo form.
- Cân nhắc cấu hình khung OT/ngày nghỉ theo quy định thay vì khung cố định, sau khi thống nhất nhu cầu.

## V1.11.9 trước đây

- Tách sửa thông tin thường và OT; plugin 403 không chặn cập nhật ngày/giờ/thời lượng/mô tả khi không đổi OT.
- WorklogPRO Basic Auth trong phiên mã hóa và header no-check; giữ kiểm tra quyền thực tế.
- Chi tiết lỗi theo bước; giữ nguyên OT đang nháp, GET kiểm tra sau ghi và bảo toàn nháp khi lỗi.
- Cần cập nhật PWA và đăng nhập lại một lần sau deploy; đối chiếu quyền/kỳ duyệt/API trên Jira đang chạy để xác định các 403 còn lại.

## Đã hoàn thành V1.11.8

- Sửa OT thành thuộc tính WorklogPRO thật; không dùng nhãn mô tả để xác định OT.
- GET kiểm tra sau PUT, giữ thuộc tính khác và trạng thái thực khi checkbox chưa thay đổi; xử lý rõ trường hợp chưa xác nhận.
- Kiểm tra giả lập cả API và luồng trình duyệt qua handler thật. Cần đối soát checkbox/kỳ chấm công/quyền trên Jira đang triển khai sau deploy.

## Đã hoàn thành V1.11.7

- Màu chọn ngẫu nhiên giữa nhiều họ màu, không bắt buộc xanh lá, ưu tiên tách biệt.
- Bỏ gạch ngang chọn ngày; giữ nền tiêu đề và progress log.
- Lưu đăng nhập tùy chọn sau khi xác thực thành công, mã hóa trên thiết bị, điền lại khi chưa có phiên; bỏ chọn để xóa.
- Kiểm tra tự động PC/mobile; còn xác minh iPhone Safari vật lý, quota/key IndexedDB thực tế và Jira thật sau triển khai.

## Đã hoàn thành V1.11.6

- Màu dự án ngẫu nhiên theo mỗi lần xem, tông dịu, ít bão hòa.
- Bỏ ước tính thời gian còn lại trong tiến trình log.
- Giữ các chức năng và guard từ V1.11.5.

## Đã hoàn thành V1.11.5

- OT đánh dấu trong lịch sau khi log, lưu riêng trong comment worklog, không phụ thuộc custom field.
- Popup tiến trình giữa màn hình có backdrop.
- Sheet cao hết vùng xem, kéo xuống để đóng; date/time/input nằm gọn.
- Màu dự án không dùng xanh dương.
- Còn xác minh thực tế iOS picker, bàn phím, vùng an toàn và quyền sửa Jira sau triển khai.

## Đã hoàn thành V1.11.4

- Bảng màu dự án tươi sáng, ưu tiên màu lạnh và tách biệt bằng khoảng cách cảm nhận.
- Đồng bộ form chi tiết với Logwork: preset giờ nhanh, tăng/giảm, công tắc Overtime.
- Sửa field OT có preflight/hoàn tác và cảnh báo phạm vi issue.
- Còn xác minh quyền/field trên Jira thật và bàn phím/xoay trên iPhone thật sau triển khai.

## Đã hoàn thành V1.11.3

- Fullscreen thích ứng viewport và lưới tự giãn.
- OT vàng nhạt/nhãn góc, progress xanh đủ 8h, thời lượng không hiện 0m.
- Icon bật/tắt màu dự án có lưu lựa chọn.
- Kiểm tra tự động logic/API và giao diện. Còn xác minh trên iPhone/Jira thật sau triển khai.

Đã hoàn thành gói sửa trải nghiệm: lịch tuần chỉ còn lưới giờ, khóa nền khi mở sheet, animation trượt/fade cho sheet và fade cho cửa sổ. Không bổ sung nghiệp vụ Jira mới.

# Trạng thái V1.11.1

Đã bổ sung bottom sheet chi tiết mobile, bỏ tự bật bàn phím khi mở, tăng diện tích lịch và thêm chế độ toàn màn hình/ngang theo yêu cầu. Các roadmap mở rộng bên dưới giữ làm tham khảo lịch sử; phiên bản này không thay đổi nghiệp vụ Jira.

# Trạng thái V1.11.0

Đã triển khai gói Professional UI & Calendar First theo kế hoạch thống nhất: nền giao diện, các màn PC/mobile và kiểm tra hồi quy. Phiên bản này tập trung vào trải nghiệm, không thay đổi API Jira hoặc cơ chế tính giờ. Chưa kích hoạt các chức năng mở rộng của roadmap lịch sử bên dưới.

# Quick Jira Log Roadmap

- ✅ V1.0.6 – Desktop Alignment & Stable Columns Fix
- ✅ V1.1.0 – Focused Logwork UX
- ✅ V1.1.1 – Editable Log Date Hotfix
- ✅ V1.2.0 – Streamlined Navigation & Bulk Selection
- ✅ V1.3.0 – Overtime & Mobile Navigation Fix
- ✅ V1.3.1 – Worktime & Mobile Bottom Sheet Fix
- ✅ V1.3.2 – Vercel Node 24 Runtime Fix
- ✅ V1.3.3 – Vercel Hobby Function Consolidation: backend còn 01 Serverless Function.
- ✅ V1.3.4 – Mobile Bottom Sheet UX & Preview: kéo xuống để đóng sheet, preset không nhảy focus, bổ sung thông tin tác giả.
- ✅ **V1.4.0 – Zero-Friction UX & Visual System**: bỏ preview trước log để giảm request Jira, chuẩn hóa visual system, highlight Sub-task đang chọn, skeleton loading, sticky action trên mobile và hiển thị chính xác khung giờ sau khi log thành công.

- ✅ **V1.5.0 – One-Tap Daily Workflow**: Log & Next, preset 15m/30m/1h/2h/4h, nhớ ngày log trong phiên, refresh ngay sau log, keyboard shortcuts và giảm thao tác thừa.
- ✅ **V1.5.1 – Bulk Time Presets**: bổ sung preset **30m / 1h / 2h / 3h / 4h** cho từng Sub-task trong Log tất cả.
- ✅ **V1.5.2 – Unified Time Presets UI**: đồng nhất preset log đơn/Bulk về **30m / 1h / 2h / 3h / 4h** và cùng format/màu sắc ở Light/Dark mode.
- ✅ **V1.6.0 – Daily Capacity & Fast Logwork**: nâng bottom sheet Bulk trên mobile, sticky action sát đáy, hiển thị Đã log + Đang nhập / 8h và tối ưu pipeline Jira bằng kiểm tra/song song có giới hạn nhưng vẫn giữ rollback + chống overlap.
- ✅ **V1.6.1 – Sticky Capacity Header**: đưa tiến độ giờ thường lên header sticky của Bulk trên mobile/desktop và bổ sung tiến độ 8h tương tự cho Log 1 Sub-task.

- ✅ **V1.6.2 – Desktop Modal & Capacity Sync**: Log tất cả/Log 1 trên PC dùng modal lớn, header tiến độ fixed trong vùng cuộn; preset Log 1 cập nhật tiến độ 8h ngay khi bấm.

- ✅ **V1.6.3 – Jira Auth Reliability & CAPTCHA Guard**: chống double-auth khi sai mật khẩu, nhận diện CAPTCHA qua X-Seraph-LoginReason, mở Jira để xác minh trực tiếp, retry chủ động 1 lần và bảo vệ chống spam Login.

- ✅ **V1.6.4 – Late Worklog Friendly Warning**: cảnh báo bổ sung khi log từ N-2 trở về trước, giữ nguyên báo thành công, 10 câu vui luân phiên không lặp trong một vòng và áp dụng cho cả Log 1/Bulk.

- ✅ **V1.6.5 – Jira Auth Classification Fix**: phân biệt sai mật khẩu với CAPTCHA; `AUTHENTICATED_FAILED`/`AUTHENTICATION_FAILED` trên 401 không còn bị hiểu nhầm là CAPTCHA, chỉ chuyển sang xác minh khi Jira trả `AUTHENTICATION_DENIED`; bổ sung regression tests cho chuỗi sai password → CAPTCHA.

- ✅ **V1.7.0 – Fast Interaction & UX Polish**: Smart Bulk Time Allocation, thu gọn Description và compact Bulk UI trên mobile.
- ✅ **V1.7.1 – Instant Bulk Defaults & Manual Smart Allocation**: Log tất cả mở ngay với mặc định 1h/Sub-task; không còn tự phân bổ lúc mở. Day-audit chạy nền, người dùng chủ động bấm Tự động phân bổ/Phân bổ lại khi cần.

- ✅ **V1.7.2 – Bulk Log Layout Optimization**: compact Bulk cards, đưa Ngày logwork vào sticky header, bỏ mô tả dài và sắp xếp lại TimeSpent/preset/OT để xem được nhiều Sub-task hơn trên PC/mobile.

- ✅ **V1.7.3 – Motion, Safe Submit & Fast History**: animation nhẹ khi đóng/mở chức năng, popup xác nhận trước mọi thao tác Logwork và tối ưu Worklog History bằng direct-key path, JQL currentUser ưu tiên, batch metadata, concurrency có kiểm soát và client cache 20 giây.

- ✅ **V1.8.0 – Performance & Reliability Hardening**: Batch Jira metadata cho Bulk, cache ngắn Day Audit/History có invalidate sau mutation, request dedupe phía client, optional Redis/KV idempotency + login rate-limit cho Vercel multi-instance, Server-Timing diagnostics, Ctrl/Cmd+K và PWA update banner an toàn.

- ✅ **V1.9.0 – Time Stepper & Worklog Calendar**: bổ sung mũi tên tăng/giảm mỗi lần 30 phút ở Log đơn/Bulk/Sửa, icon hiện/ẩn mật khẩu, Worklog đã log cao hơn với bộ lọc gọn, chế độ Lịch tháng và chi tiết worklog theo ngày. Phạm vi theo yêu cầu Boss; xem CHANGELOG.md và README.md.

- ✅ **V1.10.0 – Weekly Calendar, Dashboard & Live Progress**: lịch Tuần/Tháng, block tỷ lệ thời lượng và sửa/xóa trực tiếp; tổng ngày /8h, tuần /40h; dashboard giờ còn thiếu; tiến trình server và ETA cho Log đơn/Bulk.

- ✅ **V1.10.1 – Fixed Calendar Controls**: cố định chọn Tuần/Tháng, điều hướng kỳ và tổng tuần ngoài vùng cuộn lịch, khắc phục bị che trên mobile.

- ✅ **V1.10.2 – Compact Calendar Navigation**: ẩn bộ lọc Danh sách khi xem lịch, chọn ngày gọn trong thanh cố định, tự tải tuần/tháng và tải lại bằng ↻.

- ✅ **V1.10.3 – Desktop Calendar Workspace**: lịch PC gần toàn màn hình, toolbar gọn, chọn ngày 144px, một vùng cuộn và giữ nguyên mobile.

- ✅ **V1.10.4 – Readable Mobile Duration**: tăng chiều rộng TimeSpent mobile Bulk, tách hàng preset để hiển thị rõ giờ/phút.

- ✅ **V1.10.5 – Desktop Worklog Details Popup**: popup xem/sửa/xóa worklog PC, giữ form bên dưới trên mobile.

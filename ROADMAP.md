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

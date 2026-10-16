# Kiểm tra V1.12.1

## Phạm vi

Kiểm thử với Node.js 24 và Jira/WorklogPRO giả lập dựa trên request/response đã cung cấp. Không sử dụng tài khoản hoặc ghi dữ liệu Jira thật. Không khẳng định HTTP 403 đã hết trên deployment thực tế chỉ từ kiểm thử giả lập.

## Hồi quy riêng lỗi GET 403

- Mock từ chối `GET WPCreateWorklogOnIssueWithWorkLogAction.jspa` bằng 403 giống đường sai ở V1.12.0.
- Yêu cầu đúng phải là GET issue page → GET !update với token vừa đọc → POST action lưu với token của form.
- Kiểm tra giữ JSESSIONID, cookie routing/XSRF, header AJAX, Origin/Referer; POST không retry.
- Các ca không có token, login wall HTTP 200, anonymous HTTP 403, XSRF GET bị chặn và redirect ra origin khác dừng trước write, không lộ token/cookie.
- Regression integration sửa OT và tạo OT qua handler thật dùng đúng ba bước mới.

## Kiểm thử tự động

Chạy `npm test` (không cần dependency runtime): scheduler/guard, đăng nhập/CAPTCHA, history, cache/idempotency, streaming progress, duration, calendar, chỉnh sửa và tạo OT.

- `correction-overtime-tests.js`: form POST + GET latest; bật/tắt OT, giữ thuộc tính khác và author, dọn marker cũ, đổi ngày/giờ/thời lượng/mô tả, ordinary edit không phụ thuộc plugin; fallback native sau core 403; người khác/overlap/nghỉ trưa bị chặn; field thiếu/trùng/sai kiểu/disabled; HTTP 200 không lưu, đọc lại 403 và mất phản hồi sau commit không báo thành công, không retry POST.
- `creation-ot-tests.js`: đủ 8h thường vẫn tạo thêm 2h OT; nhiều dòng OT không trùng; batch trộn thường/OT; giờ xếp sớm nhất; cuối tuần; còn cap 8h thường; khung tối không đủ bị chặn trước ghi; request thành công lặp cùng ID không tạo trùng; lỗi OT hoàn tác worklog mới; không xóa worklog cũ; hoàn tác bị từ chối báo resultUnknown và ID còn lại.
- `native-form-tests.js`: CSRF/cookie động, không gửi tới origin/action khác, đúng issue/worklog, đầy đủ trường, Unicode, giữ custom attribute/select, checkbox tắt phải bỏ field, format ngày giờ và không làm tròn worklog có giây lẻ.

`npm run test:ui` dùng Playwright/Chromium (cài công cụ kiểm thử riêng nếu cần: `npm install --no-save playwright`, `npx playwright install chromium`). Có thể đặt `QJL_CHROMIUM_PATH` để dùng Chromium đã cài. Bộ UI gồm PC/mobile, lịch tuần/fullscreen, sheet/animation/scroll lock, bounded picker, màu, lưu đăng nhập, sửa OT qua HTTP handler và native form fixture.

## Kết quả trong phiên phát triển

- `npm test`: PASS, toàn bộ bộ kiểm thử API/logic và các ca native form mới.
- V1.12.1 chạy lại các bộ UI liên quan: native-overtime.cjs và creation-overtime.cjs trên Chromium headless. Bộ UI giao diện tổng quát đã qua ở V1.12.0, không chạy lại toàn bộ cho bản vá adapter này.
- `creation-overtime.cjs`: kiểm tra UI tạo OT khi ngày đủ 8h ở 315×683, 390×844, 844×390, 1440×900; payload đơn/Bulk giữ đúng OT và giờ xếp, input nằm trong khung.
- Không bao gồm Jira thật, Vercel thật hoặc Safari/iPhone vật lý.

## Đối soát sau deploy

1. Cập nhật app/PWA để đầu trang/footer là V1.12.1; đăng nhập lại nếu phiên Jira hết hạn.
2. Worklog có sẵn: bật OT → lưu → mở trên Jira xác nhận Over Time?; tắt rồi xác nhận lại. Kiểm tra mô tả, giờ và thuộc tính khác giữ nguyên.
3. Sửa đồng thời ngày/giờ/thời lượng/mô tả và OT; đối chiếu từng trường. Sửa thông tin thường khi giữ nguyên OT. Không sửa worklog của người khác.
4. Ngày đủ 8h: log task mới 2h với Overtime; kiểm tra 17:30–19:30 nếu khoảng đó trống, tổng thực tế 10h; 8h thường vẫn không tăng.
5. Bulk gồm nhiều dòng OT và batch trộn thường/OT ở ngày còn chỗ: kiểm tra các worklog không trùng và đúng checkbox.
6. Thử lỗi/kỳ bị khóa bằng môi trường kiểm thử: không có thông báo thành công giả; nếu chưa xác nhận/hoàn tác chưa hết, tải lại Jira trước khi log lại.
7. Trên iPhone thật: checkbox không bật bàn phím; chỉ bấm ô giờ mới mở picker; input không tràn, sheet kéo xuống đóng, fullscreen và orientation theo khả năng Safari/iOS.

Luồng mở form dùng !update theo tài nguyên plugin chính thức; GET action lưu bị chặn đã có kiểm thử hồi quy. Khả năng lấy token/phiên trên Jira đang cài cần đối soát sau deploy. Token không được hard-code. Thay đổi phiên bản plugin có thể cần adapter mới.

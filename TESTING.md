# Kiểm thử V1.14.3 — Swap motion

- `npm test`: PASS toàn bộ logic/API, gồm geometry motion mới; không thay backend.
- `tests/browser/swap-motion.cjs`: PASS ở 1440×1100, 390×1000 và 320×900. Kiểm tra frame đầu/giữa/cuối, đường cong không thẳng đứng, điểm hạ khớp DOM thật trong sai số 2px.
- Kiểm tra clone giữ màu OT và góc xoay nhãn OT gốc, đường bay khác nhau giữa các swap, hạ xong dọn layer và opacity; không có request ghi Jira khi chạy animation.
- Kéo liên tiếp, Escape, resize, render lại, đóng lịch, dark theme/fullscreen và Reduce Motion: không để lại clone hoặc block ẩn.
- Hồi quy: Calendar Swap PC/touch, Calendar Interactions, responsive layout và motion/scroll lock; ghi nhận kết quả chạy trong bản phát hành này.
- Không chạy lại toàn bộ chuỗi `npm run test:ui` ở bản này: thay đổi chỉ phía hiển thị, đã chạy các bộ UI bị ảnh hưởng nêu trên. Bộ đầy đủ vẫn có trong source.
- Node syntax checks PASS. Chưa đo FPS trên iPhone/Safari vật lý hoặc kiểm chứng Jira thật; chuyển động dùng Web Animations/transform trên clone để giảm công việc layout mỗi frame.

# Kiểm thử V1.14.2 — Highlight & Swap

## Logic và API mới

- `npm test`: PASS toàn bộ logic/API, gồm calendar-drafts, calendar-edit và calendar-swap.
- Drop planner: swap snap đến giờ bắt đầu block đích, hai thời lượng khác nhau, giữ chính xác giây; chặn block thứ ba, nhiều block cùng vùng thả và giờ nghỉ.
- Server swap thật qua HTTP fixture: đổi khác issue/ngày, kiểm tra author/stale/window/final overlap, không ghi trước validation, không có trùng thời gian ngay cả ở bước trung gian.
- API xác minh đủ vị trí cuối, giữ description/native OT/seconds; replay cùng mã hoặc trạng thái đã đúng không ghi lại.
- Lỗi bước giữa: phục hồi gốc; mất response sau commit bước trung gian: GET xác định rồi phục hồi, không replay mù; lỗi phục hồi: RESULT_UNKNOWN và vị trí thật đọc được.
- Không có khoảng trống trung gian trong ngày liên quan: từ chối trước ghi. Có kiểm thử vòng ba worklog và giữ giây lẻ.
- Native WorklogPRO fallback (core 403): cả ba bước swap qua native form, giữ OT và thuộc tính tùy chỉnh, duration 3661 giây.
- API mới chỉ nhận POST đã đăng nhập, same-origin, request ID hợp lệ và 2–12 ID duy nhất. Không tạo/xóa worklog.

## Giao diện

- `npm run test:ui`: PASS toàn bộ UI regression và Calendar Swap mới.

- `calendar-swap.cjs`: highlight một vùng trống / hai vùng swap, màu lỗi khi block thứ ba cản; Escape dọn vùng highlight và không mở form nhầm.
- Touch thực qua CDP ở 390×1000, 320×900, ngang 844×440 fullscreen; PC 1440×1100. Có cuộn trong khi giữ/kéo trên màn hình ngang.
- Kéo chưa gọi API; xác nhận mới gửi batch swap, hủy giữ bản nháp, thành công toast/icon ẩn; lỗi server giữ hai draft.
- Rà ảnh nội bộ: viền/nhãn giờ nằm đúng lưới, tooltip tránh vùng đích và không tràn viewport.
- Hồi quy luồng tạo từ khoảng trống, kéo bình thường, lưu tạm/xác nhận, sửa/xóa, native OT, Bulk, thống kê, fullscreen, palette và remembered login.
- Jira/WorklogPRO giả lập; chưa đăng nhập Jira thật hoặc kiểm tra iPhone/Safari vật lý. Phục hồi nhóm là best effort, không phải transaction Jira; function bị ngắt cứng có thể để lại vị trí trung gian cần kiểm tra.

# Kiểm thử V1.14.1

## V1.14.1 — Lưu tạm và xác nhận lưu lịch

- `npm test`: PASS toàn bộ logic/API; thêm `calendar-drafts-tests.js` kiểm tra projection không sửa bản gốc, giữ giây/OT/mô tả, thứ tự giải phóng ô, trùng và vòng hoán đổi.
- `npm run test:ui`: PASS toàn bộ UI regression hiện có và Calendar Interactions. Giữ log đơn/Bulk, native OT, sửa/xóa, fullscreen, Tổng hợp, remembered login.
- Luồng mới: icon lưu mặc định ẩn; kéo chỉ đổi preview, không PATCH; bấm icon và Quay lại không ghi; xác nhận mới PATCH. Đưa về gốc tự bỏ draft, lưu xong toast/icon ẩn.
- Mobile CDP touch thực: hold/rung/drag; chạm ngoài thoát edit nhưng giữ draft; short tap và scroll trước hold hoạt động như cũ.
- Refresh/fullscreen giữ preview; icon nằm gọn trên PC 1440×1100 và touch mobile 390×1000, 320×900. Dialog review dùng native top layer; nút ở mobile hẹp không tràn/chéo.
- Server 403 giữ draft; đóng lịch có lựa chọn; bỏ thay đổi trả về dữ liệu thật. Mất phản hồi sau commit được GET đối chiếu trước retry, không PATCH lặp khi vị trí đã đúng.
- Nhiều block: giải phóng ô gốc trước khi đưa block khác vào, lỗi thứ hai giữ chỉ draft còn lại; retry không ghi lại lịch thành công. Remote timestamp thay đổi được bắt trước PATCH.
- Build không cần thiết với app HTML/Node hiện tại; Node syntax checks PASS. Không đổi cấu hình hoặc dependency runtime.
- Jira/WorklogPRO giả lập; chưa xác minh tài khoản Jira thật hoặc iPhone/Safari vật lý. Bản nháp chỉ trong phiên, không bảo đảm tồn tại qua kill/reload/đăng xuất.

# Kiểm thử V1.14.0

## V1.14.0 — Luồng tạo và kéo thả từ lịch

- `npm test`: **PASS** toàn bộ logic/API và các hồi quy trước, thêm `tests/calendar-edit-tests.js`.
- `npm run test:ui`: **PASS** toàn bộ UI regression, gồm luồng Tổng hợp và Calendar Interactions mới.
- Tạo tại 15:00, đọc lại đúng started/duration; idempotency tạo; trùng không auto-shift; giờ nghỉ/lunch crossing/giờ sai không ghi; OT native; readback mismatch hoàn tác worklog mới.
- Move-only: 15:00 → 08:00, đổi ngày, giữ 3661 giây và mô tả/marker, không thay OT/custom attribute; từ chối stale expected-start/seconds, người khác, trùng/ngoài khung.
- Native WorklogPRO fallback khi core 403; giữ thuộc tính; response mất sau commit không retry ghi. Fixture mới hỗ trợ số phút lẻ để kiểm tra giữ giây.
- `tests/browser/calendar-interactions.cjs`: picker → form cũ → payload startTime → lịch; input nằm trong khung và không autofocus bàn phím. Desktop 1440×1100; touch mobile 390×1000, 320×900 qua CDP touchStart/move/end.
- Kiểm tra kéo 15:00–16:00 sang 08:00–09:00, đổi ngày PC, mobile hold/jiggle/drag/thoát, chạm nhanh mở chi tiết, cuộn trước long-press không bật edit; trùng/403 không đổi block lạc quan.
- Dùng ảnh UI nội bộ để rà form, nút đóng/nút lưu và feedback không làm xê dịch lưới.
- Chưa đăng nhập Jira thật hoặc kiểm tra Safari/iPhone vật lý. Cần đối chiếu một worklog thử nghiệm được phép sửa sau deploy.

## Bản vá tỷ trọng dự án V1.13.2

- `npm test`: PASS toàn bộ logic/API, gồm Sub-task Type native custom field và Overtime.
- `tests/browser/summary.cjs`: kiểm tra nhãn % tổng giờ và độ dài thanh dùng tổng giờ theo bộ lọc; tổng thời lượng bên phải còn đủ.
- Ví dụ ảnh người dùng: 31h30 + 8h30 = 40h; nhãn 78,75% và 21,25%; chiều dài thanh tương ứng.
- Fixture có regular và OT: 40h/42h → 95,24%, 2h/42h → 4,76%; lọc một dự án → 100%.
- UI PASS ở 1440×1000, 1024×700, 390×844, 320×683, 844×390; light/dark; giữ drill-down, sửa/xóa, kỳ và bộ lọc.
- Không thay đổi API ghi Jira; chưa kiểm tra trên Jira thật trong phiên này.

## Hồi quy bản vá Sub-task Type

- Nguyên nhân V1.13.0: nhầm `issuetype` với custom field “Sub-task Type”. Fixture cũ cũng dùng Issue Type khác nhau, nên chưa phát hiện khác biệt này.
- Fixture mới giữ **một Issue Type Sub-task** cho tất cả issue, đặt giá trị custom field riêng: Testing/Supporting/Developing.
- Hai worklog Testing tổng 2h, một worklog Developing 6h: phân nhóm/tỷ trọng phải theo giờ, không theo số task.
- `subtask-type-tests.js`: discovery GET chỉ đọc; đúng tên/custom ID, khoảng trắng/gạch ngang, thiếu/trùng field, 403/401, cấu hình đúng/sai, cache theo user, option/null/field missing/sai cấu trúc. Không fallback Issue Type.
- `summary-tests.js`: handler thật nhận field list và issue custom field, yêu cầu field trong search metadata, nhóm hai giá trị dù issuetype giống nhau. Discovery 403 phải giữ tổng giờ và nhóm Chưa xác định.
- `browser/summary.cjs`: Supporting/Testing khác nhau, nhãn/tỷ trọng theo giờ, field bị chặn hiển thị thông báo + Chưa xác định; null hiển thị Chưa phân loại; drill-down/sửa/xóa vẫn hoạt động.
- `npm test`: PASS toàn bộ logic/API bao gồm bản vá.
- Chạy lại UI Tổng hợp ở 1440×1000, 1024×700, 390×844, 320×683, 844×390; **PASS** cả light/dark và các ca null/không đọc được field.
- Chưa đăng nhập Jira thật; cần đối chiếu field ID và một tuần thực tế sau deploy.

## Môi trường và kết quả

- Node.js 24.19.0; Chromium headless, Playwright. Jira/WorklogPRO được giả lập qua API và form fixture; không dùng tài khoản/ghi dữ liệu Jira thật.
- `npm test`: PASS toàn bộ logic/API, gồm bộ mới `tests/summary-tests.js` và hồi quy native form V1.12.1.
- V1.13.0: `npm run test:ui` đã PASS toàn bộ bộ giao diện, gồm lịch, correction, duration, workflow, mobile calendar, fullscreen, motion/scroll lock, màu dự án, parity, input bounds, lưu đăng nhập, OT native, tạo OT và màn hình Tổng hợp.
- V1.13.1: `tests/browser/summary.cjs` PASS 5 kích thước ở cả light/dark; `tests/browser/native-overtime.cjs` PASS PC/mobile. Rà ảnh xác nhận biểu đồ hiện Supporting/Testing thay vì Sub-task.
- Chưa xác minh trên Jira/Vercel thật hoặc Safari/iPhone vật lý.

## Phạm vi kiểm thử mới

### Logic và API

- Cộng giây của worklog trong kỳ; khử trùng; lọc author và ngày Việt Nam; không dùng tổng timespent của task.
- Tách regular/OT/unknown theo checkbox đã xác nhận; marker mô tả không quyết định OT; giá trị chưa biết không biến thành false.
- Phân bổ theo project và custom field Sub-task Type của sub-task; task thường/thiếu metadata có nhóm riêng; tổng các nhóm bằng tổng giờ.
- Bộ lọc dự án; mục tiêu kỳ cá nhân T2–T6; ngày tương lai không bị nhắc thiếu, cuối tuần và giờ thường dư không bù ngày khác.
- Biên tuần/tháng/năm, tháng nhuận 29 ngày, chia khoảng không bỏ sót ngày.
- Jira giảm page size từ 1000 xuống 1: vẫn đọc đủ worklog; metadata nhiều trang cũng được đọc tiếp.
- Summary trên 500 task; giới hạn discovery được báo rõ; lỗi WorklogPRO 403 để trạng thái chưa xác nhận.

### Giao diện Tổng hợp

`tests/browser/summary.cjs` chạy ở 1440×1000, 1024×700, 390×844, 320×683, 844×390:

- Hai theme; kiểm tra control nằm trong khung, không tràn ngang; KPI, project và Sub-task Type.
- Drill-down theo loại → mở editor; focus nút đóng thay vì textbox; background inert khi editor mở.
- Lưu chỉnh sửa rồi tổng được đọc lại; xóa rồi nhóm biến mất/tổng giảm; cache mất hiệu lực sau mutation.
- Lọc dự án không đổi mục tiêu cá nhân; OT chưa biết, lỗi API, dữ liệu một phần và retry.
- Chuyển tuần/tháng, đủ ngày 31, lùi tháng, chuyển kỳ nhanh không để phản hồi cũ ghi đè.

## Cách chạy

```sh
npm test
```

Bộ UI cần công cụ phát triển Playwright/Chromium, không phải dependency deploy:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:ui
```

Có thể dùng Chromium đã có qua `QJL_CHROMIUM_PATH=/absolute/path/to/chromium`. Đặt `QJL_QA_OUTPUT=/absolute/path` nếu cần ảnh kiểm thử nội bộ. Source ZIP không chứa browser binary/node_modules hoặc dữ liệu tài khoản.

## Đối chiếu sau deploy

1. Badge/footer/PWA là V1.13.2; nút Kiểm tra được thay bằng Tổng hợp.
2. Chọn tuần có cả giờ thường và OT, so sánh tổng và phân bổ với Jira. Chọn tháng 31 ngày.
3. Chọn nhiều task đều Type: Sub-task nhưng có Sub-task Type khác nhau như Testing, Supporting, Developing. Biểu đồ phải tách đúng các giá trị riêng và cộng thời lượng worklog trong kỳ, không gộp Sub-task/không đếm task.
4. Bấm nhóm, mở worklog để sửa thời lượng/ngày hoặc OT, kiểm tra tổng được cập nhật. Kiểm tra xóa trên một worklog thử nghiệm được phép xóa.
5. Với quyền/plugin thiếu, phải thấy tạm tính/chưa xác nhận, không được xuất hiện thành 0h OT đã xác nhận.
6. Xác nhận các guard, log đơn/Bulk và checkbox Over Time? native vẫn hoạt động như V1.12.1.

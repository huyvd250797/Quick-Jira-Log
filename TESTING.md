# Kiểm thử V1.13.2

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

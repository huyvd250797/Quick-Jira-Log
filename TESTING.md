# Kiểm thử V1.13.0

## Môi trường và kết quả

- Node.js 24.19.0; Chromium headless, Playwright. Jira/WorklogPRO được giả lập qua API và form fixture; không dùng tài khoản/ghi dữ liệu Jira thật.
- `npm test`: PASS toàn bộ logic/API, gồm bộ mới `tests/summary-tests.js` và hồi quy native form V1.12.1.
- `npm run test:ui`: PASS toàn bộ bộ giao diện, gồm lịch, correction, duration, workflow, mobile calendar, fullscreen, motion/scroll lock, màu dự án, parity, input bounds, lưu đăng nhập, OT native, tạo OT và màn hình Tổng hợp.
- Sau rà ảnh, sửa nền control light/dark, kích thước mũi tên select và line-height để không cắt chữ. Chạy lại `tests/browser/summary.cjs`: PASS.
- Chưa xác minh trên Jira/Vercel thật hoặc Safari/iPhone vật lý.

## Phạm vi kiểm thử mới

### Logic và API

- Cộng giây của worklog trong kỳ; khử trùng; lọc author và ngày Việt Nam; không dùng tổng timespent của task.
- Tách regular/OT/unknown theo checkbox đã xác nhận; marker mô tả không quyết định OT; giá trị chưa biết không biến thành false.
- Phân bổ theo project và Issue Type ID của sub-task; task thường/thiếu metadata có nhóm riêng; tổng các nhóm bằng tổng giờ.
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

1. Badge/footer/PWA là V1.13.0; nút Kiểm tra được thay bằng Tổng hợp.
2. Chọn tuần có cả giờ thường và OT, so sánh tổng và phân bổ với Jira. Chọn tháng 31 ngày.
3. Kiểm tra tên loại: biểu đồ dùng Issue Type của sub-task. Nếu Jira chỉ có một Issue Type Sub-task thì chỉ có một nhóm; không tự tách từ mô tả.
4. Bấm nhóm, mở worklog để sửa thời lượng/ngày hoặc OT, kiểm tra tổng được cập nhật. Kiểm tra xóa trên một worklog thử nghiệm được phép xóa.
5. Với quyền/plugin thiếu, phải thấy tạm tính/chưa xác nhận, không được xuất hiện thành 0h OT đã xác nhận.
6. Xác nhận các guard, log đơn/Bulk và checkbox Over Time? native vẫn hoạt động như V1.12.1.

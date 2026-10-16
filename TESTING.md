# Kiểm tra V1.11.5

## Kết quả và phạm vi

Kiểm tra bằng Node.js, Chromium headless và Jira giả lập; không dùng tài khoản Jira thật. Chưa thử trên iPhone Safari vật lý, bàn phím iOS hoặc deploy Vercel thật.

- `npm test`: logic/API, xác thực, lịch sử, author filtering, guard trùng giờ/khung giờ, cache/idempotency, đơn/Bulk, streaming tiến độ và mất phản hồi.
- `creation-ot-tests.js`: log đơn và Bulk thành công khi Jira không có field Overtime; không gọi `/field`/`editmeta`/issue PUT. Client cũ gửi OT lúc tạo bị báo 400 trước khi ghi Jira.
- `correction-overtime-tests.js`: bật/tắt nhãn riêng worklog, lưu cùng comment bằng một PUT; worklog khác cùng issue không đổi; lưu lặp không trùng nhãn, legacy edit giữ nhãn; đọc string/ADF; lỗi quyền/overlap/nghỉ trưa vẫn chặn; lỗi cập nhật không báo thành công.
- `calendar-style-tests.js`: đọc lại nhãn từ history, không gọi field issue, không suy OT chỉ từ 17:30/cuối tuần, bỏ worklog 0 phút; thời lượng gọn. 120 màu khác mã, không chứa dải xanh dương/vàng; ưu tiên mint/lilac/rose, 8 màu đầu có khoảng cách OKLab > 0.09.

## Giao diện

Bộ hồi quy chạy ở các cỡ PC/mobile, gồm 1920×1080, 1440×900, 1024×600, 900×720, 844×390, 667×375, 568×320, 430×1200, 390×844 và 315×683; kiểm tra Sáng/Tối và Reduce Motion khi phù hợp.

| Bộ kiểm tra | Phạm vi |
|---|---|
| `layout.cjs` | Toolbar vừa màn, sticky, một vùng cuộn, loading/error/partial, Tuần/Tháng/Danh sách |
| `correction.cjs` | Popup PC/sheet mobile, focus trap, không tự nhập, lưu/xóa/lỗi, giữ nháp khi đổi kích thước |
| `duration.cjs` | Thời lượng/preset/tăng giảm không bị cắt |
| `workflow.cjs` | Dashboard, tỷ lệ block, sửa/xóa, log đơn/Bulk với HTTP streaming thật trên fixture, mất phản hồi |
| `mobile-calendar.cjs` | Compact/fullscreen, xoay màn hình, sheet, native/unsupported/denied API |
| `native-fullscreen.cjs` | Fullscreen API Chromium thật và sự kiện thoát |
| `motion-lock.cjs` | Week-only grid, khóa nền/touch/wheel, hiệu ứng vào/ra, đóng/mở nhanh, Reduce Motion |
| `calendar-colors.cjs` | Fullscreen giãn hết vùng trống, tỷ lệ thời lượng, OT vàng cố định/ribbon, progress xanh, lưu màu |
| `correction-parity.cjs` | Preset nhanh/active, không tự focus bàn phím, OT payload/giữ nháp/lỗi/đổi hướng, migration màu |
| `mobile-refinements.cjs` | 315×683, 390×844, 430×932, 844×390, 1440×900: sheet đơn/Bulk full height, vuốt ngắn snap, vuốt dài đóng qua grip/tiêu đề, kéo sheet chi tiết; tất cả input nằm trong label/khung; modal progress đúng tâm, backdrop tối, không đóng lúc active, đóng sau lỗi |

Ảnh QA chỉ dùng kiểm tra nội bộ, không kèm source. Kiểm tra focus trên Chromium không thay thế kiểm tra bàn phím/native picker trên iOS.

## Chạy kiểm tra

Yêu cầu Node.js 24.x:

```bash
npm test
```

Playwright chỉ dùng phát triển, không phải dependency để deploy:

```bash
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:ui
```

Có thể dùng Chromium sẵn qua `QJL_CHROMIUM_PATH`. `QJL_QA_OUTPUT` là thư mục ảnh QA tùy chọn; mặc định không tạo ảnh. Fixture dùng localhost 4174, 4176, 4179, 4182, 4184, 4186, 4188, 4190, 4192, 4194 và tự đóng.

## Kiểm tra sau triển khai

1. Đầu trang/footer V1.11.5; cập nhật PWA hoặc reload app cũ. PWA cho phép xoay máy, nhưng hệ điều hành/trình duyệt quyết định fullscreen và khóa hướng.
2. Mở log đơn và Log tất cả: sheet tận dụng hết vùng xem, không có checkbox OT; kéo grip/tiêu đề xuống để đóng, thử vuốt ngắn, vuốt dài, thao tác trên date và nút phân bổ.
3. Thử picker Ngày/Giờ bắt đầu trong chi tiết worklog bằng ngôn ngữ máy đang dùng. Kiểm tra không tràn viền khi xoay, mở/đóng bàn phím, cỡ chữ trợ năng và safe area.
4. Log thử một worklog, kiểm tra popup tiến trình ở giữa có nền tối; lỗi/mất mạng phải giữ trạng thái để đối soát, không tự báo thành công hay retry POST.
5. Vào lịch → sửa → check Overtime → lưu. Tải lại app và kiểm tra trên thiết bị khác; nhãn ở cuối mô tả trên Jira, màu OT trong app. Tắt/lưu lại, đảm bảo worklog khác cùng issue không đổi.
6. Kiểm tra phân loại OT này không được hiểu nhầm là field OT native của Jira/plugin chấm công. Nếu tự sửa/xóa nhãn trong Jira, app sẽ đọc theo nội dung thực tế.
7. Giữ giới hạn tạo giờ thường 8h/ngày và quy tắc tránh overlap. Check OT không tự dời giờ hoặc tăng tổng đã log; muốn đổi giờ thì sửa Giờ bắt đầu.

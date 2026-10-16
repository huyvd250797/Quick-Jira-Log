# Kiểm tra V1.11.9

## Kết quả và phạm vi

Kiểm tra bằng Node.js, Chromium headless và Jira giả lập; không dùng tài khoản Jira thật. Chưa thử trên iPhone Safari vật lý, bàn phím iOS hoặc deploy Vercel thật.

- `npm test`: logic/API, xác thực, lịch sử, author filtering, guard trùng giờ/khung giờ, cache/idempotency, đơn/Bulk, streaming tiến độ và mất phản hồi.
- `creation-ot-tests.js`: log đơn và Bulk thành công khi Jira không có field Overtime; không gọi `/field`/`editmeta`/issue PUT. Client cũ gửi OT lúc tạo bị báo 400 trước khi ghi Jira.
- `correction-overtime-tests.js`: WorklogPRO API fixture; tự tìm BOOL/Over Time?, bật/tắt, một PUT đúng Worklog ID + GET kiểm tra lại, giữ thuộc tính khác/author/estimate, history đọc native trái với marker cũ. Auth/overlap/nghỉ trưa vẫn chặn trước khi ghi; metadata 403/404, field thiếu/trùng/tắt/sai kiểu, override ID; PUT 403; HTTP 200 nhưng OT không đổi, GET sau ghi bị từ chối, mất kết nối sau commit đều không báo thành công và không tự retry PUT. Đọc OT lịch có giới hạn đồng thời và thời gian; khi API chậm, các worklog chưa đọc được giữ trạng thái unknown thay vì treo toàn bộ lịch.
- `calendar-style-tests.js`: native OT thay cho marker, không gọi field issue/không suy từ giờ/cuối tuần; bỏ 0 phút. Giữ kiểm tra 52 màu/13 họ, không ép xanh lá.

## Kiểm tra mới V1.11.9

- `correction-overtime-tests.js`: dưới `/attr` HTTP 403, đổi đồng thời ngày/giờ/thời lượng/mô tả qua Jira core thành công, không có request plugin, giữ thuộc tính OT. Legacy/no-touch checkbox giữ native OT; core 403 trả đúng stage/provider/thông báo, không cấp quyền giả. Core PUT HTTP 200 nhưng GET không khớp trả resultUnknown.
- HTTP login handler thật: đăng nhập bằng cookie Jira, cookie app mã hóa giữ Basic riêng WorklogPRO; JSON không chứa password. Fixture từ chối cookie-only nhưng chấp nhận Authorization Basic; phiên cũ báo reauthenticate, phiên mới cập nhật OT được. PUT có X-Atlassian-Token: no-check. Mapping ID cho phép bỏ phụ thuộc vào `/attr` bị chặn; quyền worklog vẫn không bỏ qua.
- OT-only/description-only ở lịch cũ ngoài khung giờ không bị revalidation không cần thiết và giữ nguyên giây bắt đầu. Khi đổi lịch còn guard overlap/nghỉ trưa/khung giờ; không sửa worklog của người khác. Diagnostics không trả HTML/mật khẩu/cookie/token.
- `native-overtime.cjs`: PC 1440×900, mobile 390×844; trình duyệt → HTTP handler thật → Jira/WorklogPRO fixture. Đổi ngày/giờ/thời lượng/mô tả dưới plugin 403 vẫn lưu được và giữ OT; request OT thực sự vẫn thất bại đúng lỗi và không lưu một phần. Mở Chi tiết lỗi có stage và HTTP. Giữ nguyên Overtime bỏ ý định đổi OT, bảo toàn bản nháp; lưu tiếp qua core giữ native OT vừa có trên Jira. Còn các kiểm tra on/off, dọn marker, GET xác minh không khớp, không tự đóng/mất nháp và từ chối success không có xác nhận.

## Kiểm tra từ V1.11.8

- `native-overtime.cjs`: Chromium 390×844 và 1440×900 → HTTP API/handler thật → fixture WorklogPRO. Check rồi lưu bật đúng thuộc tính, mở lại vẫn checked; uncheck xóa OT, dọn marker mô tả, giữ thuộc tính khác. GET xác minh OT không đổi giữ form/nháp/lỗi và refresh lịch nền; quyền bị từ chối không ghi. Khi unknown mà chưa chạm công tắc, save giữ native OT vừa đọc; response thiếu `overtimeVerified` bị từ chối ở UI.
- Chưa có tài khoản Jira thật và không ghi lên task.ascvn.com.vn. Hợp đồng endpoint/body bám tài liệu nhà cung cấp được dẫn ở README. Fixture không chứng minh quyền/kỳ khóa hoặc khác biệt phiên bản WorklogPRO trên Jira thực tế; cần đối soát sau deploy.

## Kiểm tra mới V1.11.7

- `remember-login.cjs`: 390×844 và 1440×900; mặc định không lưu, auth lỗi/chưa có phản hồi không lưu, auth thành công mới ghi; IndexedDB có ciphertext/IV và CryptoKey không export, không có mật khẩu rõ trong localStorage/sessionStorage.
- Đăng xuất, reload khi chưa có phiên và API trả 401 đều điền lại hai trường, mật khẩu được che; không có POST login tự động. Lần đăng nhập sai không thay bản lưu trước. Bỏ chọn xóa record, reload trống; không chọn vẫn đăng nhập bình thường.
- Đọc bản lưu chậm không ghi đè form đã nhập; lệnh bỏ lưu chạy sau một lần save đang chờ vẫn xóa được record. Ciphertext bị sửa sẽ bị từ chối và record hỏng được xóa để nhập lại. IndexedDB không hỗ trợ thì vô hiệu ô lưu, manual login vẫn thành công.
- `random-palette.cjs`: không còn box-shadow dưới tiêu đề ngày chọn; nền chọn khác ngày thường, progress log vẫn có. Unit test kiểm tra tất cả họ màu có thể xuất hiện và bảng nhiều dự án không bắt buộc có xanh lá.

## Kiểm tra từ V1.11.6

- `random-palette.cjs`: 390×844, 844×390, 1440×1000; cùng dự án cùng nền, đổi theme không đổi bảng màu; mở lại/làm mới/reload cấp hue mới cho từng dự án; màu OT cố định.
- Kiểm tra tiến trình không còn DOM ETA, không còn `expected`/`samples`, không có chuỗi ước tính/thời gian còn lại ở trạng thái active hoặc lỗi; giữ phần trăm thật và thời gian đã chạy.
- `workflow.cjs` giữ kiểm tra HTTP streaming đơn/Bulk và kết quả gián đoạn, đổi kỳ vọng ETA thành không có ETA.

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

Có thể dùng Chromium sẵn qua `QJL_CHROMIUM_PATH`. `QJL_QA_OUTPUT` là thư mục ảnh QA tùy chọn; mặc định không tạo ảnh. Fixture dùng localhost 4174, 4176, 4179, 4182, 4184, 4186, 4188, 4190, 4192, 4194, 4196, 4198, 4200 và tự đóng.

## Kiểm tra sau triển khai

1. Đầu trang/footer V1.11.9; cập nhật PWA hoặc reload app cũ. PWA cho phép xoay máy, nhưng hệ điều hành/trình duyệt quyết định fullscreen và khóa hướng.
2. Mở log đơn và Log tất cả: sheet tận dụng hết vùng xem, không có checkbox OT; kéo grip/tiêu đề xuống để đóng, thử vuốt ngắn, vuốt dài, thao tác trên date và nút phân bổ.
3. Thử picker Ngày/Giờ bắt đầu trong chi tiết worklog bằng ngôn ngữ máy đang dùng. Kiểm tra không tràn viền khi xoay, mở/đóng bàn phím, cỡ chữ trợ năng và safe area.
4. Log thử một worklog, kiểm tra popup tiến trình ở giữa có nền tối; lỗi/mất mạng phải giữ trạng thái để đối soát, không tự báo thành công hay retry POST.
5. Vào lịch → sửa → check Overtime → lưu. Mở lại worklog trên Jira: ô Over Time? phải được chọn; mở lại app/thiết bị khác phải thấy màu OT. Mô tả không thêm nhãn của app. Tắt/lưu lại, đảm bảo worklog khác cùng issue không đổi.
6. Đổi checkbox trực tiếp trên WorklogPRO/Jira rồi refresh lịch trong app: trạng thái phải trùng. Với worklog chỉ có marker từ bản cũ, xác nhận không tự tô vàng; chọn OT/lưu rồi kiểm tra checkbox và marker được dọn. Thử kỳ khóa/quyền bị từ chối: form giữ lỗi, không báo thành công.
7. Giữ giới hạn tạo giờ thường 8h/ngày và quy tắc tránh overlap. Check OT không tự dời giờ hoặc tăng tổng đã log; muốn đổi giờ thì sửa Giờ bắt đầu.

8. Bật Lưu đăng nhập, đăng nhập thật rồi đăng xuất/để hết phiên và mở lại: cả hai trường được điền, vẫn cần bấm Đăng nhập. Bỏ chọn, tải lại để xác nhận không còn bản lưu của app; kiểm tra riêng trình quản lý mật khẩu của trình duyệt nếu vẫn autofill.

9. Sau deploy V1.11.9, đăng xuất/đăng nhập lại để có Basic cho WorklogPRO. Sửa một worklog: ngày, giờ, thời lượng, mô tả khi giữ công tắc OT, rồi kiểm tra Jira. Thử riêng đổi OT và đối chiếu checkbox trên Jira. Nếu lỗi, mở Chi tiết lỗi: phân biệt đúng bước/API, không suy đoán chỉ dựa vào 403.

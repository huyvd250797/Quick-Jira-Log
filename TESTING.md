# Kiểm tra V1.11.1

## Kết quả và phạm vi

- `npm test`: các bộ kiểm tra logic/API hiện có đạt, gồm xác thực, lịch sử, cache/idempotency, phân bổ giờ/OT, mốc tuần, tiến trình HTTP streaming và xử lý mất phản hồi.
- Kiểm tra giao diện bằng Chromium headless và API Jira giả lập. Không dùng tài khoản Jira thật.
- Giữ các bộ kiểm tra bố cục, thời lượng và nghiệp vụ trước; cập nhật kỳ vọng mobile thành dialog dạng bottom sheet.
- Bộ mới `mobile-calendar.cjs` chạy ở 315×683, 390×844, 430×932, 844×390, 667×375 và 1440×900; rà cả Sáng/Tối.
- Kiểm tra bố cục chung còn gồm 1920×1080, 1024×600 và 900×720; ô giờ Bulk có thêm 1366×768.

| Nhóm | Đã xác minh |
|---|---|
| Bottom sheet | Mở bằng block lịch; nội dung và tên công việc đầy đủ; panel nằm trong dialog, không nằm dưới lịch; mobile rộng gần hết màn hình, PC giữ popup |
| Bàn phím/focus | Khi mở, phần tử đang focus là nút Đóng, không phải input/textarea; chạm trường mới chuyển focus để nhập; đổi hướng giữ bản nháp và không gọi autofocus vào trường |
| Sửa/xóa | Thời lượng tăng/giảm; sửa nội dung, ngày/giờ; lỗi giữ dữ liệu để thử lại; lưu cập nhật lịch/dashboard; xóa có xác nhận, hủy/lỗi xóa xử lý đúng |
| Diện tích lịch | Bộ điều khiển vừa chiều ngang màn hình nhỏ; thu gọn Danh sách/Lịch vào icon tùy chọn; tiêu đề ngày/cột giờ cố định; một vùng cuộn; normal/landscape/fullscreen không làm tràn trang |
| Toàn màn hình | Icon không chứa chữ; bật/tắt có aria-label; giữ kỳ xem, khôi phục cuộn; mở worklog trong fullscreen; Escape thoát chế độ xem rồi vẫn giữ cửa sổ lịch |
| API trình duyệt | Giả lập Fullscreen + lock landscape thành công, thoát từ hệ thống, API thiếu và request bị từ chối; dùng Chromium Fullscreen API thật để kiểm tra vào/thoát nếu môi trường cho phép |
| Nghiệp vụ cũ | Tổng ngày/tuần/cuối tuần, Tuần/Tháng, dữ liệu thiếu, lỗi/Thử lại, 30m/1h/2h đúng tỷ lệ, ghi đơn/Bulk, tiến trình và mất phản hồi không báo hoàn tất |

Ảnh QA được dùng để kiểm tra nội bộ, không kèm source. Với cấu hình 315×683, vùng lịch thường cao khoảng 520px; ở fullscreen ngang 844×390, lịch cao trên 320px và đủ 5 cột T2–T6 cùng lúc. Con số thực tế thay đổi theo vùng an toàn, thanh trình duyệt, font và phiên bản hệ điều hành.

## Chạy kiểm tra logic

Yêu cầu Node.js 24.x:

```bash
npm test
```

## Chạy kiểm tra giao diện

Playwright chỉ phục vụ phát triển, không phải dependency khi triển khai Vercel:

```bash
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:ui
```

Có thể đặt `QJL_CHROMIUM_PATH` để dùng Chromium đã có. `QJL_QA_OUTPUT` là thư mục lưu ảnh giả lập tùy chọn; mặc định không tạo ảnh. Các fixture dùng localhost 4174, 4176, 4179, 4182, 4184 và 4186 rồi đóng khi xong.

## Kiểm tra sau triển khai trên iPhone thật

1. Kiểm tra đầu trang/footer V1.11.1. Nếu dùng PWA, bấm Cập nhật hoặc tải lại trang sau deploy.
2. Vào Worklog đã log → bấm block. Sheet phải nổi riêng, bàn phím chưa hiện. Chạm Thời lượng/Mô tả để nhập, chạm ngày/giờ để dùng bộ chọn native.
3. Thu/mở bàn phím, thử cuộn các trường; đảm bảo nút lưu/xóa còn tiếp cận được.
4. Bấm icon toàn màn hình. Nếu máy chưa tự xoay, tắt khóa xoay rồi xoay ngang. Kiểm tra T2–T6, chọn ngày, Tuần/Tháng, T7/CN và thoát bằng icon.
5. Mở chi tiết trong fullscreen, sửa một worklog thử với quyền Jira thực tế. Đối chiếu lịch và tổng giờ với Jira.

## Giới hạn rõ ràng

- Chưa kiểm tra trên iPhone Safari/WebKit vật lý, bàn phím phần mềm thật, Jira thật hoặc triển khai Vercel thật trong lượt này. Kiểm tra focus trên Chromium giả lập không thay thế kiểm tra bàn phím iOS.
- Trình duyệt quyết định việc cho phép fullscreen thật, ẩn thanh trình duyệt và khóa hướng màn hình. App chỉ yêu cầu xoay ngang; khi không hỗ trợ hoặc bị từ chối, dùng giao diện tràn màn hình trong trang và hướng dẫn xoay máy.
- Tham chiếu API: https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock và https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen .
- Native date/time có định dạng theo thiết lập ngôn ngữ của máy. Sheet dùng visualViewport để thích ứng bàn phím; cần xác nhận lại trên iPhone thật.
- API Jira, phân bổ giờ, 8h/ngày, 40h/tuần T2–T6, OT và tiến trình giữ logic bản nền.

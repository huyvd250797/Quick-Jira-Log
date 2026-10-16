# Kiểm tra V1.11.3

## Kiểm tra bổ sung V1.11.3

- Xác minh manifest PWA cho phép orientation `any`; việc xoay thực tế còn phụ thuộc thiết bị/trình duyệt.
- `calendar-style-tests.js`: định dạng 0/15/30/60/480 phút; cờ OT boolean/options và giờ bắt đầu; không suy OT từ cuối tuần; dự án chuẩn hóa và bảng màu ổn định với 120 dự án; bỏ registry màu sai.
- Tích hợp handler lịch sử bằng Jira giả lập: tìm trường OverTime, thêm vào truy vấn metadata theo lô, cache ID qua hai lần gọi, phân loại OT từ issue/thời gian và loại worklog 0 phút.
- `calendar-colors.cjs`: 315×683, 390×844, 430×1200, 568×320, 667×375, 844×390, 1440×1000. Cả Sáng/Tối; khung fullscreen tràn viewport, lưới giãn hết chiều cao khi đủ chỗ, tỷ lệ block 1h/2h giữ đúng.
- Kiểm tra màu OT cố định/ribbon cả block ngắn và nhỏ, vị trí OT vẫn bám trục giờ, OT ưu tiên hơn màu dự án, agenda Tháng cũng có nhãn/màu OT.
- Kiểm tra progress xanh khi đạt 8h; không có thành phần `0m`, không dựng block 0 phút; cùng dự án cùng màu, dự án khác khác màu; icon không có chữ, bấm không gọi API và lựa chọn/bảng màu giữ sau reload.
- Khắc phục tổng giờ xuống dòng khi tải trên màn hình 315px, giữ khung lịch đứng yên.

## Kiểm tra bổ sung V1.11.2

`motion-lock.cjs` kiểm tra trên 315×683, 390×844, 844×390, 1440×900 và chế độ giảm chuyển động tại 390×844:

- Lịch Tuần không còn DOM agenda và tiêu đề danh sách ngày; chọn ngày không thay chiều cao vùng lịch. Đổi sang Tháng có agenda, quay lại Tuần thì xóa và ẩn agenda.
- Dialog mở với focus ở nút Đóng; nền inert và overflow được khóa.
- Wheel ở nền không đổi vị trí lịch. Touch mô phỏng ở nền, kéo ngang trong sheet và kéo quá biên trên bị chặn; vùng nội dung sheet vẫn cuộn dọc được.
- Dialog không có chiều rộng nội dung vượt khung và không trượt ngang.
- Kiểm tra keyframe mở từ opacity 0 → 1, đóng về 0; mobile có translateY(100%) ở đầu vào/cuối ra.
- Trong hiệu ứng đóng, dialog còn mở và nền còn khóa; chỉ gỡ khóa sau khi đóng hoàn tất, khôi phục vị trí cuộn.
- Đóng rồi mở ngay không để callback animation trước ẩn nhầm sheet mới.
- Cửa sổ Cài đặt dùng đúng fade in/out; Reduce Motion không chạy chuyển động.

Các bộ kiểm tra giao diện cũ được cập nhật để chờ hiệu ứng đóng hoàn tất. Các phần còn lại giữ kiểm tra hồi quy từ bản nền.

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

Có thể đặt `QJL_CHROMIUM_PATH` để dùng Chromium đã có. `QJL_QA_OUTPUT` là thư mục lưu ảnh giả lập tùy chọn; mặc định không tạo ảnh. Các fixture dùng localhost 4174, 4176, 4179, 4182, 4184, 4186, 4188 và 4190 rồi đóng khi xong.

## Kiểm tra sau triển khai trên iPhone thật

1. Kiểm tra đầu trang/footer V1.11.3. Nếu dùng PWA, bấm Cập nhật hoặc tải lại trang sau deploy.
2. Vào Worklog đã log → bấm block. Sheet phải nổi riêng, bàn phím chưa hiện. Chạm Thời lượng/Mô tả để nhập, chạm ngày/giờ để dùng bộ chọn native. Khi sheet mở, thử kéo ngang/dọc ngoài sheet: nền lịch phải đứng yên; cuộn trong sheet vẫn được.
3. Thu/mở bàn phím, thử cuộn các trường; đảm bảo nút lưu/xóa còn tiếp cận được.
4. Bấm icon toàn màn hình. Nếu máy chưa tự xoay, tắt khóa xoay rồi xoay ngang. Kiểm tra T2–T6, chọn ngày, Tuần/Tháng, T7/CN và thoát bằng icon.
5. Mở chi tiết trong fullscreen, sửa một worklog thử với quyền Jira thực tế. Đối chiếu lịch và tổng giờ với Jira.

## Giới hạn rõ ràng

- Chưa kiểm tra trên iPhone Safari/WebKit vật lý, bàn phím phần mềm thật, Jira thật hoặc triển khai Vercel thật trong lượt này. Kiểm tra focus trên Chromium giả lập không thay thế kiểm tra bàn phím iOS.
- Trình duyệt quyết định việc cho phép fullscreen thật, ẩn thanh trình duyệt và khóa hướng màn hình. App chỉ yêu cầu xoay ngang; khi không hỗ trợ hoặc bị từ chối, dùng giao diện tràn màn hình trong trang và hướng dẫn xoay máy.
- Tham chiếu API: https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock và https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen .
- Native date/time có định dạng theo thiết lập ngôn ngữ của máy. Sheet dùng visualViewport để thích ứng bàn phím; cần xác nhận lại trên iPhone thật.
- Các API ghi Jira, phân bổ giờ, 8h/ngày, 40h/tuần T2–T6 và tiến trình giữ logic bản nền. Đọc lịch sử thêm metadata OverTime. Cờ này ở cấp issue nên không phân biệt được từng worklog giờ thường/OT cùng issue; xem README.

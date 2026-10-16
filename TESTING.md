# Kiểm tra V1.11.0

## Phạm vi và kết quả

- `npm test`: các bộ kiểm tra logic/API hiện có đều đạt, gồm phân bổ giờ, OT, xác thực, cache, idempotency, truy vấn lịch sử, mốc tuần và tiến trình HTTP streaming.
- Kiểm tra trình duyệt Chromium headless bằng Jira giả lập, không dùng tài khoản thật.
- Desktop: 1920×1080, 1440×900, 1366×768, 1024×600, 900×720.
- Mobile mô phỏng: 315×683, 390×844, 430×932; màn hình ngang 844×390. Luồng nghiệp vụ có thêm cấu hình thiết bị iPhone 13.
- Giao diện Sáng/Tối được chụp và rà soát sau khi trạng thái đã ổn định; ảnh QA chỉ dùng nội bộ, không kèm source.

| Bộ kiểm tra | Các hành vi đã xác minh |
|---|---|
| `layout.cjs` | Mở mặc định Lịch tuần/ngày Việt Nam; ẩn bộ lọc Danh sách; giữ KEY khi đổi chế độ; mở lại về tuần hiện tại; điều hướng vừa màn; cột giờ và tiêu đề ngày cố định; tối đa một vùng cuộn dọc; toolbar ổn định khi tải; khôi phục vị trí cuộn khi tải lại; lỗi có Thử lại; dữ liệu thiếu báo Tạm tính; đổi Tuần/Tháng; không tràn ngang trang |
| `correction.cjs` | Popup PC/form dưới lịch trên mobile; focus trong popup; mở lại nhanh rồi nhập không bị lấy mất focus; Escape/nền ngoài; lỗi mô tả trống; tăng/giảm 30m; lưu, lỗi lưu, thử lại; xác nhận xóa, hủy và lỗi xóa; cập nhật lịch; chuyển PC/mobile giữ nội dung nháp |
| `duration.cjs` | Đo chiều rộng chữ `3h 30m`, `12h 30m`, `16h` so với chiều rộng nhập thực tế; preset/tăng giảm đồng bộ nháp; lỗi thời lượng sai ngay cạnh trường và xóa lỗi khi nhập đúng; không tràn trang; Sáng/Tối |
| `workflow.cjs` | Tổng ngày/tuần/cuối tuần; chiều cao block 30m/1h/2h đúng tỷ lệ; sửa/xóa cập nhật dashboard; tuần giao tháng; ghi đơn và Bulk; tiến trình/ETA; mất phản hồi không báo 100%; dashboard lỗi và dữ liệu thiếu |

Các bộ kiểm tra cũ dùng đối chiếu chuỗi CSS/nhãn đã được cập nhật theo phiên bản, hàng dashboard hiện tại và nhãn tiếng Việt. Kiểm tra tương tác trình duyệt bổ sung xác minh hành vi thực tế.

## Chạy lại logic

Yêu cầu Node.js 24.x:

```bash
npm test
```

## Chạy lại giao diện với dữ liệu giả lập

Chỉ cần cài Playwright trên máy kiểm tra. Thư viện này không phải dependency khi triển khai ứng dụng:

```bash
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:ui
```

Nếu đã có Chromium, đặt biến `QJL_CHROMIUM_PATH` trỏ đến file thực thi. Đặt `QJL_QA_OUTPUT` nếu muốn lưu ảnh mô phỏng; mặc định bài kiểm tra không tạo ảnh. Các cổng localhost 4174, 4176, 4179 và 4182 cần đang trống. Mỗi fixture chạy và đóng cùng bộ kiểm tra.

Các bài kiểm tra này phục vụ phát triển, không bắt buộc chạy trên Vercel và không cần cấu hình tài khoản Jira. Thay đổi `ui.css` thì cần kiểm tra cả Sáng/Tối, màn nhỏ/ngang và đưa phiên bản mới vào `sw.js`.

## Kiểm tra sau deploy

1. Xác nhận đầu trang/footer là V1.11.0; dùng nút Cập nhật của PWA nếu còn cache cũ.
2. Đăng nhập, kiểm tra dashboard với giờ trên Jira.
3. Mở Worklog đã log: phải tự vào tuần hiện tại; đổi ngày/Tuần/Tháng và thử cuộn.
4. PC bấm block mở popup; mobile mở form dưới lịch. Dùng một worklog thử để kiểm tra lưu/xóa với quyền Jira của tài khoản.
5. Kiểm tra bàn phím, zoom và vùng an toàn trên iPhone Safari thật.

## Giới hạn

- Chưa kiểm tra trên Jira thật, quyền tài khoản thực tế, iPhone Safari/WebKit vật lý hoặc triển khai Vercel thật trong lượt này.
- Mốc 8h/ngày, 40h/tuần T2–T6 và cách tính/ghi Jira giữ như bản nền; đây không phải phiên bản thay đổi nghiệp vụ.
- Lịch tuần giữ tỷ lệ một phút bằng một pixel; block rất ngắn chỉ có thể hiển thị mã task, nội dung đầy đủ nằm trong tên truy cập/popup/form.
- Ô tháng trên màn hẹp có thể xuống dòng thời lượng. Số giờ chưa tải đầy đủ phải đọc là tạm tính.
- Safari có cách hiển thị ngày/giờ native tùy thiết lập ngôn ngữ của máy.

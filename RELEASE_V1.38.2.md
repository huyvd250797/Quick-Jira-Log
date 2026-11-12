# Quick Jira Log V1.38.2 — Visual Foundation

- Đồng bộ bảng màu sáng/tối cho nền, thẻ, popup, ô nhập, chữ và viền. Các nhãn trạng thái hiện có dùng chung màu thành công, cảnh báo, lỗi và đang thực hiện.
- Chuẩn hóa màu và độ đậm của tiêu đề, mã Jira, tên Subtask và chữ phụ. Số giờ trong dashboard, form, lịch và báo cáo dùng chữ số có độ rộng đều.
- Dùng màu viền theo nền, độ bo theo nhóm thẻ và nút, bóng nhẹ cho popup. Các icon nét của thanh công cụ và hộp thoại dùng chung độ dày nét trong vùng bấm hiện tại.
- Đồng bộ màu rê chuột, màu nhấn, viền focus bằng bàn phím và màu nút vô hiệu hóa.
- Bố cục, vùng bấm, luồng và quy tắc ẩn taskbar lấy theo V1.38.1. **Tổng hợp → Tuần** vẫn mở trực tiếp từ taskbar để xem giờ thường, OT và Sub-task Type.

## Nâng cấp

1. Giải nén ZIP, mở thư mục source với Node.js 24.x. Chạy `npm ci` và `npm test`.
2. Nếu chạy local với API, cấu hình biến từ `.env.example` rồi chạy `vercel dev`. Với Vercel đã kết nối GitHub, tích hợp source vào nhánh deploy, dùng cấu hình và biến môi trường hiện tại.
3. Kiểm tra footer hiện **V1.38.2**. Với PWA, bấm **Cập nhật** khi có thông báo. Đối chiếu màn chính, form Logwork và Tổng hợp ở hai chế độ sáng/tối trên PC và mobile.
4. **Không cần chạy migration mới.** Có thể triển khai lại source V1.38.1 để quay về bản trước.

**Bản tiếp theo đề xuất** là V1.38.3 — Home & Toolbar Polish, tinh chỉnh hình thức màn chính và taskbar.

## Kiểm tra

- `npm test` với bộ hồi quy Node.js.
- Kiểm tra 11 cặp màu chữ/nền trên mỗi giao diện, gồm chữ phụ, nút chính, nút vô hiệu hóa và nhãn trạng thái. Các cặp đã đo đạt tối thiểu 5,12:1 ở chế độ sáng và 5,78:1 ở chế độ tối.
- Đối chiếu HTML và logic ứng dụng với ZIP V1.38.1 sau khi chuẩn hóa chuỗi phiên bản. Các stylesheet khác và quy tắc hiện taskbar khớp bản nền. Giao diện mới được thực hiện trong `design-system.css`.
- Chromium bị môi trường chặn khi tạo socket. So sánh hình ảnh và kích thước thực tế trên PC/mobile chưa được xác minh.

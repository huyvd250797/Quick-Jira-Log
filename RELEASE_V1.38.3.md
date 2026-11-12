# Quick Jira Log V1.38.3 — Home & Toolbar Polish

- Màn chính làm nổi số giờ thường hôm nay và tuần này. Các nhãn kỳ, mục tiêu và số giờ còn thiếu dễ phân biệt hơn.
- Rãnh thanh tiến độ và phần đã log dùng màu theo giao diện sáng/tối. Giữ cách tính và các nhãn hiện có, gồm thông báo cuối tuần và dữ liệu tạm tính.
- Thẻ giờ, trạng thái tài khoản và danh sách Subtask dùng viền dịu hơn và bóng nhẹ. Thanh công cụ dùng cùng màu icon, nét và độ tương phản nhãn.
- Giữ bố cục, thứ tự nút, vùng bấm và quy tắc hiện taskbar của V1.38.2. Vào **Tổng hợp → Tuần** từ taskbar để xem giờ thường, OT, tổng giờ và phân bổ theo Sub-task Type.

## Nâng cấp

1. Giải nén ZIP và dùng Node.js 24.x. Chạy `npm ci` rồi `npm test` trong thư mục chứa `package.json`.
2. Để chạy local với Jira, cấu hình theo `.env.example` rồi chạy `vercel dev`. Với Vercel đã kết nối GitHub, tích hợp source vào nhánh deploy và giữ cấu hình hiện tại.
3. Xác nhận footer hiển thị **V1.38.3**. Nếu dùng PWA, bấm **Cập nhật** khi có thông báo. Kiểm tra màn chính ở cả hai chế độ, mở **Tổng hợp → Tuần**, sau đó đóng để kiểm tra taskbar hiện lại.
4. **Không cần chạy migration mới.** Có thể triển khai lại V1.38.2 để quay về bản trước.

Bản tiếp theo theo roadmap là **V1.38.4 — Jira Cards & Forms Polish**.

## Kiểm tra

- `npm test` với bộ hồi quy Node.js, bao gồm tính giờ và phân bổ Sub-task Type.
- Đối chiếu HTML, logic dashboard, thứ tự nút, stylesheet bố cục và quy tắc hiện taskbar với source V1.38.2. Các thay đổi giao diện nằm trong phần bổ sung của `design-system.css`.
- Kiểm tra độ tương phản giữa số giờ và nền thẻ, giữa phần đã log và rãnh tiến độ, giữa icon và nền icon ở giao diện sáng/tối.
- Chromium bị môi trường chặn lúc tạo socket. Bố cục trực quan và thao tác trên PC/mobile chưa được xác minh trong trình duyệt.

# Quick Jira Log V1.38.1 — Original Toolbar & Personal Summary

- Khôi phục bố cục PC và mobile theo V1.37.7. Trên mobile, taskbar ở màn hình chính gồm **Tra cứu**, **Dự án**, **Tổng hợp** và **Worklog đã log**. Trên PC, các nút nằm lại ở cụm công cụ trên đầu màn hình chính.
- **Tổng hợp** mở lại từ thanh công cụ, hiển thị tổng giờ cá nhân theo tuần hoặc tháng, giờ thường, OT, phân bổ theo dự án và **Sub-task Type**. Có thể mở chi tiết từng loại để xem worklog.
- Thanh công cụ của màn hình chính được ẩn khi mở màn chức năng hoặc form chỉnh sửa. Đóng màn hoặc form sẽ thấy thanh công cụ trở lại.
- Phần làm mới giao diện áp dụng cho màu, kiểu chữ, viền và trạng thái focus. Giữ trạng thái Tra cứu, Lịch và Thống kê trong phiên.

## Nâng cấp

1. Giải nén ZIP, mở thư mục source bằng Node.js 24.x và chạy `npm ci`, sau đó chạy `npm test`.
2. Triển khai theo cấu hình Vercel hiện tại hoặc chạy `vercel dev` với các biến trong `.env.example`.
3. Kiểm tra footer hiển thị **V1.38.1**. Trên PWA, bấm **Cập nhật** khi có thông báo. Mở **Tổng hợp → Tuần**, kiểm tra tổng giờ và **Phân bổ theo Sub-task Type** rồi đóng để kiểm tra taskbar trở lại.
4. **Không cần chạy migration mới.** Có thể quay về source V1.38.0 khi cần.

Bản kế tiếp theo roadmap là **V1.39.0 — Tra cứu & Logwork**.

## Kiểm tra

- `npm test` chạy bộ hồi quy Node.js, gồm logic tổng hợp theo tuần/tháng và Sub-task Type.
- Đối chiếu markup với V1.37.7. Bố cục HTML khớp khi bỏ qua chuỗi phiên bản và liên kết stylesheet mới.
- Bộ kiểm thử trình duyệt có bước mở **Tổng hợp** trực tiếp từ taskbar và kiểm tra taskbar ẩn trong màn chức năng. Chromium bị chặn lúc khởi động nên chưa chạy được kiểm thử giao diện.

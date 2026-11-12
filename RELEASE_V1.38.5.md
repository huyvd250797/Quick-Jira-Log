# Quick Jira Log V1.38.5 — Calendar & Reports Polish

- Đổi nhãn **Worklog đã log** thành **Lịch** trên thanh công cụ PC, taskbar mobile và tiêu đề màn lịch. Sau khi ghi lịch nháp, tiêu đề trở lại **Lịch**.
- Tăng tương phản trục giờ, vạch chia và ngày hiện tại. Dùng màu kèm nhãn **Đã log**, **Chưa log** hoặc **Chưa lưu**. Trạng thái cần kiểm tra có nhãn riêng. Lưới giờ và thao tác kéo, chỉnh thời lượng, xác nhận giữ theo V1.38.4.
- **Tổng hợp → Tuần** giữ vị trí mở từ taskbar và thao tác xem chi tiết theo Sub-task Type. Màu Giờ thường, OT và Chưa rõ đồng bộ giữa cột biểu đồ và chú giải.
- Làm rõ tên thành viên, số thứ tự, giờ và man-days trong Thống kê dự án. Số liệu dùng chữ số độ rộng đều.
- Trạng thái tải, trống, tạm tính và lỗi dùng màu và nội dung giải thích. Bộ lọc, công thức và API giữ theo bản nền.

## Nâng cấp

1. Giải nén ZIP, mở thư mục chứa `package.json` bằng Node.js 24.x, chạy `npm ci` và `npm test`.
2. Với Vercel đã kết nối GitHub, tích hợp source vào nhánh deploy và dùng cấu hình hiện tại. Nếu chạy local, dùng `.env.example` và `vercel dev`.
3. Sau khi cập nhật, kiểm tra footer V1.38.5. Mở **Lịch**, **Tổng hợp → Tuần** và **Thống kê dự án** ở cả giao diện sáng và tối. Dùng cùng bộ lọc để đối chiếu số liệu với V1.38.4.
4. **Không cần chạy migration mới.** Có thể triển khai lại V1.38.4 để quay về bản trước.

**Bản tiếp theo** là V1.38.6 — Visual QA.

## Kiểm tra

- `npm test` chạy bộ hồi quy Node.js, gồm bộ kiểm tra lịch, tổng hợp cá nhân, thống kê và tính man-days.
- Kiểm tra nhãn trạng thái lịch bằng mô phỏng, đối chiếu cấu trúc HTML và tài nguyên bố cục với V1.38.4, xác nhận màu chú giải dùng chung token với biểu đồ.
- Chromium bị môi trường chặn lúc tạo socket. Chưa xác minh trực quan và thao tác kéo trên trình duyệt PC/mobile.

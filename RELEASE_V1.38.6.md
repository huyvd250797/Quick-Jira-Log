# Quick Jira Log V1.38.6 — Visual QA

- Rà soát màn chính và taskbar. Giữ thứ tự, nhãn, vùng bấm và quy tắc ẩn thanh công cụ khi mở màn chức năng hoặc form.
- Chỉnh điểm tràn chữ ở thẻ Tra cứu, dòng Subtask trong Chi tiết và số liệu dài trên thẻ thành viên. Giữ quy tắc cắt tên và vùng hiển thị hiện có.
- Cải thiện khả năng tiếp cận thanh nút Logwork khi cuộn. Trên mobile, popup xác nhận bám theo vùng nhìn khi bàn phím mở. Phần tóm tắt được cuộn riêng nếu không đủ chỗ. **Hủy**, **Xác nhận** và **Log & Next** giữ thứ tự hiện có.
- Giới hạn độ rộng nhãn trên block lịch ngắn để mã và nhãn trạng thái cùng có chỗ hiển thị. Giữ trục giờ, khung lịch, thao tác kéo, chỉnh thời lượng và xác nhận theo V1.38.5.
- Kiểm tra tính nhất quán màu biểu đồ và chú giải. Giữ công thức, bộ lọc và luồng **Tổng hợp → Tuần → Sub-task Type**.

## Nâng cấp

1. Giải nén ZIP, mở thư mục chứa `package.json` bằng Node.js 24.x, chạy `npm ci` và `npm test`.
2. Với Vercel đã kết nối GitHub, tích hợp source vào nhánh deploy và dùng cấu hình hiện tại. Nếu chạy local, dùng `.env.example` và `vercel dev`.
3. Kiểm tra footer hiển thị V1.38.6. Nếu dùng PWA, bấm **Cập nhật** khi có thông báo. Kiểm tra màn chính, Jira, Logwork, Lịch và báo cáo ở cả hai chế độ sáng/tối. Trên mobile, thử mở bàn phím và cuộn nội dung trước khi xác nhận.
4. **Không cần chạy migration mới.** Có thể triển khai lại V1.38.5 để quay về bản trước.

**Bản kế tiếp đề xuất** là V1.39.0 — Tra cứu & Logwork, chọn nhiều Subtask từ Tra cứu và đưa vào Log tất cả.

## Kiểm tra

- `npm test` chạy bộ hồi quy Node.js, gồm logic kéo, đổi giờ, chỉnh thời lượng, xác nhận, báo cáo và man-days.
- Mô phỏng cập nhật vùng nhìn mobile với bàn phím, thanh công cụ trình duyệt và môi trường thiếu VisualViewport. Đối chiếu cấu trúc HTML, API và công thức báo cáo với V1.38.5.
- Bổ sung kiểm tra trình duyệt cho popup trên viewport thu nhỏ và màu biểu đồ/chú giải sáng/tối. Chromium bị chặn lúc tạo socket. Trình duyệt desktop cũng không kết nối được bản chạy thử local, nên chưa có xác minh bằng trình duyệt hoặc bàn phím trên thiết bị thật.

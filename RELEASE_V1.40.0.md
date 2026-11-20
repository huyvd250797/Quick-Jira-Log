# Quick Jira Log V1.40.0 — Vietnamese Holiday Collection

Bổ sung 10 chủ đề đã duyệt, nâng tổng số lên 20. Mỗi chủ đề mới có ảnh tách lớp trong suốt, họa tiết card phù hợp và hai lựa chọn hiệu ứng; áp dụng chung tại dashboard, đăng nhập, splash, xem trước nhỏ và xem trước tạm trên dashboard.

| Chủ đề mới | Lịch mặc định hằng năm | Chuyển động |
| --- | --- | --- |
| Tết Dương lịch | 01/01 | Kim đồng hồ, pháo hoa nhẹ; tùy chọn ruy băng |
| Tết Nguyên Tiêu | 15/01 âm lịch | Đèn lồng đung đưa, mây trôi; mặt trăng giữ tròn |
| Quốc tế Phụ nữ | 08/03 | Cánh tulip rơi; tùy chọn lụa bay |
| Giỗ Tổ Hùng Vương | 10/03 âm lịch | Mây trôi, tùy chọn cờ hội; đền và trống đứng yên |
| Tết Đoan Ngọ | 05/05 âm lịch | Cành tre lay nhẹ; tùy chọn lá tre rơi |
| Ngày Gia đình Việt Nam | 28/06 | Hơi trà bay, rèm lay hoặc nắng ấm |
| Lễ Vu Lan | 15/07 âm lịch | Nến cháy, gợn nước; tùy chọn cánh sen trôi |
| Quốc khánh Việt Nam | 02/09 | Cờ đỏ sao vàng bay trên lớp riêng; Lăng giữ nguyên |
| Ngày Phụ nữ Việt Nam | 20/10 | Cánh hồng rơi; tùy chọn lụa bay |
| Ngày Văn hóa Việt Nam | 24/11 | Ánh đồng lướt và lụa lay |

- Giữ 10 chủ đề cũ, bảng màu light V1.39.3, ảnh 20/11 sáng/tối cùng vùng hiển thị và nút đổi chế độ hoạt động bình thường.
- Các chủ đề mới dùng chung hình học đối tượng ở cả light/dark; màu nền và ánh sáng theo chế độ. Không làm méo kiến trúc/mặt trăng, không chuyển chuỗi ảnh bằng fade.
- Giữ lịch và thứ tự ưu tiên đã lưu theo từng tài khoản; tự bổ sung lịch mặc định cho chủ đề mới. Lịch âm tính lại theo năm ở múi giờ Việt Nam. Khi trùng lịch, theo thứ tự ưu tiên trong cấu hình.
- Lịch áp dụng vẫn chỉ có Lịch mặc định / Ngày cụ thể. Checkbox lặp hằng năm chỉ dành cho Ngày cụ thể. Sinh nhật tiếp tục cấu hình riêng.
- Họa tiết card nằm trong vùng trống đã dành sẵn và không nhận click. Mobile có chủ đề thì ảnh ở hàng riêng; không có chủ đề thì header gọn như trước.
- Hiệu ứng tự dừng khi tắt chuyển động, tab ẩn, vùng ảnh ngoài màn hình hoặc bị modal che. Có hỗ trợ giảm chuyển động của hệ điều hành.

Nâng cấp từ V1.39.13: Node.js 24.x, `npm ci`, `npm test`, tích hợp source vào nhánh đang deploy và giữ biến môi trường. Cập nhật PWA sau deploy để nhận cache V1.40.0 và tài nguyên mới. Không cần migration cơ sở dữ liệu. Chưa push GitHub hoặc deploy trong lần bàn giao này.

Mục tiêu chuyển động 60fps; chưa xác nhận FPS thực tế trên thiết bị vì Chromium môi trường kiểm thử không khởi chạy được. Xem TESTING.md để nghiệm thu sau deploy.

Bản kế tiếp đề xuất: V1.40.1 — Holiday Visual QA, hiệu chỉnh sau nghiệm thu PC/iPhone. Kế hoạch Tra cứu & Logwork trước đây được chuyển sang đề xuất V1.41.0; chưa triển khai.

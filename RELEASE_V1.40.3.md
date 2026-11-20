# Quick Jira Log V1.40.3 — Compact Holiday Banners

Áp dụng mẫu banner thấp vừa duyệt cho đủ 10 chủ đề mới, cả darkmode và lightmode. Ảnh nền được bố trí lại theo panorama 3:1, giữ các điểm nhấn trong khung ngang thấp để dành thêm chỗ cho dữ liệu dashboard.

- Mobile: chiều cao vùng banner `clamp(104px,31vw,142px)`, khoảng121px tại viewport390px. Chỉ thu gọn ảnh, không thu nhỏ chữ, nút hoặc các card dữ liệu. So với V1.40.2 tại390px, vùng ảnh giảm từ241.8px xuống120.9px theo CSS.
- PC: header và vùng ảnh của 10 chủ đề mới trở về chiều cao136px thay cho204px. Menu vẫn ở vùng riêng, ảnh không đè logo/nút.
- Tái tạo 20 biến thể ảnh (10 chủ đề × sáng/tối) thành10 tài nguyên panorama. Mỗi tài nguyên gồm hai panel1536×512 xếp trên/dưới. Đổi chế độ dùng cùng vùng hiển thị và tọa độ lớp động.
- Căn lại đồng hồ, đèn lồng, lá tre, hơi trà, nến và cờ theo mặt phẳng3:1. Kiến trúc, mặt trăng và gương mặt giữ nguyên hình dạng.
- Giữ clip từng panel bằng tọa độ nguồn, không lọt ảnh lân cận, không kéo méo ảnh. Ảnh hòa mềm vào nền.
- Dùng đường dẫn mới `seasonal-banners/`; giữ ảnh V1.40.2 ở `seasonal-backgrounds/` để client cũ đang mở không đọc nhầm định dạng trong lúc cập nhật PWA. Cache mới chỉ nạp bộ banner mới.
- Áp dụng đồng bộ ở dashboard, đăng nhập, splash và hai kiểu xem trước. Khi không có chủ đề, mobile tiếp tục về header gọn; không tạo khoảng trống ảnh.
- Giữ 10 chủ đề cũ, palette sáng/tối, card/họa tiết, lịch và cấu hình tài khoản, thứ tự ưu tiên. Tổng cộng vẫn20 chủ đề.

Nâng cấp từ V1.40.2: Node.js24.x, giải nén và chạy `npm ci`, `npm test`; tích hợp source vào nhánh deploy hiện tại, giữ biến môi trường. Không cần chạy migration mới. Sau deploy cập nhật ứng dụng PWA để nhận V1.40.3 và bộ banner mới. Chưa push GitHub/deploy trong lần bàn giao.

Đã qua kiểm thử logic/lifecycle và105 trường hợp render ảnh. Đã kiểm tra bản ghép tĩnh của các lớp đồng hồ/đèn lồng/nến/cờ; chưa nghiệm thu toàn trang hoặc đo FPS trên thiết bị thật vì Chromium môi trường này không khởi chạy được. Mục tiêu60fps chưa được xác nhận thực tế.

Bản kế tiếp đề xuất: V1.40.4 — Compact Device QA, hiệu chỉnh sau nghiệm thu PC/iPhone; V1.41.0 — Lookup & Logwork vẫn là đề xuất chưa xây dựng.

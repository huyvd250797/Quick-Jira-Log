# Quick Jira Log V1.40.2 — Scenic Holiday Themes

Thay cách ghép vật thể rời của 10 chủ đề mới bằng background liền cảnh theo bộ mẫu darkmode/lightmode đã duyệt. Ảnh được tái tạo với chất liệu, chiều sâu và ánh sáng chân thực hơn; không dùng ảnh chụp mockup chứa giao diện làm background.

| Chủ đề | Background | Chuyển động phù hợp |
| --- | --- | --- |
| Tết Dương lịch | Skyline bên sông, pháo hoa, lịch 01/01 trên bàn gỗ | Đồng hồ lớp riêng, kim chạy, ánh pháo hoa |
| Tết Nguyên Tiêu | Phố cổ bên sông, trăng tròn, mái hiên và ánh đèn | Đèn lồng lớp riêng đung đưa, sương nhẹ |
| Quốc tế Phụ nữ | Hiên vườn, tulip, thiệp 8/3 trên bàn | Cánh tulip rơi |
| Giỗ Tổ Hùng Vương | Cổng đền, bậc đá, núi và trống đồng | Sương trôi, tùy chọn cờ hội |
| Tết Đoan Ngọ | Sân nhà Việt, tre, bánh ú tro và trái cây | Lá tre lay/rơi |
| Ngày Gia đình Việt Nam | Gia đình đọc sách trong nhà, cửa sổ và bộ trà | Hơi trà, ánh nắng dịu |
| Lễ Vu Lan | Hồ sen, đền bên nước, bệ đá | Nến lớp riêng cháy động, gợn nước/cánh sen |
| Quốc khánh Việt Nam | Lăng Chủ tịch Hồ Chí Minh, quảng trường, trời thu | Cờ đỏ sao vàng lớp riêng bay theo gió |
| Ngày Phụ nữ Việt Nam | Hiên nhà, hoa hồng, nón lá và thiệp 20/10 | Cánh hồng rơi |
| Ngày Văn hóa Việt Nam | Không gian di sản, trống đồng, quạt, nón và thiệp 24/11 | Ánh đồng lướt nhẹ/chậm |

- Mỗi chủ đề có hai ảnh nền sáng/tối trong cùng một tài nguyên; vùng ảnh và các lớp chuyển động dùng chung mặt phẳng 3:2. Đổi chế độ không remount scene, không đổi kích thước hoặc vị trí giao diện.
- Ảnh nền đứng yên; chỉ đối tượng/sương/cánh hoa/ánh sáng được chuyển động. Không bóp méo kiến trúc, mặt trăng hoặc gương mặt.
- Clip ảnh theo tọa độ nguồn riêng cho từng lớp và từng mode, giữ bản sửa lỗi lọt ô ảnh V1.40.1. Không fade nối các khung ảnh để giả chuyển động.
- Lightmode có nền pastel riêng theo chủ đề; darkmode giữ tông đậm. Có thể đổi chế độ bình thường.
- Áp dụng chung tại dashboard, đăng nhập, splash, preview nhỏ và xem trước dashboard tạm. Cập nhật kích thước hero khi có 10 chủ đề mới để thể hiện đủ cảnh; mobile không có chủ đề vẫn quay về header gọn.
- Giữ 10 chủ đề cũ, họa tiết card, lịch mặc định/lịch riêng, thứ tự ưu tiên và cấu hình theo tài khoản. Hệ thống dừng hiệu ứng khi tắt chuyển động, tab ẩn hoặc vùng ảnh không được thấy.

Nâng cấp từ V1.40.1: Node.js 24.x, giải nén, `npm ci`, `npm test`; tích hợp source vào nhánh deploy hiện tại và giữ nguyên biến môi trường. Không cần chạy migration mới. Sau deploy cập nhật PWA để nhận cache V1.40.2 và 10 tài nguyên background mới. Chưa push GitHub/deploy trong lần bàn giao này.

Đã chạy bộ kiểm thử logic, lifecycle và render ảnh. Mục tiêu chuyển động 60fps; chưa xác nhận FPS hoặc nghiệm thu toàn trang trên thiết bị thật vì Chromium môi trường này không khởi chạy được. Xem TESTING.md để kiểm tra sau deploy.

Bản tiếp theo đề xuất: V1.40.3 — Scenic Device QA, hiệu chỉnh sau nghiệm thu PC/iPhone. V1.41.0 — Lookup & Logwork tiếp tục là đề xuất chưa xây dựng.

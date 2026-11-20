# Quick Jira Log V1.40.5 — Holiday Motion & Motif Refinement

Cải tiến 10 chủ đề mới: bốn họa tiết riêng cho mỗi chủ đề, hai lựa chọn chuyển động khác nhau về nội dung, và cờ Quốc khánh dùng chuyển động vải theo cách xử lý cờ 30/04.

- 40 hình họa tiết có nền trong suốt, chất liệu tự nhiên. Card giờ hôm nay/tuần dùng hình khác nhau; trạng thái, đăng nhập và card danh sách phân bố theo vai trò; các dòng công việc luân phiên bốn hình. Giữ vùng dành cho chữ và nút, không chặn click.
- Hiệu ứng chuyển động liên tục theo thời gian. Cánh hoa là từng cánh có sắc độ/gân và độ chao, không còn cả bông hoa rơi. Pháo hoa có quỹ đạo tỏa, rơi và tắt theo trọng lực. Nến dao động không đều, hơi trà mảnh hơn.
- Bốn cảnh có lớp GPU tác động lên chính vật thể trong ảnh: tulip, hoa hồng, tán lá ngoài cửa sổ và cờ hội. Kiến trúc, thiệp và gương mặt không bị uốn cả cảnh.
- Cờ Quốc khánh: texture vải tách nền, mép neo cố định vào cột sẵn có trong background, sóng gió nhiều thành phần và ánh sáng nếp gấp. Dùng chung bộ dựng WebGL với 30/04; không biến dạng Lăng hoặc cột cờ. Bỏ bước đặt lại pha định kỳ để tránh giật lúc lặp.
- Giữ banner thấp, mép hòa nền V1.40.4, hình nền sáng/tối đã duyệt, lịch và dữ liệu tài khoản. Mỗi tùy chọn vẫn dùng chỉ số 0/1, không cần cấu hình lại lịch.
- Có bật/tắt theo chủ đề/toàn app, hỗ trợ giảm chuyển động, dừng khi trang ẩn/ngoài màn hình/modal mở, giải phóng tài nguyên khi tháo cảnh. Khi WebGL không dùng được: cờ dùng dự phòng Canvas2D 96 dải; cảnh khác giữ ảnh gốc và lớp hiệu ứng CSS. Chất lượng dự phòng không tương đương WebGL.

| Chủ đề | Hiệu ứng 1 | Hiệu ứng 2 |
| --- | --- | --- |
| Tết Dương lịch | Kim đồng hồ chuyển động | Đồng hồ và pháo hoa tỏa/rơi |
| Tết Nguyên Tiêu | Đèn lồng đung đưa | Ánh đèn phản chiếu mặt nước |
| Quốc tế Phụ nữ | Cánh tulip chao rơi | Tulip đung đưa trong nắng |
| Giỗ Tổ Hùng Vương | Sương quanh bậc đền | Cờ hội lay bên đền |
| Tết Đoan Ngọ | Nhánh tre lay | Lá tre xoay rơi |
| Gia đình Việt Nam | Hơi trà bốc lên | Tán lá lay ngoài cửa sổ |
| Lễ Vu Lan | Nến cháy và gợn nước | Nến cháy và cánh sen trôi |
| Quốc khánh | Cờ lụa gợn gió | Cờ lụa và nắng quảng trường |
| Phụ nữ Việt Nam | Cánh hồng chao rơi | Hoa hồng lay trong nắng |
| Văn hóa Việt Nam | Ánh sáng trên trống đồng | Ánh đèn lồng dao động |

Nâng cấp: giải nén, Node.js 24.x, chạy `npm ci` và `npm test`, tích hợp source vào nhánh deploy hiện tại, giữ biến môi trường. Không cần chạy migration mới. Sau deploy cập nhật PWA để nhận cache V1.40.5 và hai atlas mới. Chưa push GitHub/deploy trong lần bàn giao.

Kiểm tra: bộ npm test đạt; 40 trường hợp hòa ảnh và 40 ô họa tiết trong suốt đạt; GLSL thật biên dịch/liên kết và dựng 27 frame của 9 tổ hợp cảnh/chế độ trên Mesa EGL đạt, kiểm tra chuyển động theo thời gian và mép cảnh giữ nguyên. Browser test chưa chạy được vì Chromium bị môi trường chặn socket. Chưa nghiệm thu toàn trang/điện thoại thật, chưa xác nhận 60fps thực tế; mức độ chân thực cần Boss đánh giá khi sử dụng.

Kiểm tra bổ sung khi có công cụ QA: `npm run test:blend-render`, `npm run test:motif-render` cần Sharp; `npm run test:gpu-render` cần Python Pillow và Mesa EGL. Các thư viện này không phải dependency chạy ứng dụng. Nguồn hình và prompt thiết kế nằm trong `ASSET_PROVENANCE_V1.40.5.md`.

Bản tiếp theo đề xuất: V1.40.6 — Theme Device QA: kiểm tra PC/iPhone, chuyển chế độ và thời gian khung hình trên thiết bị thật; chưa xây dựng.

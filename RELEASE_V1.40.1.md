# Quick Jira Log V1.40.1 — Holiday Artwork Clipping Fix

Sửa lỗi các chủ đề mới bị lặp ảnh, xuất hiện nửa đồng hồ/thiệp/hoa ở cạnh ảnh trên PC và các khung có tỷ lệ rộng. Nguyên nhân là SVG giữ tỷ lệ ô vuông trong một viewport chữ nhật, nhưng trước đây chỉ cắt theo viewport; ô liền kề trong sprite sheet vẫn vẽ được vào phần trống hai bên.

- Mỗi lớp ảnh được cắt đúng một ô bằng clipPath theo tọa độ nguồn 0..1. Không còn ô ảnh lân cận lọt vào khoảng trống.
- Mỗi vùng cắt có ID riêng, không xung đột khi dashboard, splash và preview cùng tồn tại.
- Áp dụng cả 10 chủ đề mới: Tết Dương lịch, Nguyên Tiêu, 8/3, Giỗ Tổ Hùng Vương, Đoan Ngọ, Gia đình Việt Nam, Vu Lan, Quốc khánh, 20/10 và Văn hóa Việt Nam.
- Không đổi ảnh đã duyệt, bảng màu light/dark, tỷ lệ đối tượng, hiệu ứng, lịch và cấu hình tài khoản. Các họa tiết card và 10 chủ đề cũ giữ nguyên.

Nâng cấp từ V1.40.0: giải nén, tích hợp source vào nhánh deploy hiện tại, giữ biến môi trường. Dùng Node.js 24.x, `npm ci`, `npm test`. Sau deploy cập nhật ứng dụng PWA để nhận cache V1.40.1. Không cần chạy migration mới. Chưa push GitHub/deploy trong lần bàn giao.

Kiểm tra: toàn bộ `npm test` và syntax JS; thêm kiểm thử render 90 trường hợp bằng ảnh thật ở khung rộng/dọc/vuông. Lỗi bản cũ tái hiện ở 30 trường hợp khung rộng, bản sửa không còn pixel ô lân cận và không có lớp ảnh trống. Đây là kiểm thử raster SVG, chưa thay thế nghiệm thu toàn trang hoặc đo FPS trên thiết bị thật.

Bản kế tiếp đề xuất: V1.40.2 — Holiday Device QA, nghiệm thu PC/iPhone và hiệu chỉnh sau phản hồi. V1.41.0 — Lookup & Logwork vẫn là đề xuất chưa xây dựng.

# V1.35.7 — Đồng nhất nút tìm kiếm

- Nút Tìm trong Working Tree/Epic và Tìm filter dùng nền xanh #2164ca, chữ trắng như nút Logwork. Nút tìm người phụ trách, Reporter, công việc cha cũng dùng cùng kiểu primary.
- Màu hành động tách khỏi màu chữ nhấn/accent: theme tối không làm nút Tìm chuyển thành xanh nhạt. Hover #1953ad; giữ trạng thái disabled/focus hiện có.
- Chuyển + tạo công việc trong Epic từ header xuống cùng hàng tìm kiếm, ngay sau nút Tìm. Nút type=button, không gửi tìm kiếm. Dấu + SVG 28px, vùng bấm tối thiểu 44px; có nhãn đọc màn hình.
- Giữ nguyên liên kết Epic, quyền Jira, luồng logwork, progress và dữ liệu. Không thêm API, dependency, biến môi trường/database.

## Nâng cấp
Deploy source như hướng dẫn README phía dưới. PWA báo V1.35.7 thì bấm Cập nhật. Chưa push/deploy. Có thể quay lại source V1.35.6.

## Kiểm tra
Kiểm tra giao diện sáng/tối và bố cục PC/mobile, Epic tạo công việc đúng ngữ cảnh, Working Tree và PWA update. Chi tiết trong TESTING.md. Không gọi Jira công ty hoặc thiết bị iPhone thật.

## Đề xuất tiếp theo — chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story thường dùng theo tài khoản khi Boss chọn xây dựng.

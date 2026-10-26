# V1.35.5 — Lưới Subtask đồng đều, tối đa 6 thẻ

## Thay đổi
Áp dụng riêng cho Log tất cả trên PC, từ source V1.35.4.
- Các thẻ trong lưới có cùng chiều rộng và chiều cao ở chế độ đang chọn, không phụ thuộc tên hoặc mô tả dài/ngắn. Nơi nhập giờ/OT và nút thao tác được căn đồng nhất.
- Tên Subtask tối đa 2 dòng, dài hơn rút gọn bằng “…”. Rê chuột vào tên để xem nội dung đầy đủ qua tooltip. Không cắt dữ liệu Summary hoặc Description khi gửi Jira.
- Màn hình từ 1280px có ít nhất 3 Subtask: 3 cột, tối đa 2 hàng đầy đủ trong khung nhìn. Bỏ chế độ 4 cột của bản trước. PC hẹp hơn dùng 2 cột, tối đa 3 hàng nếu đủ chiều cao. Màn hình thấp có thể hiển thị ít hơn để giữ vùng nhập và nút thao tác không tràn.
- Chiều cao thẻ/vùng lưới tự tính theo viewport, header, footer và chế độ Phân bổ tự động. Quá 6 Subtask tiếp tục cuộn danh sách để xem.
- Khi mở Sửa mô tả, phần nhập cuộn trong thẻ cố định; không kéo dài một thẻ làm lệch các thẻ khác. Vẫn sửa và gửi đầy đủ nội dung được nhập.
- Không đổi giao diện mobile hoặc luồng phân bổ, xem trước, xác nhận và ghi Jira.

## Kỹ thuật
- desktop-workspace.css: quy tắc thẻ đồng đều, rút gọn tiêu đề và vùng cuộn nội bộ riêng PC.
- bulk-desktop-grid.js: quan sát danh sách/header/footer, đổi chế độ và resize để tính số hàng phù hợp; giới hạn tối đa sáu thẻ đầy đủ trong khung. Không gọi API, không đổi draft logwork.
- PWA shell bổ sung module mới; version V1.35.5.

## Kiểm tra
- npm test: 48 bộ kiểm tra nghiệp vụ/API qua.
- npm run test:desktop-ui: các độ rộng PC 1920/1366/1024, tên ngắn xen tên dài; thẻ cùng kích thước, không quá 6 thẻ đầy đủ; 1920/1366 hiển thị đủ 6 với fixture nhiều mục. Mở mô tả và nhập nội dung không đổi chiều cao thẻ. Danh sách 40 mục cuộn nội bộ, footer trong khung.
- Mobile 390/320: bật/tắt stylesheet PC không thay đổi hình học popup.
- Browser batch-review: xem trước/chỉnh sửa/xác nhận với API mô phỏng ở 4 viewport. Browser live-update: cập nhật PWA.
- Chưa kiểm thử trực tiếp Jira công ty hoặc thiết bị iPhone/Safari thật.

## Triển khai
Không thêm database, biến môi trường hoặc dependency runtime. Deploy theo README và bấm Cập nhật khi PWA báo V1.35.5. Chưa push/deploy trong lần bàn giao. Có thể deploy lại V1.35.4 để quay lại.

## Đề xuất kế tiếp — chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story và lọc nhanh khi Boss yêu cầu.

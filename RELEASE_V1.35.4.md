# V1.35.4 — Mở rộng lưới Log tất cả trên PC

## Thay đổi
Chỉ điều chỉnh giao diện Log tất cả ở desktop (từ 900px), trên source V1.35.3 Boss cung cấp.
- Popup có từ 3 Subtask trên màn hình >=1280px mở rộng đến 1760px hoặc chiều rộng màn hình trừ 48px; từ 3 cột, thay vì hai thẻ rất rộng.
- Màn hình >=1800px và có ít nhất 4 Subtask: 4 cột; dưới 1280px vẫn hai cột dễ nhập.
- Tận dụng tối đa 94% chiều cao viewport khi cần. Ít Subtask vẫn co theo nội dung, tránh vùng trống cao không cần thiết.
- Giảm padding/khoảng cách thẻ, làm gọn nút bỏ dòng, nhãn TimeSpent, các nút giờ nhanh và phần sửa mô tả. Giữ vùng nhập giờ và toggle OT đủ lớn để thao tác.
- Header/footer gọn hơn, vùng ngày/tuần và nút xác nhận luôn trong khung; chỉ danh sách dài cuộn bên trong.
- Không thay đổi mobile, Working Tree, form Jira, API hoặc thuật toán log/phân bổ.

## Kiểm tra
- npm test: 48 bộ test nghiệp vụ/API qua.
- npm run test:desktop-ui: 1920×1080, 1366×768, 1024×768. Kiểm tra 3 thẻ nhập giờ thấy đủ ở màn hình >=1280px; 8 thẻ nhập giờ trong hai hàng không cuộn ở 1920×1080 với dữ liệu mô phỏng; 40 thẻ cuộn nội bộ, footer không tràn. Nội dung mô tả dài hoặc mở chi tiết có thể cần cuộn.
- Mobile 390×844 và 320×683: bật/tắt stylesheet desktop không thay đổi kích thước popup.
- Browser batch-review: kéo, sửa thời lượng, xác nhận và ghi dữ liệu kế hoạch mô phỏng; 4 viewport. Browser live-update: cập nhật PWA.
- Xem ảnh kiểm tra chế độ sáng/tối nội bộ; chưa kiểm tra trực tiếp Jira công ty hoặc Safari/iPhone thật.

## Nâng cấp
Không thêm biến môi trường, database hoặc dependency runtime. Deploy source theo README, bấm Cập nhật khi app thông báo V1.35.4. Chưa push/deploy trong lần bàn giao này. Có thể deploy lại V1.35.3 để quay lại.

## Kế tiếp — đề xuất, chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story và lọc nhanh khi Boss yêu cầu.

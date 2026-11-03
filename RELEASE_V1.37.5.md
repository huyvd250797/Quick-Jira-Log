# Quick Jira Log V1.37.5 — Compact Subtask Grid

- Sửa cách hiểu của V1.37.4: tăng diện tích vùng chứa, không kéo dài từng thẻ. Thẻ PC cố định 190px khi nhập giờ, 120px khi Phân bổ tự động; tóm tắt tối đa 2 dòng, mở sửa mô tả/OT vẫn cuộn trong thẻ khi cần.
- Bỏ giới hạn 6 thẻ. Lưới từ 1100px tự thêm cột theo chiều rộng với mỗi cột tối thiểu 340px; PC hẹp hơn giữ 2 cột. Nhiều hàng nhỏ gọn nằm sát đầu danh sách, khoảng cách 10px. Thẻ đồng kích thước, không kéo giãn để lấp đầy phần trống.
- Giữ khung PC rộng của V1.37.4, header/progress gọn, footer cố định và cuộn tự do. Giữ nguyên giao diện mobile, API và luồng logwork.
- Kiểm tra danh sách 30 thẻ: PC 1904×884 thấy 15 thẻ đầy đủ, 1920×1080 thấy 20; CSS 1523×707 (mô phỏng zoom 125%) thấy 8. Số lượng phụ thuộc cửa sổ và chế độ nhập.

Source dựa trên V1.37.4 Boss gửi. Không đổi dependency, biến môi trường hay DB. **Không cần chạy migration mới.** Triển khai toàn bộ source với Node 24 theo hướng dẫn README; PWA nhận cache V1.37.5. Chưa push/deploy. Rollback bằng source V1.37.4, không xóa dữ liệu.

File: **Quick Jira Log V1.37.5 — Compact Subtask Grid.zip**.

Đề xuất tiếp theo: **V1.38.0 — Logwork từ Tra cứu**, chọn Subtask rồi dùng luồng xem trước/xác nhận hiện có; chưa xây dựng.

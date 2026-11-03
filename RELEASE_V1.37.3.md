# Quick Jira Log V1.37.3 — Desktop Bulk Scroll & Card Clarity

## Đã sửa

- Trên PC (từ 900px), cuộn bánh xe/trackpad ở tiêu đề, bộ chọn ngày/tuần, thẻ Subtask, ô TimeSpent, OT, preset, khoảng trống và footer đều cuộn danh sách Log tất cả. Không cần đưa chuột đúng thanh cuộn.
- Loại bỏ bẫy cuộn trong vùng trường của thẻ khi đang duyệt danh sách. Khi mở mô tả dài hoặc ô giờ OT, vẫn cuộn được nội dung riêng; đến mép sẽ tiếp tục cuộn danh sách. Không làm đổi giờ đã nhập bằng bánh xe.
- Chặn cuộn lan ra trang nền ở đầu/cuối danh sách. Hộp thoại hướng dẫn/xác nhận vẫn nhận thao tác riêng; Ctrl/Cmd + wheel không bị chuyển thành cuộn danh sách.
- PC: nền vùng danh sách tách khỏi nền thẻ, viền rõ hơn, nét nhấn bên trái và bóng nhẹ. Hover/focus tăng độ rõ, không phóng to/dịch chuyển thẻ. Có màu riêng phù hợp sáng/tối.
- Giữ bố cục mobile, thẻ đồng kích thước, tên tối đa 2 dòng và tối đa 6 thẻ trọn vẹn trong khung PC theo không gian hiện có. Không thay đổi thuật toán phân bổ, API, quyền, logwork hoặc OT.

## Cách dùng và nâng cấp

Mở Log tất cả trên PC, dùng bánh xe/trackpad ở bất kỳ vùng nào trong hộp thoại để duyệt Subtask; bấm Sửa mô tả để sửa nội dung như trước. Nút Hủy và Xem trước logwork giữ vị trí/luồng hiện có.

- Source dựa trên ZIP V1.37.2 Boss gửi. Không đổi dependency, biến môi trường hay DB. **Không cần chạy migration mới.**
- Bàn giao `Quick Jira Log V1.37.3 — Desktop Bulk Scroll & Card Clarity.zip`; triển khai toàn bộ source theo hướng dẫn Node 24 bên dưới. Service worker đổi cache sang V1.37.3.
- Rollback: triển khai lại source V1.37.2; không cần xóa dữ liệu. Chưa push GitHub/deploy.
- Kiểm tra dùng API Jira mô phỏng và Chromium; chưa thử Jira công ty hoặc thiết bị iPhone/Safari vật lý. Chi tiết TESTING.md.

## Phiên bản tiếp theo — đề xuất, chưa xây dựng

**V1.38.0 — Logwork từ Tra cứu:** chọn các Subtask từ kết quả tra cứu rồi chuyển sang luồng Log tất cả hiện có để xem trước và xác nhận logwork.


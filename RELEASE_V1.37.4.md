# Quick Jira Log V1.37.4 — Desktop Bulk Workspace

## Đã tối ưu Log tất cả trên PC

- Từ 3 Subtask, hộp thoại dùng gần trọn cửa sổ PC: lề ngang 16px, lề trên/dưới 12px. Bỏ giới hạn chiều cao danh sách ngắn làm các hàng bị ép như ảnh.
- Gom tiêu đề/số lượng, Theo ngày/Theo tuần, Phân bổ tự động và ngày/tuần vào một hàng điều khiển. Giờ thường, thanh progress, số đã log/đang nhập và cảnh báo nằm trong một dải gọn phía dưới; vẫn giữ màu xanh dương/xanh lá/đỏ và nền cuối tuần.
- Tính chiều cao thẻ theo **chiều cao thực của vùng danh sách**, không ước lượng bằng 94% màn hình rồi cắt ở một chiều cao ưu tiên. Tự cập nhật khi đổi kích thước, zoom trình duyệt, header xuống dòng hoặc progress xử lý hiện/ẩn.
- Lưới 3 cột từ 1100px, 2 cột ở PC hẹp hơn. Giữ tối đa 6 thẻ trọn vẹn, đồng kích thước và tóm tắt 2 dòng có tooltip. Với cửa sổ quá thấp/hẹp, tự giảm số hàng để thẻ và nút vẫn thao tác được.
- TimeSpent đặt cùng hàng ô giờ và OT; thu gọn khoảng đệm Sửa mô tả trên PC. Giữ viền/nền/bóng phân biệt thẻ và cuộn toàn hộp thoại của V1.37.3. Mở mô tả/OT vẫn sửa và cuộn bên trong được.
- Header/footer đứng yên, chỉ danh sách cuộn. Một hoặc hai Subtask vẫn dùng hộp thoại gọn theo nội dung; không tạo khung toàn màn hình trống.
- Không đổi giao diện mobile, API, quyền, dữ liệu, cách phân bổ hoặc ghi logwork.

## Kết quả kiểm tra diện tích

Trong Chromium với cùng 6 Subtask và cửa sổ CSS 1523×707 (mô phỏng ảnh 1904×884 khi zoom 125%), vùng danh sách tăng từ **256px lên 499px**, hiển thị **6 thẻ trọn vẹn thay vì 3** ở đầu danh sách. Đây là số đo trong môi trường kiểm tra; font, hệ điều hành và zoom thực tế có thể khác.

## Nâng cấp

- Dựa trên ZIP V1.37.3 Boss gửi. File bàn giao: `Quick Jira Log V1.37.4 — Desktop Bulk Workspace.zip`.
- Không đổi dependency, biến môi trường hoặc database. **Không cần chạy migration mới.**
- Triển khai toàn bộ source với Node 24 theo hướng dẫn bên dưới. Service worker đổi cache sang V1.37.4; dùng cơ chế cập nhật PWA đang có.
- Rollback bằng source V1.37.3, không cần xóa dữ liệu. Source chưa push GitHub/deploy.
- Đã kiểm tra tự động với Jira mô phỏng/Chromium; chưa thử Jira công ty hoặc iPhone/Safari vật lý. Xem TESTING.md.

## Phiên bản tiếp theo — đề xuất, chưa xây dựng

**V1.38.0 — Logwork từ Tra cứu:** chọn Subtask từ kết quả tra cứu, đưa sang Log tất cả hiện có, xem trước và xác nhận trước khi ghi Jira.

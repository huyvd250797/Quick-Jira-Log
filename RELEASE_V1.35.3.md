# V1.35.3 — Chuẩn hóa giao diện PC

## Nội dung
- Log tất cả: giới hạn chiều rộng 1120px, bỏ chiều cao cố định gần hết màn hình. Popup ngắn khi ít Subtask; danh sách dài cuộn trong vùng giới hạn, nút Hủy/Xem trước không giãn hết chiều ngang.
- Header Log tất cả: tiêu đề và số Subtask chung một dòng; chế độ/phân bổ tự động bên trái, ngày/tuần bên phải; progress giờ nhập thủ công dùng hàng riêng đủ rộng. Giữ hai cột thẻ Subtask và khoảng cách dễ đọc.
- Công việc Jira: workspace tối đa 1220px, nhóm thao tác có chiều rộng phù hợp PC, vùng tìm Working Tree trên một hàng; kết quả Epic hai cột.
- Popup Epic: co theo nội dung, tối đa 1060px, danh sách Story/Task/Bug hai cột với vùng cuộn riêng.
- Chi tiết công việc: khung tối đa 1080px, tab có độ rộng vừa nội dung; thông tin ba cột, Subtask hai cột, mô tả có giới hạn độ rộng đọc, footer gọn.
- Tạo/sửa: form tối đa 1000px, các trường ngắn chia hai cột; Summary và Description toàn hàng; editor và nội dung có vùng cuộn giới hạn. So sánh trước/sau hai cột, nút xác nhận vừa nội dung.
- Cập nhật nhanh/xác nhận: popup gọn theo nội dung. Thống kê dự án: thanh điều kiện linh hoạt, danh sách thành viên hai cột trên PC.

## Cách triển khai
Thay đổi giao diện nằm riêng trong desktop-workspace.css, toàn bộ áp dụng từ 900px trở lên. Không chỉnh CSS mobile, API, thuật toán phân bổ hoặc thao tác ghi Jira. Thêm stylesheet vào PWA shell và nâng version V1.35.3. Không thêm database, biến môi trường hoặc dependency runtime.

Deploy source theo README hiện có, sau đó bấm Cập nhật khi PWA thông báo. Có thể deploy lại source V1.35.2 để quay lại. Chưa push GitHub hoặc deploy trong lần bàn giao này.

## Kiểm tra
- npm test: 48 bộ kiểm tra nghiệp vụ/API.
- npm run test:desktop-ui: desktop 1920×1080, 1366×768, 1024×768; hai Subtask không tạo vùng trống toàn màn hình, 40 Subtask cuộn nội bộ, footer không tràn. Mobile 390×844 và 320×683 so sánh kích thước khi bật/tắt stylesheet desktop: không đổi.
- Browser Working Tree, tạo công việc, sửa Story/Task/Bug, Filter Jira, xem trước và log batch, thống kê dự án, cập nhật PWA.
- Kiểm tra ảnh PC mô phỏng; API test giả lập. Chưa kiểm thử trực tiếp Jira công ty hoặc Safari/iPhone vật lý.

## Đề xuất tiếp theo — chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story, lọc trạng thái/người phụ trách khi Boss chọn nâng cấp.

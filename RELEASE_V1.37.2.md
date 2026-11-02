# Quick Jira Log V1.37.2 — Working Tree Search & Desktop Lookup

## Sửa tìm kiếm Working Tree

- Một lần bấm Tìm hoặc nhập từ khóa (đợi 350ms) sẽ tự đọc tiếp toàn bộ các trang trong phạm vi đã chọn, cộng dồn kết quả. Áp dụng danh sách Epic, Story/Task/Bug và danh sách trong Epic.
- Tìm một phần mã hoặc tên, không phân biệt hoa/thường và dấu tiếng Việt. Nhiều từ được tìm đồng thời, không bắt buộc đúng thứ tự. Đây là tìm chứa nội dung, chưa có sửa lỗi gõ sai chính tả.
- Sửa hai lỗi: server dừng ở trang đầu có kết quả và ghi đè kết quả của trang trước; giao diện chờ người dùng bấm tìm tiếp thay vì tự đọc hết.
- Mỗi lượt API quét tối đa 5 trang Jira × 25 dòng, có thời hạn xử lý; trình duyệt tiếp tục theo cursor đến hết. Không kéo một truy vấn server dài vượt thời gian hosting. Cursor của Working Tree không dùng giới hạn 10.000 dòng của Tra cứu thường.
- Hiển thị số kết quả và X/Y dòng nguồn đã đọc. Lỗi giữa chừng giữ kết quả đã tìm, ghi rõ Chưa đọc hết và có Thử lại từ trang lỗi. Không báo hết kết quả khi chưa quét xong.
- Đổi từ khóa, Project, bộ lọc, tài khoản hoặc đóng/chuyển khỏi Working Tree sẽ hủy lượt tìm cũ hoặc bỏ qua kết quả cũ. Không trộn kết quả giữa hai điều kiện/tài khoản.
- Duyệt không nhập từ khóa vẫn giữ Tải thêm để tránh tự tải hết dự án khi chỉ đang duyệt. Với tìm kiếm có từ khóa, app tự đọc tiếp, không cần bấm Tìm lại.
- Quan hệ Epic Link, quyền Jira, bộ lọc Status/Assignee, ghim, tạo Subtask và các luồng logwork giữ nguyên.

## Giao diện PC

- CSS riêng `desktop-lookup.css`, chỉ từ 900px. Không áp dụng stylesheet mới trên mobile.
- Tra cứu gần trọn màn hình, nhóm Tìm / Filter Jira / Working Tree cùng hàng tiêu đề; bộ lọc Tìm mặc định thu gọn, vẫn hiện số điều kiện đang áp dụng.
- Thu gọn form Project/từ khóa/phạm vi, Filter Jira, khu ghim và lịch sử vừa xem; ẩn lịch sử vừa xem trên PC khi đã có kết quả. Các bộ lọc vẫn mở được đầy đủ.
- Danh sách dùng 2/3/4 cột theo màn hình; thẻ gọn, tên tối đa 2 dòng trên PC và có tooltip xem đủ. Chỉ vùng kết quả cuộn, không bị co thành khung nhỏ.
- Mở Epic trong khung lớn với bộ lọc thu gọn, giữ nút tạo công việc đúng Epic và + tạo Subtask trên từng công việc. Chi tiết công việc PC rộng hơn, nhóm thông tin 4 cột; giữ luồng sửa/tạo/xem ảnh hiện có.
- Các nút tìm/input/select giữ kích thước và màu hiện có.

## Cách dùng

Chọn Project và phạm vi → nhập một phần mã/tên, ví dụ `QUAN ho SO` → đợi danh sách tự tìm và tiếp tục đọc các trang. Có thể bấm Tìm/Enter ngay. Theo dõi dòng Đang tìm / Đã tìm xong; nếu Jira lỗi, bấm Thử lại để đọc tiếp phần còn thiếu.

Khi không nhập từ khóa, bấm Tìm để duyệt và dùng Tải thêm khi cần. Dự án lớn có thể cần thời gian để quét toàn bộ; kết quả chỉ gồm công việc tài khoản được phép xem, không suy luận quan hệ BigPicture ngoài Epic Link.

## Nâng cấp và kiểm tra

- File bàn giao: `Quick Jira Log V1.37.2 — Working Tree Search & Desktop Lookup.zip`.
- Dựa trên ZIP V1.37.1 Boss gửi. Không đổi dependency runtime hoặc biến môi trường. **Không cần chạy migration mới.**
- Triển khai toàn bộ source theo phần hướng dẫn bên dưới, Node 24; PWA nhận V1.37.2 và tải stylesheet desktop mới. Có thể rollback bằng ZIP V1.37.1, không cần xóa dữ liệu.
- Source đã xây dựng; chưa push GitHub/deploy. Kiểm tra API/browser dùng dữ liệu Jira mô phỏng, chưa xác minh Jira công ty và iPhone/Safari vật lý. Xem TESTING.md.

## Phiên bản tiếp theo — đề xuất, chưa xây dựng

**V1.38.0 — Logwork từ Tra cứu:** chọn nhiều Subtask đủ điều kiện rồi chuyển sang Log tất cả hiện có, xem trước lịch và xác nhận trước ghi Jira.

# V1.35.8 — Tra cứu đồng nhất & chi tiết Jira

## Chức năng
- Nút thực thi tìm kiếm cùng label Tìm, chiều cao 44px, rộng 72px, cùng nền xanh/chữ trắng. Ô input/select đơn cùng chiều cao 44px trong Tra cứu, Epic và form Jira; textarea/checkbox/radio/thanh zoom giữ kiểu phù hợp. Nút mở bộ lọc vẫn là icon để phân biệt với tìm kiếm.
- Nút + trong Epic giữ vùng bấm 44px, dấu + SVG giảm từ 28 xuống 20px, nét mảnh hơn, không gửi form tìm kiếm.
- Chi tiết Story/Task/Bug/Subtask có Project, Type, Status, Assignee, Reporter, Priority, Created, Updated. Reporter/Created lấy từ Jira; không có dữ liệu hiển thị —.
- Type dùng bộ icon Jira chung. Priority dùng icon thực tế từ REST priority theo ID; tải ảnh qua proxy cố định Jira, kiểm tra định dạng/dung lượng/SVG như icon loại. Có icon dự phòng khi Jira không trả icon. Không đoán ID theo tên.
- Xem ảnh gốc: ảnh <=3 MB dùng nguyên tệp. Ảnh lớn tới 20 MB tải từng phần 2 MB, ghép trên thiết bị rồi xem/zoom ảnh gốc. Server xác minh tệp thuộc issue hiện tại, đúng Content-Range và độ dài, không nhận URL tùy ý. Jira không hỗ trợ Range hoặc ảnh >20 MB thì dùng ảnh xem trước và thông báo mở Jira để xem gốc.
- Zoom điều chỉnh kích thước raster hiển thị, tránh phóng lớn bitmap đã thu nhỏ bằng scale; giữ kéo/pinch/zoom cũ. Đóng/đổi ảnh hủy tải và thu hồi blob URL. Không thể tạo thêm chi tiết nếu ảnh gốc đã mờ.
- Upload và tải xuống thường vẫn giữ giới hạn 3 MB; không thay đổi luồng logwork, Epic Link hoặc phân quyền.

## Nâng cấp
Không thêm dependency, DB, biến môi trường. Node 24: npm test. Deploy như README phía dưới; PWA báo V1.35.8 thì cập nhật. Chưa push/deploy. Quay lại bằng source V1.35.7 nếu cần.

## Kiểm tra và giới hạn
Xem TESTING.md. API Jira được mô phỏng; chưa kiểm chứng trực tiếp Jira công ty/iPhone vật lý. Ảnh lớn cần Jira hỗ trợ HTTP Range, nếu không có sẽ báo rõ thay vì báo đang xem bản gốc.

## Đề xuất tiếp theo — chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story thường dùng khi Boss chọn triển khai.

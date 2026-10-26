# V1.35.6 — Tiến trình log & tạo công việc theo Epic

## Thay đổi
- Log theo ngày/tuần từ lịch xem trước dùng popup tiến trình có thanh chạy và phần trăm, nhận các mốc xử lý từ API. Không giả lập phần trăm bằng thời gian. Có bước đối chiếu giờ trống, ghi Jira và tải lịch thật.
- Gộp các Subtask độc lập cùng ngày vào một lần gửi (tối đa 100 mục, giới hạn dung lượng nhóm); nhóm nháp xếp trùng vẫn giữ cùng phạm vi ghi/hoàn tác. Giảm số lần đối chiếu lặp, giữ kiểm tra giờ trống mới nhất trên server.
- Ghi thành công toàn bộ: đóng xác nhận, xóa nháp lịch, ẩn thanh xem trước/nút lưu, mở Worklog đã log và tải lại Jira. Đóng lịch không còn hỏi lưu nháp.
- Khi một nhóm lỗi hoặc mất phản hồi: không báo thành công toàn bộ; giữ phần chưa gửi. Nhóm chưa xác định kết quả bị khóa để tránh gửi trùng; cần kiểm tra Jira. Nếu ghi xong nhưng tải lịch thật lỗi, hiển thị lỗi tải, không quay lại nháp đã log.
- Vừa xem lưu thêm loại công việc theo từng tài khoản. Dữ liệu cũ chỉ có mã được bổ sung bằng một truy vấn giới hạn tối đa 10 mã khi mở Tra cứu; không gọi riêng từng công việc. Nếu Jira không cho đọc một mục, mục vẫn mở được nhưng không đoán loại.
- Bỏ nút + chung; trong Working Tree, chọn Epic rồi dùng + ở đầu popup để tạo Story/Task/Bug trực tiếp trong Epic đó. Giữ nút tạo Subtask ở công việc cha.
- Dự án cố định theo Epic; danh sách loại bỏ Epic/Subtask. Xem lại thể hiện Epic đích. Server xác minh Epic thật, cùng dự án, quyền Create Issues và Epic Link trên Create Screen; gán và đọc lại Epic Link sau tạo. Không gán bằng trường parent của Subtask, không hardcode customfield.
- Nếu Epic Link chưa có/không cho nhập trên Create Screen, app báo rõ và chưa gửi tạo; cần quản trị Jira cấu hình trường này. Không tạo công việc rời Epic âm thầm.
- Nút Tìm trong Epic nền xanh chữ trắng; nhãn Tra cứu thay Tra cứu Jira.

## Cài đặt / nâng cấp
Không đổi database, biến môi trường hay dependency runtime. Giải nén, chạy `npm test` với Node 24. Deploy source như README phía dưới; cập nhật PWA qua thông báo phiên bản mới. Chưa push/deploy trong lần bàn giao. Quay lại bằng source V1.35.5 nếu cần.

## Kiểm tra
Xem TESTING.md cho kết quả và giới hạn. Jira được mô phỏng trong test; chưa kiểm chứng trên Jira công ty/iPhone thật. Tốc độ thực tế còn phụ thuộc mạng và Jira; không cam kết số giây.

## Đề xuất kế tiếp — chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story và lọc nhanh khi Boss yêu cầu.

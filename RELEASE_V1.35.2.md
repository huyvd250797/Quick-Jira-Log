# V1.35.2 — Đồng nhất icon trong danh sách công việc

## Phạm vi
- Dùng chung icon cho Working Tree/danh sách trong Epic, kết quả tìm kiếm và Filter Jira, Subtask trong chi tiết, công việc cha gợi ý khi tạo Subtask, mục vừa xem.
- Bổ sung icon vào danh sách Subtask chờ log, Log tất cả, lịch sử worklog, danh sách công việc trong lịch dạng agenda, chi tiết Tổng hợp giờ và danh sách công việc theo thành viên trong Thống kê dự án.
- Không thêm icon loại công việc vào danh sách nhân sự, dự án, tệp đính kèm hoặc biểu đồ phân loại Sub-task Type (đây là các loại dữ liệu khác). Không thay đổi block của lưới lịch tuần.

## Cách hoạt động
- Thành phần jira-issue-icons.js/.css duy nhất thay cho renderer riêng của Working Tree. Tất cả dùng cùng kích thước, vị trí và bộ icon dự phòng.
- Ưu tiên icon từ Jira theo issueTypeId qua API đã bảo vệ; icon dùng chung được tải một lần mỗi loại trong phiên tài khoản, tối đa 4 yêu cầu đồng thời. Lỗi đọc icon không chặn danh sách.
- Cache và metadata của mục vừa xem chỉ giữ trong RAM, xóa khi đổi tài khoản. Không thêm dữ liệu đăng nhập vào localStorage.
- Nếu bản ghi cũ thiếu loại công việc, hiển thị icon trung tính “Chưa rõ loại công việc”, không đoán Story/Task. Mục vừa xem có thể dùng loại đã đọc trong cùng phiên; sau mở lại app có thể trung tính đến khi đọc lại chi tiết.
- API Subtask, lịch user khác và thống kê trả thêm tên/ID loại từ metadata sẵn có. Không đọc từng issue chỉ để lấy icon, không đổi cách tính giờ, OT hoặc số Subtask.
- SVG và nguồn ảnh tiếp tục dùng kiểm tra an toàn của V1.35.1.

## Kiểm tra
- npm test: 48 bộ kiểm tra nghiệp vụ/API hiện có.
- npm run test:icons-ui: icon đúng loại, dữ liệu thiếu dùng trung tính, nhãn an toàn, dùng chung cache, tối đa 4 lượt đọc, đổi tài khoản không dùng lại cache; bốn viewport 1440×900, 390×844, 320×683, 844×390.
- Browser hồi quy Working Tree, tìm kiếm, Filter Jira, tạo công việc, batch-review và cập nhật PWA.
- API giả lập cho QA; chưa kiểm thử trực tiếp Jira công ty và Safari/iPhone vật lý.

## Triển khai
Không thêm database/biến môi trường/dependency runtime. Deploy source theo README hiện có, cập nhật PWA lên V1.35.2. Có thể deploy lại V1.35.1 nếu muốn quay lại.

## Đề xuất tiếp theo (chưa xây dựng)
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story và lọc trạng thái/người phụ trách, chỉ triển khai khi Boss yêu cầu.

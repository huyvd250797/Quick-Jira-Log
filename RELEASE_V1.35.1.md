# V1.35.1 — Working Tree: Danh sách trong Epic

## Thay đổi
- Bấm thẻ Epic mở popup trên PC, bottom sheet gần toàn màn hình trên mobile; bỏ cơ chế xổ cây nhánh. Không tự mở bàn phím khi mở danh sách.
- Trong Epic có ô tìm riêng: nhập một phần mã hoặc tên, đợi 350ms hoặc bấm Tìm. Khớp không phân biệt hoa/thường, có dấu/không dấu; nhiều từ có thể ở các vị trí khác nhau trong mã/tên. Đây là tìm chứa từ, chưa là sửa lỗi gõ sai theo độ tương đồng.
- Ô tìm ở Working Tree cũng hỗ trợ tìm chứa từ trên mã/tên Epic hoặc Story/Task/Bug theo phạm vi đã chọn.
- Tìm trên các trang nguồn Jira, không chỉ lọc những thẻ đã tải. Mỗi lượt đọc tối đa 5 trang, 25 công việc/trang; khi chưa hết nguồn, nút Tìm tiếp trong danh sách cho biết còn dữ liệu cần đọc. Không coi số công việc nguồn là tổng kết quả khớp. Danh sách trong Epic vẫn bao gồm Story từ dự án khác khi liên kết Epic tương ứng.
- Hiển thị icon loại công việc: ưu tiên icon do Jira trả về qua API cùng nguồn app, có icon dự phòng phân biệt Epic/Story/Task/Bug/Subtask nếu không tải được. Đường dẫn ngoài Jira hoặc SVG có nội dung chủ động bị từ chối; icon không làm hỏng danh sách khi tải lỗi.
- Nút tạo công việc đổi thành + có title/aria-label; cùng hàng với Tìm kiếm | Filter Jira | Working Tree ở PC/mobile.
- Bấm công việc mở chi tiết hiện có; + ở thẻ mở form tạo Subtask đúng công việc cha. Đóng chi tiết/form quay lại danh sách Epic. Đóng Epic giữ danh sách ngoài và vị trí cuộn.
- Xóa dữ liệu cửa sổ Epic và bỏ phản hồi cũ khi đổi tài khoản; chặn cuộn xuyên nền khi mở popup.

## Triển khai
Không thêm database, biến môi trường hoặc dependency runtime. Deploy source như README hiện có. V1.35.1 cập nhật version PWA; bấm Cập nhật khi app báo bản mới. Có thể deploy lại ZIP V1.35.0 để quay lại.

## Kiểm tra
- npm test: 48 bộ kiểm tra nghiệp vụ/API, gồm partial code, tìm tên không dấu qua nhiều trang, phân trang nguồn, quyền, không ghi Jira, icon allowlist/bounded/SVG.
- Browser: Working Tree, jira-search, jira-filters, jira-create trên 1440×900, 390×844, 320×683, 844×390. Kiểm tra mở Epic/không bật bàn phím/tìm trong Epic/tạo đúng cha/đóng trở về/không tràn khung/cùng hàng nút +/reset tài khoản.
- Browser live-update: cập nhật PWA.
- QA dùng API mô phỏng, không ghi lên Jira thật. Chưa xác minh icon tùy chỉnh của Jira công ty hoặc Safari/iPhone vật lý. Quan hệ vẫn theo Epic Link Jira, không phải Box/WBS thủ công BigPicture.
- Lệnh: npm test; npm run test:tree-ui; npm run test:search-ui; npm run test:filters-ui; npm run test:create-ui; npm run test:update-live. Cần Playwright/Chromium riêng cho browser QA.

## Đề xuất tiếp theo — chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story, nhớ mục vừa duyệt theo tài khoản, lọc trạng thái/người phụ trách. Chỉ triển khai khi Boss yêu cầu.

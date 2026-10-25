# V1.35.0 — Working Tree: Duyệt Epic & tạo Subtask

Phát triển từ source V1.34.7 Boss cung cấp ngày 25/10/2026. Không bao gồm đợt củng cố bảo mật API đã hủy.

## Sử dụng
1. Mở Công việc Jira → Working Tree.
2. Nhập/chọn mã dự án (có gợi ý từ danh sách Jira), nhập mã/tên công việc nếu cần.
3. Chọn phạm vi Epic và bấm Tìm. Mở mũi tên cạnh Epic để tải công việc trực thuộc; mở tiếp Story/Task/Bug để xem Subtask.
4. Có thể chọn phạm vi Story / Task / Bug để tìm trực tiếp, rồi bấm mã Epic dưới kết quả để mở đúng nhánh. Công việc chưa gắn Epic được ghi rõ.
5. Bấm tên công việc để xem chi tiết hiện có. Đóng chi tiết giữ nguyên cây và vị trí cuộn.
6. Bấm + tại Story/Task/Bug để tạo Subtask. Form hiện có tự gắn công việc cha, đọc cấu hình và quyền tạo từ Jira, cho xem lại trước khi ghi. Sau kết quả tạo được xác nhận, nhánh Subtask đã mở được tải lại. Đóng cửa sổ công việc mới để trở về cây.
7. Tải thêm để xem tiếp từng trang 25 mục; các nhánh đã mở được giữ nguyên. Khi tìm Story và mở Epic từ kết quả, bấm Xem tất cả trong Epic để bỏ lọc Story chính xác.

## Nguồn dữ liệu và giới hạn
- Cây dựng từ Epic Link (schema Jira Software) và quan hệ parent–Subtask. Đây không phải đồng bộ cây Box/WBS thủ công của BigPicture.
- Tự phát hiện ID Epic Link và loại Epic tên Epic/untranslatedName Epic; không cố định customfield ID theo máy. Thiếu/không rõ cấu hình sẽ báo lỗi thay vì đoán quan hệ.
- Nếu công ty đổi tên loại Epic và Jira không cung cấp untranslatedName tương ứng, cần bổ sung cấu hình sau khi xác minh Jira thực tế.
- Epic có thể chứa Story từ dự án khác; API tải nhánh không loại bỏ các công việc này. Chỉ trả dữ liệu tài khoản được Jira cho phép đọc.
- Duyệt cây chỉ đọc. Không kéo đổi quan hệ, không thêm công cụ lập kế hoạch. Chức năng tạo dùng luồng xác thực, quyền, xác nhận và đối chiếu sẵn có.
- Không có database hoặc biến môi trường mới. Dùng cấu hình triển khai V1.34.7 hiện có.
- Không có tài khoản Jira sản xuất để kiểm tra cấu hình Epic Link/BigPicture thực tế hoặc ghi Subtask thật. Cần xác minh một Epic mẫu trên môi trường của Boss sau triển khai.

## Cấu trúc bổ sung
- lib/jira-working-tree.js: phát hiện quan hệ, JQL an toàn, đọc nhánh, phân trang và dữ liệu công khai tối thiểu.
- handlers/jira-working-tree.js: GET /api?action=jira-working-tree, yêu cầu phiên Jira, xử lý hết phiên/quyền/lỗi.
- jira-working-tree.js và .css: cây tải từng nhánh, tìm kiếm, mở chi tiết/tạo Subtask, bảo vệ phản hồi cũ khi đổi tài khoản hoặc điều kiện.
- jira-search.js: chế độ thứ ba Working Tree; jira-create.js: thông báo cập nhật nhánh sau tạo xác nhận.
- Service worker cập nhật shell V1.35.0, cache hai asset mới; vẫn bỏ qua API.

## Kiểm tra
- npm test: toàn bộ bộ kiểm tra nghiệp vụ hiện có + Working Tree API.
- npm run test:tree-ui: bốn viewport 1440×900, 390×844, 320×683, 844×390; mở nhánh/phân trang giữ cây/tìm Story/định vị Epic/cha của form tạo/lỗi thử lại/reset tài khoản/không tràn ngang.
- Browser hồi quy: jira-search, jira-create, jira-filters, batch-review, live-update. Test filters được sửa điều kiện chờ để chờ cả yêu cầu nền (QuickJiraBusy.count), không chỉ loading chặn nền.
- Dữ liệu API được mô phỏng trong kiểm tra, không ghi vào Jira thật. Không thay cho kiểm tra Safari/iPhone thật hoặc cấu hình riêng của công ty.
- Có thể đặt QJL_CHROMIUM_PATH để trỏ Chromium; Playwright dùng cho QA, không là dependency runtime của app.

## Nâng cấp / quay lại
Dùng hướng dẫn GitHub/Vercel trong README; thay source bằng ZIP này, triển khai, chờ thông báo cập nhật PWA và bấm Cập nhật. Không cần migration. Có thể triển khai lại ZIP V1.34.7 nếu muốn quay lại.

## Đề xuất phiên bản kế tiếp (chưa xây dựng)
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story thường dùng, nhớ nhánh vừa duyệt theo tài khoản, bộ lọc trạng thái/người phụ trách trong cây. Chỉ triển khai khi Boss chọn.

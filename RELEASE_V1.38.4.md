# Quick Jira Log V1.38.4 — Jira Cards & Forms Polish

- Tăng tương phản của mã Jira và tên công việc trong Tra cứu. Thông tin dự án, người phụ trách và dòng phụ dùng màu chữ phụ. Vẫn áp dụng quy tắc hiển thị tên dài hiện có.
- Đồng bộ kiểu chữ và nhãn trạng thái giữa Tra cứu và Chi tiết. Jira Done dùng sắc xanh lá, nhóm In Progress dùng xanh dương. Nhãn chữ và vị trí giữ theo bố cục V1.38.3.
- Form Logwork đồng bộ ô ngày, thời lượng, OT và mô tả. Viền focus rõ hơn. Hiện lỗi cạnh ô ngày, thời lượng hoặc mô tả. Mô tả chỉ có khoảng trắng được báo ngay trước bước xác nhận, phù hợp với điều kiện hiện có của máy chủ.
- Nút gửi đang xử lý có nhãn và trạng thái trợ năng riêng. Hủy, Xác nhận, Log Work và Log & Next giữ vị trí và trình tự thao tác.

## Nâng cấp

1. Giải nén ZIP, mở thư mục chứa `package.json` bằng Node.js 24.x rồi chạy `npm ci` và `npm test`.
2. Với Vercel đã kết nối GitHub, tích hợp source vào nhánh deploy và dùng cấu hình hiện tại. Nếu chạy local, dùng `.env.example` và `vercel dev`.
3. Sau khi cập nhật, kiểm tra footer hiển thị V1.38.4. Dùng Tra cứu để kiểm tra tên dài và nhãn trạng thái. Trong Logwork, thử thời lượng sai và mô tả trống, sau đó sửa lại để kiểm tra lỗi biến mất.
4. **Không cần chạy migration mới.** Có thể triển khai lại V1.38.3 để quay về bản trước.

**Bản kế tiếp** là V1.38.5 — Calendar & Reports Polish.

## Kiểm tra

- `npm test` chạy bộ hồi quy Node.js.
- Mô phỏng kiểm tra lỗi ngày, thời lượng sai, mô tả chỉ có khoảng trắng, xóa lỗi khi sửa và mở xác nhận khi dữ liệu hợp lệ.
- Đối chiếu HTML với bản V1.38.3 sau khi bỏ qua chuỗi phiên bản. CSS mới dùng thuộc tính hiển thị, còn trường lỗi xuất hiện khi có dữ liệu cần sửa.
- Chromium bị môi trường chặn khi khởi động. Kiểm thử trực quan trên PC/mobile chưa được xác minh.

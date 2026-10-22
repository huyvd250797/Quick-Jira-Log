# V1.26.0 — Soạn mô tả trực quan

## Sử dụng

- Khi tạo công việc hoặc Subtask, mô tả có ba chế độ **Soạn thảo / Wiki / Xem trước**. Chọn chữ rồi dùng đậm, nghiêng, tiêu đề, danh sách hoặc màu chữ. Có thể chèn bảng, thêm hàng/cột hoặc xóa bảng. Bảng mới có 2–10 hàng nội dung, 1–8 cột; nội dung giới hạn 20.000 ký tự Jira wiki.
- Nội dung được chuyển thành Jira wiki trước khi xem lại và xác nhận tạo, không gửi HTML vào Description. Xem trước không ghi Jira. Các macro nâng cao chưa hỗ trợ vẫn giữ nguyên trong chế độ Wiki; không tự chuyển làm mất nội dung. Paste/drop nhận chữ thuần để tránh mang HTML không an toàn vào form.
- Chọn filter là tải danh sách ngay. Đã bỏ kính lúp xanh; kính lúp còn lại mở phần tìm/đổi filter. Trong phần mở rộng có nút tải lại kết quả và áp dụng ID thủ công.
- Nhập mã hoặc tên dự án vào ô phía trên combobox; chọn gợi ý để đồng bộ combobox và tự tải loại công việc. Hỗ trợ phím lên/xuống, Enter, Escape. Gợi ý dùng danh sách dự án đã tải theo quyền (tối đa 1.000 dự án), không gọi API mỗi ký tự. Nếu dự án không có trong danh sách, dùng mục nhập mã trực tiếp. Subtask mở từ cha tiếp tục khóa đúng cha/dự án.

## Cài đặt / nâng cấp

Giải nén `Quick-Jira-Log_v1.26.0.zip`, dùng thư mục `Quick-Jira-Log-V1.26.0`. Node 24.x; chạy `npm ci` và `npm test`. Không thêm dependency runtime, biến môi trường, database hoặc migration. Giữ nguyên cấu hình triển khai và APP_SESSION_SECRET hiện tại. Bản này bàn giao source, chưa push/deploy.

Cache PWA và nhãn phiên bản đã đổi 1.26.0. Sau triển khai tải lại app để nhận bản mới. Rollback deployment không xóa công việc đã tạo trên Jira. Không đổi các luồng logwork, Overtime hay lịch.

## Kiểm chứng và giới hạn

Chạy kiểm thử logic/API kế thừa cùng codec/renderer; Chromium 1440×900, 390×844, 320×683 và 844×390 với Jira giả lập. Luồng Subtask còn kiểm tra xuyên frontend → session/router thật → mock Jira → đọc lại đúng cha. Chưa thử trên Jira công ty, Safari/iPhone vật lý hoặc triển khai thực tế.

Thanh định dạng dùng khả năng chỉnh sửa sẵn của trình duyệt (`execCommand`, API cũ còn được trình duyệt hỗ trợ); có chế độ Wiki khi lệnh định dạng không được hỗ trợ. Chưa cung cấp editor đầy đủ cho macro/plugin Jira, dán ảnh hay mọi kiểu nội dung phong phú. Ảnh trong mô tả đã lưu tiếp tục dùng cơ chế xem ảnh của phiên bản trước.

## Phiên bản tiếp theo — đề xuất

**V1.27.0 — Mẫu Subtask:** lưu mẫu Summary, Sub-task Type, Estimate và Description; chọn mẫu, chỉnh lại rồi xác nhận tạo dưới công việc cha đang xem. Kiểm tra lại loại và lựa chọn hợp lệ theo dự án trước khi áp dụng. Chưa xây dựng.

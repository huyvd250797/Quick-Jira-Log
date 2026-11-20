# Quick Jira Log V1.40.4 — Seamless Theme Blending

Sửa mép ảnh của 10 chủ đề mới để hòa mềm vào nền như chủ đề 20/11 cũ, cho cả lightmode và darkmode.

- Nguyên nhân: lớp hòa ảnh trước đây nằm trên khung ngoài; ảnh 3:1 nằm lọt bên trong nên các mép ảnh vẫn cứng. Chuyển lớp hòa lên đúng mặt phẳng ảnh và đối tượng động, làm mềm đủ bốn mép và bỏ nền màu phụ phía sau.
- Dùng cùng tỷ lệ chuyển tiếp như ảnh 20/11: ngang 0–20% và 95–100%, dọc 0–8% và 88–100%. Căn phải mặt phẳng ảnh; không kéo méo hay thay đổi ảnh đã duyệt.
- Áp dụng cho Tết Dương lịch, Nguyên Tiêu, Quốc tế Phụ nữ, Giỗ Tổ Hùng Vương, Đoan Ngọ, Gia đình Việt Nam, Vu Lan, Quốc khánh, Phụ nữ Việt Nam và Văn hóa Việt Nam.
- Dùng chung ở dashboard, đăng nhập, splash và xem trước. Giữ chiều cao PC 136px, mobile clamp(104px,31vw,142px), palette và hiệu ứng hiện có. 10 chủ đề cũ, lịch và cấu hình tài khoản không thay đổi.
- Bổ sung tài nguyên mặt nạ vector seasonal-feather.svg vào cache PWA V1.40.4. Không cần migration cơ sở dữ liệu. Sau khi deploy, cập nhật PWA để nhận CSS và tài nguyên mới.

Kiểm tra: npm test PASS; npm run test:blend-render PASS 40 trường hợp (10 chủ đề × 2 chế độ × 2 kích thước khung), kiểm tra mép hòa nền, vùng chi tiết không bị trống và tái hiện nguyên nhân khung ảnh cũ. Test render cần Sharp trong môi trường QA, không thêm dependency chạy app. Browser test đã bổ sung kiểm tra computed style nhưng Chromium bị môi trường chặn khởi chạy; chưa nghiệm thu toàn trang hoặc đo FPS trên thiết bị thật. Chưa push/deploy trong lần bàn giao.

Bản tiếp theo đề xuất: V1.40.5 — Theme Device QA, nghiệm thu PC/iPhone và hiệu chỉnh theo phản hồi; chưa xây dựng.

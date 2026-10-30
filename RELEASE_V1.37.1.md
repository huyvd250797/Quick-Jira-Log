# V1.37.1 — Thống kê dự án: Hiệu chỉnh block chỉ số

- Khôi phục nền KPI như trước V1.37.0: xanh nhạt theo primary-soft ở giao diện sáng, #1b3555 ở giao diện tối, áp dụng cả bốn block.
- Mobile dưới 900px hiển thị nhãn thành hai dòng: Ngày / (Man-days); không tách riêng chữ days.
- Giá trị thập phân được phép xuống dòng sau dấu phẩy, toàn bộ phần thập phân luôn đi cùng nhau. Ví dụ 1.202,95 → dòng trên 1.202, và dòng dưới 95 nếu không đủ chỗ; đủ rộng thì vẫn một dòng.
- Không mất/làm tròn thêm chữ số. Nếu riêng phần nguyên quá dài so với block, co cỡ chữ vừa đủ cho phần nguyên; tự tính lại khi thay đổi chiều rộng. Giữ bốn block cùng hàng.
- Không đổi thuật toán, API, dữ liệu thống kê, quyền Jira, logwork hoặc OT.

Nâng cấp: triển khai toàn bộ source như README với Node 24; PWA sẽ nhận V1.37.1. Không đổi biến môi trường/DB/dependency. Có thể rollback bằng source V1.37.0. Chưa push/deploy.

Kiểm tra: 50 bộ nghiệp vụ/API, browser thống kê 1440/390/320/844px (sáng/tối, màu nền, hai dòng nhãn, số 1.202,95 / 12.345.678,95 / 0,05 / 1.202,9 / số nguyên, không tràn block, giữ phần thập phân), hồi quy các luồng thống kê và native PWA live-update. Jira dùng dữ liệu mô phỏng; chưa xác minh Jira công ty hoặc iPhone/Safari vật lý.

Đề xuất kế tiếp vẫn là V1.38.0 — Logwork từ Tra cứu: chọn nhiều Subtask rồi chuyển sang Log tất cả hiện có. Chưa xây dựng.

# Quick Jira Log V1.34.5 — Lớp tối lịch đã log & hướng dẫn ngày/tuần

## Thay đổi

- Trong **xem trước Log tất cả**, worklog đã log giữ màu gốc nhưng có lớp đen trong suốt **28% phủ toàn bộ block**, gồm cả nội dung, thay cho inset shadow chỉ làm tối nền. Nháp mới không phủ lớp này; lịch thường ngoài xem trước giữ nguyên màu và cơ chế swap lịch thật khi đáp ứng.
- Hướng dẫn chia thành **Theo ngày**, **Theo tuần**, rồi **Xem trước → chỉnh → xác nhận**. Mỗi chế độ giải thích bật/tắt Phân bổ tự động và có ví dụ: ngày còn6h/3 Subtask; tuần trống40h/5 Subtask. Nhắc trường hợp không đủ chỗ/ít Subtask và ngày cuối cùng sau khi kéo.
- Khung nhắc ở đầu: **Mỗi Subtask chỉ log trong một ngày**; được tách sáng/chiều cùng ngày, không chia qua hai ngày. Quy tắc kiểm tra dữ liệu hiện có không thay đổi.
- Bấm **Đã hiểu**: modal thu nhỏ và di chuyển về đúng icon **i** trong380ms, nền tối nhạt dần, icon sáng nhẹ khi nhận. Giữ modal trong lúc chuyển động, chống bấm lặp, trả focus về i. Tôn trọng Giảm chuyển động: đóng ngay, không thu/phóng. Nếu icon ở ngoài màn hình, chỉ fade ngắn tại chỗ.
- Giữ tự mở hướng dẫn và ghi nhớ Không hiện lại theo tài khoản trên thiết bị. Chỉ Đã hiểu ghi lựa chọn; X/Escape không ghi. Đóng/đổi tài khoản hủy chuyển động, không trả focus về màn hình cũ.

## Quy tắc thao tác lịch

- **Lịch thông thường của mình:** vẫn đổi chỗ các lịch thật nếu đủ chỗ, lưu tạm rồi xác nhận cập nhật Jira.
- **Xem trước Log tất cả:** chỉ lịch nháp được đổi chỗ hoặc xếp trùng có xác nhận với nhau. Lịch đã log chỉ xem; không sửa, xóa hoặc đặt nháp đè lên. Backend đối chiếu lại trước khi ghi như1.34.4.
- Không đổi thuật toán phân bổ, dữ liệu/API, quyền Jira, Overtime, request ID hay xử lý lỗi một phần/unknown. Không thêm dependency runtime, database hoặc biến môi trường.

## Chạy và nâng cấp

Giải nén **Quick-Jira-Log_v1.34.5.zip**, mở thư mục **Quick-Jira-Log-V1.34.5**; dùng Node24.x và cấu hình Vercel/APP_SESSION_SECRET hiện có.

```bash
npm ci
npm test
# UI dùng Playwright/Chromium riêng cho QA, không đóng gói trong source:
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:batch-ui
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:update-live
```

Giữ dữ liệu đăng nhập/cài đặt và checkbox hướng dẫn cũ. Version shell/cache được tăng1.34.5 để luồng cập nhật PWA tải tài nguyên mới. Hướng dẫn local, GitHub, Vercel và xử lý lỗi đầy đủ ở phần triển khai kế thừa bên dưới. Chưa push/deploy; chưa thử Jira công ty hoặc Safari/iPhone thật. Xem `TESTING.md` cho kết quả kiểm tra.

**Tiếp theo đề xuất V1.35.0 — Phân tích Sub-task Type theo thành viên:** thống kê giờ, tỷ trọng, số Subtask theo trường Jira thật; bấm nhóm để xem chi tiết. Chưa xây dựng.

# Quick Jira Log V1.34.3 — Tuần trong ô chọn & kéo lịch ngày sang ngày khác

## Thay đổi chính

- **Tuần logwork**: khoảng tuần nằm ngay trong khung chọn, không còn dòng bên ngoài. Bấm vào ô vẫn mở calendar ngày; chọn ngày nào thì ô hiển thị T2–CN của tuần chứa ngày đó. Ví dụ chọn 28/10/2026 → **26/10/2026 – 01/11/2026**. Dùng native date input trong lớp hiển thị khoảng tuần, có focus/nhãn hỗ trợ truy cập.
- Cạnh **Phân bổ tự động** có icon **i**. Bấm mở modal hướng dẫn bật/tắt tự động, nhập TimeSpent, log theo ngày/theo tuần, co giãn, đổi chỗ, xếp trùng và xác nhận ghi.
- Nút giữ tên **Xem trước logwork**. Khi chuẩn bị đổi thành **Đang xử lý…**; chỉ thanh progress hiển thị %, không lặp % trên nút.
- Nhấn giữ trên mobile vào chế độ chỉnh sửa sẽ thấy dấu ngang ở cạnh dưới block, để kéo tăng/giảm giờ. Sửa CSS từng ghi đè grid bằng block khiến dấu ngang không được vẽ rõ. Vùng kéo vẫn đủ rộng; dấu ngang gọn trong cạnh dưới, không lấn sang block kế tiếp.

## Log theo ngày: phân bổ một ngày, chỉnh trong cả tuần

1. Chọn **Theo ngày**, ví dụ 20/10/2026; auto hoặc nhập TimeSpent như trước.
2. **Xem trước logwork** chỉ phân bổ ban đầu vào ngày20/10. App đồng thời đọc lịch/giờ đã log của cả tuần T2–CN để có ngữ cảnh khi chỉnh, không tự rải Subtask sang các ngày khác ở bước ban đầu.
3. Các worklog đã có được hiện bằng nền trung tính tối/nhạt hơn và nhãn **Đã log**. Không có tay nắm sửa/xóa; không bị đổi chỗ khi thao tác bản nháp. Nếu không đọc được tên worklog nhưng day-audit có giờ bận, vẫn hiện khung giờ bận chỉ xem.
4. Có thể kéo Subtask nháp sang ngày khác **trong tuần đang xem**, kể cả T7/CN ở chế độ ngày. Tổng thời lượng và tất cả các phần của cùng Subtask chuyển cùng ngày, không chia một Subtask qua hai ngày.
5. Ví dụ kéo từ20/10 sang21/10 lúc13:30: dòng xác nhận hiển thị21/10; app kiểm tra lại21/10 và POST exact-plan với `date=2026-10-21`, không dùng ngày20/10 ban đầu.
6. Giữ đổi chỗ giữa nhóm nháp, co giãn/tách trưa, bỏ khỏi lượt log và cảnh báo xếp trùng của V1.34.2. Worklog đã có trên Jira vẫn nguyên trạng; nếu đặt đè thì phải chấp nhận cảnh báo xếp trùng. Không tự sửa/xóa worklog cũ.

**Theo tuần** vẫn tự phân bổ/chỉnh nháp trong **T2–T6**, trừ T7/CN; lịch đã có ở cuối tuần vẫn được hiển thị để tham khảo. Ngày nghỉ trưa/ngoài khung08:00–12:00,13:30–17:30 vẫn không được log giờ thường. Mỗi Subtask vẫn tối đa8h trong một ngày.

## Tính chính xác và tải dữ liệu

- Tách `allocationDates` (ngày phân bổ ban đầu), `reviewDates` (7 ngày hiển thị) và `dates` (ngày được thả vào:7 ngày cho mode ngày, T2–T6 cho mode tuần).
- Đọc day-audit cả7 ngày với tối đa2 lane; lịch sử chạy song song, có kiểm tra tài khoản. Chỉ dựng preview khi đã biết đầy đủ giờ bận; lỗi đọc audit không tự mở vùng chưa xác định để ghi.
- Trước khi ghi, đối chiếu lại những ngày đích có Subtask chưa gửi, server tiếp tục guard exact-plan. Quyền Jira/idempotency/rollback/unknown và xác nhận xếp trùng giữ nguyên. Không tự retry dòng không rõ kết quả.
- Chưa xác nhận thì không ghi. Đóng preview quay lại cấu hình ban đầu; bản nháp chỉ trong phiên đang mở, không tự phát lại sau reload.

## Cài đặt và kiểm thử

Giải nén **Quick-Jira-Log_v1.34.3.zip**, vào **Quick-Jira-Log-V1.34.3**. Node24.x, giữ nguyên Vercel và APP_SESSION_SECRET:

```bash
npm ci
npm test
# UI cần Playwright + Chromium riêng cho QA:
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:batch-ui
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:compact
QJL_CHROMIUM_PATH=/path/to/chromium npm run test:update-live
```

Không thêm dependency runtime/database/env/migration. Version/cache/PWA đồng bộ1.34.3. Giữ cơ chế cập nhật khi app đang mở; cần deploy source mới để thiết bị nhận bản này. README phía dưới kế thừa hướng dẫn GitHub/Vercel/local.

Đã kiểm thử API với Jira giả lập và Chromium PC/mobile bốn kích thước, chuột/cảm ứng mô phỏng; chưa thử Jira công ty hoặc Safari/iPhone thật. Chưa push/deploy.

**Kế tiếp đề xuất V1.35.0 — Phân tích Sub-task Type theo thành viên**: giờ, tỷ trọng và số Subtask theo custom field thật; mở nhóm xem worklog. Chưa xây dựng.

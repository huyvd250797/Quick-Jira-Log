# Quick Jira Log V1.34.0 — Log tất cả theo ngày/tuần trên lịch xem trước

## Cách sử dụng

1. Mở **Log tất cả**, chọn ngày và chế độ **Theo ngày** hoặc **Theo tuần**. Ngày được chọn xác định tuần T2–T6; chế độ ngày vẫn cho chọn riêng T7/CN như trước.
2. Mặc định bỏ chọn **Giữ giờ đã nhập**: app chia giờ trống cho các Subtask trong phạm vi. Bật tùy chọn này nếu muốn giữ thời lượng đã nhập, rồi app tìm ngày đủ chỗ cho từng Subtask.
3. Bấm **Phân bổ giờ**, hoặc nút Log tất cả/Xem lịch tuần khi tất cả dòng là giờ thường. App kiểm tra giờ trống ở nền, tối đa hai ngày song song, rồi mở lịch tuần xem trước; chưa gửi lệnh ghi Jira.
4. Các block **Chưa log** là bản nháp. PC kéo thả; mobile nhấn giữ để chỉnh. Dùng cơ chế đổi chỗ, gom nhóm tách khi kéo, tự tách qua giờ nghỉ và kéo cạnh block đơn đổi thời lượng như lịch hiện tại. Block đã có trên Jira chỉ xem và không được thay đổi/đổi chỗ trong bản xem trước này. Có thể thu phóng và fullscreen.
5. Bấm **Xác nhận & Log tất cả** hoặc icon lưu để xem danh sách ngày/giờ từng Subtask. Xem kỹ mục chưa phân bổ; các mục này không được ghi. Bấm **Xác nhận log** mới ghi lên Jira.
6. App đối chiếu lại các ngày cần ghi trước khi bắt đầu, sau đó server kiểm tra quyền/loại Subtask/giờ trống và ghi đúng từng đoạn đã xác nhận. Lưu lần lượt từng Subtask; các đoạn cùng một Subtask dùng cơ chế rollback của Bulk hiện có nếu lỗi tạo.

## Quy tắc phân bổ

- Mỗi Subtask chỉ thuộc **một ngày trong lượt phân bổ**. Có thể nhiều đoạn trong cùng ngày, không tách sang ngày thứ hai. Khi kéo nhóm tách, di chuyển toàn bộ nhóm; không giữ một phần ở ngày cũ.
- Phạm vi tuần chỉ T2–T6; giờ thường chỉ 08:00–12:00 và 13:30–17:30. Không xếp đè giờ đã log, không dùng OT để bù giờ thường, không đổi worklog đã có.
- Chế độ chia tự động ưu tiên phủ các ngày còn trống (ngày nhiều chỗ trước), sau đó chia thêm Subtask theo mức giờ trống trên mỗi Subtask; chia giờ trong mỗi ngày theo mốc 30 phút và dùng phần dư cuối cùng. Giữ thứ tự ngày khi mức khả dụng bằng nhau. Không hứa chia bằng nhau tuyệt đối giữa mọi ngày vì mỗi Subtask phải nằm trọn một ngày.
- Nếu số Subtask quá ít để dùng hết giờ trống của cả tuần, app để lại phần giờ chưa dùng, không trải một Subtask qua nhiều ngày. Ví dụ 2 Subtask không thể phủ 40h tuần nếu mỗi ngày tối đa 8h.
- Chế độ giữ giờ: tìm ngày sớm nhất còn đủ tổng chỗ trong một ngày; có thể ghép các khoảng trống cùng ngày. Dòng sai thời lượng/không đủ chỗ được ghi rõ ở mục chưa phân bổ. Auto tối thiểu 30 phút/Subtask, giữ giờ cho phép phút lẻ theo quy tắc nhập hiện có.
- Trong preview, mọi đổi giờ/ngày/đổi chỗ/thời lượng đều được kiểm tra lại toàn bộ nhóm, khung giờ và các khoảng đã log; không chỉ đổi hình vẽ.
- OT không nằm trong tính năng phân bổ tuần này. Luồng log đơn và log ngày có chọn OT vẫn dùng cơ chế native WorklogPRO đã có; nếu chọn OT rồi bấm phân bổ tuần, app yêu cầu tách xử lý OT.

## Kết quả từng Subtask và chống gửi trùng

- **Đã log**: khóa block, chuyển nhãn; không gửi lại khi tiếp tục phần còn lại. Nếu ghi giờ thành công nhưng chuyển trạng thái Jira chưa được, hiển thị ghi chú riêng.
- **Lỗi đã xác định chưa ghi/đã rollback**: giữ bản nháp; có thể chỉnh rồi chủ động xác nhận thử lại.
- **Cần kiểm tra Jira**: mất phản hồi, lỗi máy chủ hoặc hoàn tác chưa xác định; khóa dòng, không tự gửi lại. Có liên kết mở Jira để kiểm tra thủ công. Các dòng chưa gửi vẫn có thể tiếp tục sau xác nhận.
- Dùng request ID ổn định của từng Subtask và cơ chế idempotency hiện có; không coi riêng idempotency trong RAM là bảo đảm qua mọi lần khởi động server.
- Đóng preview cần xác nhận. Các bản nháp chưa ghi bị bỏ; worklog đã ghi được giữ nguyên. Bản này giữ preview trong phiên đang mở, **không tự phục hồi hay tự phát lại lệnh ghi sau reload**. Checkpoint thống kê dự án vẫn giữ nguyên, không lưu block ảo của preview vào lịch được phục hồi.

## Cài đặt và cập nhật

Giải nén **Quick-Jira-Log_v1.34.0.zip**, mở **Quick-Jira-Log-V1.34.0**. Node24.x:

```bash
npm ci
npm test
```

Giữ nguyên APP_SESSION_SECRET và cấu hình Vercel đang dùng. Không thêm dependency runtime, biến môi trường, database hoặc migration. PWA/cache 1.34.0 bổ sung batch-calendar.js/css và lib/batch-plan.js. Không cần xóa dữ liệu website. Hướng dẫn GitHub/Vercel/local được kế thừa bên dưới; chưa push/deploy.

Kiểm thử UI cần Playwright/Chromium cài riêng cho QA: `QJL_CHROMIUM_PATH=/path/to/chromium npm run test:batch-ui`. Xem TESTING.md và RELEASE_V1.34.0.md. Đã kiểm thử Jira giả lập và cảm ứng mô phỏng; chưa kiểm chứng Jira công ty/Safari trên iPhone vật lý.

**Kế tiếp đề xuất V1.35.0 — Phân tích Sub-task Type theo thành viên:** giờ/tỷ trọng/số Subtask theo trường thật trên Jira và mở từng nhóm. Đề xuất cũ V1.34.0 được dời sang V1.35.0; chưa triển khai.


## Thay đổi kỹ thuật

lib/batch-plan.js dùng chung validator/allocator. Handler bulk-worklog nhận exactPlan tùy chọn; giữ nhánh legacy, xác thực subtype, tổng phút, ngày và collision trước ghi; lỗi transition401 sau khi tạo ở nhánh exact trả warning thay vì làm kết quả tạo giờ bị hiểu là chưa ghi. batch-calendar.js tích hợp lịch nháp và xác nhận riêng; app/calendar-interactions/resume-state bảo vệ phạm vi, snapshot và không lưu block ảo. Asset/version/tests được cập nhật.

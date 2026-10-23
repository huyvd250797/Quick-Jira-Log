# Quick Jira Log V1.33.0 — Đối chiếu Overtime & thẻ tiến độ linh hoạt

## Thay đổi chính

- Đọc Overtime trực tiếp từ thuộc tính WorklogPRO khi endpoint hỗ trợ; tự quay về luồng đọc native nếu không tương thích. Kiểm tra đúng worklog ID, metadata thuộc tính mới theo từng lô và quyền Jira; dữ liệu chưa đọc được vẫn là **Chưa rõ OT**. Không suy ra Overtime từ mô tả hoặc giờ làm.
- Thăm dò một worklog trước, sau đó xử lý tối đa 50 ID/lô, hai lô song song, tối đa 10 lượt đọc/lô. Tránh lặp thăm dò endpoint không hỗ trợ. Không thay đổi luồng ghi/sửa/logwork hoặc xác minh sau ghi.
- Thẻ nền kéo được **ngang và dọc ngay trong màn hình thống kê**, cũng như ở màn hình khác. Trên mobile, kéo đến mép trái/phải để thu thành nút nhỏ có phần trăm; kéo vào trong để mở rộng, chạm để mở thống kê.
- Nút sát mép tiếp tục tăng tiến độ; hoàn tất hiện check xanh và giữ đến khi mở/xác nhận hoặc bắt đầu báo cáo mới. Nếu báo cáo và vị trí đã lưu thành công, mở lại app khôi phục trạng thái này. Kết quả thiếu/lỗi có dấu cảnh báo, không dùng check thành công.
- Ước tính thời gian dựa trên tốc độ thực tế, xuất hiện sau ít nhất hai lần tăng tiến độ và hai giây lấy mẫu. Giai đoạn đầu hiển thị thời gian **của bước hiện tại**; khi đối chiếu OT là bước cuối thì hiển thị thời gian còn lại. Tạm dừng/mở lại phải học tốc độ mới; chờ quá 15 giây không tiến lên sẽ báo đang chờ Jira. Đây là ước tính, có thể thay đổi theo mạng và máy chủ.

## Cách đọc tiến độ

Trong màn hình thống kê, X/Y và % là tiến độ bước đang chạy. Thẻ nổi dùng % tổng thể theo trọng số: tìm công việc 0–20%, đọc worklog 20–60%, đối chiếu OT 60–100%. Các giá trị tăng theo số bản ghi thực tế, không tự chạy theo thời gian; chưa biết tổng thì hiển thị dấu chờ. 100% xử lý không có nghĩa dữ liệu thiếu quyền hoặc lỗi đã trở thành đầy đủ.

## Cập nhật và kiểm thử

Giải nén **Quick-Jira-Log_v1.33.0.zip**, mở **Quick-Jira-Log-V1.33.0**; Node24.x, chạy `npm ci` và `npm test`. Giữ nguyên cấu hình/APP_SESSION_SECRET. Không thêm package runtime, database, biến môi trường hoặc migration. PWA version/cache tăng 1.33.0 và bổ sung lib/progress-eta.js. Không cần xóa dữ liệu website; checkpoint báo cáo được kế thừa. Vị trí thẻ lưu bằng qjl-task-position-v2 và đọc tương thích vị trí cũ, không lưu thêm thông tin đăng nhập.

Đã kiểm thử unit/API và Chromium ở PC, mobile dọc/ngang, gồm cảm ứng mô phỏng thực sự để kéo hai trục trong modal, dock/undock, check sau hoàn tất và reload, ETA, pause/resume, checkpoint và hồi quy luồng ghi. Benchmark giả lập 200 ID với độ trễ cố định cho kết quả OT khớp tuyệt đối, giảm khoảng 175ms xuống 105ms trong một lượt chạy; không đại diện thời gian trên Jira thật. Chưa kiểm chứng Jira công ty/Safari trên iPhone vật lý; chưa push/deploy. Xem TESTING.md và RELEASE_V1.33.0.md.

**Kế tiếp đề xuất: V1.34.0 — Phân tích Sub-task Type theo thành viên:** phân bổ giờ theo custom field thật và mở công việc trong từng loại. Chưa xây dựng/chưa chốt.


## Phạm vi source

lib/stats-overtime.js, handlers/project-stats.js, project-stats.js: đường đọc OT thống kê. lib/progress-eta.js: ETA/% tổng thể. loading-feedback.js/css: vị trí, dock, modal host và receipt. index/sw/manifest/app/package: asset/version. Không thay đổi API ghi Jira hoặc WorklogPRO.

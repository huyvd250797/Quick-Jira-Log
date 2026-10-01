# Quick Jira Log V1.6.0 – Daily Capacity & Fast Logwork

Nâng cấp trực tiếp từ **V1.5.2 – Unified Time Presets UI**.

## Thay đổi chính

- Mobile **Log tất cả** dùng bottom sheet cao hơn để nhìn được nhiều Sub-task hơn trong một màn hình.
- Cụm nút **LOG TẤT CẢ / HỦY** được ghim sát đáy bottom sheet, nền action bar phủ tới safe-area để không còn khoảng hở khó chịu.
- Bổ sung **Tiến độ giờ thường / 8h** trong Bulk: hiển thị **Đã log trước đó + Đang nhập = Tổng dự kiến / 8h** theo ngày đang chọn.
- Nếu chưa đủ 8h, app hiển thị phần còn thiếu; đủ 8h hiển thị trạng thái hoàn tất; vượt 8h cảnh báo và chặn submit giờ thường.
- Thời gian **OT** được hiển thị riêng và không cộng vào mốc 8h giờ thường.
- Tối ưu tốc độ kiểm tra timeline Jira: các nguồn kiểm tra recent/delta chạy song song và dùng fast stable guard khi đã có nguồn realtime đáng tin cậy.
- Tối ưu **Log 1**: kiểm tra timeline + preflight OT chạy song song; các segment worklog có thể tạo song song có giới hạn và vẫn rollback khi lỗi.
- Tối ưu **Log tất cả**: đọc issue có giới hạn concurrency, preflight OT song song, tạo worklog song song có giới hạn, cập nhật OT song song và transition nhiều issue song song.
- Tối ưu workflow **To Do → In Progress → Done**: bỏ một lần GET issue thừa sau transition In Progress và giảm khoảng chờ kỹ thuật.
- Giữ nguyên cơ chế chống overlap, giới hạn 8h giờ thường, idempotency, rollback và 01 Vercel Serverless Function.
- Preset TimeSpent tiếp tục thống nhất: **30m / 1h / 2h / 3h / 4h**.

## Thông tin

**© 2026 HuyVo. All rights reserved.**

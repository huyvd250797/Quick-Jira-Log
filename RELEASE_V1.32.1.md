# Quick Jira Log V1.32.1

Theo yêu cầu Boss: sửa nền bị cuộn khi xem thống kê, tăng tốc đọc worklog, làm nổi thẻ chạy ngầm và bấm logo refresh tại chỗ.

## Kết quả

- Fixed-body lock và chặn scroll chain bên ngoài/tại biên; chuyển khóa từ lịch và bảo vệ trước delayed unlock; đóng trả lại vị trí.
- Search lấy thêm worklog; dùng trang đầy đủ đã xác thực, fallback nguyên luồng khi thiếu/cắt/sai/mâu thuẫn/vượt ngân sách. Giảm GET thừa mà không bỏ trang hoặc đoán giờ từ timespent.
- Thẻ nền có grip, border/shadow/surface riêng, drag state sáng/tối.
- Logo refresh đọc dashboard/Subtask, giữ trạng thái và không reload hoặc restart thống kê.
- Chẩn đoán lưu cục bộ, retry mở kết nối phù hợp; không ghi cursor vượt trang thất bại; phục hồi checkpoint thiếu trang và dữ liệu embedded.

## Kiểm tra

Unit/API, fixture 1.000 issue cần 10 thay vì 1.010 request đọc giờ (không tính OT/metadata), tổng giây khớp. Chromium bốn viewport: background loading/scroll/wheel/touch/restore position/logo giữ input và runID/không navigation, embedded fallback/restore, checkpoint hole repair/quota/account và layout light/dark. Hồi quy calendar-experience, parent-edit và editor ảnh. Xem TESTING.md cho kết quả và đối chiếu sau deploy.

Chưa dùng Jira công ty/Safari iPhone thật, chưa benchmark thời gian thực tế. Không chốt nguyên nhân lỗi lưu từ ảnh vì ảnh thiếu mã lỗi gốc; bản này báo rõ mã để phân biệt quota/quyền/kết nối và bảo vệ độ đúng của checkpoint. Không thêm dependency/migration/server database. Chưa push/deploy.

## Nâng cấp / rollback / kế tiếp

Nâng cấp không cần xóa dữ liệu website; đọc được checkpoint V1.32.0. Sau rollback về 1.32.0 phải chạy lượt thống kê mới, không dùng checkpoint có embedded worklog của 1.32.1. Không thay đổi dữ liệu Jira bằng tác vụ thống kê.

V1.33.0 — Phân tích Sub-task Type theo thành viên vẫn là đề xuất chưa xây dựng.

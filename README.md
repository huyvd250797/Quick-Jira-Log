# Quick Jira Log V1.6.3 – Jira Auth Reliability & CAPTCHA Guard

Nâng cấp trực tiếp từ **V1.6.2 – Desktop Modal & Capacity Sync**.

## Thay đổi chính

- Một lần bấm **Đăng nhập** chỉ tạo tối đa **01 failed authentication attempt** khi Jira trả 401/403; không còn tự động thử thêm Basic Auth sau lỗi xác thực.
- Chỉ fallback sang HTTP Basic Auth nếu `/rest/auth/1/session` thực sự không được Jira hiện tại hỗ trợ (404/405/501).
- Nhận diện `X-Seraph-LoginReason` để phân biệt **CAPTCHA/xác minh bảo mật**, sai tài khoản/mật khẩu và thiếu quyền REST.
- Khi Jira yêu cầu CAPTCHA, hiển thị panel riêng với nút **MỞ JIRA ĐỂ XÁC MINH** dẫn trực tiếp đến `https://task.ascvn.com.vn/` và nút **TÔI ĐÃ XÁC MINH – THỬ LẠI**.
- Không tự retry sau CAPTCHA. Người dùng chủ động xác minh trên Jira rồi mới yêu cầu app thử lại đúng 01 lần.
- Chống spam Login: tối đa 2 lần thử thường trong 30 giây; sau 2 lần sai phía client tạm khóa 30 giây để giảm nguy cơ Jira kích hoạt CAPTCHA.
- Username/password không được ghi vào log kỹ thuật. Auth diagnostic chỉ ghi phase, HTTP status, `X-Seraph-LoginReason`, category và duration.
- Giữ nguyên toàn bộ luồng Log 1, Log tất cả, Daily Capacity, OT, Planner, History, rollback, chống overlap và desktop/mobile modal của V1.6.2.

## Thông tin

**© 2026 HuyVo. All rights reserved.**

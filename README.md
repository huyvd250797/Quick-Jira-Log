# Quick Jira Log V1.6.5 – Jira Auth Classification Fix

Nâng cấp trực tiếp từ **V1.6.4 – Late Worklog Friendly Warning**.

## Mục tiêu bản vá

Sửa lỗi phân loại Authentication có thể làm app báo **Jira yêu cầu CAPTCHA** ngay khi người dùng chỉ mới nhập sai mật khẩu.

## Logic Authentication sau khi sửa

- `401` không có `X-Seraph-LoginReason` → **Sai username/password**.
- `401 + AUTHENTICATED_FAILED` → **Sai username/password**, không hiện CAPTCHA.
- `401 + AUTHENTICATION_FAILED` → **Sai username/password**, không hiện CAPTCHA.
- `401/403 + AUTHENTICATION_DENIED` → **Jira yêu cầu CAPTCHA/xác minh bảo mật**.
- Session login thành công nhưng `/rest/api/2/myself` trả `403` → **Không có quyền REST cần thiết**.
- Mỗi lần bấm Login khi Jira trả `401/403` vẫn chỉ tạo **01 authentication attempt**, không fallback Basic gây tăng failed-login count.

## CAPTCHA Guard giữ nguyên

Khi Jira thật sự trả `AUTHENTICATION_DENIED`, app hiển thị panel xác minh với:

- **MỞ JIRA ĐỂ XÁC MINH** → `https://task.ascvn.com.vn/`
- **TÔI ĐÃ XÁC MINH – THỬ LẠI** → chủ động thử lại đúng 01 lần.
- Không tự động retry CAPTCHA.
- Giữ cơ chế cooldown/chống spam login để hạn chế đẩy tài khoản vào CAPTCHA.

## Regression tests bổ sung

- `401 + AUTHENTICATED_FAILED` → `JIRA_INVALID_CREDENTIALS`.
- `401 + AUTHENTICATION_FAILED` → `JIRA_INVALID_CREDENTIALS`.
- `403 + AUTHENTICATION_DENIED` → `JIRA_CAPTCHA_REQUIRED`.
- Chuỗi nhiều lần sai password: các lần đầu vẫn báo sai credentials; chỉ chuyển CAPTCHA khi Jira thật sự trả `AUTHENTICATION_DENIED`.
- Kiểm tra mỗi lần đăng nhập sai chỉ gọi `/rest/auth/1/session` đúng 01 lần.
- Giữ regression test session login, Basic fallback khi endpoint session không hỗ trợ, và quyền REST.

## Tính năng giữ nguyên từ V1.6.4

- Cảnh báo thân thiện khi logwork từ N-2 trở về trước, không chặn log và không thay thế thông báo thành công.
- Daily Capacity 8h, OT, chống overlap, Planner, History, rollback.
- Log 1/Bulk, desktop modal, mobile bottom sheet, sticky capacity header và preset thời gian.

## Thông tin

**© 2026 HuyVo. All rights reserved.**

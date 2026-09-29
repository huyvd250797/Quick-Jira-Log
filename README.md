# Quick Jira Log V0.9.0 – Production Hardening

Web app cá nhân để logwork nhanh vào `https://task.ascvn.com.vn`.

## Điểm mới V0.9.0

### 1. Bỏ Saved Filter, dùng JQL cố định đúng nghiệp vụ
App không còn cho chọn Jira Filter nữa. Mọi tài khoản đăng nhập đều tự tải danh sách Sub-task theo cùng điều kiện:

```jql
issuetype = Sub-task
AND assignee = currentUser()
AND createdDate > "2025-10-19"
AND (timespent is EMPTY OR timespent = 0)
```

App bổ sung `ORDER BY created DESC` chỉ để sắp xếp danh sách mới nhất trước.

Nhờ vậy:
- không lẫn Story/Bug/Task;
- không phụ thuộc user đã tạo Saved Filter hay chưa;
- mọi tài khoản dùng cùng một quy tắc lấy Sub-task chưa logwork.

### 2. Production Hardening
- Chống double-submit ở client cho Log Work/Bulk.
- Mỗi mutation có `requestId` riêng.
- Backend có idempotency cache best-effort để request lặp cùng ID không tạo worklog lần hai trong cùng runtime.
- Jira GET/HEAD tự retry/backoff khi gặp `429/502/503/504`.
- Không tự retry POST/PUT/DELETE để tránh tạo worklog trùng.
- Login rate limit best-effort: 8 lần / 5 phút / user+IP.
- Session cookie đổi sang `SameSite=Strict`, `Secure`, `HttpOnly`, `Priority=High`.
- Bổ sung CSP, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy`, no-cache cho API.
- API payload lỗi/quá lớn trả lỗi rõ ràng hơn.

### 3. Giữ nguyên Worklog Guard
App vẫn quét worklog thật của user trong ngày trước khi log và chỉ dùng:
- 08:00–12:00
- 13:30–17:30

Không cho overlap với worklog hiện có.

### 4. Giữ nguyên các tính năng V0.8.0
- Splash/loading, nếu còn session thì vào thẳng app.
- Tự chuyển issue sang Done sau khi logwork nếu workflow cho phép.
- Worklog History & Correction trong Settings.
- PWA/mobile UI.
- Bulk Logwork.
- Description Template, recent KEY, quick repeat.

## Deploy Vercel

Environment Variables:

```env
APP_SESSION_SECRET=<random-secret-tối-thiểu-32-ký-tự>
SESSION_MAX_AGE_SECONDS=43200
```

Jira URL được cố định trong source:

`https://task.ascvn.com.vn`

## Version

`V0.9.0`

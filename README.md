# Quick Jira Log V0.2.0

Web app cá nhân để lấy KEY từ Jira Filter và logwork nhanh vào `https://task.ascvn.com.vn` mà không cần mở Jira.

## Flow sử dụng

1. Đăng nhập bằng **ID Jira + Password**.
2. App tự tải saved filter **`[HuyVo] - No Work Logged`**.
3. Tìm hoặc chạm issue cần log → app tự điền **KEY + PROJECT**.
4. Nhập **TimeSpent / Date / Description** rồi bấm **LOG WORK**.

Bạn vẫn có thể nhập KEY/PROJECT bằng tay nếu cần.

## Jira Filter Quick Pick

Backend thử lấy filter theo thứ tự:

1. `/rest/api/2/filter/favourite` – nhanh và tương thích tốt với Jira Server/Data Center.
2. Nếu không có trong Favourite, thử `/rest/api/2/filter/search?filterName=...` trên Jira version có hỗ trợ.
3. Chạy saved filter bằng JQL `filter = <FILTER_ID>` và lấy tối đa 500 issue.

Danh sách hiển thị KEY, Summary, Project, Status, Issue Type và Priority. Chạm issue sẽ tự đưa KEY/PROJECT xuống form.

Sau khi logwork thành công app tự refresh filter nền vì `[HuyVo] - No Work Logged` có thể thay đổi sau khi Jira cập nhật worklog.

## Quy tắc tự xếp giờ

- Ca sáng: `08:00 - 12:00`
- Ca chiều: `13:30 - 17:30`
- Tối đa: `8h/ngày`
- Đọc worklog hiện có của chính tài khoản để tránh chồng giờ.
- Ưu tiên giờ trống sớm nhất.
- Tự chia thành nhiều worklog nếu đi qua giờ nghỉ trưa hoặc gặp worklog đã có.

## Xác thực Jira

App thử:

1. Jira REST session `/rest/auth/1/session`.
2. Fallback HTTP Basic Auth.

Thông tin xác thực được mã hóa AES-256-GCM trong **HttpOnly + Secure cookie**. Password không nằm trong localStorage/frontend.

## Deploy Vercel

Environment variable bắt buộc:

```env
APP_SESSION_SECRET=<chuỗi ngẫu nhiên tối thiểu 32 ký tự>
```

Tạo nhanh:

```bash
openssl rand -hex 32
```

Tùy chọn:

```env
SESSION_MAX_AGE_SECONDS=43200
```

Jira URL và tên filter đã cố định trong `lib/config.js`:

```js
JIRA_BASE_URL = 'https://task.ascvn.com.vn'
JIRA_FILTER_NAME = '[HuyVo] - No Work Logged'
```

Nếu sau này đổi tên filter chỉ cần đổi `JIRA_FILTER_NAME` rồi redeploy.

## Cấu trúc mới V0.2.0

- `api/filter-issues.js`: tìm saved filter + lấy issue list.
- `lib/jira.js`: bổ sung favourite filter, filter search và paginated issue search.
- `app.js`: auto-load filter, search local, chọn KEY/PROJECT, refresh sau logwork.

## Test

```bash
npm test
```

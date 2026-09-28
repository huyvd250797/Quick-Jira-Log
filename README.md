# Quick Jira Log V0.6.2 – Worklog Timezone & Exhaustive Guard Fix

Web app cá nhân để đăng nhập Jira bằng ID/Password và log work nhanh với 5 trường:

- KEY
- PROJECT
- TimeSpent
- Date
- Description

Jira cố định: `https://task.ascvn.com.vn`.

## Quy tắc thời gian

App chỉ được phép tạo worklog trong:

- 08:00–12:00
- 13:30–17:30

Tổng tối đa 8 giờ/ngày. App tự chia worklog khi đi qua giờ nghỉ trưa.

## V0.6.2 có gì mới

### Daily Worklog Planner & Validation

Không thêm bất kỳ block mới nào ra Dashboard. Planner chỉ nằm trong:

`⚙ Cài đặt → Daily Worklog Planner & Validation`

Planner hiển thị:

- giờ đã log trong ngày;
- giờ còn trống;
- tổng thời gian đã bận;
- tổng thời gian còn có thể log;
- số issue/worklog đã quét;
- các nguồn Jira đã dùng để xác thực.

### Worklog Guard V2 – chống trùng giờ

Trước khi xếp giờ, backend hợp nhất nhiều nguồn Jira:

1. `worklogAuthor = currentUser() AND worklogDate = <date>`;
2. tất cả issue có `worklogDate = <date>`, sau đó lọc worklog thật theo author;
3. issue vừa được cập nhật trong 30 phút gần nhất để bắt trường hợp vừa log trực tiếp trên Jira;
4. `/rest/api/2/worklog/updated` + `/rest/api/2/worklog/list` nếu Jira hỗ trợ;
5. issue đang chuẩn bị log luôn được đọc worklog trực tiếp.

Sau đó app mới tính khoảng trống.

Ví dụ Jira đã có:

- 08:00–09:00
- 09:00–09:30

Log thêm `1h` sẽ được xếp từ:

- 09:30–10:30

Không được phép quay lại 08:00–09:00.

### Fail-closed

Nếu backend không thể kiểm tra đủ dữ liệu ngày từ Jira, thao tác log sẽ bị dừng thay vì mạo hiểm tạo worklog trùng.

### Re-validation trước từng segment

Nếu một TimeSpent phải chia thành nhiều segment, trước mỗi segment app quét Jira lại. Worklog vừa phát sinh từ Jira hoặc từ batch hiện tại sẽ được né ra.

## Lưu ý Jira

API `/worklog/updated` của Jira Data Center có thể không trả worklog được cập nhật trong khoảng một phút gần nhất. V0.6.2 bù khoảng này bằng việc đọc các issue vừa cập nhật và đọc worklog trực tiếp trên issue trước khi tạo.

## Environment Variable

Deploy Vercel cần:

```env
APP_SESSION_SECRET=<chuỗi ngẫu nhiên tối thiểu 32 ký tự>
```

Ví dụ:

```bash
openssl rand -hex 32
```

## Test

```bash
npm test
```

Version `V0.6.2` được hiển thị ở Header và Footer.


## V0.6.2 – Fix 401/403 compatibility

- Chỉ HTTP `401` mới được xem là phiên Jira hết hạn và xóa session.
- HTTP `403` được giữ đúng nghĩa là endpoint/quyền không khả dụng, không tự logout.
- `/rest/api/2/worklog/updated` và `/rest/api/2/worklog/list` là nguồn bổ trợ: nếu Jira chặn `403`, app tự fallback sang JQL + worklog theo issue.
- Search JQL thử GET fallback kể cả khi POST search trả `403`.
- Issue đến từ nguồn bổ trợ mà không đọc được worklog sẽ không làm hỏng phiên; riêng target issue hoặc issue mà JQL xác nhận user đã log trong ngày vẫn fail-closed để bảo vệ khỏi trùng giờ.


## V0.6.2 – Worklog Timezone & Exhaustive Guard Fix

- Sửa lỗi đọc `started` bằng cách cắt chuỗi giờ. Mọi timestamp Jira giờ được quy đổi về `Asia/Ho_Chi_Minh` trước khi xác định ngày/giờ bận.
- JQL `worklogDate` quét ngày liền trước + ngày chọn + ngày liền sau để bù khác biệt timezone server của Jira Data Center.
- Thêm nguồn `worklogAuthor=currentUser()` không phụ thuộc worklogDate cho các issue được làm gần đây.
- Với ngày hiện tại, guard quét 2 lần cách nhau 1.2 giây và hợp nhất occupied ranges để giảm rủi ro index delay ngay sau khi log tay trên Jira.
- Vẫn đọc worklog thật của từng issue và chỉ sau đó mới lọc đúng author + ngày + giờ.

# Quick Jira Log V0.6.0 – Daily Worklog Planner & Validation

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

## V0.6.0 có gì mới

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

API `/worklog/updated` của Jira Data Center có thể không trả worklog được cập nhật trong khoảng một phút gần nhất. V0.6.0 bù khoảng này bằng việc đọc các issue vừa cập nhật và đọc worklog trực tiếp trên issue trước khi tạo.

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

Version `V0.6.0` được hiển thị ở Header và Footer.

# Quick Jira Log V0.5.0 – Jira Reliability & Audit

Web app cá nhân để logwork nhanh vào Jira `https://task.ascvn.com.vn`.

## Luồng sử dụng

1. Đăng nhập bằng ID + Password Jira.
2. Chọn Jira Filter của tài khoản hoặc nhập KEY trực tiếp.
3. KEY hợp lệ tự lấy PROJECT + Summary; Description mặc định = Summary.
4. Nhập TimeSpent + Date.
5. App tự xếp giờ trong đúng 2 khung:
   - 08:00–12:00
   - 13:30–17:30
6. App luôn né worklog đã tồn tại của chính tài khoản.

## V0.5.0 có gì mới

### Reliability Guard
- Sửa nhận diện author Jira không phân biệt hoa/thường (`HuyVo`, `huyvo`, `HUYVO` đều được coi là cùng user khi khớp identity).
- Bổ sung username trong session làm identity alias.
- Search issue có worklog theo ngày được phân trang.
- Trước từng segment tạo worklog, app đọc Jira lại và tính slot lại.
- Nếu phát hiện overlap/out-of-window hoặc không đủ giờ thì dừng và rollback worklog vừa tạo trong request.
- Bulk Logwork dùng cùng cơ chế live guard.

Ví dụ Jira đã có:
- 08:00–09:00
- 09:00–09:30

Nhập thêm `1h` thì slot đầu tiên phải là:
- 09:30–10:30

### Filter compatibility
- Không còn phụ thuộc bắt buộc vào `GET /filter/{id}?expand=jql` để chạy filter.
- Search issue thử POST `/rest/api/2/search`; nếu Jira cũ không hỗ trợ phù hợp sẽ fallback GET search.
- Có thể chạy trực tiếp `filter = <ID>`; nếu metadata có JQL thì có thêm fallback JQL.

### Settings & Audit
- Description Template được chuyển khỏi form chính vào nút ⚙ Settings.
- Có Jira Worklog Audit:
  - chọn Date;
  - KEY tùy chọn;
  - đọc Jira trực tiếp;
  - hiển thị các khoảng giờ mà app đang coi là đã bận.
- Lưu lịch sử thành công/thất bại cục bộ trên thiết bị.

## Cấu hình Vercel

Thêm Environment Variable:

```env
APP_SESSION_SECRET=<random-secret-toi-thieu-32-ky-tu>
SESSION_MAX_AGE_SECONDS=43200
```

Có thể tạo secret:

```bash
openssl rand -hex 32
```

Sau đó deploy source lên Vercel.

## Test

```bash
npm test
```

Test bao gồm case quan trọng:

```text
08:00–09:00 đã có
09:00–09:30 đã có
TimeSpent mới: 1h
=> 09:30–10:30
```

## Version

`V0.5.0` hiển thị tại Header và Footer.

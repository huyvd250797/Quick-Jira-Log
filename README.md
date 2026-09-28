# Quick Jira Log V0.7.0 – Mobile PWA & Quick Actions

Web app cá nhân để đăng nhập Jira bằng ID/Password và log work nhanh với 5 trường:

- KEY
- PROJECT
- TimeSpent
- Date
- Description

Jira cố định: `https://task.ascvn.com.vn`.

## Quy tắc thời gian giữ nguyên

App chỉ được phép tạo worklog trong:

- 08:00–12:00
- 13:30–17:30

Worklog Guard của V0.6.2 vẫn được giữ nguyên: đọc worklog Jira, quy đổi timestamp về `Asia/Ho_Chi_Minh`, né toàn bộ giờ đã bận và re-validation trước khi tạo segment.

## V0.7.0 có gì mới

### 1. PWA cho mobile

- Có `manifest.webmanifest`.
- Có Service Worker cache app shell.
- Có icon 192×192, 512×512 và Apple Touch Icon.
- Cài lên Home Screen và chạy `standalone` như app.
- Shortcut `Logwork nhanh` mở app với `/?quick=1` và focus thẳng vào form khi Jira session còn hiệu lực.
- API Jira không được cache bởi Service Worker.

### 2. Quick Actions

Giữ và tối ưu các thao tác nhanh đã có:

- preset `30m / 1h / 2h / 4h`;
- Recent KEY;
- Lặp lại logwork gần nhất;
- nhớ PROJECT / TimeSpent / filter gần nhất;
- chọn issue từ Jira Filter và tự lấy Summary làm Description.

### 3. Giao diện mobile chuyên nghiệp hơn

- card, spacing, màu sắc và hierarchy được tinh chỉnh lại;
- tối ưu safe-area iPhone;
- trạng thái Online/Offline hiển thị cạnh Jira session;
- toàn bộ input/select/date có `min-width:0` và `max-width:100%` để không tràn container;
- `select` dùng arrow riêng, phù hợp khung mobile;
- datepicker được ép đúng chiều rộng card;
- input mobile giữ font-size 16px để Safari không tự zoom khi focus.

### 4. Modal Settings khóa background triệt để

Khi mở `⚙ Cài đặt`:

- body được khóa bằng `position: fixed` tại đúng scroll position hiện tại;
- background không thể scroll;
- đóng modal sẽ trả trang về đúng vị trí trước khi mở;
- chỉ `.settings-sheet` được phép scroll dọc;
- modal `overflow-x:hidden` và `touch-action:pan-y`, không kéo ngang;
- backdrop không nhận gesture scroll;
- header modal sticky để nút đóng luôn truy cập được;
- combobox/datepicker bên trong modal không được phép vượt chiều rộng màn hình.

### 5. PWA Settings

Trong `⚙ Cài đặt → Ứng dụng trên điện thoại`:

- browser hỗ trợ install prompt: có nút `CÀI ỨNG DỤNG`;
- iPhone/iPad: hướng dẫn `Safari → Chia sẻ → Thêm vào Màn hình chính`;
- khi chạy standalone, app hiển thị trạng thái `Đã cài`.

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

Version `V0.7.0` được hiển thị ở Header, Footer và `package.json`.

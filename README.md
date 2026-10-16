# Quick Jira Log V1.9.0 — Time Stepper & Worklog Calendar

Nâng cấp từ V1.8.0 theo yêu cầu của Boss: tăng/giảm thời lượng bằng nút bấm, hiện/ẩn mật khẩu, mở rộng màn hình Worklog đã log và thêm lịch tháng.

© 2026 HuyVo. All rights reserved.

## 1. Chức năng mới và cách dùng

### Tăng/giảm mỗi lần 30 phút

Ô TimeSpent có hai nút mũi tên lên/xuống bên phải, dùng được trong:

- Form Logwork một Sub-task.
- Mỗi dòng Log tất cả.
- Form sửa worklog đã log, kể cả khi mở từ lịch.

Ví dụ: bấm preset `1h` → mũi tên lên → `1h 30m` → lên tiếp → `2h`. Bấm xuống để giảm 30 phút. Trên bàn phím có thể dùng ArrowUp/ArrowDown khi đang ở ô thời lượng.

Nút bấm có giới hạn từ 30 phút đến 16 giờ, phù hợp giới hạn nhập hiện tại của app. Nếu giá trị đang nhập dưới 30 phút thì nút giảm bị khóa; nhập tay vẫn hỗ trợ các định dạng hợp lệ như `15m`, `1h`, `1h30m`, `1h 30m`, `1.5h`. Giá trị nhập tay không hợp lệ sẽ được nhắc khi bấm tăng/giảm. Preset, tổng Bulk và tiến độ ngày cập nhật ngay khi bấm nút.

Mốc 16 giờ là trần nhập của điều khiển; quy tắc giờ thường tối đa 8 giờ, OT và kiểm tra khung giờ trên server vẫn được áp dụng.

### Hiện/ẩn mật khẩu

Bấm icon con mắt trong ô Password để hiện/ẩn nội dung. Nút có nhãn trợ năng thay đổi theo trạng thái. Mật khẩu tự trở về dạng ẩn khi gửi đăng nhập hoặc đăng xuất; chức năng này không thêm lưu mật khẩu vào localStorage.

### Worklog đã log cao hơn, dễ cuộn

- Điện thoại: cửa sổ gần toàn màn hình, có tính đến safe area; bộ lọc ngày/KEY nằm cùng hàng để dành chỗ cho dữ liệu.
- Desktop: cửa sổ rộng hơn và cao tối đa 94% vùng hiển thị.
- Danh sách và form sửa nằm trong một vùng cuộn chính, bỏ giới hạn danh sách 38–46vh trước đây.
- Nội dung mô tả trùng hoàn toàn Summary chỉ hiển thị một lần để giảm chiều cao thẻ.
- Mở Worklog đã log tự tải ngày đang chọn; nút Tìm worklog dùng để làm mới dữ liệu.

### Xem dạng lịch

1. Mở **Worklog đã log**.
2. Chọn **Lịch** cạnh **Danh sách**.
3. Lịch tháng hiển thị từ Thứ 2 đến Chủ nhật, tổng thời lượng và số worklog mỗi ngày.
4. Bấm ngày để xem worklog theo giờ tăng dần ở dưới lịch.
5. Bấm worklog để mở form sửa/xóa hiện có.
6. Dùng mũi tên tháng trước/tháng sau hoặc **Hôm nay** để điều hướng.
7. KEY là bộ lọc tùy chọn, áp dụng cho cả danh sách lẫn lịch.

Tổng giờ hiển thị là tổng thời lượng worklog đã ghi, không phải số giờ chấm công. Lịch đánh dấu ngày có worklog và ngày hiện tại, không suy luận ngày nghỉ/thiếu công. Múi giờ hiển thị là Asia/Ho_Chi_Minh.

## 2. Yêu cầu chạy

- Node.js 24.x (đã khai báo trong package.json).
- Server/Vercel có thể truy cập Jira được cấu hình trong `lib/config.js`.
- Tài khoản Jira có quyền đọc issue/worklog; quyền ghi/sửa/xóa và chuyển trạng thái theo cấu hình Jira.
- Không cần cài thêm thư viện runtime hoặc database cho các chức năng V1.9.0.

## 3. Triển khai Vercel

1. Giải nén ZIP, mở thư mục `Quick-Jira-Log-V1.9.0` (thư mục này chứa package.json, index.html và vercel.json).
2. Đưa source trong thư mục đó lên repository GitHub của app.
3. Trong Vercel, import repository hoặc cập nhật project đang liên kết repository.
4. Nếu repository chứa thêm thư mục cha, đặt **Root Directory** trỏ tới thư mục chứa package.json của app.
5. Framework Preset: **Other**. Build Command để trống. Output Directory dùng mặc định/root của project, không chọn `dist` vì source không có bước build.
6. Node.js Version: **24.x**.
7. Cấu hình biến môi trường bên dưới rồi redeploy.
8. Mở app, kiểm tra footer V1.9.0. Nếu đã cài PWA, bấm **CẬP NHẬT** khi xuất hiện banner bản mới; có thể đóng/mở lại app sau khi cập nhật.

### Biến môi trường

Sao chép tên biến từ `.env.example`; không đưa giá trị thật vào Git.

```env
APP_SESSION_SECRET=<chuoi-bi-mat-it-nhat-32-ky-tu>
SESSION_MAX_AGE_SECONDS=43200
```

`APP_SESSION_SECRET` là bắt buộc. Giữ nguyên secret khi nâng cấp nếu muốn các phiên hiện tại tiếp tục đọc được. Đổi secret làm các phiên cũ không còn hợp lệ.

Redis/KV tùy chọn, được kế thừa từ V1.8.0:

```env
UPSTASH_REDIS_REST_URL=<url>
UPSTASH_REDIS_REST_TOKEN=<token>
```

Hoặc dùng `KV_REST_API_URL` / `KV_REST_API_TOKEN`. Khi đã cấu hình nhưng store lỗi, thao tác ghi dùng cơ chế fail closed hiện có. Khi không cấu hình, bảo vệ in-memory chỉ có phạm vi instance.

API vẫn gom trong `api/index.js`. File `vercel.json` đã cấu hình thời gian tối đa 60 giây cho function này.

## 4. Kiểm tra tự động

```bash
node --version
npm test
```

Bộ kiểm tra gồm scheduling, overlap/timezone, OT, auth/CAPTCHA, chuyển trạng thái, bulk allocation, idempotency/cache và V1.9.0:

- Giá trị tăng/giảm tương thích parser server.
- Biên 30m/16h, định dạng giờ hỗn hợp và dữ liệu không hợp lệ.
- Lịch bắt đầu Thứ 2, tháng nhuận, chuyển tháng giữ ngày hợp lệ.
- API tháng lọc đúng tác giả/ngày theo múi giờ Việt Nam.
- Mỗi issue ứng viên chỉ đọc worklog một lần cho khoảng tháng, thay vì lặp API từng ngày.
- Lỗi tìm kiếm và dữ liệu tải một phần được phân biệt với lịch rỗng.

Các test API dùng phản hồi Jira giả lập, không ghi dữ liệu lên Jira thật.

## 5. Checklist khi kiểm tra trên hệ thống thật

- Đăng nhập: hiện/ẩn mật khẩu; đăng nhập đúng/sai và CAPTCHA.
- Log đơn: preset 1h → tăng thành 1h 30m; tổng giờ cập nhật; ghi đúng giá trị.
- Bulk: tăng/giảm từng task; tổng thời gian và tiến độ đồng bộ.
- Lịch sử: cửa sổ cao hơn, cuộn tới dòng cuối trên iPhone/desktop.
- Lịch: đối chiếu ngày có worklog với Jira; lọc KEY; tháng trước/sau; bấm ngày và mở form sửa.
- Sửa/xóa: kết quả được tải lại trên lịch và danh sách.
- Mạng lỗi: hiển thị thông báo lỗi thay vì báo không có worklog.
- PWA: banner cập nhật hoạt động, app hiển thị V1.9.0.

## 6. Phạm vi và lưu ý

- API lịch nhận `date` và `endDate`, tối đa 31 ngày; truy vấn issue bằng JQL rồi lọc từng worklog thực theo tác giả và timestamp.
- Giới hạn đọc tối đa 500 issue ứng viên cho mỗi lần tải. Nếu vượt hoặc có issue không đọc được, UI thông báo dữ liệu chưa đầy đủ và tổng tạm tính.
- Kết quả ngày giữ cache server ngắn như V1.8.0. Kết quả tháng chỉ cache client 20 giây, xóa sau các thao tác ghi/sửa/xóa trong app để không làm sai cơ chế invalidation theo ngày.
- Truy vấn lịch sử phụ thuộc quyền và chỉ mục Jira. Nút Tìm worklog làm mới; có thể nhập KEY để tìm trực tiếp một issue.
- Lịch tháng có thể chậm với tài khoản có nhiều issue/worklog; tốc độ phụ thuộc Jira và giới hạn function.
- PWA cache app shell; việc đọc/ghi dữ liệu Jira cần kết nối mạng và phiên đăng nhập hợp lệ.

Chi tiết thay đổi: `CHANGELOG.md`. Các phiên bản trước: `ROADMAP.md`.

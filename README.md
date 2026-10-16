# Quick Jira Log V1.11.5 — Professional UI & Calendar First

© 2026 HuyVo. All rights reserved.

## Cải tiến V1.11.5

- **Log mới không còn công tắc Overtime**, ở cả log đơn và Log tất cả. Sau khi log, mở Worklog đã log → bấm block → đánh dấu Overtime → Lưu chỉnh sửa.
- Sửa lỗi nhầm Overtime thành custom field của issue Jira. App không tìm field Overtime, không gọi editmeta và không cập nhật trạng thái của toàn issue nữa.
- **OT là nhãn riêng của từng worklog trong Quick Jira Log**. Nhãn được lưu bền kèm mô tả worklog bằng API sửa worklog hiện có; đóng/mở app hoặc dùng thiết bị khác vẫn đọc được. Đây không phải thuộc tính Overtime native hay plugin chấm công của Jira.
- Popup tiến trình log đơn/Bulk nằm giữa màn hình, nền phía sau tối/mờ, giữ %/bước/ETA theo phản hồi thật. Đang xử lý thì không đóng bằng Escape/nền; hoàn tất/lỗi có nút đóng. Thành công tự đóng sau 4,5 giây; lỗi giữ lại để đọc.
- Sheet log đơn và Log tất cả dùng hết chiều cao viewport có thể sử dụng, thích ứng bàn phím/vùng an toàn. Kéo xuống ở thanh kéo hoặc vùng tiêu đề để đóng; vuốt ngắn thì trở về vị trí cũ. Giữ cuộn nội dung và thao tác ngày/nút bấm.
- Sheet sửa worklog cũng có thể kéo tiêu đề xuống để đóng trên mobile.
- Các input, textarea, date/time picker được giới hạn trong khung, grid không bị kéo giãn bởi kích thước nội tại của picker.
- Bảng màu dự án bỏ toàn bộ dải xanh dương, chuyển sang mint/lilac/rose và các màu khác biệt; tự đổi bảng màu cũ, giữ lựa chọn bật/tắt. Vàng nhạt chỉ dành cho OT.

### Cách đánh dấu Overtime sau khi log

1. Log đơn hoặc Log tất cả như bình thường, chưa chọn OT.
2. Mở **Worklog đã log**, bấm block cần đánh dấu.
3. Chọn **Overtime**, bấm **Lưu chỉnh sửa**. Chỉ worklog đang sửa được gắn nhãn; các worklog khác cùng issue không đổi.
4. Bỏ chọn rồi lưu để bỏ phân loại OT. Đóng/kéo sheet xuống khi chưa lưu sẽ bỏ các chỉnh sửa nháp.

Trên Jira, cuối mô tả sẽ có dòng riêng **`[Quick Jira Log: Overtime]`** hoặc **`[Quick Jira Log: Regular]`**. App đọc và tách dòng này khỏi textarea để mô tả công việc vẫn gọn, không thêm trùng nhãn khi lưu nhiều lần. Không tự xóa dòng này trực tiếp trên Jira nếu muốn app giữ phân loại. Trường hợp comment ở dạng ADF, app cũng đọc nhãn từ các đoạn văn bản.

Bật/tắt OT chỉ là phân loại, **không tự đổi ngày, giờ bắt đầu, thời lượng hay tổng giờ đã log**. Nếu cần dời block, sửa Giờ bắt đầu; vẫn kiểm tra trùng giờ và khung giờ hợp lệ. Log mới giữ giới hạn giờ thường 8h/ngày và cơ chế phân bổ cũ, không tự chuyển phần vượt 8h sang OT. Các bản app cũ gửi yêu cầu OT ngay lúc tạo sẽ được báo tải lại/chuyển sang phần sửa, không âm thầm tạo sai loại.

Dữ liệu cũ chỉ được suy OT từ custom field issue hoặc từ mốc 17:30 sẽ không còn bị tự tô vàng. Hãy đánh dấu các worklog cần phân loại trong phần sửa. Nhãn riêng của worklog do nguồn cung cấp vẫn được đọc; nhãn do app lưu được ưu tiên, bao gồm khi bỏ OT.

## Triển khai nhanh

Giải nén ZIP, dùng **nội dung bên trong `Quick-Jira-Log-V1.11.5`** làm root repository. Push GitHub rồi import repository vào Vercel. Chọn Framework **Other**, không cần Build Command, giữ root và output mặc định. Thiết lập biến môi trường theo `.env.example` và phần hướng dẫn bên dưới; không commit `.env` hoặc mật khẩu.

App dùng Node.js 24.x và API Vercel hiện có. Bản nâng cấp giao diện không cần đổi database hoặc thêm dịch vụ. Nếu đang dùng bản cũ, sau deploy hãy chọn **Cập nhật** trong PWA hoặc tải lại trang. Phiên bản trên đầu trang và footer phải là **V1.11.5**.

Đã kiểm tra bằng dữ liệu Jira giả lập; **chưa đăng nhập/ghi giờ lên Jira thật và chưa kiểm tra trên iPhone Safari vật lý**. Xem `TESTING.md` để biết phạm vi, cách chạy và giới hạn.

Bảng màu có 120 swatch khác mã, không dùng dải xanh dương hoặc vàng OT; độ khác biệt dễ nhìn được ưu tiên cho các dự án đầu tiên. Khi có rất nhiều dự án, màu không thể thay thế KEY/tên dự án để nhận diện. Màu được lưu theo trình duyệt, chưa đồng bộ giữa các thiết bị.

## 1. Lịch Tuần / Tháng

Mở **Worklog đã log** để vào thẳng tuần hiện tại; chọn **Tuần** hoặc **Tháng** để đổi cách xem. Trên mobile, bấm icon tùy chọn cạnh tiêu đề để chuyển sang Danh sách.

### Lịch tuần

- Hiển thị T2–T6, trục giờ ở bên trái. Phần đầu mỗi ngày có **[giờ đã log] / 8h** và thanh mức hoàn thành.
- Tổng tuần nằm phía trên lưới, cùng hàng nút Tuần/Tháng trên desktop; mobile đặt tổng bên phải Tuần/Tháng để tiết kiệm diện tích: **[giờ đã log] / 40h**, kèm số giờ còn thiếu.
- Bấm **Hiện T7/CN** để xem thêm cuối tuần. Giờ cuối tuần hiển thị riêng và không cộng vào mục tiêu T2–T6.
- Mỗi worklog Jira là một block riêng, bám đúng giờ bắt đầu và thời lượng. Ở chế độ thường, 1 phút tương ứng 1 CSS pixel: block 30 phút cao 30px, 1 giờ cao 60px và 2 giờ cao 120px. Fullscreen có thể giãn đồng đều theo chiều cao màn hình; tỷ lệ 1h/2h vẫn là 1:2.
- Khoảng nghỉ trưa vẫn chiếm đúng khoảng trống trên trục giờ; không rút ngắn trục thời gian.
- Nếu có worklog trùng thời gian từ Jira, các block được chia cột trong ngày để có thể bấm từng worklog.
- Bấm block để mở popup PC hoặc bottom sheet mobile, chỉnh sửa/xóa tại đó. Lịch tuần không có danh sách chi tiết bên dưới; bấm tiêu đề ngày chỉ đổi ngày đang chọn.
- Có nút tuần trước/tuần sau và Hôm nay. Tuần giao tháng hoặc năm được tính theo ngày Thứ 2, không giới hạn trong một tháng.
- Trên điện thoại, cuộn ngang trong lưới để xem đủ ngày. Tiêu đề ngày được giữ ở đầu vùng cuộn lịch.

### Lịch tháng

- Giữ lịch tháng từ T2 đến CN, tổng thời lượng và số worklog trong từng ô ngày.
- Bấm ngày để xem danh sách worklog bên dưới, bấm worklog mở popup PC/bottom sheet mobile để sửa/xóa.
- Bộ lọc KEY chỉ áp dụng ở Danh sách; Lịch tải tất cả worklog trong kỳ đang xem.
- Trên lịch tuần, lưới mặc định chỉ có T2–T6. Số worklog trong dòng tóm tắt chỉ đếm những ngày đang hiển thị; tổng mục tiêu 40h vẫn chỉ tính T2–T6.

## 2. Dashboard hôm nay và tuần này

Hai thẻ hiển thị ngay dưới trạng thái đăng nhập:

| Thẻ | Nội dung |
|---|---|
| Hôm nay | Tổng worklog hôm nay / 8h, số giờ cần log thêm |
| Tuần này | Tổng worklog T2–T6 / 40h, số giờ cần log thêm trong tuần |

Thời lượng hiển thị gọn, ví dụ **3h 30m**, **30m**, **33h**; tổng bằng 0 hiện **—**. Giờ còn thiếu không âm; khi vượt mục tiêu, hiển thị đã đủ và số giờ vượt.

Quy tắc tính:

- Ngày hiện tại và tuần được xác định theo **Asia/Ho_Chi_Minh**.
- Tuần bắt đầu T2. Mục tiêu cố định 8h/ngày làm việc, 40h/T2–T6, chưa trừ lễ/phép.
- Tổng là số phút của các worklog thực tế của tài khoản đang đăng nhập. Worklog ngoài giờ nhưng bắt đầu trong T2–T6 vẫn nằm trong tổng ngày/tuần; đây là tổng worklog, không phải số giờ chấm công hoặc tổng giờ thường riêng.
- T7/CN theo dõi riêng; dashboard ngày cuối tuần không đặt mục tiêu 8h.
- Nếu dữ liệu tải thiếu, số tổng được ghi tạm tính và không kết luận chính xác số giờ còn thiếu. Nếu tải lỗi, hiển thị dấu — thay vì số 0.
- Dashboard tải khi đăng nhập, có nút cập nhật, tải lại sau log/sửa/xóa và khi quay lại app sau thời gian chờ. Trong lúc app đang mở, có kiểm tra đổi ngày theo múi giờ Việt Nam.

Ví dụ: Hôm nay 3h 30m → cần log thêm 4h 30m. Tuần đã log 33h → cần thêm 7h. Nếu cuối tuần đã log 2h, dòng T7/CN hiển thị 2h riêng.

## 3. Tiến trình log và thời gian dự kiến

Áp dụng cho **Logwork**, **Log & Next** và **Log tất cả**. Sau khi xác nhận, app hiển thị:

- Thanh tiến trình và phần trăm.
- Bước xử lý hiện tại: đọc task → kiểm tra giờ trống/OT → ghi worklog → cập nhật trạng thái → hoàn tất.
- Thời gian đã chạy.
- Số giây còn lại ước tính và giờ hoàn thành dự kiến.

Cách hoạt động:

- Server truyền tiến độ qua NDJSON trong chính POST đang ghi. Không cần function polling hoặc Redis riêng cho tiến trình.
- % là mức hoàn thành theo các giai đoạn có trọng số, không phải % thời gian cam kết. Giai đoạn ghi worklog cập nhật theo số worklog đã nhận kết quả tạo thành công.
- Client chỉ cho 100% sau khi đọc được kết quả cuối cùng thành công. Không dùng timer tự tăng % khi server chưa xác nhận.
- ETA dựa trên các lần log thành công trước của tài khoản/trình duyệt và tiến độ hiện tại. Chưa có lịch sử thì dùng ước tính khởi tạo; khi Jira chậm hơn dự kiến, app thông báo đang cập nhật ước tính.
- Khi lỗi, thanh dừng trước 100% và hiển thị lý do. Khi mất phản hồi cuối, thông báo **chưa xác định kết quả** và yêu cầu kiểm tra lịch sử trước khi gửi lại; không tự retry POST.
- Đóng form hoặc mất kết nối không đồng nghĩa thao tác server đã hủy. Hãy đối soát Jira/lịch sử nếu kết quả chưa xác định.
- Nếu lớp proxy/hosting đệm dữ liệu, cập nhật có thể về theo đợt. Kết quả JSON cũ vẫn được hỗ trợ, và app không tạo % giả để bù việc thiếu stream.

Đối chiếu nền tảng: https://vercel.com/docs/functions/streaming-functions và https://vercel.com/kb/guide/ship-a-express-app-on-vercel . Vercel Function Node dùng res.write/res.end để stream; source vẫn giữ API index duy nhất và maxDuration 60 giây hiện tại.

## 4. Các tiện ích V1.9.0 được giữ lại

- Mũi tên tăng/giảm 30 phút ở Log đơn, Bulk và sửa worklog; ArrowUp/ArrowDown khi đang ở ô giờ.
- Preset 1h → tăng → 1h 30m → tăng → 2h. Nút bấm giới hạn 30m–16h; nhập tay định dạng hợp lệ vẫn được hỗ trợ.
- Icon hiện/ẩn mật khẩu.
- Cửa sổ Worklog đã log cao hơn, hỗ trợ sáng/tối và mobile.
- Guard giờ thường/OT/overlap, xác nhận trước log, log muộn, cache và idempotency theo cấu hình đã có.

## 5. Yêu cầu chạy

- Node.js 24.x (đã khai báo trong package.json).
- Server/Vercel có thể truy cập Jira được cấu hình trong `lib/config.js`.
- Tài khoản Jira có quyền đọc issue/worklog; quyền ghi/sửa/xóa và chuyển trạng thái theo cấu hình Jira.
- Không cần cài thêm thư viện runtime hoặc database cho các chức năng V1.10.0.

## 6. Triển khai Vercel

1. Giải nén ZIP, mở thư mục `Quick-Jira-Log-V1.11.5` (thư mục này chứa package.json, index.html và vercel.json).
2. Đưa source trong thư mục đó lên repository GitHub của app.
3. Trong Vercel, import repository hoặc cập nhật project đang liên kết repository.
4. Nếu repository chứa thêm thư mục cha, đặt **Root Directory** trỏ tới thư mục chứa package.json của app.
5. Framework Preset: **Other**. Build Command để trống. Output Directory dùng mặc định/root của project, không chọn `dist` vì source không có bước build.
6. Node.js Version: **24.x**.
7. Cấu hình biến môi trường bên dưới rồi redeploy.
8. Mở app, kiểm tra footer V1.11.5. Nếu đã cài PWA, bấm **CẬP NHẬT** khi xuất hiện banner bản mới; có thể đóng/mở lại app sau khi cập nhật.

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

## 7. Kiểm tra

```bash
node --version
npm test
```

Bộ test có các kiểm tra V1.8/V1.9 và V1.10.0:

- Biên tuần qua tháng/năm, định dạng Xh Ym, mục tiêu ngày/tuần và giờ cuối tuần.
- Vị trí, thời lượng và cột của các block trùng giờ.
- HTTP stream thực qua Node server cục bộ: log đơn/Bulk, lỗi không có 100%, replay idempotent và tương thích JSON.
- API lịch sử lọc tác giả/ngày theo giờ Việt Nam.

Các test dùng Jira giả lập, không ghi vào hệ thống Jira thật. Kết quả kiểm tra giao diện mô phỏng được ghi tại TESTING.md.

## 8. Giới hạn và kiểm tra sau triển khai

- Lịch và dashboard phụ thuộc quyền đọc và chỉ mục Jira; giữ giới hạn 500 issue ứng viên/lần tải. Nếu thiếu dữ liệu sẽ có cảnh báo.
- Cache kết quả ngày kế thừa cơ chế server cũ. Khoảng tuần/tháng dùng cache client ngắn 20 giây; cache xóa sau ghi/sửa/xóa trong app.
- Lưới thời gian giới hạn trong 00:00–24:00 của ngày bắt đầu. Worklog nhập tay trực tiếp trong Jira mà kéo qua nửa đêm có thể bị cắt tại mép lưới; tổng thời lượng và form chi tiết vẫn giữ dữ liệu thật. Luồng log hiện có trong app xếp trong các khung giờ cùng ngày.
- Block rất ngắn có thể không đủ chỗ hiển thị mô tả; title, nhãn trợ năng và danh sách ngày vẫn cho đọc/mở chi tiết.
- ETA là ước tính, không phải thời gian cam kết. Hiệu năng thật phụ thuộc Jira và hosting.
- Chưa deploy production hoặc xác minh Safari trên iPhone vật lý trong lần phát triển này.
- Sau deploy, kiểm tra footer V1.11.5, cập nhật PWA, đối chiếu tổng hôm nay/tuần với Jira; thử tăng giờ, log đơn/Bulk, sửa/xóa từ block và theo dõi tiến trình trên mạng thực tế.

Xem thêm CHANGELOG.md và ROADMAP.md.

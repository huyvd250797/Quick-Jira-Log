# Quick Jira Log V1.13.1 — Sửa phân bổ theo Sub-task Type

Ứng dụng PWA dùng Jira/WorklogPRO hiện có. Source sẵn sàng push GitHub và deploy Vercel; không thêm database hoặc dependency runtime.

## Bản vá V1.13.1

V1.13.0 đã dùng nhầm Issue Type nên mọi sub-task bị gộp thành một nhóm “Sub-task”. V1.13.1 đọc đúng custom field **Sub-task Type** trong ảnh Jira và tổng hợp giờ theo giá trị đã chọn.

- Mặc định không cần cấu hình thêm: tự tìm field theo đúng tên, chấp nhận khác biệt khoảng trắng/dấu gạch ngang.
- Nếu có nhiều custom field cùng tên hoặc tài khoản bị chặn danh sách field, đặt **`JIRA_SUBTASK_TYPE_FIELD_ID`** bằng ID thật của trường do quản trị Jira xác nhận (`customfield_` + số). Không dùng Issue Type ID hoặc ID thuộc tính Overtime. Không có ID cứng trong source.
- Khi field thiếu/trùng/không đọc được, hiển thị thông báo ở biểu đồ và nhóm “Chưa xác định”, giữ đủ tổng giờ. Không fallback về Issue Type.
- Phân biệt trường trả null (chưa chọn) với response thiếu trường (chưa đọc được). Không chia giờ vào nhiều nhóm khi giá trị trả về sai cấu trúc.
- Giữ thống kê giờ thường/OT/dự án, drill-down, sửa/xóa và các guard hiện có. PWA và cache phiên bản được cập nhật để không dùng dữ liệu phân loại cũ.

Ví dụ mọi issue đều có Type = Sub-task, nhưng custom field khác nhau: hai worklog Testing mỗi worklog 1h → **Testing 2h**; một worklog Developing 6h → **Developing 6h**. Không hiển thị “Sub-task 8h” hay số lượng 2/1 task.

Tham khảo hợp đồng API: [Jira REST field](https://developer.atlassian.com/server/jira/platform/rest/v10000/api-group-field/), [Jira REST examples – custom fields](https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/).

## Nâng cấp V1.13.0

- Nút **Tổng hợp** thay **Kiểm tra & lập kế hoạch** trên PC và thanh công cụ mobile. Kiểm tra dung lượng, trùng lịch và quyền trước khi ghi vẫn hoạt động.
- Xem **tuần / tháng**, chọn ngày trong kỳ, chuyển kỳ, về kỳ hiện tại và lọc dự án.
- Ba chỉ số **Giờ thường / Overtime / Tổng giờ**; cập nhật lại sau tạo, sửa và xóa worklog trong app. Bấm ↻ để đọc lại thay đổi thực hiện trực tiếp trên Jira.
- Biểu đồ **Phân bổ theo dự án** tách giờ thường, OT và giờ chưa xác nhận; biểu đồ **Phân bổ theo Sub-task Type** hiển thị tổng giờ và tỷ trọng.
- Bấm một thanh biểu đồ để xem worklog trong nhóm, sau đó mở chi tiết để sửa ngày, giờ, thời lượng, mô tả, Overtime hoặc xóa bằng giao diện hiện có.
- Tiến độ giờ thường không cộng Overtime, cả trong màn hình Tổng hợp, dashboard và tiêu đề lịch tuần.
- Không thêm bảng Theo ngày, xếp hạng task hay báo cáo OT riêng.

## Quy tắc số liệu

1. Chỉ lấy worklog của tài khoản đăng nhập; ngày dựa trên thời điểm bắt đầu quy về **Asia/Ho_Chi_Minh**. Worklog qua đêm được tính vào ngày bắt đầu, cùng quy tắc lịch hiện có.
2. Cộng `timeSpentSeconds` của worklog trong kỳ, không lấy `timespent` tích lũy trên issue. Khử trùng theo issue key và worklog ID; giữ chính xác giây khi thống kê.
3. Overtime chỉ dựa vào checkbox WorklogPRO đã đọc được. Không suy đoán từ giờ làm, phần vượt 8h hoặc marker cũ trong mô tả. Khi chưa đọc được checkbox, hiển thị **giờ chưa xác nhận**, không tính vào giờ thường/OT. Tổng giờ và phân bổ theo loại vẫn gồm phần đó.
4. **Sub-task Type** là custom field riêng trên Jira, **khác** `fields.issuetype` (Type: Sub-task). App tự tìm trường có tên Sub-task Type bằng `GET /rest/api/2/field`, yêu cầu field ID đó trong metadata issue và đọc giá trị `{id, value}`. Ví dụ: Testing, Supporting, Developing, Review Document, Meeting… Gộp theo field ID + option ID và **cộng giây worklog**, không đếm số task. Một task có nhiều worklog thì cộng các worklog trong kỳ; tỷ trọng = giờ nhóm / tổng giờ lọc. Không suy đoán theo summary/mô tả. Trường trả null/None (chưa chọn option) vào **Chưa phân loại**; không đọc được trường/metadata vào **Chưa xác định**; issue không phải sub-task vào **Task khác**. Không sửa dữ liệu Jira.
5. Mục tiêu cá nhân: **8h/ngày T2–T6**, tuần 40h; tháng tính số ngày T2–T6 thực tế. Chưa trừ ngày lễ/nghỉ phép. Mỗi ngày tối đa 8h được ghi nhận vào tiến độ kỳ, không dùng giờ dư/ngày cuối tuần để bù ngày khác. Bộ lọc dự án chỉ đổi KPI, biểu đồ và chi tiết, không thay mục tiêu cá nhân toàn dự án. Thông báo thiếu giờ chỉ xét ngày đến hôm nay, không nhắc ngày tương lai; dữ liệu chưa đủ thì không kết luận thiếu.
6. Thống kê tuần/tháng chia khoảng 3 ngày, tối đa hai yêu cầu đồng thời để giảm ảnh hưởng giới hạn thời gian WorklogPRO. Jira trả ít bản ghi hơn yêu cầu vẫn được đọc tiếp đến đủ `total`. Giới hạn khám phá 2.000 issue/khoảng thống kê, lỗi metadata, issue bị chặn hoặc OT chưa xác nhận đều được báo **tạm tính**. Không âm thầm coi giới hạn là kết quả đầy đủ.
7. Cache trình duyệt ngắn hạn 20 giây, tách phạm vi thống kê/lịch; tạo/sửa/xóa làm mất hiệu lực cache. Yêu cầu cũ không ghi đè kỳ mới hoặc phiên đăng nhập mới. Không lưu báo cáo hay mật khẩu vào database mới.

## Cập nhật từ V1.12.1

1. Giải nén, dùng **nội dung bên trong thư mục `Quick-Jira-Log-V1.13.1`** làm root repository; không đẩy cả ZIP hoặc lồng thêm thư mục.
2. Push GitHub rồi deploy project Vercel hiện có. Framework **Other**, không Build Command; Node.js **24.x**, giữ `vercel.json`.
3. Giữ `APP_SESSION_SECRET` và các biến môi trường đang dùng. Không cần token hay dịch vụ mới. Chỉ cấu hình `JIRA_SUBTASK_TYPE_FIELD_ID` nếu tự nhận diện trường không xác định được đúng một kết quả.
4. Sau deploy, chọn **Cập nhật** trong PWA hoặc tải lại trang để badge/footer hiện **V1.13.1**.
5. Mở **Tổng hợp**, đối chiếu một tuần và một tháng với Jira, sau đó thử sửa một worklog và xác nhận tổng được tải lại.

## Kiểm thử và giới hạn xác minh

`npm test` chạy logic/API với Jira giả lập. `npm run test:ui` chạy Playwright/Chromium; hướng dẫn và phạm vi trong `TESTING.md`. Không dùng tài khoản hoặc ghi lên Jira thật trong phiên phát triển này; chưa xác minh trên Vercel thật hay Safari/iPhone vật lý.

## Nền tảng V1.12.1 được giữ lại

© 2026 HuyVo. All rights reserved.

## Bản vá lỗi GET mở form HTTP 403

V1.12.0 dùng GET `/secure/WPCreateWorklogOnIssueWithWorkLogAction.jspa` để mở form, trong khi đường này là action lưu POST. Đây là điểm tích hợp sai trong app. Nguồn tài nguyên chính thức của WorklogPRO 4.25.9-jira11 (`js/WorklogPRO_IssueTabPanelDynamic.js`, các template timesheet/calendar) dùng **GET `WPCreateWorklogOnIssueWithWorkLogAction!update.jspa?worklogId=...&atl_token=...`** khi mở sửa; form trả về vẫn dùng action POST `.jspa`.

V1.12.1 thực hiện ba bước riêng:

1. GET `/browse/{issueKey}` bằng cùng phiên Jira, giữ cookie trả về và đọc token đầy đủ từ `WP_atl_token`, meta `ajs-atl-token`/`atlassian-token`/`atl-token` hoặc edit link native.
2. GET action **`!update.jspa`**, kèm worklog ID, token mới, tham số dialog và header AJAX. Parse đúng form/worklog/issue; lấy token lưu từ chính form trả về.
3. POST `.jspa` một lần để lưu, rồi GET worklog để xác nhận dữ liệu như V1.12.0.

Không còn GET vào action lưu; không tự gửi POST mở form, không lặp write sau lỗi chưa rõ kết quả. Nếu bước đọc trang issue/token thất bại, app dừng trước khi lưu và hiển thị đúng bước. Lỗi còn có tín hiệu anonymous/XSRF khi Jira trả về; query token, cookie và HTML gốc không xuất hiện trong Chi tiết lỗi.

Đã kiểm tra nguồn tài nguyên plugin công khai và request/response Boss cung cấp. **Chưa đăng nhập Jira thực tế của Boss**, nên phiên bản plugin đang cài, cookie/session, proxy và khả năng lấy token từ trang issue cần đối soát sau deploy. Nếu vẫn bị chặn, cần request **mở** popup trên Jira gốc (khác request POST lưu đã cung cấp), không suy rằng thiếu quyền chỉ từ HTTP 403.

## Chức năng Overtime và tạo worklog

- **Sửa Overtime bằng form WorklogPRO gốc** `/secure/WPCreateWorklogOnIssueWithWorkLogAction.jspa`, thay cho REST PUT bị từ chối 403 trên hệ thống đã đối chiếu. Backend đọc form của đúng worklog, lấy token mới, giữ cookie Jira/XSRF và các trường/thuộc tính khác; không chép token từ ảnh hoặc bỏ qua quyền Jira.
- **Log mới có lựa chọn Overtime cho từng sub-task**, cả log đơn và Log tất cả. Ngày đủ 8h thường vẫn tạo được OT. Không tự chuyển giờ vượt 8h sang OT.
- Giờ thường: 08:00–12:00, 13:30–17:30; tối đa 8h. OT ngày thường: 17:30–23:59; OT Thứ 7/CN theo hai khung ban ngày. Tùy chọn **Xếp từ giờ** đặt giờ sớm nhất; để trống để tự xếp, nếu bị bận sẽ xếp tiếp sau đó. Mọi loại vẫn kiểm tra trùng lịch.
- Ví dụ đã có 8h thường, chọn sub-task 2h + Overtime: app xếp 17:30–19:30 nếu trống; tổng thực tế 10h gồm 8h thường và 2h OT. Batch có thể trộn dòng thường/OT; tự động phân bổ 8h chỉ tác động dòng thường.
- Luồng tạo OT gồm tạo worklog Jira, đồng bộ checkbox native rồi GET đọc lại. Chỉ hoàn tất khi đã xác nhận OT. Nếu đồng bộ lỗi, hoàn tác **chỉ những worklog vừa tạo trong yêu cầu**; nếu hoàn tác chưa hết, báo worklog ID và yêu cầu kiểm tra Jira trước khi log lại. Không âm thầm giữ worklog thiếu nhãn OT rồi báo thành công.
- **Sửa ngày, giờ, thời lượng, mô tả** vẫn qua Jira core khi không đổi OT. Nếu core trả 403 rõ ràng, app thử form native và giữ nguyên trạng thái OT đã đọc được. Không chuyển sang provider khác sau timeout/5xx có thể đã ghi.
- Đổi OT cùng thông tin khác được gửi trong một form. Bật/tắt OT trên worklog cũ không tự dời giờ. Có nút Giữ nguyên Overtime để bỏ thay đổi công tắc đang nháp.
- Đọc lại bằng `/rest/com.deniz.jira.worklog/latest/worklog?id=...`, tìm đúng worklog trong projects/issues/workLogs. So sánh OT, ngày giờ, thời lượng, mô tả, tác giả và các thuộc tính khác. HTTP 200 đơn lẻ không được coi là thành công. Không tự retry POST; mất phản hồi hoặc dữ liệu chưa khớp được báo chưa xác định kết quả.

### Cập nhật

Giữ cấu hình Vercel và `APP_SESSION_SECRET` hiện có. Deploy source, cập nhật PWA/tải lại để đầu trang và footer hiện **V1.13.1**. Không cần database hay token Jira mới. Đăng nhập lại nếu phiên Jira đã hết hạn.

### Cấu hình và giới hạn

Mặc định tìm thuộc tính BOOL tên Over Time / Over Time? / Overtime qua WorklogPRO. Trên hệ thống đã đối chiếu, ID là **1**; có thể đặt `WORKLOGPRO_OVERTIME_ATTRIBUTE_ID=1` trên Vercel khi cần cố định mapping hoặc `/attr` bị hạn chế. Cấu hình ID không cấp thêm quyền.

Form native lấy từ Jira trong mỗi lần sửa; action cùng origin và đường dẫn được kiểm tra, đúng issue/worklog, có token, checkbox OT đang cho sửa. Cookie và token chỉ dùng ở backend, không trả ra giao diện/log. Phiên Jira và Basic riêng WorklogPRO giữ trong cookie app mã hóa như bản trước.

Luồng form phụ thuộc phiên bản WorklogPRO. Nếu cấu trúc form thay đổi hoặc quyền/kỳ chấm công không cho sửa, app báo lỗi thay vì đoán và ghi. Form quan sát được chỉ hỗ trợ thời gian tới phút: app từ chối sửa OT bằng form với worklog có giây lẻ để không âm thầm làm tròn; sửa trực tiếp Jira cho trường hợp đặc biệt đó. Chỉnh mô tả qua core vẫn giữ giây.

Chưa đăng nhập hoặc ghi lên Jira thật trong quá trình phát triển; kiểm thử dùng phản hồi giả lập theo ảnh/payload Boss cung cấp. Cần đối soát một worklog thực tế sau deploy. Xem `TESTING.md`.

### Worklog từ bản cũ

Lịch đọc OT từ thuộc tính WorklogPRO thật, không suy từ `[Quick Jira Log: Overtime]`, giờ bắt đầu hay ngày cuối tuần. Nhãn cũ được ẩn khỏi mô tả và dọn khi lưu thành công; không tự chuyển hàng loạt dữ liệu.

## Các cải tiến V1.11.7 được giữ

- Màu dự án chọn ngẫu nhiên từ nhiều họ màu dịu, **không bắt buộc xanh lá** hoặc ưu tiên riêng một màu. Nền, KEY và viền có độ tương phản phù hợp cho Sáng/Tối; vàng nhạt vẫn dành riêng cho OT.
- Cấp lại bảng màu khi mở lịch, Làm mới hoặc tắt/bật icon màu; tránh hue vừa dùng, ưu tiên các họ màu cách nhau. Cùng dự án giữ cùng màu trong lần xem; đổi theme/sửa worklog không đổi màu giữa thao tác.
- Bỏ gạch ngang đánh dấu ngày đang chọn. Tiêu đề vẫn đổi nền; thanh tiến trình giờ log của từng ngày và màu xanh khi đủ mục tiêu vẫn giữ.
- Thêm **Lưu đăng nhập**: chỉ ghi username/password sau khi Jira xác nhận đăng nhập thành công. Sau đăng xuất/hết phiên, hoặc mở lại app khi chưa có phiên, điền lại hai trường để người dùng bấm Đăng nhập; không tự đăng nhập.
- Bản lưu chỉ trên trình duyệt/thiết bị hiện tại; mật khẩu vẫn được che. Bỏ chọn ô để xóa bản lưu của app. Không ghi đè thông tin đang nhập khi việc đọc bộ nhớ trả về chậm; đăng nhập lỗi không thay bản lưu thành công trước đó.
- Giữ tiến trình không ETA, chỉnh Overtime từ lịch, màu OT cố định, sheet cao hết vùng xem/kéo xuống để đóng và input gọn trong khung.

### Lưu đăng nhập trên thiết bị

Username và password được mã hóa AES-GCM với IV ngẫu nhiên, lưu trong IndexedDB cùng CryptoKey không cho export. Không ghi mật khẩu dạng rõ vào localStorage/sessionStorage. Cơ chế này mã hóa dữ liệu lưu trữ; JavaScript cùng nguồn của app vẫn có thể dùng khóa để giải mã và điền form. Bản lưu tách biệt với cookie phiên Jira và không được gửi cho đến khi người dùng bấm Đăng nhập.

Bỏ chọn **Lưu đăng nhập** xóa bản lưu của app; trình quản lý mật khẩu của trình duyệt là chức năng độc lập. Xóa dữ liệu website hoặc đổi trình duyệt/thiết bị sẽ không còn bản lưu. Nếu trình duyệt không hỗ trợ Web Crypto/IndexedDB, ô lưu bị vô hiệu hóa và vẫn đăng nhập thủ công được. Nếu bộ nhớ không ghi được, app báo rõ nhưng không làm thất bại phiên Jira đã đăng nhập thành công. Không thay đổi cookie phiên, xác thực server hay cơ chế CAPTCHA.

## Logwork và giao diện hiện tại

- **Có công tắc Overtime khi tạo**, ở cả log đơn và từng dòng Log tất cả; cũng có thể chỉnh lại từ block lịch.
- Sửa lỗi nhầm Overtime thành custom field của issue Jira. App không tìm field Overtime, không gọi editmeta và không cập nhật trạng thái của toàn issue nữa.
- **OT đọc/ghi vào checkbox Over Time? của WorklogPRO trên Jira**, riêng cho từng worklog. Tạo worklog đơn/Bulk có thể chọn thường/OT và đồng bộ checkbox native.
- Popup tiến trình log đơn/Bulk nằm giữa màn hình, nền phía sau tối/mờ, giữ phần trăm/bước xử lý theo phản hồi thật và thời gian đã chạy. Đang xử lý thì không đóng bằng Escape/nền; hoàn tất/lỗi có nút đóng. Thành công tự đóng sau 4,5 giây; lỗi giữ lại để đọc.
- Sheet log đơn và Log tất cả dùng hết chiều cao viewport có thể sử dụng, thích ứng bàn phím/vùng an toàn. Kéo xuống ở thanh kéo hoặc vùng tiêu đề để đóng; vuốt ngắn thì trở về vị trí cũ. Giữ cuộn nội dung và thao tác ngày/nút bấm.
- Sheet sửa worklog cũng có thể kéo tiêu đề xuống để đóng trên mobile.
- Các input, textarea, date/time picker được giới hạn trong khung, grid không bị kéo giãn bởi kích thước nội tại của picker.
- Bảng màu dự án dùng tông dịu, cấp lại ngẫu nhiên theo mỗi lần mở/làm mới; giữ lựa chọn bật/tắt. Vàng nhạt chỉ dành cho OT.

### Cách đánh dấu Overtime sau khi log

1. Mở lịch để chỉnh một worklog đã log; khi tạo mới có thể chọn OT ngay trong form log.
2. Mở **Worklog đã log**, bấm block cần đánh dấu.
3. Chọn **Overtime**, bấm **Lưu chỉnh sửa**. Chỉ checkbox của worklog đang sửa được cập nhật; các worklog khác cùng issue không đổi.
4. Bỏ chọn rồi lưu để bỏ phân loại OT. Đóng/kéo sheet xuống khi chưa lưu sẽ bỏ các chỉnh sửa nháp.

Sau khi app báo thành công, mở lại worklog trên Jira/WorklogPRO để đối soát checkbox **Over Time?**. Worklog cũ chỉ có nhãn mô tả sẽ không tự được chuyển thành OT: bấm block, chọn Overtime và lưu một lần. Khi thành công, nhãn cũ được dọn khỏi mô tả của worklog đang sửa.

Bật/tắt OT chỉ là phân loại, **không tự đổi ngày, giờ bắt đầu, thời lượng hay tổng giờ đã log**. Nếu cần dời block, sửa Giờ bắt đầu; vẫn kiểm tra trùng giờ và khung giờ hợp lệ. Log mới giữ giới hạn giờ thường 8h/ngày và cơ chế phân bổ cũ, không tự chuyển phần vượt 8h sang OT. Chọn OT rõ ràng để app xếp riêng ngoài khung giờ thường.

Màu vàng chỉ phản ánh OT đã đọc được từ WorklogPRO. Không suy OT từ giờ 17:30, custom field issue hoặc nhãn mô tả cũ. Nếu không đọc được thuộc tính, app hiển thị cảnh báo và công tắc ở trạng thái chưa xác định; lưu khi chưa chọn công tắc sẽ giữ giá trị vừa đọc lại trên Jira.

## Triển khai nhanh

Giải nén ZIP, dùng **nội dung bên trong `Quick-Jira-Log-V1.13.1`** làm root repository. Push GitHub rồi import repository vào Vercel. Chọn Framework **Other**, không cần Build Command, giữ root và output mặc định. Thiết lập biến môi trường theo `.env.example` và phần hướng dẫn bên dưới; không commit `.env` hoặc mật khẩu.

App dùng Node.js 24.x và API Vercel hiện có. Bản nâng cấp này không cần đổi database hoặc thêm dịch vụ. Nếu đang dùng bản cũ, sau deploy hãy chọn **Cập nhật** trong PWA hoặc tải lại trang. Phiên bản trên đầu trang và footer phải là **V1.13.1**.

Đã kiểm tra bằng dữ liệu Jira giả lập; **chưa đăng nhập/ghi giờ lên Jira thật và chưa kiểm tra trên iPhone Safari vật lý**. Xem `TESTING.md` để biết phạm vi, cách chạy và giới hạn.

Bảng màu có 52 swatch dịu thuộc 13 họ màu; không dùng dải vàng OT. Ưu tiên hue chưa dùng và cách ít nhất 40° với màu đang có khi còn lựa chọn, không ép dùng xanh lá. Khi có nhiều dự án, độ tách biệt giảm; vượt 52 dự án có thể lặp màu. KEY/tên dự án vẫn là thông tin nhận diện chính. Các thiết bị có thể cấp màu khác nhau; phân loại OT vẫn đọc từ worklog trên Jira.

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

## 3. Tiến trình log

Áp dụng cho **Logwork**, **Log & Next** và **Log tất cả**. Sau khi xác nhận, app hiển thị:

- Thanh tiến trình và phần trăm.
- Bước xử lý hiện tại: đọc task → kiểm tra giờ trống/OT → ghi worklog → cập nhật trạng thái → hoàn tất.
- Thời gian đã chạy.

Cách hoạt động:

- Server truyền tiến độ qua NDJSON trong chính POST đang ghi. Không cần function polling hoặc Redis riêng cho tiến trình.
- % là mức hoàn thành theo các giai đoạn có trọng số, không phải % thời gian cam kết. Giai đoạn ghi worklog cập nhật theo số worklog đã nhận kết quả tạo thành công.
- Client chỉ cho 100% sau khi đọc được kết quả cuối cùng thành công. Không dùng timer tự tăng % khi server chưa xác nhận.
- Chỉ hiển thị thời gian đã chạy, không đoán số giây còn lại hoặc giờ hoàn thành.
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

1. Giải nén ZIP, mở thư mục `Quick-Jira-Log-V1.13.1` (thư mục này chứa package.json, index.html và vercel.json).
2. Đưa source trong thư mục đó lên repository GitHub của app.
3. Trong Vercel, import repository hoặc cập nhật project đang liên kết repository.
4. Nếu repository chứa thêm thư mục cha, đặt **Root Directory** trỏ tới thư mục chứa package.json của app.
5. Framework Preset: **Other**. Build Command để trống. Output Directory dùng mặc định/root của project, không chọn `dist` vì source không có bước build.
6. Node.js Version: **24.x**.
7. Cấu hình biến môi trường bên dưới rồi redeploy.
8. Mở app, kiểm tra footer V1.12.1. Nếu đã cài PWA, bấm **CẬP NHẬT** khi xuất hiện banner bản mới; có thể đóng/mở lại app sau khi cập nhật.

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
- Thời gian đã chạy là thời lượng thực tế của yêu cầu; tốc độ xử lý phụ thuộc Jira và hosting.
- Chưa deploy production hoặc xác minh Safari trên iPhone vật lý trong lần phát triển này.
- Sau deploy, kiểm tra footer V1.12.1, cập nhật PWA, đối chiếu tổng hôm nay/tuần với Jira; thử tăng giờ, log đơn/Bulk, sửa/xóa từ block và theo dõi tiến trình trên mạng thực tế.

Xem thêm CHANGELOG.md và ROADMAP.md.

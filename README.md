# Quick Jira Log V1.33.2 — Cố định form & nhận biết ngày log

- Cố định khung Log tất cả: kéo ở header/footer/vùng ngoài danh sách không làm trôi giao diện. Chặn wheel/touch truyền cuộn ra nền và tại biên danh sách; danh sách và textarea vẫn cuộn bên trong. Chỉ tay nắm trên cùng còn cho phép chủ động kéo đóng sheet.
- Hiển thị thứ cạnh ngày trong Log tất cả, form log đơn và phần chọn Subtask trên lịch.
- Ngày thường có thanh tiến độ: dưới 8h xanh dương, đúng 8h xanh lá, trên 8h đỏ; tính từ giờ thường đã log + đang nhập, không cộng OT. Giữ giới hạn/kiểm tra ghi hiện có.
- Theo yêu cầu cập nhật cuối cùng: T7/CN không có thanh mục tiêu 8h hoặc nhắc thiếu giờ, dùng nền tím xám nhẹ riêng ở form và cột/tiêu đề lịch tuần. Giữ trạng thái ngày đang chọn bằng viền.
- Bấm ô trống ngoài 08:00–12:00 và 13:30–17:30: phản hồi đỏ khoảng 1,2 giây, thông báo giờ hợp lệ và không mở form/không gửi lệnh ghi. Các ô hợp lệ giữ đúng giờ bắt đầu; xem/sửa worklog OT đã có và luồng log OT riêng vẫn giữ nguyên.

## Cập nhật

Giải nén **Quick-Jira-Log_v1.33.2.zip**, mở **Quick-Jira-Log-V1.33.2**, Node24.x: `npm ci`, `npm test`. Giữ cấu hình Vercel và APP_SESSION_SECRET. Không thêm dependency runtime, biến môi trường, database hoặc migration; không cần xóa dữ liệu website. Version/cache PWA 1.33.2. Hướng dẫn local/GitHub/deploy chi tiết được kế thừa bên dưới; chưa push/deploy.

Đã chạy unit/API và Chromium PC 1440px, mobile 390/320px, ngang 844px; kiểm tra kéo/wheel/cảm ứng thực qua mô phỏng, màu 2h/8h/9h, ngày cuối tuần, form/payload OT, ô hợp lệ và ô ngoài giờ. Chưa kiểm chứng Safari/iPhone vật lý hoặc Jira công ty. Xem TESTING.md.

**Kế tiếp đề xuất V1.34.0 — Phân tích Sub-task Type theo thành viên:** phân bổ giờ theo trường thật trên Jira và mở công việc trong từng loại; chưa chốt/chưa triển khai.

---

## Tài liệu nền V1.33.1 (thay đổi V1.33.2 ở trên được ưu tiên)

# Quick Jira Log V1.33.1 — Log tất cả gọn hơn & chọn ô lịch chính xác

## Thay đổi của bản này

- Thiết kế lại Log tất cả trên PC/mobile: tiêu đề và số Subtask gọn; ngày và Phân bổ giờ cùng hàng; khối giờ thường rút gọn. Header/footer cố định trong khung, chỉ danh sách cuộn, không còn tiêu đề Subtask bị header đè lên. PC hai cột, điện thoại một cột; màn hình ngang dùng header hai phần.
- Mỗi dòng Subtask có OT cạnh ô thời lượng, bỏ mô tả giải thích OT lặp lại; giữ preset 30m/1h/2h/3h/4h, nút tăng/giảm, giờ OT tùy chọn và phần sửa mô tả có thể mở. Giữ khoảng cách giữa thẻ và vùng bấm. Footer gộp Tổng, Hủy và Log tất cả trên một hàng.
- Khi ngày log là T7/CN, form đơn và Log tất cả không nhắc còn thiếu giờ để đủ 8h, không hiển thị mục tiêu /8h hoặc thanh tiến độ mục tiêu ngày. Vẫn hiển thị giờ đã log/đang nhập, lỗi tải và cảnh báo vượt giới hạn hiện có. Không thay quy tắc ghi/giới hạn backend hoặc cách phân bổ giờ khi chủ động bấm nút.
- Lịch tuần luôn hiển thị T2–CN; bỏ nút bật/tắt T7/CN. Cấu hình cũ của phiên phục hồi không ẩn cuối tuần trở lại. Mục tiêu tuần 40h vẫn theo T2–T6, giờ cuối tuần được theo dõi riêng như trước.
- Ô trống 30 phút có phản hồi sáng/viền khi nhấn và giữ chọn trong lúc mở form. Bấm bất kỳ vị trí nào trong ô 08:00–08:30 lấy giờ bắt đầu 08:00; ô tiếp theo lấy 08:30. Form và request logwork dùng đúng ngày/giờ đã chọn. Kéo thả vẫn snap gần nhất như cũ; lịch người khác chỉ xem, ô trống không mở form ghi.

## Cài đặt, cập nhật và phạm vi

Giải nén **Quick-Jira-Log_v1.33.1.zip**, mở **Quick-Jira-Log-V1.33.1**. Node24.x: `npm ci`, `npm test`. Chạy kiểm thử giao diện mới (môi trường QA riêng có Playwright/Chromium): `QJL_CHROMIUM_PATH=/path/to/chromium npm run test:compact`.

Giữ nguyên cấu hình Vercel/APP_SESSION_SECRET và dữ liệu trình duyệt. Không thêm dependency runtime, biến môi trường, database hoặc migration. PWA shell/version 1.33.1, bổ sung logwork-compact.css. Có thể thay source và deploy theo hướng dẫn bên dưới; không cần xóa dữ liệu website. Chưa push/deploy.

Đã kiểm thử unit/API, giao diện Chromium PC 1440px/mobile 390px/320px/ngang 844px ở light/dark, luồng gửi form đơn/hàng loạt, OT, mô tả, ngày/giờ ô lịch, chỉ xem người khác, cuộn riêng và hồi quy lịch/sửa/xóa/lưu nháp. Chưa kiểm chứng trực tiếp Jira công ty hoặc Safari/iPhone vật lý. Xem TESTING.md và RELEASE_V1.33.1.md.

**Kế tiếp đề xuất: V1.34.0 — Phân tích Sub-task Type theo thành viên:** phân bổ giờ theo trường thật trên Jira và mở các công việc trong từng nhóm. Chưa chốt/chưa triển khai.

---

## Tài liệu nền V1.33.0 (thay đổi V1.33.1 ở trên được ưu tiên)

# Quick Jira Log V1.33.0 — Đối chiếu Overtime & thẻ tiến độ linh hoạt

## Thay đổi chính

- Đọc Overtime trực tiếp từ thuộc tính WorklogPRO khi endpoint hỗ trợ; tự quay về luồng đọc native nếu không tương thích. Kiểm tra đúng worklog ID, metadata thuộc tính mới theo từng lô và quyền Jira; dữ liệu chưa đọc được vẫn là **Chưa rõ OT**. Không suy ra Overtime từ mô tả hoặc giờ làm.
- Thăm dò một worklog trước, sau đó xử lý tối đa 50 ID/lô, hai lô song song, tối đa 10 lượt đọc/lô. Tránh lặp thăm dò endpoint không hỗ trợ. Không thay đổi luồng ghi/sửa/logwork hoặc xác minh sau ghi.
- Thẻ nền kéo được **ngang và dọc ngay trong màn hình thống kê**, cũng như ở màn hình khác. Trên mobile, kéo đến mép trái/phải để thu thành nút nhỏ có phần trăm; kéo vào trong để mở rộng, chạm để mở thống kê.
- Nút sát mép tiếp tục tăng tiến độ; hoàn tất hiện check xanh và giữ đến khi mở/xác nhận hoặc bắt đầu báo cáo mới. Nếu báo cáo và vị trí đã lưu thành công, mở lại app khôi phục trạng thái này. Kết quả thiếu/lỗi có dấu cảnh báo, không dùng check thành công.
- Ước tính thời gian dựa trên tốc độ thực tế, xuất hiện sau ít nhất hai lần tăng tiến độ và hai giây lấy mẫu. Giai đoạn đầu hiển thị thời gian **của bước hiện tại**; khi đối chiếu OT là bước cuối thì hiển thị thời gian còn lại. Tạm dừng/mở lại phải học tốc độ mới; chờ quá 15 giây không tiến lên sẽ báo đang chờ Jira. Đây là ước tính, có thể thay đổi theo mạng và máy chủ.

## Cách đọc tiến độ

Trong màn hình thống kê, X/Y và % là tiến độ bước đang chạy. Thẻ nổi dùng % tổng thể theo trọng số: tìm công việc 0–20%, đọc worklog 20–60%, đối chiếu OT 60–100%. Các giá trị tăng theo số bản ghi thực tế, không tự chạy theo thời gian; chưa biết tổng thì hiển thị dấu chờ. 100% xử lý không có nghĩa dữ liệu thiếu quyền hoặc lỗi đã trở thành đầy đủ.

## Cập nhật và kiểm thử

Giải nén **Quick-Jira-Log_v1.33.0.zip**, mở **Quick-Jira-Log-V1.33.0**; Node24.x, chạy `npm ci` và `npm test`. Giữ nguyên cấu hình/APP_SESSION_SECRET. Không thêm package runtime, database, biến môi trường hoặc migration. PWA version/cache tăng 1.33.0 và bổ sung lib/progress-eta.js. Không cần xóa dữ liệu website; checkpoint báo cáo được kế thừa. Vị trí thẻ lưu bằng qjl-task-position-v2 và đọc tương thích vị trí cũ, không lưu thêm thông tin đăng nhập.

Đã kiểm thử unit/API và Chromium ở PC, mobile dọc/ngang, gồm cảm ứng mô phỏng thực sự để kéo hai trục trong modal, dock/undock, check sau hoàn tất và reload, ETA, pause/resume, checkpoint và hồi quy luồng ghi. Benchmark giả lập 200 ID với độ trễ cố định cho kết quả OT khớp tuyệt đối, giảm khoảng 175ms xuống 105ms trong một lượt chạy; không đại diện thời gian trên Jira thật. Chưa kiểm chứng Jira công ty/Safari trên iPhone vật lý; chưa push/deploy. Xem TESTING.md và RELEASE_V1.33.0.md.

**Kế tiếp đề xuất: V1.34.0 — Phân tích Sub-task Type theo thành viên:** phân bổ giờ theo custom field thật và mở công việc trong từng loại. Chưa xây dựng/chưa chốt.

---

## Tài liệu nền V1.32.1 (thông tin V1.33.0 ở trên được ưu tiên)

# Quick Jira Log V1.32.1 — Khóa cuộn & đọc worklog hiệu quả hơn

## Đã sửa theo yêu cầu Boss

- Thống kê cố định trong viewport; khóa nền bằng body fixed và chặn wheel/touch ở ngoài hoặc tại biên vùng cuộn. Chỉ thanh bộ lọc/nội dung bên trong được cuộn; đóng trả lại vị trí trang. Xử lý chuyển quyền khóa từ lịch/tool overlay và chặn timer đóng màn hình cũ gỡ khóa của thống kê.
- Thẻ thống kê nền có nền riêng sáng/tối, viền, bóng đổ nổi và tay nắm nhỏ. Khi kéo tăng độ nổi; bấm mở/kéo di chuyển, vị trí và giới hạn viewport giữ nguyên.
- **Bấm logo góc trên để làm mới dữ liệu:** cập nhật dashboard và danh sách Subtask ở nền, giữ bộ lọc tìm tại chỗ/vị trí cuộn/form đang nhập; không location.reload, không đăng nhập lại, không reset báo cáo đang chạy hoặc gửi lại lệnh ghi Jira. Logo có animation và chống bấm lặp khi đang làm mới. Các màn hình khác vẫn có nút tải lại riêng như cũ.

## Thuật toán đọc thống kê

Search yêu cầu thêm trường worklog. Nếu Jira trả một danh sách worklog **đầy đủ và hợp lệ** (startAt=0, số bản ghi bằng total), app dùng luôn trang đó để cộng giờ, thay cho GET riêng trên từng issue. Trường rỗng có total=0 chỉ được dùng khi không mâu thuẫn với timespent dương. Không dùng riêng timespent hay JQL worklogDate để suy ra tổng kỳ.

Trường thiếu/ẩn, danh sách bị cắt, sai metadata/ID/ngày/tác giả/thời lượng hoặc vượt ngân sách dữ liệu phản hồi sẽ quay về đọc đầy đủ endpoint worklog theo trang. Mỗi trang search dành tối đa khoảng 1,5MB cho dữ liệu worklog chuẩn hóa; phần không vừa không bị coi là rỗng. Nếu Jira từ chối trường worklog bằng HTTP400, search thử lại không có trường này rồi dùng luồng đọc cũ. Trang issue/worklog, múi giờ, tác giả, OT thật và quyền vẫn theo bản trước.

Fixture 1.000 issue, mỗi issue có một log đầy đủ trong search: cần **10 request đọc giờ thay vì 1.010** theo cách cũ, tổng giây giữ nguyên. Con số này không gồm request metadata/OT, không phải cam kết nhanh hơn 99% theo thời gian thực. Hiệu quả trên Jira thật phụ thuộc tỷ lệ issue được trả đầy đủ, độ trễ mạng và pha đối chiếu OT; issue nhiều log bị cắt vẫn phải đọc riêng.

## Checkpoint và cảnh báo trong ảnh

Ảnh không chứa mã lỗi lưu trữ gốc nên chưa thể kết luận là hết dung lượng hay lỗi kết nối kho trình duyệt. Bản này không che cảnh báo:
- Tự mở lại kết nối IndexedDB và thử một lần đối với InvalidStateError/UnknownError.
- Hiển thị mã lỗi chuẩn; QuotaExceededError thông báo thiếu bộ nhớ, SecurityError thông báo trình duyệt chặn lưu.
- Khi lưu thất bại, ngừng đẩy cursor mới của lượt đó: app vẫn tính trong RAM, mốc trên thiết bị dừng ở lần commit thành công. Không để cursor pha hoàn tất vượt qua trang chưa lưu.
- Khi phục hồi, kiểm tra các trang liên tục; checkpoint V1.32 bị thiếu trang được đọc bù trước khi chốt. Trang hợp lệ vẫn dùng lại, không cộng trùng.
- Worklog lấy sẵn từ search được lưu trong checkpoint trang issue, được phục hồi chính xác và không lưu trùng sang trang worklog riêng.

Không thể bảo đảm khôi phục dữ liệu mà trình duyệt chưa ghi thành công hoặc đã xóa. Không thêm lưu mật khẩu/token/request ghi. Giữ quy tắc logout chủ động xóa, hết phiên có thể đăng nhập cùng account để tiếp tục; JavaScript có thể bị hệ điều hành tạm dừng.

## Cài đặt và cập nhật

Giải nén **Quick-Jira-Log_v1.32.1.zip**, mở **Quick-Jira-Log-V1.32.1**. Node24.x:

```bash
npm ci
npm test
```

Giữ nguyên APP_SESSION_SECRET và cấu hình Vercel đang dùng. Không thêm package runtime, database server, biến môi trường hay migration. Hướng dẫn GitHub/Vercel/biến môi trường chi tiết được kế thừa ở bên dưới. Chưa push/deploy.

PWA shell/cache và version tăng 1.32.1, thêm stats-scroll-lock.js/soft-refresh.js. Không yêu cầu xóa dữ liệu website khi cập nhật; checkpoint 1.32.0 được đọc tiếp/đọc bù. Nếu rollback về 1.32.0, hãy chạy **Xem thống kê mới**, vì bản cũ chưa xử lý worklog nằm trong trang search; không dùng lại checkpoint tạo bằng 1.32.1.

Xem RELEASE_V1.32.1.md và TESTING.md. Cần thử Safari/iPhone thật và đối chiếu số liệu Jira công ty sau deploy.

**Kế tiếp đề xuất: V1.33.0 — Phân tích Sub-task Type theo thành viên:** phân bổ giờ theo custom field thật, drilldown công việc trong từng loại. Chưa xây dựng/chưa chốt.

---

## Tài liệu nền V1.32.0 (các thay đổi V1.32.1 ở trên được ưu tiên)

# Quick Jira Log V1.32.0 — Loading animation & khôi phục thống kê

## Cách sử dụng bản mới

- Dữ liệu đọc tải nền, không khóa toàn app. Dashboard giờ làm lúc mới vào dùng skeleton shimmer trên các ô số; lịch, Subtask, tra cứu và các vùng đọc dùng animation tại chỗ thay cho thông báo tải dạng chữ. Lỗi/quyền/dữ liệu thiếu vẫn hiển thị rõ. Khi cập nhật dashboard đã có dữ liệu cùng ngày, giữ các số cũ và chỉ animate trạng thái đối chiếu.
- Thống kê có một thẻ nổi gọn: spinner, tên giai đoạn, phạm vi, **X/Y · Z%** và thanh tiến độ. **Bấm toàn bộ thẻ** để mở thống kê; đã bỏ nút Mở và mũi tên. **Kéo thẻ** để đổi vị trí, thả không mở màn hình. Vị trí được nhớ trên thiết bị và giữ trong viewport khi đổi kích thước/xoay màn hình. Thông báo hoàn tất giữ khoảng 12 giây.
- Màn hình thống kê có tiến độ gọn, mô tả cách tính thu gọn. Có thể sang chức năng khác trong lúc đọc, tạm dừng, tiếp tục hoặc thử lại phần lỗi.
- Xác thực và thao tác **ghi Jira** vẫn có spinner/bảo vệ lúc gửi, xác nhận, chống gửi trùng và xử lý kết quả chưa xác định. Không tự phát lại POST/PUT/DELETE sau khi mở lại app.

## Bộ lọc và cách tính thống kê

Chọn tất cả/một dự án; toàn thời gian, năm, tháng, tuần hoặc khoảng ngày tùy chọn. Không tự quét toàn bộ khi vừa mở màn hình. Phạm vi lọc được chụp tại lúc bấm Xem thống kê; sửa bộ lọc chưa áp dụng không đổi tác vụ đang chạy. Bấm Xem với phạm vi mới hủy lượt đọc cũ.

Cộng giây theo **tác giả worklog**, không theo Assignee; đếm Subtask duy nhất từng người và toàn phạm vi. Giờ trên Story/Task/Bug được cộng nhưng không tăng số Subtask. Lọc worklog.started theo giờ Việt Nam, gồm hai ngày đầu/cuối; log qua nửa đêm tính theo ngày bắt đầu. Không dùng tổng timespent toàn lịch sử thay cho kỳ chọn.

OT chỉ xác định từ thuộc tính thật WorklogPRO. Tổng giờ có trước; phần OT đang/chưa đối chiếu được ghi **Chưa rõ OT**, không tự coi là giờ thường. Chỉ cộng dữ liệu tài khoản được quyền xem. Trang lỗi/lặp/không tiến lên hoặc tổng thay đổi được cảnh báo tạm tính; 100% lượt xử lý không có nghĩa mọi dữ liệu đều đầy đủ.

## Tốc độ đọc

- GET project-stats op=issues yêu cầu 100 issue/trang (trước 50); op=worklogs yêu cầu 500 worklog/trang (trước 100). Jira có thể trả trang nhỏ hơn; app tiếp tục theo số bản ghi thật.
- Tối đa 5 công việc đọc worklog đồng thời (trước 3); dùng hàng đợi, hạn chế cập nhật tiến độ UI khoảng 80ms/lần để giảm dựng lại giao diện.
- Đọc giờ làm với ot=0 không phải chờ WorklogPRO. Sau khi đọc giờ, hiển thị tổng và đối chiếu OT riêng qua op=overtime, tối đa 25 ID/request và 2 request đồng thời. Không bỏ qua native OT để đổi lấy tốc độ.
- Không giới hạn tổng số trang, số năm hay ngày tùy chọn bằng mức trần tự đặt. Vẫn quét đủ các issue thấy được thay vì dựa chỉ mục worklogDate/Author có thể bỏ sót. Thời gian thực tế phụ thuộc Jira/quyền/số lượng dữ liệu; chưa có benchmark trên Jira công ty.

## Giữ tiến độ khi quay lại app

Sau từng trang issue/worklog và từng nhóm OT, **trang dữ liệu và cursor được ghi cùng một transaction IndexedDB** trên thiết bị. Khi đăng nhập cùng tài khoản/mở lại trang, app dựng lại dữ liệu đã đọc, khôi phục bộ lọc, màn hình thống kê và tiếp tục từ trang chưa lưu; worklog ID được chống cộng trùng. Báo cáo đã hoàn tất cũng được khôi phục kèm thời điểm lưu; bấm Xem thống kê để chạy một lượt mới.

Lưu thêm ảnh chụp chỉ đọc của dashboard, danh sách Subtask đã tải, lịch của chính mình, tổng hợp và màn hình đang xem; hiển thị lại khi phù hợp rồi đối chiếu Jira. Không lưu bản nháp ghi Jira/lịch kéo thả để tự gửi lại. Không tự reload trang khi service worker nhận shell mới; chỉ cập nhật khi Boss bấm nút cập nhật, sau khi yêu cầu lưu checkpoint.

**Giới hạn:** đây là tiếp tục trên thiết bị, không phải job server. iOS có thể treo JavaScript khi app ra nền; tác vụ chỉ chạy tiếp khi app được hoạt động lại. Checkpoint thống kê được giữ đến khi chạy lượt mới hoặc đăng xuất; ảnh chụp các màn hình khác chỉ dùng trong 24 giờ kể từ lần lưu; trình duyệt có thể thu hồi kho dữ liệu hoặc người dùng xóa dữ liệu website. Trang đang đọc dở chưa commit sẽ đọc lại. Không thể đảm bảo khôi phục khi thiết bị đã xóa kho lưu. Lỗi ghi checkpoint được báo để biết cần giữ app mở.

Dữ liệu worklog, tên nhân sự/mô tả và kết quả đã đọc được lưu cục bộ theo username để phục hồi; **không lưu thêm mật khẩu/token hay request ghi**. Đăng xuất chủ động xóa checkpoint/view tài khoản; hết phiên giữ checkpoint để tiếp tục sau khi đăng nhập lại cùng tài khoản. Hai cửa sổ dùng runID ngăn tác vụ cũ ghi đè tác vụ mới. Không dùng dữ liệu đã lưu của người khác cho tài khoản hiện tại. Lượt quét mới/đăng xuất sẽ dọn checkpoint tương ứng; không tự xóa một thống kê đang làm dở vì quá một ngày.

Một lượt quét nhiều request, đặc biệt sau khi khôi phục, không phải snapshot giao dịch của Jira. Worklog có thể đã đổi trong khi app đóng; dữ liệu khôi phục được ghi rõ thời điểm, cảnh báo khi phát hiện tổng thay đổi. Muốn số liệu mới hoàn toàn cần chạy thống kê mới.

## Cài đặt, kiểm thử và nâng cấp

Giải nén Quick-Jira-Log_v1.32.0.zip, dùng thư mục Quick-Jira-Log-V1.32.0. Node **24.x**, npm ci, npm test. Giữ APP_SESSION_SECRET và cấu hình Vercel hiện có; không thêm package runtime, dịch vụ database, biến môi trường hay migration phía server. Thêm kho IndexedDB phía trình duyệt; không cần reset dữ liệu khi nâng cấp. Source chưa push/deploy.

PWA shell/cache/version 1.32.0 gồm report-storage.js và resume-state.js. Cập nhật có chủ đích thay vì tự reload giữa tác vụ. Rollback deploy về 1.31.0 không sửa/xóa worklog Jira; bản cũ không biết tiếp tục checkpoint mới.

Xem TESTING.md và RELEASE_V1.32.0.md cho kết quả thực tế. Cần đối chiếu Jira công ty và thử Safari/iPhone thật sau deploy.

**Tiếp theo đề xuất: V1.33.0 — Phân tích Sub-task Type theo thành viên:** phân bổ giờ theo trường custom Sub-task Type thật trên Jira, mở chi tiết nhóm. Chưa xây dựng/chưa chốt; V1.32 được dùng cho yêu cầu trải nghiệm/khôi phục hiện tại.

---

## Tài liệu kế thừa V1.30.0 — Thống kê dự án

Các giới hạn 93 ngày/5.000 issue/10.000 worklog và cơ chế khóa tải dữ liệu được mô tả trong phần lịch sử dưới đây đã được thay thế bởi V1.31 ở trên.

## Sử dụng chức năng mới

1. Đăng nhập Jira như hiện tại. Trên PC bấm **Thống kê dự án** ở thanh công cụ; trên mobile bấm **Dự án** ở taskbar (4 mục trên cùng một hàng).
2. Nhập/chọn mã dự án từ danh sách gợi ý. Nếu không tải được danh sách, vẫn có thể nhập mã trực tiếp.
3. Chọn **Tháng**, **Tuần** hiện tại hoặc nhập khoảng ngày **Tùy chọn** (tối đa 93 ngày). Bấm **Xem thống kê**; đây cũng là nút tải lại dữ liệu mới nhất.
4. Xem tổng giờ, số thành viên có log, số Subtask duy nhất và các thanh so sánh giờ theo thành viên. Lọc thành viên hoặc sắp xếp theo giờ, số Subtask, tên mà không gọi lại Jira. % tổng giờ luôn lấy mẫu số là tổng giờ dự án trong kỳ, không đổi theo bộ lọc thành viên. Chiều dài thanh so với người có giờ cao nhất; % được ghi rõ dưới thanh.
5. Bấm thành viên để mở các công việc đã log; bấm công việc để xem từng worklog, ngày/giờ, mô tả, thời lượng và trạng thái OT. Màn hình thống kê chỉ đọc, không có sửa/xóa.

### Quy tắc thống kê

- Cộng chính xác `timeSpentSeconds` theo tác giả worklog (key/accountId/name), không theo Assignee hay người sửa sau cùng. Hiển thị giờ/phút sau khi cộng; không làm tròn từng worklog. Kỳ dựa trên ngày `started` quy đổi Asia/Ho_Chi_Minh, gồm cả hai ngày đầu/cuối; worklog qua nửa đêm tính toàn bộ theo ngày bắt đầu, không tự chia giờ qua ngày khác.
- **Subtask đã log**: số issue có `issuetype.subtask=true` khác nhau theo người trong kỳ. Nhiều log hoặc nhiều block tách của cùng Subtask chỉ đếm một lần. A và B cùng log trên một Subtask thì mỗi người tính một; KPI dự án chỉ đếm một Subtask duy nhất. Không cộng số Subtask của các thành viên để tính KPI này. Không phải số Subtask được giao, đã hoàn thành hoặc custom Sub-task Type.
- Tổng giờ gồm cả log trực tiếp trên Story/Task/Bug/các loại khác; chúng được ghi là **Công việc khác**, không cộng số Subtask. Không dùng aggregate timespent của cha để tránh cộng trùng giờ con.
- Chỉ hiện người có worklog trong kỳ mà tài khoản đang đăng nhập được phép xem; không suy ra danh sách toàn bộ nhân sự/những người 0h từ vai trò dự án. Worklog hạn chế hiển thị hoặc issue ẩn có thể bị Jira bỏ khỏi kết quả: app luôn ghi phạm vi quyền xem, không tuyên bố là toàn bộ dữ liệu công ty.
- OT đọc thuộc tính thật từ WorklogPRO qua luồng hiện có; không suy từ giờ trong/ngoài ca hoặc marker mô tả. Không đọc được thì ghi **Chưa rõ OT**; giờ đó vẫn nằm trong tổng giờ, không tự gán là giờ thường.

### Độ đầy đủ và tốc độ

- Quét mọi issue được phép xem của dự án theo `id ASC`, không lọc ứng viên bằng worklogDate/worklogAuthor hoặc Assignee. Đọc 10 issue mỗi lượt, tối đa 5 luồng đọc worklog; tiếp tục đọc các trang worklog đến đủ total. Tìm kiếm POST là truy vấn đọc; chỉ fallback GET khi Jira trả 403/404/405. Không có API ghi Jira trong chức năng này.
- Tiến trình tải ở giữa màn hình, nền tối và khóa thao tác trong toàn bộ lượt quét; báo số công việc đã đọc. Nút xem không gửi trùng khi đang tải. Đổi tài khoản/đăng xuất xóa dữ liệu và vô hiệu kết quả cũ. Không lưu báo cáo/PII xuống localStorage/database; kết quả giữ trong bộ nhớ phiên mở, có thời điểm cập nhật. Mỗi lần bấm Xem thống kê truy vấn mới, không có cache báo cáo dùng chung giữa tài khoản.
- Giới hạn 5.000 issue mỗi lần thống kê, 10.000 worklog/issue, thời gian đọc giới hạn theo lượt; OT xác minh tối đa 120 bản ghi mỗi lượt và có deadline. Nếu vượt giới hạn, thiếu/sai/lặp trang, lỗi quyền hay kết nối: ghi **Tạm tính — dữ liệu chưa đầy đủ**, giữ phần đã đọc và nêu issue/lỗi cần xử lý. Có thể bấm Xem thống kê để quét lại. OT chưa biết hiển thị riêng, không làm mất tổng giờ.
- Đây là lượt đọc nhiều request, không phải snapshot giao dịch. App cảnh báo khi tổng số issue thay đổi hoặc lặp issue giữa các lượt; thay đổi đồng thời khác vẫn có thể xảy ra, cần tải lại/đối chiếu Jira khi chốt báo cáo. Không dùng giới hạn ngày để hứa thời gian tải cố định: dự án có nhiều issue/worklog sẽ tải lâu hơn.
- Không thêm dependency runtime, database, biến môi trường hay migration. Giữ nguyên API ghi logwork, lịch, giờ làm việc, Overtime, editor ảnh và luồng Jira hiện có. API mới `GET /api?action=project-stats&project=CAL&from=2026-10-01&to=2026-10-31&startAt=0`; mỗi trang trả dữ liệu đã lọc ngày và trạng thái đọc, bắt buộc session.

### Triển khai và kiểm tra

Tiếp tục hướng dẫn cài đặt, APP_SESSION_SECRET, GitHub và Vercel ở các mục bên dưới. Runtime Node 24; `npm run test`, `npm run test:project-stats`; kiểm tra browser dùng `QJL_CHROMIUM_PATH=/path/to/chromium npm run test:project-stats-ui` với Playwright trong môi trường QA. Không đóng gói Chromium/Playwright hay node_modules vào source. Deploy bản mới theo kết nối GitHub hiện có hoặc import Vercel với cấu hình sẵn; chưa push/deploy trong lần bàn giao này. Không có migration/reset dữ liệu. Muốn quay lại: deploy lại source V1.29.0; dữ liệu Jira không bị chuyển đổi bởi báo cáo.

Đã kiểm tra API qua router/session và Chromium với Jira giả lập trên PC/mobile/ngang, giao diện light/dark. Chưa xác minh với Jira công ty và Safari/iPhone thật; cần đối chiếu một dự án/kỳ có số liệu đã biết và quyền thực tế sau deploy.

**Phiên bản kế tiếp đề xuất:** V1.31.0 — Phân tích Sub-task Type theo thành viên: từ một người mở phân bổ giờ theo trường custom Sub-task Type trên Jira, rồi xem các Subtask thuộc nhóm. Chưa xây dựng/chưa chốt.

---

## Tính năng kế thừa V1.29.0 — Ảnh trong trình soạn thảo

## Soạn mô tả có ảnh

- Khi tạo công việc/Subtask hoặc sửa thông tin Story/Task/Bug/Subtask, mở **Ảnh**, chọn ảnh PNG/JPEG/GIF/WebP/AVIF. Có thể dán ảnh từ clipboard vào vùng Soạn thảo hoặc kéo tệp ảnh vào vị trí con trỏ trên PC. Trên mobile dùng Chọn ảnh từ bộ chọn tệp/Photos. HEIC/SVG chưa hỗ trợ; chọn bản JPEG khi cần.
- Đặt con trỏ trước khi chọn hoặc bấm Chèn. Ảnh xuất hiện đúng vị trí trong mô tả; chữ trước/sau giữ nguyên. Chạm ảnh trong Soạn thảo để chọn cỡ 240/480/960px hoặc nguyên cỡ, hoặc Xóa vị trí ảnh. Muốn đổi vị trí: xóa vị trí cũ, đặt con trỏ mới rồi Chèn lại từ danh sách ảnh. Nhiều vị trí có thể dùng chung một ảnh, chỉ đính kèm một tệp.
- Có thể chèn ảnh đính kèm hiện có của issue từ danh sách trong panel Ảnh. Cú pháp ảnh đơn giản `!filename!`, `!filename|width=480!` được giữ qua Soạn thảo/Wiki/Xem trước. Cú pháp nâng cao chưa hỗ trợ vẫn ở Wiki, không tự làm mất nội dung. Ảnh chưa tải/không hỗ trợ xem trực tiếp có placeholder hoặc đường mở Jira.
- Chọn ảnh chỉ giữ File/blob trong bộ nhớ trình duyệt. Không tải Jira khi chọn, chèn, xem trước hoặc quay lại từ xác nhận. Chỉ tải các ảnh mới còn được tham chiếu trong mô tả khi bấm xác nhận lưu/tạo. Xóa vị trí trước xác nhận thì ảnh không dùng không được tải lên. Tối đa 10 ảnh trong bản nháp, 3 MiB/ảnh hoặc giới hạn Jira thấp hơn. Tệp chưa dùng vẫn chiếm một vị trí trong danh sách cho tới khi reset bản nháp.
- Giữ nguyên byte ảnh, không nén hoặc chuyển định dạng. Tên đính kèm được tạo riêng `qjl-<mã ngẫu nhiên>.<đuôi>` để tránh trùng tên trong Jira wiki; tên tệp gốc vẫn hiện trong danh sách đang soạn. Bản nháp ảnh không lưu lâu dài trên thiết bị, không được khôi phục sau tải lại app/đăng xuất.

## Xác nhận, tải ảnh và phục hồi lỗi

**Sửa công việc đang có:** xem lại nội dung trước/sau cùng ảnh rồi xác nhận. App đọc lại metadata/updated trước tải, đính kèm tuần tự, đối chiếu lại các trường gốc và revision, rồi lưu thay đổi với updated mới. Nếu ngoài app sửa dữ liệu trong quá trình này, app dừng thay vì ghi đè; ảnh đã đính kèm vẫn ở Jira. Không tự xóa tệp đã tải khi hủy/xóa vị trí hoặc khi một bước sau lỗi.

**Tạo công việc mới:** xác nhận tạo → tạo issue với phần mô tả chữ → tải ảnh → hoàn thiện Description chứa ảnh. Nếu mô tả chỉ có ảnh, phần mô tả ban đầu là “Ảnh đính kèm đang được bổ sung.”. Không ghi tham chiếu ảnh chưa tồn tại vào mô tả ban đầu. Cần quyền Create Issues, Create Attachments và Edit Issues/Description sau khi tạo; workflow hoặc edit screen có thể hạn chế bước cuối.

Nếu bước ảnh/mô tả lỗi sau khi tạo, biên nhận ghi rõ issue đã tạo, có **Kiểm tra & tiếp tục ảnh** để hoàn thiện trên chính mã đó. Không gọi tạo issue lần nữa. Tệp đã xác nhận không tải lại. Khi mất phản hồi tải ảnh, đối chiếu tên ngẫu nhiên và size duy nhất trên danh sách Jira; nếu chưa chứng minh được thì yêu cầu Boss kiểm tra Jira trước khi thử phần còn thiếu. Nếu mất phản hồi ghi mô tả, đọc lại thấy đúng mô tả cuối thì xác nhận hoàn tất; nếu chưa rõ, không tự gửi lại.

Giữ trang đang mở để tiếp tục ảnh. Đóng/mở form giữ bộ nhớ trong phiên; reset bản nháp, đổi context khiến form bị dọn, tải lại app hoặc đăng xuất sẽ mất File đang chờ. Khi đó đối chiếu issue/tệp trên Jira rồi chọn lại tệp thiếu; không tạo lại issue đã có. Nếu kết quả tạo issue chưa rõ và chưa có mã đáng tin cậy, app không tự tải ảnh vào một issue đoán được.

## Xem ảnh lớn trong chi tiết

- Bấm ảnh trong Description hoặc Xem ảnh ở tab tệp để mở popup.
- Nút **+ / −**, thanh kéo **100–500%**, **Vừa khung**; PC dùng bánh xe và double click, kéo chuột để xem phần ảnh đang phóng. Mobile dùng pinch hai ngón, chạm hai lần và kéo ảnh. Khung ảnh chặn pan ra ngoài; đổi kích thước/xoay màn hình thì fit lại.
- Đóng popup/mở ảnh khác đưa về vừa khung; không làm zoom hoặc kéo giao diện phía sau.
- Ảnh lớn hơn giới hạn proxy hiện có dùng thumbnail nếu Jira có. Popup ghi rõ đang xem thumbnail; phóng to không tạo thêm độ nét, mở Jira để lấy ảnh gốc. Giới hạn proxy/bảo vệ phiên của các bản trước giữ nguyên.

## Cài đặt, kiểm thử và triển khai

Giải nén `Quick-Jira-Log_v1.29.0.zip`, dùng `Quick-Jira-Log-V1.29.0`. Node **24.x**: `npm ci`, `npm run test`. Không thêm dependency runtime, database, migration hoặc biến môi trường bắt buộc; giữ APP_SESSION_SECRET và cấu hình Vercel hiện tại. Cấu hình CSP thêm `blob:` chỉ ở img-src để preview ảnh cục bộ; script/connect vẫn cùng origin. Version/cache shell/manifest đổi 1.29.0. Hướng dẫn GitHub/Vercel đầy đủ nằm tiếp trong README. Source chưa push/deploy.

Backend thêm GET/POST `jira-description-edit-options` / `jira-description-edit` để hoàn thiện Description sau tạo. Chỉ nhận trường Description, vẫn Edit Issues/editmeta, revision/updated, origin/session, idempotency và đọc lại sau ghi; không nhận sửa Summary/parent/type qua endpoint này. Tải tệp tiếp tục qua endpoint Jira attachment đã có; không thêm host hoặc kho lưu trữ ngoài.

- `npm run test`: logic/API kế thừa, renderer/codec ảnh, chữ ký định dạng/giới hạn file, CSP và scope Description riêng.
- `npm run test:images-ui`: Chromium bốn viewport 1440×900,390×844,320×683,844×390 với CSP Vercel. Frontend → session/router thật → mock Jira multipart/upload/PUT → readback; vị trí ảnh, cỡ, preview không ghi, Subtask/Story, mất phản hồi ảnh không trùng, tạo xong thiếu quyền ảnh/tiếp tục không tạo lại, mất phản hồi mô tả/đọc lại, paste ảnh, zoom/pan/pinch.
- Hồi quy editor/tạo công việc, sửa công việc cha, đính kèm và chi tiết ảnh: `test:editor-ui`, `test:parent-edit-ui`, `test:attachments-ui`, `test:detail-fixes`.
- Chưa kiểm chứng Jira công ty, Safari/iPhone vật lý, clipboard hệ điều hành thật, Redis thật hoặc deploy. Pinch/paste được mô phỏng trong Chromium. Sau deploy cần thử Photos iPhone, quyền Attach/Edit sau Create, Jira wiki/renderedFields và workflow công ty; kiểm tra lịch/logwork/OT tiếp tục như cũ.

Rollback deployment không xóa issue, ảnh hay các cập nhật đã ghi Jira. Không có migration. Ảnh/nội dung bản nháp chỉ tồn tại trong bộ nhớ; không dựa vào rollback để phục hồi bản nháp.

## Phiên bản kế tiếp — đề xuất chưa xây dựng

**V1.30.0 — Logwork từ mọi công việc:** mở rộng logwork từ chi tiết/tra cứu Jira tới các Subtask được phép log, không phụ thuộc danh sách filter logwork đang mở; chọn thời điểm, xem lại và ghi theo ràng buộc giờ hiện hành. Chờ Boss chọn.

---

Lịch sử các bản trước; hướng dẫn/roadmap V1.29.0 ở trên được ưu tiên:

# Quick Jira Log V1.28.0 — Sửa thông tin Story/Task/Bug

## Cách sử dụng

1. Mở Story, Task hoặc Bug từ kết quả tra cứu/filter Jira.
2. Bấm **Cập nhật → Sửa thông tin Story/Task/Bug** (tên nút theo loại đang xem).
3. Sửa **Summary**, **Estimate**, **Description** theo quyền và edit screen Jira của chính công việc đó. Những trường không được phép sửa bị khóa, có lý do và đường Mở Jira.
4. Bấm **Xem lại thay đổi** để xem giá trị trước/sau; mô tả mới có xem trước định dạng. Quay lại giữ nội dung; chỉ **Lưu thay đổi** mới gửi Jira.
5. Sau khi Jira ghi và app đọc lại xác nhận, có toast; chi tiết và thẻ trong danh sách đang mở cập nhật giá trị mới.

Description dùng editor trực quan hiện có: đậm/nghiêng, màu, tiêu đề, danh sách, bảng, Soạn thảo/Wiki/Xem trước. Mô tả không sửa giữ nguyên chuỗi gốc khi chỉ thay trường khác. Macro nâng cao tiếp tục sửa trong Wiki; mô tả không phải chuỗi wiki hoặc dài quá 20.000 ký tự chỉ xem/mở Jira để sửa.

Estimate là **Original Estimate**, dùng giờ/phút (`2h 30m`, `90m`, `0m`), giữ Remaining Estimate khi Jira trả về số hợp lệ. Không nhận đơn vị ngày/tuần hoặc số thập phân trong form sửa để tránh đoán cấu hình Jira. Không xóa Estimate về null; dùng 0m đặt bằng 0. Quyền/legacy time tracking/validator Jira vẫn quyết định có được ghi hay không.

Đóng/mở lại form trong cùng chi tiết giữ phần đang sửa; Tải lại có bước xác nhận thay bằng dữ liệu mới. Đổi issue, tải lại chi tiết, tải lại app hoặc đăng xuất xóa bản sửa trong bộ nhớ. Không lưu draft vào thiết bị.

## Phạm vi và tính chính xác

- Hỗ trợ loại Jira có tên Story, Task, Bug (không phân biệt hoa/thường), có `subtask: false`; không hardcode issue type ID. Epic và các loại custom/đổi tên chưa được mở trong bản này. Subtask tiếp tục dùng luồng bốn trường của V1.27.0.
- Công việc cha chỉ có ba trường trên; không hiện hoặc phụ thuộc trường Sub-task Type. Backend có endpoint riêng, không nhận ghi custom Sub-task Type, parent hay issuetype qua chức năng sửa công việc cha.
- Dùng chung bộ xử lý quyền/metadata/validation với Subtask nhưng phân biệt scope phía server. Mỗi lần lưu đọc lại Edit Issues, editmeta, updated và revision; chỉ gửi trường thực sự đổi. Metadata/quyền/loại/updated thay đổi thì yêu cầu tải lại và xem lại trước khi gửi.
- Sau PUT kiểm tra lại giá trị các trường đổi, issue type ID và quan hệ parent (kể cả công việc không có parent). Không đổi issue type, cha, Subtask con, luồng logwork/lịch/OT trong source này. Thông báo và automation Jira vẫn áp dụng bình thường.
- Kiểm tra updated trước PUT không phải khóa giao dịch tuyệt đối; vẫn có cửa sổ thay đổi đồng thời giữa kiểm tra và ghi. Chỉ gửi trường thay đổi giúp giảm ghi đè dữ liệu khác.
- Không tự retry PUT. Mất phản hồi hoặc chưa đối chiếu được không báo thành công và khóa lưu trong phiên theo tài khoản/mã issue. Mở Jira đối chiếu, rồi bấm Tôi đã kiểm tra trên Jira để tải dữ liệu mới. Khóa trong bộ nhớ mất khi tải lại app; sau lỗi chưa rõ luôn kiểm tra Jira trước khi gửi yêu cầu mới.
- Dùng idempotency hiện có; production nhiều serverless instance nên giữ cấu hình Redis tùy chọn đã có. Không thêm lưu trữ hoặc biến môi trường bắt buộc.

## Source và triển khai

Giải nén `Quick-Jira-Log_v1.28.0.zip`, mở thư mục `Quick-Jira-Log-V1.28.0`. Node **24.x**; `npm ci`, `npm test`. Giữ cấu hình Vercel và APP_SESSION_SECRET hiện tại. Không thêm dependency runtime, database hoặc migration. Hướng dẫn GitHub/Vercel/cấu hình đầy đủ tiếp tục nằm trong README bên dưới. Bản này chỉ bàn giao source, chưa push/deploy.

API mới: GET `/api?action=jira-parent-edit-options&key=CAL-2`; POST `/api?action=jira-parent-edit` nhận key, revision, expectedUpdated, requestId và values (`summary`, `estimate`, `description`). Session HttpOnly, kiểm tra origin, no-store, giới hạn body 96 KiB. API Subtask cũ giữ nguyên URL và phạm vi.

Version, manifest và cache shell cập nhật 1.28.0. Sau deploy tải lại PWA và kiểm tra nhãn phiên bản. Có thể rollback deployment; rollback app không hoàn tác các giá trị đã sửa trên Jira. Dùng lịch sử Jira để đối chiếu khi cần khôi phục dữ liệu.

## Kiểm thử và giới hạn

- `npm test`: bộ logic/API kế thừa, Subtask và `tests/jira-parent-edit-tests.js` mới: cả Story/Task/Bug với ID khác nhau, whitelist, quyền, readonly, stale/schema/type conflict, parent, Estimate/remaining, replay/lost response/readback, CSRF/hết phiên và nội dung quá giới hạn.
- `npm run test:parent-edit-ui`: Chromium PC 1440×900, mobile 390×844/320×683, ngang 844×390. Frontend chạy qua router/session thật, mock Jira tại fetch; đọc/sửa/xem lại/giữ draft/xác nhận/đối chiếu, danh sách cập nhật, xung đột, mất phản hồi, khóa quyền và dark/light. Các viewport lần lượt thử Story, Task, Bug, Story.
- `npm run test:subtask-edit-ui` và `npm run test:update-ui`: hồi quy sửa Subtask và các thao tác cập nhật nhanh cũ.
- Chưa truy cập Jira công ty, Safari/iPhone vật lý, Redis thật hoặc deploy. Sau triển khai cần thử một Story/Task/Bug có quyền, kiểm tra dữ liệu thật, validator/edit screen/time tracking của công ty và hồi quy lịch/logwork/OT.

## Phiên bản kế tiếp — đề xuất, chưa xây dựng

**V1.29.0 — Lịch sử thay đổi Jira:** xem ai đã sửa, thời điểm và giá trị trước/sau trong chi tiết công việc; hỗ trợ tải thêm và lọc theo trường để đối chiếu các lần cập nhật. Chờ Boss chọn.

---

Lịch sử các bản trước; hướng dẫn/roadmap V1.28.0 ở trên được ưu tiên:

# Quick Jira Log V1.27.0 — Sửa thông tin Subtask

## Chức năng và cách sử dụng

1. Vào Công việc Jira, tìm hoặc chọn filter, mở một Subtask (có thể mở từ tab Subtask của công việc cha).
2. Bấm **Cập nhật → Sửa thông tin Subtask**. App tải giá trị hiện tại, Edit Issues và edit metadata của đúng Subtask.
3. Sửa **Summary**, **Sub-task Type**, **Estimate**, **Description**. Trường Jira không cho sửa sẽ bị khóa và có lý do. Sub-task Type là custom field thực tế, không phải Issue Type; app không đổi loại issue hoặc công việc cha.
4. Description dùng editor trực quan của V1.26.0: định dạng, màu, tiêu đề, bảng, danh sách, Wiki và xem trước. Mô tả không đụng tới được giữ nguyên chuỗi gốc, không bị chuyển lại định dạng khi chỉ sửa trường khác. Macro nâng cao giữ ở Wiki. Mô tả không phải chuỗi wiki hoặc quá 20.000 ký tự không được sửa trong app.
5. Estimate là **Original Estimate**, nhập giờ/phút như `2h 30m`, `90m`, `0m`. App dùng phút để không đoán độ dài ngày/tuần của Jira; không nhận `d`, `w` hay số thập phân trong form sửa này. Giữ Remaining Estimate nếu Jira trả về giá trị số hợp lệ. Không sửa thời gian đã log. Chưa có chức năng xóa Original Estimate về null; dùng 0m để đặt bằng 0.
6. Bấm **Xem lại thay đổi**: chỉ liệt kê trường thay đổi với giá trị hiện tại và sau khi lưu. Description mới có bản xem trước. Bấm Quay lại giữ phần đang sửa; chỉ **Lưu thay đổi** mới gửi Jira.
7. App đọc lại quyền, metadata, thời điểm cập nhật và lựa chọn trước khi PUT, chỉ gửi trường thực sự đổi. Sau PUT đọc lại để xác nhận đúng dữ liệu và cha/Issue Type; thành công sẽ có toast và cập nhật chi tiết cùng thẻ kết quả đang mở.

Đóng form rồi mở lại trong cùng chi tiết giữ phần đang sửa. Đổi công việc, tải lại chi tiết hoặc đăng xuất sẽ xóa phần sửa trong bộ nhớ. Nút Tải lại có bước xác nhận bỏ nội dung đang sửa. Không lưu bản sửa vào local storage.

## Quyền, lỗi và đối chiếu

- Quyền và edit screen/workflow Jira quyết định trường có thể sửa. Không dùng create metadata để suy đoán quyền sửa; không bypass field screen/security/validator. Nếu thiếu quyền hoặc trường không có trên edit screen, hiển thị lý do và có đường Mở Jira.
- Tìm custom field theo tên Sub-task Type bằng cơ chế hiện có; nếu trùng tên có thể dùng biến tùy chọn sẵn có `JIRA_SUBTASK_TYPE_FIELD_ID` với ID thật. Lựa chọn theo `allowedValues` của đúng issue, không hardcode Developing/Testing hoặc ID riêng của công ty.
- Nếu Subtask hoặc metadata đã thay đổi sau lúc mở form, chặn trước gửi và yêu cầu tải lại/xem lại. Đây là kiểm tra trước ghi, không phải khóa giao dịch tuyệt đối: thay đổi đồng thời trong khoảng giữa kiểm tra và PUT vẫn phụ thuộc Jira. Không gửi trường không đổi để giảm nguy cơ ghi đè.
- Jira từ chối sẽ hiện lỗi và giữ phần đang sửa. Mất phản hồi hoặc chưa đối chiếu được sẽ không báo thành công, không tự gửi lại. Khóa nút lưu trong phiên theo tài khoản/mã issue; mở Jira kiểm tra, sau đó bấm Tôi đã kiểm tra trên Jira để tải dữ liệu mới. Nếu tải lại cả app thì khóa trong bộ nhớ không còn; luôn đối chiếu Jira trước khi gửi yêu cầu mới sau một lỗi chưa rõ kết quả.
- Dùng cơ chế idempotency hiện có, không tự retry PUT. Với nhiều serverless instance nên dùng Redis tùy chọn đã có của app để chia sẻ trạng thái idempotency. Chưa kiểm thử Redis thật trong bản này.

## Source, chạy và triển khai

Giải nén `Quick-Jira-Log_v1.27.0.zip`, mở `Quick-Jira-Log-V1.27.0`. Node **24.x**; chạy `npm ci`, `npm test`. Không thêm dependency runtime, biến môi trường bắt buộc, database hoặc migration. Giữ cấu hình Vercel và `APP_SESSION_SECRET` đang dùng. Hướng dẫn GitHub/Vercel và cấu hình gốc tiếp tục nằm trong README phía dưới. Bản này bàn giao source; chưa push/deploy.

API mới: GET `/api?action=jira-subtask-edit-options&key=CAL-2`, POST `/api?action=jira-subtask-edit` nhận key, revision, expectedUpdated, requestId, values. Backend whitelist bốn alias trường, dùng ID custom field của server; session HttpOnly, kiểm tra origin, no-store và giới hạn body 96 KiB.

Version, manifest và cache shell PWA đã đổi 1.27.0. Sau triển khai tải lại app và kiểm tra nhãn bản mới. Rollback deployment không hoàn tác các giá trị đã sửa trên Jira; dùng lịch sử Jira để đối chiếu nếu cần khôi phục. Không thay đổi luồng logwork, lịch hoặc Overtime.

## Kiểm thử và giới hạn xác minh

- `npm test`: toàn bộ logic/API kế thừa và bộ mới `tests/jira-subtask-edit-tests.js`.
- `npm run test:subtask-edit-ui`: Chromium PC 1440×900, mobile 390×844/320×683, ngang 844×390; chạy frontend → router/session thật → mock Jira editmeta/PUT → đọc lại, không mock kết quả thành công ngay ở frontend.
- Hồi quy `npm run test:editor-ui`, `npm run test:update-ui`: editor/tạo công việc/Subtask và cập nhật trạng thái/người nhận/ưu tiên/bình luận theo luồng cũ.
- Chưa thao tác Jira công ty, Safari/iPhone vật lý hoặc triển khai thật. Sau deploy cần thử một Subtask có quyền sửa, kiểm tra bốn trường trên Jira; trường bị khóa, validator công ty, legacy time tracking, custom type và chỉnh sửa đồng thời.

## Phiên bản kế tiếp — đề xuất chưa xây dựng

**V1.28.0 — Sửa thông tin Story/Task/Bug:** mở rộng luồng sửa Summary, Estimate và Description cho công việc cha; xem lại trước/sau, kiểm tra edit metadata và đối chiếu sau lưu theo từng loại. Chờ Boss chọn.

---

Lịch sử các bản trước; hướng dẫn và roadmap V1.27.0 ở trên được ưu tiên:

# V1.26.0 — Soạn mô tả trực quan

## Sử dụng

- Khi tạo công việc hoặc Subtask, mô tả có ba chế độ **Soạn thảo / Wiki / Xem trước**. Chọn chữ rồi dùng đậm, nghiêng, tiêu đề, danh sách hoặc màu chữ. Có thể chèn bảng, thêm hàng/cột hoặc xóa bảng. Bảng mới có 2–10 hàng nội dung, 1–8 cột; nội dung giới hạn 20.000 ký tự Jira wiki.
- Nội dung được chuyển thành Jira wiki trước khi xem lại và xác nhận tạo, không gửi HTML vào Description. Xem trước không ghi Jira. Các macro nâng cao chưa hỗ trợ vẫn giữ nguyên trong chế độ Wiki; không tự chuyển làm mất nội dung. Paste/drop nhận chữ thuần để tránh mang HTML không an toàn vào form.
- Chọn filter là tải danh sách ngay. Đã bỏ kính lúp xanh; kính lúp còn lại mở phần tìm/đổi filter. Trong phần mở rộng có nút tải lại kết quả và áp dụng ID thủ công.
- Nhập mã hoặc tên dự án vào ô phía trên combobox; chọn gợi ý để đồng bộ combobox và tự tải loại công việc. Hỗ trợ phím lên/xuống, Enter, Escape. Gợi ý dùng danh sách dự án đã tải theo quyền (tối đa 1.000 dự án), không gọi API mỗi ký tự. Nếu dự án không có trong danh sách, dùng mục nhập mã trực tiếp. Subtask mở từ cha tiếp tục khóa đúng cha/dự án.

## Cài đặt / nâng cấp

Giải nén `Quick-Jira-Log_v1.26.0.zip`, dùng thư mục `Quick-Jira-Log-V1.26.0`. Node 24.x; chạy `npm ci` và `npm test`. Không thêm dependency runtime, biến môi trường, database hoặc migration. Giữ nguyên cấu hình triển khai và APP_SESSION_SECRET hiện tại. Bản này bàn giao source, chưa push/deploy.

Cache PWA và nhãn phiên bản đã đổi 1.26.0. Sau triển khai tải lại app để nhận bản mới. Rollback deployment không xóa công việc đã tạo trên Jira. Không đổi các luồng logwork, Overtime hay lịch.

## Kiểm chứng và giới hạn

Chạy kiểm thử logic/API kế thừa cùng codec/renderer; Chromium 1440×900, 390×844, 320×683 và 844×390 với Jira giả lập. Luồng Subtask còn kiểm tra xuyên frontend → session/router thật → mock Jira → đọc lại đúng cha. Chưa thử trên Jira công ty, Safari/iPhone vật lý hoặc triển khai thực tế.

Thanh định dạng dùng khả năng chỉnh sửa sẵn của trình duyệt (`execCommand`, API cũ còn được trình duyệt hỗ trợ); có chế độ Wiki khi lệnh định dạng không được hỗ trợ. Chưa cung cấp editor đầy đủ cho macro/plugin Jira, dán ảnh hay mọi kiểu nội dung phong phú. Ảnh trong mô tả đã lưu tiếp tục dùng cơ chế xem ảnh của phiên bản trước.

## Phiên bản tiếp theo — đề xuất

**V1.27.0 — Mẫu Subtask:** lưu mẫu Summary, Sub-task Type, Estimate và Description; chọn mẫu, chỉnh lại rồi xác nhận tạo dưới công việc cha đang xem. Kiểm tra lại loại và lựa chọn hợp lệ theo dự án trước khi áp dụng. Chưa xây dựng.

---

Lịch sử các phiên bản (hướng dẫn V1.26.0 ở trên được ưu tiên):

# Quick Jira Log V1.25.1 — Sửa tạo Subtask & đọc mô tả

## Thay đổi bản sửa

1. **Subtask từ công việc cha:** bấm + Subtask trong chi tiết Story/Task/Bug sẽ tải một context đã kiểm tra trên server gồm cha, dự án, các loại Subtask hợp lệ và form ban đầu. Không cần tải danh sách dự án rồi tự chọn lại cha. Khóa dự án/cha; mở ngay form loại Subtask đầu tiên được Jira cho phép, vẫn đổi được sang loại Subtask khác. Sau xác nhận, backend kiểm tra metadata, parent và các trường trước khi ghi; đọc lại để xác nhận parent của issue vừa tạo.
2. **Tương thích metadata:** V1.25.0 chỉ nhận cờ phân trang `last` và chỉ coi loại là Subtask khi bản ghi create metadata có `subtask: true`. V1.25.1 nhận `last`/`isLast`; nếu metadata thiếu cờ subtask thì đối chiếu ID với danh mục `/issuetype` của Jira. Chỉ giữ loại vốn được phép tạo trong dự án, không đoán theo tên, không tự thêm quyền. Đây là các ca lỗi tương thích đã tái hiện bằng Jira giả lập; chưa có response lỗi Jira công ty để kết luận đó là nguyên nhân duy nhất của lỗi Boss gặp. Nếu Jira thực sự từ chối quyền/validator, form nêu lỗi và có nút tải lại, không báo đã tạo khi chưa ghi.
3. **Filter:** thay icon xoay vòng dùng để chạy filter bằng kính lúp. Giữ hàng filter gọn và phần tìm/đổi filter có thể mở khi cần.
4. **Ảnh ngay trong mô tả:** dữ liệu issue đọc thêm attachment metadata; resolve ảnh HTML (`img`) và wiki `!filename!`, `!filename|...!`, đường dẫn attachment/thumbnail theo ID hoặc filename duy nhất của chính issue. Ảnh raster tải qua endpoint xác thực của app, click mở popup. Không dùng URL ảnh ngoài làm đích proxy, không chuyển cookie/password cho client/host khác. Ảnh không thuộc issue hoặc không hỗ trợ có link mở Jira thay vì tự tải URL lạ. HTML vẫn lọc script, event handler, iframe, SVG và các thuộc tính không an toàn.
5. Ảnh gốc <=3 MiB xem trực tiếp; ảnh lớn hơn dùng thumbnail của Jira nếu có, ghi rõ ảnh xem trước; bản gốc mở Jira. Nếu ảnh không tải được, hiển thị đường mở Jira. Giới hạn upload/download app và quyền attachment của V1.25.0 vẫn giữ nguyên; không thêm dịch vụ lưu trữ hoặc nén ảnh gốc. Macro/plugin đặc thù, media ADF và ảnh bên ngoài không được tái tạo toàn bộ.
6. **Cuộn mô tả dài:** hai icon lên đầu/xuống cuối nằm trong khung chi tiết, trên footer. Khi cuộn sẽ fade in; ngừng khoảng 1 giây bắt đầu fade out 300ms. Nút điều khiển đúng vùng nội dung, không cuộn cả trang; nút ở đầu/cuối tương ứng bị vô hiệu hóa. Đổi tab hoặc đóng chi tiết dọn timer/trạng thái. Điều hướng bằng bàn phím giữ nút khi đang focus để không mất vị trí; reduced motion bỏ hiệu ứng và cuộn tức thời.
7. **Màu trạng thái:** chip trong chi tiết dùng `statusCategory.colorName` Jira trả về; nếu thiếu thì dùng category key. Done/green xanh lá, nền xanh nhạt; blue, amber và xám tương ứng các category khác. Có bảng màu dark/light, giữ nguyên tên trạng thái, không suy luận theo chữ Done hoặc dịch tên.

Không đổi luồng logwork/Overtime/lịch hoặc các API ghi worklog.

## Nâng cấp, chạy và triển khai

- Giải nén `Quick-Jira-Log_v1.25.1.zip`, mở `Quick-Jira-Log-V1.25.1`. Giữ biến môi trường đang dùng, đặc biệt `APP_SESSION_SECRET`. Không thêm dependency runtime, database, migration hay biến môi trường mới.
- Node **24.x**: `npm ci`, `npm test`. QA browser: `npm run test:detail-fixes`, `npm run test:workspace-ui`, `npm run test:attachments-ui`. Cần Playwright/Chromium ở môi trường QA, có thể chỉ định `QJL_CHROMIUM_PATH`; không đóng browser vào ZIP.
- Vercel giữ cấu hình cũ: Framework Other, Node24, không build command, root có index.html/api/package.json, dùng vercel.json. Với GitHub, clone/fetch và tích hợp trước commit/push, không force push ghi đè. Bản này chỉ bàn giao source, chưa push/deploy.
- Sau deploy tải lại PWA, kiểm tra nhãn V1.25.1. Thử + Subtask từ Story/Task/Bug, điền các trường rồi xác nhận; mở Jira kiểm tra đúng cha. Thử mô tả có ảnh, click ảnh, màu status, cuộn/dừng 1 giây, filter kính lúp; kiểm tra quyền bị thu và nút tải lại. Hồi quy logwork/OT/lịch/nháp.
- Có thể rollback deployment trước, không cần chuyển đổi dữ liệu. Rollback app không xóa issue/tệp đã tạo trên Jira. Quyền và validator Jira vẫn là quyết định cuối cùng.

API mới: GET `/api?action=jira-create-subtask-context&key=CAL-1` (option `type` để đổi loại con); session/no-store. `jira-attachment-content` thêm `thumbnail=1` nhưng vẫn đối chiếu file thuộc issue và chỉ đọc URL thumbnail cùng Jira. Không nhận URL tùy ý từ client.

## Kiểm thử và giới hạn

Đã kiểm thử logic/API và Chromium PC 1440×900, mobile 390×844/320×683, ngang 844×390 với Jira giả lập. Test mới chạy xuyên trình duyệt → router/session thật của app → metadata/POST Jira giả lập → readback, không chỉ giả lập kết quả thành công ở frontend. Có các ca thiếu subtask, isLast, tạo con của Story/Task/Bug, từ chối quyền/tải lại không ghi, ảnh HTML/wiki/thumbnail, không tải tracker ngoài, cuộn/fade và màu. Chưa thao tác Jira công ty, Safari/iPhone thật, Redis thật hoặc deploy; cần đối chiếu sau cập nhật. Chi tiết trong TESTING.md.

## Tiếp theo — đề xuất chưa xây dựng

**V1.26.0 — Soạn mô tả Jira trực quan:** thanh định dạng chữ/màu, tiêu đề, danh sách, bảng và xem trước trước khi tạo, giữ tương thích Jira wiki. Chờ Boss chọn. Gửi ZIP mới nhất để phát triển tiếp.

Phần dưới là lịch sử; hướng dẫn V1.25.1 ở trên được ưu tiên.

---

# Quick Jira Log V1.25.0 — Ảnh & tệp, Filter gọn & Subtask

## Nội dung phiên bản

- **Ảnh & tệp** trong chi tiết Story/Task/Bug/Subtask: liệt kê tên, kích thước, người tải; xem ảnh trong popup, tải xuống hoặc mở tệp trên Jira. Tải nhiều tệp (tối đa 10/lần) tuần tự; đọc lại danh sách để xác nhận từng tệp, thông báo kết quả. Không có chức năng xóa tệp trong bản này.
- Chỉ hiển thị tải lên khi Jira bật attachment và tài khoản có **Create Attachments** tại issue. Backend đọc lại quyền/issue trước khi ghi. Theo quyền Jira hiện tại, không dùng tài khoản đặc quyền. Mất phản hồi không tự gửi lại; dừng các tệp còn lại, nêu số đã xác nhận và yêu cầu đối chiếu trước khi tải tiếp.
- **Giới hạn 3 MiB/tệp** (hoặc thấp hơn nếu Jira giới hạn), kể cả ảnh; dùng JSON base64 dưới ngưỡng request của backend hiện tại. Không nén/thay đổi ảnh gốc. Tệp lớn hơn mở trên Jira để xem/tải và tải lên trực tiếp. Nội dung <=3 MiB được lấy qua endpoint xác thực của app, kiểm tra tệp thuộc đúng issue, không gửi cookie/password ra client hoặc sang host khác. Ảnh PNG/JPEG/GIF/WebP/AVIF có xem trước; SVG/HTML và loại khác chỉ tải hoặc mở Jira. Chuyển hướng ra ngoài Jira bị chặn trong proxy. Mở Jira dùng phiên trình duyệt Jira riêng nếu cần đăng nhập.
- **Filter:** sau khi tải kết quả chỉ giữ một hàng chọn filter + tải lại + tìm filter. Bấm icon tìm để mở phần tên/ID khi cần. Bỏ đoạn giải thích dài và các thông báo thành công dư; ẩn mục Vừa xem trong danh sách filter đã có kết quả để ưu tiên không gian.
- **Mô tả:** ưu tiên `renderedFields.description` do Jira render; bảo toàn màu chữ/nền, tiêu đề, đậm/nghiêng, danh sách, bảng, code và link an toàn. Lọc bỏ script/event/form/iframe/CSS không hỗ trợ. Không chèn HTML Jira thô. Nếu không có HTML, render wiki markup, gồm `{color:#de350b}...{color}`. Macro/plugin đặc thù và ảnh nhúng trong mô tả chưa tái tạo đầy đủ; xem ảnh qua tab Ảnh & tệp hoặc mở Jira.
- **Tạo Subtask từ chi tiết:** giữ đúng issue cha đang xem, khóa dự án/cha, chỉ đưa ra loại Subtask hợp lệ. Đổi loại vẫn giữ cha. Tải metadata mới và kiểm tra cha cùng dự án trước ghi; không tạo con của một Subtask.
- Thứ tự form ưu tiên **Summary → Sub-task Type → Reporter → Assignee → Estimate → Description**, rồi các trường Jira khác nếu có. Sub-task Type lấy đúng custom field/allowedValues từ create screen, không dùng Issue Type hay số lượng subtask để thay thế. Reporter mặc định current user; chỉ cho đổi khi có Modify Reporter và nhân sự hợp lệ. Assignee tìm/chọn hoặc **Assign to me** (mobile là icon người + check, có nhãn truy cập). Backend kiểm tra lại assignable trước tạo.
- Estimate dùng `timetracking.originalEstimate`, hỗ trợ `w/d/h/m`, ví dụ `2h 30m`; không phải giờ đã log. Quy đổi kiểm chứng theo lịch 8h/ngày, 5 ngày/tuần của app hiện tại. Nếu cấu hình Jira khác, đối chiếu có thể trả đã tạo/chưa xác nhận thay vì báo thành công sai.
- Chỉ gửi trường được create metadata cho phép. Nếu create screen không có một trong các trường mong muốn, cần quản trị Jira thêm vào screen; app không tự dựng field ID hoặc vượt cấu hình. Trường plugin bắt buộc chưa hỗ trợ vẫn chặn và nêu rõ.

## Nâng cấp và kiểm tra

1. Giải nén `Quick-Jira-Log_v1.25.0.zip`, mở `Quick-Jira-Log-V1.25.0`. Giữ biến môi trường cũ, đặc biệt `APP_SESSION_SECRET`. Không có dependency runtime, database hoặc migration mới.
2. Node **24.x**: `npm ci`, `npm test`. Riêng API tệp: `npm run test:attachments`; browser: `npm run test:attachments-ui` và `npm run test:workspace-ui` (Playwright/Chromium chỉ dùng QA, có thể đặt `QJL_CHROMIUM_PATH`).
3. Triển khai Vercel như bản trước: root chứa `api/`, Framework Other, Node24, không Build Command, giữ `vercel.json`. GitHub clone/fetch và tích hợp trước commit/push, không force push. Bản bàn giao chưa push/deploy.
4. Sau deploy tải lại PWA, kiểm tra V1.25.0. Thử filter; mô tả có màu/bảng; tạo Subtask ở Story/Task/Bug rồi đối chiếu parent và sáu trường. Thử upload tệp thử, preview/download/thu quyền/quá giới hạn, logout và hồi quy lịch/logwork/OT. Xem TESTING.md cho bằng chứng và giới hạn.
5. Có thể quay lại deployment trước; rollback app không xóa issue hay tệp đã tạo trên Jira. Không có dữ liệu app cần chuyển đổi. Store idempotency dùng cơ chế memory/Redis hiện có; memory không đảm bảo qua cold-start/nhiều instance. Tắt tự retry và bước đối chiếu vẫn cần thiết.

API thêm: GET `jira-attachments`, GET `jira-attachment-content` (key/id/download), POST `jira-attachment-upload`; GET `jira-create-reporters`. Mọi API dùng session/no-store, POST kiểm tra same-origin. Không nhận URL tùy ý từ client. Không thay đổi luồng logwork, lịch hoặc WorklogPRO Overtime.

## Phiên bản tiếp theo — đề xuất

**V1.26.0 — Soạn mô tả Jira trực quan:** thanh định dạng đậm/nghiêng, tiêu đề, danh sách, bảng, màu chữ và xem trước khi tạo; giữ nội dung tương thích Jira wiki markup. Chưa triển khai, chờ Boss chọn.

Gửi ZIP mới nhất để xây dựng bản tiếp theo. Phần dưới là lịch sử; hướng dẫn V1.25.0 ở trên được ưu tiên.

---

# Lịch sử V1.24.0

# Quick Jira Log V1.24.0 — Filter Jira & giao diện tạo mới

## Nội dung phiên bản này

Theo yêu cầu mới của Boss, V1.24.0 thay mục “Công việc của tôi” bằng **lấy công việc từ filter đã lưu trên Jira**. Không xây dựng danh sách được giao/reporter/watching riêng.

- Mở Công việc Jira từ nút tra cứu đang có. Tiêu đề/đóng ở trên, thanh thao tác ngay dưới gồm **Tìm kiếm**, **Filter Jira**, **Tạo công việc**. Nút tạo không còn nằm riêng ở tiêu đề.
- **Filter Jira:** tải filter sở hữu và yêu thích; tìm thêm filter theo tên nếu Jira hỗ trợ endpoint tìm kiếm. Hiển thị tên/chủ sở hữu, đánh dấu ★ cho yêu thích. Nếu chưa có trong danh sách có thể dùng ID từ đường dẫn Jira. Với Jira cũ không liệt kê được filter sở hữu, hãy Favourite filter trên Jira hoặc dùng ID.
- Bấm **Xem công việc** để chạy đúng JQL và ORDER BY đã lưu. App không thay đổi điều kiện filter bằng các bộ lọc thủ công của chế độ Tìm kiếm. Mỗi trang 25 công việc, có Tải thêm; đọc lại quyền/filter trước mỗi trang. Nếu điều kiện filter đổi giữa các trang, dừng và yêu cầu tải lại từ đầu. Dữ liệu issue thay đổi đồng thời vẫn có thể làm phân trang dịch chuyển; tải lại để có kết quả mới nhất.
- Chọn công việc để xem chi tiết/cập nhật nhanh theo quyền hiện tại. Đóng chi tiết giữ vị trí trong vùng cuộn danh sách. Chuyển nguồn Tìm kiếm/Filter xóa kết quả nguồn cũ để tránh trộn dữ liệu. Đăng nhập tài khoản khác dọn lựa chọn/kết quả; không lưu JQL hoặc danh sách filter vào local storage.
- Danh sách filter được giới hạn theo endpoint (tối đa 100 mỗi lần tìm, tổng hiển thị tối đa 200); có cảnh báo rút gọn và tìm tên/ID để truy cập thêm. Chỉ trả tên, ID, chủ sở hữu và favourite ra client; JQL chỉ dùng trên server. Không chỉnh sửa hoặc tạo filter trên Jira.

## Giao diện tạo và lỗi đã xử lý

- Form tạo chia thành **Dự án & loại công việc**, **Công việc cha** nếu là Subtask, **Nội dung công việc**. PC đặt phần dự án và cha cạnh nhau để giảm chiều cao; mobile theo một cột.
- Chọn dự án bằng danh sách sẽ tự tải loại công việc; chọn loại sẽ tải form. Có phần thu gọn nhập mã dự án trực tiếp khi cần. Luôn giữ nút **Xem lại & tạo** dưới cùng, gắn đúng form bằng thuộc tính `form`, bật khi metadata hợp lệ; tiêu đề/đóng và footer cố định, chỉ cuộn nội dung.
- Khi Jira bỏ qua thuộc tính `operations` trong metadata tạo, app vẫn xử lý trường dựa vào create screen. Nếu Jira trả rõ danh sách operations không có `set`, trường vẫn bị chặn. Quyền Create Issues, required/default, allowedValues và kiểm tra lại trước POST được giữ nguyên; không vượt quyền Jira.
- Sửa animation mở gây lệch khung mobile; chuyển sang fade không dịch khung ra ngoài viewport. Chuẩn hóa ô chọn/ô nhập, mũi tên native, tương phản dark/light và khoảng cách các nhóm.
- Luồng vẫn là **nhập → xem lại → xác nhận → ghi Jira → đối chiếu → mở chi tiết**. Mất phản hồi không tự POST lại; giữ receipt và bước kiểm tra Jira trước yêu cầu mới. Giữ nháp trong phiên khi đóng/mở, dọn khi logout.

Giới hạn trường plugin/required chưa hỗ trợ của V1.23.0 vẫn áp dụng: app nêu tên và dẫn sang Jira. Không có quyền/validator từ chối cũng cần xử lý theo thông báo thực tế; chưa xác minh trên Jira công ty trong phiên phát triển. Các handler logwork, lịch và OT giữ nguyên.

## Nâng cấp, kiểm tra và triển khai

1. Giải nén `Quick-Jira-Log_v1.24.0.zip`, dùng root `Quick-Jira-Log-V1.24.0`. Giữ chỉnh sửa riêng và biến môi trường, đặc biệt `APP_SESSION_SECRET`. Không thêm database, migration hay dependency runtime.
2. Node.js **24.x**: `npm ci`, `npm test`. Test filter: `npm run test:filters`. Giao diện: `npm run test:workspace-ui` (Playwright và Chromium chỉ cần cho QA; có thể đặt `QJL_CHROMIUM_PATH`). Xem `TESTING.md` cho bằng chứng và giới hạn.
3. GitHub/Vercel giữ cấu hình hiện có: clone/fetch, tích hợp trước commit/push, không force-push; Vercel Framework **Other**, Node **24.x**, không Build Command, root chứa `api/`, `index.html`, `package.json`, giữ `vercel.json`. Không tự push/deploy trong bản bàn giao này.
4. Sau deploy cập nhật PWA/tải lại, kiểm tra **V1.24.0**. Thử filter sở hữu/yêu thích/ID, Tải thêm, quay lại danh sách; thử một issue trong dự án thử nghiệm và đối chiếu Jira. Không có migration. Có thể quay lại deployment trước; việc rollback app không xóa issue đã tạo.

API mới (GET, session/no-store): `/api?action=jira-saved-filters&q=...`, `/api?action=jira-filter-issues&filterId=ID&startAt=0`. Trang tiếp theo nhận `revision` từ phản hồi đầu để phát hiện filter đổi. Không nhận JQL tùy ý từ client, không dùng `searchUrl` của filter làm đích request. Các giới hạn/luồng tạo của V1.23.0 được mô tả trong phần lịch sử bên dưới.

## Phiên bản tiếp theo

**V1.25.0 — Ảnh & tệp:** xem đính kèm trong chi tiết, mở/tải tệp và tải lên theo quyền Jira; kiểm tra giới hạn kích thước và hiển thị tiến trình/kết quả. Đây là mục roadmap dự kiến, chưa triển khai trong V1.24.0.

Gửi ZIP mới nhất để phát triển tiếp. Phần dưới là tài liệu lịch sử; hướng dẫn V1.24.0 ở trên được ưu tiên.

# Lịch sử V1.23.0 — Tạo công việc Jira

## Chức năng mới và cách dùng

1. Mở **Tra cứu Jira → ＋ Tạo**. Chọn hoặc nhập mã dự án, bấm **Tải loại công việc**, chọn loại mà Jira cho phép (Story, Task, Bug, Subtask hoặc loại cấu hình riêng). Danh sách dự án là các dự án nhìn thấy được; quyền Create Issues kiểm tra khi chọn. Danh sách giới hạn 1.000 dự án, vẫn cho nhập mã trực tiếp.
2. App lấy trường tạo theo đúng dự án/loại, gồm ID thực tế của trường tùy chỉnh như **Sub-task Type**. Nhập tiêu đề, mô tả, ưu tiên và các trường xuất hiện; dấu * chỉ trường bắt buộc. Không dùng Issue Type thay cho Sub-task Type.
3. Với Subtask: tìm cha theo mã/nội dung, chọn từ kết quả cùng dự án; server đọc lại và không nhận một Subtask làm cha. Có thể bấm **＋ Subtask** ở chi tiết một công việc cha để mở form, chọn sẵn cha sau khi kiểm tra. Nếu dự án có nhiều loại Subtask thì cần chọn loại phù hợp.
4. Người phụ trách tìm theo dự án, chọn trong tối đa 50 người có thể nhận việc. Server kiểm tra lại ngay trước khi tạo; để trống dùng mặc định Jira nếu có. Người báo cáo, nếu có trên form, luôn là tài khoản đang đăng nhập; chưa hỗ trợ đổi reporter.
5. Bấm **Xem lại trước khi tạo → Xác nhận tạo**. Hủy bước xác nhận không ghi Jira. App đọc lại quyền và cấu hình; nếu metadata đổi, cần tải lại form và kiểm tra lựa chọn. Sau khi Jira tạo, app đọc lại các trường đã gửi để đối chiếu, rồi mở chi tiết công việc khi xác nhận được.

### Trường hỗ trợ và giới hạn

- Hỗ trợ văn bản ngắn, mô tả nhiều dòng (Jira wiki dạng văn bản), số, ngày, ngày giờ, Có/Không, chọn một/chọn nhiều theo ID, nhãn, assignee và reporter hiện tại. Trường chọn cần có allowedValues từ Jira. Tiêu đề tối đa 255 ký tự, textarea 20.000, nhãn tối đa 100; các trường chọn dùng danh sách Jira trả về.
- Trường plugin phức tạp, cascading select, rich editor riêng, user picker tùy chỉnh hoặc kiểu chưa có bộ xử lý sẽ được ghi rõ là chưa hỗ trợ. Nếu trường đó bắt buộc và không có mặc định, app chặn tạo và nêu tên trường để mở form Jira gốc. Trường có mặc định để trống được bỏ khỏi payload để Jira tự áp dụng; app không tự đoán giá trị mặc định.
- Đọc metadata bằng API phân trang Jira Server/Data Center; chỉ fallback API createmeta cũ khi endpoint mới trả 404/405/501, giữ nguyên tài khoản và quyền. Tải đủ trang trước khi cho tạo; tối đa 500 trường/loại metadata cho mỗi danh sách, không âm thầm bỏ trường bắt buộc. Validator/plugin Jira vẫn có thể từ chối ngoài thông tin metadata; app hiển thị lỗi rút gọn.
- Chưa tạo đính kèm, sửa description của issue đã có, bulk create, ép trạng thái ban đầu hoặc thay đổi workflow. Không tự log giờ hoặc chuyển Done sau khi tạo. Subtask mới muốn log vẫn cần đáp ứng bộ lọc/ràng buộc logwork của app; tải lại danh sách Subtask để cập nhật ứng viên.

### Bản nháp và kết quả gửi

- Đóng form giữ bản nháp trong bộ nhớ của trang cho cùng tài khoản; mở **＋ Tạo** để tiếp tục. Đăng xuất/tải lại trang mất nháp. Đổi dự án/loại hoặc tải lại form sẽ xóa dữ liệu nhập theo schema cũ; Xóa bản nháp hỏi xác nhận. Mở shortcut Subtask khi đang có nháp cũng hỏi trước khi thay nháp. Không lưu mô tả/nhân sự vào local storage.
- Khi đã tạo và đối chiếu thành công, hiển thị mã/link, mở chi tiết; mở lại form thấy kết quả, cần bấm **Tạo công việc khác** để bắt đầu yêu cầu mới.
- Jira đã nhận nhưng đọc lại không khớp/không đọc được: hiển thị **đã nhận, chưa xác minh**, giữ mã/link nếu có. Mất phản hồi/HTTP 5xx sau POST: hiển thị **chưa rõ kết quả**, không tự gửi lại. Tạm ẩn form tạo; kiểm tra Jira rồi bấm **Tôi đã kiểm tra trên Jira** trước khi tạo yêu cầu mới. Đây là xác nhận của người dùng, không phải bằng chứng server đã lưu. Trạng thái này chỉ giữ trong phiên trang; sau reload vẫn cần kiểm tra Jira thủ công nếu lần trước chưa rõ.
- Chống lặp dùng request ID và store có sẵn (memory trên cùng instance hoặc Redis nếu đã cấu hình). Nhánh memory không bảo đảm qua nhiều instance/restart/TTL; không thêm database, không tự retry POST tạo. Đổi nội dung/yêu cầu mới có ID mới, vì vậy không dùng tạo mới để thay cho kiểm tra kết quả cũ.

## Nâng cấp, chạy và triển khai

1. Giải nén `Quick-Jira-Log_v1.23.0.zip`, root là `Quick-Jira-Log-V1.23.0`. Giữ chỉnh sửa riêng khi tích hợp; giữ các biến môi trường hiện tại, đặc biệt `APP_SESSION_SECRET`. Không có migration hoặc dependency runtime mới.
2. Trong root, với Node.js **24.x**, chạy `npm ci` và `npm test`. Test riêng: `npm run test:create`; fixture trình duyệt: `npm run test:create-ui` (cần Playwright/Chromium, có thể đặt `QJL_CHROMIUM_PATH`). Test dùng Jira giả lập, xem `TESTING.md` để biết phần chưa kiểm chứng.
3. Local có API: cấu hình `.env.example`, dùng `vercel dev` trong root với Vercel CLI; không mở file HTML bằng `file://` hoặc static server để dùng thật. Không commit `.env` chứa secret.
4. GitHub: repo có source cần clone/fetch, tích hợp và giữ chỉnh sửa riêng trước khi commit/push; không force-push để xử lý `fetch first`. Repo mới: `git init`, `git add .`, `git commit -m "Release v1.23.0"`, thêm remote của Boss rồi `git push -u origin main` (đặt nhánh main trước nếu cần). Không có push/deploy tự động từ ZIP.
5. Vercel kết nối repo/nhánh: Framework **Other**, Node.js **24.x**, không Build Command; root chứa `index.html`, `package.json`, `api/`, giữ `vercel.json` và biến môi trường. Deploy rồi tải lại/cập nhật PWA, kiểm tra **V1.23.0**; thử một issue trong dự án thử nghiệm và đối chiếu Jira. Các lần sau deploy từ push lên nhánh đã kết nối.
6. Không đổi schema dữ liệu app. Có thể quay lại deployment V1.22.0; việc rollback app không xóa các issue đã tạo trên Jira. Không cần reset database hay đổi secret.

API mới (cần session, no-store): GET `jira-create-projects`, `jira-create-types&project=KEY`, `jira-create-meta&project=KEY&type=ID`, `jira-create-users&project=KEY&q=...`, `jira-create-parents&project=KEY&q=...` (hoặc `key=ISSUE-1`); POST `/api?action=jira-create` nhận `project`, `type`, `parent`, `revision`, `fields`, `requestId`. Chỉ nhận field có trong metadata hỗ trợ; kiểm tra origin theo cơ chế app và không cho client chọn endpoint/field tùy ý. API metadata chỉ đọc, POST duy nhất tạo issue. Luồng logwork, OT, lịch, sửa nhanh cũ giữ nguyên.

| Hiện tượng | Cách xử lý |
| --- | --- |
| Không thấy dự án | Nhập mã trực tiếp; kiểm tra quyền Browse/Create Issues. |
| Không có loại công việc | Kiểm tra quyền Create Issues và issue type scheme của dự án. |
| Cần trường app chưa hỗ trợ | Dùng link Mở form tạo trên Jira, gửi tên/kiểu trường để xem xét bổ sung. |
| HTTP 409 cấu hình đổi | Tải lại form theo loại, nhập và chọn lại rồi xem trước; dữ liệu schema cũ bị xóa. |
| Không tìm thấy cha/người nhận | Chọn đúng dự án, nhập mã/tên cụ thể hơn; cần quyền xem/giao phù hợp. |
| Chưa rõ kết quả tạo | Kiểm tra Jira theo tiêu đề, reporter và thời điểm tạo, không gửi lặp. |

Tài liệu REST chính thức: https://docs.atlassian.com/software/jira/docs/api/REST/9.12.7/ và https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/ . Chưa xác minh cấu hình Jira công ty trong phiên phát triển.

## Phiên bản tiếp theo

**V1.24.0 — Công việc của tôi:** truy cập nhanh công việc được giao, do mình tạo và đang theo dõi; lọc dự án/trạng thái/loại, mở chi tiết, cập nhật nhanh và vào logwork theo quy tắc hiện có. Dữ liệu theo quyền Jira, có phân trang và giữ vị trí khi quay lại. Đây là roadmap dự kiến, chưa xây dựng trong V1.23.0.

Gửi ZIP V1.23.0 mới nhất nếu muốn xây dựng phiên bản tiếp theo. Phần dưới là tài liệu lịch sử; hướng dẫn V1.23.0 ở trên được ưu tiên.

# Lịch sử V1.22.0 — Cập nhật nhanh công việc Jira

## Chức năng phiên bản này

- Trong Chi tiết công việc, bấm **Cập nhật** để đổi một thông tin mỗi lần: trạng thái, người phụ trách hoặc độ ưu tiên. Không tự ghi khi đổi lựa chọn; bấm **Xem lại thay đổi → Xác nhận gửi** mới gửi Jira.
- **Trạng thái:** đọc các transition thực tế, không giả định To Do/In Progress/Done. Transition có trường bắt buộc hiển thị tên trường và yêu cầu mở Jira để hoàn tất; bản này chưa nhập form transition tùy chỉnh. Không tự chọn giá trị mặc định hoặc bỏ qua validator.
- **Người phụ trách:** tìm theo họ tên/username, chỉ trả người có thể được giao chính issue đó (tối đa 50 kết quả; nhập cụ thể hơn nếu chưa thấy). Server kiểm tra lại người được chọn trước khi ghi. Chỉ có Chưa được giao khi đọc được cấu hình cho phép và có quyền Assign Issues.
- **Độ ưu tiên:** chỉ hiển thị giá trị từ `editmeta` cho phép sửa trên issue, có quyền Edit Issues và thao tác `set`. Không dùng danh sách ưu tiên toàn hệ thống để giả định quyền.
- Tab **Bình luận**: đọc từng trang 25 bản ghi mới nhất trước, Tải thêm và Thử lại; hiển thị người gửi, ngày giờ Việt Nam, nội dung an toàn. Gửi tối đa 10.000 ký tự theo quyền hiển thị mặc định của Jira; chưa chọn nhóm/role hạn chế, sửa/xóa bình luận hoặc đính kèm.
- App kiểm tra quyền và thời điểm cập nhật lại trước khi ghi; nếu issue đã thay đổi kể từ lúc tải lựa chọn, yêu cầu tải lại. Đây là kiểm tra phía app, không phải khóa giao dịch Jira: thay đổi đồng thời ngay sau kiểm tra vẫn do Jira/workflow quyết định.
- Sau khi Jira nhận lệnh, app đọc lại dữ liệu để đối chiếu. Phân biệt **đã xác nhận**, **Jira đã nhận nhưng chưa đối chiếu**, **chưa rõ kết quả** và **bị từ chối**. Mất phản hồi không tự gửi lại lệnh/bình luận.
- Khi kết quả chưa rõ, tạm khóa gửi tiếp trên issue trong phiên xem; mở Jira kiểm tra, rồi bấm **Tôi đã kiểm tra trên Jira** để tạo yêu cầu mới nếu cần. Nút này là xác nhận người dùng, không phải chứng minh backend đã lưu. Giữ nội dung bình luận nếu lỗi/chưa rõ.
- Chống gửi lặp cùng request ID dùng store hiện có: memory của instance khi không có Redis, Redis nếu đã cấu hình. Không bảo đảm chống trùng toàn hệ thống sau restart/chuyển instance/TTL khi chỉ dùng memory. Không tự retry mutation; không thêm database hoặc biến môi trường bắt buộc.
- Xem trước xác nhận và form cập nhật dùng dialog phù hợp PC/mobile, không tự mở bàn phím. Giữ nguyên luồng logwork/lịch/Overtime hiện có. Thao tác Jira có thể kích hoạt email, automation và workflow của công ty.

## Nâng cấp và kiểm tra

1. Giải nén `Quick-Jira-Log_v1.22.0.zip`, dùng `Quick-Jira-Log-V1.22.0` làm root. Giữ các chỉnh sửa riêng khi tích hợp source và giữ nguyên biến môi trường, đặc biệt `APP_SESSION_SECRET`.
2. Vercel: Framework **Other**, Node.js **24.x**, không Build Command; root chứa `index.html`, `package.json`, `api/`, giữ `vercel.json`. Không migration database, không thêm dependency runtime.
3. Sau deploy, tải lại/cập nhật PWA và kiểm tra **V1.22.0**. Dùng issue thử nghiệm có quyền: đọc bình luận; thử mỗi thay đổi riêng; hủy ở bước xác nhận; đối chiếu Jira gốc. Không dùng issue sản xuất quan trọng để thử workflow.
4. Trong thư mục source chạy `npm ci`, `npm test`. Bộ API mới: `npm run test:update`; fixture UI: `npm run test:update-ui` (cần Playwright/Chromium, có thể chỉ định `QJL_CHROMIUM_PATH`). Hướng dẫn local/GitHub/Vercel kế thừa ở dưới; tình trạng kiểm chứng hiện tại nằm trong `TESTING.md`.

API mới: GET `/api?action=jira-update-options&key=KEY`, `jira-update-users&key=KEY&q=...`, `jira-comments&key=KEY&startAt=0`; POST `/api?action=jira-update` nhận `key`, `kind` (`comment/transition/assignee/priority`), `value`, `expectedUpdated`, `requestId`. Không nhận tùy ý endpoint hoặc trường Jira khác. Các API cần phiên, no-store; POST kiểm tra origin theo cơ chế app hiện có. Bình luận/nhân sự không lưu vào local storage. Không đổi backend ghi worklog.

Nếu lựa chọn hết hiệu lực hoặc HTTP 409: bấm **Tải lại lựa chọn**, chọn và xác nhận lại. Nếu HTTP 403: kiểm tra quyền trên Jira, không bypass quyền. Nếu trường bắt buộc/validator: thông báo lỗi được rút gọn, mở Jira để xử lý. Nếu kết quả chưa rõ: kiểm tra Jira trước; không bấm gửi nhiều lần.

## Phiên bản tiếp theo

**V1.23.0 — Tạo công việc Jira:** tạo Story, Task, Bug hoặc Subtask từ app; chọn dự án và loại, lấy trường bắt buộc/giá trị hợp lệ theo metadata Jira, chọn công việc cha cho Subtask, xem lại trước khi tạo và mở chi tiết sau thành công. Trường tùy chỉnh như Sub-task Type phải lấy ID thực tế, không mặc định hard-code. Đây là roadmap dự kiến, chưa triển khai trong V1.22.0.

Phần dưới là tài liệu kế thừa; hướng dẫn V1.22.0 ở trên được ưu tiên cho bản hiện hành.

# Lịch sử V1.21.0 — Chi tiết công việc

## Mới trong V1.21.0

- Từ kết quả Tra cứu Jira hoặc mục vừa xem, bấm thẻ để mở chi tiết ngay trong app. PC dùng popup rộng; mobile dùng toàn màn hình, giữ tiêu đề, tab và nút thao tác, cuộn riêng nội dung.
- **Mô tả:** thông tin dự án, loại, trạng thái, người phụ trách, ưu tiên, thời điểm cập nhật và mô tả. Hỗ trợ một phần Jira wiki: tiêu đề, danh sách, chữ đậm, bảng, code và liên kết HTTP/HTTPS. Không chạy HTML/script từ Jira. ADF được chuyển thành văn bản; ảnh, tệp và các macro không hỗ trợ cần mở Jira gốc. Nội dung trên 200.000 ký tự được rút gọn và có thông báo.
- **Subtask:** hiển thị mã, tiêu đề, trạng thái và người phụ trách; 25 bản ghi mỗi lần, có Tải thêm. Bấm để xem chi tiết subtask; có nút công việc cha và Quay lại. Điều hướng và tải lại đều đọc lại quyền từ Jira.
- **Worklog:** người log, ngày/giờ Việt Nam, thời lượng chính xác đến giây và mô tả; 25 bản ghi mỗi lần. “Giờ đã tải” chỉ cộng các bản ghi đã tải, không phải toàn bộ giờ của công việc, không phải thống kê Overtime. Jira cũ trả toàn bộ worklog sẽ được phân trang trên server app.
- Subtask/worklog chỉ tải khi mở tab. Lỗi một phần có Thử lại và không chặn xem mô tả. Nội dung hiển thị theo quyền Jira hiện tại; danh sách rỗng không đồng nghĩa tài khoản có quyền xem mọi bản ghi.
- Đóng chi tiết giữ kết quả, vị trí cuộn và mục đang chọn trong tra cứu. Tải lại chi tiết đưa về tab Mô tả và làm mới các trang liên quan.
- Nút **Logwork** xuất hiện khi công việc nằm trong danh sách subtask logwork hiện có của app; bấm sẽ kiểm tra lại danh sách, rồi mở đúng form logwork đang dùng. Vẫn cần nhập/xác nhận theo luồng hiện có; thao tác xem chi tiết không ghi dữ liệu Jira. Không có nút này không có nghĩa Jira từ chối quyền, vì danh sách ứng viên của app có bộ lọc/giới hạn riêng.

## Nâng cấp từ V1.20.0

1. Giải nén `Quick-Jira-Log_v1.21.0.zip`, dùng thư mục `Quick-Jira-Log-V1.21.0` làm root source. Giữ các chỉnh sửa riêng khi tích hợp.
2. Giữ nguyên biến môi trường, đặc biệt `APP_SESSION_SECRET`. Không có database, migration hoặc dependency runtime mới.
3. Vercel: Framework **Other**, Node.js **24.x**, không Build Command; root chứa `index.html`, `package.json`, `api/`. Giữ cấu hình `vercel.json`.
4. Sau triển khai, cập nhật/tải lại app và kiểm tra phiên bản **V1.21.0**. Thử mở mô tả, subtask, worklog, Tải thêm, công việc cha, Quay lại và logwork từ một subtask hợp lệ.

Chạy `npm ci` và `npm test` với Node.js 24.x. Test mới: `npm run test:detail`; test giao diện: `npm run test:detail-ui` (cần Playwright/Chromium, có thể đặt `QJL_CHROMIUM_PATH`). Các test dùng Jira giả lập. Xem `TESTING.md` về phạm vi đã kiểm chứng và kiểm tra sau deploy.

API mới (GET, yêu cầu phiên Jira): `/api?action=jira-issue&key=KEY`, `jira-issue-subtasks`, `jira-issue-worklogs`; hai API danh sách nhận `startAt`. Chỉ đọc bằng quyền người đăng nhập, no-store, không thêm custom-field ID, không sửa luồng lịch/logwork/Overtime.

**Phiên bản tiếp theo: V1.22.0 — Cập nhật nhanh:** bình luận, chuyển trạng thái, người phụ trách và ưu tiên theo lựa chọn/quyền thực tế từ Jira. Chưa triển khai trong bản này.

Phần dưới là tài liệu V1.20.0 kế thừa; hướng dẫn phiên bản hiện hành ở trên được ưu tiên.

# Lịch sử V1.20.0 — Tra cứu Jira

## Chức năng mới

- Mở **Tra cứu Jira** từ thanh công cụ PC hoặc thanh điều hướng mobile.
- Tìm bằng mã đầy đủ (ví dụ `EPU01-2840`) hoặc nội dung từ 2 đến 160 ký tự. Mã đầy đủ được tìm chính xác; nội dung được tìm qua chỉ mục text của Jira dưới dạng cụm từ, không thực thi JQL người dùng nhập.
- Có thể để trống từ khóa và dùng bộ lọc; nếu để trống cả bộ lọc, Jira trả công việc cập nhật gần đây mà tài khoản có quyền thấy.
- Bộ lọc: dự án (chọn gợi ý hoặc nhập mã), trạng thái, loại công việc theo Jira (Story/Task/Bug/Sub-task và loại tùy chỉnh), người phụ trách (Tất cả/Tôi/Chưa được giao/Chọn người khác).
- Khi chọn người khác: nhập tên hoặc username, bấm **Tìm**, chọn đúng nhân sự rồi bấm **Tìm kiếm**. Cần quyền tìm nhân sự trên Jira. Bộ lọc không tự gửi truy vấn sau từng ký tự.
- Kết quả dạng thẻ hiển thị mã, tiêu đề, dự án/loại, trạng thái, người phụ trách, ưu tiên hoặc công việc cha và thời điểm cập nhật theo giờ Việt Nam. Mỗi trang tối đa 25 công việc; bấm **Tải thêm** để xem tiếp.
- Bấm thẻ để xem thông tin cơ bản và mở Jira gốc. Mỗi lần mở thẻ/mục vừa xem đều đọc lại Jira để kiểm tra quyền hiện tại.
- Lưu tối đa 10 **mã công việc vừa xem** theo tài khoản trên trình duyệt/thiết bị hiện tại. Không lưu mô tả, email hay dữ liệu chi tiết trong mục vừa xem; không đồng bộ sang thiết bị khác. Đăng xuất xóa nội dung đang xem khỏi giao diện, còn danh sách mã được giữ để dùng khi đăng nhập lại cùng tài khoản. Có nút Xóa danh sách.
- Màn hình mobile không tự focus ô nhập khi mở; hỗ trợ light/dark, bố cục lọc thu gọn và khóa tương tác khi đang tải.

V1.20.0 là phiên bản tra cứu, không tạo/sửa issue. Luồng logwork, lịch và Overtime hiện có được giữ nguyên. Màn hình chi tiết đầy đủ (mô tả, subtask, worklog) nằm trong roadmap V1.21.0.

## Nâng cấp từ V1.19.4

1. Giải nén `Quick-Jira-Log_v1.20.0.zip`. Dùng nội dung thư mục `Quick-Jira-Log-V1.20.0` làm root source.
2. Giữ nguyên các biến môi trường đang sử dụng, đặc biệt `APP_SESSION_SECRET`. Không thêm database, token, biến môi trường hoặc dependency runtime mới.
3. Với repository hiện có, clone/fetch và giữ các chỉnh sửa riêng trước khi tích hợp source này. Push lên nhánh đang triển khai.
4. Trong Vercel dùng Framework **Other**, Node.js **24.x**, không Build Command; giữ `vercel.json`, API `/api` và root thư mục chứa `index.html`, `package.json`, `api/`.
5. Sau deploy, dùng nút cập nhật app hoặc tải lại. Tiêu đề, phiên bản app và footer phải hiện **V1.20.0**. Đăng nhập bằng tài khoản Jira đang dùng.
6. Mở Tra cứu Jira, thử một mã có quyền xem, một từ khóa, các bộ lọc và Tải thêm. Kiểm tra lịch/logwork cũ vẫn dùng được.

Không có migration database. Có thể quay lại source V1.19.4 bằng deployment trước nếu cần; không cần xóa dữ liệu Jira hoặc đổi secret.

## Kiểm tra và chạy thử

Chạy trong thư mục source với Node.js 24.x:

```bash
npm ci
npm test
node tests/jira-search-tests.js
```

Các test API dùng Jira giả lập. Test giao diện cần Playwright và Chromium ở môi trường kiểm thử; không cài thêm chúng vào dependencies production. Chạy `npm run test:search-ui` khi đã có trình duyệt; có thể đặt `QJL_CHROMIUM_PATH` trỏ tới Chromium đã cài.

Test Playwright tự khởi chạy server fixture `tests/browser/serve.cjs` với dữ liệu giả lập; không chạy file fixture trực tiếp để dùng app thật. Để chạy app local với API Vercel, cài Vercel CLI và dùng `vercel dev` trong root source, cấu hình các biến của `.env.example` (đặc biệt secret tối thiểu 32 ký tự), mở URL local do CLI hiển thị. Không mở `index.html` bằng `file://` hoặc chỉ dùng static server vì sẽ thiếu API. Có thể triển khai trực tiếp lên Vercel theo phần trên để sử dụng.

Các API mới là GET `/api?action=jira-search` và `/api?action=jira-search-options`, yêu cầu phiên Jira. Server dùng REST API v2 của Jira, chỉ đọc dữ liệu; POST `/rest/api/2/search` là truy vấn đọc. Không cấp thêm quyền so với Jira gốc.

## Lỗi thường gặp

| Hiện tượng | Xử lý |
| --- | --- |
| Không có kết quả | Thử mã đầy đủ; đặt lại bộ lọc; dùng cụm từ ngắn hơn. Kết quả phụ thuộc chỉ mục text và quyền Browse Projects trên Jira. |
| Không tải được bộ lọc | Bấm Tải lại bộ lọc. Có thể nhập mã dự án trực tiếp và tiếp tục tìm bằng các bộ lọc còn có dữ liệu. |
| Không tìm được nhân sự | Kiểm tra quyền Browse Users; bộ lọc Tôi/Chưa được giao vẫn dùng được. |
| Phiên hết hạn | Đăng nhập lại; màn hình tra cứu được đóng và dữ liệu hiển thị cũ được dọn. |
| Không nhớ mục vừa xem | Trình duyệt có thể chặn lưu dữ liệu, dùng chế độ riêng tư hoặc đã xóa dữ liệu website. Danh sách này chỉ lưu cục bộ. |
| PWA chưa có nút Tra cứu | Kiểm tra deployment và phiên bản V1.20.0; chọn cập nhật ứng dụng hoặc tải lại. |

## Phiên bản tiếp theo

**V1.21.0 — Chi tiết công việc:** mô tả, task cha/subtask, worklog và lối vào logwork phù hợp quyền/quy tắc hiện có. Gửi lại ZIP mới nhất và yêu cầu xây dựng V1.21.0 khi muốn tiếp tục.

Các mục dưới đây là tài liệu lịch sử của các phiên bản trước; hướng dẫn V1.20.0 ở trên là phần áp dụng cho bản hiện tại.

# Lịch sử V1.19.2 — Draft Split Regroup

Ứng dụng PWA dùng Jira/WorklogPRO hiện có. Source sẵn sàng push GitHub và deploy Vercel; không thêm database hoặc dependency runtime.

## V1.19.2 — Kéo gom lại nhóm tách chưa lưu

- PC kéo bất kỳ phần nào của nhóm tách; mobile nhấn giữ rồi kéo. App gom các phần thuộc **đúng nhóm nháp** thành một block kéo với tổng thời lượng. Không gom các worklog khác chỉ vì trùng mã subtask.
- Ví dụ nhóm 11:00–12:00 (1h) + 13:30–15:00 (1h30): kéo tới 08:00 → lưu tạm thành 08:00–10:30. Kéo từ phần thứ hai hoặc phần thứ tư vẫn dùng tổng giờ của cả nhóm.
- Các phần nguồn mờ đi trong lúc kéo, hiển thị một ghost tổng giờ và highlight bố cục đích. Khi hủy/Escape/touchcancel/thả không hợp lệ, các phần trở lại bố cục trước lần kéo; không thay bản nháp một phần.
- Nếu đích đi qua giờ nghỉ, tự tính lại các phần theo chỗ trống cùng ngày. Hơn 2 phần vẫn hỏi xác nhận. Hủy popup giữ nguyên nhóm cũ; trước khi đồng ý kiểm tra lại nhóm và bố cục để tránh dùng proposal cũ.
- Swap vẫn preview bay đi/quay về. Với nguồn là nhóm tách, từng đối tác phải đặt nguyên block vào một khoảng nguồn thực sự đủ chỗ. Có thể đổi thứ tự đối tác để xếp vừa các khoảng. Không giả định nguồn là một vùng liền mạch qua giờ nghỉ và không tự tách đối tác để ép swap.
- Nhóm quá phức tạp hoặc không có phương án đặt từng đối tác sẽ bị từ chối trước lưu; giới hạn swap 12 worklog kế thừa. Không cắt ngắn/đổi tổng thời lượng để ép vừa.
- Nhóm chưa lưu giữ snapshot Jira gốc xuyên suốt các lần kéo/gom/tách. Gom thành một block dùng luồng sửa worklog hiện có khi bấm icon Lưu và xác nhận, giữ ID gốc, mô tả và Overtime. Còn nhiều phần thì dùng luồng tách có xác nhận/đọc lại/khôi phục hiện có.
- Kéo trở về đúng vị trí và thời lượng thật trên Jira sẽ bỏ nháp của worklog đó; các nháp khác vẫn giữ. Không có request ghi khi chỉ kéo, preview, hủy hoặc lưu tạm.
- Các phần chưa lưu không có tay nắm resize riêng; gom về một block rồi chỉnh cạnh như thông thường. Mobile dành thao tác chạm trên các phần nhóm cho nhấn giữ/kéo; cuộn lịch từ vùng trống hoặc các vùng không thuộc nhóm. Khai báo touch-action trước khi chạm để tránh trình duyệt chiếm thao tác kéo ngang sang ngày khác.
- Chưa hỗ trợ tự gom các phần **đã lưu thành các worklog riêng trên Jira**. Sau khi lưu/tải lại, chúng vẫn là từng worklog thật và không được tự liên kết theo issue key. Nhóm có trạng thái chưa rõ/xung đột phải đối chiếu trước khi kéo.
- Giữ bản sửa khóa loading V1.19.1; không đổi endpoint/handler Jira, cấu hình hoặc dependency. Version UI/manifest/service worker: 1.19.2.

## V1.19.1 — Khóa tương tác khi đang tải/xử lý

- Sửa nguyên nhân loading cũ chỉ là lớp hiển thị `pointer-events: none`, nên nút và phím tắt phía sau vẫn hoạt động; đồng thời bổ sung các luồng trước đó chưa có loading chung.
- Dùng một modal loading thực sự cho các API trong app: đăng nhập/đăng xuất, tải Sub-task, tổng giờ/dashboard, lịch cá nhân/người khác, tổng hợp, tra thông tin task/nhân sự, kiểm tra giờ trống, log đơn/hàng loạt, sửa/xóa, swap và tách lịch.
- Khóa ngay khi bắt đầu chờ, gồm cả 140ms trước khi card loading xuất hiện. Chặn chuột, cảm ứng, bàn phím/phím tắt, gửi form, kéo thả và cuộn nền; không cho đóng hoặc chuyển chức năng trong lúc chờ.
- Nhiều request đồng thời dùng bộ đếm; hoàn thành một request không mở khóa nếu vẫn còn request hoặc công đoạn UI đang xử lý. GET trùng request vẫn dùng cơ chế gộp hiện có.
- Thu hồi khóa trong `finally` khi hoàn tất hoặc lỗi (HTTP/mạng/dữ liệu không hợp lệ). Các nút thử lại, đóng, nhập liệu và điều hướng hoạt động trở lại; không ghi đè trạng thái disabled/inert của màn hình gốc.
- Native dialog/bottom sheet và fullscreen cũng được che bằng lớp khóa ở top layer. Hủy gesture/nhấn giữ đang dở khi bắt đầu request để không thả nhầm vào nền.
- Khi logwork đang có popup tiến trình, dùng lớp chắn trong suốt để giữ đúng **một** tiến trình đang hiển thị; không thêm card/spinner thứ hai. Khóa giữ xuyên suốt khi đọc NDJSON tới kết quả cuối.
- Giữ loading giữa màn hình, nền tối, light/dark và reduced motion. Khi rảnh, gỡ toàn bộ listener chặn thao tác; không thêm vòng RAF hoặc listener chặn cuộn thường trực cho lịch.
- Giữ nguyên backend Jira, phân bổ giờ, Overtime, swap/tách và luồng xác nhận logwork. Không thêm dependency hoặc cấu hình môi trường. Service worker/UI/manifest được tăng lên 1.19.1.

## V1.19.0 — Multi-Swap & Smart Split

### Kéo đổi chỗ nhiều block

- Một block có thể đổi chỗ với một nhóm block nằm gọn trong vùng đích. Ví dụ **2h tại 15:00–17:00** đổi với **08:00–09:30 + 09:30–10:00**: block 2h sang 08:00–10:00, hai block kia sang 15:00–16:30 + 16:30–17:00.
- Nhóm được xếp theo thứ tự giờ cũ vào vùng nguồn, giữ từng worklog ID, thời lượng, mô tả và Overtime. Không rút ngắn block để cố vừa chỗ.
- Preview bay cong ngay khi kéo qua: tất cả block bị thay thế bay về vị trí dự kiến. Khi kéo đi chỗ khác, chúng bay về chỗ cũ. Highlight bao gồm mọi vị trí kết quả; nhả tay mới lưu nháp.
- Chặn nếu một phần nhóm vượt vùng thả, tổng nhóm không vừa vùng nguồn, trùng worklog khác, qua giờ nghỉ hoặc chưa lưu các phần tách. Một lượt hỗ trợ tối đa 12 worklog.
- Server kiểm tra dữ liệu mới nhất và xếp thứ tự cập nhật an toàn. Khi cần swap vòng, chọn block giải phóng được nhiều vị trí để chuyển tạm; không lặp chuyển tạm một block ngắn. Nếu không có khoảng trống trung gian an toàn thì không ghi.

### Tự tách và ráp qua giờ nghỉ

- Kéo block **2h30 tới 11:00**: preview 11:00–12:00 và 13:30–15:00 nếu trống. Nếu có lịch bên dưới, tìm các khoảng trống tiếp theo trong cùng ngày.
- Tự ráp trong **08:00–12:00 và 13:30–17:30**. Giữ đúng tổng số giây; không tự chuyển phần dư sang ngày khác hoặc tự thêm giờ Overtime. Di chuyển nguyên block ngoài giờ vẫn theo quy tắc OT cũ.
- Đến 2 phần: lưu nháp trực tiếp. Hơn 2 phần: mở popup nêu số phần và từng khoảng giờ, với **Hủy / Tiếp tục tách**. Hủy giữ nguyên lịch và các nháp trước đó. Nếu không đủ toàn bộ thời lượng, cảnh báo và không áp dụng phần thiếu.
- Nháp tách có nhiều block xem trước nhưng là một thay đổi gốc. Bấm icon Lưu để xem toàn bộ các phần rồi xác nhận. Các phần tách chưa lưu phải lưu hoặc bỏ trước khi kéo/resize tiếp; sau lưu, mỗi phần là worklog Jira thật và có thể chỉnh riêng như trước.
- Hỗ trợ tối đa 32 phần mỗi lần tách. Không tự xóa/gộp các worklog đã tồn tại của cùng subtask.

### Lưu Jira và xử lý lỗi

- Endpoint `calendar-split` giữ ID gốc cho phần đầu, tạo thêm worklog cho các phần còn lại trong **cùng issue**, không đổi trạng thái task. Giữ tổng giờ yêu cầu, mô tả và checkbox Overtime thật của WorklogPRO; không thêm marker vào mô tả.
- Đọc native WorklogPRO trước khi tách; sao chép các thuộc tính scalar khác qua đúng control trong form thật và đọc lại để xác nhận. Không đoán thuộc tính khi không đọc được. Worklog có giới hạn hiển thị hoặc thuộc tính phức hợp chưa hỗ trợ sẽ bị chặn trước ghi.
- Kiểm tra tài khoản sở hữu, phiên đăng nhập, same-origin, giờ cũ/thời lượng cũ, ngày/giờ đích, tổng giây và khoảng trống mới nhất. Lịch người khác vẫn chỉ xem.
- Nếu một bước lỗi, thử xóa phần mới đã xác định đúng và phục hồi worklog gốc; chỉ báo đã phục hồi sau khi đọc lại xác nhận. Không tự ghi đè worklog đã thay đổi bên ngoài. Đây là cơ chế bù trừ, không phải transaction của Jira; lỗi quyền/mạng hoặc giới hạn thời gian vẫn có thể cần đối chiếu thủ công.
- POST tạo mới không được retry mù khi mất phản hồi. Tìm bản ghi mới duy nhất phù hợp nếu xác định được; nếu chưa rõ, giữ trạng thái cần đối chiếu. Nút kiểm tra sau lỗi của split chỉ đọc xác nhận, không tạo lại các phần còn thiếu. Khi trạng thái chưa rõ, không cho kéo tiếp; hiển thị dữ liệu Jira đọc lại thay vì nhân đôi các phần nháp.
- Idempotency kế thừa memory/Redis hiện có; Redis được cấu hình sẽ dùng chung giữa các instance. Không có Redis thì không có distributed lock giữa các instance. Vẫn kiểm tra snapshot và đọc kết quả trước khi xác nhận lại; không cam kết transaction nguyên tử khi có thao tác đồng thời ngoài app.
- Nhóm tách rất phân mảnh hoặc Jira chậm có thể vượt thời gian xử lý; server ngừng thêm bước để dành thời gian phục hồi, và báo rõ nếu chưa xác nhận được kết quả.

### Triển khai

- Version UI, manifest và service worker: **1.19.0**; không đổi logo, dữ liệu đăng nhập hay cấu hình zoom.
- Giữ cấu trúc Vercel hiện có, router `api/index.js`, không thêm runtime dependency hoặc biến môi trường bắt buộc mới.
- Chỉ tạo gói source; chưa deploy và chưa ghi vào Jira công ty. Xem `TESTING.md` để biết phạm vi kiểm thử.

## V1.18.0 — Củng cố trải nghiệm & tốc độ

### Cuộn, zoom và thao tác lịch

- Cuộn ngang/dọc bằng cơ chế cuộn tự nhiên của trình duyệt có hỗ trợ containment. Không chặn một lần kéo ngang chỉ vì ngón tay lệch nhẹ ra mép trên/dưới. Khung vẫn giới hạn nội dung trong lịch; toolbar và nền modal vẫn khóa đúng phạm vi.
- Chỉ đăng ký bộ chặn touch cho chỉnh sửa khi đang chỉnh sửa; bộ chặn của bottom sheet chi tiết chỉ tồn tại lúc sheet mở. Giữ fallback JavaScript cho engine thiếu CSS containment. Không tự mô phỏng quán tính hoặc thay đổi tốc độ cuộn của thiết bị.
- Zoom vẫn có −/+, hai thanh kéo, 75–200% và reset. Các input dồn trong một khung hình được gộp, tùy chọn lưu sau 150ms ngừng thay đổi và được ghi ngay khi đóng/ẩn trang nếu còn thay đổi. Không ghi localStorage lại khi không có thay đổi.
- Lưới vẫn dùng kích thước thật để snap, highlight, swap và resize khớp dữ liệu. Giữ vùng nhìn khi zoom/xoay máy; không dùng transform phóng toàn bộ lịch để thay tọa độ phút.
- Kéo đứng yên ở trong lịch không giữ vòng JavaScript chạy liên tục. Đường bay swap tiếp tục bằng animation hiện có. Auto-scroll theo thời gian thực, chỉ bắt đầu khi giữ sát mép khoảng 110ms để tránh giật khi tay nắm đi ngang qua mép; dừng ở giới hạn.
- Thu hẹp các vùng mà loading observer theo dõi, tránh kiểm tra layout vì một highlight/ghost đổi mỗi frame. Giảm cập nhật DOM lặp, dùng lookup cho block và chỉ tạo layer cho các phần sticky; không tạo layer riêng cho mọi worklog.
- Hiệu ứng mở/đóng bottom sheet và popup giữ fade/slide, reduced motion vẫn được tôn trọng; không thay đổi giá trị blur nền trong từng frame của popup chi tiết.

### Tải lại giữ vùng xem

- Bấm tải lại cùng kỳ: giữ lưới hiện tại phía sau loading nền tối, khóa thao tác trên dữ liệu đang tải, sau đó hiển thị dữ liệu mới. Nếu dữ liệu hiển thị không đổi, tái sử dụng lưới hiện có.
- Vùng nhìn lưu theo **ngày và phút thực**, thay vì chỉ theo pixel. Nếu có thêm worklog OT lúc 06:00 khiến lịch bắt đầu sớm hơn, vùng đang xem vẫn giữ gần cùng ngày/giờ; giới hạn tại mép đầu/cuối nếu khung không đủ không gian.
- Lỗi tải lại giữ snapshot vùng nhìn cuối để nút Thử lại phục hồi đúng vị trí sau khi đọc thành công. Không dùng phản hồi cũ thay dữ liệu của request/tài khoản mới.
- Áp dụng khi tải lại lịch trong app và tải lại sau lưu cùng kỳ. Không thêm cơ chế tự mở lại modal hoặc khôi phục bản nháp khi reload toàn bộ trang trình duyệt.

### Kết quả lưu theo từng worklog

- Bảng xác nhận hiển thị trước/sau cùng trạng thái riêng: **Chưa lưu**, **Đang kiểm tra**, **Đang lưu**, **Đã xác nhận trên Jira**, **Chưa lưu được**, **Cần xử lý xung đột**, **Chưa thực hiện**, **Chưa rõ kết quả · Cần đối chiếu**, **Đã phục hồi · Chưa lưu**.
- Khi một dòng lỗi, nhóm dừng như trước để giữ thứ tự/dependency. Các dòng đã xác nhận giữ trạng thái thành công; dòng chưa tới lượt được ghi rõ chưa gửi. Tổng kết cho biết đã xác nhận bao nhiêu, còn bao nhiêu cần xử lý/đối chiếu.
- Đóng rồi mở lại bảng vẫn thấy các dòng đã xác nhận và phần còn lại trong phiên hiện tại. **Kiểm tra và lưu (n)** chỉ xử lý nháp còn lại; **Bỏ phần chưa lưu** không hoàn tác worklog đã lưu trên Jira.
- Mất phản hồi ghi không được xem là thất bại chắc chắn. Nếu đọc đối chiếu tiếp tục lỗi, trạng thái vẫn là chưa rõ. Khi đọc lại thấy đúng đích, xác nhận đã lưu mà không gửi ghi lặp.
- Swap lỗi có rollback đã được xác nhận hiển thị đã phục hồi, không gắn nhãn đã lưu. Lịch người khác vẫn chỉ xem. Report chỉ giữ trong bộ nhớ phiên, không lưu nội dung worklog vào storage mới.

### Kiểm chứng và triển khai

Fixture Chromium touch với **400 worklog**, so cùng source V1.17.0:

| Chỉ số kiểm tra | V1.17.0 | V1.18.0 |
| --- | ---: | ---: |
| Listener touch/wheel có thể chặn trên đường cuộn khi xem lịch bình thường | 7 | 0 |
| Lượt đọc kích thước khung do 60 sự kiện scroll | 240 | 0 |
| Lượt áp dụng geometry trong một đợt 100 input zoom | 100 | 1 |
| Lượt ghi tùy chọn trong cùng đợt input | 100 | 1 |

Đây là phép đo số thao tác trong fixture, không phải cam kết FPS hoặc phần trăm tăng tốc trên iPhone/Jira thực tế. Không đổi API/backend, quy tắc logtime, native Overtime, xác nhận, chống trùng, rollback hoặc thứ tự ghi. Không thêm database/dependency runtime.

Deploy nội dung `Quick-Jira-Log-V1.18.0` lên project Vercel hiện có, giữ biến môi trường. Trong PWA chấp nhận **Cập nhật** nếu được hỏi, kiểm tra nhãn **V1.18.0**. Chạy `npm test`, `npm run test:experience`; phần browser cần Playwright/Chromium và hỗ trợ `QJL_CHROMIUM_PATH`. Chi tiết trong `TESTING.md`.

## V1.17.0 — Thu phóng lịch

### Cách dùng

1. Mở **Worklog đã log → Tuần**. Bấm icon **kính lúp có dấu cộng** cạnh nút màu dự án để mở bảng thu phóng. Có ở lịch thường, fullscreen và lịch chỉ xem của người khác; không hiện trong lịch tháng hoặc danh sách.
2. **Khung giờ** thay đổi chiều cao trục thời gian và block. **Cột ngày** thay đổi độ rộng các ngày. Mỗi trục có nút **− / +** (25 điểm phần trăm/lần) và thanh kéo từ **75% đến 200%** (bước 5%). Thay đổi hiển thị trực tiếp; không cần zoom bằng hai ngón tay.
3. Bấm tỷ lệ của từng trục để đặt lại trục đó về **100%**; nút **Đặt lại cả hai** trả cả hai về mặc định. Nút tăng/giảm bị vô hiệu tại giới hạn. Phím mũi tên, Home/End dùng được với thanh kéo.
4. Bấm **×**, chạm ngoài bảng hoặc Escape để đóng. Mở bảng đặt focus vào nút đóng, không mở bàn phím nhập liệu. Escape chỉ đóng bảng đang mở, giữ lịch/fullscreen. Bảng tự nằm trong viewport khi xoay máy, hỗ trợ light/dark và giảm chuyển động.

### Tỷ lệ, vùng xem và lưu tùy chọn

- **100%** theo tỷ lệ lịch V1.16.0: độ cao phút thường là 1px; fullscreen có thể giãn để tận dụng chiều cao. Tỷ lệ chọn nhân với nền này nên fullscreen và xoay máy có thể đổi kích thước pixel nhưng giữ đúng phần trăm của người dùng.
- Cột ngày vẫn lấp đầy khung nếu toàn bộ tuần đã vừa màn hình. Do đó giảm chiều ngang trên PC rộng có thể không thu nhỏ thêm khi tất cả ngày đã hiển thị vừa; mobile/cuộn ngang sẽ thấy thêm ngày khi giảm tỷ lệ.
- Khi thay đổi tỷ lệ/kích thước viewport, giữ ngày và thời điểm gần tâm phần lịch đang nhìn. Ở mép đầu/cuối, vị trí được giới hạn theo biên cuộn thực. Thoát fullscreen giữ cơ chế trở lại vị trí trước fullscreen hiện có.
- Tùy chọn được lưu tại thiết bị/trình duyệt, riêng cho PC và thiết bị cảm ứng chính. Profile được chọn khi mở trang và không đổi giữa lúc xoay máy. Không yêu cầu đăng nhập lại hoặc gọi Jira khi thu phóng. Nếu trình duyệt không cho lưu, vẫn sử dụng được trong phiên hiện tại.
- Chỉ thay đổi kích thước lưới; toolbar, form logwork và cỡ chữ giao diện không bị phóng cả trang. Không gọi khóa hướng màn hình. Dữ liệu giờ, native Overtime, mô tả và bản nháp giữ nguyên.
- Tọa độ tạo từ ô trống, kéo/swap, vùng highlight, tay nắm đổi thời lượng dùng kích thước lưới thật. Vẫn bám mốc 30 phút, giữ các kiểm tra giờ trống/quyền và chỉ cập nhật sau icon Lưu lịch + xác nhận. Mở bảng thu phóng kết thúc chế độ kéo hiện tại và giữ bản nháp.
- Backend Jira/WorklogPRO và luồng log đơn/Bulk không thay đổi. Không thêm dependency runtime hoặc database.

### Triển khai V1.17.0

Deploy nội dung thư mục `Quick-Jira-Log-V1.17.0` lên project Vercel hiện có, giữ nguyên biến môi trường. Mở PWA, chấp nhận **Cập nhật** nếu được hỏi và kiểm tra nhãn **V1.17.0**. Bộ cache mới chứa đủ ba tài nguyên thu phóng.

Chạy `npm test`, `npm run test:zoom`; browser tests cần Playwright/Chromium, có thể đặt `QJL_CHROMIUM_PATH`. Chi tiết và giới hạn kiểm chứng trong `TESTING.md`.

## V1.16.0 — Chỉnh thời lượng trên lịch

### Cách dùng

1. Mở **Worklog đã log → Lịch tuần**. PC: kéo tay nắm ở cạnh dưới block lên/xuống. Mobile: nhấn giữ block để vào chế độ chỉnh sửa, sau đó kéo tay nắm ở giữa cạnh dưới; kéo phần thân block vẫn là di chuyển/swap như trước.
2. Giờ kết thúc bám mốc **30 phút**, thời lượng kéo tối thiểu **30 phút**. Ngày và giờ bắt đầu được giữ nguyên khi kéo cạnh. Tooltip và highlight hiển thị giờ bắt đầu–kết thúc cùng thời lượng; màu đỏ báo vùng trùng hoặc không hợp lệ.
3. Thả tay tại vùng hợp lệ để lưu **bản nháp**. Jira chưa thay đổi. Kéo trả về thời lượng/vị trí gốc sẽ xóa bản nháp đó. Kéo không hợp lệ hoặc hủy thao tác giữ bản nháp trước đó.
4. Bấm icon **Lưu lịch** → xem ngày/giờ/thời lượng **trước và sau** → **Lưu lịch** để cập nhật Jira. Hủy xác nhận giữ nháp; **Bỏ thay đổi** tải lại dữ liệu server. Lưu thành công có toast và ẩn icon lưu khi hết nháp.

### Quy tắc và đồng bộ

- Resize chỉ chỉnh block đang kéo, **không tự swap** hoặc đẩy block khác. Di chuyển phần thân block vẫn hỗ trợ swap/live animation. Có thể resize rồi di chuyển/swap, hoặc di chuyển rồi resize trong cùng lần xác nhận.
- Giữ ràng buộc khung giờ hiện có: không đi qua giờ nghỉ, không trùng worklog và không tự tách block. Không tự đổi cờ Overtime; mô tả và thuộc tính OT được giữ theo dữ liệu Jira mới nhất. Lịch người khác không có tay nắm và vẫn chỉ xem.
- Block bắt đầu từ 17:30 được mở rộng lưới tạm khi resize để có thể cuộn tiếp tới buổi tối. Tỷ lệ phút được giữ ổn định trong thao tác; lưới tạm thu lại sau khi hủy/thả. Fullscreen dọc/ngang và safe area V1.15.6 giữ nguyên.
- Trước ghi, đọc lại worklog và lịch thật để kiểm tra tác giả, vị trí/thời lượng gốc và trùng giờ. Sau ghi, kiểm chứng lại thời điểm, thời lượng và mô tả. Core Jira bị từ chối rõ ràng mới thử adapter form WorklogPRO hiện có; không tự gửi lại một ghi có kết quả chưa rõ.
- Nếu mất phản hồi sau ghi: giữ nháp ở trạng thái cần đối chiếu. **Kiểm tra và lưu lại** đọc Jira trước; nếu server đã đúng đích thì xác nhận hoàn tất mà không ghi lặp. Thay đổi từ bên ngoài hoặc thiếu dữ liệu sẽ ngăn ghi.
- Nhóm swap có resize dùng thứ tự/điểm đỗ an toàn; khi cần phục hồi sẽ phục hồi cả **thời lượng và vị trí**. Thay đổi xác nhận thành công được bỏ khỏi nháp, phần lỗi vẫn giữ để xử lý.
- Worklog có giây lẻ ở giờ bắt đầu không resize bằng lưới phút; app báo mở chi tiết để chỉnh, không âm thầm làm tròn. Nhập thời lượng ở form chi tiết vẫn theo quy tắc hiện có.
- Giữ loading nền tối, truy vấn đọc mới, quyền, log đơn/Bulk, native OT và thống kê hiện có. Không thêm database hoặc dependency runtime.

### Triển khai V1.16.0

Deploy nội dung thư mục `Quick-Jira-Log-V1.16.0` lên project Vercel đang dùng, giữ biến môi trường. Mở PWA và chấp nhận **Cập nhật** nếu được hỏi; kiểm tra nhãn **V1.16.0**. Stylesheet resize đã được precache.

Chạy `npm test`, `npm run test:resize` (cần Playwright/Chromium cho phần browser; có thể đặt `QJL_CHROMIUM_PATH`). Chi tiết trong `TESTING.md`. Chưa kiểm chứng Jira công ty hoặc iPhone/Safari vật lý.

## V1.15.6 — Fullscreen theo hướng cầm máy

- Bật fullscreen **giữ hướng màn hình hiện tại**, không gọi khóa ngang hoặc mở khóa hướng màn hình. Người dùng chủ động xoay máy; lịch tự bố trí lại theo kích thước viewport. Manifest tiếp tục cho phép mọi hướng (`any`).
- Màn hình dọc: hai hàng gọn cho điều hướng ngày và chế độ xem. Chọn người dùng của mình hiển thị bằng icon, tên đầy đủ có trong tooltip/nhãn truy cập; lịch người khác vẫn hiện tên rút gọn và nhãn **Chỉ xem**.
- Màn hình ngang đủ rộng: một hàng cho ngày, tuần/tháng, màu dự án, T7/CN, chọn người dùng và các icon tùy chọn/fullscreen/lưu nháp. Cửa sổ ngang hẹp ẩn tổng giờ tóm tắt để giữ chỗ cho thao tác; khi xem người khác ở màn hình hẹp có thể dùng hai hàng để giữ tên và trạng thái chỉ xem.
- Giảm lề, khoảng cách và chiều cao header ngày. Thanh progress theo ngày vẫn giữ, cột giờ gọn hơn. Khung lịch dùng toàn bộ phần còn lại của viewport, chừa safe area cho tai thỏ và thanh Home. Không thu nhỏ tỷ lệ phút xuống dưới mức cũ để nhồi chữ; các ngày/giờ vượt khung vẫn cuộn trong lịch.
- Hướng dẫn nhấn giữ vẫn hiện khi xem bình thường; trong fullscreen chuyển vào **Tùy chọn cách xem** để giải phóng diện tích. Chọn ngày hiện tại vẫn thực hiện được qua ô ngày; tiêu đề màn hình và dòng tổng kết phụ không chiếm thêm hàng.
- Bản nháp kéo thả và ngày đang xem được giữ khi xoay máy. Icon **Lưu lịch** xuất hiện đúng khi có thay đổi, nằm cạnh icon tùy chọn và thoát fullscreen. Chế độ chọn user chỉ có ở fullscreen như trước; thoát fullscreen trở về lịch cá nhân.
- Không đổi API Jira/WorklogPRO, giờ log, OT, lưu nháp/xác nhận, swap hoặc luồng log đơn/Bulk. Giữ nền loading tối và các tối ưu đọc dữ liệu V1.15.5.

### Triển khai V1.15.6

Deploy nội dung thư mục `Quick-Jira-Log-V1.16.0` lên project Vercel đang dùng, giữ biến môi trường hiện có. Mở PWA, chấp nhận **Cập nhật** nếu được hỏi và kiểm tra nhãn **V1.15.6**. Stylesheet fullscreen mới đã được precache.

Chạy `npm test`, `npm run test:fullscreen`; các bộ UI liên quan có trong `TESTING.md`. Kiểm thử Chromium desktop/touch không thay thế kiểm chứng Safari/iPhone vật lý. Khả năng ẩn thanh trình duyệt phụ thuộc trình duyệt; fullscreen trong trang vẫn tận dụng visual viewport khi native fullscreen không có hoặc bị từ chối.

## V1.15.5 — Loading rõ hơn, giảm truy vấn lặp

- Nền phía sau loading được làm tối: light mode phủ navy 36%, dark mode phủ tối 48%. Thẻ loading, chữ và spinner giữ nguyên độ sáng; không dùng blur. Áp dụng PC/mobile/fullscreen, có hỗ trợ giảm chuyển động.
- Chỉ gộp các truy vấn đọc giống hệt nhau **đang chạy đồng thời trong cùng một API request**, cùng phiên xác thực và tham số. Mỗi nơi nhận bản dữ liệu riêng khi dùng chung truy vấn. Kết quả hoàn tất không được lưu thêm, request sau vẫn đọc mới; không chia sẻ giữa các tài khoản/API request.
- Mọi thao tác ghi, kể cả gửi form WorklogPRO native, tách các lượt đọc đang chờ trước đó. Bước đọc kiểm chứng sau ghi luôn tạo truy vấn mới; không gộp, tự thử lại hoặc tăng mức song song ghi worklog.
- Jira chặn POST search nhưng cho GET: sau khi GET thành công, các trang tiếp theo trong cùng lần xử lý dùng GET trực tiếp. Nếu phương thức đó lỗi, vẫn thử phương thức thay thế theo cơ chế hiện có; không giữ lựa chọn qua API request khác.
- Sau log/sửa/xóa, revision của truy vấn lịch/kiểm tra ngày thay đổi. Phản hồi cũ về muộn không được ghi đè cache mới hoặc dữ liệu tài khoản vừa chuyển. TTL cache hiện có không tăng; kiểm tra chống trùng trước ghi, quyền, phân trang, OT readback, idempotency và rollback giữ nguyên.

Trong fixture 500 task/5 trang, Jira từ chối POST search: số lần gọi giảm **10 → 6** (1 POST bị từ chối + 5 GET), đọc đủ và thấy dữ liệu thay đổi ở lần gọi sau. Đây là giảm số request trong tình huống cụ thể, không phải cam kết phần trăm tăng tốc tổng logwork trên Jira công ty.

Deploy nội dung thư mục `Quick-Jira-Log-V1.16.0` lên project Vercel hiện tại, giữ cấu hình/biến môi trường. Chấp nhận **Cập nhật** trong PWA nếu được hỏi và kiểm tra nhãn **V1.15.5**. Không cần database hay dependency runtime mới.

Kiểm thử: `npm test`, `npm run test:loading`, `npm run test:reads`. Dùng `QJL_CHROMIUM_PATH` nếu Chromium nằm ngoài đường dẫn mặc định. Chi tiết trong `TESTING.md`; chưa đối chiếu Jira công ty hay iPhone/Safari vật lý.

## V1.15.4 — Loading giữa màn hình & tối ưu truy vấn

- Khi đang tải danh sách Sub-task, lịch worklog, tổng hợp giờ hoặc kiểm tra giờ đã log: hiện thẻ loading ở giữa màn hình, chữ 18–22px, vòng xoay và lời nhắc dễ đọc. Màu phù hợp light/dark, PC/mobile và fullscreen.
- Loading chỉ theo màn hình đang mở; đóng/chuyển màn hình thì ẩn, phản hồi lỗi thay cho loading. Không tự focus textbox hay bật bàn phím; vẫn bấm được các điều hướng hiện có. Truy vấn nền không hiện thẻ đè lên công việc đang làm.
- Dữ liệu trả nhanh dưới khoảng 140ms không nháy loading. Không thêm thời gian chờ tối thiểu và không giả lập phần trăm tải dữ liệu. Khi logwork, giữ popup tiến trình hiện có, tăng cỡ chữ và thêm vòng xoay; không tạo popup hoặc thanh tiến trình thứ hai.
- Quét worklog dùng pool liên tục tối đa 12 tác vụ: một task chậm không giữ chờ toàn nhóm trước khi task kế tiếp được đọc. Các nguồn kiểm tra worklog, phân trang và xử lý từ chối quyền được giữ nguyên.
- Đọc thông tin task theo các nhóm tối đa 100, xử lý song song tối đa 3 nhóm; các trang của một nhóm vẫn đọc đủ và đúng thứ tự. Không tăng mức ghi worklog (đơn 2, Bulk 4 tác vụ như trước).
- Log đơn/Bulk khởi động discovery đọc Jira song song với metadata task. **Đọc worklog thật của các issue vẫn đợi task được xác thực**; không dùng cache số giờ để thay bước chống trùng trước ghi, không bỏ readback, OT, idempotency hay rollback.
- Tổng hợp: tra trường Sub-task Type/metadata chạy đồng thời với việc đọc worklog độc lập. Giữ cách nhóm, số giờ và nhãn Chưa xác định nếu Jira không trả đủ dữ liệu.

### Kết quả kiểm tra tốc độ

Benchmark so với V1.15.3, chạy 3 lần với cùng fixture và độ trễ mô phỏng: quét 24 issue từ khoảng **100ms → 56ms**; metadata 400 issue từ **84ms → 42ms**. Số request không đổi (72 và 12 qua 3 lần), chỉ giảm thời gian các bước độc lập chờ nhau. Đây là benchmark giả lập, **không phải tốc độ tổng logwork hay cam kết mức tăng trên Jira công ty**; mạng, quyền, WorklogPRO và tải Jira vẫn ảnh hưởng thời gian thực.

### Cập nhật

Deploy nội dung thư mục `Quick-Jira-Log-V1.16.0` lên cùng project Vercel, giữ nguyên biến môi trường hiện có; không cần database hoặc dịch vụ mới. Mở PWA, chọn **Cập nhật** nếu có thông báo, kiểm tra nhãn **V1.15.4**. Hai file loading mới đã được precache.

Chạy `npm test`, `npm run test:performance`; khi có Playwright/Chromium, chạy `npm run test:loading`. Có thể dùng `QJL_CHROMIUM_PATH` trỏ tới Chromium cài sẵn. Chưa kiểm chứng Jira/WorklogPRO công ty hoặc iPhone vật lý.

## V1.15.3 — Vùng ngoài giờ thường có nền xám nhẹ

- Lịch tuần phân biệt hai khoảng giờ thường **08:00–12:00** và **13:30–17:30**. Các phần trước 08:00, nghỉ trưa 12:00–13:30 và sau 17:30 được tô xám trung tính nhẹ, không dùng vân/gạch chéo hoặc nhãn lặp làm rối lịch.
- Light mode dùng xám nhạt; dark mode dùng xám sáng với độ phủ thấp để phân biệt mà không chói. Lưới 30 phút vẫn rõ và block worklog giữ nguyên màu dự án/Overtime.
- Vùng màu gắn theo tọa độ phút của lịch: đúng khi fullscreen kéo giãn, xem PC/mobile, T7/CN hoặc lịch mở rộng vì worklog có giờ sớm/muộn. Cột giờ và header ngày giữ nguyên.
- Chỉ thay giao diện nền: không tạo lớp chặn thao tác; không thay luật logwork, Overtime, kéo thả/swap hoặc quyền chỉ xem lịch người khác. Màu xám chỉ phân biệt **ngoài giờ thường**, không thể hiện rằng worklog Overtime đã tồn tại là không hợp lệ.
- Deploy như trước, dùng thư mục `Quick-Jira-Log-V1.16.0` làm root; chấp nhận Cập nhật PWA/tải lại sau deploy để nhận CSS mới. Không cần database, cấu hình Jira hoặc biến môi trường mới.

## V1.15.2 — Logo đồng hồ & dấu check xanh

- Dùng mẫu logo đã chốt: vòng đồng hồ trắng, cung cyan, dấu check xanh lá `#22C55E`, nền navy `#061E42`. Vẽ lại SVG sắc nét; PNG 64/180/192/512/1024px được đóng gói sẵn, không cần build hay cài thư viện đồ họa khi deploy.
- Đồng bộ logo màn hình khởi động, header PC/mobile, favicon, manifest/shortcut PWA và Apple touch icon. PNG nền kín để iOS tự tạo mask, không có viền trong suốt hoặc góc bo chồng nhau.
- Icon có URL phiên bản `-v1152.png` để tránh dùng ảnh cũ. Các đường dẫn icon cũ và `/apple-touch-icon.png`, `/apple-touch-icon-precomposed.png` cũng trả ảnh mới. Manifest giữ nguyên URL, start URL và scope, không tạo định danh app khác.
- Service worker tăng phiên bản cache, đăng ký với `updateViaCache: none`, precache cả icon mới/alias và hướng dẫn icon để dùng offline. Vercel yêu cầu kiểm tra lại manifest/icon; đây là cập nhật tài nguyên web, **không phải lệnh đổi icon trong iOS**.
- **Icon đã thêm trên iPhone không được bảo đảm tự đổi.** Web app không có API ép thay icon Home Screen. Sau deploy, mở app và chọn Cập nhật nếu có thông báo để tải giao diện mới. Không hứa nút này sẽ đổi icon ngoài màn hình chính.
- Nếu icon iPhone vẫn cũ: bấm **Icon ứng dụng** ở footer → Sao chép liên kết app → mở liên kết trong Safari → Chia sẻ → Thêm vào Màn hình chính. Kiểm tra logo mới trong màn hình thêm; mở icon mới và kiểm tra đăng nhập trước khi cân nhắc xóa icon cũ.
- Bản thêm mới có thể cần đăng nhập lại; dữ liệu cục bộ như tùy chọn, tài khoản tìm gần đây có thể không được chuyển. Không xóa dữ liệu Safari, không unregister worker, không đọc/gửi mật khẩu, không thử can thiệp icon native.
- Giữ nguyên API Jira/WorklogPRO, lịch, gợi ý nhân sự, Overtime, kéo thả/swap và luồng logwork cá nhân.

### Triển khai và kiểm tra icon

Push nội dung thư mục `Quick-Jira-Log-V1.16.0` lên repo và deploy Vercel với cấu hình/biến môi trường hiện có. Dùng cùng domain đang cài PWA; mở app, chấp nhận cập nhật nếu được hỏi, kiểm tra badge/footer V1.15.4. Thêm mới trên Safari sẽ dùng `/icons/apple-touch-icon-v1152.png` (180×180). Trình duyệt khác tự quyết định lịch cập nhật icon đã cài.

Nguồn tham khảo: [WebKit — icon trong manifest và apple-touch-icon](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Apple — Thêm web app vào màn hình chính](https://support.apple.com/en-vn/guide/iphone/iphea86e5236/ios), [W3C — vòng đời manifest](https://www.w3.org/TR/appmanifest/#updating-the-manifest). Chưa xác minh trên iPhone thật; kiểm thử Chromium không chứng minh iOS đổi icon native.

## V1.15.1 — Giữ lịch trong khung & tự gợi ý nhân sự

- Chặn hiệu ứng kéo quá biên (elastic/rubber-band) ở khung lịch, cả ngang/dọc và kéo chéo góc. Chế độ `contain` trước đây vẫn cho phép local bounce; bản này dùng `none` và guard touch/wheel ở mép.
- Kéo ngoài vùng nội dung/ở thanh điều hướng không làm cả lịch lệch khỏi khung. Cuộn ngang/dọc hợp lệ bên trong vẫn hoạt động; không khóa toàn bộ gesture, không đổi cách nhấn giữ/kéo thả block.
- **Tìm trên Jira tự gợi ý sau ít nhất 2 ký tự**, chờ 250ms khi dừng gõ; không cần Enter. Hỗ trợ composition tiếng Việt, loại bỏ phản hồi của từ khóa cũ.
- Tìm bằng picker trước, tự thử API `user/search` nếu picker bị chặn/không trả được kết quả hợp lệ. Kết quả thiếu user key hoặc dùng username làm alias được đối chiếu qua API user để lấy định danh đúng; không tự tạo key hoặc bỏ im lặng toàn bộ gợi ý.
- Khi đang tìm, ưu tiên danh sách gợi ý ngay dưới ô nhập; tạm ẩn nhóm gần đây và nút Lịch của tôi để tránh đẩy kết quả xuống dưới bàn phím. Xóa từ khóa sẽ hiện lại các mục này.
- Popup chọn nhân sự co theo visual viewport/bàn phím. Có thể dùng ↓/↑ và Enter để chọn gợi ý; không tự bật bàn phím khi vừa mở popup.
- Giữ tối đa 3 người xem gần đây, chọn user chỉ trong fullscreen và lịch người khác chỉ xem như V1.15.0. Luồng logwork cá nhân, Overtime, Bulk và các API ghi Jira giữ nguyên.
- Không có quyền tìm/đọc người dùng thì hiển thị lỗi rõ ràng; không vượt quyền Jira. Chưa kiểm chứng Jira công ty hay Safari/iPhone vật lý.

## V1.15.0 — Xem lịch worklog người khác trong fullscreen

1. Mở **Worklog đã log → Lịch**: mặc định luôn là tài khoản đang đăng nhập (`currentUser()`).
2. Bấm icon **fullscreen**: xuất hiện ô chọn người dùng dưới thanh điều hướng lịch. Ngoài fullscreen không hiển thị ô chọn này.
3. Bấm ô chọn → nhập ít nhất 2 ký tự tên hoặc username → chọn người dùng. Không tự bật bàn phím khi vừa mở hộp chọn; chỉ khi bấm ô tìm kiếm.
4. Xem lịch tuần/tháng, đổi kỳ, màu dự án và fullscreen như lịch cá nhân. Tên người đang xem và nhãn **Chỉ xem** luôn hiện ở trên lịch.
5. Bấm block để xem ngày, giờ, thời lượng, dự án, Overtime và mô tả trong cửa sổ riêng. Không có ô nhập, nút sửa/xóa hoặc thao tác kéo thả; bấm khoảng trống không mở form log thay người đó.
6. Chọn **Lịch của tôi** để trở về lịch cá nhân. Khi thoát fullscreen hoặc mở lại chức năng lịch, lựa chọn cũng được reset về tài khoản đang đăng nhập.

### Ba người xem gần đây

- Giữ tối đa **3 người khác được chọn và tải lịch thành công**, mới nhất ở trên; chọn lại sẽ đưa người đó lên đầu, không trùng lặp.
- Lưu trên trình duyệt/thiết bị theo từng tài khoản đăng nhập; còn sau khi đóng app, không tự mở lại lịch của người gần đây.
- Không lưu mật khẩu hoặc thông tin đăng nhập của người được xem. Người không đọc được lịch không được thêm vào danh sách gần đây.

### Quyền và dữ liệu

- Hai API mới `GET /api?action=calendar-users` và `GET /api?action=calendar-history` dùng **phiên Jira của người đang đăng nhập**. User được chọn chỉ là điều kiện lọc; không thay phiên đăng nhập và không giả danh user.
- Tìm người cần quyền Browse Users. Lịch chỉ chứa những issue/worklog Jira cho phép tài khoản đang đăng nhập đọc; không mở rộng quyền trên Jira.
- Dùng user key/tên tài khoản ổn định để lọc đúng tác giả từng worklog; không nhận diện bằng display name, không cộng `timespent` toàn task. Đọc phân trang và lọc timestamp về giờ Việt Nam.
- WorklogPRO không cho đọc Overtime thì hiển thị trạng thái chưa xác định/đọc thiếu. Không suy diễn là giờ thường. Dữ liệu bị giới hạn hoặc task không đọc được có thông báo chưa đầy đủ.
- Cache lịch người khác tách riêng theo tài khoản đăng nhập, user được xem và kỳ. Phản hồi đến chậm sau khi đổi user/thoát fullscreen bị bỏ qua.
- Nếu có bản nháp kéo thả cá nhân chưa lưu, cần lưu hoặc bỏ bản nháp trước khi chọn người khác. App không tự bỏ bản nháp.
- API logwork, Bulk, kiểm tra giờ trống, sửa/xóa, Overtime và Tổng hợp cá nhân giữ nguyên. Không thêm database, biến môi trường hay dependency runtime.
- Đã kiểm thử bằng Jira/WorklogPRO giả lập. Cần đối chiếu một tuần của một user trên Jira công ty sau deploy; chưa có phiên Jira thật trong môi trường kiểm thử.

## V1.14.5 — Icon điều hướng & hướng dẫn kéo thả

- Tổng hợp: icon biểu đồ cột thay ký tự hình vuông, đồng bộ PC/mobile.
- Worklog đã log: icon lịch thay icon xoay vòng, đồng bộ PC/mobile.
- Lịch tuần có chú thích nhỏ “Nhấn giữ block để kéo thả lịch.”, hiển thị cả fullscreen. Ẩn khi xem tháng hoặc danh sách.
- SVG theo màu giao diện sáng/tối; không thêm dependency, không đổi luồng logwork, swap hoặc lưu Jira.

## V1.14.4 — Swap preview ngay khi đang kéo

- Kéo **A 15:00–16:00** qua **B 08:00–09:00**: B **bay ngay về 15:00–16:00**, không cần thả A. Giữ A trên B thì B ở lại vị trí preview.
- Chưa thả A mà kéo sang chỗ khác: B **bay ngược về 08:00–09:00**. Đi tiếp qua C thì B quay về và C bay đến ô gốc của A đồng thời.
- Đổi hướng giữa chừng bắt đầu từ **frame đang hiển thị**, không nhảy về điểm đầu. Đường cong và độ uốn thay đổi nhẹ; điểm đến luôn đúng ô lịch. Nhãn giờ trên block preview theo vị trí đích.
- Khi thả trên B, chốt đúng cặp A/B ở bản nháp và tiếp tục hiệu ứng đang chạy; không phát lại từ ô cũ. Thả ở ô trống chỉ di chuyển A, các block preview khác quay về.
- Hover, rời ô hoặc hủy kéo **không tạo bản nháp và không gọi API ghi Jira**. Chỉ thả hợp lệ mới hiện icon lưu; **icon lưu → xác nhận Lưu lịch** mới cập nhật Jira.
- Giữ nguyên màu dự án/OT, thời lượng, mô tả và các kiểm tra trùng giờ. Logical slot giữ nguyên khi preview để tránh chọn nhầm/đổi qua lại liên tục; lớp chuyển động không bắt pointer.
- PC kéo trực tiếp; mobile nhấn giữ rồi kéo như trước. Escape/pointer cancel đưa preview về, không lưu. Chuyển màn hình, render lại, đóng lịch hoặc thay kích thước dọn lớp hiển thị.
- Thiết bị bật **Reduce Motion** vẫn preview vị trí nhưng chuyển tức thời, không chạy hiệu ứng bay. Chưa đo FPS trên iPhone/Safari vật lý.

## Highlight và đổi chỗ block (giữ từ V1.14.2)

- Khi kéo block trên lịch tuần, **vùng đích được tô nền và viền** đúng thời điểm/thời lượng; có nhãn giờ bắt đầu/kết thúc. Vị trí không hợp lệ chuyển viền đỏ.
- Kéo lên một worklog khác: app snap đến **giờ bắt đầu của block đó**, highlight cả hai vị trí kèm ký hiệu ⇄ và thông báo đổi chỗ.
- Thả tay để **swap hai block ở bản nháp**. Giữ thời lượng, mô tả và Overtime riêng của từng block; không ghi Jira trước xác nhận.
- Ví dụ A 15:00–16:00, B 08:00–09:00 → A 08:00–09:00, B 15:00–16:00. Hai thời lượng có thể khác nhau nếu cả hai vị trí mới đều đủ chỗ.
- Nếu đè nhiều worklog, trùng block thứ ba, đi qua giờ nghỉ hoặc ngoài khung cho phép, highlight đỏ và không tạo thay đổi đó.
- Kéo swap ngược lại trước khi lưu sẽ đưa cả hai về vị trí gốc và tự bỏ hai bản nháp. Hủy kéo bằng Escape/pointer cancel dọn highlight; không mở nhầm form log mới.
- **Icon lưu → xem giờ cũ/mới → Lưu lịch** vẫn là bước bắt buộc. Lưu xong có toast, nút lưu ẩn khi hết thay đổi.
- Hỗ trợ PC, mobile nhấn giữ, fullscreen và cuộn lịch; tooltip được đặt ngoài vùng đích để không che highlight.

### Lưu swap trên Jira

- Server đọc và xác minh tác giả, timestamp/thời lượng gốc, khung giờ và toàn bộ vị trí sau đổi. Dữ liệu đã thay đổi ở nơi khác bị từ chối.
- Nhóm hoán đổi vòng dùng một yêu cầu `POST /api?action=calendar-moves` (2–12 worklog). Server tìm khoảng trống trung gian trong **các ngày có liên quan**, di chuyển theo thứ tự không trùng, rồi đọc lại toàn bộ vị trí cuối.
- Mọi bước dùng cùng bộ kiểm tra và adapter sửa Jira/WorklogPRO hiện có; không tạo/xóa worklog mới, không đổi OT để lấy chỗ trống.
- Không có khoảng trung gian phù hợp thì dừng **trước khi ghi**, báo cần giải phóng một khoảng trống. Quyền Jira/kỳ khóa vẫn có hiệu lực, kể cả khoảng trung gian.
- Nếu một bước bị từ chối, server đọc lại rồi cố phục hồi các bước đã thực hiện. Jira không có transaction cho cả nhóm: nếu mất quyền, timeout hoặc phục hồi không xác nhận được, app báo **kết quả chưa rõ**, hiện vị trí đọc được và yêu cầu kiểm tra Jira. Không báo thành công giả hoặc tự replay một lần ghi chưa rõ kết quả.
- Mã yêu cầu chống gửi trùng và xác minh trạng thái cuối giúp xác nhận một swap đã hoàn tất sau khi mất phản hồi, không đổi chỗ lần hai.

## Lưu lịch sau khi kéo thả (giữ từ V1.14.1)

1. Mở **Worklog đã log → Lịch → Tuần**. Ban đầu **icon lưu không xuất hiện**.
2. PC: nắm block và kéo đến giờ/ngày mong muốn. Mobile: giữ block khoảng **550ms** để bật chế độ rung, rồi kéo thả.
3. Thả vào vị trí hợp lệ: block đổi vị trí **ở bản nháp**, có viền đứt và dấu chấm; **chưa ghi Jira**. Icon **Lưu lịch** xuất hiện trên cùng, cạnh tùy chọn/tải lại/fullscreen/đóng.
4. Có thể kéo nhiều block hoặc kéo lại một block nhiều lần. Chỉ vị trí cuối được giữ; đưa block về đúng giờ/ngày gốc sẽ bỏ bản nháp đó.
5. Bấm **icon lưu** → xem danh sách giờ cũ/giờ mới → bấm **Lưu lịch** để xác nhận. **Quay lại** giữ các thay đổi tạm; **Bỏ thay đổi** loại các thay đổi chưa xác nhận.
6. App kiểm tra dữ liệu mới nhất, quyền và trùng giờ; lưu từng worklog bằng API sửa hiện có, đọc lại Jira để xác nhận. Giữ nguyên thời lượng (kể cả giây), mô tả và Overtime.
7. Khi toàn bộ lịch được xác nhận đã lưu: tải lại lịch, hiện toast **Lưu lịch thành công**, **ẩn icon lưu**.
8. Nếu một lịch lỗi: giữ những lịch chưa xác nhận ở bản nháp, báo rõ số đã thành công. Những lịch đã lưu thành công không gửi lại. Không có giao dịch hoàn tác đồng loạt trên Jira.

### Lưu ý thao tác

- Chạm ngoài block trên mobile chỉ tắt chế độ rung, **không lưu hoặc bỏ bản nháp**.
- Bản nháp giữ trong phiên đang mở, kể cả tải lại lịch bằng nút ↻, chuyển kỳ và fullscreen. Đóng lịch khi chưa lưu sẽ mở lựa chọn lưu/quay lại/bỏ thay đổi. Trình duyệt được yêu cầu cảnh báo khi tải lại/đóng trang, nhưng một số mobile có thể bỏ cảnh báo. Bản nháp không được lưu bền qua reload hoặc đăng xuất.
- Khi có bản nháp, tạo worklog mới từ ô trống hoặc sửa/xóa chính block đó sẽ yêu cầu giải quyết bản nháp trước.
- Kiểm tra mới nhất trước khi lưu; nếu worklog đã thay đổi trên Jira, giữ bản nháp và yêu cầu bỏ thay đổi/tải lại. Không ghi đè bằng dữ liệu cũ.
- Nếu mất phản hồi sau khi ghi, bấm **Kiểm tra và lưu lại** sẽ đọc Jira trước: vị trí đã lưu đúng được xác nhận mà không PATCH lần nữa. Kết quả chưa rõ không tự gửi lại.
- Lưu nhiều block theo thứ tự giải phóng ô gốc trước khi chuyển block khác vào. Với hoán đổi vòng, server tự tìm khoảng trung gian và thực hiện theo quy trình swap bên trên.
- **Bỏ thay đổi** không hoàn tác worklog đã xác nhận hoặc đã được Jira ghi trước khi mất kết nối; app tải lại vị trí thật.
- Khung giờ hiện có và quyền/kỳ khóa trên Jira vẫn có hiệu lực. Tương tác giờ/kéo thả nằm trong **lịch tuần**.

## Logwork trực tiếp từ khoảng trống (giữ từ V1.14.0)

1. Bấm/chạm ô trống tại giờ bắt đầu, ví dụ **15:00**. Lịch chọn theo bước 30 phút; form cho chỉnh đến phút.
2. Chọn Sub-task chưa logwork, có tìm theo KEY/tên/dự án và tải lại.
3. App mở **form logwork hiện có**, điền ngày và giờ bắt đầu, không autofocus textbox/bàn phím.
4. Nhập thời lượng/mô tả/Overtime nếu cần, lưu và xác nhận theo luồng logwork hiện có. Ví dụ 15:00 + 1h → **15:00–16:00**.
5. Lưu đúng giờ đã chọn; không tự đổi sang giờ trống khác hoặc chia qua giờ nghỉ. App đọc lại Jira rồi quay về lịch.

Không cần database, biến môi trường hoặc token mới. Giữ cấu hình Vercel hiện có, dùng nội dung thư mục **Quick-Jira-Log-V1.15.4** làm root repository và cập nhật PWA sau deploy.

## Bản vá V1.13.2

- Dòng dưới thanh của từng dự án hiển thị **x% tổng giờ**, thay cho thời lượng giờ thường/OT bị lặp với tổng giờ bên phải.
- Công thức: **tổng giây dự án / tổng giây theo bộ lọc hiện tại × 100**. Gồm giờ thường, OT và giờ chưa xác nhận trong cùng kỳ tuần/tháng.
- Độ dài thanh và các đoạn giờ thường/OT/chưa rõ đều tính trên tổng giờ đang lọc, không so với riêng dự án lớn nhất.
- Ví dụ tổng 40h: EPU01 31h 30m → **78,75% tổng giờ**; INTRACOM01 8h 30m → **21,25% tổng giờ**. Tổng giờ vẫn hiển thị bên phải.
- Lọc một dự án thì tỷ trọng là 100% trong tập đang lọc. Hiển thị tối đa hai chữ số thập phân, bỏ phần 0 không cần thiết.
- Giữ phân loại theo custom field Sub-task Type từ V1.13.1. Chức năng xuất báo cáo chưa triển khai.

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

1. Giải nén, dùng **nội dung bên trong thư mục `Quick-Jira-Log-V1.16.0`** làm root repository; không đẩy cả ZIP hoặc lồng thêm thư mục.
2. Push GitHub rồi deploy project Vercel hiện có. Framework **Other**, không Build Command; Node.js **24.x**, giữ `vercel.json`.
3. Giữ `APP_SESSION_SECRET` và các biến môi trường đang dùng. Không cần token hay dịch vụ mới. Chỉ cấu hình `JIRA_SUBTASK_TYPE_FIELD_ID` nếu tự nhận diện trường không xác định được đúng một kết quả.
4. Sau deploy, chọn **Cập nhật** trong PWA hoặc tải lại trang để badge/footer hiện **V1.15.4**.
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

Giữ cấu hình Vercel và `APP_SESSION_SECRET` hiện có. Deploy source, cập nhật PWA/tải lại để đầu trang và footer hiện **V1.15.4**. Không cần database hay token Jira mới. Đăng nhập lại nếu phiên Jira đã hết hạn.

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

Giải nén ZIP, dùng **nội dung bên trong `Quick-Jira-Log-V1.16.0`** làm root repository. Push GitHub rồi import repository vào Vercel. Chọn Framework **Other**, không cần Build Command, giữ root và output mặc định. Thiết lập biến môi trường theo `.env.example` và phần hướng dẫn bên dưới; không commit `.env` hoặc mật khẩu.

App dùng Node.js 24.x và API Vercel hiện có. Bản nâng cấp này không cần đổi database hoặc thêm dịch vụ. Nếu đang dùng bản cũ, sau deploy hãy chọn **Cập nhật** trong PWA hoặc tải lại trang. Phiên bản trên đầu trang và footer phải là **V1.15.4**.

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

1. Giải nén ZIP, mở thư mục `Quick-Jira-Log-V1.16.0` (thư mục này chứa package.json, index.html và vercel.json).
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
# V1.19.4 — Không gian lịch PC gọn hơn

Ở chế độ thường trên màn hình từ 900px, phần tiêu đề và toolbar gọn hơn, điều hướng nằm sát kỳ xem, thông tin và hướng dẫn cùng hàng. Tiêu đề ngày đặt tổng giờ cạnh ngày để lịch bắt đầu cao hơn. Màn hình 900–1199px tự chia toolbar thành hai hàng.

Đóng gói sẵn cho Vercel; sử dụng cấu hình triển khai đang có. Stylesheet mới được lưu offline cùng phiên bản service worker 1.19.4.

# V1.19.3 — Thẻ thông tin kéo lịch thông minh

Thẻ thông tin né toàn bộ vùng xem trước, ưu tiên phía đối diện hướng kéo và không ra ngoài khung lịch. Nếu thiếu chỗ, thẻ thu gọn hoặc tạm ẩn; nhãn giờ tại điểm đến vẫn hiển thị. Không thay đổi luồng lưu Jira.


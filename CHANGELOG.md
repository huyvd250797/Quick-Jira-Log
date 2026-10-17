# V1.13.2 — Tỷ trọng tổng giờ theo dự án (2026-10-17)

- Thay nhãn thời lượng dưới thanh dự án bằng phần trăm tổng giờ của kỳ/bộ lọc hiện tại.
- Giữ tổng thời lượng bên phải; thanh regular/OT/unknown cùng dùng mẫu số tổng giờ để phản ánh đúng tỷ trọng.
- Hiển thị tối đa hai chữ số thập phân; cập nhật PWA và nhãn phiên bản.
- Kiểm thử ví dụ 31h30/40h = 78,75%, 8h30/40h = 21,25%, trường hợp một dự án 100%, responsive và light/dark.

# V1.13.1 — Đúng custom field Sub-task Type (2026-10-17)

- Sửa nguyên nhân gộp mọi giờ thành “Sub-task”: dùng custom field Sub-task Type, không dùng Issue Type.
- Tự phát hiện field ID theo tên qua GET /rest/api/2/field; tùy chọn mapping khi tên trùng/quyền hạn chế. Không đoán ID.
- Request custom field trong metadata batch, đọc option id/value, cộng thời lượng worklog trong kỳ và drill-down đúng nhóm.
- Null/None → Chưa phân loại; field thiếu/đọc lỗi → Chưa xác định kèm thông báo; không fallback issuetype, không mất giờ.
- Giữ các tính năng và cơ chế native Overtime V1.13.0; cập nhật PWA, history cache, README và kiểm thử custom field.

# V1.13.0 — Tổng hợp giờ & Overtime (2026-10-17)

- Thay giao diện Kiểm tra bằng Tổng hợp tuần/tháng, lọc dự án và ba KPI giờ.
- Biểu đồ dự án phân tách regular/OT/unknown; phân bổ theo Issue Type thực tế của sub-task, nhóm theo ID.
- Drill-down nhóm → worklog → editor/xóa hiện có; làm mới cache sau mutation và bảo vệ navigation race.
- Overtime chưa xác nhận được giữ riêng; dashboard/lịch tuần không cộng OT vào mục tiêu giờ thường.
- Đọc tiếp trang worklog/metadata khi Jira giảm page size; phát hiện trang lặp/thiếu và giới hạn discovery; phạm vi summary hỗ trợ trên 500 task với cảnh báo giới hạn.
- Tổng hợp chính xác giây, khử trùng, lọc author/ngày Việt Nam; tải tháng theo nhiều khoảng nhỏ.
- Responsive, light/dark, empty/loading/error/partial, native editor không autofocus input.
- PWA cache và các nhãn phiên bản cập nhật V1.13.0. Giữ adapter native form/token V1.12.1.

# V1.12.1 — Correct Native Edit Action & Token Bootstrap

- Sửa lỗi GET action POST `.jspa` khi mở form: dùng native `!update.jspa` theo tài nguyên WorklogPRO.
- Bootstrap token mới từ trang issue, giữ cookie giữa các bước và token lưu từ form thực tế.
- Bổ sung header AJAX/Origin/Referer, xử lý read redirect cùng origin có giới hạn.
- Phân biệt bước bootstrap, mở form và lưu; phát hiện login/anonymous/XSRF mà không lộ token/cookie/HTML.
- Regression fixture từ chối GET action lưu bằng 403, chỉ cho mở `!update` có token. Giữ tạo OT đơn/Bulk và read-back sau lưu.
- Chưa kiểm tra trực tiếp Jira của Boss; không khẳng định mọi nguyên nhân HTTP 403 đã được loại bỏ.

# V1.12.0 — Native WorklogPRO Form & Overtime Creation

- Thay REST PUT cập nhật OT bằng form native có token/cookie động và GET xác minh.
- Tạo Overtime ngay từ log đơn hoặc từng task trong Bulk; hỗ trợ ngày đã đủ 8h và giờ xếp tùy chọn.
- Giữ guard trùng giờ/khung giờ, idempotency, thuộc tính worklog khác và estimate.
- Core edit 403 được thử qua form khi giữ nguyên OT; không retry write chưa rõ kết quả.
- Hoàn tác worklog vừa tạo nếu đồng bộ OT lỗi; báo rõ khi hoàn tác chưa hết.
- Cập nhật phiên bản app, PWA cache, tài liệu và kiểm thử. Chưa thử Jira thật.

# Changelog

## V1.11.9 — Independent Worklog Editing & WorklogPRO Auth Fix

- Sửa coupling `overtime` luôn có trong payload: chỉ đổi OT mới đi WorklogPRO. Ngày/giờ/thời lượng/mô tả đi Jira core, giữ native OT, không gọi plugin khi không có ý định đổi OT.
- Sau auth Jira thành công, thêm Basic dành riêng WorklogPRO vào cookie phiên mã hóa HttpOnly; không trả JSON/log. Gửi no-check cho PUT plugin, không retry write hay fallback auth tự động. Phiên cũ có thông báo đăng nhập lại khi bị từ chối.
- Một GET riêng xác minh thông tin sau PUT Jira core; xử lý kết quả chưa rõ và cache như OT. Bỏ revalidation lịch nếu không đổi lịch/thời lượng; giữ giây bắt đầu gốc khi chỉ đổi OT/mô tả.
- Cho bỏ thay đổi OT đang nháp bằng Giữ nguyên Overtime mà không mất thông tin khác. Không tự lưu một phần khi request đổi OT thất bại.
- Chẩn đoán stage/method/endpoint/HTTP và thông báo Jira đã lọc; không gán mọi 403 thành lỗi quyền/kỳ khóa. Mapping ID do quản trị xác nhận hỗ trợ khi chỉ danh sách thuộc tính bị chặn.
- Kiểm tra API/HTTP login cookie và trình duyệt qua handler thật: core edit vẫn hoạt động dưới plugin 403, OT on/off, header Basic/no-check, quyền thật vẫn chặn, không lộ credential, bảo toàn nháp và xác minh.

## V1.11.8 — Native WorklogPRO Overtime Synchronization

- Thay cơ chế nhãn mô tả bằng thuộc tính BOOL WorklogPRO đúng worklog. Tự tìm Over Time?/Overtime, có override ID để giải quyết trùng tên; không gọi issue field/editmeta.
- Một PUT WorklogPRO lưu công việc và thuộc tính; giữ author/thuộc tính khác, adjustEstimate=leave. GET riêng kiểm tra lại OT/ngày giờ/thời lượng/nội dung/thuộc tính giữ lại trước trả success. Không retry PUT, không tự rollback khi kết quả chưa rõ.
- History lấy OT native, đánh dấu unknown khi không đọc được, không lấy marker làm nguồn; giữ native OT khi chỉ sửa nội dung. Dọn marker cũ ở worklog được lưu, không migration hàng loạt.
- UI từ chối success thiếu xác nhận native; phản hồi lỗi không đóng form/mất bản nháp khi refresh lịch để đối soát. Tách cache lịch cũ; giữ Lưu đăng nhập và giao diện V1.11.7.
- API fixture kiểm tra quyền, kỳ khóa/403, schema/ID trùng, preserve attrs, overlap, timeout sau commit, read-back không khớp. Browser đi qua handler thật đến fixture WorklogPRO trên PC/mobile.

## V1.11.7 — Random Hue Families, Clean Calendar Header & Remember Login

- Bảng màu ngẫu nhiên 13 họ màu/52 swatch, không ép xanh lá; ưu tiên các hue tách nhau khi còn lựa chọn, tránh lặp ngay hue của dự án, giữ vàng riêng OT.
- Bỏ underline ngày đang chọn, giữ nền chọn và thanh tiến trình log.
- Checkbox Lưu đăng nhập: chỉ lưu sau auth thành công; AES-GCM/IndexedDB với khóa không export; logout/401/mở lại điền form, không auto-login. Bỏ chọn xóa bản lưu.
- Đọc/ghi tuần tự, chống ghi đè bản nháp khi đọc chậm; lỗi auth không đổi bản lưu cũ, lỗi storage không làm mất phiên đã xác thực. Cập nhật PWA cache/script.
- Kiểm tra PC/mobile, lưu sau thành công, không plaintext, hết phiên/reload/logout, bỏ lưu, auth lỗi, đọc chậm và trình duyệt thiếu bộ nhớ.

## V1.11.6 — Refined Random Project Colors & No ETA

- Màu nền dịu, ít bão hòa; viền và KEY rõ, chỉnh riêng Sáng/Tối.
- Cấp màu ngẫu nhiên theo lần mở/làm mới/bật lại, cùng dự án giữ cùng màu trong lần xem; tránh lặp ngay màu trước đó.
- Bỏ ETA/countdown/giờ hoàn thành dự kiến và các mẫu thời gian; giữ %/bước/thời gian đã chạy.
- Kiểm tra mở lại/refresh/reload, ổn định khi đổi theme, ưu tiên OT và không còn ETA ở trạng thái active/lỗi.

## V1.11.5 — Post-log OT, Centered Progress & Full-height Sheets

- Bỏ OT ở form tạo đơn/Bulk, chặn yêu cầu OT tạo từ client cũ trước khi gọi Jira.
- Thay cơ chế field issue bằng nhãn riêng trong comment worklog; không gọi field/editmeta, không ảnh hưởng worklog khác cùng issue. Lưu OT và nội dung trong cùng một lần sửa.
- Không còn suy OT chỉ vì giờ bắt đầu hoặc field issue.
- Tiến trình chuyển vào native dialog giữa màn hình, backdrop tối, khóa đóng khi đang xử lý; hỗ trợ fade và giảm chuyển động.
- Sheet đơn/Bulk phủ hết chiều cao viewport; kéo grip/tiêu đề để đóng, giữ cuộn nội dung. Sheet chi tiết kéo tiêu đề xuống để đóng.
- Giới hạn input/date/time trong khung, loại màu xanh dương khỏi palette dự án và chuyển registry v3.
- Kiểm tra bổ sung API không field OT, roundtrip nhãn, modal progress, full-height/snap/dismiss và picker bounds.

## V1.11.4 — Cool Project Colors & Unified Worklog Editor

- Bảng màu mới ưu tiên mint/sky/lavender, chọn theo khoảng cách OKLab, đổi bảng màu cũ và giữ lựa chọn bật/tắt.
- Nhãn Overtime thống nhất ở Logwork, Bulk và form sửa.
- Form sửa có 5 preset nhanh, tăng/giảm 30 phút, công tắc OT và cùng kiểu trường nhập Logwork.
- Preset không bật bàn phím và không ghi đè bản nháp Logwork mới.
- Sửa OT dùng trường issue Jira, chỉ ghi khi đổi công tắc; kiểm tra giờ/overlap/quyền trước ghi.
- Preflight OT, hoàn tác worklog nếu field thất bại và báo rõ trường hợp hoàn tác chưa đầy đủ.
- Kiểm tra API bật/tắt/kiểu field/rollback và UI PC/mobile, sáng/tối, giữ nháp/đổi hướng.

## V1.11.3 — Adaptive Fullscreen, OT & Project Colors

- PWA cho phép xoay ngang/dọc thay vì khóa portrait.
- Giãn lưới fullscreen theo viewport thực tế, giảm lề/cột giờ và giữ đúng tỷ lệ block.
- OT vàng nhạt cố định ở cả hai theme; ribbon góc và nhãn gọn cho block ngắn.
- Đọc trường OverTime cấp issue theo lô, cache ID trường; fallback theo giờ bắt đầu 17:30, không suy OT chỉ từ cuối tuần.
- Progress T2–T6 xanh lá khi đạt 8h; thời lượng gọn và bỏ block 0 phút.
- Icon bật/tắt màu dự án, cấp màu ổn định/persist, loại dải vàng và ưu tiên OT.
- Thêm kiểm tra metadata/cache OT, bảng màu, thời lượng và fullscreen trên nhiều màn hình.

## V1.11.2 — Fixed Week Calendar, Scroll Lock & Motion

- Bỏ hoàn toàn agenda/danh sách chi tiết dưới lịch tuần; giữ agenda ở lịch tháng.
- Khóa nền khi mở chi tiết bằng inert + overflow + touch/wheel boundary guard; giữ cuộn dọc trong sheet, chặn kéo ngang và scroll chaining.
- Sheet trượt lên/rõ dần 240ms, trượt xuống/mờ dần 190ms; chỉ mở khóa sau khi đóng xong.
- PC popup fade nhẹ; cửa sổ công cụ fade in/out; chuyển kỳ/cách xem lịch fade nhẹ.
- Hủy animation cũ an toàn khi đóng/mở nhanh; lưu/xóa chờ đóng sheet rồi làm mới lịch.
- Giữ focus ở nút Đóng, không tự bật bàn phím; hỗ trợ Reduce Motion.
- Kiểm tra bổ sung: week-only grid, touch/wheel, biên cuộn, animation/rapid reversal và giảm chuyển động.


## V1.11.1 — Mobile Worklog Sheet & Fullscreen Calendar

- Chi tiết worklog mobile chuyển thành native dialog dạng bottom sheet; PC giữ popup.
- Bỏ tự focus vào thời lượng khi mở/đổi hướng màn hình; chạm trường mới nhập.
- Sheet rộng, nội dung cuộn, tiêu đề và lưu/xóa cố định; thích ứng visual viewport khi bàn phím thay đổi.
- Thu gọn thanh lịch mobile, chuyển Danh sách/Lịch vào icon tùy chọn; giữ tải lại, chọn ngày, Tuần/Tháng, T7/CN và tổng giờ.
- Thêm icon toàn màn hình với Native Fullscreen/landscape lock nếu được hỗ trợ; dự phòng chế độ tràn màn hình trong trang nếu bị từ chối.
- Điều hướng ngang gọn, 5 ngày vừa màn 844px; giữ lịch và vị trí cuộn khi thoát.
- Thêm kiểm tra tự động bottom sheet, focus, xoay màn hình, fullscreen, native/denied/unsupported và giữ nháp.


## V1.11.0 — Professional UI & Calendar First

- Mặc định mở Lịch tuần hiện tại, tự tải và giữ tìm KEY khi chuyển chế độ.
- Chuẩn hóa theme, màu chữ, kích thước, nhãn form, dashboard và Sub-task.
- Thời lượng Bulk 208px; preset tách hàng, kiểm tra lỗi ngay cạnh trường.
- Lịch có cột giờ cố định và một vùng cuộn trên PC/mobile; PC dùng popup, mobile giữ form dưới lịch.
- Giữ vị trí cuộn sau tải lại/sửa/xóa cùng kỳ; có nút Thử lại, báo dữ liệu tạm tính, toolbar ổn định khi tải/lỗi.
- Footer Bulk gọn, dễ tiếp cận; cho phóng to trang mobile và focus bàn phím rõ.
- Gom 155 khai báo CSS trùng, gỡ khóa kích thước input PC, đưa ui.css vào PWA shell.
- Sửa đặt focus trễ khi mở nhanh popup chi tiết để không ngắt thao tác nhập.
- Giữ logic API Jira, phân bổ giờ, OT, xác nhận và tiến trình hiện có.


## V1.10.5 — Desktop Worklog Details Popup

- Hiển thị cùng form chi tiết/sửa/xóa trong native dialog trên PC từ 900px; mobile giữ form inline.
- Popup có tên công việc đầy đủ, lỗi thao tác hiển thị tại chỗ, Escape/nền/Đóng, focus bàn phím và giữ vị trí lịch.
- Dùng chung form và dữ liệu khi đổi kích thước PC/mobile, không trùng ID hoặc handler.
- Giữ API, xác nhận xóa, làm mới dữ liệu sau mutation; đồng bộ version/PWA cache.

## V1.10.4 — Readable Mobile Duration

- Tăng chiều rộng ô TimeSpent trong Bulk mobile lên tối đa 192px để không cắt giá trị giờ/phút.
- Chuyển preset giờ xuống hàng riêng, cho phép xuống dòng, giữ nút tăng/giảm 30 phút.
- Trên mobile ngang thấp, cho header/footer Bulk cuộn theo nội dung để vẫn thao tác được ô nhập.
- Giữ nguyên giao diện PC và nghiệp vụ/API. Đồng bộ version và cache PWA.

## V1.10.3 — Desktop Calendar Workspace

- Tái bố cục lịch PC từ 900px: chuyển kiểu xem lên header, toolbar ngang và ô ngày 144px.
- Mở rộng cửa sổ và chiều cao lịch; PC hẹp tự xếp toolbar hai hàng.
- Một vùng cuộn nội dung lịch, bỏ cuộn lồng của lưới tuần; giữ header ngày sticky.
- Lưới 5/7 ngày vừa chiều rộng PC, tăng cỡ chữ block và thu gọn header ngày.
- Mobile giữ nguyên CSS/bố cục V1.10.2; không thay đổi xử lý worklog hoặc API.
- Đồng bộ version app và cache PWA.

## V1.10.2 — Compact Calendar Navigation

- Ẩn bộ lọc ngày/KEY và nút Tìm của Danh sách khi xem Lịch.
- Thêm ô Đến ngày trong thanh điều hướng cố định; tự chuyển đến tuần/tháng chứa ngày được chọn.
- Đồng bộ ngày giữa ô chọn, trước/sau, Hôm nay và ngày trong lưới.
- Lịch không dùng KEY ẩn; giữ KEY khi quay lại Danh sách. Thêm nút ↻ tải lại lịch.
- Đồng bộ version và PWA cache; không thay đổi API.

## V1.10.1 — Fixed Calendar Controls

- Đưa điều hướng kỳ và cụm Tuần/Tháng ra ngoài historyResults để không bị cuộn khuất hoặc header lưới lịch che trên mobile.
- Giữ cụm điều khiển hiển thị khi lịch đang tải; ẩn trong chế độ Danh sách và ẩn tổng tuần cũ khi dữ liệu chưa sẵn sàng.
- Đồng bộ version app/manifest/PWA cache, giữ nguyên nghiệp vụ và API.

## V1.10.0 — Weekly Calendar, Dashboard & Live Progress

### Added
- Lịch tuần/tháng; tuần mặc định T2–T6, bật thêm T7/CN; điều hướng qua tháng/năm.
- Tổng giờ /8h trong tiêu đề từng ngày, tổng tuần /40h phía trên lưới và số giờ còn thiếu.
- Block theo giờ bắt đầu/thời lượng, chia cột khi overlap; mở form xem/sửa/xóa trực tiếp từ block.
- Dashboard hôm nay/tuần này với định dạng Xh Ym, mục tiêu và giờ còn thiếu; giờ cuối tuần riêng.
- Tiến trình server qua NDJSON trên POST đơn/Bulk, % theo giai đoạn, số worklog đã tạo, thời gian đã chạy và ETA.
- Test tuần giao tháng/năm, tổng giờ, layout overlap và HTTP streaming tích hợp.

### Improved
- Dashboard làm mới sau ghi/sửa/xóa, khi quay lại app và khi đổi ngày Việt Nam.
- Cache range dùng chung giữa lịch/dashboard, chống phản hồi cũ ghi cache sau đổi tài khoản hoặc mutation.
- Stream thiếu kết quả cuối được phân loại chưa xác định; chỉ đạt 100% khi nhận thành công.
- Giữ khả năng gọi API bằng JSON; không thêm runtime dependency, database hoặc biến môi trường bắt buộc.
- Đồng bộ version app, manifest, PWA cache và tài liệu triển khai.

## V1.9.0 — Time Stepper & Worklog Calendar

### Added
- Nút tăng/giảm 30 phút và ArrowUp/ArrowDown trong TimeSpent của form đơn, Bulk và sửa worklog.
- Icon hiện/ẩn mật khẩu đăng nhập, nhãn trợ năng và trạng thái aria-pressed.
- Chuyển kiểu xem Danh sách/Lịch, lịch tháng từ Thứ 2 đến Chủ nhật, tổng giờ/số worklog từng ngày, danh sách giờ trong ngày và mở form sửa từ sự kiện.
- API lịch sử hỗ trợ khoảng ngày tối đa 31 ngày; truy vấn tháng theo issue một lần, lọc tác giả/timestamp theo giờ Việt Nam.
- Test helpers, tháng nhuận, timezone, lọc tác giả và tình huống API tải một phần/lỗi.

### Improved
- Worklog đã log gần toàn màn hình mobile; desktop rộng/cao hơn; bộ lọc gọn và một vùng cuộn chính.
- Mở lịch sử tự tải dữ liệu; làm mới sau sửa/xóa và bỏ cache tháng sau mutation.
- Mô tả trùng Summary không lặp lại trong thẻ lịch sử.
- Phân biệt lỗi truy vấn, tải thiếu và kết quả rỗng; bỏ phản hồi request cũ khi đổi ngày/kiểu xem.
- Cập nhật version, manifest và cache PWA; bổ sung helper mới vào app shell.

### Deployment
- Không thêm thư viện runtime, database hoặc biến môi trường bắt buộc mới.
- Tiếp tục dùng một Vercel Function qua api/index.js và các biến môi trường của V1.8.0.

# V1.16.0 — Resize Worklogs on Calendar

- Tay nắm cạnh dưới cho lịch tuần: PC kéo trực tiếp, mobile hiện khi nhấn giữ vào chế độ chỉnh sửa. End-time snap 30 phút, min 30 phút, highlight/tooltip thời lượng, không swap khi resize.
- Bản nháp chứa thời lượng đích; so sánh trước/sau gồm thời lượng. Giữ resize khi tiếp tục di chuyển/swap và chỉ ghi sau xác nhận.
- API correction thêm calendarEdit/targetSeconds có xác thực expected snapshot, giữ comment/OT, fresh conflict guard, readback và native fallback. Hợp đồng moveOnly cũ giữ nguyên.
- Calendar-moves hỗ trợ duration-aware cycles/replay và phục hồi cả thời lượng/vị trí. Planner phát hiện phụ thuộc giữa thu ngắn/mở rộng và các block đang di chuyển.
- Mở rộng lưới tạm cho resize buổi tối; giữ scale trong gesture, cleanup khi hủy/repaint/resize. Toast trạng thái không chặn tay nắm sát đáy. Lịch người khác không có tay nắm.
- Nâng version/cache V1.16.0; precache calendar-resize.css, bổ sung API/planner và browser gesture regressions.

# V1.15.6 — Adaptive Calendar Fullscreen

- Bỏ Screen Orientation lock/unlock và toast yêu cầu xoay ngang khi bật fullscreen. Resize tiếp tục đồng bộ visual viewport và tỷ lệ phút.
- Gom chọn user vào thanh công cụ lịch; bố cục một hàng khi rộng, hai hàng khi hẹp, giữ tên/trạng thái chỉ xem cho lịch người khác.
- Fullscreen giảm lề, header ngày, khoảng trống và dòng phụ; tôn trọng safe area. Hướng dẫn kéo thả chuyển vào tùy chọn khi fullscreen.
- Giữ nút lưu nháp trong hàng icon, điều chỉnh chỗ dành cho nút theo trạng thái. Bố cục ngang thấp khi chưa fullscreen cũng gọn hơn.
- Không đổi backend hoặc thư viện nghiệp vụ; không ghi Jira khi xoay/đổi fullscreen. Nâng UI/service-worker lên V1.15.6 và precache calendar-fullscreen.css.

# V1.15.5 — Dimmed Loading & Fresh Jira Reads

- Nền tối dưới thẻ loading, phù hợp light/dark; foreground giữ sáng, không blur hay thêm thanh tiến trình.
- Gộp chỉ các read in-flight giống nhau trong một API request; tách auth/options, clone dữ liệu cho consumer, không cache kết quả hoàn tất.
- Mọi ghi REST và form WorklogPRO native là ranh giới đọc mới. Không gộp hoặc tự retry ghi; readback không dùng lượt đọc trước ghi.
- Nhớ GET search thành công trong một lần xử lý khi POST bị từ chối; phân trang vẫn đầy đủ, lựa chọn reset ở request mới.
- Revision lịch/day audit ngăn phản hồi trước cập nhật hoặc trước đổi tài khoản ghi đè cache mới. Không tăng TTL cache.
- Nâng UI/PWA lên V1.15.5, thêm regression API scope/fresh reads và browser race cases.

# V1.15.4 — Centered Loading & Faster Jira Reads

- Thẻ loading trung tâm với spinner và chữ dễ đọc, theo busy state của màn hình, không chặn thao tác/focus; dữ liệu cache trả nhanh không nháy thẻ.
- Popup tiến trình logwork thêm vòng xoay/cỡ chữ, giữ một thanh tiến trình thật.
- Guard worklog chuyển từ các batch chờ nhau sang worker pool liên tục (12); metadata batch song song tối đa 3.
- Discovery log đơn/Bulk chạy sớm cùng metadata; barrier bảo đảm task hợp lệ trước khi đọc worklog thật và trước mọi ghi.
- Tổng hợp đọc worklog đồng thời với tra Sub-task Type/metadata. Không thay dữ liệu/OT/guard/idempotency/readback/rollback.
- Cache PWA/nội dung phiên bản V1.15.4; thêm kiểm thử performance và loading.

# V1.15.3 — Subtle Calendar Hours

- Tô xám nhẹ nền lịch ngoài hai ca 08:00–12:00 và 13:30–17:30, có màu phù hợp light/dark.
- Tọa độ màu đồng bộ độ giãn fullscreen và thời điểm bắt đầu lịch khi có worklog sớm/muộn.
- Giữ lưới 30 phút, màu block dự án/OT và toàn bộ tương tác/luồng logwork hiện có; không bổ sung ràng buộc mới.
- Cache PWA và nhãn phiên bản tăng lên V1.15.3, precache stylesheet mới.

# V1.15.2 — Clock & Green Check Identity

- Thay toàn bộ logo/icon bằng đồng hồ + dấu check xanh lá đã chốt, SVG source và PNG sẵn dùng.
- URL icon theo phiên bản; cập nhật cả URL cũ, root Apple aliases, manifest/shortcut, cache worker và Vercel headers.
- Thêm hướng dẫn Icon ứng dụng với xem trước, sao chép link sạch và fallback khi clipboard không được phép; co vừa màn hình, hỗ trợ theme và giảm chuyển động.
- Phân biệt rõ cập nhật web app với icon Home Screen do iOS quản lý. Không tự xóa dữ liệu hoặc hứa ép đổi icon đã cài.
- Không đổi các handler/API/logic logwork cá nhân hay lịch người khác.

# V1.15.1 — Calendar Bounds & Personnel Suggestions (2026-10-18)

- Thay local overscroll/scroll chaining trong khung lịch bằng overscroll none; bổ sung touch/wheel edge guard và clamp negative offsets. Giữ native pan ở vùng hợp lệ, giữ drag/long-press auto-scroll.
- Gợi ý nhân sự tự chạy khi gõ (2 ký tự, debounce 250ms), có IME composition và stale-response guards, keyboard selection.
- Bổ sung canonical lookup cho picker thiếu key/key là username, hỗ trợ dạng mảng/nested và fallback user/search. Chỉ trả định danh/tên cần thiết, không HTML/email hoặc thông tin đăng nhập.
- Ưu tiên kết quả gợi ý khi nhập và popup theo visual viewport, giữ 3 recent theo tài khoản.
- Nâng version/cache lên 1.15.1; không đổi handler ghi Jira hay luồng logwork cá nhân.

# V1.15.0 — Fullscreen User Calendars (2026-10-18)

- Chỉ fullscreen của Lịch có bộ chọn user. Mở lại lịch hoặc thoát fullscreen reset về tài khoản đăng nhập.
- Tìm user trên Jira và lưu tối đa 3 người đã xem gần đây, tách theo tài khoản trên thiết bị.
- API đọc riêng cho lịch người khác, giữ nguyên caller auth, nhận diện tác giả bằng stable key/name và lọc đúng ngày, đọc đủ trang.
- Lịch người khác chỉ xem, có chi tiết riêng; chặn kéo thả, sửa/xóa và log từ ô trống. API ghi hiện có vẫn kiểm tra tác giả.
- Cache và phản hồi bất đồng bộ được tách theo user/kỳ; không hiển thị phản hồi cũ sau khi đổi user/đóng fullscreen.
- Giữ bản nháp cá nhân khi mở bộ chọn, yêu cầu giải quyết bản nháp trước khi đổi người.
- Không đổi các handler logwork/Bulk/correction/day audit hoặc lịch sử cá nhân; không thêm cấu hình/database/dependency.

# V1.14.5 — Navigation Icons & Calendar Hint (2026-10-18)

- Dùng SVG biểu đồ thống kê cho Tổng hợp và SVG lịch cho Worklog đã log ở PC/mobile.
- Thêm chú thích nhỏ, luôn thấy trên lịch tuần và fullscreen: “Nhấn giữ block để kéo thả lịch.”
- Giữ nguyên nghiệp vụ và live swap preview. Nâng version UI/PWA cache lên 1.14.5.

# V1.14.4 — Live Swap Preview (2026-10-18)

- Block bị thay thế bay ngay khi hover hợp lệ, giữ tại ô gốc của block đang kéo; rời hover thì bay ngược về ô ban đầu.
- Nhiều partner được quản lý độc lập: B quay về và C bay đi đồng thời; đổi hướng giữa chừng bắt đầu từ frame hiện tại.
- Giữ logical slots ổn định để hit test không dao động; không mutate draft/history hay gọi API lúc hover.
- Thả tay tiếp nhận hiệu ứng hiện tại sau render, chỉ chốt bản nháp của vị trí thả; không replay từ ô cũ. Nhãn giờ clone theo preview.
- Cleanup khi cancel/render/navigation/resize/scroll; Reduce Motion preview tức thời. Không đổi backend hoặc dependency runtime.
- Nâng version PWA/cache/UI lên 1.14.4. Thêm browser regression live-swap-preview cho PC và touch.

# V1.14.3 — Animation swap theo đường cong (2026-10-18)

- Block bị thay thế bay về vị trí mới theo đường Bézier, thay đổi độ cong nhẹ mỗi lần; điểm đến giữ chính xác.
- Chuyển động 480–660ms, transform/scale/rotate trên clone riêng, dừng êm; primary block có hiệu ứng đặt xuống 200ms.
- Chụp màu/font/ribbon từ block gốc để giữ theme, màu dự án và Overtime khi bay.
- Dọn animation/clone/opacity khi xong, thao tác tiếp, scroll/resize/fullscreen, close/Escape, blur và reduced motion.
- Giữ highlight, bản nháp, lưu/xác nhận và API swap từ V1.14.2. Không thay backend hoặc thêm dependency.
- Cập nhật version/PWA cache và bổ sung kiểm thử đường cong, tọa độ hạ, interruption và reduced motion.

# V1.14.2 — Highlight vùng thả & Swap lịch (2026-10-18)

- Highlight vùng giờ đích chính xác khi kéo, hai vị trí khi swap; trạng thái hợp lệ/cảnh báo đỏ và tooltip tránh che vùng thả.
- Thả vào một block khác để đổi ngày/giờ bắt đầu của hai block ở bản nháp. Giữ duration riêng, comment và native OT; chặn trùng với block thứ ba/giờ nghỉ.
- Giữ icon lưu/xác nhận/toast V1.14.1. Swap ngược tự bỏ bản nháp; Escape/pointer cancel xóa highlight và chặn click thừa.
- API calendar-moves cho chu kỳ đổi chỗ: dữ liệu mới/tác giả/guard trước ghi; tự tìm ô trung gian trong ngày liên quan, cùng adapter sửa và readback; không tạo/xóa log.
- Phục hồi có kiểm tra khi bước giữa lỗi, giữ kết quả chưa rõ khi không xác nhận được, idempotency và đọc trạng thái cuối chống lặp.
- Cập nhật cache/PWA V1.14.2; thêm kiểm thử swap logic/API/PC/mobile, native WorklogPRO fallback và giữ chính xác giây.

# V1.14.1 — Kéo thả lưu tạm & xác nhận lưu lịch (2026-10-18)

- Thả block chỉ tạo bản nháp, hiển thị viền/dấu chấm; không PATCH Jira trước xác nhận.
- Icon lưu mặc định ẩn, hiện khi có ít nhất một thay đổi; đặt trong thanh trên cùng, hỗ trợ fullscreen và mobile hẹp.
- Dialog xem giờ cũ/mới, lưu/quay lại/bỏ thay đổi; toast thành công và ẩn icon khi không còn bản nháp.
- Đưa block về vị trí gốc tự bỏ bản nháp; mobile chạm ngoài chỉ thoát chế độ rung.
- Đọc lịch mới trước ghi, kiểm tra stale/trùng, sắp thứ tự giải phóng ô; giữ nguyên duration/comment/OT. Chặn hoán đổi vòng cần vị trí trung gian.
- Lỗi một phần giữ bản nháp còn lại, không gửi lại các lịch đã xác nhận; mất phản hồi đọc lại Jira trước lần ghi tiếp theo.
- Bảo vệ đóng lịch/reload/đăng xuất, giữ bản nháp khi tải lại lịch hoặc chuyển kỳ; bản nháp chỉ trong phiên hiện tại.
- PWA assets và version V1.14.1; thêm calendar-drafts helper, kiểm thử logic và UI.

# V1.14.0 — Logwork trực tiếp trên lịch (2026-10-18)

- Bấm khoảng trống lịch tuần, chọn Sub-task và dùng lại form logwork với ngày/giờ bắt đầu được điền sẵn.
- Single-worklog API hỗ trợ giờ bắt đầu chính xác; guard và đọc lại Jira, không auto-shift/split qua giờ nghỉ. Giữ luồng tự xếp và log đơn/Bulk hiện có khi không chọn giờ từ lịch.
- PC kéo thả đổi giờ/ngày thật; mobile giữ 550ms bật chế độ rung rồi kéo; chạm ngoài block để thoát.
- Preview snap 30 phút, tự cuộn sát mép, cảnh báo trùng/ngoài khung; server kiểm tra lại trước khi ghi.
- Move-only giữ giây, mô tả và OT; kiểm tra dữ liệu gốc để phát hiện stale; xác minh readback, không optimistic move hoặc auto retry kết quả chưa rõ.
- Native form trong dialog, không autofocus input, feedback chế độ sửa không xê dịch grid. Cập nhật lịch/dashboard/Tổng hợp sau tạo và di chuyển.
- PWA/cache assets và nhãn phiên bản V1.14.0. README/TESTING có hướng dẫn và giới hạn xác minh.

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

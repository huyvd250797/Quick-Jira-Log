# Kiểm thử V1.15.6 — Adaptive Calendar Fullscreen

- `npm test`: PASS toàn bộ logic/API hiện có. Backend (`api/`, `handlers/`, `lib/`) giữ nguyên byte so với ZIP V1.15.5 đầu vào; không đổi logwork/OT/guard/rollback/idempotency hoặc tối ưu đọc dữ liệu.
- `tests/browser/fullscreen-layout.cjs`: 8 viewport 315×683, 390×844, 430×932, 568×320, 667×375, 844×390, 1024×768, 1440×1000; light/dark. Kiểm tra vùng lịch dọc >= chiều cao viewport - 90px, ngang >= viewport - 52px ở lịch cá nhân không nháp; fullscreen tăng diện tích so với cùng cửa sổ thường.
- Mọi input/nút hiện trong toolbar nằm trong viewport và phía trên lịch, không chồng nhau, nhận được pointer ở tâm. Kiểm tra cả nút lưu khi có nháp, mở/hủy xác nhận lưu; popup tùy chọn không vượt mép.
- Spy Screen Orientation: fullscreen vào/ra không gọi lock hoặc unlock; native request thành công/từ chối vẫn hoạt động. Xoay dọc/ngang giữ ngày, giờ nháp, số nháp và không gửi request ghi Jira.
- Mô phỏng safe area trái/phải 47px và bottom 21px trên 844×390; kiểm tra lịch cá nhân và lịch người khác. Thanh công cụ tự xuống hàng khi chỗ còn lại không đủ. Đây là kiểm tra CSS gutter giả lập, không phải phép đo iPhone vật lý.
- `tests/browser/mobile-calendar.cjs`: PASS 315, 390, 430, 667, 844, 1440px; popup/sửa, không autofocus input, xoay khi đang sửa không mất nội dung, native fullscreen/fallback/denial, thoát hệ thống và chuyển danh sách.
- `tests/browser/native-fullscreen.cjs`: PASS Chromium native fullscreen thật và sự kiện fullscreenchange khi thoát.
- `tests/browser/calendar-viewer.cjs`: PASS PC/mobile/landscape: fullscreen-only picker, tên/Chỉ xem, read-only mouse/touch/month/details, MRU 3, phản hồi cũ/lỗi quyền, bảo vệ nháp, reset tài khoản và form logwork cá nhân không đổi.
- `tests/browser/calendar-interactions.cjs`: PASS PC 1440×1100, touch 390×1000 và 320×900: tạo từ ô trống, kéo nháp, xác nhận/hủy/lưu/bỏ, nút lưu fullscreen, mobile nhấn giữ, overlap, từ chối lưu, response mất và đối chiếu trạng thái.
- `tests/browser/calendar-refinements.cjs`, `tests/browser/calendar-colors.cjs`: PASS bounds/gợi ý nhân sự và các trạng thái màu/OT/progress/scale ở các viewport hiện có.
- `tests/browser/branding.cjs`: PASS 4 viewport và cập nhật service worker thật trên localhost tới cache V1.15.6, giữ localStorage, icon offline. CSS fullscreen mới nằm trong precache.
- Đã xem ảnh PC/mobile dọc/ngang. Node syntax, version, asset references, backend byte comparison và ZIP CRC kiểm tra khi đóng gói. Không chạy toàn bộ chuỗi `test:ui`; các bộ liên quan nêu trên đã chạy. Chưa kiểm chứng Safari/iPhone vật lý hoặc Jira công ty; native fullscreen/ẩn thanh trình duyệt phụ thuộc trình duyệt.

# Kiểm thử V1.15.5 — Dimmed Loading & Fresh Jira Reads

- `npm test`: PASS toàn bộ logic/API hiện có và `tests/read-scope-tests.js`. Giữ kiểm tra log đơn/Bulk, OT native form/readback, chống trùng, calendar save/swap/rollback và quyền lịch người khác.
- Read scope: 8 lượt GET đồng thời chỉ gọi Jira một lần, dữ liệu consumer độc lập; đọc kế tiếp gọi mới. Tách API request/auth/headers/timeout, lỗi không giữ lại, hai ghi giống nhau vẫn là hai ghi, readback tách lượt đọc đang chờ trước ghi.
- Handler API thật với Jira fixture: 500 task/5 trang, POST search bị từ chối, GET được phép: 1 POST + 5 GET thay vì 5 POST + 5 GET. API request kế tiếp tự xác định lại và nhận dữ liệu mới. Kiểm tra GET ưu tiên lỗi thì fallback POST, 401 không fallback.
- `tests/browser/read-freshness.cjs`: PASS phản hồi lịch cũ về sau phản hồi mới không ghi đè cache; day audit tương tự; phản hồi của tài khoản trước không lấp cache tài khoản mới. Revision tạo request riêng sau invalidate, không tăng TTL.
- `tests/browser/loading-feedback.cjs`: PASS 1440×1000, 390×844, 844×390; light/dark, nền phủ alpha 0.3–0.55 trong khi card/foreground opacity 1, ở giữa viewport, spinner/cỡ chữ, đóng/mở/error/retry/fullscreen/native picker/focus/reduced motion và một tiến trình log. Đã xem ảnh PC dark/mobile light.
- `tests/browser/workflow.cjs`: PASS desktop và iPhone giả lập: dashboard, tuần/tháng, block, sửa/xóa, streaming progress và interrupted response.
- `tests/browser/branding.cjs`: PASS 4 viewport và service worker upgrade thật trên localhost; nhận cache V1.15.5, giữ localStorage, icon offline. Logo V1.15.2 giữ nguyên.
- So source đầu vào: không đổi các handler nghiệp vụ; chỉ thêm API read scope, Jira read wrapper/search-method hint, native-form read barrier, frontend revision và backdrop/version/docs/tests. Node syntax, precache assets, version và ZIP CRC kiểm tra khi đóng gói.
- Không chạy toàn bộ chuỗi `test:ui`; các bộ ảnh hưởng trực tiếp nêu trên đã chạy. Dữ liệu giả lập không thay cho kiểm chứng Jira công ty hoặc iPhone/Safari vật lý. Không cam kết phần trăm giảm thời gian logwork thực tế; quyền, tải Jira/WorklogPRO và đường truyền vẫn ảnh hưởng.

# Kiểm thử V1.15.4 — Centered Loading & Faster Jira Reads

- `npm test`: PASS bộ logic/API trước đó. `tests/performance-tests.js`: PASS pool guard tối đa 12 không kẹt task chậm; 24 issue đọc đủ; metadata tối đa 3 batch, đủ 350 key/phân trang 20 item dù yêu cầu 100, đúng thứ tự/dedup/401; handler log đơn và Bulk discovery chồng thời gian metadata, không đọc worklog hoặc ghi trước validation, project sai không ghi.
- Benchmark nội bộ so cùng source V1.15.3, 3 lần/fixture: guard 100ms → 56ms (24 issue/lần, tổng 72 reads cả trước/sau), metadata 84ms → 42ms (400 issue/lần, tổng 12 reads cả trước/sau). Đây là độ trễ mô phỏng của hai bước, không phải benchmark production hay end-to-end logwork.
- `tests/browser/loading-feedback.cjs`: PASS 1440×1000, 390×844, landscape 844×390; light/dark, vị trí giữa viewport, font ≥18px, spinner, đóng/mở lại khi đang tải, error/retry, fullscreen host, picker dialog native, không focus input, tổng hợp, giảm chuyển động và chỉ một progress khi log. Đã xem ảnh QA.
- `tests/browser/workflow.cjs`: PASS PC và iPhone giả lập: dashboard, tuần/tháng, block theo thời lượng, sửa/xóa và streaming/interrupted response.
- `tests/browser/branding.cjs`: PASS 4 viewport và worker upgrade thật trên localhost, cache migration, giữ localStorage và fetch offline sau cập nhật.
- Các bước trước ghi vẫn dùng worklog đọc thật; không bỏ chống trùng, auth, giới hạn giờ, OT readback, idempotency và rollback. Không thêm cache dữ liệu Jira mới hoặc thay quyền lịch người khác.
- Chưa có phiên Jira công ty hay iPhone/Safari vật lý. Cải thiện thực phụ thuộc độ trễ và tải server Jira/WorklogPRO; không cam kết phần trăm tăng tốc ngoài fixture.

# Kiểm thử V1.15.3 — Subtle Calendar Hours

- `npm test`: PASS toàn bộ bộ logic/API hiện có (bao gồm OT, calendar drafts/swap và user viewer).
- Visual QA Chromium: PASS 24 tổ hợp PC 1440×1100, mobile 390×844, landscape 844×390 × light/dark × thường/fullscreen × lịch 08:00–18:00/lịch mở rộng 07:00–19:00. Lấy mẫu màu thực để đối chiếu hai ca không tô, nghỉ trưa tô đủ đến 13:30, vùng sau 17:30 và trước 08:00 cùng sắc xám; chênh nền tối đa 20/255 mỗi kênh để tránh tương phản quá đậm. Đã xem ảnh và kiểm tra lớp nền không che hit target cột lịch.
- `tests/browser/calendar-interactions.cjs`: PC PASS toàn bộ create/drag/draft/confirm/save/discard. Mobile chạy tới phần short-tap mở chi tiết sau nhiều thao tác thì timeout; không ghi nhận PASS toàn bộ mobile interaction suite. Không thay source tương tác/handler trong bản này.
- Byte comparison khi đóng gói: handler/API/lib, calendar-interactions và calendar-viewer giữ nguyên; app.js chỉ đổi version và khai báo mốc phút cho CSS. Cache/CSS/reference/version/syntax và ZIP CRC được kiểm tra.
- Không kiểm chứng iPhone/Safari vật lý hoặc Jira công ty; ảnh và pixel samples là Chromium giả lập. Không đổi quy tắc OT hoặc chặn thêm khung giờ.

# Kiểm thử V1.15.2 — Clock & Green Check Identity

- `npm test`: PASS toàn bộ bộ logic/API hiện có, bao gồm WorklogPRO/OT, log đơn/Bulk, calendar edits/drafts/swap, user viewer và personnel suggestions.
- `QJL_CHROMIUM_PATH=... npm run test:branding`: PASS UI 1440×1000, 390×844, 315×683, landscape 844×390; light/dark, ảnh decode đủ kích thước, dialog không tràn, autofocus nút đóng, copy link canonical không query/hash, clipboard-denied fallback, đóng nút/Escape và giữ localStorage.
- Service worker thật trên localhost: từ worker/cache V1.15.1 giả lập → waiting V1.15.2 → nút Cập nhật → activation/reload, xóa cache shell cũ, giữ dữ liệu localStorage. Icon và branding helper fetch được offline sau upgrade. Đây là cập nhật web shell, không kiểm thử đổi icon native iOS.
- `tests/browser/layout.cjs`: PASS 7 viewport (1920, 1440, 1024, 900, 844, 390, 315); toolbar/calendar/sticky/layout/loading/errors/partial giữ đúng.
- PNG kiểm tra dimensions, nền opaque, đủ màu navy/trắng/cyan/green; legacy aliases bằng byte với phiên bản mới. Đối chiếu source handler/lib/calendar tương tác giữ nguyên; app.js chỉ đổi version và option cache khi đăng ký worker. ZIP CRC kiểm tra khi đóng gói.
- Không có iPhone/Safari vật lý hoặc phiên Jira công ty. Không xác nhận icon đã cài trên iPhone tự cập nhật; nếu icon cũ còn, dùng hướng dẫn thêm mới và kiểm tra trước khi xóa bản cũ.

# Kiểm thử V1.15.1 — Calendar Bounds & Personnel Suggestions

- `npm test`: PASS toàn bộ logic/API cũ và mới. Bounds unit: 4 mép, góc chéo, negative Safari offsets, fractional values, không chặn delta trong vùng hợp lệ.
- API suggestions fixture: picker thiếu key, key alias bằng username, trường username, nested users, fallback từ picker 404/empty/malformed sang user/search, canonical lookup, trùng user, inactive, 401/403/unresolved. Mọi request vẫn dùng caller auth và chỉ GET.
- `tests/browser/calendar-refinements.cjs`: PASS 1440×1000, touch CDP 390×844, 320×683, ngang 844×390. Edge/diagonal/toolbar touch và wheel bị chặn đúng; native touch pan ngang vẫn hoạt động, không có khoảng trống ở gốc lưới; chạy thường/fullscreen/lịch người khác.
- Tự gợi ý bằng typing không Enter; composition tiếng Việt; stale response, lỗi quyền, ArrowDown/Enter, ẩn recent khi nhập và visual viewport giảm khi bàn phím mở: PASS.
- Hồi quy: calendar-viewer (MRU/read-only/reset), live-swap-preview, calendar-interactions và layout. Ghi nhận PASS các bộ liên quan; không chạy toàn bộ chuỗi test:ui.
- Source handler ghi Jira/Bulk/correction/day-audit/history và calendar-interactions giữ nguyên so với ZIP V1.15.0. Node syntax/version/cache và ZIP CRC được kiểm tra khi đóng gói.
- Chromium không mô phỏng đầy đủ rubber-band native của Safari. Đã kiểm tra CSS overscroll none, edge guards, unit negative offsets và touch thực qua CDP; chưa kiểm chứng iPhone/Safari vật lý hoặc Jira công ty. Không khẳng định quyền Browse Users của tài khoản thực tế.

# Kiểm thử V1.15.0 — Fullscreen User Calendars

- `npm test`: PASS toàn bộ logic/API cũ và API calendar viewer mới.
- API mới: caller auth giữ nguyên, user picker không nhận HTML/email, lọc stable author (kể cả trùng displayName/đổi username), timestamp Việt Nam, phân trang, OT/unknown, GET fallback khi POST search bị chặn, 401/403/405, từ chối sửa/xóa worklog người khác.
- `tests/browser/calendar-viewer.cjs`: PC 1440×1100; touch CDP 390×1000, 320×900, ngang 844×440. Chọn user chỉ ở fullscreen, không autofocus input khi mở, chi tiết chỉ đọc tuần/tháng, không drag/long-press/new-log của người khác, không API ghi.
- Kiểm tra MRU tối đa 3, đưa người chọn lại lên đầu, còn sau reload, tách theo tài khoản; dữ liệu đến chậm không đè user mới. Người bị từ chối không vào MRU; không hiện lịch cũ sau lỗi quyền.
- Kiểm tra bản nháp cá nhân không tự mất khi mở bộ chọn; thoát fullscreen/mở lại lịch reset về Tôi; giá trị form logwork cá nhân giữ nguyên.
- Hồi quy PASS: calendar-interactions (log từ lịch, lưu nháp/xác nhận/rollback), live-swap-preview, workflow (logwork/sửa/xóa/progress), summary và responsive layout.
- Chỉ thay các điểm tích hợp đọc lịch và guard tương tác. Source các handler ghi Jira/Bulk/correction/history/day-audit và thư viện cũ được so byte với ZIP đầu vào khi đóng gói.
- Chưa có phiên Jira/WorklogPRO công ty hoặc iPhone/Safari vật lý. Dữ liệu phụ thuộc quyền caller/API plugin và giới hạn tìm kiếm của Jira. Không khẳng định đọc được toàn bộ worklog bị ẩn trên Jira.
- Không chạy lại toàn bộ `npm run test:ui`; bộ đầy đủ vẫn có trong source. Các bộ ảnh hưởng trực tiếp nêu trên đã chạy.

# Kiểm thử V1.14.5 — Navigation Icons & Calendar Hint

- `npm test`: PASS toàn bộ logic/API hiện có.
- `tests/browser/layout.cjs`: PASS các màn hình PC/mobile hiện có.
- Rà giao diện bằng Chromium ở 1440×1000, 390×844, 315×683, ngang 844×390: 4 icon PC/mobile đều dùng SVG; chú thích ngắn, không tràn và nằm ngay trên lịch ở chế độ thường/fullscreen.
- Kiểm tra tuần → tháng → tuần → danh sách: chú thích chỉ hiện ở tuần. Dark mode/fullscreen không che chú thích.
- Không thay backend, lưu Jira hay logic kéo thả. Node syntax app.js và ZIP CRC/version được kiểm tra khi đóng gói.
- Chưa kiểm chứng trên iPhone/Safari vật lý. Các kiểm tra UI bản trước vẫn có trong source; không chạy lại toàn bộ test:ui cho thay đổi icon/chú thích này.

# Kiểm thử V1.14.4 — Live Swap Preview

- `npm test`: PASS toàn bộ logic/API hiện có; backend không đổi.
- `tests/browser/live-swap-preview.cjs`: PASS PC 1440×1100 và touch CDP 390×1000, 320×900. Kiểm tra B bay khi đang giữ, giữ logical hit region, đảo chiều liên tiếp từ frame hiện tại (sai số dưới 4px), B quay về/C bay đi đồng thời, thả ô trống chỉ draft A.
- Thả giữa flight tiếp nhận frame hiện tại, không replay từ ô B; chỉ lúc thả mới có hai draft và icon lưu. Bấm icon vẫn cần xác nhận; không có request ghi Jira trong hover/return/cancel.
- Escape/touchCancel, render lại, resize, fullscreen và Reduce Motion: PASS; không để lại clone hay block ẩn. Nhãn giờ clone theo ô preview; màu OT được giữ.
- Hồi quy PASS: `calendar-swap.cjs` (PC, mobile 390/320, ngang 844×440), `swap-motion.cjs`, `calendar-interactions.cjs`, `layout.cjs`, `motion-lock.cjs`. Swap server/403/rollback/unknown-result dùng fixtures như trước.
- Node syntax, version và ZIP CRC kiểm tra khi đóng gói. Không chạy lại toàn bộ chuỗi `npm run test:ui`; đã chạy các bộ UI liên quan nêu trên.
- Chưa kiểm chứng Jira thật, iPhone/Safari vật lý hoặc đo FPS trên thiết bị. Chuyển động dùng WAAPI/transform, không render lại lưới trong từng frame kéo.

# Kiểm thử V1.14.3 — Swap motion

- `npm test`: PASS toàn bộ logic/API, gồm geometry motion mới; không thay backend.
- `tests/browser/swap-motion.cjs`: PASS ở 1440×1100, 390×1000 và 320×900. Kiểm tra frame đầu/giữa/cuối, đường cong không thẳng đứng, điểm hạ khớp DOM thật trong sai số 2px.
- Kiểm tra clone giữ màu OT và góc xoay nhãn OT gốc, đường bay khác nhau giữa các swap, hạ xong dọn layer và opacity; không có request ghi Jira khi chạy animation.
- Kéo liên tiếp, Escape, resize, render lại, đóng lịch, dark theme/fullscreen và Reduce Motion: không để lại clone hoặc block ẩn.
- Hồi quy: Calendar Swap PC/touch, Calendar Interactions, responsive layout và motion/scroll lock; ghi nhận kết quả chạy trong bản phát hành này.
- Không chạy lại toàn bộ chuỗi `npm run test:ui` ở bản này: thay đổi chỉ phía hiển thị, đã chạy các bộ UI bị ảnh hưởng nêu trên. Bộ đầy đủ vẫn có trong source.
- Node syntax checks PASS. Chưa đo FPS trên iPhone/Safari vật lý hoặc kiểm chứng Jira thật; chuyển động dùng Web Animations/transform trên clone để giảm công việc layout mỗi frame.

# Kiểm thử V1.14.2 — Highlight & Swap

## Logic và API mới

- `npm test`: PASS toàn bộ logic/API, gồm calendar-drafts, calendar-edit và calendar-swap.
- Drop planner: swap snap đến giờ bắt đầu block đích, hai thời lượng khác nhau, giữ chính xác giây; chặn block thứ ba, nhiều block cùng vùng thả và giờ nghỉ.
- Server swap thật qua HTTP fixture: đổi khác issue/ngày, kiểm tra author/stale/window/final overlap, không ghi trước validation, không có trùng thời gian ngay cả ở bước trung gian.
- API xác minh đủ vị trí cuối, giữ description/native OT/seconds; replay cùng mã hoặc trạng thái đã đúng không ghi lại.
- Lỗi bước giữa: phục hồi gốc; mất response sau commit bước trung gian: GET xác định rồi phục hồi, không replay mù; lỗi phục hồi: RESULT_UNKNOWN và vị trí thật đọc được.
- Không có khoảng trống trung gian trong ngày liên quan: từ chối trước ghi. Có kiểm thử vòng ba worklog và giữ giây lẻ.
- Native WorklogPRO fallback (core 403): cả ba bước swap qua native form, giữ OT và thuộc tính tùy chỉnh, duration 3661 giây.
- API mới chỉ nhận POST đã đăng nhập, same-origin, request ID hợp lệ và 2–12 ID duy nhất. Không tạo/xóa worklog.

## Giao diện

- `npm run test:ui`: PASS toàn bộ UI regression và Calendar Swap mới.

- `calendar-swap.cjs`: highlight một vùng trống / hai vùng swap, màu lỗi khi block thứ ba cản; Escape dọn vùng highlight và không mở form nhầm.
- Touch thực qua CDP ở 390×1000, 320×900, ngang 844×440 fullscreen; PC 1440×1100. Có cuộn trong khi giữ/kéo trên màn hình ngang.
- Kéo chưa gọi API; xác nhận mới gửi batch swap, hủy giữ bản nháp, thành công toast/icon ẩn; lỗi server giữ hai draft.
- Rà ảnh nội bộ: viền/nhãn giờ nằm đúng lưới, tooltip tránh vùng đích và không tràn viewport.
- Hồi quy luồng tạo từ khoảng trống, kéo bình thường, lưu tạm/xác nhận, sửa/xóa, native OT, Bulk, thống kê, fullscreen, palette và remembered login.
- Jira/WorklogPRO giả lập; chưa đăng nhập Jira thật hoặc kiểm tra iPhone/Safari vật lý. Phục hồi nhóm là best effort, không phải transaction Jira; function bị ngắt cứng có thể để lại vị trí trung gian cần kiểm tra.

# Kiểm thử V1.14.1

## V1.14.1 — Lưu tạm và xác nhận lưu lịch

- `npm test`: PASS toàn bộ logic/API; thêm `calendar-drafts-tests.js` kiểm tra projection không sửa bản gốc, giữ giây/OT/mô tả, thứ tự giải phóng ô, trùng và vòng hoán đổi.
- `npm run test:ui`: PASS toàn bộ UI regression hiện có và Calendar Interactions. Giữ log đơn/Bulk, native OT, sửa/xóa, fullscreen, Tổng hợp, remembered login.
- Luồng mới: icon lưu mặc định ẩn; kéo chỉ đổi preview, không PATCH; bấm icon và Quay lại không ghi; xác nhận mới PATCH. Đưa về gốc tự bỏ draft, lưu xong toast/icon ẩn.
- Mobile CDP touch thực: hold/rung/drag; chạm ngoài thoát edit nhưng giữ draft; short tap và scroll trước hold hoạt động như cũ.
- Refresh/fullscreen giữ preview; icon nằm gọn trên PC 1440×1100 và touch mobile 390×1000, 320×900. Dialog review dùng native top layer; nút ở mobile hẹp không tràn/chéo.
- Server 403 giữ draft; đóng lịch có lựa chọn; bỏ thay đổi trả về dữ liệu thật. Mất phản hồi sau commit được GET đối chiếu trước retry, không PATCH lặp khi vị trí đã đúng.
- Nhiều block: giải phóng ô gốc trước khi đưa block khác vào, lỗi thứ hai giữ chỉ draft còn lại; retry không ghi lại lịch thành công. Remote timestamp thay đổi được bắt trước PATCH.
- Build không cần thiết với app HTML/Node hiện tại; Node syntax checks PASS. Không đổi cấu hình hoặc dependency runtime.
- Jira/WorklogPRO giả lập; chưa xác minh tài khoản Jira thật hoặc iPhone/Safari vật lý. Bản nháp chỉ trong phiên, không bảo đảm tồn tại qua kill/reload/đăng xuất.

# Kiểm thử V1.14.0

## V1.14.0 — Luồng tạo và kéo thả từ lịch

- `npm test`: **PASS** toàn bộ logic/API và các hồi quy trước, thêm `tests/calendar-edit-tests.js`.
- `npm run test:ui`: **PASS** toàn bộ UI regression, gồm luồng Tổng hợp và Calendar Interactions mới.
- Tạo tại 15:00, đọc lại đúng started/duration; idempotency tạo; trùng không auto-shift; giờ nghỉ/lunch crossing/giờ sai không ghi; OT native; readback mismatch hoàn tác worklog mới.
- Move-only: 15:00 → 08:00, đổi ngày, giữ 3661 giây và mô tả/marker, không thay OT/custom attribute; từ chối stale expected-start/seconds, người khác, trùng/ngoài khung.
- Native WorklogPRO fallback khi core 403; giữ thuộc tính; response mất sau commit không retry ghi. Fixture mới hỗ trợ số phút lẻ để kiểm tra giữ giây.
- `tests/browser/calendar-interactions.cjs`: picker → form cũ → payload startTime → lịch; input nằm trong khung và không autofocus bàn phím. Desktop 1440×1100; touch mobile 390×1000, 320×900 qua CDP touchStart/move/end.
- Kiểm tra kéo 15:00–16:00 sang 08:00–09:00, đổi ngày PC, mobile hold/jiggle/drag/thoát, chạm nhanh mở chi tiết, cuộn trước long-press không bật edit; trùng/403 không đổi block lạc quan.
- Dùng ảnh UI nội bộ để rà form, nút đóng/nút lưu và feedback không làm xê dịch lưới.
- Chưa đăng nhập Jira thật hoặc kiểm tra Safari/iPhone vật lý. Cần đối chiếu một worklog thử nghiệm được phép sửa sau deploy.

## Bản vá tỷ trọng dự án V1.13.2

- `npm test`: PASS toàn bộ logic/API, gồm Sub-task Type native custom field và Overtime.
- `tests/browser/summary.cjs`: kiểm tra nhãn % tổng giờ và độ dài thanh dùng tổng giờ theo bộ lọc; tổng thời lượng bên phải còn đủ.
- Ví dụ ảnh người dùng: 31h30 + 8h30 = 40h; nhãn 78,75% và 21,25%; chiều dài thanh tương ứng.
- Fixture có regular và OT: 40h/42h → 95,24%, 2h/42h → 4,76%; lọc một dự án → 100%.
- UI PASS ở 1440×1000, 1024×700, 390×844, 320×683, 844×390; light/dark; giữ drill-down, sửa/xóa, kỳ và bộ lọc.
- Không thay đổi API ghi Jira; chưa kiểm tra trên Jira thật trong phiên này.

## Hồi quy bản vá Sub-task Type

- Nguyên nhân V1.13.0: nhầm `issuetype` với custom field “Sub-task Type”. Fixture cũ cũng dùng Issue Type khác nhau, nên chưa phát hiện khác biệt này.
- Fixture mới giữ **một Issue Type Sub-task** cho tất cả issue, đặt giá trị custom field riêng: Testing/Supporting/Developing.
- Hai worklog Testing tổng 2h, một worklog Developing 6h: phân nhóm/tỷ trọng phải theo giờ, không theo số task.
- `subtask-type-tests.js`: discovery GET chỉ đọc; đúng tên/custom ID, khoảng trắng/gạch ngang, thiếu/trùng field, 403/401, cấu hình đúng/sai, cache theo user, option/null/field missing/sai cấu trúc. Không fallback Issue Type.
- `summary-tests.js`: handler thật nhận field list và issue custom field, yêu cầu field trong search metadata, nhóm hai giá trị dù issuetype giống nhau. Discovery 403 phải giữ tổng giờ và nhóm Chưa xác định.
- `browser/summary.cjs`: Supporting/Testing khác nhau, nhãn/tỷ trọng theo giờ, field bị chặn hiển thị thông báo + Chưa xác định; null hiển thị Chưa phân loại; drill-down/sửa/xóa vẫn hoạt động.
- `npm test`: PASS toàn bộ logic/API bao gồm bản vá.
- Chạy lại UI Tổng hợp ở 1440×1000, 1024×700, 390×844, 320×683, 844×390; **PASS** cả light/dark và các ca null/không đọc được field.
- Chưa đăng nhập Jira thật; cần đối chiếu field ID và một tuần thực tế sau deploy.

## Môi trường và kết quả

- Node.js 24.19.0; Chromium headless, Playwright. Jira/WorklogPRO được giả lập qua API và form fixture; không dùng tài khoản/ghi dữ liệu Jira thật.
- `npm test`: PASS toàn bộ logic/API, gồm bộ mới `tests/summary-tests.js` và hồi quy native form V1.12.1.
- V1.13.0: `npm run test:ui` đã PASS toàn bộ bộ giao diện, gồm lịch, correction, duration, workflow, mobile calendar, fullscreen, motion/scroll lock, màu dự án, parity, input bounds, lưu đăng nhập, OT native, tạo OT và màn hình Tổng hợp.
- V1.13.1: `tests/browser/summary.cjs` PASS 5 kích thước ở cả light/dark; `tests/browser/native-overtime.cjs` PASS PC/mobile. Rà ảnh xác nhận biểu đồ hiện Supporting/Testing thay vì Sub-task.
- Chưa xác minh trên Jira/Vercel thật hoặc Safari/iPhone vật lý.

## Phạm vi kiểm thử mới

### Logic và API

- Cộng giây của worklog trong kỳ; khử trùng; lọc author và ngày Việt Nam; không dùng tổng timespent của task.
- Tách regular/OT/unknown theo checkbox đã xác nhận; marker mô tả không quyết định OT; giá trị chưa biết không biến thành false.
- Phân bổ theo project và custom field Sub-task Type của sub-task; task thường/thiếu metadata có nhóm riêng; tổng các nhóm bằng tổng giờ.
- Bộ lọc dự án; mục tiêu kỳ cá nhân T2–T6; ngày tương lai không bị nhắc thiếu, cuối tuần và giờ thường dư không bù ngày khác.
- Biên tuần/tháng/năm, tháng nhuận 29 ngày, chia khoảng không bỏ sót ngày.
- Jira giảm page size từ 1000 xuống 1: vẫn đọc đủ worklog; metadata nhiều trang cũng được đọc tiếp.
- Summary trên 500 task; giới hạn discovery được báo rõ; lỗi WorklogPRO 403 để trạng thái chưa xác nhận.

### Giao diện Tổng hợp

`tests/browser/summary.cjs` chạy ở 1440×1000, 1024×700, 390×844, 320×683, 844×390:

- Hai theme; kiểm tra control nằm trong khung, không tràn ngang; KPI, project và Sub-task Type.
- Drill-down theo loại → mở editor; focus nút đóng thay vì textbox; background inert khi editor mở.
- Lưu chỉnh sửa rồi tổng được đọc lại; xóa rồi nhóm biến mất/tổng giảm; cache mất hiệu lực sau mutation.
- Lọc dự án không đổi mục tiêu cá nhân; OT chưa biết, lỗi API, dữ liệu một phần và retry.
- Chuyển tuần/tháng, đủ ngày 31, lùi tháng, chuyển kỳ nhanh không để phản hồi cũ ghi đè.

## Cách chạy

```sh
npm test
```

Bộ UI cần công cụ phát triển Playwright/Chromium, không phải dependency deploy:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:ui
```

Có thể dùng Chromium đã có qua `QJL_CHROMIUM_PATH=/absolute/path/to/chromium`. Đặt `QJL_QA_OUTPUT=/absolute/path` nếu cần ảnh kiểm thử nội bộ. Source ZIP không chứa browser binary/node_modules hoặc dữ liệu tài khoản.

## Đối chiếu sau deploy

1. Badge/footer/PWA là V1.13.2; nút Kiểm tra được thay bằng Tổng hợp.
2. Chọn tuần có cả giờ thường và OT, so sánh tổng và phân bổ với Jira. Chọn tháng 31 ngày.
3. Chọn nhiều task đều Type: Sub-task nhưng có Sub-task Type khác nhau như Testing, Supporting, Developing. Biểu đồ phải tách đúng các giá trị riêng và cộng thời lượng worklog trong kỳ, không gộp Sub-task/không đếm task.
4. Bấm nhóm, mở worklog để sửa thời lượng/ngày hoặc OT, kiểm tra tổng được cập nhật. Kiểm tra xóa trên một worklog thử nghiệm được phép xóa.
5. Với quyền/plugin thiếu, phải thấy tạm tính/chưa xác nhận, không được xuất hiện thành 0h OT đã xác nhận.
6. Xác nhận các guard, log đơn/Bulk và checkbox Over Time? native vẫn hoạt động như V1.12.1.

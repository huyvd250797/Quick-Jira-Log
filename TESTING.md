# Kiểm thử V1.21.0 — Chi tiết công việc

- `npm test`: PASS toàn bộ bộ logic/API kế thừa và test chi tiết mới, trên Node.js 24; dữ liệu Jira giả lập.
- `tests/jira-detail-tests.js`: PASS HTTP router/session/quyền, key/offset, whitelist dữ liệu riêng tư, phân trang subtask 25+5, GET fallback, đúng parent, worklog từng giây/0/null, Jira bỏ qua phân trang 25+25+10 không sót/lặp, lỗi 401/403/404/502 và đọc lại quyền trước từng trang. Không có thao tác ghi Jira ngoài POST search chỉ đọc.
- Bộ trên kiểm tra Jira wiki/ADF, bảng/code/link, escape HTML, chặn javascript/data/URL chứa credential, giới hạn nội dung 200.000 ký tự.
- Kiểm tra cú pháp 129 tệp JS/CJS, 46 tham chiếu asset HTML và 336 ID không trùng: PASS.
- `tests/browser/jira-detail.cjs`: đã viết cho 1440×900, 390×844, 320×683, 844×390: tab lazy, Tải thêm, cha/con/Quay lại, lỗi/thử lại từng phần, nội dung an toàn, giữ kết quả tra cứu, shortcut logwork không ghi và kích thước khung. **Chưa chạy được**: môi trường thiếu executable Chromium khi gọi `npm run test:detail-ui`. Không đánh dấu UI đã PASS.
- Fixture UI tra cứu cũ đã cập nhật theo API chi tiết mới. Chưa xác minh Jira công ty, Safari/iPhone vật lý, GitHub hoặc Vercel.

Checklist sau deploy: phiên bản V1.21.0; mô tả trống/dài/wiki/ADF; bảng/code không tràn viền; công việc cha/subtask nhiều trang; worklog >25 bản ghi và thời lượng có giây; người log khác nhau; lỗi quyền từng tab và retry; logout/đổi tài khoản; đóng giữ vị trí; PC/mobile portrait/landscape/light/dark; shortcut Logwork mở form đúng subtask rồi xác nhận theo luồng cũ; hồi quy lịch, kéo thả, lưu nháp, OT và tổng hợp.

# Lịch sử kiểm thử V1.20.0 — Tra cứu Jira

- `tests/jira-search-tests.js`: chạy qua HTTP router với Jira giả lập; query theo mã/cụm từ, escape đầu vào, mọi bộ lọc, phân trang, POST-search/GET fallback, metadata chung/theo dự án, metadata lỗi một phần, 400/401/403/502, no-store, chỉ đọc, không lộ email/mô tả hoặc diagnostic thô. Đã đạt.
- `npm test`: toàn bộ bộ hồi quy nền tảng và API kế thừa, bao gồm test tra cứu mới, đã đạt. Kiểm tra cú pháp 124 tệp JS/CJS và 44 tham chiếu HTML cũng đạt.
- `npm run test:search-ui`: fixture Playwright 1440×900, 390×844, 320×683, 844×390; thẻ, tải thêm, ký tự HTML trong summary, xem nhanh, lọc nhân sự, recents và tách tài khoản, lỗi quyền, kích thước dialog, không focus input khi mở. Đã bổ sung; chưa chạy được trong phiên này vì môi trường không có Chromium.
- Chưa có xác minh trên Jira công ty, Safari/iPhone vật lý, GitHub hoặc Vercel. Không có thao tác ghi lên Jira thật trong phiên phát triển.

Checklist sau deploy: phiên bản V1.20.0; mở từ PC/mobile; tìm mã Story/Task/Bug/Sub-task có quyền; tìm cụm từ; thử bộ lọc riêng/kết hợp; người phụ trách Tôi/khác/chưa được giao; tải thêm trên >25 kết quả; đọc lại mục vừa xem; đăng xuất/đăng nhập tài khoản khác; storage bị chặn; empty/error/retry; light/dark, bàn phím và màn hình ngang; logwork/lịch/OT cũ.

# Lịch sử kiểm thử V1.19.2 — Draft Split Regroup

- `npm test`: PASS toàn bộ logic/API kế thừa và `tests/calendar-regroup-tests.js`.
- `calendar-regroup-tests.js`: kéo từ phần đầu/cuối, tổng giây/mô tả/OT giữ nguyên, phân biệt nhóm với worklog cùng issue, đích trống/không đủ chỗ, tách lại/4 phần/đồng ý >2; đối tác xếp vào đúng các khoảng nguồn, không tự chia đối tác; về gốc và stale/unknown/conflict guard; preview không đổi map nháp.
- `tests/browser/calendar-regroup.cjs`: PASS Chromium PC 1440×1100, touch 390×1000, 320×900 reduced motion, ngang 844×390, zoom thời gian 150%. Mouse/CDP touch thật, nhấn giữ; kéo phần 2/1/4, một ghost tổng 2h30, các phần nguồn ẩn/mờ và highlight đúng; Escape/touchcancel/thả không đủ chỗ giữ nguyên nháp. Swap hai đối tác bay vào đúng hai khoảng nguồn thực và staging 3 dòng, chưa gửi API ghi.
- Bộ trên kiểm tra merge → lưu chỉ PATCH ID gốc với tổng giờ; kéo về vị trí Jira thật xóa nháp không ghi; re-split sang ngày khác 4 phần → hủy giữ nguyên/đồng ý tạo nháp mới; gom lại lần nữa vẫn giữ snapshot gốc; lưu split giữ đủ tổng giây và phần đã lưu không còn group metadata. Worklog khác cùng issue giữ nguyên.
- Mobile group blocks khai báo touch ownership từ trước touchstart; drag không bị browser hủy khi kéo chéo/ngang. Test tạo chuyển động đầu trước khi cuộn khung để đến vùng đích, tránh mô phỏng nhảy cuộn trong khi browser chưa nhận drag.
- Hồi quy `calendar-fit.cjs`: PASS 4 viewport; multi-swap, split, popup >2 và lost-response verify-only không tạo trùng. Fixture chờ cả busy chung sau save trước khi thay dữ liệu mock/tạo thao tác kế tiếp.
- Hồi quy `live-swap-preview.cjs`: PASS PC/390/320; bay cong, reverse, giữ/release/cancel/reduced motion. `calendar-resize.cjs`: PASS 4 viewport. `calendar-experience.cjs`: PASS 4 viewport giữ vị trí/partial save/unknown/rollback.
- `loading-lock.cjs`: PASS PC/touch/ngang, concurrent request, native modal/fullscreen, HTTP/mạng/JSON lỗi, NDJSON tới final và cleanup.
- `calendar-performance.cjs`: PASS 400 worklog, idle grid vẫn 0 blocking listener, 0 dimension read cho 60 scroll event, 1 apply/1 storage write cho burst 100 zoom input.
- `branding.cjs`: kiểm tra cache/SW upgrade V1.19.2, icon offline và giữ storage.
- Đã kiểm tra syntax, asset references, handler/API giữ nguyên byte và ZIP CRC; ảnh QA không đóng vào source ZIP. Chưa kết nối Jira công ty hoặc kiểm chứng iPhone/Safari vật lý; không chạy toàn bộ chuỗi UI không liên quan.

# Kiểm thử V1.19.1 — Loading Interaction Lock

- `npm test`: PASS toàn bộ logic/API kế thừa; backend không thay đổi.
- `tests/browser/loading-lock.cjs`: PC 1440×1000, touch 390×844 và ngang 844×390. Giữ response bằng gate để kiểm tra khóa trước/trong khi loading; chuột/tap thật, click tổng hợp, Escape/Tab/Ctrl+K/Ctrl+Enter, wheel không tác động nền/không phát sinh request mới.
- Bộ trên kiểm tra 2 request đồng thời, một request xong vẫn khóa; release gọi lặp không làm âm bộ đếm; native dialog mở khi busy vẫn nằm dưới blocker; fullscreen; summary hoàn tất mở khóa; HTTP 503/thử lại, JSON sai và mất mạng đều cleanup; dedup GET không nhân khóa; stream NDJSON thật giữ khóa tới final result; popup progress không có thêm card loading thứ hai.
- `tests/browser/loading-feedback.cjs`: PASS 3 viewport trên, light/dark, card/spinner căn giữa, backdrop tối, native task picker, lỗi/thử lại, fullscreen, không autofocus input, reduced motion. Đã thay kỳ vọng cũ “đóng khi đang tải” bằng “khóa tới khi hoàn tất”. Chờ card xuất hiện và kết thúc animation trước đo vị trí.
- `tests/browser/calendar-experience.cjs`: PASS 4 viewport PC/390/320/ngang; refresh/focal, partial-save, unknown/retry/rollback và report không bị hồi quy.
- `tests/browser/calendar-fit.cjs`: PASS 4 viewport; giữ multi-swap, bay đi/quay về, tách >2 phần, hủy/xác nhận/lưu và đối chiếu sau mất phản hồi.
- `tests/browser/calendar-performance.cjs`: PASS fixture 400 worklog; khi rảnh vẫn 0 blocking listener trên đường cuộn, 0 lần đọc kích thước cho 60 scroll event, 1 apply và 1 storage write cho burst 100 zoom input.
- `tests/browser/workflow.cjs`: PASS desktop/iPhone giả lập, sửa/xóa, log đơn/hàng loạt với NDJSON streaming thật qua localhost và mất phản hồi. Click block 30 phút được đặt vào vùng nội dung, tránh tay nắm resize.
- `tests/browser/branding.cjs`: kiểm tra upgrade service worker V1.19.1, cache/icon và giữ storage.
- Syntax toàn bộ JS/CJS, asset references và ZIP CRC kiểm tra trước bàn giao. QA log/ảnh nằm ngoài ZIP. Chưa kiểm chứng Safari/iPhone vật lý hoặc Jira công ty; không chạy lại toàn bộ chuỗi UI không liên quan.

# Kiểm thử V1.19.0 — Multi-Swap & Smart Split

- `npm test`: PASS toàn bộ bộ logic/API kế thừa và các bộ mới bên dưới.
- `tests/calendar-fit-tests.js`: 2h đổi với 90m + 30m, đóng gói đúng thứ tự, vùng nguồn/đích không vừa thì chặn; giữ giây, mô tả/OT; tách 11:00 thành 2 phần; chia 4 phần khi có lịch chen; xác nhận >2, không đủ chỗ, không spill ngày/OT; projection nháp/unknown không nhân đôi phần thật.
- `tests/calendar-swap-tests.js`: bổ sung API thực với 3 worklog từ 2h ↔ 90m+30m; kiểm chứng cả các bước tạm không trùng nhau. Giữ các ca mất phản hồi, stale, quyền, rollback, không phục hồi đủ và không có chỗ tạm.
- `tests/calendar-split-tests.js`: fixture nghiệp vụ cho create/native/update/recovery: giữ tổng giây, native OT + thuộc tính, ID gốc, xác nhận >2; replay cùng ID và đọc final state; mất phản hồi tạo mới không POST lần hai; lỗi create/native/phần thứ hai; rollback thành công và rollback lỗi; quyền/tài khoản cũ, visibility, stale, giờ trùng, tổng sai, same-origin.
- `tests/calendar-split-integration-tests.js`: router + Jira HTTP mock + correction thật + native form thật: shrink gốc → POST tạo phần mới → POST form sao chép OT/thuộc tính → đọc lại; thêm core PUT 403 chuyển native form cho cả OT bật/tắt; verify-only không ghi. Không kết nối Jira công ty.
- `tests/native-form-tests.js`: giữ hồi quy token/cookies/GET !update → POST đúng form một lần; thêm sao chép thuộc tính qua control thật, không có control thì chặn trước POST.
- `tests/browser/calendar-fit.cjs`: PASS Chromium PC 1440×1100, touch 390×1000, 320×900, landscape 844×390. Mouse/CDP touch thật: 2 đối tác bay khi giữ, bay về khi kéo đi, 3 highlight, chưa thả không có nháp/ghi; nhả staging, save xác nhận; 4 phần highlight, popup hủy/tiếp tục, review đúng giờ, giữ tổng giờ. Mất phản hồi sau commit giữ unknown, hiện đúng 6 bản ghi thay vì thêm 3 ghost trùng, kiểm tra lại chỉ đọc và không tạo thêm worklog. Dialog nằm trong khung sau animation.
- Hồi quy UI đã chạy: `live-swap-preview.cjs` (PC + 390 + 320), `calendar-resize.cjs` (4 viewport), `calendar-zoom.cjs` (4), `calendar-experience.cjs` (4), `calendar-performance.cjs` (fixture 400 worklog). Giữ refresh/focal, partial-save/unknown, readonly, thu phóng/kéo cạnh, và không thêm vòng RAF khi đứng yên.
- `branding.cjs`: PASS icon/help/responsive và SW upgrade thật trên localhost lên cache V1.19.0, storage giữ nguyên, icon offline.
- Đã kiểm tra syntax toàn bộ JS/CJS, asset references và ZIP CRC; đã xem ảnh review PC/mobile. QA log/ảnh không đóng vào ZIP source.
- Chưa kiểm chứng iPhone/Safari vật lý hoặc quyền/plugin trên Jira công ty. Mocks không bảo đảm API/version/cấu hình của Jira thực tế giống fixture. Không chạy lại toàn bộ chuỗi `test:ui` không liên quan.

# Kiểm thử V1.18.0 — Smooth Calendar & Save Results

- `npm test`: PASS logic/API hiện có và `tests/calendar-experience-tests.js`. Math kiểm tra focal theo ngày/phút khi origin đổi, phân biệt saved/failed/conflict/unknown/rolledback/waiting và tổng kết chính xác.
- `tests/browser/calendar-performance.cjs`: fixture 400 worklog, Chromium touch 390×844; baseline V1.17.0 so với current: blocking touch/wheel listener trên đường cuộn **7→0**, đọc kích thước khung từ 60 scroll event **240→0**, geometry apply cho burst 100 input **100→1**, lưu tùy chọn cùng burst **100→1**. Có pan chéo thật bằng CDP, bounds, zero Jira writes và stationary drag không còn RAF loop. Có thể chạy so sánh bằng `QJL_BASELINE_ROOT`; không cần baseline để chạy các assert của bản hiện tại.
- `tests/browser/calendar-experience.cjs`: PASS 1440×1000, 390×844, 320×683 reduced motion, 844×390. Retain node lúc refresh; dữ liệu không đổi tái sử dụng grid; snapshot ngày/phút khi thêm OT 06:00; lỗi tải/retry không reset tâm.
- Save report cùng bộ trên: nhóm 3 dòng có dòng 1 saved, dòng 2 403, dòng 3 chưa gửi; đóng/mở giữ kết quả; explicit retry không PATCH lại dòng đã saved. Lost response sau commit giữ unknown; đọc đối chiếu lỗi vẫn unknown, đọc thành công xóa nháp mà không ghi lặp. Cyclic swap rollback hiện restored, retry xác nhận lại; remote conflict chặn trước ghi, discard xóa report. Có bounds và ảnh light/dark.
- `tests/browser/calendar-zoom.cjs`: PASS 4 viewport, nút/slider/reset/limits, focus/Escape/backdrop, profile/persistence, native fullscreen và fallback, rotation/drafts, create/move/resize thực và readonly. Fixture chờ frame geometry hoàn tất trước so kích thước vì input nay được gộp theo RAF.
- `tests/browser/calendar-interactions.cjs`: PASS PC/touch 390/320, tạo từ lịch, long press/exit, nháp, xác nhận/cancel/discard, partial-save retry, conflict, server failure và unknown reconciliation.
- `tests/browser/live-swap-preview.cjs`: PASS PC/touch 390/320, curved hover/reversal/B→C, hit test, adoption/release, cleanup/reduced motion và zero write khi preview.
- `tests/browser/calendar-resize.cjs`: PASS 4 viewport; actual pointer/touch resize, min/lunch/conflict/cancel, review/save/retry/lost response, move composition, fullscreen và OT extend qua 18:00, thu về gốc, native OT giữ nguyên, readonly không handle. Auto-scroll có delay ý định ở mép để không cuộn ngoài mong muốn khi kéo tay nắm đi qua.
- `tests/browser/calendar-refinements.cjs`: PASS 4 viewport ở cả native path và fallback mô phỏng bằng `QJL_LEGACY_SCROLL=1`; bounds/toolbar, native interior pan, fullscreen/readonly, personnel suggestions/IME/stale/error. Synthetic native path không preventDefault; containment được kiểm thêm bằng touch thật. Fallback không thay thế kiểm chứng Safari cũ thật.
- `tests/browser/motion-lock.cjs`: PASS 5 cấu hình gồm reduced motion, background scroll lock/giữ tọa độ, mở/đóng/reversal, week-only grid. Guard correction chỉ gắn khi sheet mở; backdrop không điều khiển listener của grid phía sau.
- `tests/browser/fullscreen-layout.cjs`: PASS 8 viewport 315–1440px, safe area giả lập, icon/header bounds, drafts/readonly và không đổi orientation.
- `tests/browser/loading-feedback.cjs`: PASS PC/mobile/landscape, light/dark, loading giữa màn hình/nền tối, close/reopen/error/fullscreen/native picker/focus, chỉ một tiến trình. Chờ animation kết thúc trước đo opacity để tránh lấy frame đang fade.
- `tests/browser/calendar-viewer.cjs`: PASS 4 viewport, fullscreen-only personnel, readonly, MRU 3, stale/403/draft guard và form cá nhân không đổi. `tests/browser/read-freshness.cjs`: PASS revision/user isolation, phản hồi cũ không thay cache mới.
- `tests/browser/workflow.cjs`: PASS desktop/iPhone giả lập, sửa/xóa, log đơn/hàng loạt với NDJSON streaming thật qua localhost và mất phản hồi. Click block 30 phút được đặt vào vùng nội dung, tránh tay nắm resize.
- `tests/browser/branding.cjs`: PASS 4 viewport và SW upgrade thật trên localhost, cache V1.18.0, localStorage giữ nguyên, icon offline. CSS và thư viện experience có trong precache, không đổi logo.
- So byte backend V1.17.0, syntax toàn bộ JS/CJS, version/asset references và ZIP CRC kiểm tra lúc đóng gói. Không chạy toàn bộ chuỗi `test:ui`; các bộ liên quan nêu trên đã chạy. Đã xem ảnh review PC/mobile light/dark; chưa kiểm chứng iPhone/Safari vật lý hoặc Jira công ty, không cam kết FPS/tăng tốc toàn hệ thống.

# Kiểm thử V1.17.0 — Calendar Zoom Controls

- `npm test`: PASS toàn bộ bộ logic/API kế thừa và `tests/calendar-zoom-tests.js`. Zoom math kiểm tra đầu vào hỏng, giới hạn/bước, hai trục độc lập, fullscreen/fit baseline, focal anchor và clamp ở biên/đổi viewport.
- `tests/browser/calendar-zoom.cjs`: PASS PC 1440×1000, touch 390×844, 320×683 và landscape 844×390. Nút −/+, slider bàn phím/pointer, 75/100/150/175/200%, reset từng trục/cả hai, đúng kích thước phút/cột, giữ tâm khi không bị giới hạn biên và giữ nháp nguyên vẹn. Chờ khung hình hoàn tất trước đo geometry để không so với layout của frame trước.
- Zoom không phát sinh request dữ liệu/ghi Jira. Reload lưu đúng profile PC/mobile, profile còn lại giữ mặc định; fullscreen/xoay dọc/ngang giữ tỷ lệ và draft. Tháng ẩn zoom. Tạo ô trống 10:30 và kéo block 08:00 → 09:00, resize đến 10:30 ở 150% bằng mouse/touch thật; trước xác nhận không ghi, sau xác nhận payload và readback giữ 09:00 + 5400 giây.
- Dialog: focus vào nút đóng, không autofocus textbox; Escape chỉ đóng zoom, backdrop không xuyên thành tạo worklog. Kiểm tra native document fullscreen thật trên Chromium PC, fallback mobile, bounds khi xoay máy, light/dark, reduced motion 320px. Lịch người khác zoom được, vẫn không có resize handle hoặc request ghi.
- `tests/browser/fullscreen-layout.cjs`: PASS 315/390/430/568/667/844/1024/1440px, icon mới không chồng nút/ra ngoài khung, lịch cá nhân/nháp/readonly, safe-area giả lập, không gọi orientation lock/unlock, diện tích grid và xoay máy.
- `tests/browser/calendar-interactions.cjs`: PASS PC và 2 viewport touch; click-to-log, staged move, hold/exit, confirm/cancel/discard, overlap, server refusal/unknown-result reconciliation.
- `tests/browser/calendar-resize.cjs`: PASS 1440×1000, 390×844, 320×683, 844×390; resize min/overlap/cancel, giữ draft, xác nhận, retry/lost response, move composition, fullscreen, OT kéo qua 18:00 tới 19:00, trả về gốc và readonly. Fixture chờ layout ổn định trước đo tay nắm và thả ngay sau mốc auto-scroll; tránh để các lượt xác nhận qua giao thức browser làm cuộn thêm trước khi thả.
- `tests/browser/live-swap-preview.cjs`: PASS PC/touch 390/320, hover flight, stable hit test, reversal/B→C, draft sau thả, cancel/reduced/cleanup và không ghi Jira.
- `tests/browser/calendar-viewer.cjs`: PASS PC/touch/landscape, fullscreen-only picker, readonly, MRU 3, stale/403, draft guard, reset và luồng form cá nhân.
- `tests/browser/workflow.cjs`: PASS desktop/iPhone giả lập, sửa/xóa, log đơn/hàng loạt với NDJSON streaming thật qua localhost và mất phản hồi. Click block 30 phút được đặt vào vùng nội dung, tránh tay nắm resize.
- `tests/browser/branding.cjs`: PASS 4 viewport, cập nhật service worker thật trên localhost tới V1.17.0, giữ localStorage và icon offline. Ba tài nguyên zoom mới có trong precache; giữ tên icon V1.15.2.
- Đã xem ảnh PC/mobile light/dark. Backend từ ZIP V1.16.0 được so byte, không đổi handler/API/Jira adapter; chỉ thêm thư viện math UI. Kiểm tra syntax, asset references, version và ZIP CRC khi đóng gói.
- Không chạy toàn bộ chuỗi `test:ui`; các bộ ảnh hưởng trực tiếp nêu trên đã chạy. Chưa kiểm chứng Safari/iPhone vật lý hoặc Jira công ty. Trình duyệt quyết định khả năng native fullscreen/ẩn thanh trình duyệt; local fullscreen vẫn hoạt động.

# Kiểm thử V1.16.0 — Resize Worklogs on Calendar

- `npm test`: PASS toàn bộ logic/API và bộ `tests/calendar-resize-tests.js`. Hồi quy log đơn/Bulk, native OT, form WorklogPRO, guard, history/summary, calendar edits/swaps và user viewer đều giữ trong script kiểm thử.
- Resize planner: mở rộng/thu ngắn, min 30 phút, giờ nghỉ/cuối tuần/tối, xung đột không swap, preview bất biến, target duration khi tiếp tục move/swap, thứ tự giải phóng chỗ trước mở rộng và cycle parking.
- API correction: kiểm tra auth/origin/tác giả, snapshot expectedStarted/expectedSeconds, số giây đích hợp lệ, trạng thái server thay đổi, trùng/lunch/weekend, preserve comment/OT, adjustEstimate=leave, native-form fallback chỉ sau core 403, readback mismatch và mất phản hồi không retry ghi.
- Cycle API: nhóm vừa swap vừa đổi thời lượng, readback, replay ở request mới nhận đúng đích gồm thời lượng; lỗi bước cuối và mất phản hồi sau commit phục hồi cả thời lượng lẫn vị trí, không transient overlap trong fixture. Giờ bắt đầu có giây lẻ được từ chối resize thay vì làm tròn.
- `tests/browser/calendar-resize.cjs`: PASS desktop 1440×1000, touch 390×844, 320×683 và landscape 844×390. Mouse/touch kéo thật, highlight/tooltip, giữ dữ liệu server trước xác nhận, về thời lượng gốc xóa nháp, overlap/min/lunch giữ nháp cũ, Escape/pointercancel/đổi viewport hủy gesture, review/hủy/lưu, 403/retry, mất response được đối chiếu không PATCH lặp, resize rồi move, fullscreen và read-only không có handle.
- Bộ browser resize còn kiểm tra kéo dài OT 17:30 qua 18:00 tới 19:00 bằng auto-scroll, thu lại/xóa nháp, cleanup lưới tạm, giữ màu/cờ OT sau lưu; thay đổi Jira bên ngoài ngăn PATCH trước ghi. Có light/dark và reduced motion (320px). Đã xem ảnh PC và mobile preview.
- `tests/browser/calendar-interactions.cjs`: PASS PC 1440×1100 và touch 390×1000, 320×900; tạo log, draft/confirm/cancel/save/discard, lỗi/unknown/reconciliation, nhấn giữ và cập nhật vị trí thật giữ nguyên.
- `tests/browser/calendar-swap.cjs`: PASS PC, mobile 390/320 và landscape 844; highlight, swap, OT, batch save, xung đột và giữ nháp khi lỗi. `tests/browser/live-swap-preview.cjs`: PASS PC/mobile 390/320; bay ngay khi hover, đảo chiều liên tục, commit/cancel/reduced motion và cleanup. Khi render lại, active gesture được hủy để RAF không dựng lại clone trên DOM mới.
- `tests/browser/fullscreen-layout.cjs`: PASS 8 viewport 315–1440px, giữ hướng, controls/options/save/readonly trong khung, safe area và bản nháp qua xoay màn hình. `tests/browser/calendar-viewer.cjs`: PASS 4 viewport, picker fullscreen-only, chỉ xem mouse/touch, MRU/reset/stale/auth và bảo vệ nháp/form cá nhân.
- `tests/browser/workflow.cjs`: PASS desktop/iPhone giả lập, sửa/xóa, log đơn/hàng loạt với NDJSON streaming thật qua localhost và mất phản hồi. Click block 30 phút được đặt vào vùng nội dung, tránh tay nắm resize.
- `tests/browser/branding.cjs`: PASS 4 viewport và worker upgrade/cache migration/localStorage/offline; CSS resize mới nằm trong precache V1.16.0.
- Đối chiếu source: handler log đơn/Bulk, thư viện Jira/WorklogPRO/native-form/guard/scheduler và các tối ưu đọc dữ liệu giữ nguyên; mở rộng correction/calendar-moves và calendar-drafts để lưu duration. Không thêm dependency runtime. Kiểm tra Node syntax, asset references, version và ZIP CRC khi đóng gói.
- Không chạy toàn bộ chuỗi `test:ui`; các bộ liên quan nêu trên đã chạy. Chưa có phiên Jira công ty hoặc iPhone/Safari vật lý; fixture/Chromium touch không chứng minh toàn bộ hành vi thiết bị thật.

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
- `tests/browser/workflow.cjs`: PASS desktop/iPhone giả lập, sửa/xóa, log đơn/hàng loạt với NDJSON streaming thật qua localhost và mất phản hồi. Click block 30 phút được đặt vào vùng nội dung, tránh tay nắm resize.
- `tests/browser/branding.cjs`: PASS 4 viewport và cập nhật service worker thật trên localhost tới cache V1.15.6, giữ localStorage, icon offline. CSS fullscreen mới nằm trong precache.
- Đã xem ảnh PC/mobile dọc/ngang. Node syntax, version, asset references, backend byte comparison và ZIP CRC kiểm tra khi đóng gói. Không chạy toàn bộ chuỗi `test:ui`; các bộ liên quan nêu trên đã chạy. Chưa kiểm chứng Safari/iPhone vật lý hoặc Jira công ty; native fullscreen/ẩn thanh trình duyệt phụ thuộc trình duyệt.

# Kiểm thử V1.15.5 — Dimmed Loading & Fresh Jira Reads

- `npm test`: PASS toàn bộ logic/API hiện có và `tests/read-scope-tests.js`. Giữ kiểm tra log đơn/Bulk, OT native form/readback, chống trùng, calendar save/swap/rollback và quyền lịch người khác.
- Read scope: 8 lượt GET đồng thời chỉ gọi Jira một lần, dữ liệu consumer độc lập; đọc kế tiếp gọi mới. Tách API request/auth/headers/timeout, lỗi không giữ lại, hai ghi giống nhau vẫn là hai ghi, readback tách lượt đọc đang chờ trước ghi.
- Handler API thật với Jira fixture: 500 task/5 trang, POST search bị từ chối, GET được phép: 1 POST + 5 GET thay vì 5 POST + 5 GET. API request kế tiếp tự xác định lại và nhận dữ liệu mới. Kiểm tra GET ưu tiên lỗi thì fallback POST, 401 không fallback.
- `tests/browser/read-freshness.cjs`: PASS phản hồi lịch cũ về sau phản hồi mới không ghi đè cache; day audit tương tự; phản hồi của tài khoản trước không lấp cache tài khoản mới. Revision tạo request riêng sau invalidate, không tăng TTL.
- `tests/browser/loading-feedback.cjs`: PASS 1440×1000, 390×844, 844×390; light/dark, nền phủ alpha 0.3–0.55 trong khi card/foreground opacity 1, ở giữa viewport, spinner/cỡ chữ, đóng/mở/error/retry/fullscreen/native picker/focus/reduced motion và một tiến trình log. Đã xem ảnh PC dark/mobile light.
- `tests/browser/workflow.cjs`: PASS desktop và iPhone giả lập: dashboard, tuần/tháng, block, sửa/xóa, streaming progress và interrupted response.
- `tests/browser/workflow.cjs`: PASS desktop/iPhone giả lập, sửa/xóa, log đơn/hàng loạt với NDJSON streaming thật qua localhost và mất phản hồi. Click block 30 phút được đặt vào vùng nội dung, tránh tay nắm resize.
- `tests/browser/branding.cjs`: PASS 4 viewport và service worker upgrade thật trên localhost; nhận cache V1.15.5, giữ localStorage, icon offline. Logo V1.15.2 giữ nguyên.
- So source đầu vào: không đổi các handler nghiệp vụ; chỉ thêm API read scope, Jira read wrapper/search-method hint, native-form read barrier, frontend revision và backdrop/version/docs/tests. Node syntax, precache assets, version và ZIP CRC kiểm tra khi đóng gói.
- Không chạy toàn bộ chuỗi `test:ui`; các bộ ảnh hưởng trực tiếp nêu trên đã chạy. Dữ liệu giả lập không thay cho kiểm chứng Jira công ty hoặc iPhone/Safari vật lý. Không cam kết phần trăm giảm thời gian logwork thực tế; quyền, tải Jira/WorklogPRO và đường truyền vẫn ảnh hưởng.

# Kiểm thử V1.15.4 — Centered Loading & Faster Jira Reads

- `npm test`: PASS bộ logic/API trước đó. `tests/performance-tests.js`: PASS pool guard tối đa 12 không kẹt task chậm; 24 issue đọc đủ; metadata tối đa 3 batch, đủ 350 key/phân trang 20 item dù yêu cầu 100, đúng thứ tự/dedup/401; handler log đơn và Bulk discovery chồng thời gian metadata, không đọc worklog hoặc ghi trước validation, project sai không ghi.
- Benchmark nội bộ so cùng source V1.15.3, 3 lần/fixture: guard 100ms → 56ms (24 issue/lần, tổng 72 reads cả trước/sau), metadata 84ms → 42ms (400 issue/lần, tổng 12 reads cả trước/sau). Đây là độ trễ mô phỏng của hai bước, không phải benchmark production hay end-to-end logwork.
- `tests/browser/loading-feedback.cjs`: PASS 1440×1000, 390×844, landscape 844×390; light/dark, vị trí giữa viewport, font ≥18px, spinner, đóng/mở lại khi đang tải, error/retry, fullscreen host, picker dialog native, không focus input, tổng hợp, giảm chuyển động và chỉ một progress khi log. Đã xem ảnh QA.
- `tests/browser/workflow.cjs`: PASS PC và iPhone giả lập: dashboard, tuần/tháng, block theo thời lượng, sửa/xóa và streaming/interrupted response.
- `tests/browser/workflow.cjs`: PASS desktop/iPhone giả lập, sửa/xóa, log đơn/hàng loạt với NDJSON streaming thật qua localhost và mất phản hồi. Click block 30 phút được đặt vào vùng nội dung, tránh tay nắm resize.
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
# V1.19.4

- Bố cục mới giới hạn ở `min-width:900px`, calendar view và chưa fullscreen. Kiểm tra PC 1920×1080, 1440×900, 1280×720, 1024×768 và 900×650: toolbar không đè nút; kiểm tra thêm khi hiện icon Lưu, xem tháng và bật T7/CN.
- Kiểm tra chuyển qua danh sách/fullscreen rồi trở lại; ngày, chế độ và thao tác kéo/zoom giữ nguyên.
- Kiểm tra light/dark và mobile 390px để đảm bảo bố cục cũ không bị ghi đè.
- Kết quả phiên này: bộ test nền tảng `tests/run-tests.js`, logic thu phóng, đặt thẻ thông tin và cú pháp JavaScript đạt. Kiểm thử trình duyệt chưa chạy được do môi trường thiếu Chromium; các kích thước ở trên là checklist cần xác nhận trên trình duyệt thực tế.

# V1.19.3

- `node tests/calendar-info-tests.js`: hướng lên/xuống/giữa, nhiều highlight tách/swap, khung nhỏ và không còn chỗ. Mọi thẻ được hiển thị phải nằm trong khung và không giao vùng xem trước.
- `node tests/browser/calendar-regroup.cjs`: thao tác chuột/cảm ứng và kiểm tra thẻ thực tế không che preview hoặc tràn khung trên 4 kích thước.
- Kết quả phiên này: `npm test`, test bố trí thẻ và kiểm tra cú pháp đạt. Chưa chạy lại test trình duyệt do môi trường chưa có Chromium; không khẳng định đã kiểm thử iPhone thật. Backend/handlers giữ nguyên byte so với V1.19.2.


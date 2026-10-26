# V1.36.0 — Kiểm tra

- `npm test`: 50 bộ, bổ sung kiểm tra whitelist/giới hạn/tách tài khoản dữ liệu ghim, trạng thái khôi phục; mở rộng API tree kiểm tra status, currentUser, unassigned, username có dấu nháy, đầu vào sai và giữ quan hệ Epic xuyên Project.
- Browser working-tree-quick: 1440/390/320/844px; ghim/bỏ ghim từ danh sách/chi tiết, reload khôi phục 2 trang và vị trí cuộn ở danh sách Project/Epic, chọn Status/Assignee cá nhân, xóa lọc, từ chối quyền khi mở ghim, đổi tài khoản và lỗi quota localStorage. Kiểm tra không tràn ngang, không lỗi JS.
- Browser Working Tree cũ: 4 viewport, tìm gần đúng, mở chi tiết/tạo Subtask và lỗi quyền.
- Hồi quy Epic create/recents, detail polish và PWA live-update theo log kiểm tra của phiên xây dựng.
- Cú pháp JS/CJS, JSON, ID HTML, shell assets và ZIP kiểm tra trước bàn giao.
- Jira được mô phỏng; chưa truy cập Jira công ty hoặc iPhone/Safari thật. Không tuyên bố mọi môi trường đều đã kiểm thử.

---

# V1.35.8 — Kiểm tra

- npm test: 49 bộ nghiệp vụ/API; thêm image-original-tests kiểm tra scoped image chunks, Content-Range/độ dài, lỗi không hỗ trợ Range, ID/phần ảnh không hợp lệ và proxy priority icon. Jira detail tests xác nhận Reporter, Created, priority ID và không lộ email.
- Browser detail-polish: PC1440, mobile390/320; 8 nhãn đúng thứ tự, Reporter/Created, hai icon Type/Priority; ghép 2 phần ảnh 4 MB, giải mã ảnh 2048px, zoom tăng kích thước, thu hồi nguồn ảnh khi đóng; không lỗi console.
- Browser Jira detail và detail-fixes: 4 viewport, đọc mô tả/ảnh, phân trang Subtask/Worklog, trạng thái, tạo Subtask và quyền API mô phỏng.
- Browser epic-create-recents: 4 viewport sáng/tối, tìm kiếm, tạo Story đúng Epic và dấu + 20px.
- Browser live-update: service worker đổi phiên bản; syntax/JSON/ZIP được kiểm tra.
- API Jira được mô phỏng, chưa thử Jira công ty hoặc iPhone/Safari vật lý. Bộ browser jira-editor-images cũ gọi nút + chung đã bỏ từ V1.35.6; đã đổi fixture mở form qua API client để kiểm tra luồng editor hiện có.

---

# V1.35.7 — Kiểm tra giao diện

- Browser epic-create-recents: PC 1440px, mobile 390/320px và ngang 844px; theme sáng/tối. So sánh computed background của các nút tìm công việc, Working Tree, Epic, filter, người phụ trách với nút Logwork: cùng màu xanh; chữ trắng. Nút + cùng hàng, sau Tìm, không tràn, vùng bấm >=44px và SVG 28px. Tạo Story trong Epic vẫn gửi đúng Epic đích.
- Browser Working Tree và Jira filters: 4 viewport, tải/tìm/lọc/mở công việc và tạo Subtask theo quyền mô phỏng đạt.
- Browser live-update: cập nhật service worker và tải bản mới đạt.
- Các bộ run-tests, jira-create-ui-tests và jira-filter-tests đạt; cú pháp các JS thay đổi, JSON, ID HTML duy nhất và ZIP kiểm tra được. Không chạy lại toàn bộ 48 bộ nghiệp vụ vì đây là chỉnh giao diện; kết quả V1.35.6 phía dưới thuộc lần trước.
- Không gọi Jira công ty hoặc thiết bị iPhone/Safari vật lý. Chưa push/deploy.

---

# V1.35.6 — Kiểm tra

- `npm test`: 48 bộ nghiệp vụ/API đạt. Mở rộng kiểm tra Epic Link thực tế trong payload/readback; từ chối khác dự án, không phải Epic, tạo Subtask từ luồng Epic, thiếu/quyền chỉ đọc Epic Link, sửa Epic Link trái ngữ cảnh; replay không tạo trùng. Thêm kiểm tra truy vấn bổ sung loại cho tối đa 10 mục vừa xem, chặn mã không hợp lệ.
- `npm run test:batch-save-ui`: NDJSON chạy từ HTTP server với nhiều mốc tiến trình; ngày/tuần thành công, lỗi xác định, gián đoạn chưa rõ kết quả. Kiểm tra %, thanh tiến trình, gộp 2 Subtask cùng ngày thành 1 POST; thành công không còn draft/nút lưu/cảnh báo khi đóng; lỗi giữ nháp/khóa tránh log trùng.
- `npm run test:epic-create-ui`: 1440/390/320/844px, metadata vừa xem cũ được bổ sung trong một truy vấn, tải lại giữ icon Story/Bug, bỏ nút + chung, mở Epic và tạo Story với project/Epic cố định, xem lại Epic đích, payload không dùng parent Subtask. Nút tìm xanh/chữ trắng, giao diện không tràn.
- Browser hồi quy: Working Tree, Jira create, issue-icons, batch-review, batch-day-review (mỗi bộ 4 viewport); desktop-workspace 5 viewport; live-update service worker native đạt.
- Tinh chỉnh tối thiểu chiều cao thẻ PC 202→200px để vẫn đủ 6 thẻ ở 1366×768 khi phần cảnh báo vượt 8h ngày làm việc xuất hiện. Mobile không đổi.
- Kiểm tra cú pháp JS/CJS, JSON, asset shell, ID HTML và ZIP.
- API Jira được mô phỏng. Chưa gọi Jira công ty hoặc xác minh trên iPhone/Safari vật lý. Không đưa ra cam kết thời gian: gộp theo ngày giảm số request/đối chiếu; Jira và mạng vẫn quyết định độ trễ thực tế.

---

# V1.35.5 — Lưới Subtask đồng đều, tối đa 6 thẻ

## Thay đổi
Áp dụng riêng cho Log tất cả trên PC, từ source V1.35.4.
- Các thẻ trong lưới có cùng chiều rộng và chiều cao ở chế độ đang chọn, không phụ thuộc tên hoặc mô tả dài/ngắn. Nơi nhập giờ/OT và nút thao tác được căn đồng nhất.
- Tên Subtask tối đa 2 dòng, dài hơn rút gọn bằng “…”. Rê chuột vào tên để xem nội dung đầy đủ qua tooltip. Không cắt dữ liệu Summary hoặc Description khi gửi Jira.
- Màn hình từ 1280px có ít nhất 3 Subtask: 3 cột, tối đa 2 hàng đầy đủ trong khung nhìn. Bỏ chế độ 4 cột của bản trước. PC hẹp hơn dùng 2 cột, tối đa 3 hàng nếu đủ chiều cao. Màn hình thấp có thể hiển thị ít hơn để giữ vùng nhập và nút thao tác không tràn.
- Chiều cao thẻ/vùng lưới tự tính theo viewport, header, footer và chế độ Phân bổ tự động. Quá 6 Subtask tiếp tục cuộn danh sách để xem.
- Khi mở Sửa mô tả, phần nhập cuộn trong thẻ cố định; không kéo dài một thẻ làm lệch các thẻ khác. Vẫn sửa và gửi đầy đủ nội dung được nhập.
- Không đổi giao diện mobile hoặc luồng phân bổ, xem trước, xác nhận và ghi Jira.

## Kỹ thuật
- desktop-workspace.css: quy tắc thẻ đồng đều, rút gọn tiêu đề và vùng cuộn nội bộ riêng PC.
- bulk-desktop-grid.js: quan sát danh sách/header/footer, đổi chế độ và resize để tính số hàng phù hợp; giới hạn tối đa sáu thẻ đầy đủ trong khung. Không gọi API, không đổi draft logwork.
- PWA shell bổ sung module mới; version V1.35.5.

## Kiểm tra
- npm test: 48 bộ kiểm tra nghiệp vụ/API qua.
- npm run test:desktop-ui: các độ rộng PC 1920/1366/1024, tên ngắn xen tên dài; thẻ cùng kích thước, không quá 6 thẻ đầy đủ; 1920/1366 hiển thị đủ 6 với fixture nhiều mục. Mở mô tả và nhập nội dung không đổi chiều cao thẻ. Danh sách 40 mục cuộn nội bộ, footer trong khung.
- Mobile 390/320: bật/tắt stylesheet PC không thay đổi hình học popup.
- Browser batch-review: xem trước/chỉnh sửa/xác nhận với API mô phỏng ở 4 viewport. Browser live-update: cập nhật PWA.
- Chưa kiểm thử trực tiếp Jira công ty hoặc thiết bị iPhone/Safari thật.

## Triển khai
Không thêm database, biến môi trường hoặc dependency runtime. Deploy theo README và bấm Cập nhật khi PWA báo V1.35.5. Chưa push/deploy trong lần bàn giao. Có thể deploy lại V1.35.4 để quay lại.

## Đề xuất kế tiếp — chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story và lọc nhanh khi Boss yêu cầu.


---

# V1.35.4 — Mở rộng lưới Log tất cả trên PC

## Thay đổi
Chỉ điều chỉnh giao diện Log tất cả ở desktop (từ 900px), trên source V1.35.3 Boss cung cấp.
- Popup có từ 3 Subtask trên màn hình >=1280px mở rộng đến 1760px hoặc chiều rộng màn hình trừ 48px; từ 3 cột, thay vì hai thẻ rất rộng.
- Màn hình >=1800px và có ít nhất 4 Subtask: 4 cột; dưới 1280px vẫn hai cột dễ nhập.
- Tận dụng tối đa 94% chiều cao viewport khi cần. Ít Subtask vẫn co theo nội dung, tránh vùng trống cao không cần thiết.
- Giảm padding/khoảng cách thẻ, làm gọn nút bỏ dòng, nhãn TimeSpent, các nút giờ nhanh và phần sửa mô tả. Giữ vùng nhập giờ và toggle OT đủ lớn để thao tác.
- Header/footer gọn hơn, vùng ngày/tuần và nút xác nhận luôn trong khung; chỉ danh sách dài cuộn bên trong.
- Không thay đổi mobile, Working Tree, form Jira, API hoặc thuật toán log/phân bổ.

## Kiểm tra
- npm test: 48 bộ test nghiệp vụ/API qua.
- npm run test:desktop-ui: 1920×1080, 1366×768, 1024×768. Kiểm tra 3 thẻ nhập giờ thấy đủ ở màn hình >=1280px; 8 thẻ nhập giờ trong hai hàng không cuộn ở 1920×1080 với dữ liệu mô phỏng; 40 thẻ cuộn nội bộ, footer không tràn. Nội dung mô tả dài hoặc mở chi tiết có thể cần cuộn.
- Mobile 390×844 và 320×683: bật/tắt stylesheet desktop không thay đổi kích thước popup.
- Browser batch-review: kéo, sửa thời lượng, xác nhận và ghi dữ liệu kế hoạch mô phỏng; 4 viewport. Browser live-update: cập nhật PWA.
- Xem ảnh kiểm tra chế độ sáng/tối nội bộ; chưa kiểm tra trực tiếp Jira công ty hoặc Safari/iPhone thật.

## Nâng cấp
Không thêm biến môi trường, database hoặc dependency runtime. Deploy source theo README, bấm Cập nhật khi app thông báo V1.35.4. Chưa push/deploy trong lần bàn giao này. Có thể deploy lại V1.35.3 để quay lại.

## Kế tiếp — đề xuất, chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story và lọc nhanh khi Boss yêu cầu.


---

# V1.35.3 — Chuẩn hóa giao diện PC

## Nội dung
- Log tất cả: giới hạn chiều rộng 1120px, bỏ chiều cao cố định gần hết màn hình. Popup ngắn khi ít Subtask; danh sách dài cuộn trong vùng giới hạn, nút Hủy/Xem trước không giãn hết chiều ngang.
- Header Log tất cả: tiêu đề và số Subtask chung một dòng; chế độ/phân bổ tự động bên trái, ngày/tuần bên phải; progress giờ nhập thủ công dùng hàng riêng đủ rộng. Giữ hai cột thẻ Subtask và khoảng cách dễ đọc.
- Công việc Jira: workspace tối đa 1220px, nhóm thao tác có chiều rộng phù hợp PC, vùng tìm Working Tree trên một hàng; kết quả Epic hai cột.
- Popup Epic: co theo nội dung, tối đa 1060px, danh sách Story/Task/Bug hai cột với vùng cuộn riêng.
- Chi tiết công việc: khung tối đa 1080px, tab có độ rộng vừa nội dung; thông tin ba cột, Subtask hai cột, mô tả có giới hạn độ rộng đọc, footer gọn.
- Tạo/sửa: form tối đa 1000px, các trường ngắn chia hai cột; Summary và Description toàn hàng; editor và nội dung có vùng cuộn giới hạn. So sánh trước/sau hai cột, nút xác nhận vừa nội dung.
- Cập nhật nhanh/xác nhận: popup gọn theo nội dung. Thống kê dự án: thanh điều kiện linh hoạt, danh sách thành viên hai cột trên PC.

## Cách triển khai
Thay đổi giao diện nằm riêng trong desktop-workspace.css, toàn bộ áp dụng từ 900px trở lên. Không chỉnh CSS mobile, API, thuật toán phân bổ hoặc thao tác ghi Jira. Thêm stylesheet vào PWA shell và nâng version V1.35.3. Không thêm database, biến môi trường hoặc dependency runtime.

Deploy source theo README hiện có, sau đó bấm Cập nhật khi PWA thông báo. Có thể deploy lại source V1.35.2 để quay lại. Chưa push GitHub hoặc deploy trong lần bàn giao này.

## Kiểm tra
- npm test: 48 bộ kiểm tra nghiệp vụ/API.
- npm run test:desktop-ui: desktop 1920×1080, 1366×768, 1024×768; hai Subtask không tạo vùng trống toàn màn hình, 40 Subtask cuộn nội bộ, footer không tràn. Mobile 390×844 và 320×683 so sánh kích thước khi bật/tắt stylesheet desktop: không đổi.
- Browser Working Tree, tạo công việc, sửa Story/Task/Bug, Filter Jira, xem trước và log batch, thống kê dự án, cập nhật PWA.
- Kiểm tra ảnh PC mô phỏng; API test giả lập. Chưa kiểm thử trực tiếp Jira công ty hoặc Safari/iPhone vật lý.

## Đề xuất tiếp theo — chưa xây dựng
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story, lọc trạng thái/người phụ trách khi Boss chọn nâng cấp.


---

# V1.35.2 — Đồng nhất icon trong danh sách công việc

## Phạm vi
- Dùng chung icon cho Working Tree/danh sách trong Epic, kết quả tìm kiếm và Filter Jira, Subtask trong chi tiết, công việc cha gợi ý khi tạo Subtask, mục vừa xem.
- Bổ sung icon vào danh sách Subtask chờ log, Log tất cả, lịch sử worklog, danh sách công việc trong lịch dạng agenda, chi tiết Tổng hợp giờ và danh sách công việc theo thành viên trong Thống kê dự án.
- Không thêm icon loại công việc vào danh sách nhân sự, dự án, tệp đính kèm hoặc biểu đồ phân loại Sub-task Type (đây là các loại dữ liệu khác). Không thay đổi block của lưới lịch tuần.

## Cách hoạt động
- Thành phần jira-issue-icons.js/.css duy nhất thay cho renderer riêng của Working Tree. Tất cả dùng cùng kích thước, vị trí và bộ icon dự phòng.
- Ưu tiên icon từ Jira theo issueTypeId qua API đã bảo vệ; icon dùng chung được tải một lần mỗi loại trong phiên tài khoản, tối đa 4 yêu cầu đồng thời. Lỗi đọc icon không chặn danh sách.
- Cache và metadata của mục vừa xem chỉ giữ trong RAM, xóa khi đổi tài khoản. Không thêm dữ liệu đăng nhập vào localStorage.
- Nếu bản ghi cũ thiếu loại công việc, hiển thị icon trung tính “Chưa rõ loại công việc”, không đoán Story/Task. Mục vừa xem có thể dùng loại đã đọc trong cùng phiên; sau mở lại app có thể trung tính đến khi đọc lại chi tiết.
- API Subtask, lịch user khác và thống kê trả thêm tên/ID loại từ metadata sẵn có. Không đọc từng issue chỉ để lấy icon, không đổi cách tính giờ, OT hoặc số Subtask.
- SVG và nguồn ảnh tiếp tục dùng kiểm tra an toàn của V1.35.1.

## Kiểm tra
- npm test: 48 bộ kiểm tra nghiệp vụ/API hiện có.
- npm run test:icons-ui: icon đúng loại, dữ liệu thiếu dùng trung tính, nhãn an toàn, dùng chung cache, tối đa 4 lượt đọc, đổi tài khoản không dùng lại cache; bốn viewport 1440×900, 390×844, 320×683, 844×390.
- Browser hồi quy Working Tree, tìm kiếm, Filter Jira, tạo công việc, batch-review và cập nhật PWA.
- API giả lập cho QA; chưa kiểm thử trực tiếp Jira công ty và Safari/iPhone vật lý.

## Triển khai
Không thêm database/biến môi trường/dependency runtime. Deploy source theo README hiện có, cập nhật PWA lên V1.35.2. Có thể deploy lại V1.35.1 nếu muốn quay lại.

## Đề xuất tiếp theo (chưa xây dựng)
V1.36.0 — Working Tree: Truy cập nhanh. Ghim Epic/Story và lọc trạng thái/người phụ trách, chỉ triển khai khi Boss yêu cầu.


---

# V1.35.1
48 bộ test API/nghiệp vụ và QA trình duyệt: xem RELEASE_V1.35.1.md.

# Kiểm tra V1.35.0
Xem RELEASE_V1.35.0.md. Chạy npm test, npm run test:tree-ui và các browser suite Jira/search/create/filters, batch-review, live-update. QA cần Playwright và Chromium riêng; không đưa browser/runtime QA vào source ZIP.

# Kiểm thử V1.34.7

- `npm test`: toàn bộ package unit/API hồi quy đạt. Range audit test bổ sung kiểm tra NDJSON chunk đầu chứa progress trước khi worklog đọc xong, nhiều mức % đơn điệu,100% sau thành công và403 không100%; giữ7→1 shared read, fresh request/guard/tác giả/ngày/quyền.
- `test:batch-ui`: allocation/review/day-review/onboarding4 viewport1440×900,390×844,320×683,844×390. Client nhận progress stream fixture, ghi nhận ít nhất7 mức % tăng tới100%, guard lịch cũ/màu45% ở light/dark và hồi quy kéo/resize/lưu/partial/hướng dẫn.
- `test:update-live`: native Chromium Service Worker phát hiện/update/guard mutation đạt.
- Syntax/JSON/HTML IDs/assets/version/ZIP kiểm tra trước bàn giao. Ảnh QA nội bộ.

Chưa thử mạng Jira/hosting công ty hoặc Safari/iPhone thật; chưa push/deploy. % theo khối lượng xử lý, không phải dự báo thời gian. Proxy đệm response có thể làm chậm nhận tiến độ; không chạy toàn bộ browser lịch sử ngoài các suite trên.

---

## Phiên bản trước

# Kiểm thử V1.34.6

- `npm test`: toàn bộ package unit/API hồi quy, bao gồm swap lịch thật và chặn nháp đè lịch cũ. Thêm `range-audit-tests.js`: router/session,7 ngày cùng issue chỉ1 GET worklog, lọc đúng ngày/tác giả, request tiếp theo và day-audit force đọc mới,401/403 và ngày/giới hạn/duplicate đầu vào.
- `test:batch-ui`:4 suite allocation/review/day-review/onboarding ở1440×900,390×844,320×683,844×390; auto/manual, split/resize/swap, overlap/partial/fresh conflict, POST đúng ngày. Onboarding dùng API range fixture; kiểm tra modal bay từ i, X thu về nhưng không ghi checkbox, Done thu về/ghi theo tài khoản, reduced-motion, storage failure, lớp đen55% chỉ block cũ ở light/dark.
- `test:update-live`: Service Worker thực trong Chromium, cài đầu không báo nhầm, phát hiện foreground và click update, không reload giữa mutation.
- Syntax JS/CJS, JSON/manifest, HTML IDs/assets/version và ZIP kiểm tra trước bàn giao. Screenshot QA chỉ nội bộ.

Chưa đo thời gian Jira/mạng thực, chưa có Safari/iPhone vật lý, chưa push/deploy. Giảm7→1 là số đọc worklog của fixture chung issue, không phải cam kết app nhanh gấp7. Không chạy toàn bộ browser lịch sử ngoài các suite trên.

---

## Phiên bản trước

# Kiểm thử V1.34.5

- `npm test`: toàn bộ unit/API package đạt, gồm cơ chế swap lịch thật, multiple swap, split/resize, preview pending overlap và cấm nháp đè lịch đã log; không đổi API/allocator trong bản này.
- `test:batch-ui`: batch-calendar/review/day-review/onboarding trên1440×900,390×844,320×683,844×390. Kiểm tra phân bổ ngày/tuần, kéo/resize, xác nhận, overlap/partial và lưu đúng ngày đích.
- Hướng dẫn: theo ngày/tuần, auto/manual/ví dụ, quy tắc một Subtask/một ngày; tự mở, Done-only preference, account/reload/storage failure. Browser đo keyframes thu modal380ms về tọa độ icon i thật, giữ modal trong lúc bay, trả focus, reduced-motion đóng ngay.
- Màu: pseudo overlay đen28% phủ toàn block đã log, pointer-events none, nền dự án/OT/màu chữ gốc không thay; draft mới không có veil. Light/dark và4 viewport, ảnh QA kiểm tra nội bộ (không đóng gói).
- `test:compact`:4 viewport đạt; `test:update-live`: native Service Worker cài lần đầu, tự phát hiện bản mới, chặn reload trong mutation và click cập nhật HTML mới đạt.
- Syntax toàn bộ JS/CJS, JSON/manifest, HTML IDs, phiên bản/cache/assets và ZIP kiểm tra trước bàn giao.

Chưa có Jira công ty hoặc Safari/iPhone thật; chưa push/deploy. Không chạy toàn bộ browser lịch sử ngoài các suite nêu trên. Lựa chọn hướng dẫn vẫn theo tài khoản trên thiết bị. Preview trong RAM; không có transaction nguyên tuần hoặc tự retry khi chưa rõ kết quả.

---

## Kết quả phiên bản trước

# Kiểm thử V1.34.4

- `npm test`: toàn bộ unit/API package đạt. Validator/pure review chặn occupied và nhóm đã gửi; vẫn cho nội bộ nháp chồng giờ có chấp nhận.
- API/router/session thật + Jira giả lập: cờ overlap không ghi đè worklog có trước; nhóm2 Subtask (1h và split8h) chồng nhau trong cùng request ghi đúng, replay không tạo trùng; nhóm sau không đặt vào giờ nhóm đã ghi. Lỗi tạo hoàn tác các đoạn vừa tạo của cả nhóm; guard legacy/type/ngày/giờ/quyền giữ.
- Browser batch-calendar/review/day-review4 viewport1440×900,390×844,320×683,844×390: ngày/tuần/inline picker, resize nhóm/split8h swap, pending overlap save thành một request, unknown/partial; ngày20→21 đúng POST; tay nắm và chuột/cảm ứng.
- Browser onboarding4 viewport light/dark: tự mở, Done không tick vẫn hiện lại, tick+X không lưu, tick+Done mới lưu, reload/đổi tài khoản cùng tên hiển thị vẫn phân biệt; i mở lại. Mô phỏng lỗi Storage trên390px và thông báo đúng. Checkbox/Done ở footer modal.
- Màu: project/default/OT giữ nền và màu chữ như palette gốc, opacity1 và inset tint nhẹ; ảnh QA được xem nội bộ. Di chuyển/resize vào lịch cũ không đổi draft hoặc mở confirm; worklog mới xuất hiện lúc lưu bị preflight chặn trước POST.
- Compact và nativeSW update hồi quy đạt4 viewport/luồng cập nhật đã có. Syntax/JSON/HTML IDs/assets/version/ZIP kiểm tra trước bàn giao.

Không có Jira công ty/Safari/iPhone thật; chưa push/deploy, chưa đo mạng thực. Không chạy toàn bộ browser lịch sử ngoài các suite trên. Lựa chọn hướng dẫn chỉ theo tài khoản trên trình duyệt/thiết bị; bản nháp preview vẫn trong RAM. Ghi theo nhóm có hoàn tác best-effort, không phải transaction nguyên tuần; unknown cần kiểm tra Jira.

---

## Kết quả các phiên bản trước

# Kiểm thử V1.34.3

- `npm test`: toàn bộ unit/API package, exact-plan, resize/swap/overlap/guard/OT hồi quy đạt.
- Batch-calendar và batch-review:1440×900,390×844,320×683,844×390; auto/manual, scope tuần, split8h swap, resize, bỏ draft, overlap có xác nhận, partial/unknown và native cảm ứng/chuột.
- Batch-day-review mới, cả4 viewport: range26/10–01/11 nằm trong khung chọn; modal hướng dẫn; nút Đang xử lý không có %, progress có %; initial allocation chỉ20/10; lịch cũ cả7 ngày hiện dim/không handle và không đổi; kéo nháp20→21, xác nhận gửi cả body.date và exactPlan.date=21; audit ngày21 chạy lại trước ghi. PC kéo chuột thật qua cột ngày; mobile390 có touch giữ thật để hiện tay nắm. Kiểm tra pseudo-element dấu ngang có display/chiều rộng/chiều cao rõ, không chỉ tồn tại node.
- Compact hồi quy4 viewport: cố định nền/list riêng, weekday/weekend progress, OT/mô tả, ô lịch và quyền chỉ xem.
- Native SW browser: phát hiện/cập nhật bản mới khi app mở, không reload lúc đang ghi, cài đầu không báo nhầm.
- Syntax/JSON/HTML ID/asset/SW/version/ZIP được kiểm tra. Ảnh QA chỉ nội bộ.

Không chạy lại toàn bộ các bài browser lịch sử ngoài những suite trên. Chưa có Jira công ty/Safari/iPhone vật lý; chưa push/deploy hoặc đo mạng thật. Preview chỉ trong RAM; phạm vi kéo ngày là tuần đang xem, không điều hướng qua tuần khác trong preview. Không có transaction cả tuần hoặc tự retry unknown.

---

## Kết quả các phiên bản trước

# Kiểm thử V1.34.2

- `npm test`: toàn bộ unit/API hồi quy theo package, gồm batch-plan, batch-review và exact-plan API.
- Pure review planner: swap hai nhóm split8h, nhiều partner1h30+30m vào nguồn2h, resize08:00→17:30 thành8h bỏ trưa, giảm nhóm; giữ nguyên partner khi overlap; scope/locked/boolean approval/self-overlap.
- API/router/session thật + Jira giả lập: không chấp nhận overlap thì không ghi, đồng ý + exactPlan ghi được hai Subtask chồng nhau dù một nhóm8h; idempotency; không dùng cờ để vượt guard legacy/log trưa; giữ quyền/type/tổng/rollback.
- `test:batch-ui`: lịch preview ngày/tuần, chọn ngày trong tuần, auto/manual giữ TimeSpent, progress thật qua request chậm, không ghi trước xác nhận; staged swap/resize, partial403 và unknown.
- Browser batch-review:1440×900,390×844,320×683,844×390, light/dark. Đổi cả nhóm8h sáng/chiều, tay nắm resize có trên block tách; kéo cạnh bằng chuột thật và CDP touch giữ/kéo trên390px; resize cả ngày; bỏ group không gọi ghi/xóa Jira; từ chối xếp trùng không đổi draft, đồng ý đánh dấu cả hai nhóm, xác nhận ghi đúng flags và không ghi mục đã bỏ. Giờ trống không bị trừ hai lần ở vùng overlap.
- Browser compact: bốn viewport, nền cố định/cuộn list riêng, weekday/weekend progress, OT/mô tả và cell giờ vẫn đúng.
- Native SW update browser: phát hiện khi app mở, chặn ghi dở, kích hoạt/reload sau bấm cập nhật; cài đầu không báo nhầm.
- Kiểm tra syntax/JSON/ID/assets/SW/version và ZIP. Ảnh QA chỉ nội bộ.

Không có Jira công ty hoặc Safari/iPhone vật lý trong môi trường kiểm thử. Chưa push/deploy, chưa đo mạng thực. Không chạy lại toàn bộ các bài browser lịch sử ngoài những suite nêu trên. Bản nháp chưa log chỉ trong RAM phiên; không có transaction toàn tuần hoặc tự retry unknown.

---

## Kết quả các phiên bản trước

# Kiểm thử V1.34.1

Đã chạy với Node24 và Chromium/Playwright, Jira giả lập:

- `npm test`: toàn bộ unit/API của package đạt, gồm allocator/exact-plan/OT native và hồi quy.
- `npm run test:batch-ui`: 1440×900,390×844,320×683,844×390; radio/tuần từ–đến, text combobox không bị cắt, auto ẩn TimeSpent, nhập tay giữ 2h/30m khi bật/tắt auto; đóng preview quay lại cùng form/dữ liệu; preview dưới62px, không chồng nút; zoom/fullscreen, kéo PC/cảm ứng, swap/resize, confirm và partial retry/unknown không gửi lại thành công.
- `npm run test:compact`: bốn viewport, light/dark; cố định bên ngoài/danh sách cuộn riêng, progress weekday/weekend, mô tả và OT native giữ nguyên, bấm ô lịch đúng giờ và vùng không hợp lệ.
- `npm run test:update-live`: service worker thực trên localhost, không mock vòng đời worker. Cài đầu không báo nhầm bản mới; server thay phiên bản khi app vẫn mở → focus phát hiện worker chờ → banner; chặn khi đang ghi; bấm cập nhật kích hoạt/reload và đọc HTML phiên bản mới. Không cần đóng tab/app.
- Syntax JS/CJS, JSON/manifest, version, ID HTML và các asset trong SW; ZIP được kiểm tra trước bàn giao.

Không chạy lại tất cả các bài browser lịch sử ngoài các suite nêu trên. Không kiểm chứng Jira công ty/Safari/iPhone thật; không có deployment. Chưa đo thời gian tải bản cập nhật trên mạng thực. Browser/PWA có thể bị hệ điều hành tạm dừng khi app ẩn; cơ chế kiểm tra tiếp khi foreground. Bản nháp chưa ghi không tồn tại sau reload; có xác nhận trước cập nhật nếu có bản nháp.

---

## Kết quả các phiên bản trước

# Kiểm thử V1.34.0

## Đã chạy

- `npm test`: toàn bộ unit/API hồi quy và hai bộ batch-plan mới.
- batch-plan-tests: tuần T2–T6, ngày thật, tổng giờ/capacity, fixed duration, một Subtask một ngày, split qua trưa, thiếu chỗ, collision và ngày ngoài phạm vi.
- batch-plan-api-tests: router/session thật với Jira giả lập; đúng giờ11:00/13:30 và mô tả, replay không tạo trùng, conflict mới không ghi, chặn sai ngày/ngoài giờ/sai tổng/không phải Subtask; hoàn tác phần đã tạo khi đoạn sau lỗi.
- Chromium batch-calendar:1440×900,390×844,320×683,844×390; light/dark. Chưa xác nhận không có POST; tuần không xếp T7/CN; swap/resize và scope, PC kéo thật + CDP touch giữ/kéo trên390px; form xác nhận và partial403 retry không gửi lại dòng đã thành công. Chế độ ngày giữ giờ, abort mạng khóa unknown và chỉ gửi phần chưa gửi khi tiếp tục. Kiểm tra layout/console và thoát xóa nháp.
- Hồi quy calendar-experience: bốn viewport, giữ vị trí tải lại, staged save/unknown readback/rollback/conflict. Lượt chạy đồng thời đầu tiên lệch focal date; chạy lại độc lập đạt cả bốn viewport, không sửa logic cuộn cũ.
- Hồi quy compact form được cập nhật ngưỡng diện tích danh sách cho hàng chọn chế độ mới; bảo toàn OT/description, giờ ô lịch và chỉ xem.
- Syntax/JSON/HTML ID/assets/PWA/version và ZIP được kiểm tra. Ảnh QA chỉ dùng nội bộ, không đóng gói.

## Cần kiểm chứng sau deploy

Jira trong kiểm thử là giả lập; chưa đo trên Jira công ty hoặc iPhone/Safari vật lý. Thử guard khi người dùng log song song trên Jira, quyền Create Worklog/transition, hết phiên, mạng gián đoạn; đối chiếu từng đoạn đã xác nhận với Jira. Thử fullscreen/zoom và bàn phím điện thoại. Ghi Jira không phải transaction toàn tuần: từng Subtask có kết quả riêng. Unknown cần kiểm tra Jira thủ công, không tự retry. Preview chưa lưu chỉ nằm trong RAM của phiên đang mở; đóng/reload sẽ bỏ nháp, không đảo ngược dữ liệu đã ghi.

Chưa push/deploy. Không thêm package runtime/env/database.

---

## Kết quả lịch sử

# Kiểm thử V1.33.2

- `npm test`: unit/API hồi quy đạt, gồm OT/correction, calendar draft/swap/split/resize/zoom, thống kê và Jira editor.
- Chromium `tests/browser/logwork-compact.cjs`:1440×900,390×844,320×683,844×390, light/dark. Kéo chuột ở header và wheel ngoài danh sách không dịch chuyển khung/trang. CDP touch trên mobile: vuốt header không di chuyển; vuốt danh sách vẫn cuộn nội bộ.
- Kiểm tra màu dưới8h/đúng8h/trên8h và nút lưu bị chặn khi vượt giờ thường; cuối tuần không meter/mốc8h/nhắc thiếu; Thứ Bảy hiển thị đúng.
- Ô ngoài giờ báo đỏ/toast, không mở form; lịch có hai cột cuối tuần riêng. Hồi quy ô08:00/08:30/09:00 và POST startTime08:30, lịch chỉ xem; dữ liệu OT/giờ OT/mô tả/preset gửi đúng.
- Kiểm tra syntax/JSON/assets/PWA/version/ZIP. Ảnh QA nội bộ không đóng gói.

Chưa thử Safari/iPhone vật lý/Jira công ty. Sau deploy cần thử vuốt ngoài/biên danh sách, bàn phím, date/time picker và kéo tay nắm đóng trên iPhone thật; đối chiếu dữ liệu ghi trên Jira. Chưa push/deploy. Không thay thuật toán/backend ghi Jira.

---

## Kết quả lịch sử

# Kiểm thử V1.33.1

## Đã chạy đạt

- `npm test`: toàn bộ unit/API hồi quy, gồm native OT/correction, phân bổ, calendar/draft/swap/split/resize/zoom, thống kê, ETA và Jira issue/editor. Backend không thay đổi trong bản này.
- `tests/browser/logwork-compact.cjs`: Chromium 1440×900,390×844,320×683,844×390; light/dark. Header/list/footer không chồng, form không tràn ngang hoặc cuộn ngoài; vùng danh sách hơn51% viewport ở màn hình dọc; OT cạnh thời lượng, preset/giờ OT/mô tả và payload log tất cả giữ đúng.
- T7(24/10/2026) và CN(25/10/2026) không có nhắc thiếu giờ/mốc /8h; đổi về ngày thường khôi phục nhắc thiếu 6h. Kiểm tra form đơn vào cuối tuần.
- Ô lịch08:00/08:30/09:00 được bấm sát đáy để xác minh không chọn nhầm ô sau. PC phản hồi lúc nhấn; mobile dùng touchscreen.tap. Sau chọn Subtask, form đúng ngày/giờ; POST startTime08:30. Đóng xóa selection. Lịch người khác vô hiệu hóa ô ghi.
- `tests/browser/workflow.cjs`: PC/iPhone mô phỏng, dashboard/tuần/tháng, sửa/xóa, streaming log, kết nối gián đoạn, log tất cả; đã cập nhật kỳ vọng7 ngày/nút cuối tuần bị bỏ.
- `tests/browser/calendar-experience.cjs`:4 viewport; giữ vị trí tải lại, dữ liệu giữ nguyên tái dùng DOM, lưu nhóm lỗi một phần/thử lại rõ ràng, unknown readback, rollback, conflict và bố cục review.
- Kiểm tra syntax/JSON/HTML ID, asset và PWA shell/version, mở ZIP. Ảnh QA nội bộ đã kiểm tra, không đóng gói.

## Giới hạn

Jira trong kiểm thử là giả lập; chưa chạy với Jira công ty/Safari trên iPhone vật lý. Sau deploy cần kiểm tra native date/time picker, bàn phím và safe area trên iPhone, kéo đóng sheet, cuộn khi có nhiều Subtask, ô lịch ở các mức zoom/fullscreen, và đối chiếu giờ thực trên Jira. Các lệnh QA UI cần Playwright/Chromium riêng, không phải dependency runtime.

Bản này không thay quy tắc ghi OT, điều kiện giờ làm/8h, API backend hoặc checkpoint báo cáo. Không push/deploy.

---

## Kết quả lịch sử

# Kiểm thử V1.33.0

## Đã chạy đạt

- Toàn bộ `npm test` hồi quy, gồm stats-overtime-tests và progress-eta-tests mới. API thêm biên50 ID và reader enum hợp lệ/không hợp lệ.
- Direct: đúng ID/thuộc tính/boolean, metadata một lần/lô, concurrency <=10. Native: chỉ thăm dò một lần khi direct không hỗ trợ; hint native bỏ thăm dò, dữ liệu malformed fallback. Thuộc tính bị từ chối giữ unknown; 401 dừng lên lịch; chỉ GET đúng origin công ty.
- Benchmark giả lập200 ID, 8ms/I/O: kết quả OT cũ/mới khớp; concurrency đỉnh12→20, lookup metadata8→5; một lượt khoảng175→105ms. Không phải benchmark Jira thật hoặc SLA.
- ETA: ngưỡng mẫu/thời gian, reset khi đổi bước/tạm dừng, stalled/completed, định dạng và % tổng thể ở biên từng bước.
- Chromium background-loading: 1440×900,390×844,320×683,844×390. CDP touch ở390px: kéo ngang/dọc trong modal; dock trái/phải; kéo vào mở rộng; tiến độ; check còn sau12,5 giây và reload. Fixture OT chậm xác nhận ETA ở modal và thẻ nền.
- Hồi quy nền/navigation, body scroll lock, logo refresh không navigation/reset runID, quota/checkpoint holes, pause/resume/restore, stale/account/filter, write protection, CSP, light/dark/layout.
- Chromium calendar-experience, jira-parent-edit, jira-editor-images: đạt bốn viewport.
- Kiểm tra syntax, JSON, HTML ID/asset/PWA shell, source ZIP; ảnh QA nội bộ không đóng gói.

## Giới hạn và kiểm chứng sau deploy

Tất cả Jira trong kiểm thử là giả lập qua frontend/router/session thật. Chưa đo tốc độ Jira công ty hoặc chạy Safari/iPhone vật lý. Cần đối chiếu tổng giờ và OT cùng quyền, thử direct bị chặn/native fallback, rate limit, mạng chậm và khôi phục khi iOS giải phóng app. Hệ điều hành có thể tạm dừng JavaScript; thẻ dock không tạo dịch vụ chạy nền độc lập. Khôi phục phụ thuộc checkpoint đã lưu thành công và dữ liệu trình duyệt chưa bị xóa. ETA là ước tính theo bước, không bảo đảm chính xác.

Chạy lại: Node24 `npm ci`, `npm test`; QA riêng cài Playwright/Chromium rồi `QJL_CHROMIUM_PATH=/path/to/chromium npm run test:ui`. Chưa push/deploy.

---

## Kết quả lịch sử

# Kiểm thử V1.32.1

## Đã chạy đạt

- npm test: toàn bộ unit/API hồi quy của dự án.
- tests/project-stats-tests.js: embedded đầy đủ/rỗng được xác thực theo ngày +0700, partial/missing/malformed/empty nhưng timespent dương phải fallback; HTTP400 khi không hỗ trợ worklog thử lại trường cơ bản; giữ quyền/OT/500 pagination.
- Fixture 1.000 issue có log đầy đủ: 10 request search đủ tổng 500h; cách cũ cần 10 search + 1.000 GET riêng. Không tính OT/metadata, không đo thời gian Jira công ty.
- Chromium background-loading qua frontend/router/session thật và Jira giả lập, viewport 1440×900/390×844/320×683/844×390: fixed body, outside wheel/touch bị chặn, header giữ vị trí, đóng khôi phục scrollY=300; chuyển qua lại lịch/thống kê.
- Trên 390px: complete/empty embedded bỏ GET riêng, partial vẫn GET; tổng giờ/Subtask và phục hồi sau reload khớp. Logo không navigation (performance.timeOrigin giữ nguyên), giữ ô tìm và runID thống kê đang chạy.
- Xóa một trang worklog trong checkpoint đã hoàn tất để mô phỏng lỗ lưu V1.32: tự đọc bù đúng issue, không đọc lại issue có trang hợp lệ, tổng không trùng. QuotaExceededError: cảnh báo có mã, không cập nhật cursor qua trang lỗi; reload vẫn đọc tiếp đủ.
- Các bài nền/pause/resume/reload/filter/account/stale/write protection/CSP/light-dark/layout kế thừa tiếp tục đạt.
- Hồi quy Chromium bốn viewport: calendar-experience, jira-parent-edit và jira-editor-images đạt.
- Kiểm tra cú pháp JS, JSON/ID/asset/cache shell và ZIP. Ảnh QA nội bộ light/dark đã xem, không đóng gói.

## Sau deploy

Thử Safari/iPhone thật: chuyển lịch → thống kê, scroll ở nội dung/biên/backdrop, đóng trở lại đúng vị trí; bàn phím/xoay màn hình, kéo thẻ; logo không reset form/báo cáo. Đối chiếu giờ với Jira cùng quyền/kỳ, đặc biệt issue có >20 log hoặc trường worklog bị ẩn. Mô phỏng app ra nền/hết phiên và lưu cục bộ bị chặn.

Chưa kiểm chứng Safari/iPhone vật lý, Jira công ty, quota/storage eviction thực hoặc benchmark thời gian trên server thật. Ảnh lỗi cũ không cung cấp DOMException gốc nên không kết luận nguyên nhân chính xác; bản mới có mã chẩn đoán và tránh bỏ sót checkpoint. Chưa push/deploy.

Lệnh chạy lại: Node24.x npm ci && npm test; môi trường QA cài Playwright và Chromium riêng rồi QJL_CHROMIUM_PATH=/path/to/chromium npm run test:ui.

---

## Kết quả lịch sử V1.32.0

# Kiểm thử V1.32.0

## Đã chạy

- npm test: toàn bộ logic/API hồi quy; test thống kê bổ sung raw worklog ot=0 không chờ WorklogPRO, nhóm OT native đúng ID, session/validation/giới hạn 25 ID/không ghi Jira. Các bài trước về phân trang/múi giờ/quyền/partial tiếp tục đạt.
- Chromium qua frontend/router/session thật và Jira giả lập: 1440×900, 390×844, 320×683, 844×390. test:loading đạt skeleton cục bộ và không có thẻ đọc thông thường, chuyển màn hình trong lúc tải, tiến độ/tạm dừng/tiếp tục, toàn thời gian/năm/tháng/tuần/ngày/tất cả dự án, partial/retry, stale filter/account, CSP/light-dark/layout và khóa khi thực sự ghi.
- Ở viewport 390: giữ một công việc chưa trả về, cho hai trang khác commit; reload app → khôi phục màn hình/bộ lọc/tác vụ, không fetch lại trang đã lưu, tổng chính xác 3h30m không trùng. Reload khi đã tạm dừng vẫn tạm dừng; tiếp tục đúng kết quả.
- Kiểm tra IndexedDB thật trong Chromium: runID sai không ghi đè job hiện tại, tài khoản khác không đọc được checkpoint qua API lưu trữ của app; logout xóa checkpoint. Giả lập quota commit thất bại: vẫn tổng hợp đúng trong RAM và có cảnh báo không lưu được tiến độ.
- Thẻ nền chỉ một nút toàn vùng; kéo không kích hoạt mở, bấm mở; vị trí được ghi và nằm trong viewport sau reload. Fullscreen PC vẫn thấy thẻ.
- Hồi quy Chromium bốn viewport: calendar-experience (giữ vị trí/lỗi/partial save/retry/readback), jira-editor-images (upload/create-recovery/zoom), jira-parent-edit (quyền/editmeta/PUT/readback) đạt.
- Kiểm tra cú pháp JS, version/package/manifest, tham chiếu asset/PWA và ZIP. QA screenshots nội bộ đã xem, không nằm trong source bàn giao.

## Chạy lại

Node 24.x: npm ci && npm test. Môi trường QA có Playwright và Chromium: đặt QJL_CHROMIUM_PATH rồi chạy npm run test:ui. Không thêm Playwright vào dependency runtime của app.

## Cần đối chiếu sau deploy

1. Safari/iPhone thật: skeleton lúc vào, chờ thống kê rồi chuyển app; mở lại sau vài phút. iOS có thể dừng thực thi, cần tiếp tục từ checkpoint khi app được chạy lại.
2. Cố ý đóng/reload giữa các pha issue/worklog/OT, so tổng với lượt quét mới cùng quyền. Trang dở có thể đọc lại, trang đã commit không cộng trùng. Thử hết phiên và đăng nhập lại cùng account; logout chủ động phải xóa checkpoint.
3. Quét nhiều năm/tất cả dự án với bộ số liệu thật. So tổng giờ/Subtask theo tác giả và kỳ +0700; xác minh OT/unknown. Không lấy phần trăm 100% thay cho kết luận đủ quyền.
4. Thử mạng chậm/mất kết nối, quyền 403, dữ liệu Jira đổi trong lúc quét, kho thiết bị đầy; cảnh báo phải còn nhìn thấy, không tự biến thành 0h hoặc đầy đủ giả.
5. Thẻ kéo ở mobile portrait/landscape và khi bàn phím hiện; chạm không kéo phải mở, kéo không mở.
6. Bản cập nhật shell không tự reload giữa tác vụ. Bấm cập nhật mới tải lại; checkpoint ghi thành công mới có cơ sở khôi phục. Không tự phát lại các thao tác ghi Jira.

Chưa dùng tài khoản Jira công ty, chưa đo tốc độ trên dữ liệu thật, chưa thử Safari/iPhone vật lý hoặc eviction/storage pressure thật; lỗi quota được mô phỏng. Chưa push/deploy.

---

## Lịch sử kiểm thử V1.31 và trước (mô tả RAM/reload cũ được thay thế bởi V1.32 ở trên)

# V1.31.0 — Loading nền và phạm vi thống kê

- `npm run test`: logic/API toàn app và project-stats API mới; kiểm tra session, tất cả/một dự án, ngày nhiều năm/toàn thời gian, cursor hơn 5.000/10.000, lọc ngày Việt Nam, tác giả, native OT/unknown, malformed page/403/401 và không ghi Jira.
- `QJL_CHROMIUM_PATH=/path/to/chromium npm run test:loading`: Chromium bốn viewport 1440×900,390×844,320×683,844×390; frontend/router/session thật và Jira giả lập. Giữ chậm các API đọc để kiểm tra thao tác được và badge xuyên màn hình/modal/fullscreen PC; X/Y/%, pause/resume, retry không cộng trùng, dữ liệu cũ không ghi đè bộ lọc/tài khoản mới, cleanup RAM, CSP/escaping, layout light/dark. Kiểm tra năm2012, tháng2 nhuận2024, tuần19–25/10/2026, ngày tùy chọn nhiều năm và toàn thời gian. API ghi giả lập được giữ chậm để chứng minh vẫn bảo vệ lúc gửi.
- `npm run test:ui`: bộ browser được cập nhật cho hợp đồng loading nền, gồm bài mới, calendar-experience, jira-editor-images, jira-parent-edit; cùng các scripts riêng vẫn có trong package.json. Các file loading-lock/loading-feedback/project-stats browser cũ chuyển thành entrypoint đến bài mới. Bài editor ảnh và parent-edit chờ cả số pending đọc, không dùng active như định nghĩa khóa ghi.
- Kết quả thực tế: unit/API và các bài browser trên đạt; QA screenshots nội bộ được kiểm tra, không đưa vào source ZIP. Chưa kiểm chứng bằng Jira công ty/Safari iPhone thật, chưa push/deploy. Các bài browser lịch sử khác không nằm trong test:ui hiện tại chưa được chạy lại toàn bộ cho hợp đồng mới.

## Đối chiếu sau deploy

1. Mở lịch/lấy Subtask/check giờ Bulk chậm: app cho đóng màn hình, nhập và sang công cụ khác; badge vẫn cho biết việc đang tải. Chỉ dữ liệu/nút phụ thuộc tạm chưa sẵn sàng.
2. Chạy thống kê trên một dự án có số liệu đã biết: lọc từng kỳ so với Jira cùng quyền và giờ Việt Nam; các log ngoài kỳ không được cộng. So sánh cả log năm cũ và tất cả dự án.
3. Đóng thống kê trong khi chạy → lịch → Mở từ badge; tiến độ tiếp tục. Pause cho request đã gửi kết thúc trang; resume không nhân đôi. Có lỗi quyền/mạng phải tạm tính và retry phần lỗi, không ẩn lỗi thành0h.
4. Đổi bộ lọc trong khi tải: giữ tác vụ cũ đến khi bấm Xem mới; phản hồi cũ không hiển thị như kết quả bộ lọc mới. Logout/đổi account xóa report và badge, late401 không làm thoát phiên mới.
5. Lưu thực sự lên Jira vẫn có xác nhận, chống trùng và xử lý unknown; không gửi lại chỉ vì đã bỏ overlay tải đọc.
6. Tác vụ chạy trong trang đang mở, không phải server job: reload/đóng trang/iOS treo trang có thể ngắt; không ghi thông tin đăng nhập/PII sang kho lưu mới.

---

## Kiểm tra lịch sử V1.30.0 (hợp đồng phân trang/loading đã được thay thế ở trên)

- `npm run test`: toàn bộ logic/API hồi quy và tests mới (đã chạy đạt).
- `npm run test:project-stats`: router/session, read-only search, đọc trang issue/worklog, ngày +0700 và UTC qua ngày, người ghi khác assignee, shared Subtask, nhiều log dedupe, giờ công việc cha, xác minh OT thật/unknown, sai đầu vào/401/403/405, lỗi/thiếu/lặp trang (đã chạy đạt).
- `QJL_CHROMIUM_PATH=/path/to/chromium npm run test:project-stats-ui`: frontend thật → API/router/session → mock Jira fetch; 1440×900, 390×844, 320×683, 844×390. Kiểm tra dự án/ngày, hai trang dự án, KPI/drilldown/lọc/sort, XSS escaped, CSP, loading khóa nền, partial và cleanup, light/dark/không tràn viền, taskbar4 cột (đã chạy đạt).
- Các bài browser Jira/editor ảnh và calendar là kiểm tra hồi quy bổ sung, ghi kết quả chạy thực tế trong RELEASE_V1.30.0.md.
- QA chạy ngoài source, không thêm dependency runtime. Không kiểm tra bằng tài khoản Jira công ty hoặc Safari/iPhone thật; không thay thế bước đối chiếu số liệu sau deploy.

## Checklist đối chiếu Jira thật

1. Chọn dự án và một ngày đã biết dữ liệu, xác nhận cùng phạm vi quyền xem/múi giờ; đối chiếu tổng giờ và mỗi tác giả, không dùng assignee.
2. Một người log cùng Subtask nhiều lần/tách block vẫn đếm một; hai người dùng chung Subtask, tổng dự án vẫn chỉ một Subtask.
3. Kiểm tra giờ trên Story/Task/Bug vào tổng nhưng không tăng số Subtask.
4. OT thật có quyền đọc hiện đúng, thiếu quyền OT hiện unknown; thiếu issue/worklog báo phạm vi/partial, không suy ra 0h toàn dự án.
5. Lặp lại sau sửa/xóa worklog trên Jira: Xem thống kê lấy mới. Dự án lớn hơn 5.000 issue phải báo tạm tính.
6. Kiểm tra iPhone dọc/ngang, ô ngày/select không tràn, cuộn chỉ trong báo cáo; đợi loading xong mới tương tác.

---

# Kiểm thử V1.29.0

- `test:images`: chữ ký raster/3 MiB/rỗng/giả SVG, image wiki/canVisual, local blob và attachment preview an toàn, bỏ tham chiếu chờ khỏi mô tả ban đầu, CSP không mở img host ngoài. Parent API test thêm scope Description cho loại mới bất kỳ, chỉ cho ghi Description.
- `test:images-ui`: bốn viewport Chromium chạy CSP Vercel, API/session thật tới mock Jira. Ảnh tại caret/đổi cỡ/preview không ghi, sửa Story/Subtask, upload mất phản hồi nhưng có trên Jira đối chiếu không trùng; tạo xong thiếu quyền đính kèm rồi tiếp tục chỉ upload/PUT, mất phản hồi PUT được đọc lại, paste ảnh mô phỏng, popup zoom/slider/pan/pinch và khung không tràn.
- `npm run test`, `test:editor-ui`, `test:parent-edit-ui`, `test:attachments-ui`, `test:detail-fixes` hồi quy. Syntax/JSON/assets/version/ZIP kiểm tra trước bàn giao. QA screenshots nội bộ không đóng source.
- Chưa chạy Jira công ty/Safari/iPhone vật lý/clipboard OS thật/Redis thật/deploy; xem checklist trong RELEASE_V1.29.0.md.

# Kiểm thử V1.28.0

- `test:parent-edit`: cả Story/Task/Bug với ID Jira khác nhau; đúng ba trường, không phụ thuộc discovery Sub-task Type, không nhận subtype/parent/issuetype; quyền/Editmeta/readonly, estimate/remaining, parent có/không, stale/type/schema conflict, CSRF, replay/lost response, readback mismatch, unsupported type/ADF/độ dài, hết phiên.
- `test:parent-edit-ui`: bốn viewport Chromium, frontend → session/router thật → mock Jira editmeta/PUT → đọc lại. Không thay đổi không gửi; sửa Summary giữ nguyên wiki; trước/sau, quay lại/đóng giữ nháp, ba trường/preview, toast + detail/card, xung đột trước gửi/tải lại, chưa rõ kết quả khóa qua đóng mở và kiểm tra thủ công, quyền bị thu và dark/light/không tràn. Story/Task/Bug được phân bổ trong bốn viewport.
- `npm test`, `test:subtask-edit-ui`, `test:update-ui` hồi quy logic/API kế thừa và UI hai luồng liên quan. Syntax/JSON/version/HTML asset/ZIP kiểm tra trước bàn giao. QA screenshots nội bộ không đóng source.
- Chưa kiểm chứng Jira công ty/Safari/iPhone vật lý/Redis thật/deploy; xem RELEASE_V1.28.0.md và checklist sau triển khai.

# Kiểm thử V1.27.0

- `test:subtask-edit`: quyền Edit Issues, editmeta/operations, custom ID và allowedValues, không nhận parent/issuetype, Estimate phút và giữ remaining, required/độ dài/ký tự, xóa mô tả/type optional/0m, CSRF, updated/schema conflict, quyền bị thu, replay, mất phản hồi và đọc lại không khớp, hết phiên.
- `test:subtask-edit-ui`: bốn viewport Chromium với session/router thật, Jira giả lập tại fetch. Đọc giá trị, không thay đổi không gửi; Summary-only giữ nguyên wiki gốc; xác nhận/quay lại, giữ draft khi đóng, conflict không PUT, tải lại xác nhận, sửa cả Type/Estimate/Description, toast/refreshed detail/card, khóa kết quả chưa rõ qua đóng mở, kiểm tra thủ công/tải lại, read-only permission. Kiểm tra không tràn khung và dark/light.
- Hồi quy `npm test`, `test:editor-ui`, `test:update-ui`. Syntax/HTML ID/asset/cache/ZIP kiểm tra trước bàn giao. Không đóng QA screenshots vào source.
- Chưa kiểm chứng Jira công ty, Safari/iPhone vật lý, Redis thật hoặc deploy. Chi tiết sử dụng/giới hạn trong RELEASE_V1.27.0.md.

# Kiểm thử V1.26.0

- `npm test`: toàn bộ logic/API kế thừa và `tests/jira-editor-tests.js` (escape, màu, markup lồng, bảng, danh sách, nội dung không an toàn).
- `npm run test:editor-ui`: bốn viewport Chromium; chọn dự án bằng gợi ý, đồng bộ combobox/loại, required description, định dạng/chèn/sửa bảng, preview, Wiki nâng cao không mất dữ liệu, giới hạn nội dung, giữ nháp, tạo issue/Subtask gửi wiki.
- `npm run test:workspace-ui`, `npm run test:detail-fixes`, `npm run test:attachments-ui`: hồi quy filter/create, tạo đúng cha qua router/session thật và tệp/ảnh. Jira ở biên mạng được giả lập.
- QA screenshots chỉ dùng nội bộ, không đóng ZIP. Chưa kiểm chứng Jira công ty hoặc Safari/iPhone thật.

# Kiểm thử V1.25.1

- `npm test`: logic/API kế thừa cùng các ca create context, metadata last/isLast, thiếu subtask và lookup ID; parent/loại không hợp lệ/quyền bị từ chối không ghi. Field required/default/validation/schema/idempotency/readback tiếp tục được kiểm tra.
- `tests/jira-attachment-tests.js`: bổ sung ảnh wiki theo filename, query proxy đúng issue, không tải URL lạ, ảnh trong code giữ nguyên; ảnh >3 MiB chỉ đọc thumbnail hợp lệ cùng host và bounded response. Tiếp tục kiểm tra auth/quyền/CSRF/idempotency/lost response/no-store và nội dung binary.
- `tests/browser/jira-detail-fixes.cjs`: Chromium trên 1440×900,390×844,320×683,844×390, chạy frontend tới API router/session thật, mock fetch ở biên Jira. Tạo subtask từ Story/Task/Bug, metadata không có subtask và dùng isLast, required Sub-task Type, Reporter/Assign to me/Estimate/Description; xác nhận POST và readback parent. Từ chối quyền có nút retry, không ghi; tải lại khôi phục form. Ảnh HTML/wiki và thumbnail lớn được tải qua handler thật, ảnh 720px không tràn mobile, click popup; script/event và tracker ngoài không hoạt động. Done chip xanh, scroll controls đúng đầu/cuối, fade sau dừng và vị trí trong khung.
- `test:workspace-ui`, `test:attachments-ui`: hồi quy bốn viewport, filter/layout/25+1/revision và create/subtask/draft/receipt, upload/download/preview/unknown lock.
- `test:detail-ui` và `test:update-ui`: hồi quy phần chi tiết/cập nhật nhanh. JS/CJS syntax, HTML ID/asset, cache shell và ZIP CRC kiểm tra trước bàn giao.
- Ảnh QA nội bộ không đóng trong ZIP. Không có thao tác Jira công ty, Safari/iPhone vật lý, Redis thật, GitHub hoặc deploy. Các kết quả trên không khẳng định cấu hình/validator công ty đã được kiểm chứng.

Checklist sau deploy: version 1.25.1, tạo một subtask thử trong Story/Task/Bug và xem parent/6 trường trên Jira; quyền/create screen/subtask scheme thực tế; ảnh và thumbnail riêng tư, hết phiên và ảnh lớn không có thumbnail; status Jira custom category, iPhone cuộn/dừng/nhấn nút/xoay ngang; lịch/logwork/OT không đổi.

---

# Kiểm thử V1.25.0

- `npm test`: bộ logic/API kế thừa, filter/create/quick-update/logwork; bổ sung tệp, Estimate và đổi Reporter theo quyền.
- `tests/jira-attachment-tests.js`: metadata chỉ trả dữ liệu cần thiết, issue/quyền/phiên, giới hạn và chuyển hướng, binary/headers, CSRF, payload, multipart, đọc lại ID/tên/size, replay và mất phản hồi không retry. Estimate encode/validation. Jira được giả lập qua fetch, router/session thật chạy HTTP local.
- `tests/jira-create-tests.js`: bổ sung timetracking originalEstimate và readback seconds, Modify Reporter/candidate; giữ required/default/allowedValues/parent/schema/idempotency cũ.
- `tests/browser/jira-attachments.cjs`: Chromium PC 1440×900, mobile 390×844/320×683, ngang 844×390: màu Jira RGB, bảng và loại HTML nguy hiểm; preview/download thật qua browser; chọn file/tải/unknown lock; Subtask chỉ loại con/khóa cha/dự án/giữ cha khi đổi loại; Reporter mặc định/đổi, Assign to me, Estimate và payload tạo.
- `test:workspace-ui`: hồi quy filter và form tạo trên bốn viewport; kết quả filter thu gọn và vẫn giữ scroll/25+1/revision. Ảnh QA được xem, không đóng vào ZIP.
- `test:search-ui`, `test:detail-ui`, `test:update-ui`: hồi quy giao diện các phần bị ảnh hưởng. Syntax, ID/asset/cache và ZIP được kiểm tra trước đóng gói.
- Không có Jira công ty, Safari/iPhone vật lý, Redis production, GitHub/Vercel hoặc thao tác Jira thật. Browser và dữ liệu kiểm thử không nằm trong runtime dependencies.

Sau deploy: xác nhận Jira bật attachment/Create Attachments, limit; thử tệp an toàn rồi đối chiếu Jira, mất quyền, file lớn mở Jira; mô tả macro/color/table; các trường create screen thực tế và parent; Estimate theo cấu hình giờ/ngày của Jira; Reporter có/không Modify Reporter; iPhone tải/mở tệp và xoay ngang. Hồi quy logwork/OT/lịch/nháp như bản trước.

---

# Kiểm thử V1.24.0 — Filter Jira & giao diện tạo

- API filter: `tests/jira-filter-tests.js` PASS sở hữu/yêu thích/shared theo tên, fallback owner không gán nhầm filter người khác, dữ liệu chọn lọc/no-store, giữ nguyên JQL có ORDER BY trong literal, phân trang 25+1/revision đổi, quyền/phiên/method/validation và GET fallback. Không có thao tác ghi filter/issue.
- `tests/jira-create-tests.js`, `tests/jira-create-ui-tests.js`: PASS cả metadata không có operations qua HTTP/form; restriction có trả về vẫn bị chặn. Test form cập nhật theo chọn dự án tự tải loại. Luồng ghi/receipt/required/cha/nhân sự cũ giữ nguyên.
- Chromium 153 qua Playwright, `tests/browser/jira-create.cjs`: PASS PC 1440×900, mobile 390×844/320×683 và ngang 844×390. Chọn dự án tự tải loại, chọn cha/Sub-task Type, preview an toàn, hủy không POST, giữ draft, xác nhận mới ghi/mở chi tiết, receipt chưa rõ chặn tạo tiếp. Kiểm tra khung không tràn và nút review cố định. Lỗi dịch khung trong animation được tái hiện rồi sửa và chạy lại đạt.
- `tests/browser/jira-filters.cjs`: PASS 4 viewport trên. Đổi nguồn, chọn filter, 25+1, revision đổi/retry từ đầu, quay từ chi tiết giữ cuộn, không ghi Jira. Ảnh UI PC/mobile light/dark được kiểm tra; sửa gradient select bị phóng to và màu nền mất tương phản. Ảnh QA không đóng vào ZIP.
- `test:search-ui`, `test:detail-ui`, `test:update-ui`: PASS hồi quy 4 viewport trên. `npm test`: PASS toàn bộ logic/API kế thừa và test filter mới.
- Syntax 146 JS/CJS, 422 ID HTML không trùng, 49 tham chiếu asset, binding DOM, cache shell và JSON: PASS. Handler có sẵn, lib ghi Jira, scheduler và quick-update giữ nguyên byte từ ZIP đầu vào. Thư viện mô tả create field là phần backend được sửa cho metadata thiếu operations.
- Không có thao tác trên Jira công ty, Safari/iPhone vật lý, GitHub/Vercel hoặc Redis thật. Chromium dùng để QA nằm ngoài source, không thêm dependency/binary vào app.

Sau deploy: kiểm tra V1.24.0; filter sở hữu/yêu thích/chia sẻ/ID và filter bị thu quyền; so kết quả/thứ tự với Jira gốc; filter đổi điều kiện giữa các trang; metadata có/không operations; dự án/loại/required thực tế; tạo issue thử và đối chiếu. Kiểm tra iPhone dark/light, bàn phím và footer khi cuộn; hồi quy logwork/OT/lịch/nháp kéo thả.

# Lịch sử kiểm thử V1.23.0 — Tạo công việc Jira

- `npm test`: PASS bộ hồi quy logic/API kế thừa, `tests/jira-create-tests.js` và `tests/jira-create-ui-tests.js` với Jira giả lập trên Node.js 24. Các ca bổ sung Story/Task/Bug và điều chỉnh thông báo form cũng được chạy lại bằng bộ test riêng, đạt.
- API/field tests: ID custom field/Sub-task Type thực tế; metadata mới phân trang >50 và fallback cũ; required/default/unsupported/cascading; reporter chỉ current user; assignee active/được nhận; cha cùng dự án, không là Subtask; chọn một/nhiều, labels, số/ngày/ngày giờ/URL; dữ liệu đổi, quyền, JSON/field injection, method/origin, no-store và hết phiên.
- Ghi/đối chiếu: payload Jira thật qua mock fetch; xác nhận từng trường đã gửi, tự động hóa làm field khác thì không báo đã xác minh; concurrent/replay cùng request chỉ POST một lần trong memory store; mất phản hồi sau tạo/HTTP 503 không retry; thiếu mã hoặc đọc lại bị từ chối trả đã nhận/chưa xác nhận; thông báo lỗi rút gọn không lộ diagnostic.
- `jira-create-ui-tests.js`: PASS trạng thái bằng DOM fixture: form theo metadata, bắt buộc chọn cha, preview escape HTML, hủy không POST, giữ nháp khi đóng/mở, xác nhận mới POST, mở chi tiết, shortcut kiểm tra cha, receipt chưa rõ khóa tạo tiếp, xác nhận kiểm tra Jira và reset. Không coi đây là test bố cục/browser.
- `tests/browser/jira-create.cjs` đã viết cho 1440×900, 390×844, 320×683, 844×390. Đã thử chạy `npm run test:create-ui` nhưng thiếu executable Chromium, **chưa chạy được**. Chưa kiểm chứng Safari/iPhone thật, Jira công ty, Redis thật, GitHub hoặc Vercel.
- Syntax 142 JS/CJS, 408 ID HTML không trùng, 48 tham chiếu asset, binding DOM và asset service worker: PASS. Các handler có sẵn, thư viện ghi Jira, scheduler và quick-update giữ nguyên byte so với ZIP V1.22.0 được cung cấp.

Checklist sau deploy: V1.23.0/PWA mới; Story/Task/Bug/Subtask theo cấu hình dự án; trường Sub-task Type có đúng ID/giá trị; required/default và plugin phức tạp; đọc/tìm/đổi cha, đổi dự án; người nhận được phép/không được phép, reporter hiện tại; hủy xác nhận không ghi; metadata/permission thay đổi giữa chừng; lỗi mạng sau POST, đối chiếu Jira trước tạo lại; nhiều trang metadata; light/dark, bàn phím, màn hình ngang/dọc; logout dọn draft; hồi quy tra cứu, chi tiết, cập nhật nhanh, logwork/OT/lịch và nháp kéo thả.

# Lịch sử kiểm thử V1.22.0 — Cập nhật nhanh Jira

- `npm test`: PASS bộ logic/API kế thừa và `tests/jira-update-tests.js` mới, trên Node.js 24 với Jira giả lập.
- Test mới chạy qua HTTP router có session: quyền theo issue, priority allowedValues, người có thể được giao (lọc inactive/không lộ email), unassign theo required, trường transition bắt buộc, dữ liệu stale, phân trang bình luận 25+1, no-store, origin, method, JSON/key/comment validation, phiên hết hạn.
- Test ghi xác nhận priority/assignee/unassign/transition/comment; replay request không ghi lần hai; mất phản hồi sau khi Jira đã ghi không retry; HTTP 503 sau ghi báo chưa rõ; đọc sau ghi không khớp báo đã nhận nhưng chưa xác nhận; lỗi field Jira rút gọn không lộ diagnostic thô; metadata lỗi một phần không chặn thao tác khác đọc được.
- `tests/jira-action-ui-tests.js`: PASS kiểm thử trạng thái UI bằng DOM fixture trên Node: xem lại/hủy không ghi, chặn trường bắt buộc, xác nhận mới gửi, giữ nháp bình luận khi sửa trường khác, refresh sau xác nhận, lỗi mạng khóa gửi tiếp/giữ nội dung, thao tác đã kiểm tra Jira và dọn dữ liệu khi đổi tài khoản. Đây không phải kiểm chứng bố cục/trình duyệt.
- `tests/browser/jira-update.cjs` đã viết cho PC 1440×900, mobile 390×844/320×683 và ngang 844×390: xem lại/hủy không POST, xác nhận mới POST, trường bắt buộc, nhân sự, bình luận/Tải thêm, HTML an toàn, receipt chưa rõ khóa gửi tiếp và khung không tràn. **Chưa chạy được** vì thiếu executable Chromium khi chạy `npm run test:update-ui`; không đánh dấu UI đã đạt.
- Chưa thao tác trên Jira công ty, Safari/iPhone thật, GitHub hoặc Vercel. Store chống lặp mới kiểm thử nhánh memory, chưa kiểm thử Redis thật; giới hạn cross-instance/TTL được nêu trong README.
- Kiểm tra cú pháp 135 tệp JS/CJS, 374 ID HTML không trùng, 47 tham chiếu asset, binding DOM của tra cứu/cập nhật và asset cache: PASS. Các handler ghi Jira/worklog cũ giữ nguyên byte so với ZIP V1.21.0 được cung cấp; router chỉ bổ sung handler mới.

Checklist sau deploy: kiểm tra V1.22.0; issue thử có quyền/thiếu quyền; workflow có và không có trường bắt buộc; priority theo dự án; người nhận hợp lệ/không hợp lệ/chưa được giao; bình luận rỗng/dài/wiki/>25 trang; hủy xác nhận không ghi; dữ liệu đổi đồng thời; lỗi mạng trước/sau ghi và đối chiếu Jira; logout/đổi tài khoản; light/dark, bàn phím, portrait/landscape; hồi quy chi tiết cha/con, logwork, lịch/OT và lưu nháp. Xác nhận thêm với Jira công ty vì workflow/validator/plugin có thể khác fixture.

# Lịch sử kiểm thử V1.21.0 — Chi tiết công việc

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


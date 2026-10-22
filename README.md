# Quick Jira Log V1.23.0 — Tạo công việc Jira

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


# Quick Jira Log — Roadmap hiện hành

Boss chọn mở rộng sang thao tác Jira trên mobile; logwork tiếp tục là chức năng chính. Các ý tưởng roadmap trao đổi trước đây chưa được chọn không nằm trong phạm vi triển khai hiện tại.

| Phiên bản | Mục tiêu | Chức năng chính | Kỹ thuật/dữ liệu | Điều kiện hoàn thành | Phụ thuộc/trạng thái |
| --- | --- | --- | --- | --- | --- |
| V1.20.0 | Tra cứu Jira | Mã/nội dung; lọc dự án, trạng thái, loại, người phụ trách; thẻ, tải thêm, 10 mã vừa xem | API đọc theo quyền Jira; local storage theo username | Truy vấn/metadata, phân trang, lỗi quyền và phiên hết hạn qua test giả lập; cần xác nhận thêm trên Jira thật/mobile thật | Đã xây dựng source; không ghi issue |
| V1.21.0 | Chi tiết công việc | Mô tả, task cha/subtask, worklog; mở luồng logwork theo quy tắc app | Read API, hiển thị nội dung an toàn, phân trang từng phần | API/nội dung và hồi quy đạt với Jira giả lập; fixture UI đã viết, cần chạy Chromium và kiểm chứng Jira thật | Đã xây dựng source; chưa deploy |
| V1.22.0 | Cập nhật nhanh | Bình luận, chuyển trạng thái, assignee, priority; xem lại/xác nhận | Quyền theo issue, editmeta, transition/assignable thực tế; chặn dữ liệu cũ, đối chiếu sau ghi | API và hồi quy đạt với Jira giả lập; transition có trường bắt buộc mở Jira; cần kiểm chứng UI và Jira công ty | Đã xây dựng source; chưa deploy |
| V1.23.0 | Tạo công việc Jira | Story/Task/Bug/Subtask hoặc loại theo dự án; form động, cha, người nhận, xem trước/xác nhận | Metadata phân trang/cũ, required/default/allowedValues, ID thực tế; quyền, chặn schema cũ, đối chiếu sau tạo | API và trạng thái form đạt với Jira giả lập; chặn trường bắt buộc chưa hỗ trợ và không retry POST chưa rõ; cần kiểm chứng bố cục/Jira thật | Đã xây dựng source; chưa deploy |
| V1.24.0 | Filter Jira & giao diện tạo | Chọn filter sở hữu/yêu thích/tìm tên/ID; xem công việc; làm lại workspace và form tạo | Giữ JQL/ORDER BY trên server, revision/quyền từng trang, create metadata tương thích và xác nhận | API/logic và luồng Chromium trên PC/390/320/ngang đạt; ảnh light/dark kiểm tra, cần xác nhận Jira/Safari thật | Đã xây dựng source; thay cho Công việc của tôi theo yêu cầu Boss, chưa deploy |
| V1.25.0 | Ảnh & tệp; workspace gọn | Preview/download/upload; mô tả màu; tạo Subtask đúng cha và sáu trường | Session, quyền, giới hạn 3 MiB, multipart/readback, sanitizer, metadata Estimate/Reporter | API và Chromium PC/mobile/ngang đạt với Jira giả lập; cần kiểm chứng Jira công ty/Safari | Đã xây dựng source, chưa deploy |
| V1.25.1 | Sửa Subtask & đọc mô tả | Context cha, metadata tương thích, ảnh inline, cuộn tự ẩn, màu status, icon filter | Quyền/schema/readback, attachment đúng issue, timers/RAF | API và Chromium PC/mobile/ngang với Jira giả lập; cần kiểm chứng Jira công ty | Đã xây dựng source, chưa deploy |
| V1.26.0 | Soạn mô tả Jira trực quan | Thanh định dạng, bảng/danh sách/màu, xem trước trước tạo | Tương thích Jira wiki, giữ draft và kiểm tra nội dung | Định dạng ghi/đọc lại đúng Jira, thao tác gọn trên mobile | Đã xây dựng source V1.26.0, kiểm thử Jira giả lập; chưa deploy |

| V1.27.0 | Sửa thông tin Subtask | Summary, custom Sub-task Type, Original Estimate, Description; xem trước/sau | Edit Issues/editmeta, updated/revision, PUT chỉ trường đổi, idempotency/readback | Logic/API và Chromium bốn viewport với Jira giả lập; cần xác nhận Jira công ty | Đã xây dựng source; chưa deploy |
| V1.28.0 | Sửa Story/Task/Bug | Summary, Original Estimate, Description; editor và trước/sau | Edit Issues/editmeta, scope server, updated/revision, PUT trường đổi/readback | Logic/API và Chromium bốn viewport với Jira giả lập; cần xác nhận Jira công ty | Đã xây dựng source; chưa deploy |
| V1.29.0 | Ảnh trong trình soạn thảo | Chọn/paste/chèn/cỡ ảnh, tải sau xác nhận; tạo mới rồi hoàn thiện mô tả; popup zoom | Blob draft, wiki refs, attachment/Description scope, quyền/updated/readback, phục hồi từng bước | API và Chromium bốn viewport/Jira giả lập, cần xác nhận Jira công ty/iPhone | Đã xây dựng source; chưa deploy |
| V1.30.0 | Thống kê dự án | Giờ, Subtask, tỷ trọng theo thành viên; lọc kỳ và drilldown worklog | Project scan/read đủ trang, tác giả/múi giờ, OT, partial và session | API và Chromium PC/mobile/ngang với Jira giả lập; đối chiếu Jira công ty sau deploy | Đã xây dựng source; chưa deploy |
| V1.31.0 | Loading nền & bộ lọc thống kê | Đọc không khóa app; tất cả/một dự án, toàn thời gian/năm/tháng/tuần/ngày; tiến độ/pause/retry | Tác vụ RAM theo phiên, phân trang, immutable filters, cancel/stale guards, giữ bảo vệ ghi | API và Chromium PC/mobile/ngang/light-dark với Jira giả lập; đối chiếu Jira công ty sau deploy | Đã xây dựng source theo yêu cầu Boss; chưa deploy |
| V1.32.0 | Loading animation & khôi phục thống kê | Skeleton, thẻ nổi kéo/bấm, tiến độ gọn, đọc giờ nhanh, tiếp tục sau reload | IndexedDB trang/cursor atomic, username/runID, read-only view, OT tách pha, PWA không tự reload | Unit/API và Chromium mock, reload giữa chừng không trùng/mất trang; cần thử iPhone/Jira thật | Đã xây dựng source; chưa deploy |
| V1.33.0 | Phân tích Sub-task Type theo thành viên | Phân bổ giờ theo loại Subtask và mở các công việc thuộc nhóm | Trường custom Sub-task Type thực tế, metadata, drilldown | Nhóm đúng trường Jira; giờ khớp báo cáo thành viên | Đề xuất, chưa xây dựng/chưa chốt |

V1.29 chuyển sang ảnh trong editor theo lựa chọn Boss; lịch sử thay đổi Jira vẫn là ý tưởng chưa xây dựng/chưa gán phiên bản mới.

V1.30 chuyển sang Thống kê dự án theo lựa chọn Boss; các roadmap đề xuất trước đó không được tự triển khai.

Roadmap hiện tại theo lựa chọn của Boss: V1.27 sửa Subtask, V1.28 mở rộng sửa Story/Task/Bug. Mẫu Subtask và tạo nhiều Subtask không nằm trong phạm vi.

## Lịch sử các bản logwork đã xây dựng

V1.19.4 tối ưu bố cục lịch PC; V1.19.3 đặt thẻ kéo lịch tránh highlight. Các phần dưới lưu lại phạm vi cũ, không phải roadmap kế tiếp.

## V1.19.2 — Kéo gom nhóm tách trong bản nháp: đã xây dựng

Kéo bất kỳ phần chưa lưu để gom tổng giờ, di chuyển, swap khi đáp ứng các khoảng nguồn hoặc tách lại ở đích; giữ nháp/xác nhận và phục hồi bố cục khi hủy. Chưa gom các worklog đã lưu riêng trên Jira.

## V1.19.1 — Khóa thao tác khi loading: đã sửa

Khóa toàn bộ thao tác trong app từ lúc bắt đầu tải/xử lý tới khi hoàn tất; hỗ trợ request đồng thời, popup/fullscreen, tiến trình log đơn/hàng loạt và mở khóa khi lỗi. Giữ cơ chế kéo đổi nhiều block/tách qua giờ nghỉ của V1.19.0.

## V1.19.0 — Đổi chỗ nhiều block & tự ráp lịch qua giờ nghỉ: đã xây dựng

- Đổi một block với nhiều block khi cả vùng đích và vùng nguồn đáp ứng; preview bay/hoàn về ngay khi đang kéo.
- Tách qua giờ nghỉ, ráp vào chỗ trống cùng ngày, hỏi trước khi hơn 2 phần. Không đủ tổng giờ thì cảnh báo.
- Giữ nháp → icon Lưu → xác nhận; lưu thành các worklog Jira thật, giữ mô tả và native Overtime.
- Đọc lại/khôi phục có kiểm tra, trạng thái cần đối chiếu khi mất phản hồi; không retry tạo mới mù.
- Cần kiểm chứng thêm trên Jira công ty và iPhone/Safari thật trước khi đánh giá tốc độ thực tế.

## V1.18.0 — Củng cố trải nghiệm & tốc độ: đã xây dựng

- Cuộn tự nhiên trong khung, zoom gộp theo frame, giảm observer/layout/loop và tái sử dụng lịch không đổi.
- Giữ ngày/giờ đang nhìn khi tải lại lịch trong app; xử lý thay đổi dải giờ và lỗi/retry.
- Kết quả lưu từng worklog, phân biệt thành công, lỗi, chưa gửi, chưa rõ và đã phục hồi; chỉ xác nhận/lưu lại phần còn lại.
- Giữ phạm vi app logtime, backend và luồng xác nhận hiện có. Undo/Redo là đề xuất riêng, không nằm trong bản tối ưu này.

## V1.17.0 — Thu phóng lịch: đã xây dựng

- Điều khiển riêng chiều cao khung giờ và độ rộng cột ngày bằng −/+, thanh kéo; 75–200%, mặc định 100%.
- Bảng gọn từ icon trên lịch tuần, giữ vùng xem và bản nháp, lưu tỷ lệ riêng PC/mobile; tương thích fullscreen/xoay máy/lịch người khác.
- Kéo thả, swap, resize vẫn theo thời gian thật và luồng xác nhận hiện có; không thêm chức năng lập kế hoạch hoặc thay đổi backend logtime.

## V1.16.0 — Resize Worklogs on Calendar: đã xây dựng

- Kéo cạnh dưới để chỉnh thời lượng, highlight/tooltip, mobile nhấn giữ rồi dùng tay nắm.
- Lưu nháp và xác nhận chung với các thay đổi di chuyển/swap; kiểm tra dữ liệu mới trước ghi và đọc lại sau lưu.
- Giữ comment/OT, lịch người khác chỉ xem, fullscreen, quyền và luồng logwork hiện có.

## V1.15.6 — Adaptive Calendar Fullscreen: đã xây dựng

- Fullscreen giữ hướng cầm máy, gom toolbar dọc/ngang để tăng không gian lịch.

## V1.15.5 — Dimmed Loading & Fresh Jira Reads: đã xây dựng

- Loading nền tối, gộp truy vấn đọc đang chạy trong cùng API request, chặn phản hồi cũ ghi đè cache sau sửa.

## V1.15.4 — Centered Loading & Faster Jira Reads: đã xây dựng

- Loading trung tâm, spinner, cỡ chữ rõ và đúng màn hình; logwork tiếp tục dùng một popup tiến trình.
- Giảm chờ giữa các bước đọc Jira, pool worklog liên tục, batch metadata đồng thời và barrier kiểm tra trước ghi.
- Benchmark giả lập tốt hơn; cần đo thời gian trên Jira thật để xác định mức cải thiện khi triển khai.

## V1.15.3 — Subtle Calendar Hours: đã xây dựng

- Nền xám nhẹ cho khoảng nghỉ trưa và ngoài giờ thường trên lịch tuần; đồng bộ PC/mobile/fullscreen/light/dark.
- Không thay đổi luồng logwork, OT hoặc quyền xem/sửa lịch.

## V1.15.2 — Clock & Green Check Identity: đã xây dựng

- Logo đồng hồ + dấu check xanh đồng bộ PC/mobile/PWA; versioned icons, Apple aliases và cập nhật cache.
- Hướng dẫn thêm icon mới khi iPhone vẫn giữ icon cũ; không thể ép iOS cập nhật icon native từ JavaScript.
- Không bổ sung chức năng logwork hoặc thay đổi luồng hiện có trong bản này.

# Quick Jira Log — Roadmap

## V1.15.1 — Calendar Bounds & Personnel Suggestions: đã xây dựng

- Chặn lịch kéo quá biên, giữ cuộn và drag hợp lệ.
- Tự gợi ý nhân sự khi gõ; sửa key/alias và fallback API, hỗ trợ bàn phím mobile.

## V1.15.0 — Xem lịch người khác: đã xây dựng

- Chọn user chỉ trong fullscreen; reset về Tôi khi mở lại/thoát fullscreen.
- Lịch chỉ xem, 3 user gần đây, giữ quyền Jira và luồng logwork cá nhân.

## V1.14.5 — Icon điều hướng & chú thích lịch: đã xây dựng

- SVG thống kê/lịch đồng bộ PC và mobile; chú thích nhấn giữ kéo thả trong lịch tuần.

## V1.14.4 — Live Swap Preview: đã xây dựng

- Bay khi hover, bay về khi rời; đảo hướng từ frame hiện tại, hỗ trợ B→C liên tục.
- Chỉ thả tay mới chốt draft, xác nhận Lưu lịch mới cập nhật Jira.

## V1.14.3 — Animation swap: đã xây dựng

- Block bị thay thế bay theo đường cong ngẫu nhiên nhẹ đến vị trí chính xác.
- Giữ lưới, màu dự án/OT và luồng bản nháp/xác nhận.
- Dọn hiệu ứng khi thao tác tiếp và hỗ trợ Reduce Motion.


## V1.14.2 — Highlight & Swap lịch: đã xây dựng

- Tô vùng đích khi kéo, highlight cả hai vị trí khi đổi chỗ.
- Swap ở bản nháp; giữ xác nhận lưu và cập nhật Jira thật.
- Bảo vệ thời lượng, OT, trùng block thứ ba; lưu chu kỳ qua khoảng trống trung gian và xác minh/phục hồi.


## V1.14.1 — Xác nhận lưu lịch: đã xây dựng

- Kéo thả lưu tạm; icon lưu chỉ hiện khi có thay đổi.
- Xem lại giờ cũ/mới trước khi xác nhận; toast và ẩn nút sau lưu thành công.
- Giữ bản nháp khi lỗi, đối chiếu Jira trước khi gửi lại; bảo vệ thoát khi chưa lưu.


## V1.14.0 — Logwork trực tiếp trên lịch: đã xây dựng

- Bấm giờ trống → Sub-task → form logwork hiện có → lưu đúng giờ chọn.
- Kéo thả block PC; mobile giữ để bật chế độ rung, kéo rồi chạm ngoài để thoát.
- Cập nhật giờ/ngày thật trên Jira, giữ thời lượng/mô tả/OT; guard và readback; bảo vệ stale và kết quả chưa xác định.
- Tương tác trên lịch tuần; giữ xem/sửa lịch tháng, tổng hợp và log đơn/Bulk.

## Định hướng tiếp theo — chưa xây dựng

- V1.15.0: khôi phục bản nháp logtime (log đơn/Bulk).
- V1.16.0: bộ đếm thời gian theo task, chuyển sang form logwork để người dùng kiểm tra trước khi lưu.
- Không phát triển bàn làm việc/lập kế hoạch công việc hoặc xuất Excel trong phạm vi hiện tại.


## V1.13.2 — Tỷ trọng dự án: đã xây dựng

- Nhãn dưới thanh dự án thể hiện % tổng giờ, thanh có độ dài tương ứng tỷ trọng; giữ tổng giờ bên phải.
- Phạm vi bản vá giao diện thống kê. Chưa triển khai xuất báo cáo.

## V1.13.1 — Sửa Sub-task Type: đã xây dựng

- Đọc custom field riêng thay vì Issue Type, cộng giờ theo giá trị Jira đang chọn.
- Tự tìm field ID, xử lý trùng tên/field bị chặn, phân biệt null với chưa đọc được.
- Kiểm thử cùng một Issue Type Sub-task nhưng nhiều giá trị Testing/Supporting/Developing.

## V1.13.0 — Tổng hợp giờ & Overtime: đã xây dựng

- Thay Kiểm tra bằng Tổng hợp, giữ guard logwork.
- Chọn tuần/tháng/ngày/dự án; KPI giờ thường, OT và tổng giờ.
- Mục tiêu cá nhân không cộng OT; phân bổ giờ theo dự án và Sub-task Type thực tế Jira.
- Bấm biểu đồ xem và chỉnh sửa/xóa worklog; tải lại sau thay đổi.
- Xử lý dữ liệu thiếu, chưa biết OT, phân trang Jira, cache, lỗi và race chuyển kỳ.
- Responsive PC/mobile và PWA V1.13.0.

## Bước tiếp theo — đối soát sau deploy

- Đối chiếu tổng giờ/OT và tên Sub-task Type với dữ liệu Jira thật.
- Kiểm tra trên iPhone/Safari và deployment Vercel đang dùng.
- Chỉ xác định bản nâng cấp tiếp sau khi có phản hồi; chưa thêm xuất Excel, cấu hình ngày nghỉ hoặc loại báo cáo khác.

## Nền tảng đã có

- V1.12.1: native !update form, token/cookie Jira và xác minh sau lưu.
- V1.12.0: tạo Overtime cho log đơn/Bulk, đủ 8h thường vẫn log OT, rollback khi đồng bộ thất bại.
- V1.11.x: lịch tuần/tháng, fullscreen, bottom sheet, màu dự án, OT, lưu đăng nhập.

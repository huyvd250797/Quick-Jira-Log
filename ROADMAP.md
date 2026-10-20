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

# Quick Jira Log — Roadmap

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

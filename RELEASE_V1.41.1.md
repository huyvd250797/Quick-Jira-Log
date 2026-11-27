# Quick Jira Log V1.41.1 — FIFO Auto Logwork & Holiday Calendar

Sửa phân bổ tự động để Subtask tạo trước trên Jira nằm trước trên dòng thời gian; cân đối giờ còn trống cho đủ 8h/ngày được sử dụng. Tô đỏ ngày nghỉ và hiện tên ngày lễ trong ô lịch tuần/tháng.

## Thứ tự và quỹ giờ

- Giữ `created` và issue ID từ Jira trong bản nháp, kể cả task chọn lẻ hoặc Log tất cả. Mở danh sách Log tất cả theo thứ tự tạo tăng dần; bước phân bổ luôn sắp xếp lại theo thời điểm tạo để không phụ thuộc thứ tự danh sách nguồn.
- Bộ phân bổ cân đối số task cho từng ngày trước, sau đó gán từng nhóm liên tiếp theo thứ tự tạo trước và ngày/giờ tăng dần. Sửa lỗi task thứ sáu bị gán ngược về đầu ngày đầu tiên rồi chen trước task thứ hai.
- Ví dụ 6 Subtask tạo lần lượt A–F, tuần trống: thứ Hai A 4h rồi B 4h; thứ Ba C 8h; thứ Tư D 8h; thứ Năm E 8h; thứ Sáu F 8h. Tổng 40h, giữ A→F trên dòng thời gian.
- Giờ mới chỉ bù phần còn trống: tổng worklog cũ trong giờ thường + lịch nháp = 480 phút ở từng ngày được phân bổ. Tự tách qua giờ nghỉ trưa, không chồng lịch hoặc vượt 8h. Phần giờ lẻ 1–29 phút cũng được sử dụng thay vì bỏ trống vì ngưỡng 30 phút.
- Vẫn giữ một Subtask trên một ngày. Nếu số task ít hơn số ngày còn trống, không nhân bản task để lấp cả tuần; chọn các ngày theo quỹ giờ của bộ cân đối và giữ thứ tự tạo trong các ngày được dùng. Nếu không còn phút trống, hiển thị task chưa phân bổ, không log ngầm.
- Thời điểm tạo thiếu/sai định dạng: dùng issue ID dạng số, rồi mã Jira theo thứ tự số làm phương án dự phòng. Không coi mã Jira là ngày tạo khi có timestamp thật.
- Chỉ sửa thứ tự lập lịch tự động ban đầu. Không sắp xếp lại những thay đổi Boss kéo tay; giữ chế độ nhập TimeSpent thủ công và worklog đã tồn tại.

## Ngày nghỉ trên lịch

- Nền đỏ nhạt ở lightmode, đỏ trầm ở darkmode, chữ tương phản. Ngày trùng cuối tuần/hôm nay vẫn giữ màu nghỉ, không bị màu tím/xanh ghi đè.
- Hiện tên ngay trong ô lịch tháng và tiêu đề ngày của lịch tuần, kể cả ngày chưa có log; phần xem chi tiết ngày cũng có tên. Chữ được xuống dòng, không chỉ nằm trong tooltip.
- Tên ngày gồm Tết Dương lịch; Giỗ Tổ Hùng Vương (10/3 âm lịch); Giải phóng miền Nam, thống nhất đất nước; Quốc tế Lao động; Ngày Thương binh – Liệt sĩ; Quốc khánh Việt Nam; Ngày Văn hóa Việt Nam.
- Lịch nghỉ vẫn theo quy tắc Boss giao ở V1.41.0. Không bổ sung hoặc thay ngày nghỉ. Bấm ô lịch, chọn ngày, kéo thả thủ công vẫn hoạt động; không chặn ngày nghỉ.

## Nâng cấp và kiểm thử

Node.js 24.x, giải nén vào Quick-Jira-Log, chạy `npm ci`, `npm test`. Kiểm tra riêng: `npm run test:fifo`. Giữ biến môi trường, triển khai source như bản hiện tại và cập nhật PWA để nhận V1.41.1. Không cần chạy migration mới.

Đạt toàn bộ bộ kiểm thử npm; kiểm tra thứ tự tạo thật/các múi giờ, đầu vào đảo thứ tự, số task 1–20, lịch có ngày nghỉ, quỹ giờ trống/hết/đã log một phần, phần dư 1–29 phút, phạm vi ngày trùng, tách qua trưa và tổng 8h/ngày. Kiểm tra đầu ra thực của hai hàm dựng lịch với bảy tên ngày nghỉ, tên hiển thị trực tiếp, lớp tô đỏ và ô log thủ công còn hoạt động. API ghi tay vào ngày nghỉ vẫn đạt kiểm tra hiện có. Kiểm tra cú pháp JavaScript và tài nguyên cache PWA đạt.

Chưa nghiệm thu hình thức/độ vừa chữ trên PC/iPhone thật; môi trường chưa khởi chạy được Chromium. Không có thao tác ghi lên Jira thật, chưa push GitHub hoặc deploy trong lần bàn giao.

Bản tiếp theo đề xuất: V1.41.2 — Work Holiday Settings, cấu hình ngày nghỉ riêng/khoảng nghỉ Tết sau khi Boss chốt phạm vi. Chưa xây dựng.

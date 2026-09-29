# Quick Jira Log V1.0.6 – Desktop Control Consistency Fix

V1.0.6 **rollback bố cục về đúng V1.0.3 – Desktop UI/UX Polish**. Không sử dụng layout V1.0.4.

## Thay đổi V1.0.6

- Giữ nguyên vị trí Bulk Logwork / danh sách ISSUE đang chọn **ở phía dưới như V1.0.3**.
- Không chuyển Bulk editor sang cột phải.
- Chỉ chuẩn hóa chiều cao control trên desktop:
  - textbox
  - combobox / select
  - datepicker
  - timepicker
- Tất cả control một dòng trên desktop dùng chiều cao chuẩn **46px**.
- Áp dụng cả form Logwork, Bulk và Settings.
- Textarea vẫn giữ chiều cao nhiều dòng riêng.
- Mobile không thay đổi layout.

Hotfix trên nền V1.0.1.

## Thay đổi chính
- Sau khi logwork thành công, issue ở **To Do** được chuyển tuần tự **To Do → In Progress → Done**.
- Issue đã **In Progress** chỉ thực hiện **In Progress → Done**.
- Issue đã **Done** được giữ nguyên.
- Mỗi bước transition được đọc lại từ workflow Jira, không hard-code transition ID.
- Nếu Jira không có transition To Do → In Progress hoặc In Progress → Done, worklog vẫn được giữ và app hiển thị cảnh báo rõ ràng.
- Bulk Logwork dùng cùng cơ chế transition tuần tự.
- UI kết quả hiển thị đường đi trạng thái thực tế, ví dụ `To Do → In Progress → Done`.

## Deploy
Giữ nguyên toàn bộ Environment Variables của V1.0.1 và deploy source lên Vercel. Không cần thay đổi database hay cấu hình Jira.

## V1.0.3 – Desktop UI/UX Polish

- Giữ nguyên layout mobile của V1.0.2.
- Desktop từ 900px dùng workspace 2 cột: Sub-task bên trái, Logwork nhanh bên phải.
- Form Logwork sticky trên PC để luôn sẵn thao tác khi cuộn danh sách.
- Header/status chạy full-width, khoảng trắng và kích thước card được cân lại cho màn hình lớn.
- Settings trên PC hiển thị dạng modal giữa màn hình thay vì bottom-sheet.
- Bulk items có thể chia 2 cột trên desktop.
- Không thay đổi Jira API, scheduler, transition workflow hay quy tắc logwork.
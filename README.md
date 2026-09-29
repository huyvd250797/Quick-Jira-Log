# Quick Jira Log V1.0.2 – Workflow Transition Hotfix

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

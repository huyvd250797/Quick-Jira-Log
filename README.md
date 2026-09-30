# Quick Jira Log V1.3.4 – Mobile Bottom Sheet UX & Preview

Bản này được nâng trực tiếp từ **V1.3.3 – Vercel Hobby Function Consolidation** theo yêu cầu rollback, không lấy các thay đổi của V1.3.5.

## Thay đổi chính

- Bottom sheet trên mobile có thanh kéo thật; kéo xuống đủ ngưỡng để đóng. Nếu kéo chưa đủ, sheet tự snap về vị trí cũ.
- Khi bấm preset `30m / 1h / 2h / 4h`, app chỉ cập nhật TimeSpent + Dự kiến, không tự chuyển focus xuống Description.
- Khi nhập TimeSpent hợp lệ như `1h 30m`, app gọi preview engine và hiển thị `Dự kiến: 08:00 → 09:30` nếu khung giờ trống; nếu đã có worklog, Dự kiến tự né khoảng đã log.
- Bổ sung thông tin tác giả trong Cài đặt: Quick Jira Log được xây dựng từ ý tưởng của HuyVo với sự hỗ trợ của AI; `© 2026 HuyVo. All rights reserved.`
- Giữ nguyên khung giờ Normal `08:00–12:00` và `13:30–17:30`; OT Thứ 2–6 từ `17:30`, OT Thứ 7/CN dùng khung giờ ban ngày.
- Giữ kiến trúc Vercel Hobby chỉ có `api/index.js` là Serverless Function; các handler còn lại là module nội bộ.

## Jira / Worklog

- Danh sách chính: Sub-task được assign cho `currentUser()` và chưa có time spent.
- Preview, log đơn và bulk cùng dùng scheduler nên Dự kiến và thời gian ghi lên Jira thống nhất.
- Field **Overtime** cần tồn tại trên Jira và tài khoản hiện tại phải có quyền Edit Issue.

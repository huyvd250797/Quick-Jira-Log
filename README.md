# Quick Jira Log V1.6.4 – Late Worklog Friendly Warning

Nâng cấp trực tiếp từ **V1.6.3 – Jira Auth Reliability & CAPTCHA Guard**.

## Thay đổi chính

- Giữ nguyên thông báo **Logwork thành công** hiện tại. Cảnh báo log trễ là thông báo bổ sung riêng, không thay thế trạng thái thành công.
- Quy tắc: **N = hôm nay, N-1 = hôm qua**. Chỉ cảnh báo khi ngày logwork từ **N-2 trở về trước**. Ví dụ hôm nay 01/10/2026: 01/10 và 30/09 không cảnh báo; 29/09 trở về trước có cảnh báo.
- Áp dụng đồng nhất cho **Log 1 Sub-task** và **Log tất cả**.
- Có **10 câu cảnh báo vui, nhẹ nhàng**; hệ thống dùng cơ chế shuffle-bag để các câu không lặp lại cho đến khi đã đi qua đủ bộ 10 câu trong phiên sử dụng.
- Cảnh báo dùng toast vàng riêng, hiển thị song song với toast thành công và tự ẩn; không block, không modal, không ảnh hưởng request Jira.
- Giữ nguyên toàn bộ Authentication/CAPTCHA Guard, Daily Capacity 8h, OT, Planner, History, rollback, chống overlap, desktop modal và mobile bottom sheet của V1.6.3.

## 10 câu cảnh báo

1. ⏰ Worklog này hơi “du hành thời gian” rồi 😄 Lần sau nhớ log trong hôm nay hoặc hôm qua nhé!
2. 🕰️ Jira vừa nhận một chuyến hàng từ quá khứ 😄 Hạn chế log quá N-1 để dữ liệu luôn kịp thời nhé!
3. 📅 Công việc xong rồi, worklog đừng để lâu mới nhớ nha 😄 Nên log trong hôm nay hoặc hôm qua.
4. 🚀 Log thành công! Nhưng worklog này đến Jira hơi trễ 😄 Lần sau tranh thủ log sớm hơn nhé!
5. 😴 Worklog này ngủ quên hơi lâu rồi! Lần sau nhớ đánh thức trong hôm nay hoặc hôm qua nhé 😄
6. 🧭 Bạn vừa ghé lại quá khứ để log time 😄 Hạn chế chọn ngày từ hôm kia trở về trước nhé!
7. ⏳ Log xong rồi! Nhắc nhẹ: để số liệu đẹp và kịp thời, đừng để worklog quá N-1 nhé 😄
8. 📝 Jira đã ghi nhận nhé! Còn mình thì nhắc nhỏ: log sớm trong hôm nay hoặc hôm qua sẽ tốt hơn 😄
9. 🐢 Worklog này đến hơi chậm một chút 😄 Lần sau cố gắng log trong vòng 1 ngày gần nhất nhé!
10. 🎯 Log thành công! Thêm một chút kỷ luật thời gian: hạn chế worklog từ hôm kia trở về trước nhé 😄

## Thông tin

**© 2026 HuyVo. All rights reserved.**

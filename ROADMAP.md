# Quick Jira Log Roadmap

- ✅ V0.1.0 – Simple Login & Core Quick Log
  - ID + Password.
  - KEY / PROJECT / TimeSpent / Date / Description.
  - Auto schedule 08:00–12:00, 13:30–17:30.
  - Avoid overlap, split automatically, rollback best-effort.

- ✅ V0.2.0 – Saved Filter Quick Pick
  - Tự lấy filter `[HuyVo] - No Work Logged` sau login.
  - Hiển thị issue ngay trong app, không cần mở Jira.
  - Search KEY/Summary.
  - Tap issue → tự điền KEY + PROJECT.
  - Refresh filter sau khi logwork.
  - Fallback Favourite Filter / Filter Search theo Jira version.

- V0.3.0 – Quick Input & Templates
  - Nhớ Project/TimeSpent gần nhất.
  - Recent KEY.
  - Preset TimeSpent.
  - Description templates.

- V0.4.0 – Bulk Logwork
  - Chọn nhiều KEY từ filter.
  - Nhập TimeSpent/Description cho từng dòng.
  - Tự xếp giờ cả ngày.

- V0.5.0 – Jira Reliability & Audit
  - Connection diagnostics.
  - Retry/backoff.
  - Session expiry UX.
  - Lịch sử logwork và retry lỗi.

- V1.0.0 – Stable Personal Release
  - PWA.
  - Production hardening.
  - Mobile polish + audit/recovery.

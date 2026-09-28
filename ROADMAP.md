# Quick Jira Log Roadmap

- ✅ V0.1.0 – Simple Login & Core Quick Log
  - ID + Password.
  - KEY / PROJECT / TimeSpent / Date / Description.
  - Auto schedule 08:00–12:00, 13:30–17:30.
  - Avoid overlap, split automatically, rollback best-effort.

- V0.2.0 – Jira Connection Hardening
  - Diagnostics cho Jira auth thực tế.
  - Retry/backoff.
  - Session-expiry UX.
  - Adapter nếu `task.ascvn.com.vn` dùng SSO/session đặc thù.

- V0.3.0 – Quick Input
  - Nhớ Project gần nhất.
  - Recent KEY.
  - Preset TimeSpent.
  - Description templates.

- V0.4.0 – Bulk Logwork
  - Nhiều KEY trong một lần.
  - Tự xếp giờ cả ngày.

- V1.0.0 – Stable Personal Release
  - PWA.
  - Audit/retry.
  - Hardening và production polish.

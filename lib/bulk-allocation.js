'use strict';

(function initBulkAllocation(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.QJLAllocation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBulkAllocationApi() {
  function clampInt(value, min = 0) {
    const n = Math.floor(Number(value) || 0);
    return Math.max(min, n);
  }

  function allocateRegularMinutes(remainingMinutes, itemCount) {
    let remaining = clampInt(remainingMinutes);
    const count = clampInt(itemCount);
    if (!remaining || !count) return Array(count).fill(0);

    const out = Array(count).fill(0);

    // Khi đủ ít nhất 1h / task: ưu tiên 1h cho mọi task, phần dư cộng dần
    // từ cuối danh sách. Ví dụ 7h / 6 task => 1h,1h,1h,1h,1h,2h.
    if (remaining >= count * 60) {
      out.fill(60);
      remaining -= count * 60;
      let index = count - 1;
      while (remaining >= 60) {
        out[index] += 60;
        remaining -= 60;
        index = index > 0 ? index - 1 : count - 1;
      }
      if (remaining > 0) out[index] += remaining;
      return out;
    }

    // Khi chưa đủ 1h / task nhưng đủ 30m / task: ưu tiên block 30m để giữ
    // TimeSpent dễ đọc. Ví dụ 4h / 6 task => 1h,1h,30m,30m,30m,30m.
    if (remaining >= count * 30) {
      out.fill(30);
      remaining -= count * 30;
      let index = 0;
      while (remaining >= 30) {
        out[index] += 30;
        remaining -= 30;
        index = (index + 1) % count;
      }
      if (remaining > 0) out[index] += remaining;
      return out;
    }

    // Khi quỹ giờ nhỏ hơn 30m / task, vẫn chia đều theo phút để người dùng
    // có thể bấm Log tất cả ngay thay vì phải nhập tay từng dòng.
    const base = Math.floor(remaining / count);
    const extra = remaining % count;
    for (let i = 0; i < count; i += 1) out[i] = base + (i < extra ? 1 : 0);
    return out;
  }

  function formatTimeSpent(minutes) {
    const total = clampInt(minutes);
    if (!total) return '';
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return `${hours ? `${hours}h` : ''}${mins ? `${mins}m` : ''}` || '0m';
  }

  return { allocateRegularMinutes, formatTimeSpent };
});

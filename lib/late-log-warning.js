'use strict';

(function initLateLogWarning(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.QJLLateLogWarning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createLateLogWarningApi() {
  const MESSAGES = Object.freeze([
    '⏰ Worklog này hơi “du hành thời gian” rồi 😄 Lần sau nhớ log trong hôm nay hoặc hôm qua nhé!',
    '🕰️ Jira vừa nhận một chuyến hàng từ quá khứ 😄 Hạn chế log quá N-1 để dữ liệu luôn kịp thời nhé!',
    '📅 Công việc xong rồi, worklog đừng để lâu mới nhớ nha 😄 Nên log trong hôm nay hoặc hôm qua.',
    '🚀 Log thành công! Nhưng worklog này đến Jira hơi trễ 😄 Lần sau tranh thủ log sớm hơn nhé!',
    '😴 Worklog này ngủ quên hơi lâu rồi! Lần sau nhớ đánh thức trong hôm nay hoặc hôm qua nhé 😄',
    '🧭 Bạn vừa ghé lại quá khứ để log time 😄 Hạn chế chọn ngày từ hôm kia trở về trước nhé!',
    '⏳ Log xong rồi! Nhắc nhẹ: để số liệu đẹp và kịp thời, đừng để worklog quá N-1 nhé 😄',
    '📝 Jira đã ghi nhận nhé! Còn mình thì nhắc nhỏ: log sớm trong hôm nay hoặc hôm qua sẽ tốt hơn 😄',
    '🐢 Worklog này đến hơi chậm một chút 😄 Lần sau cố gắng log trong vòng 1 ngày gần nhất nhé!',
    '🎯 Log thành công! Thêm một chút kỷ luật thời gian: hạn chế worklog từ hôm kia trở về trước nhé 😄'
  ]);

  function parseLocalDateToOrdinal(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const stamp = Date.UTC(year, month - 1, day);
    const check = new Date(stamp);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    return Math.floor(stamp / 86400000);
  }

  function daysAgo(date, today) {
    const selected = parseLocalDateToOrdinal(date);
    const current = parseLocalDateToOrdinal(today);
    if (selected == null || current == null) return null;
    return current - selected;
  }

  // N = hôm nay. N-1 = hôm qua vẫn hợp lệ, chỉ cảnh báo từ N-2 trở về trước.
  function shouldWarn(date, today) {
    const diff = daysAgo(date, today);
    return diff != null && diff >= 2;
  }

  function createWarningPicker(randomFn = Math.random) {
    let bag = [];
    let lastIndex = -1;

    function refill() {
      bag = MESSAGES.map((_, index) => index);
      for (let i = bag.length - 1; i > 0; i -= 1) {
        const raw = Number(randomFn());
        const bounded = Number.isFinite(raw) ? Math.min(.999999999, Math.max(0, raw)) : 0;
        const j = Math.floor(bounded * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === lastIndex) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }

    return function nextWarning() {
      if (!bag.length) refill();
      const index = bag.pop();
      lastIndex = index;
      return MESSAGES[index];
    };
  }

  return Object.freeze({ MESSAGES, daysAgo, shouldWarn, createWarningPicker });
});

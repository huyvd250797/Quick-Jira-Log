'use strict';
// Web content cannot force iOS to replace an already-installed Home Screen icon.
// This helper supplies current artwork and manual guidance; never clears user data.
document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.getElementById('appIconDialog');
  const opener = document.getElementById('appIconHelpBtn');
  if (!dialog || !opener) return;
  const status = document.getElementById('appIconStatus');
  const fallback = document.getElementById('appIconUrl');
  let closing = false;
  function close() {
    if (!dialog.open || closing) return;
    closing = true;
    dialog.classList.add('icon-help-closing');
    setTimeout(() => {
      dialog.close();
      dialog.classList.remove('icon-help-closing');
      closing = false;
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150);
  }
  opener.addEventListener('click', () => {
    status.textContent = '';
    fallback.hidden = true;
    if (!dialog.open) dialog.showModal();
  });
  document.getElementById('closeAppIconBtn').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
  });
  document.getElementById('copyAppIconUrlBtn').addEventListener('click', async () => {
    // Canonical root only: no login/session tokens, search text, or draft parameters.
    const url = new URL('/', location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Đã sao chép liên kết. Mở Safari và dán vào thanh địa chỉ.';
    } catch {
      fallback.value = url;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      status.textContent = 'Nhấn giữ liên kết bên dưới để sao chép và mở trong Safari.';
    }
  });
});

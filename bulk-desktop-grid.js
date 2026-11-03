'use strict';
// Equal compact tiles; the scroller grows, cards never stretch to fill it.
(() => {
  const card = document.getElementById('bulkCard');
  const list = card?.querySelector('.bulk-items');
  if (!list) return;
  const header = card.querySelector('.bulk-sticky-header');
  const footer = card.querySelector('.bulk-footer');
  const number = value => parseFloat(value) || 0;
  let frame = 0;

  function update() {
    frame = 0;
    if (innerWidth < 900 || card.classList.contains('hidden') || document.body.dataset.desktopEditor !== 'bulkCard') return;
    const css = getComputedStyle(list);
    const columns = css.gridTemplateColumns.split(' ').length;
    const gap = number(css.rowGap);
    const padding = number(css.paddingTop) + number(css.paddingBottom);
    const auto = card.classList.contains('is-auto-mode');
    // Card density is independent of the available viewport height.
    const height = auto ? 120 : 190;
    const rows = Math.max(1, Math.ceil(list.children.length / columns));
    for (const [key, value] of [
      ['--bulk-row-height', height + 'px'],
      ['--bulk-grid-height', (height * rows + gap * (rows - 1) + padding) + 'px']
    ]) {
      if (list.style.getPropertyValue(key) !== value) list.style.setProperty(key, value);
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  const mutation = new MutationObserver(schedule);
  mutation.observe(card, { attributes: true, attributeFilter: ['class'] });
  mutation.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-desktop-editor'] });
  mutation.observe(list, { childList: true });
  const resize = new ResizeObserver(schedule);
  for (const element of [list, header, footer]) resize.observe(element);
  addEventListener('resize', schedule, { passive: true });
  document.fonts?.ready.then(schedule);
  schedule();
})();

'use strict';

/* Independent transparent layers. No whole-scene deformation or frame crossfade. */
window.QuickJiraSeasonalCollection = (() => {
  const ids = ['newyear','lantern','womensday','hungking','doanngo','family','vulan','national','vietwomen','culture'];
  const entries = new Set();
  let frame = 0, observer, resizeObserver, mutationObserver;
  function cell(id, index, className) {
    return '<svg class="' + className + '" viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">'
      + '<image x="' + (-index) + '" y="0" width="3" height="1" preserveAspectRatio="none" href="/seasonal-collection/' + id + '.webp"/></svg>';
  }
  const shapes = {
    tulip: '<path fill="#c3507c" d="M20 35C6 28 3 17 9 6c5 1 9 5 11 9C22 6 27 3 31 2c6 12 6 24-11 33Z"/><path fill="#ef94b3" d="M20 31C12 22 10 13 12 9c5 3 8 9 8 22Z"/><path fill="#f9c0cd" d="M21 30c1-10 5-19 8-23 3 12 0 19-8 23Z"/>',
    rose: '<path fill="#a33459" d="M19 34C7 30 1 21 7 13 4 4 17 1 23 5c8-3 16 6 13 12 6 8-7 18-17 17Z"/><path fill="#ef8caa" d="M19 30C10 24 8 14 11 9c7-3 10 3 11 6 5-6 9-6 11-3 5 9-5 16-14 18Z"/><path fill="#ffd0d9" d="M19 27c-2-8-4-14-7-15 1 9 3 13 7 15Z"/>',
    bamboo: '<path fill="#538b43" d="M4 33C7 14 22 3 37 2 32 17 17 32 4 33Z"/><path fill="none" stroke="#b7cb6c" d="M5 32 34 5"/>',
    lotus: '<path fill="#d77ca7" d="M20 34C4 26 3 12 8 7c6 0 10 6 12 12C22 6 27 1 30 1c9 15 7 28-10 33Z"/><path fill="#f9bdd5" d="M20 32C12 20 12 11 15 5c7 5 10 16 5 27Z"/>'
  };
  function petals(kind, effect) {
    return '<span class="collection-petals">' + Array.from({length: effect ? 7 : 4}, (_, i) =>
      '<i style="--x:' + (25 + (i * 29) % 70) + '%;--delay:' + (-i * 1.7) + 's;--duration:' + (6.4 + i % 3) + 's">'
      + '<svg viewBox="0 0 40 38" aria-hidden="true">' + shapes[kind] + '</svg></i>').join('') + '</span>';
  }
  function clouds() {
    return '<svg class="collection-clouds" viewBox="0 0 960 300" aria-hidden="true"><g><path fill="currentColor" d="M80 217c8-15 28-22 42-13 7-24 38-28 52-11 19-11 43 2 43 18 26-1 46 14 52 28H65c-2-11 4-18 15-22Z"/><path fill="currentColor" d="M460 252c10-17 31-21 46-12 11-25 46-24 57-3 26-9 49 5 51 22 30-1 48 12 51 27H435c-1-17 10-28 25-34Z"/></g></svg>';
  }
  function fireworks() {
    const rays = Array.from({length: 16}, (_, i) => {
      const angle = i * Math.PI / 8, x = Math.cos(angle), y = Math.sin(angle);
      return '<path d="M' + (x * 7).toFixed(2) + ' ' + (y * 7).toFixed(2)
        + ' ' + (x * 31).toFixed(2) + ' ' + (y * 31).toFixed(2) + '"/>';
    }).join('');
    return '<svg class="collection-fireworks" viewBox="0 0 960 300" aria-hidden="true">'
      + '<g transform="translate(260 65)"><g class="collection-burst">' + rays + '</g></g>'
      + '<g transform="translate(770 48)"><g class="collection-burst second">' + rays + '</g></g></svg>';
  }
  function clockHands() {
    return '<svg class="collection-clock-hands" viewBox="0 0 100 100" aria-hidden="true">'
      + '<g class="collection-hour"><path d="M50 51V33"/></g>'
      + '<g class="collection-minute"><path d="M50 51V25"/></g>'
      + '<g class="collection-second"><path d="M50 57V20"/></g><circle cx="50" cy="50" r="1.8" fill="#bf8c35"/></svg>';
  }
  function steam() {
    return '<svg class="collection-steam" viewBox="0 0 100 100" aria-hidden="true">'
      + '<path d="M40 49c-10-10 8-13 0-24"/><path d="M53 45c-10-11 10-16 0-31"/><path d="M65 49c-9-9 8-14 1-24"/></svg>';
  }
  function flame() {
    return '<svg class="collection-flame" viewBox="0 0 100 100" aria-hidden="true">'
      + '<ellipse class="collection-candle-glow" cx="50" cy="31" rx="17" ry="20" fill="#ffc15b" opacity=".12"/>'
      + '<g class="collection-flame-tongue"><path fill="#f79c24" d="M50 40c-14-4-9-16 0-28 0 10 15 19 0 28Z"/>'
      + '<path fill="#fff4be" d="M50 39c-7-2-4-10 0-17 1 7 6 13 0 17Z"/></g></svg>';
  }
  function ribbon() {
    return '<svg class="collection-silk" viewBox="0 0 960 300" aria-hidden="true"><path d="M535 225c65-45 88 58 157 16s101 34 142-8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';
  }
  function ripple() {
    return '<svg class="collection-ripple" viewBox="0 0 960 300" aria-hidden="true">'
      + '<ellipse cx="475" cy="255" rx="110" ry="10"/><ellipse class="second" cx="475" cy="255" rx="110" ry="10"/></svg>';
  }
  function festivalFlag() {
    return '<svg class="collection-festival-flag" viewBox="0 0 100 100" aria-hidden="true"><path d="M22 25V89" stroke="#b98d56" stroke-width="2"/>'
      + '<g><path fill="#d53934" d="M23 27q20-7 43 0v32q-22-8-43 0Z"/>'
      + '<path fill="#e6bc42" d="M27 31q18-5 35 0v23q-17-5-35 0Z"/>'
      + '<path fill="#458665" d="M31 35q13-4 27 0v14q-14-3-27 0Z"/></g></svg>';
  }
  function scene(id, effect = 0) {
    if (!ids.includes(id)) return '';
    let ambient = '', moving = '', foreground = '';
    if (['lantern','hungking','national'].includes(id)) ambient += clouds();
    if (id === 'newyear') { ambient += fireworks(); moving = clockHands(); }
    if (id === 'womensday') foreground += petals('tulip', effect);
    if (id === 'doanngo' && effect) foreground += petals('bamboo', 0);
    if (id === 'family') {
      moving = steam();
      ambient += effect ? '<span class="collection-sunlight"></span>' : '<span class="collection-curtain"></span>';
    }
    if (id === 'vulan') { moving = flame(); ambient += ripple(); if (effect) foreground += petals('lotus', 0); }
    if (id === 'hungking' && effect) foreground += festivalFlag();
    if (id === 'vietwomen') foreground += petals('rose', effect);
    if (['newyear','womensday','vietwomen','culture'].includes(id) && (effect || id === 'culture')) foreground += ribbon();
    if (id === 'culture') ambient += '<span class="collection-bronze-gleam"></span>';
    const flag = id === 'national' ? '<canvas class="collection-flag-canvas" aria-hidden="true"></canvas>' : '';
    return '<span class="seasonal-composed collection-' + id + '" data-collection-theme="' + id + '" data-effect="' + (effect === 1 ? 1 : 0) + '">'
      + ambient + cell(id, 0, 'collection-part collection-stage')
      + '<span class="collection-part collection-subject">' + cell(id, 1, 'collection-subject-image') + flag + moving + '</span>'
      + foreground + '</span>';
  }
  function allowed(entry) {
    if (!entry.visible || document.hidden || !entry.node.isConnected) return false;
    const owner = entry.node.closest('#seasonalPreview') || document.documentElement;
    if (!owner.hasAttribute('data-seasonal-motion')) return false;
    if (owner !== document.documentElement) return !!owner.closest('dialog[open]');
    const splash = document.getElementById('bootSplash');
    if (entry.node.closest('#bootSplash')) return !!splash && !splash.classList.contains('leaving');
    if (splash && !splash.classList.contains('leaving')) return false;
    return !document.querySelector('dialog[open], .settings-overlay[aria-hidden="false"]');
  }
  function drawFlag(entry, seconds) {
    if (!entry.image?.complete || !entry.image.naturalWidth || !entry.canvas) return;
    const canvas = entry.canvas, rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const context = entry.context || (entry.context = canvas.getContext('2d'));
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const sourceWidth = entry.image.naturalWidth / 3, sourceHeight = entry.image.naturalHeight;
    const size = Math.min(width,height), left = (width-size)/2, top = (height-size)/2;
    const steps = 48, amplitude = size * (entry.effect ? .031 : .019);
    context.fillStyle = "#bfa071";
    context.fillRect(left + size*.075, top + size*.24, Math.max(1,size*.008), size*.62);
    for (let i = 0; i < steps; i += 1) {
      const x = i / steps, wave = Math.sin(x * Math.PI * 3 - seconds * 2.6) * amplitude * x;
      const swell = 1 + Math.cos(x * Math.PI * 3 - seconds * 2.6) * .018 * x;
      context.drawImage(entry.image, sourceWidth * (1 + x), 0, sourceWidth / steps, sourceHeight,
        left + x * size, top + wave + size * (1 - swell) / 2, size / steps + .6, size * swell);
    }
    entry.node.classList.add('collection-flag-ready');
  }
  function tick(now) {
    frame = 0;
    let again = false;
    entries.forEach(entry => {
      if (!entry.node.isConnected) { observer?.unobserve(entry.node); resizeObserver?.unobserve(entry.node); entries.delete(entry); return; }
      const active = allowed(entry);
      entry.node.toggleAttribute('data-collection-paused', !active);
      if (!active) { entry.last = 0; return; }
      if (entry.canvas && entry.image?.complete && entry.image.naturalWidth) {
        entry.elapsed += entry.last ? Math.min((now - entry.last) / 1000, .05) : 0;
        entry.elapsed %= Math.PI * 10;
        entry.last = now;
        drawFlag(entry, entry.elapsed);
        again = true;
      }
    });
    if (again) frame = requestAnimationFrame(tick);
  }
  function refresh() {
    entries.forEach(entry => {
      if (!entry.node.isConnected) { observer?.unobserve(entry.node); resizeObserver?.unobserve(entry.node); entries.delete(entry); return; }
      entry.node.toggleAttribute('data-collection-paused', !allowed(entry));
      if (!allowed(entry)) entry.last = 0;
    });
    if (!frame && [...entries].some(entry => entry.canvas && entry.image?.complete && entry.image.naturalWidth && allowed(entry))) frame = requestAnimationFrame(tick);
  }
  function mount(container) {
    const node = container?.querySelector?.('[data-collection-theme]');
    if (!node?.dataset?.collectionTheme) return;
    refresh();
    if ([...entries].some(item => item.node === node)) return;
    const entry = {node, effect: Number(node.dataset.effect), visible: typeof IntersectionObserver === 'undefined', elapsed: 0, last: 0};
    entry.canvas = node.querySelector('.collection-flag-canvas');
    entries.add(entry);
    if (entry.canvas) {
      entry.image = new Image();
      entry.image.addEventListener('load', () => { if (node.isConnected) { drawFlag(entry, 0); refresh(); } }, {once: true});
      entry.image.src = '/seasonal-collection/national.webp';
    }
    if (typeof IntersectionObserver !== 'undefined') {
      observer ||= new IntersectionObserver(changes => {
        changes.forEach(change => entries.forEach(item => { if (item.node === change.target) item.visible = change.isIntersecting; }));
        refresh();
      });
      observer.observe(node);
    }
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver ||= new ResizeObserver(changes => changes.forEach(change => entries.forEach(item => {
        if (item.node === change.target && item.canvas) drawFlag(item, item.elapsed);
      })));
      resizeObserver.observe(node);
    }
    if (!mutationObserver && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(refresh);
      mutationObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-seasonal-motion','data-theme']});
      document.querySelectorAll('dialog, .settings-overlay, #bootSplash, #seasonalPreview').forEach(element =>
        mutationObserver.observe(element, {attributes: true, attributeFilter: ['open','class','aria-hidden','data-seasonal-motion']}));
      document.addEventListener('visibilitychange', refresh);
    }
    refresh();
  }
  return {has: id => ids.includes(id), scene, mount, refresh,
    corner: id => ids.includes(id) ? cell(id, 2, 'seasonal-corner-art') : ''};
})();

'use strict';

/* Independent transparent layers. No whole-scene deformation or frame crossfade. */
window.QuickJiraSeasonalCollection = (() => {
  const ids = ['newyear','lantern','womensday','hungking','doanngo','family','vulan','national','vietwomen','culture'];
  const entries = new Set();
  let frame = 0, observer, resizeObserver, mutationObserver, cellSerial = 0;
  function cell(id, index, className) {
    // A rectangular SVG viewport has letterbox space outside its square viewBox.
    // Clipping only the viewport lets neighbouring sprite cells paint there.
    // Clip in image coordinates and use unique IDs across every mounted scene.
    const clip = 'qjl-holiday-cell-' + (++cellSerial);
    return '<svg class="' + className + '" viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet" overflow="hidden" aria-hidden="true" focusable="false">'
      + '<defs><clipPath id="' + clip + '" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="1" height="1"/></clipPath></defs>'
      + '<image clip-path="url(#' + clip + ')" x="' + (-index) + '" y="0" width="3" height="1" preserveAspectRatio="none" href="/seasonal-collection/' + id + '.webp"/></svg>';
  }
  function backdrop(id, mode) {
    const clip = 'qjl-holiday-cell-' + (++cellSerial);
    // Source is two stacked complete 3:1 scenes. Crop in source coordinates, including
    // letterbox space: changing mode never changes the common 3:1 scene plane.
    return '<svg class="collection-backdrop collection-backdrop-' + mode + '" viewBox="0 0 3 1" preserveAspectRatio="xMidYMid meet" overflow="hidden" aria-hidden="true" focusable="false">'
      + '<defs><clipPath id="' + clip + '" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="3" height="1"/></clipPath></defs>'
      + '<image clip-path="url(#' + clip + ')" x="0" y="' + (mode === 'light' ? -1 : 0) + '" width="3" height="2" preserveAspectRatio="none" href="/seasonal-banners/' + id + '.webp"/></svg>';
  }
  const shapes = {
    tulip: '<defs><radialGradient id="petal-t"><stop stop-color="#ffe1ec"/><stop offset=".7" stop-color="#ec7fa7"/><stop offset="1" stop-color="#a73d65"/></radialGradient></defs><path fill="url(#petal-t)" d="M8 4C28 0 36 19 19 34 8 31 1 16 8 4Z"/><path fill="none" stroke="#ffe9ef" stroke-opacity=".5" stroke-width=".5" d="M10 7Q25 19 19 31"/>',
    rose: '<defs><radialGradient id="petal-r"><stop stop-color="#ffcbd9"/><stop offset=".7" stop-color="#d9688a"/><stop offset="1" stop-color="#8c294c"/></radialGradient></defs><path fill="url(#petal-r)" d="M4 7C13 0 29 2 35 12 34 29 18 34 12 30 11 18 2 17 4 7Z"/><path fill="none" stroke="#ffd6e1" stroke-opacity=".4" stroke-width=".5" d="M8 9Q23 12 17 28"/>',
    bamboo: '<path fill="#538b43" d="M4 33C7 14 22 3 37 2 32 17 17 32 4 33Z"/><path fill="none" stroke="#b7cb6c" d="M5 32 34 5"/>',
    lotus: '<defs><linearGradient id="petal-l" x2="0" y2="1"><stop stop-color="#bb4a80"/><stop offset="1" stop-color="#ffe1ee"/></linearGradient></defs><path fill="url(#petal-l)" d="M20 2C38 18 29 31 19 35 6 29 4 16 20 2Z"/><path fill="none" stroke="#ffe5ef" stroke-width=".5" d="M20 5 19 32"/>'
  };
  function gardenLight() {
    return '<span class="collection-garden-rays"></span><span class="collection-leaf-shadows"></span>';
  }
  function waterLight() {
    return '<span class="collection-water-light"><i></i><i></i><i></i></span>';
  }
  function petals(kind, effect) {
    ++cellSerial;
    return '<span class="collection-petals">' + Array.from({length: effect ? 7 : 4}, (_, i) =>
      '<i style="--x:' + (25 + (i * 29) % 70) + '%;--delay:' + (-i * 1.7) + 's;--duration:' + (6.4 + i % 3) + 's">'
      + '<svg viewBox="0 0 40 38" aria-hidden="true">' + shapes[kind].replace(/petal-([trl])/g, 'petal-$1-' + cellSerial + '-' + i) + '</svg></i>').join('') + '</span>';
  }
  function clouds() {
    return '<svg class="collection-clouds" viewBox="0 0 960 300" aria-hidden="true"><g><path fill="currentColor" d="M80 217c8-15 28-22 42-13 7-24 38-28 52-11 19-11 43 2 43 18 26-1 46 14 52 28H65c-2-11 4-18 15-22Z"/><path fill="currentColor" d="M460 252c10-17 31-21 46-12 11-25 46-24 57-3 26-9 49 5 51 22 30-1 48 12 51 27H435c-1-17 10-28 25-34Z"/></g></svg>';
  }
  function fireworks() {
    return '<span class="collection-fireworks-real">' + [0,1].map(burst => '<span class="collection-spark-burst" style="--burst:'+burst+'">'+Array.from({length:24},(_,i)=>{
      const angle=i*Math.PI/12, speed=14+(i%4)*3;
      return '<i style="--dx:'+ (Math.cos(angle)*speed).toFixed(2)+'cqw;--dy:'+(Math.sin(angle)*speed*.45).toFixed(2)+'cqw;--lag:'+(-burst*3.1)+'s;--spark:'+i+'"></i>';
    }).join('')+'</span>').join('')+'</span>';
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
    return '<svg class="collection-ripple" viewBox="0 0 300 100" aria-hidden="true">'
      + '<ellipse cx="120" cy="72" rx="45" ry="2"/><ellipse class="second" cx="120" cy="72" rx="45" ry="2"/></svg>';
  }
  function festivalFlag() {
    return '<svg class="collection-festival-flag" viewBox="0 0 100 100" aria-hidden="true"><path d="M22 25V89" stroke="#b98d56" stroke-width="2"/>'
      + '<g><path fill="#d53934" d="M23 27q20-7 43 0v32q-22-8-43 0Z"/>'
      + '<path fill="#e6bc42" d="M27 31q18-5 35 0v23q-17-5-35 0Z"/>'
      + '<path fill="#458665" d="M31 35q13-4 27 0v14q-14-3-27 0Z"/></g></svg>';
  }
  function scene(id, effect = 0) {
    if (!ids.includes(id)) return '';
    let ambient = '', subject = '', foreground = '';
    const object = (markup, extra = '') => '<span class="collection-part collection-subject ' + extra + '">' + markup + '</span>';
    // Two distinct compositions per theme, not the same animation at another speed.
    if (id === 'newyear') {
      subject = object(cell(id, 1, 'collection-subject-image') + clockHands());
      if (effect) ambient += fireworks();
    }
    if (id === 'lantern') {
      subject = object(cell(id, 1, 'collection-subject-image'));
      if (effect) ambient += waterLight();
    }
    if (id === 'womensday') foreground += effect ? gardenLight() : petals('tulip', 0);
    if (id === 'doanngo') {
      subject = object(cell(id, 1, 'collection-subject-image'));
      if (effect) foreground += petals('bamboo', 0);
    }
    if (id === 'family') {
      subject = object(effect ? '' : steam());
      ambient += effect ? gardenLight() : '';
    }
    if (id === 'vulan') {
      subject = object(cell(id, 1, 'collection-subject-image') + flame());
      ambient += effect ? petals('lotus', 0) : ripple();
    }
    if (id === 'hungking') ambient += effect ? gardenLight() : '<span class="collection-mist"></span>';
    if (id === 'national') {
      subject = object(cell(id, 1, 'collection-subject-image')
        + '<canvas class="collection-flag-canvas" aria-hidden="true"></canvas>');
      if (effect) ambient += gardenLight();
    }
    if (id === 'vietwomen') foreground += effect ? gardenLight() : petals('rose', 0);
    if (id === 'culture') ambient += effect ? '<span class="collection-lantern-light"></span>' : '<span class="collection-bronze-gleam"></span>';
    if (effect && ['womensday','vietwomen','family','hungking'].includes(id)) foreground += '<canvas class="collection-scene-canvas" aria-hidden="true"></canvas>';
    return '<span class="seasonal-composed collection-' + id + ' collection-scenic" data-collection-theme="' + id + '" data-effect="' + (effect === 1 ? 1 : 0) + '">'
      + '<span class="collection-plane">' + backdrop(id, 'dark') + backdrop(id, 'light')
      + ambient + subject + foreground + '</span></span>';
  }
  function allowed(entry) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
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
    if (entry.contextLost || !entry.image?.complete || !entry.image.naturalWidth || !entry.canvas) return;
    const canvas = entry.canvas, rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (entry.gpu === undefined) entry.gpu = window.QuickJiraSeasonalShader?.create(canvas, entry.image, entry.theme, entry.effect) || null;
    if (entry.gpu) {
      if (entry.drawWidth !== rect.width || entry.drawHeight !== rect.height) {
        entry.gpu.resize(rect.width, rect.height); entry.drawWidth = rect.width; entry.drawHeight = rect.height;
      }
      if (entry.gpu.draw(seconds)) { entry.mode = document.documentElement.dataset?.theme; entry.node.classList.add(entry.theme === 'national' ? 'collection-flag-ready' : 'collection-scene-ready'); return; }
      return; // Context restoration rebuilds the GPU renderer; never switch context type in place.
    }
    if (entry.theme !== 'national') return; // Static scene remains intact when WebGL is unavailable.
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const context = entry.context || (entry.context = canvas.getContext('2d'));
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const sourceWidth = entry.image.naturalWidth / 3, sourceHeight = entry.image.naturalHeight;
    const size = Math.min(width,height), left = (width-size)/2, top = (height-size)/2;
    const steps = 96, amplitude = size * .038;
    if (!entry.node.classList.contains('collection-scenic')) {
      context.fillStyle = "#bfa071";
      context.fillRect(left + size*.075, top + size*.24, Math.max(1,size*.008), size*.62);
    }
    for (let i = 0; i < steps; i += 1) {
      const x = i / steps, free = Math.max(0,(x-.08)/.92);
      const phase = free*9.2-seconds*4.2;
      const wave = (Math.sin(phase)+.28*Math.sin(phase*1.73+seconds*.7))*amplitude*free;
      const swell = 1 + Math.cos(phase) * .028 * free;
      context.drawImage(entry.image, sourceWidth * (1 + x), 0, sourceWidth / steps, sourceHeight,
        left + x * size, top + wave + size * (1 - swell) / 2, size / steps + .6, size * swell);
    }
    entry.node.classList.add('collection-flag-ready');
  }
  function tick(now) {
    frame = 0;
    let again = false;
    entries.forEach(entry => {
      if (!entry.node.isConnected) { observer?.unobserve(entry.node); resizeObserver?.unobserve(entry.node); entry.gpu?.dispose(); entries.delete(entry); return; }
      const active = allowed(entry);
      entry.node.toggleAttribute('data-collection-paused', !active);
      if (!active) { entry.last = 0; return; }
      if (entry.canvas && !entry.contextLost && entry.image?.complete && entry.image.naturalWidth) {
        entry.elapsed += entry.last ? Math.min((now - entry.last) / 1000, .05) : 0;
        entry.last = now;
        drawFlag(entry, entry.elapsed);
        again = true;
      }
    });
    if (again) frame = requestAnimationFrame(tick);
  }
  function refresh() {
    entries.forEach(entry => {
      if (!entry.node.isConnected) { observer?.unobserve(entry.node); resizeObserver?.unobserve(entry.node); entry.gpu?.dispose(); entries.delete(entry); return; }
      if (entry.gpu && entry.mode !== document.documentElement.dataset?.theme) drawFlag(entry, entry.elapsed);
      entry.node.toggleAttribute('data-collection-paused', !allowed(entry));
      if (!allowed(entry)) entry.last = 0;
    });
    if (!frame && [...entries].some(entry => entry.canvas && !entry.contextLost && entry.image?.complete && entry.image.naturalWidth && allowed(entry))) frame = requestAnimationFrame(tick);
  }
  function mount(container) {
    const node = container?.querySelector?.('[data-collection-theme]');
    if (!node?.dataset?.collectionTheme) return;
    refresh();
    if ([...entries].some(item => item.node === node)) return;
    const entry = {node, theme:node.dataset.collectionTheme, effect: Number(node.dataset.effect), visible: typeof IntersectionObserver === 'undefined', elapsed: 0, last: 0};
    entry.canvas = node.querySelector('.collection-flag-canvas') || node.querySelector('.collection-scene-canvas');
    entries.add(entry);
    if (entry.canvas) {
      entry.canvas.addEventListener?.('webglcontextlost', event => { event.preventDefault(); entry.contextLost = true; entry.node.classList.remove?.('collection-flag-ready'); entry.node.classList.remove?.('collection-scene-ready'); });
      entry.canvas.addEventListener?.('webglcontextrestored', () => { entry.contextLost = false; delete entry.gpu; entry.drawWidth = 0; drawFlag(entry, entry.elapsed); refresh(); });
      entry.image = new Image();
      entry.image.addEventListener('load', () => { if (node.isConnected) { drawFlag(entry, 0); refresh(); } }, {once: true});
      entry.image.src = entry.theme === 'national' ? '/seasonal-collection/national.webp' : '/seasonal-banners/' + entry.theme + '.webp';
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
      window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', refresh);
    }
    refresh();
  }
  return {has: id => ids.includes(id), scene, mount, refresh,
    corner: id => ids.includes(id) ? cell(id, 2, 'seasonal-corner-art') : ''};
})();

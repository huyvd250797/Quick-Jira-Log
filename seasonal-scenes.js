'use strict';

window.QuickJiraSeasonalScenes = (() => {
  const shader = window.QuickJiraSeasonalShader;
  const themes = {
    tet: [['mai', 8, 48, 94], ['mai', 13, 46, 96]],
    vacation: [null, null],
    april: [null, null],
    children: [['ribbon', 5, 64, 95], ['bubble', 9, 49, 95]],
    birthday: [null, ['confetti', 9, 46, 93]],
    moon: [null, null],
    school: [['phuong', 7, 43, 92], ['phuong', 11, 36, 94]],
    halloween: [['bat', 3, 46, 79], ['bat', 5, 53, 94]],
    teachers: [['sunpetal', 7, 51, 93], ['sunpetal', 11, 47, 96]],
    christmas: [['snow', 10, 38, 98], ['snow', 15, 35, 98]]
  };

  const sprites = {
    mai: '<path fill="#f6a80b" d="M28 34C22 29 5 24 5 14 4 6 11 2 17 6 22 0 33 3 36 10 42 18 34 29 28 34Z"/><path fill="#ffda34" d="M27 30C21 24 8 20 8 12 9 7 14 6 17 9 21 4 28 4 32 9 38 15 31 27 27 30Z"/><path fill="none" stroke="#ffef88" stroke-width="1.4" d="M27 28C25 20 21 14 16 11M27 28c1-7 4-13 5-14"/>',
    phuong: '<path fill="#a31e22" d="M24 34C22 27 5 26 4 15 4 9 8 6 12 7 11 2 19 1 21 6 26 0 34 2 33 7 44 5 46 14 40 18 45 24 34 29 24 34Z"/><path fill="#ed492c" d="M24 30C17 24 6 23 7 14 7 9 13 12 14 8 17 2 21 8 23 8 28 4 30 7 32 10 38 7 41 11 38 16 44 20 33 27 24 30Z"/><path fill="none" stroke="#ff9c52" stroke-width="1.5" d="M24 30c1-8 2-15 7-20M23 28c-3-5-8-10-13-10"/>',
    sunpetal: '<path fill="#e99714" d="M24 35C20 23 10 18 11 9 12 3 15 2 18 1 25 4 30 9 30 16 32 24 26 30 24 35Z"/><path fill="#ffcf3d" d="M23 31C20 22 13 17 14 10 14 6 16 4 18 3 26 7 27 13 27 19 28 24 25 29 23 31Z"/><path fill="none" stroke="#ffec7d" stroke-width="1" d="M23 30C22 19 19 11 17 8"/>',
    bat: '<path class="seasonal-bat-left" fill="#100b1c" d="M24 20C18 11 11 9 1 8c5 3 6 7 5 13 5-2 7 0 9 4 3-2 6 0 9 2Z"/><path class="seasonal-bat-right" fill="#100b1c" d="M24 20C30 11 37 9 47 8c-5 3-6 7-5 13-5-2-7 0-9 4-3-2-6 0-9 2Z"/><path fill="#21152b" d="m20 17 1-6 3 4 3-4 1 6c1 6-1 10-4 13-3-3-5-7-4-13Z"/>'
  };

  function particles([kind, count, from, to]) {
    const shape = sprites[kind] ? `<svg viewBox="0 0 48 36" focusable="false">${sprites[kind]}</svg>` : '';
    const marks = Array.from({ length: count }, (_, index) => {
      const spread = ((index * 47) % 101) / 100;
      const x = (from + (to - from) * spread).toFixed(1);
      const speed = ((kind === 'bat' ? 5.2 : 4.2) + (index % 5) * .49).toFixed(2);
      const phase = (-index * .71).toFixed(2);
      const size = shape ? 12 + (index * 3) % 8 : 3 + (index * 3) % 7;
      return `<i style="--x:${x}%;--speed:${speed}s;--phase:${phase}s;--size:${size}px">${shape}</i>`;
    }).join('');
    return `<span class="seasonal-scene-layer seasonal-${kind}" aria-hidden="true">${marks}</span>`;
  }

  const entries = new Set();
  let frame = 0;
  let visibilityObserver;
  let sizeObserver;
  let watching = false;

  function canAnimate(entry) {
    if (!entry.visible || document.hidden || !entry.canvas.isConnected) return false;
    const owner = entry.canvas.closest('#seasonalPreview') || document.documentElement;
    if (!owner.hasAttribute('data-seasonal-motion')) return false;
    if (owner === document.documentElement) {
      const splash = document.getElementById('bootSplash');
      if (entry.canvas.closest('#bootSplash')) return !!splash && !splash.classList.contains('leaving');
      if (splash && !splash.classList.contains('leaving')) return false;
      return !document.querySelector('dialog[open], .settings-overlay[aria-hidden="false"]');
    }
    return !!owner.closest('dialog[open]');
  }

  function playFallback(entry) {
    if (!entry.video) {
      const video = document.createElement('video');
      const variant = ['birthday', 'halloween'].includes(entry.id) ? 0 : entry.effect;
      video.className = 'seasonal-surface';
      video.setAttribute('aria-hidden', 'true');
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = true;
      video.preload = 'none';
      const revision = entry.id === 'april' || entry.id === 'moon' ? '-v2' : '';
      video.src = `/seasonal-motion/${entry.id}-${variant}${revision}.mp4`;
      video.addEventListener('playing', () => {
        if (canAnimate(entry) && !entry.renderer) video.classList.add('is-ready');
        else video.pause();
      });
      video.addEventListener('error', () => video.classList.remove('is-ready'));
      entry.canvas.after(video);
      entry.video = video;
    }
    if (entry.video.paused && !entry.playPending) {
      entry.playPending = true;
      entry.video.play().catch(() => {}).finally(() => { entry.playPending = false; });
    }
  }

  function paint(entry, now) {
    if (!canAnimate(entry)) {
      entry.last = 0;
      if (entry.video && !entry.video.paused) entry.video.pause();
      return false;
    }
    if (!entry.image.complete || !entry.image.naturalWidth) return false;
    if (entry.renderer === undefined) {
      try { entry.renderer = shader.create(entry.canvas, entry.image, entry.id, entry.effect); }
      catch { entry.renderer = null; }
    }
    if (!entry.renderer) { playFallback(entry); return false; }
    if (entry.resize) {
      const { clientWidth, clientHeight } = entry.canvas;
      if (!clientWidth || !clientHeight) return false;
      entry.renderer.resize(clientWidth, clientHeight);
      entry.resize = false;
    }
    entry.elapsed = (entry.elapsed + (entry.last ? Math.min((now - entry.last) / 1000, .05) : 0)) % 6;
    entry.last = now;
    const drew = entry.renderer.draw(entry.elapsed);
    if (drew && !entry.ready) {
      entry.ready = true;
      entry.canvas.classList.add('is-ready');
      if (entry.video) { entry.video.pause(); entry.video.classList.remove('is-ready'); }
    }
    return drew;
  }

  function animate(now) {
    frame = 0;
    let anyActive = false;
    entries.forEach(entry => { if (paint(entry, now)) anyActive = true; });
    if (anyActive) frame = requestAnimationFrame(animate);
  }

  function wake() {
    if (!frame && entries.size) frame = requestAnimationFrame(animate);
  }

  function refresh() {
    entries.forEach(entry => {
      if (entry.canvas.isConnected) return;
      visibilityObserver?.unobserve(entry.canvas);
      sizeObserver?.unobserve(entry.canvas);
      entry.renderer?.dispose();
      if (entry.video) { entry.video.pause(); entry.video.removeAttribute('src'); entry.video.load(); }
      entries.delete(entry);
    });
    wake();
  }

  function mount(container, id, effect) {
    if (!container) return;
    container.innerHTML = id ? scene(id, effect) : '';
    refresh();
    const canvas = container.querySelector?.('canvas[data-seasonal-surface]');
    if (!canvas?.addEventListener) return;
    const image = container.querySelector('img');
    const entry = { canvas, image, id, effect, resize: true, ready: false,
      visible: typeof IntersectionObserver === 'undefined', elapsed: 0, last: 0 };
    entries.add(entry);
    image.addEventListener('load', wake, { once: true });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      entry.renderer = null;
      entry.ready = false;
      entry.last = 0;
      canvas.classList.remove('is-ready');
      wake();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      entry.renderer = undefined;
      entry.resize = true;
      wake();
    });
    if (typeof IntersectionObserver !== 'undefined') {
      visibilityObserver ||= new IntersectionObserver(changes => {
        entries.forEach(target => {
          const visibility = changes.find(change => change.target === target.canvas);
          if (visibility) target.visible = visibility.isIntersecting;
        });
        wake();
      });
      visibilityObserver.observe(canvas);
    }
    if (typeof ResizeObserver !== 'undefined') {
      sizeObserver ||= new ResizeObserver(changes => {
        entries.forEach(target => {
          if (changes.some(change => change.target === target.canvas)) target.resize = true;
        });
        wake();
      });
      sizeObserver.observe(canvas);
    }
    if (typeof MutationObserver !== 'undefined' && !watching) {
      watching = true;
      const watcher = new MutationObserver(refresh);
      document.querySelectorAll('dialog, .settings-overlay, #bootSplash').forEach(node => {
        watcher.observe(node, { attributes: true, attributeFilter: ['open', 'aria-hidden', 'class'] });
      });
    }
    wake();
  }

  function scene(id, effect) {
    if (!Object.hasOwn(themes, id)) return '';
    // Teachers Day has separate authored artwork for each mode; CSS switches
    // immediately without remounting particles or changing the active schedule.
    const base = id === 'teachers'
      ? '<img class="seasonal-photo seasonal-scene-base seasonal-photo-dark" src="/seasonal-art/teachers.webp" alt="" decoding="async" draggable="false">'
        + '<img class="seasonal-photo seasonal-scene-base seasonal-photo-light" src="/seasonal-art/teachers-light.webp" alt="" decoding="async" draggable="false">'
      : `<img class="seasonal-photo seasonal-scene-base" src="/seasonal-art/${id}.webp" alt="" decoding="async" draggable="false">`;
    const surface = shader?.kinds[id]
      ? '<canvas class="seasonal-surface" data-seasonal-surface aria-hidden="true"></canvas>'
      : '';
    const overlay = themes[id][effect];
    return base + surface + (overlay ? particles(overlay) : '');
  }

  function corner(id) {
    if (!Object.hasOwn(themes, id)) return '';
    return `<img class="seasonal-corner-art" src="/seasonal-art/${id}.webp" alt="" decoding="async" draggable="false">`;
  }

  return { scene, corner, mount, refresh };
})();

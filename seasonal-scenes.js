'use strict';

window.QuickJiraSeasonalScenes = (() => {
  const themes = {
    tet: [['petal', 7, 54, 98], ['petal', 11, 53, 98]],
    vacation: [['surf', 4, 45, 94], ['leaf', 6, 72, 99]],
    april: [null, null],
    children: [['ribbon', 5, 64, 95], ['bubble', 9, 49, 95]],
    birthday: [['spark', 6, 68, 83], ['confetti', 11, 57, 97]],
    moon: [['cloud', 3, 45, 94], ['glow', 6, 70, 93]],
    school: [['leaf', 6, 57, 93], ['leaf', 9, 54, 96]],
    halloween: [['ember', 6, 66, 88], ['mist', 4, 45, 96]],
    teachers: [['petal', 7, 59, 94], ['petal', 10, 56, 97]],
    christmas: [['snow', 10, 38, 98], ['snow', 15, 35, 98]]
  };

  function particles([kind, count, from, to]) {
    const marks = Array.from({ length: count }, (_, index) => {
      const spread = ((index * 47) % 101) / 100;
      const x = (from + (to - from) * spread).toFixed(1);
      const speed = (4.2 + (index % 5) * .49).toFixed(2);
      const phase = (-index * .71).toFixed(2);
      const size = 3 + (index * 3) % 7;
      return `<i style="--x:${x}%;--speed:${speed}s;--phase:${phase}s;--size:${size}px"></i>`;
    }).join('');
    return `<span class="seasonal-scene-layer seasonal-${kind}" aria-hidden="true">${marks}</span>`;
  }

  // The flag is drawn once as cloth texture. Only its geometry moves each frame.
  let flagTexture;
  function texture() {
    if (flagTexture) return flagTexture;
    flagTexture = document.createElement('canvas');
    flagTexture.width = 252;
    flagTexture.height = 168;
    const ctx = flagTexture.getContext('2d');
    const red = ctx.createLinearGradient(0, 0, 0, 168);
    red.addColorStop(0, '#ef3547');
    red.addColorStop(.48, '#d01c36');
    red.addColorStop(1, '#90122a');
    ctx.fillStyle = red;
    ctx.fillRect(0, 0, 252, 168);
    const gold = ctx.createLinearGradient(0, 24, 0, 109);
    gold.addColorStop(0, '#fff3a2');
    gold.addColorStop(1, '#ffcb49');
    ctx.fillStyle = gold;
    ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const angle = point * Math.PI / 5 - Math.PI / 2;
      const radius = point % 2 ? 17 : 43;
      ctx.lineTo(126 + Math.cos(angle) * radius, 84 + Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    return flagTexture;
  }

  const flags = new Set();
  let frame = 0;

  function drawFlag({ ctx, gust }, seconds) {
    const cloth = texture();
    const wave = (gust ? 5.1 : 3.6) * seconds;
    ctx.clearRect(0, 0, 324, 190);
    const pole = ctx.createLinearGradient(14, 0, 27, 0);
    pole.addColorStop(0, '#77504a');
    pole.addColorStop(.55, '#ffdbab');
    pole.addColorStop(1, '#6b3f38');
    ctx.fillStyle = pole;
    ctx.fillRect(15, 6, 10, 184);
    ctx.beginPath();
    ctx.arc(20, 7, 6, 0, 2 * Math.PI);
    ctx.fill();
    for (let x = 0; x < 252; x += 6) {
      const along = x / 252;
      const phase = along * 9.6 - wave;
      const amplitude = (gust ? 22 : 16) * along;
      const y = 23 + along * 3 + Math.sin(phase) * amplitude;
      const height = 146 - along * 7 + Math.cos(phase) * (gust ? 9 : 6) * along;
      const strip = Math.min(7, 252 - x);
      ctx.drawImage(cloth, x, 0, strip, 168, 23 + x, y, strip, height);
      const shade = Math.sin(phase + .6) * .21 * along;
      ctx.fillStyle = shade < 0 ? '#261030' : '#ffdbb3';
      ctx.globalAlpha = Math.abs(shade);
      ctx.fillRect(23 + x, y, strip, height);
      ctx.globalAlpha = 1;
    }
  }

  function canAnimate(flag) {
    if (!flag.visible || document.hidden || !flag.canvas.isConnected) return false;
    const owner = flag.canvas.closest('#seasonalPreview') || document.documentElement;
    if (!owner.hasAttribute('data-seasonal-motion')) return false;
    if (owner === document.documentElement) {
      const splash = document.getElementById('bootSplash');
      if (flag.canvas.closest('#bootSplash')) return !!splash && !splash.classList.contains('leaving');
      if (splash && !splash.classList.contains('leaving')) return false;
      return !document.querySelector('dialog[open], .settings-overlay[aria-hidden="false"]');
    }
    return !!owner.closest('dialog[open]');
  }

  function animate(now) {
    frame = 0;
    let anyActive = false;
    flags.forEach(flag => {
      if (!canAnimate(flag)) { flag.last = 0; return; }
      flag.elapsed += flag.last ? Math.min((now - flag.last) / 1000, .05) : 0;
      flag.last = now;
      drawFlag(flag, flag.elapsed);
      anyActive = true;
    });
    if (anyActive) frame = requestAnimationFrame(animate);
  }

  function wake() {
    if (!frame && flags.size) frame = requestAnimationFrame(animate);
  }

  let observer;
  function refresh() {
    flags.forEach(flag => {
      if (flag.canvas.isConnected) return;
      observer?.unobserve(flag.canvas);
      flags.delete(flag);
    });
    wake();
  }

  function mount(container, id, effect) {
    if (!container) return;
    container.innerHTML = id ? scene(id, effect) : '';
    refresh();
    const canvas = container.querySelector?.('canvas[data-seasonal-flag]');
    const ctx = canvas?.getContext?.('2d', { alpha: true });
    if (!ctx) return;
    const flag = { canvas, ctx, gust: effect === 1, visible: typeof IntersectionObserver === 'undefined', elapsed: 0, last: 0 };
    flags.add(flag);
    drawFlag(flag, 0);
    if (typeof IntersectionObserver !== 'undefined') {
      observer ||= new IntersectionObserver(entries => {
        for (const entry of entries) {
          const tracked = [...flags].find(item => item.canvas === entry.target);
          if (tracked) tracked.visible = entry.isIntersecting;
        }
        wake();
      });
      observer.observe(canvas);
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
  let watching = false;

  function scene(id, effect) {
    if (!Object.hasOwn(themes, id)) return '';
    const source = id === 'april' ? 'april-palace' : id;
    const base = `<img class="seasonal-photo seasonal-scene-base seasonal-art-${source}" src="/seasonal-art/${source}.webp" alt="" decoding="async" draggable="false">`;
    return base + (id === 'april'
      ? '<canvas class="seasonal-flag" data-seasonal-flag width="324" height="190" aria-hidden="true"></canvas>'
      : particles(themes[id][effect]));
  }

  function corner(id) {
    if (!Object.hasOwn(themes, id)) return '';
    return `<img class="seasonal-corner-art" src="/seasonal-art/${id}.webp" alt="" decoding="async" draggable="false">`;
  }

  return { scene, corner, mount, refresh };
})();

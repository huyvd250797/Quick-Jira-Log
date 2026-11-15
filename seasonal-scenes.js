'use strict';

window.QuickJiraSeasonalScenes = (() => {
  const particles = (kind, marks) => `<span class="seasonal-scene-layer seasonal-particles seasonal-${kind}" aria-hidden="true">${marks.map(([x, y, size]) =>
    `<i style="--x:${x}%;--y:${y}%;--size:${size}px"></i>`).join('')}</span>`;

  const effects = {
    tet: [() => particles('petals', [[70, 32, 7], [81, 51, 5], [87, 37, 6]]), photo => photo('sway')],
    vacation: [photo => photo('shore'), photo => photo('sway')],
    april: [photo => photo('sway'), photo => photo('glimmer')],
    children: [photo => photo('sway'), () => particles('bubbles', [[64, 70, 8], [77, 54, 11], [89, 76, 7]])],
    birthday: [photo => photo('glimmer'), () => particles('confetti', [[58, 55, 5], [70, 67, 7], [83, 52, 5], [92, 40, 6]])],
    moon: [photo => photo('sway'), photo => photo('mist')],
    school: [photo => photo('page'), () => particles('leaves', [[67, 25, 7], [78, 41, 6], [91, 18, 8]])],
    halloween: [photo => photo('glimmer'), photo => photo('mist')],
    teachers: [() => particles('petals', [[69, 34, 6], [81, 56, 5], [89, 30, 6]]), photo => photo('glimmer')],
    christmas: [() => particles('snow', [[56, 18, 2], [64, 39, 3], [74, 17, 2], [86, 48, 3], [93, 23, 2]]), photo => photo('glimmer')]
  };

  function scene(id, effect) {
    if (!Object.hasOwn(effects, id)) return '';
    const url = `/seasonal-art/${id}.webp`;
    const photo = motion => motion === 'glimmer' || motion === 'mist'
      ? `<span class="seasonal-scene-layer seasonal-wash seasonal-${motion}"></span>`
      : `<img class="seasonal-photo ${motion ? `seasonal-scene-layer seasonal-${motion}` : 'seasonal-scene-base'}" src="${url}" alt="" decoding="async" draggable="false">`;
    return photo() + effects[id][effect](photo);
  }

  function corner(id) {
    if (!Object.hasOwn(effects, id)) return '';
    return `<img class="seasonal-corner-art" src="/seasonal-art/${id}.webp" alt="" decoding="async" draggable="false">`;
  }

  return { scene, corner };
})();

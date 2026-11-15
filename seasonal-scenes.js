'use strict';

window.QuickJiraSeasonalScenes = (() => {
  const svg = (body, className) =>
    `<svg class="${className}" viewBox="0 0 300 112" width="300" height="112" focusable="false" aria-hidden="true">${body}</svg>`;
  const path = (d, fill, stroke = 'none', width = 1) =>
    `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  const ellipse = (x, y, rx, ry, fill) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
  const rect = (x, y, w, h, fill, radius = 0) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
  const group = (transform, body) => `<g transform="${transform}">${body}</g>`;
  const star = 'M0 -13 3.6 -4 13 -4 5.7 2.4 8 12 0 6.6 -8 12 -5.7 2.4 -13 -4 -3.6 -4Z';
  const gold = '#ffd27a';
  const flower = (x, y, color = '#ffcb59') => group(`translate(${x} ${y})`, [
    ...[0, 72, 144, 216, 288].map(angle => group(`rotate(${angle})`, ellipse(0, -5.2, 3.7, 5.8, color))),
    dot(0, 0, 2.3, '#dc8134')
  ].join(''));
  const palm = path('M254 21q-26-15-52 0 26-8 49 6-30-4-47 21 24-17 50-18-20 11-22 30 11-18 25-28 17 3 30 24-6-25-25-31 22-7 37 3-14-16-40-7', '#70a96b')
    + path('M255 24q2 2 4 0-1 8-6 9z', '#dbbb68');
  const palace = rect(181, 69, 104, 24, '#874147', 2)
    + path('M174 70h116m-108-4h101m-94-8h84l9 8m-86 5v17m10-17v17m10-17v17m10-17v17m10-17v17m10-17v17m10-17v17m10-17v17m10-17v17m-99 4h114m-69-35v-8', 'none', '#e7ab72', 1.4);
  const flag = path('M123 16c42-26 75 15 117-3l2 39c-40 16-76-19-118 5z', '#c3293e')
    + path('M124 35c38-25 84 15 117-3l1 20c-40 16-76-19-118 5z', '#a0142d')
    + group('translate(180 30) rotate(8) scale(.95)', path(star, '#ffde69'));
  const kite = path('M211 15l-29 19 26 26 32-17z', '#f5b14c')
    + path('M211 15l-3 45-26-26z', '#f38684')
    + path('m182 34 58 9-32 17z', '#45c6c6')
    + path('M208 60q5 9 19 10t20 14 20 6', 'none', '#f0af75', 1.6);
  const cake = ellipse(225, 86, 43, 5, '#a75f8f') + rect(191, 53, 68, 29, '#cf82ae', 7)
    + rect(191, 65, 68, 6, '#ffe3cc', 3) + ellipse(225, 55, 34, 9, '#ffe3cc')
    + path('M192 57q6 13 13 5t14 0 14 0 14 0 11-6', 'none', '#f7aec2', 3)
    + rect(222, 33, 6, 19, '#fbb8c8', 2);
  const fire = path('M225 17q-12 11-3 15 10 3 7-6z', '#ffd777')
    + path('M225 25q-5 5-1 6 5 1 3-4z', '#fff4d1');
  const lantern = path('M252 4v17m0 50v16m-4 0h8', 'none', '#efaa70', 1.4)
    + group('translate(252 46) scale(1.9)', path(star, '#ba5528', '#ffce72', 1)
      + path('M0-13V6.6M-13-4l21 16M13-4l-21 16', 'none', '#ffbe5c', .65)
      + dot(0, 0, 3.4, '#ffd281'));
  const book = path('M207 62q-13-14-47-3l-4 26q37-9 51 5 16-15 48-4l-5-31q-31-5-43 7Z', '#a17252')
    + path('M207 59q-16-12-43-5l-4 27q29-6 47 5z', '#f4d9aa')
    + path('M207 59q17-14 43-9l2 30q-31-7-45 6z', '#eacb99')
    + path('M170 61q18-4 30 4m-32 3q18-4 32 4m-34 3q19-3 34 4m14-16q13-8 29-6m-29 13q13-7 31-6m-31 13q13-7 33-5', 'none', '#b18a68');
  const drum = ellipse(262, 45, 22, 18, '#9d362e') + ellipse(251, 45, 17, 19, '#e2a467')
    + ellipse(250, 45, 13, 15, '#f4c989') + path('M257 28l15 8-9 12 15 4-17 8', 'none', '#e7aa66', 1.5)
    + path('M251 18l29-8', 'none', '#bc8154', 3);
  const pumpkin = ellipse(238, 78, 42, 26, '#a64d32') + ellipse(238, 78, 30, 27, '#d66c36')
    + ellipse(238, 78, 17, 27, '#ea8a43') + path('M237 54q-1-11 11-15', 'none', '#a6a17b', 4);
  const pumpkinEyes = path('M212 80l14-12 5 14zm40-12 13 12-18 3zm-34 20q24 10 44-1-15 22-38 10z', '#ffdc83');
  const letter = group('rotate(-8 210 62)', rect(167, 39, 85, 53, '#ebc497', 2)
    + path('M176 50h58m-58 8h50m-50 8h54m-54 8h35', 'none', '#ba8d73', 1)
    + path('M218 76q4-7 8 0 4-7 8-1 2 6-8 12-10-5-8-11', '#a95f55'));
  const sunflower = path('M260 63q-8 17 3 39m-2-14q-9-13-19-9 4 10 19 9m0 6q7-13 18-10-8 11-18 10', '#8c925e', '#8c925e', 2)
    + group('translate(261 61) rotate(20)', [...Array(12)].map((_, i) =>
      group(`rotate(${i * 30})`, ellipse(0, -15, 4.6, 10, i % 2 ? '#ffc36a' : '#e9a240'))).join('')
      + dot(0, 0, 10, '#94604b') + dot(0, 0, 6, '#684340'));
  const snowTree = (x, y, scale) => group(`translate(${x} ${y}) scale(${scale})`,
    path('M0-26 12-10H7L21 2H13L27 15H-27L-13 2H-21L-7-10H-12z', '#4c7da8')
    + path('M0-26 12-10 3-11-1-14-12-10zM7-10l14 12-12-4-6 1-8-2-16 5L-7-10l2 4 8 2zM13 2l14 13-16-4-9 2-10-3-19 5 14-13 7 4 11 1z', '#dceeff'));
  const lights = [[155, 18], [177, 24], [201, 27], [224, 25], [247, 20], [270, 12]];
  const house = path('M226 59l22-24 26 25v22h-48z', '#557fa7')
    + path('M217 63l30-35 34 35-7 1-26-24-23 25z', '#daeafa')
    + rect(236, 61, 9, 10, '#edf8ff', 1) + rect(253, 59, 12, 14, '#c4e0f7', 1);
  const branch = path('M147 14q53 9 96 50', 'none', '#b96e4f', 3)
    + path('M171 23q9-10 28-10m-10 21q17 3 22 12m-6-2q17-9 29-5m-12 16q13 2 19 12', 'none', '#be7c57', 2)
    + flower(170, 20) + flower(195, 14) + flower(211, 44) + flower(232, 37) + flower(242, 61);
  const envelope = group('rotate(13 263 76)', rect(248, 55, 29, 43, '#be3348', 3)
    + path('m249 58 14 12 13-12', 'none', gold) + group('translate(263 78) scale(.44)', path(star, gold)));
  const motifs = {
    tet: {
      base: envelope,
      variants: [
        { still: branch, layers: [[flower(219, 42), 'petal-a'], [flower(237, 50), 'petal-b'], [flower(246, 61), 'petal-c']] },
        { layers: [[branch, 'sway-branch']] }
      ], corner: envelope
    },
    vacation: {
      base: path('M113 102q58-7 104-31 36-18 83-8v49H103z', '#217b89')
        + path('M130 110q62-6 109-25 29-12 61-9v36H130z', '#d9b88a')
        + path('M249 84q20-31 7-59', 'none', '#a89468', 4)
        + path('M192 58l-13 17h12z', '#e3f3ef') + path('M175 77h21l-5 4h-13z', '#8abfc6'),
      variants: [
        { still: palm, layers: [[path('M132 104q46-6 98-28 35-17 70-8', 'none', '#b1f4e6', 2), 'shore']] },
        { still: path('M132 104q46-6 98-28 35-17 70-8', 'none', '#b1f4e6', 2), layers: [[palm, 'sway-palm']] }
      ], corner: path('M200 94q24 0 47-14t48-10m-80 30q22-3 38-12t39-9', 'none', '#8edbcc', 2)
    },
    april: {
      base: palace + path('M123 16v81', 'none', '#d3ac87', 1.6),
      variants: [
        { layers: [[flag, 'sway-flag']] },
        { still: flag, layers: [[path('M125 21q37-21 77-1l-13 13q-36-15-64-1z', '#ff9b83'), 'glimmer']] }
      ], corner: palace
    },
    children: {
      base: path('M139 97q1-12 18-12 4-14 22-10 10-16 30-7 15 4 14 12 33-10 52 18z', '#29467b'),
      variants: [
        { layers: [[kite, 'soar']] },
        { still: kite, layers: [[dot(248, 67, 8, 'none').replace('/>', ' stroke="#86e3e0"/>') + dot(246, 64, 2, '#d2fff4'), 'bubble-a'],
          [dot(270, 78, 4, '#a0dfeb'), 'bubble-b']] }
      ], corner: group('translate(249 80)', path('M0 0v23', 'none', '#69bca9', 2)
        + path('M0 0q-10-19-16-8 3 8 16 8Q18-12 15-18 4-16 0 0q13 9 16 5 0-12-16-5-19 5-16 10 8 5 16-10z', '#79d0bd'))
    },
    birthday: {
      base: cake + path('M146 33q15-20 30-9t30-5', 'none', '#e1a779', 2),
      variants: [
        { layers: [[fire, 'flame']] },
        { still: fire, layers: [[path('M213 22l3-6m15-5 4 5m12 3 5-5m-49 4-4-5', 'none', '#ffb5b3', 3), 'confetti']] }
      ], corner: rect(245, 68, 38, 27, '#a46c9e', 3) + rect(243, 65, 42, 8, '#c285b2', 3)
        + path('M264 66v29m0-29q-17-3-10-11 6-5 10 11 7-17 13-11 4 7-13 11', 'none', '#ecc493', 2)
    },
    moon: {
      base: dot(198, 38, 29, '#f5b85d') + dot(197, 37, 26, '#ffd985')
        + ellipse(188, 30, 8, 5, '#f4bf6a') + ellipse(207, 48, 9, 6, '#f6c574'),
      variants: [
        { layers: [[lantern, 'sway-lantern']], still: path('M143 77q14-17 28-3 5-9 12-4t20 7z', '#3d4774') },
        { still: lantern, layers: [[path('M145 67q10-12 22-5 8-10 19-6 9 1 14 8 16-2 22 4z', '#666383'), 'cloud']] }
      ], corner: path('M199 92h27q-1-12 10-12 8 0 11 7 8-11 19-5 6 3 6 9h16', 'none', '#c59a53', 2)
    },
    school: {
      base: drum + book,
      variants: [
        { layers: [[path('M208 60q17-16 42-10-23 2-41 19z', '#fff0ce'), 'page']] },
        { layers: [[path('M198 27q-8-12 4-14 4 11-4 14m21 10q-2-10 9-9-1 8-9 9', '#e3a85f'), 'leaf']] }
      ], corner: group('translate(133 34) scale(.63)', book)
    },
    halloween: {
      base: path('M155 86q-7-19-6-39l-15-10 14 4-14-15 20 14 7 10 4-20 5 1-4 31 14-11 2 4-19 24-1 10z', '#30243f')
        + path('M196 22q5-5 10 4 5-9 11-4-4-1-10 8-4-7-11-8z', '#514365') + pumpkin,
      variants: [
        { layers: [[pumpkinEyes, 'flame-pumpkin']] },
        { still: pumpkinEyes, layers: [[path('M160 92q18-10 37-4 24-13 46 0t46 1l11 12H151z', '#817292'), 'mist']] }
      ], corner: path('M206 99q13-13 30-9 13-8 28-3t30 9', 'none', '#8776a0', 3)
    },
    teachers: {
      base: letter + sunflower,
      variants: [
        { layers: [[path('M244 45q-13-2-10-11 9 1 10 11z', '#ffca78'), 'petal-a'],
          [path('M276 66q13-8 15-1-7 7-15 1z', '#e7ab61'), 'petal-c']] },
        { layers: [[path('M165 49l12-2 13 49-11 2z', '#fff7cf'), 'letter-glimmer']] }
      ], corner: group('translate(106 32) scale(.68)', letter)
    },
    christmas: {
      base: path('M123 10q66 33 151 1', 'none', '#7398bd', 1)
        + snowTree(163, 69, .98) + snowTree(185, 79, .67) + snowTree(283, 68, .8) + house
        + path('M131 97q29-16 53-11 39-12 58-2 25 8 58-8v21H131z', '#a5c6e3'),
      variants: [
        { still: lights.map(([x,y]) => dot(x, y, 2, '#f7fcff')).join(''),
          layers: [[dot(218, 32, 1.8, '#f5fbff') + dot(261, 27, 1.4, '#f5fbff'), 'snow-a'],
            [dot(182, 26, 1.4, '#f5fbff') + dot(245, 38, 1.8, '#f5fbff') + dot(276, 31, 1.6, '#f5fbff'), 'snow-b']] },
        { layers: [[lights.filter((_, i) => i % 2 === 0).map(([x,y]) => dot(x, y, 2.5, '#f7fcff')).join(''), 'lamp-a'],
          [lights.filter((_, i) => i % 2 === 1).map(([x,y]) => dot(x, y, 2.5, '#f7fcff')).join(''), 'lamp-b']] }
      ], corner: snowTree(267, 78, .80) + snowTree(240, 88, .44)
    }
  };

  function scene(id, effect) {
    const art = motifs[id];
    if (!art) return '';
    const { still = '', layers } = art.variants[effect];
    return svg(art.base + still, 'seasonal-scene-base')
      + layers.map(([markup, motion]) => svg(markup, `seasonal-scene-layer seasonal-${motion}`)).join('');
  }

  function corner(id) {
    return motifs[id] ? svg(motifs[id].corner, 'seasonal-corner-art') : '';
  }

  return { scene, corner };
})();

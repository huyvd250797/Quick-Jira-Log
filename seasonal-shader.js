'use strict';

window.QuickJiraSeasonalShader = (() => {
  const kinds = { vacation: 1, april: 2, birthday: 3, moon: 4, halloween: 5 };
  const fragment = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D image;
    uniform vec2 fit;
    uniform float time;
    uniform int kind;
    uniform float variant;

    float band(float x, float left, float right, float feather) {
      return smoothstep(left, left + feather, x) * (1.0 - smoothstep(right - feather, right, x));
    }
    float region(vec2 p, vec2 center, vec2 radius) {
      return 1.0 - smoothstep(0.22, 1.0, length((p - center) / radius));
    }

    // These silhouettes are defined in the source image's 960 × 279 coordinates.
    float clothMask(vec2 uv, vec3 color) {
      vec2 p = uv * vec2(960.0, 279.0);
      float top = 93.0 - 0.84 * clamp(p.x - 640.0, 0.0, 50.0)
                       - 0.24 * max(p.x - 690.0, 0.0);
      float bottom = 218.0 - 0.11 * (p.x - 640.0);
      // Stay inside the cloth, including its yellow star, and away from the pole.
      float silhouette = band(p.x, 642.0, 892.0, 22.0) * band(p.y, top, bottom, 18.0);
      float redFabric = smoothstep(0.08, 0.28, color.r - color.g);
      float star = region(p, vec2(771.0, 115.0), vec2(67.0, 67.0))
                 * smoothstep(0.14, 0.32, color.g - color.b)
                 * smoothstep(0.55, 0.76, color.r);
      return silhouette * max(redFabric, star);
    }

    float outsideMoon(vec2 uv) {
      vec2 p = uv * vec2(960.0, 279.0);
      // Lock the complete disk, its edge and the near halo.
      return smoothstep(73.0, 89.0, length(p - vec2(548.0, 111.0)));
    }

    void main() {
      // Top-left image coordinates with the same right-aligned cover fit as the HTML image.
      vec2 p = vec2(1.0 - (1.0 - vUv.x) * fit.x, 0.5 + (vUv.y - 0.5) * fit.y);
      vec2 uv = p;
      float t = time * 1.0471975512;
      float shine = 0.0;
      vec3 glow = vec3(1.0, 0.66, 0.24);
      if (kind == 1) {
        if (variant < 0.5) {
          // Move the actual foam bands. The beach, trunk and horizon stay fixed.
          float bed = band(p.y, 0.69, 1.01, 0.13) * band(p.x, 0.11, 0.91, 0.19);
          float wave = sin(p.x * 12.0 + p.y * 16.0 - t * 2.0) * 0.65 +
                       sin(p.x * 24.0 + p.y * 7.0 - t) * 0.35;
          uv += vec2(0.008, -0.038) * wave * bed;
        } else {
          // Bend frond tips around the coconut crown. The central attachment is pinned.
          vec2 joint = vec2(0.818, 0.12);
          vec2 delta = p - joint;
          float canopy = region(p, vec2(0.78, 0.19), vec2(0.27, 0.40));
          float tip = smoothstep(0.03, 0.19, length(delta * vec2(1.0, 0.52)));
          float wind = sin(t * 2.0 - delta.x * 14.0 - delta.y * 4.0)
                     + 0.25 * sin(t * 5.0 - delta.y * 13.0);
          uv += vec2(-delta.y * 0.038, delta.x * 0.24) * canopy * tip * wind;
        }
      } else if (kind == 2) {
        vec3 original = texture2D(image, p).rgb;
        float free = clamp((0.931 - p.x) / 0.26, 0.0, 1.0);
        float phase = free * 9.2 - t * mix(4.0, 5.0, variant);
        float cloth = clothMask(p, original);
        vec2 ripple = vec2(cos(phase - 0.4) * 0.009, sin(phase) * mix(0.032, 0.056, variant));
        vec2 samplePoint = p + ripple * free * cloth;
        // The displacement must also sample cloth. It cannot pull the roof through the flag edge.
        float sampleCloth = clothMask(samplePoint, texture2D(image, samplePoint).rgb);
        uv = mix(p, samplePoint, sampleCloth);
        shine = cos(phase + 0.45) * free * cloth * 0.15;
      } else if (kind == 3) {
        // Use the painted flame silhouette, with its wick fixed and a moving tip.
        float flame = region(p, vec2(0.736, 0.126), vec2(0.025, 0.118));
        float tip = 1.0 - smoothstep(0.075, 0.213, p.y);
        float flicker = sin(t * 12.0) + 0.43 * sin(t * 20.0 + 0.8);
        uv.x += flicker * tip * flame * 0.012;
        uv.y += sin(t * 10.0 + 1.5) * tip * flame * 0.020;
        shine = (0.03 + sin(t * 9.0) * 0.059) *
                region(p, vec2(0.735, 0.13), vec2(0.085, 0.21));
      } else if (kind == 4) {
        if (variant < 0.5) {
          vec2 px = p * vec2(960.0, 279.0);
          float clouds = region(px, vec2(432.0, 182.0), vec2(198.0, 44.0))
                       * outsideMoon(p);
          vec2 cloudPoint = p + vec2(sin(t) * 0.032 * clouds, 0.0);
          uv = mix(p, cloudPoint, outsideMoon(cloudPoint));
        } else {
          vec2 px = p * vec2(960.0, 279.0);
          vec2 cord = vec2(764.0, 21.0);
          vec2 delta = px - cord;
          vec3 original = texture2D(image, p).rgb;
          float lantern = region(px, vec2(772.0, 140.0), vec2(120.0, 116.0))
                        * band(px.x, 646.0, 887.0, 25.0)
                        * smoothstep(0.10, 0.30, original.r - original.b)
                        * outsideMoon(p);
          float angle = sin(t * 2.0) * 0.049;
          vec2 sway = angle * vec2(-delta.y, delta.x) / vec2(960.0, 279.0);
          vec2 paperPoint = p + sway * lantern;
          vec3 paper = texture2D(image, paperPoint).rgb;
          float paperEdge = smoothstep(0.095, 0.28, paper.r - paper.b);
          uv = mix(p, paperPoint, outsideMoon(paperPoint) * paperEdge);
          shine = lantern * (0.022 + sin(t * 3.0) * 0.058);
        }
      } else if (kind == 5) {
        float eyes = max(region(p, vec2(0.678, 0.515), vec2(0.033, 0.098)),
                         region(p, vec2(0.787, 0.526), vec2(0.039, 0.108)));
        // The change is constrained to luminous carved areas, not the whole pumpkin.
        shine = eyes * (sin(t * 4.0) * 0.43 + sin(t * 8.0) * 0.10 - 0.18);
      }
      vec3 pixel = texture2D(image, clamp(uv, 0.0, 1.0)).rgb;
      if (kind == 5) shine *= smoothstep(0.26, 0.72, pixel.g);
      gl_FragColor = vec4(pixel * (1.0 + shine) + max(0.0, shine) * glow * 0.075, 1.0);
    }`;

  function shader(gl, type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (gl.getShaderParameter(result, gl.COMPILE_STATUS)) return result;
    gl.deleteShader(result);
    return null;
  }

  function create(canvas, image, theme, variant) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return null;
    const vert = shader(gl, gl.VERTEX_SHADER, `
      attribute vec2 vertex;
      varying vec2 vUv;
      void main() {
        vUv = vec2(vertex.x, -vertex.y) * 0.5 + 0.5;
        gl_Position = vec4(vertex, 0.0, 1.0);
      }`);
    const frag = shader(gl, gl.FRAGMENT_SHADER, fragment);
    if (!vert || !frag) {
      if (vert) gl.deleteShader(vert);
      if (frag) gl.deleteShader(frag);
      return null;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'vertex');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, 'image'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'kind'), kinds[theme]);
    gl.uniform1f(gl.getUniformLocation(program, 'variant'), variant);
    const fit = gl.getUniformLocation(program, 'fit');
    const time = gl.getUniformLocation(program, 'time');
    function resize(width, height) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 1000 / width);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      gl.uniform2f(fit, canvas.width / (image.naturalWidth * scale), canvas.height / (image.naturalHeight * scale));
    }
    function draw(seconds) {
      if (gl.isContextLost()) return false;
      gl.uniform1f(time, seconds);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    }
    function dispose() {
      gl.deleteTexture(tex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    return { resize, draw, dispose };
  }

  return { kinds, create };
})();

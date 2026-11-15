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
        // Deform the painted flag and its star continuously, with the right pole stationary.
        float free = clamp((0.932 - p.x) / 0.29, 0.0, 1.0);
        float top = 0.018 + free * 0.21;
        float bottom = 0.67 + free * 0.17;
        float body = band(p.x, 0.622, 0.934, 0.035) * band(p.y, top - 0.045, bottom + 0.035, 0.11);
        float phase = free * 9.2 - t * mix(4.0, 5.0, variant);
        uv.y += sin(phase) * free * body * mix(0.043, 0.079, variant);
        uv.x += cos(phase - 0.4) * free * body * 0.013;
        shine = cos(phase + 0.45) * free * body * 0.20;
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
          // Drift the illuminated cloud band below the moon.
          float cloud = region(p, vec2(0.52, 0.67), vec2(0.29, 0.205));
          uv.x += sin(t) * 0.046 * cloud;
        } else {
          // The lantern pivots from its hanging point, then softly illuminates its paper.
          vec2 cord = vec2(0.79, 0.065);
          vec2 delta = p - cord;
          float paper = region(p, vec2(0.79, 0.51), vec2(0.20, 0.49));
          float pivot = sin(t * 2.0) * 0.063 * paper;
          uv += vec2(-delta.y * 0.65, delta.x * 1.57) * pivot;
          shine = paper * (0.046 + sin(t * 3.0) * 0.074);
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

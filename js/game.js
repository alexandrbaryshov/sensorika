/* ==========================================================================
   Сенсорика: «Слепите вазу» — 3D-демо полного цикла. Сначала выбор занятия:
   • гончарный круг: ком → центровка → формовка на круге → роспись → глазурь и обжиг → готово
   • роспись заготовки: кружка, подсвечник, ваза, тарелка или картина → роспись и надпись → глазурь и обжиг → готово
   Three.js r159 (UMD, assets/vendor/three.min.js), работает и с file://
   ========================================================================== */
(function () {
  "use strict";

  var stageEl = document.getElementById("stage");
  var canvas = document.getElementById("wheel");
  var heroEl = document.getElementById("hero");
  var ui = {
    step: document.getElementById("gameStep"),
    title: document.getElementById("gameTitle"),
    hint: document.getElementById("gameHint"),
    tools: document.getElementById("gameTools"),
    controls: document.getElementById("gameControls"),
    frieze: document.getElementById("stepsRail"),
    ring: document.getElementById("cursorRing"),
    tip: document.getElementById("stageTip"),
    restart: document.getElementById("gameRestart")
  };
  var DEMO = /[?&]demo=/.test(location.search);
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Телефоны и планшеты: меньше пикселей и легче тени, чтобы сцена не грела аппарат и не съедала батарею
  var LITE = window.matchMedia && matchMedia("(pointer: coarse), (max-width: 1099.98px)").matches;

  function fallback() {
    var f = document.getElementById("stageFallback");
    if (f) f.hidden = false;
    var panel = document.getElementById("gamePanel");
    if (panel) panel.hidden = true;
    if (heroEl) heroEl.classList.add("cta-on");
    document.documentElement.classList.remove("game-on");
  }
  if (!window.THREE || !canvas) { fallback(); return; }

  var renderer;
  try {
    // preserveDrawingBuffer не нужен: открытка рисуется и копируется в одном кадре (renderPostcard)
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { fallback(); return; }
  if (!renderer.getContext()) { fallback(); return; }

  var V2 = THREE.Vector2, V3 = THREE.Vector3;
  var clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp, smooth = THREE.MathUtils.smoothstep;
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LITE ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

  /* ---------------------------------------------------------------- окружение */
  (function makeEnv() {
    var env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 12, 24), new THREE.MeshBasicMaterial({ color: 0x24182a, side: THREE.BackSide })));
    function panel(w, h, hex, k, x, y, z) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    }
    panel(9, 5, 0xffc79a, 2.6, -7, 3, 6);    // тёплая лампа
    panel(7, 3, 0xb4a6de, 1.1, 8, 2, -4);     // лавандовый отсвет
    panel(12, 2.5, 0xffe6d2, 1.4, 0, 5.9, 0); // верхний свет
    panel(4, 4, 0x3fc1c9, 0.35, 0, 1, -11);   // бирюзовая глазурь вдали
    var pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.04).texture;
    pm.dispose();
  })();

  /* ---------------------------------------------------------------- свет */
  scene.add(new THREE.HemisphereLight(0xffe4d0, 0x2a1d2e, 0.5));
  var key = new THREE.DirectionalLight(0xffd8b4, 2.6);
  key.position.set(-4.5, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(LITE ? 512 : 1024, LITE ? 512 : 1024);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 1; key.shadow.camera.far = 20;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  key.shadow.radius = 4;
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xb9a8f0, 1.8);
  rim.position.set(5, 3.5, -4.5);
  scene.add(rim);

  /* ---------------------------------------------------------------- процедурные текстуры */
  function makeCanvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // Следы от пальцев: кольцевые борозды (горизонтальные полосы в UV)
  var streakCv = makeCanvas(512, 512);
  (function () {
    var g = streakCv.getContext("2d");
    g.fillStyle = "#808080"; g.fillRect(0, 0, 512, 512);
    var y = 0;
    while (y < 512) {
      var h = rand(2, 7), v = Math.round(rand(95, 165));
      g.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
      g.globalAlpha = rand(.35, .8);
      g.fillRect(0, y, 512, h);
      y += h + rand(1, 6);
    }
    g.globalAlpha = .18;
    for (var i = 0; i < 1800; i++) { var c = Math.round(rand(60, 200)); g.fillStyle = "rgb(" + c + "," + c + "," + c + ")"; g.fillRect(rand(0, 512), rand(0, 512), rand(1, 3), rand(1, 2)); }
    g.globalAlpha = 1;
  })();
  var streakTex = new THREE.CanvasTexture(streakCv);
  streakTex.wrapS = streakTex.wrapT = THREE.RepeatWrapping;

  // «Кожа» изделия: на ней рисуем трещины и роспись
  var SKIN = 1024;
  var skinCv = makeCanvas(SKIN, SKIN);
  var skin = skinCv.getContext("2d");
  var skinTex = new THREE.CanvasTexture(skinCv);
  skinTex.colorSpace = THREE.SRGBColorSpace;
  skinTex.wrapS = THREE.RepeatWrapping;
  skinTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  function skinNeutral() {
    skin.globalAlpha = 1;
    skin.fillStyle = "#e6e2df"; skin.fillRect(0, 0, SKIN, SKIN);
    skin.globalAlpha = .5;
    skin.drawImage(streakCv, 0, 0, SKIN, SKIN);
    skin.globalAlpha = 1;
    skinTex.needsUpdate = true;
  }
  function skinBisque() {
    skin.globalAlpha = 1;
    skin.fillStyle = "#d8906f"; skin.fillRect(0, 0, SKIN, SKIN);
    skin.globalAlpha = .12; skin.drawImage(streakCv, 0, 0, SKIN, SKIN);
    skin.globalAlpha = .5;
    for (var i = 0; i < 2600; i++) {
      skin.fillStyle = Math.random() < .5 ? "#a8644a" : "#efb497";
      skin.fillRect(rand(0, SKIN), rand(0, SKIN), rand(1, 2.4), rand(1, 2.4));
    }
    skin.globalAlpha = 1;
    skinTex.needsUpdate = true;
  }

  function brickTexture() {
    var c = makeCanvas(512, 512), g = c.getContext("2d");
    g.fillStyle = "#a99579"; g.fillRect(0, 0, 512, 512);
    var bh = 42, bw = 128;
    for (var r = 0; r < 13; r++) {
      var off = (r % 2) * bw / 2;
      for (var x = -bw; x < 512 + bw; x += bw) {
        var l = Math.round(rand(196, 222)), a = Math.round(rand(176, 196)), b = Math.round(rand(140, 160));
        g.fillStyle = "rgb(" + l + "," + a + "," + b + ")";
        g.fillRect(x + off + 3, r * bh + 3, bw - 6, bh - 6);
        g.fillStyle = "rgba(90,60,40,.12)";
        for (var s = 0; s < 18; s++) g.fillRect(x + off + rand(4, bw - 6), r * bh + rand(4, bh - 6), 2, 2);
      }
    }
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  /* ---------------------------------------------------------------- круг в нише */
  var studio = new THREE.Group();
  scene.add(studio);

  // Гончарный круг: толстая тёмная планшайба, вся в глиняных разводах
  function batTexture() {
    var c = makeCanvas(1024, 1024), g = c.getContext("2d");
    g.fillStyle = "#3b2c2f"; g.fillRect(0, 0, 1024, 1024);
    for (var r = 30; r < 512; r += 6) {
      g.strokeStyle = Math.random() < .55 ? "rgba(176,104,78," + rand(.08, .32) + ")" : "rgba(20,12,14," + rand(.1, .3) + ")";
      g.lineWidth = rand(2, 7);
      var a0 = rand(0, Math.PI * 2);
      g.beginPath(); g.arc(512, 512, r, a0, a0 + rand(1, 5.5)); g.stroke();
    }
    for (var i = 0; i < 14; i++) {
      var a = rand(0, Math.PI * 2), rr = rand(240, 480);
      g.fillStyle = "rgba(186,112,84," + rand(.25, .55) + ")";
      g.beginPath(); g.ellipse(512 + Math.cos(a) * rr, 512 + Math.sin(a) * rr, rand(18, 60), rand(6, 16), a + Math.PI / 2, 0, Math.PI * 2); g.fill();
    }
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // Турнетка для росписи заготовок: гладкий диск с рисками центровки и засохшими каплями краски
  function turnTexture() {
    var c = makeCanvas(1024, 1024), g = c.getContext("2d");
    g.fillStyle = "#3e3439"; g.fillRect(0, 0, 1024, 1024);
    g.lineWidth = 2.5;
    for (var r = 70; r < 512; r += 62) { g.strokeStyle = "rgba(240,214,196," + (r % 124 < 62 ? .2 : .1) + ")"; g.beginPath(); g.arc(512, 512, r, 0, Math.PI * 2); g.stroke(); }
    var drops = ["#2b1c30", "#2f55a4", "#3fc1c9", "#d6a23e", "#c8352b", "#3d8c4f", "#8f7fd0", "#efe1d2"];
    for (var i = 0; i < 34; i++) {
      var a = rand(0, Math.PI * 2), rr = rand(360, 500);
      g.globalAlpha = rand(.3, .65); g.fillStyle = drops[i % drops.length];
      g.beginPath(); g.ellipse(512 + Math.cos(a) * rr, 512 + Math.sin(a) * rr, rand(4, 13), rand(3, 7), a, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  var batSide = new THREE.MeshStandardMaterial({ color: 0x4a3534, roughness: .55, metalness: .1 });
  var batTex = batTexture(), turnTex = null;
  var batTop = new THREE.MeshPhysicalMaterial({ map: batTex, roughness: .42, clearcoat: .4, clearcoatRoughness: .35 });
  var wheelHead = new THREE.Mesh(
    new THREE.CylinderGeometry(1.62, 1.66, 0.3, 120),
    [batSide, batTop, batSide]
  );
  wheelHead.position.y = -0.15;
  wheelHead.receiveShadow = true;
  studio.add(wheelHead);
  // Тёплый свет свечей у подножия арки (сами свечи — картинки поверх сцены)
  var flames = [];
  [[-2.3, 0.3, 1.9], [2.3, 0.3, 1.9]].forEach(function (p) {
    var l = new THREE.PointLight(0xff9a50, 3, 8, 1.8);
    l.position.set(p[0], p[1], p[2]); studio.add(l);
    flames.push({ light: l, seed: Math.random() * 10 });
  });
  /* ---------------------------------------------------------------- печь */
  var KX = 16;
  var kiln = new THREE.Group();
  kiln.position.set(KX, 0, 0);
  scene.add(kiln);
  var brick = brickTexture();
  function slab(w, h, d, x, y, z, mat) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.receiveShadow = true; kiln.add(m); return m; }
  var brickMat = new THREE.MeshStandardMaterial({ map: brick, roughness: .92, color: 0xffffff });
  var brickSide = brickMat.clone(); brickSide.map = brick.clone(); brickSide.map.repeat.set(1.2, 1.4); brickSide.map.needsUpdate = true;
  var steel = new THREE.MeshStandardMaterial({ color: 0x45404a, metalness: .6, roughness: .5 });
  slab(4.4, 0.3, 3.4, 0, -0.2, -0.2, brickMat);          // под
  slab(4.4, 0.3, 3.4, 0, 3.9, -0.2, brickMat);           // свод
  slab(4.4, 4.4, 0.3, 0, 1.85, -1.75, brickMat);         // задняя
  slab(0.3, 4.4, 3.4, -2.05, 1.85, -0.2, brickSide);     // левая
  slab(0.3, 4.4, 3.4, 2.05, 1.85, -0.2, brickSide);      // правая
  slab(4.9, 0.18, 3.8, 0, 4.15, -0.2, steel);
  slab(4.9, 0.18, 3.8, 0, -0.44, -0.2, steel);
  slab(0.18, 4.6, 3.8, -2.36, 1.85, -0.2, steel);
  slab(0.18, 4.6, 3.8, 2.36, 1.85, -0.2, steel);
  var door = new THREE.Group(); door.position.set(2.45, 1.85, 1.5); kiln.add(door);
  var doorSlab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 4.6, 0.3), steel); doorSlab.position.x = 2.3; door.add(doorSlab);
  door.rotation.y = -1.95;
  var kilnShelf = slab(3, 0.08, 2.2, 0, -0.04, 0, new THREE.MeshStandardMaterial({ color: 0xcfc4b6, roughness: .9 }));
  kilnShelf.position.y = -0.04;

  // Нагревательные спирали
  class Helix extends THREE.Curve {
    constructor(x0, x1, y, z, turns, axis) { super(); this.a = x0; this.b = x1; this.y = y; this.z = z; this.n = turns; this.axis = axis; }
    getPoint(t, o) {
      o = o || new V3();
      var s = lerp(this.a, this.b, t), w = t * this.n * Math.PI * 2;
      if (this.axis === "x") return o.set(s, this.y + Math.cos(w) * .07, this.z + Math.sin(w) * .07);
      return o.set(this.z + Math.sin(w) * .07, this.y + Math.cos(w) * .07, s);
    }
  }  var coilMat = new THREE.MeshStandardMaterial({ color: 0x5b5452, roughness: .6, metalness: .4, emissive: 0xff5a14, emissiveIntensity: 0 });
  [0.8, 1.9, 3.0].forEach(function (y) {
    kiln.add(new THREE.Mesh(new THREE.TubeGeometry(new Helix(-1.75, 1.75, y, -1.52, 46, "x"), 900, 0.016, 6), coilMat));
    kiln.add(new THREE.Mesh(new THREE.TubeGeometry(new Helix(-1.6, 1.2, y, -1.82, 40, "z"), 800, 0.016, 6), coilMat));
    kiln.add(new THREE.Mesh(new THREE.TubeGeometry(new Helix(-1.6, 1.2, y, 1.82, 40, "z"), 800, 0.016, 6), coilMat));
  });
  var kilnLight = new THREE.PointLight(0xff7a2a, 0, 7, 1.6);
  kilnLight.position.set(0, 1.9, 0.4);
  kiln.add(kilnLight);
  var kilnFill = new THREE.PointLight(0xffd2b0, 1.2, 9, 2);
  kilnFill.position.set(0, 2.6, 3.4);
  kiln.add(kilnFill);

  /* ---------------------------------------------------------------- изделие */
  // На телефоне форма пересобирается каждый кадр, пока держат палец: меньше сегментов — ровнее кадры
  var N = 44, LIP = 6, SEG = LITE ? 72 : 120;
  var WALL = 0.13, FLOOR = 0.17, BASE = 0.04;
  // Предел формы: под него рассчитан постоянный кадр камеры (см. framing)
  var RMAX = 1.2, HMAX = 2.3;
  var P = 2 + N + LIP + N + 1;
  var R = new Float32Array(N), Rgoal = new Float32Array(N);
  var H = 1.15, Hgoal = 1.15, V0 = 1;
  var openK = 0, wobbleK = 1;

  // leather: оттенок, при котором глина на «кожице» росписи (skinBisque) выглядит так же, как сырая на skinNeutral, — переход без скачка
  var COLORS = { wet: new THREE.Color(0xd27a52), leather: new THREE.Color(0xb7997e), bisque: new THREE.Color(0xffffff) };

  var clayMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.wet.clone(), map: skinTex, bumpMap: streakTex, bumpScale: 2.3,
    roughness: .6, metalness: 0, clearcoat: .1, clearcoatRoughness: .6,
    emissive: new THREE.Color(0xff5a1a), emissiveIntensity: 0
  });
  var piece = new THREE.Group();
  scene.add(piece);
  var clay = new THREE.Mesh(new THREE.BufferGeometry(), clayMat);
  clay.castShadow = true; clay.receiveShadow = true;
  piece.add(clay);

  // Палец мастера: показывает, где касаемся глины
  var finger = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf1c7ad, roughness: .5, emissive: 0x3fc1c9, emissiveIntensity: .25 }));
  finger.visible = false;
  piece.add(finger);

  function yAt(i) { return BASE + (i / (N - 1)) * (H - BASE); }
  function profile() {
    var pts = [], i, open = openK;
    pts.push(new V2(0.0005, 0));
    pts.push(new V2(R[0] * 0.95, 0));
    for (i = 0; i < N; i++) pts.push(new V2(R[i], yAt(i)));
    var rTop = R[N - 1];
    var inTop = Math.max(0.0005, (rTop - WALL) * open);
    var cx = (rTop + inTop) / 2, rr = (rTop - inTop) / 2;
    for (var k = 1; k <= LIP; k++) {
      var a = (k / (LIP + 1)) * Math.PI;
      pts.push(new V2(cx + rr * Math.cos(a), H + rr * Math.sin(a) * (open > .5 ? .9 : .7)));
    }
    var floorY = lerp(H, FLOOR, clamp(open * 1.4, 0, 1));
    for (i = N - 1; i >= 0; i--) pts.push(new V2(Math.max(0.0005, (R[i] - WALL) * open), Math.max(yAt(i), floorY)));
    pts.push(new V2(0.0005, floorY));
    return pts;
  }
  function applyWobble(g) {
    var p = g.attributes.position, A = wobbleK * 0.2;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      var r = Math.sqrt(x * x + z * z);
      if (r < 1e-3) continue;
      var th = Math.atan2(z, x);
      var f = 1 + A * (0.55 * Math.sin(2 * th + 0.7 + y * 2.1) + 0.35 * Math.sin(3 * th + 1.9 - y * 3.3) + 0.25 * Math.sin(5 * th + y * 5));
      p.setXYZ(i, x * f + A * 0.8, y * (1 + A * 0.12 * Math.sin(th * 2 + 1)), z * f);
    }
    g.computeVertexNormals();
  }
  var dirty = true;
  function rebuild() {
    var g = new THREE.LatheGeometry(profile(), SEG);
    if (wobbleK > 0.002) applyWobble(g);
    clay.geometry.dispose();
    clay.geometry = g;
    dirty = false;
  }

  function meanR() { var s = 0; for (var i = 0; i < N; i++) s += R[i]; return s / N; }
  function shapeLump() {
    for (var i = 0; i < N; i++) { var t = i / (N - 1); R[i] = 0.06 + 1.0 * Math.pow(1 - Math.pow(t, 2.1), 0.5) * (1 - 0.08 * t); }
    H = 1.15;
  }
  function presetProfile(name, out) {
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1), r;
      if (name === "cylinder") r = 0.93 - 0.06 * t;
      else if (name === "jar") r = 0.6 + 0.3 * Math.exp(-Math.pow((t - .42) / .3, 2)) - 0.1 * smooth(t, .6, .86) + 0.14 * smooth(t, .86, 1);
      else if (name === "vase") r = 0.48 + 0.58 * Math.exp(-Math.pow((t - .34) / .24, 2)) - 0.12 * smooth(t, .55, .82) + 0.28 * smooth(t, .8, 1);
      else r = 0.38 + 0.6 * Math.exp(-Math.pow((t - .42) / .22, 2)) - 0.02 * t + 0.15 * smooth(t, .88, 1); // amphora
      out[i] = r;
    }
    return { jar: 1.75, cylinder: 1.3, vase: 2.1, amphora: 2.3 }[name];
  }

  /* ---------------------------------------------------------------- заготовки для росписи */
  // Готовые изделия из белой глины, уже прошедшие первый (утельный) обжиг: их расписывают, глазуруют и обжигают ещё раз.
  // Кружка, подсвечник и ваза — тела вращения: u — угол, v — путь по профилю от центра дна вверх по стенке и внутрь.
  // Точки профиля стоят равномерно по длине, снаружи гуще (роспись видна в основном там), поэтому масштаб кисти
  // по v у каждой точки свой (pxV). Тарелку и картину расписывают в плоской развёртке, как лист бумаги.
  var CLAY_D = "#eee0cf";
  // Дуга профиля фигурки: окружность с центром на оси (0, cy), угол a от низа дуги (0) к верху (π)
  function arcPts(cy, r, a0, a1, n) {
    var out = [];
    for (var k = 0; k <= n; k++) { var a = lerp(a0, a1, k / n); out.push([r * Math.sin(a), cy - r * Math.cos(a)]); }
    return out;
  }
  // Неваляшка: центр и радиус шара-туловища и шара-головы; t0 — угол, где туловище срезано площадкой донышка
  var ROLY = { by: .58, br: .6, hy: 1.6, hr: .5 };
  ROLY.t0 = Math.acos(ROLY.by / ROLY.br);
  var BLANK_ORDER = ["mug", "candle", "vase", "plate", "picture", "roly", "doll"];
  var BLANKS = {
    mug: {
      name: "Кружка", gen: "кружки", acc: "кружку", dat: "кружке", card: "МОЯ КРУЖКА", file: "moya-kruzhka-sensorika.jpg",
      done: "Кружка обожжена и сияет глазурью. Настоящую распишите в «Сенсорике»!<span class=\"hint-more\"> Чай из неё будет самым вкусным.</span>",
      kind: "lathe", spin: true, textY: .72, frame: { y: .74, half: 1.32, elev: .3 },
      parts: [
        { w: .3, c: [[0, .035], [.42, .035], [.6, 0]] },
        { w: 1, outer: true, c: [[.6, 0], [.68, .05], [.72, .28], [.72, .8], [.7, 1.16], [.69, 1.29], [.655, 1.325]] },
        { w: .45, c: [[.655, 1.325], [.62, 1.29], [.615, 1.05], [.615, .45], [.58, .19], [.42, .155], [0, .155]] }
      ],
      build: function (b) {
        // ручка — плоская лента сбоку; роспись берёт с полосы стенки за собой, поэтому мазок у ручки ложится и на неё
        var path = new THREE.CatmullRomCurve3([new V3(.66, 1.05, 0), new V3(.97, 1.03, 0), new V3(1.11, .78, 0), new V3(1.01, .47, 0), new V3(.68, .35, 0)]);
        var g = new THREE.TubeGeometry(path, 48, .07, 14, false).scale(1, 1, 1.45);
        var v1 = vAtY(b.surf, 1.05), v0 = vAtY(b.surf, .35), uv = g.attributes.uv;
        for (var i = 0; i < uv.count; i++) uv.setXY(i, .25 + (uv.getY(i) - .5) * .05, lerp(v1, v0, uv.getX(i)));
        var h = new THREE.Mesh(g, clayMat);
        h.castShadow = true; h.receiveShadow = true;
        b.extras.push(h); b.paintable = [h];
      }
    },
    candle: {
      name: "Подсвечник", gen: "подсвечника", acc: "подсвечник", dat: "подсвечнику", card: "МОЙ ПОДСВЕЧНИК", file: "moy-podsvechnik-sensorika.jpg",
      done: "Подсвечник обожжён и сияет глазурью. Настоящий распишите в «Сенсорике»!<span class=\"hint-more\"> Свеча в нём будет гореть по-особенному.</span>",
      // контейнерный подсвечник — керамический стакан, внутри залита свеча
      kind: "lathe", spin: true, textY: .55, frame: { y: .62, half: 1.1, elev: .38 },
      parts: [
        { w: .3, c: [[0, .035], [.42, .035], [.54, 0]] },
        { w: 1, outer: true, c: [[.54, 0], [.575, .035], [.585, .2], [.605, .7], [.62, 1.12], [.615, 1.18], [.585, 1.2]] },
        { w: .45, c: [[.585, 1.2], [.55, 1.17], [.545, 1.0], [.525, .45], [.5, .2], [.4, .15], [0, .145]] }
      ],
      build: function (b) {
        // воск залит в стакан на витрине и в готовом подсвечнике (там свеча горит); пока расписывают, стакан пустой
        var candle = new THREE.Mesh(new THREE.CylinderGeometry(.535, .47, .715, 48), new THREE.MeshStandardMaterial({ color: 0xf3e9da, roughness: .6 }));
        candle.position.y = .5; candle.receiveShadow = true;
        var wick = new THREE.Mesh(new THREE.CylinderGeometry(.01, .012, .09, 6), new THREE.MeshBasicMaterial({ color: 0x2a1c1c }));
        wick.position.y = .4; candle.add(wick);
        // пламя: тёплый язычок, светлая сердцевина и ореол, который складывается со сценой
        var flame = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: .9, depthWrite: false }));
        flame.scale.set(1, 2.2, 1); flame.position.y = .53; candle.add(flame);
        var core = new THREE.Mesh(new THREE.SphereGeometry(.026, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff4dc }));
        core.position.y = -.008; flame.add(core);
        var gc = makeCanvas(64, 64), gg = gc.getContext("2d"), gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, "rgba(255,214,150,.85)"); gr.addColorStop(.35, "rgba(255,150,70,.32)"); gr.addColorStop(1, "rgba(255,120,40,0)");
        gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
        var gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
        var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        glow.scale.set(.55 / 1, .55 / 2.2, 1); flame.add(glow);
        b.candle = candle; b.flame = flame;
        b.extras.push(candle);
      },
      stage: function (b, st) {
        b.candle.visible = st !== "paint" && st !== "fire";
        b.flame.visible = st === "done";
        candleLight.position.y = 1.15;
        candleLight.intensity = st === "done" ? 2.4 : 0;
      }
    },
    vase: {
      name: "Ваза", gen: "вазы", acc: "вазу", dat: "вазе", card: "МОЯ ВАЗА", file: "moya-vaza-sensorika.jpg",
      done: "Ваза обожжена и сияет глазурью. Настоящую распишите в «Сенсорике»!<span class=\"hint-more\"> Она будет тяжёлой, тёплой и только вашей.</span>",
      kind: "lathe", spin: true, textY: .95, frame: { y: 1.06, half: 1.45, elev: .2 },
      parts: [
        { w: .25, c: [[0, .03], [.3, .03], [.44, 0]] },
        { w: 1, outer: true, c: [[.44, 0], [.47, .05], [.45, .13], [.6, .4], [.79, .78], [.78, 1.1], [.56, 1.45], [.37, 1.7], [.35, 1.86], [.42, 2.0], [.49, 2.08]] },
        { w: .35, c: [[.49, 2.08], [.43, 2.065], [.31, 1.9], [.29, 1.7], [.46, 1.45], [.68, 1.1], [.69, .78], [.5, .36], [.33, .17], [0, .15]] }
      ]
    },
    plate: {
      name: "Тарелка", gen: "тарелки", acc: "тарелку", dat: "тарелке", card: "МОЯ ТАРЕЛКА", file: "moya-tarelka-sensorika.jpg",
      done: "Тарелка обожжена и сияет глазурью. Настоящую распишите в «Сенсорике»!<span class=\"hint-more\"> Она будет только вашей.</span>",
      kind: "disc", spin: true, textY: .09, rimR: 1.18, base: "#e4d3bf", frame: { y: .16, half: 1.5, elev: .8 },
      parts: [
        { w: .2, c: [[0, .045], [.5, .045], [.56, 0], [.66, .005]] },
        { w: .6, c: [[.66, .005], [1.0, .12], [1.2, .2], [1.245, .245]] },
        { w: 1, outer: true, c: [[1.245, .245], [1.2, .265], [.98, .195], [.76, .1], [.6, .085], [0, .085]] }
      ]
    },
    picture: {
      name: "Картина", gen: "картины", acc: "картину", dat: "картине", card: "МОЯ КАРТИНА", file: "moya-kartina-sensorika.jpg",
      done: "Картина обожжена и сияет глазурью. Настоящую распишите в «Сенсорике»!<span class=\"hint-more\"> Её можно повесить на стену.</span>",
      kind: "flat", spin: false, textY: .81, y0: .09, tilt: -.12, base: "#e8d8c5", frame: { y: .86, half: 1.16, elev: .08 }
    },
    // фигурки — сплошные тела вращения: профиль идёт от центра донышка по боку до макушки.
    // Неваляшка — как советская: туловище-шар, на нём голова почти того же размера; спереди на голове плоское личико
    // в рубчатом ободке капюшона, на плечах по бокам — круглые ручки (см. build). Лицо смотрит на зрителя (+z).
    roly: {
      name: "Неваляшка", gen: "неваляшки", acc: "неваляшку", dat: "неваляшке", card: "МОЯ НЕВАЛЯШКА", file: "moya-nevalyashka-sensorika.jpg",
      done: "Неваляшка обожжена и сияет глазурью. Настоящую распишите в «Сенсорике»!<span class=\"hint-more\"> Пусть стоит на полке и улыбается.</span>",
      kind: "lathe", spin: true, textY: .55, frame: { y: 1.06, half: 1.46, elev: .2 },
      parts: [
        // туловище срезано снизу ровной площадкой, чтобы стоять на турнетке
        { w: .3, c: [[0, 0], [.08, 0], [ROLY.br * Math.sin(ROLY.t0), 0]] },
        { w: 1, outer: true, c: arcPts(ROLY.by, ROLY.br, ROLY.t0, 2.62, 16).concat([[.235, 1.148]], arcPts(ROLY.hy, ROLY.hr, .62, Math.PI, 18)) }
      ],
      build: function (b) {
        var s = b.surf, hy = ROLY.hy, F = .4;
        // Лицо: перед головы срезан пологим куполом радиуса F с выпуклостью C, на нём лепка личика — носик, пухлые щёки,
        // чуть выпуклые глаза и подбородок. Шов по краю лица закрывает ободок.
        var A = Math.sqrt(ROLY.hr * ROLY.hr - F * F), C = .1, RF = (F * F + C * C) / (2 * C), ZC = A + C - RF;
        // [x, y от центра лица, σx, σy, высота]
        var RELIEF = [[0, -.14, .032, .03, .032], [-.2, -.18, .07, .065, .03], [.2, -.18, .07, .065, .03],
          [-.16, -.03, .05, .036, .014], [.16, -.03, .05, .036, .014], [0, -.29, .07, .04, .014]];
        function faceZ(x, dy) {
          var q = x * x + dy * dy, z = 0;
          for (var j = 0; j < RELIEF.length; j++) {
            var m = RELIEF[j], ex = (x - m[0]) / m[2], ey = (dy - m[1]) / m[3];
            z += m[4] * Math.exp(-(ex * ex + ey * ey) / 2);
          }
          // к краю лица лепка сходит на нет: купол встречает голову ровно под ободком
          return ZC + Math.sqrt(RF * RF - q) + z * (1 - smooth(Math.sqrt(q), F * .75, F));
        }
        var p = b.geo.attributes.position, nm = b.geo.attributes.normal, e = .002;
        for (var i = 0; i < p.count; i++) {
          var x = p.getX(i), dy = p.getY(i) - hy;
          if (x * x + dy * dy >= F * F) continue;
          var z = faceZ(x, dy);
          if (p.getZ(i) <= z) continue;
          p.setZ(i, z);
          var gx = (faceZ(x + e, dy) - faceZ(x - e, dy)) / (2 * e), gy = (faceZ(x, dy + e) - faceZ(x, dy - e)) / (2 * e), gl = Math.hypot(gx, gy, 1);
          nm.setXYZ(i, -gx / gl, -gy / gl, 1 / gl);
        }
        b.geo.computeBoundingSphere();
        // Ободок капюшона — тор с рубчиком; нормали считаем сами, чтобы рубчик ловил свет и не было шва
        var T = .05, RIBS = 64, ring = new THREE.TorusGeometry(F, T, 12, RIBS * 4), rp = ring.attributes.position, rn = ring.attributes.normal;
        for (var k = 0; k < rp.count; k++) {
          var a = Math.atan2(rp.getY(k), rp.getX(k)), w = Math.atan2(rp.getZ(k), Math.hypot(rp.getX(k), rp.getY(k)) - F);
          var t = T * (1 + .06 * Math.cos(RIBS * a)), dt = -T * .06 * RIBS * Math.sin(RIBS * a);
          var ca = Math.cos(a), sa = Math.sin(a), cw = Math.cos(w), sw = Math.sin(w), r0 = F + t * cw;
          rp.setXYZ(k, r0 * ca, r0 * sa, t * sw);
          var ax = -r0 * sa + dt * cw * ca, ay = r0 * ca + dt * cw * sa, az = dt * sw; // вдоль ободка
          var bx = -t * sw * ca, by = -t * sw * sa, bz = t * cw;                       // вокруг сечения
          var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, nl = Math.hypot(nx, ny, nz);
          rn.setXYZ(k, nx / nl, ny / nl, nz / nl);
        }
        ring.translate(0, hy, A);
        // Ободок и ручки берут роспись с той части фигурки, что за ними: ободок — с края лица, ручки — с плеч.
        // u не заворачиваем через 0, поэтому треугольники у шва (лицо ровно на u = 0) не растягивают весь холст.
        function wrapUV(g, front) {
          var gp = g.attributes.position, uv = g.attributes.uv;
          for (var k = 0; k < gp.count; k++) {
            var x = gp.getX(k), v = vAtY(s, gp.getY(k)), r = s.r[surfIdx(s, v)];
            var ang = front ? Math.atan2(x, Math.sqrt(Math.max(r * r - x * x, 0))) : Math.atan2(x, gp.getZ(k));
            uv.setXY(k, ang / (2 * Math.PI), v);
          }
        }
        wrapUV(ring, true);
        var geos = [ring];
        [-1, 1].forEach(function (sd) {
          var g = new THREE.SphereGeometry(.17, 28, 18), ang = sd * 1.25;
          g.translate(.47 * Math.sin(ang), 1.16, .47 * Math.cos(ang));
          wrapUV(g, false);
          geos.push(g);
        });
        geos.forEach(function (g) {
          var m = new THREE.Mesh(g, clayMat);
          m.castShadow = true; m.receiveShadow = true;
          b.extras.push(m); b.paintable.push(m);
        });
      }
    },
    // Матрёшка по силуэту классической: внизу ровный поясок-подставка, над ним перехват, самая широкая часть — посередине
    // (там половинки сходятся), плечи плавно уходят в голову без шеи, голова почти прямая по бокам, макушка широкая и пологая.
    // Точки сняты с фотографии: высота 2,2, ширина ≈ половина высоты.
    doll: {
      name: "Матрёшка", gen: "матрёшки", acc: "матрёшку", dat: "матрёшке", card: "МОЯ МАТРЁШКА", file: "moya-matryoshka-sensorika.jpg",
      done: "Матрёшка обожжена и сияет глазурью. Настоящую распишите в «Сенсорике»!<span class=\"hint-more\"> Русская красавица, расписанная вами.</span>",
      kind: "lathe", spin: true, textY: .95, frame: { y: 1.12, half: 1.52, elev: .2 },
      parts: [
        { w: .3, c: [[0, 0], [.3, 0], [.46, .004]] },
        { w: 1, outer: true, c: [[.46, .004], [.476, .025], [.48, .07], [.48, .2], [.472, .27], [.452, .33], [.43, .39], [.423, .44], [.43, .49],
          [.448, .54], [.473, .59], [.497, .66], [.528, .77], [.548, .88], [.552, .99], [.548, 1.11], [.528, 1.22], [.491, 1.33], [.453, 1.44],
          [.422, 1.52], [.41, 1.59], [.405, 1.7], [.392, 1.82], [.378, 1.89], [.361, 1.97], [.33, 2.04], [.25, 2.11], [.15, 2.168], [0, 2.2]] }
      ]
    }
  };
  BLANK_ORDER.forEach(function (id) {
    var b = BLANKS[id];
    b.id = id;
    b.paintHint = b.kind === "disc" ? "Коснитесь тарелки — круг проведёт кольцо.<span class=\"hint-more\"> Орнамент ляжет кольцом там, где вы нажмёте.</span>"
      : b.kind === "flat" ? "Рисуйте пальцем прямо по картине.<span class=\"hint-more\"> Орнамент ляжет полосой там, где вы нажмёте.</span>"
      : "Коснитесь " + b.gen + " — круг проведёт поясок.<span class=\"hint-more\"> Орнамент ляжет туда, куда вы нажмёте.</span>";
  });

  // Профиль по контрольным точкам (сглаживание Catmull-Rom), точки равномерно по длине с весом участка
  function latheSurface(parts, total) {
    var pts = [], o0 = 0, o1 = 0;
    var curves = parts.map(function (p) { return new THREE.SplineCurve(p.c.map(function (q) { return new V2(q[0], q[1]); })); });
    var ws = curves.map(function (c, i) { return c.getLength() * parts[i].w; });
    var wsum = ws.reduce(function (a, b) { return a + b; }, 0);
    curves.forEach(function (c, i) {
      var sp = c.getSpacedPoints(Math.max(6, Math.round(total * ws[i] / wsum)));
      if (i > 0) sp.shift();
      if (parts[i].outer) { o0 = Math.max(0, pts.length - 1); o1 = pts.length + sp.length - 1; }
      for (var k = 0; k < sp.length; k++) pts.push(sp[k]);
    });
    var n = pts.length, r = new Float32Array(n), ds = new Float32Array(n);
    for (var j = 0; j < n; j++) {
      pts[j].x = r[j] = Math.max(pts[j].x, .0005);
      var a = pts[Math.max(0, j - 1)], b = pts[Math.min(n - 1, j + 1)];
      ds[j] = Math.max(1e-3, a.distanceTo(b) / (j > 0 && j < n - 1 ? 2 : 1));
    }
    return { pts: pts, r: r, ds: ds, n: n, o0: o0, o1: o1 };
  }
  function surfIdx(s, v) { return clamp(Math.round(v * (s.n - 1)), 0, s.n - 1); }
  function vAtY(s, y) {
    var best = s.o0, d = 1e9;
    for (var j = s.o0; j <= s.o1; j++) { var e = Math.abs(s.pts[j].y - y); if (e < d) { d = e; best = j; } }
    return best / (s.n - 1);
  }

  // Бока картины: материал повторяет глину на лицевой стороне (обжиг, глазурь) — см. цикл
  var edgeMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(CLAY_D), roughness: .86, metalness: 0, emissive: new THREE.Color(0xff5a1a), emissiveIntensity: 0 });
  // Плоским изделиям вместо колец от пальцев — мелкое зерно глины
  var grainTex = (function () {
    var c = makeCanvas(256, 256), g = c.getContext("2d");
    g.fillStyle = "#808080"; g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 2600; i++) { var v = Math.round(rand(70, 190)); g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.globalAlpha = rand(.2, .6); g.fillRect(rand(0, 256), rand(0, 256), rand(1, 2.5), rand(1, 2.5)); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
    return t;
  })();
  // Свеча в подсвечнике загорается на «Готово»; свет живёт в сцене всегда, чтобы шейдеры не пересобирались
  var candleLight = new THREE.PointLight(0xffb36b, 0, 3.2, 2);
  candleLight.position.set(0, 1.15, 0);
  piece.add(candleLight);
  // Подставка для картины на турнетке
  var stand = new THREE.Group();
  stand.visible = false;
  studio.add(stand);
  (function () {
    var wood = new THREE.MeshStandardMaterial({ color: 0x6e4a33, roughness: .78 });
    var ledge = new THREE.Mesh(new THREE.BoxGeometry(2.15, .09, .42), wood); ledge.position.set(0, .045, -.03);
    var lip = new THREE.Mesh(new THREE.BoxGeometry(2.15, .08, .05), wood); lip.position.set(0, .13, .155);
    [ledge, lip].forEach(function (m) { m.castShadow = true; m.receiveShadow = true; stand.add(m); });
  })();

  function buildBlank(b) {
    b.extras = []; b.paintable = [];
    if (b.kind === "flat") {
      b.W = 1.9; b.H = 1.45; b.wrap = false;
      b.geo = new THREE.PlaneGeometry(b.W, b.H).translate(0, b.H / 2, 0);
      var slab = new THREE.Mesh(new THREE.BoxGeometry(b.W, b.H, .07).translate(0, b.H / 2, -.04), edgeMat);
      slab.castShadow = true; slab.receiveShadow = true;
      b.extras.push(slab);
      b.pxU = function () { return SKIN / b.W; };
      b.pxV = function () { return SKIN / b.H; };
      b.bandLen = function () { return b.W; };
    } else {
      var s = b.surf = latheSurface(b.parts, 190);
      b.geo = new THREE.LatheGeometry(s.pts, SEG);
      if (b.kind === "disc") {
        // развёртка сверху: u — вправо, v — вглубь; центр тарелки в центре холста
        b.D = 2.6; b.wrap = false;
        var p = b.geo.attributes.position, uv = b.geo.attributes.uv;
        for (var i = 0; i < p.count; i++) uv.setXY(i, .5 + p.getX(i) / b.D, .5 - p.getZ(i) / b.D);
        b.pxU = b.pxV = function () { return SKIN / b.D; };
      } else {
        b.wrap = true;
        b.pxU = function (v) { return SKIN / (2 * Math.PI * Math.max(s.r[surfIdx(s, v)], .08)); };
        b.pxV = function (v) { return SKIN / ((s.n - 1) * s.ds[surfIdx(s, v)]); };
        b.bandLen = function (v) { return 2 * Math.PI * Math.max(s.r[surfIdx(s, v)], .12); };
      }
    }
    if (b.build) b.build(b);
    b.targets = [clay].concat(b.paintable);
  }

  /* ---------------------------------------------------------------- камера и кадр */
  var view = { pos: new V3(), target: new V3(), goalPos: new V3(), goalTarget: new V3() };
  var focus = "wheel";
  // Один близкий ракурс на всех этапах — у круга, в печи и на росписи: ваза не меняет размер, мелкие детали удобно вести пальцем.
  // Кадр подобран под самую большую форму (RMAX × HMAX) при соотношении сторон проёма арки ≈ 0,92.
  var FRAME = { y: 1.08, half: 1.53, elev: 0.18 };
  // У заготовок свой кадр: кружка ближе, тарелка сверху. В печь камера заглядывает не выше свода.
  function frameOf(where) {
    if (!blank) return FRAME;
    var f = blank.frame;
    return where === "kiln" ? { y: Math.max(f.y, .7), half: Math.max(f.half, 1.25), elev: Math.min(f.elev, .45) } : f;
  }
  function framing(where) {
    var F = frameOf(where), cx = where === "kiln" ? KX : 0;
    var dist = F.half / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    view.goalTarget.set(cx, F.y, 0);
    view.goalPos.set(cx, F.y + dist * Math.sin(F.elev), dist * Math.cos(F.elev));
  }
  function snapCamera() { view.pos.copy(view.goalPos); view.target.copy(view.goalTarget); }

  function resize() {
    var w = stageEl.clientWidth, h = stageEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    framing(focus);
    if (!started) snapCamera();
  }

  /* ---------------------------------------------------------------- состояние игры */
  var state = "intro";
  var spin = 0, spinGoal = 2.2;   // рад/с
  var holding = false, holdBtn = null;
  var center = 0;
  var tweens = [];
  function tween(dur, fn, done) { tweens.push({ t: 0, d: REDUCED ? 0.001 : dur, fn: fn, done: done }); }

  var STEPS = ["lump", "shape", "paint", "fire", "done"];
  var STEPS_D = ["pick", "paint", "fire", "done"];
  // Занятие: «wheel» — гончарный круг, «decor» — роспись готовой заготовки (blank)
  var mode = "wheel", blank = null;
  function medalLi(step, img, name) {
    return '<li data-step="' + step + '"><span class="medal" aria-hidden="true"><img src="assets/plates/' + img + '.webp" width="200" height="200" alt=""></span><span class="step-name">' + name + "</span></li>";
  }
  var RAIL_WHEEL = ui.frieze.innerHTML;
  var RAIL_DECOR = medalLi("pick", "medal-bowl", "Заготовка") + medalLi("paint", "medal-paint", "Роспись") + medalLi("fire", "medal-kiln", "Печь") + medalLi("done", "medal-amphora", "Готово");
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    ui.frieze.innerHTML = m === "decor" ? RAIL_DECOR : RAIL_WHEEL;
    if (m === "decor") {
      // турнетка меньше гончарного круга: тарелка на ней не тонет в тёмном диске
      if (!turnTex) turnTex = turnTexture();
      batTop.map = turnTex; wheelHead.scale.set(.8, 1, .8);
      return;
    }
    // обратно к кругу: глина снова тело вращения из profile(), без ручек и подставок
    batTop.map = batTex; wheelHead.scale.set(1, 1, 1);
    if (blank) blank.extras.forEach(function (x) { clay.remove(x); });
    blank = null;
    stand.visible = false; candleLight.intensity = 0;
    clay.geometry = new THREE.BufferGeometry(); dirty = true;
    clay.position.set(0, 0, 0); clay.rotation.set(0, 0, 0); clay.scale.set(1, 1, 1);
    clayMat.bumpMap = streakTex;
  }
  function setBlank(id) {
    var b = BLANKS[id];
    if (!b.geo) buildBlank(b);
    if (blank) blank.extras.forEach(function (x) { clay.remove(x); });
    blank = b;
    clay.geometry = b.geo;
    b.extras.forEach(function (x) { clay.add(x); });
    stand.visible = id === "picture";
    edgeMat.color.set(b.base || CLAY_D);
    candleLight.intensity = 0;
    clay.position.set(0, b.y0 || 0, 0); clay.rotation.set(b.tilt || 0, 0, 0); clay.scale.set(1, 1, 1);
    piece.rotation.set(0, 0, 0);
    if (!b.spin) spin = 0;
    clayMat.bumpMap = b.wrap ? streakTex : grainTex;
    dirty = false;
    focus = "wheel"; framing("wheel");
  }
  function blankStage(st) { if (blank && blank.stage) blank.stage(blank, st); }
  function steps() { return mode === "decor" ? STEPS_D : STEPS; }
  function setStep(name) {
    var list = steps(), idx = list.indexOf(name);
    ui.frieze.querySelectorAll("li").forEach(function (li, i) {
      li.classList.toggle("is-active", i === idx);
      li.classList.toggle("is-done", i < idx);
    });
    ui.step.textContent = "Этап " + (idx + 1) + " из " + list.length;
    // на последнем этапе есть своя кнопка «Слепить ещё»
    if (ui.restart) ui.restart.hidden = name === "done";
    heroEl.classList.toggle("is-done", name === "done");
  }
  function panel(title, hint, html, kind, tools) {
    ui.title.textContent = title;
    ui.hint.innerHTML = hint;
    ui.controls.className = "game-controls" + (kind ? " is-" + kind : "");
    ui.controls.innerHTML = html || "";
    ui.tools.innerHTML = tools || "";
    ui.tools.hidden = !tools;
  }

  /* ---------------------------------------------------------------- сохранение */
  // Прогресс лежит в localStorage: страница перезагрузилась (слабый интернет, телефон выгрузил вкладку) — ваза на месте.
  var SAVE_KEY = "sensorika:game", SAVE_TTL = 7 * 864e5;
  // этап для сохранения: промежуточные анимации относим к этапу, который начнётся после перезагрузки
  var SAVE_STEP = { intro: "lump", drop: "lump", lump: "lump", opening: "lump", shape: "shape", drying: "paint", paint: "paint", transfer: "fire", fire: "fire", cracked: "fire", cooling: "done", done: "done" };
  var SAVE_STEP_D = { pick: "pick", swap: "pick", paint: "paint", transfer: "fire", fire: "fire", cracked: "fire", cooling: "done", done: "done" };
  var saveTimer = 0;
  function loadSave() {
    if (DEMO) return null;
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!s || s.v !== 1 || Date.now() - s.t > SAVE_TTL) return null;
      if (s.mode === "decor") return BLANKS[s.blank] && STEPS_D.indexOf(s.step) >= 0 ? s : null;
      if (s.step !== "lump" && !(s.R && s.R.length === N)) return null;
      return s;
    } catch (e) { return null; }
  }
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (DEMO) return;
    var decor = mode === "decor" && blank;
    var step = decor ? SAVE_STEP_D[state] || "pick" : SAVE_STEP[state] || "lump";
    var s = { v: 1, t: Date.now(), step: step };
    if (decor) { s.mode = "decor"; s.blank = blank.id; }
    else if (step !== "lump") {
      s.H = +H.toFixed(4);
      s.R = Array.prototype.map.call(R, function (r) { return +r.toFixed(4); });
    }
    // роспись — картинкой: пока глина подсыхает, на изделии ещё нет росписи
    if ((step === "paint" && state !== "drying") || step === "fire" || step === "done") {
      // надпись, которую ещё двигают, сохраняем без рамки выделения
      if (txt.on) txtDraw(false);
      try { s.skin = skinCv.toDataURL("image/jpeg", 0.86); } catch (e) {}
      if (txt.on) txtDraw(true);
    }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); }
    catch (e) {
      // не хватило места — сохраняем хотя бы форму
      try { delete s.skin; localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e2) {}
    }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 500); }
  function flushSave() { if (saveTimer) save(); }
  window.addEventListener("pagehide", flushSave);
  document.addEventListener("visibilitychange", function () { if (document.hidden) flushSave(); });

  // Человек взялся за глину: заголовок над игрой уходит и больше не появляется (класс читает и <head> при следующей загрузке)
  function markPlaying() {
    var d = document.documentElement;
    if (d.classList.contains("game-on")) return;
    // На телефоне заголовок сворачивается по высоте: фиксируем её в пикселях, чтобы CSS плавно довёл до нуля
    var intro = heroEl.querySelector(".hero-intro");
    if (intro && intro.offsetHeight) { intro.style.height = intro.offsetHeight + "px"; void intro.offsetHeight; }
    d.classList.add("game-on");
    save();
  }

  /* ---------------------------------------------------------------- материал изделия */
  function matWet() {
    clayMat.color.copy(COLORS.wet); clayMat.roughness = .6; clayMat.clearcoat = .1; clayMat.clearcoatRoughness = .6;
    clayMat.emissiveIntensity = 0; clayMat.bumpScale = 2.3; clayMat.map = skinTex; clayMat.needsUpdate = true;
  }
  function matBisque() {
    clayMat.color.set(0xffffff); clayMat.roughness = .86; clayMat.clearcoat = 0;
    clayMat.emissiveIntensity = 0; clayMat.bumpScale = .5; clayMat.map = skinTex; clayMat.needsUpdate = true;
  }
  function matGlazed() {
    matBisque();
    clayMat.roughness = .3; clayMat.clearcoat = 1; clayMat.clearcoatRoughness = .08; clayMat.bumpScale = .15;
  }

  // Готовая форма без анимации падения кома: для восстановления и демо-режимов
  function placeShape(rs, h) {
    tweens.length = 0;
    clay.position.y = 0; clay.scale.set(1, 1, 1);
    for (var i = 0; i < N; i++) R[i] = clamp(+rs[i] || 0.6, 0.3, RMAX);
    H = clamp(+h || 1.3, 0.75, HMAX);
    openK = 1; wobbleK = 0; dirty = true;
  }
  function drawSkin(url) {
    var img = new Image();
    img.onload = function () { skin.globalAlpha = 1; skin.drawImage(img, 0, 0, SKIN, SKIN); skinTex.needsUpdate = true; };
    img.src = url;
  }
  function restore(s) {
    if (s.mode === "decor") {
      setMode("decor"); setBlank(s.blank);
      if (s.step === "pick") { startPick(); return; }
      skinBlank();
    } else {
      setMode("wheel");
      placeShape(s.R, s.H);
      if (s.step === "shape") { matWet(); skinNeutral(); startShape(); return; }
      skinBisque();
    }
    if (s.skin) drawSkin(s.skin);
    if (s.step === "fire") {
      matBisque(); blankStage("fire");
      setStep("fire"); spinGoal = 0; grab(false); tip("");
      focus = "kiln"; framing("kiln"); snapCamera();
      piece.position.set(KX, 0, 0);
      beginFiring();
    }
    else if (s.step === "done") { matGlazed(); startDone(); }
    else { matBisque(); startPaint(); }
  }

  function resetPlay() {
    tweens.length = 0; fire = null;
    holding = false; holdBtn = null; pointer.down = false; paint.last = null;
    finger.visible = false; txt.on = false;
    coilMat.emissiveIntensity = 0; kilnLight.intensity = 0;
  }
  // «Слепить ещё»: новый ком на круг
  function restart() {
    var fromKiln = focus === "kiln";
    resetPlay();
    startLump();
    if (fromKiln) snapCamera();
    save();
  }
  // «Начать сначала» на любом этапе — к выбору занятия. Если работа уже есть, кнопка просит подтвердить вторым нажатием.
  function restartAll() {
    var fromKiln = focus === "kiln";
    resetPlay();
    startChoice();
    if (fromKiln) snapCamera();
    save();
  }
  var confirmTimer = 0;
  function resetRestartBtn() {
    clearTimeout(confirmTimer);
    if (!ui.restart) return;
    ui.restart.classList.remove("is-confirm");
    ui.restart.querySelector(".game-restart-label").textContent = "Начать сначала";
  }
  if (ui.restart) ui.restart.addEventListener("click", function () {
    markPlaying();
    var risky = ["drop", "lump", "intro", "choose", "leaving", "pick", "swap"].indexOf(state) < 0;
    if (risky && !ui.restart.classList.contains("is-confirm")) {
      ui.restart.classList.add("is-confirm");
      ui.restart.querySelector(".game-restart-label").textContent = "Точно сначала?";
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(resetRestartBtn, 3500);
      return;
    }
    resetRestartBtn();
    restartAll();
  });
  // любое касание панели игры — тоже начало работы с глиной (click — для клавиатуры)
  [ui.controls, ui.tools].forEach(function (el) {
    el.addEventListener("pointerdown", markPlaying);
    el.addEventListener("click", markPlaying);
  });
  // Подсказка прямо над глиной; прячется, как только человек начал действовать
  function tip(text) { if (!ui.tip) return; if (text) ui.tip.textContent = text; ui.tip.classList.toggle("is-hidden", !text); }
  function grab(on) { stageEl.classList.toggle("is-grab", !!on); }
  // Этапы, где глину зажимают: касание сцены не прокручивает страницу
  function hold(on) { stageEl.classList.toggle("is-hold", !!on); }

  function bindHold(btn, onDown, onUp) {
    function down(e) { if (e) e.preventDefault(); holding = true; holdBtn = btn; btn.classList.add("is-down"); if (onDown) onDown(); }
    function up() { if (holdBtn === btn) { holding = false; holdBtn = null; } btn.classList.remove("is-down"); if (onUp) onUp(); }
    btn.addEventListener("pointerdown", function (e) { btn.setPointerCapture && btn.setPointerCapture(e.pointerId); down(e); });
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("lostpointercapture", up);
    btn.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !e.repeat) down(e); });
    btn.addEventListener("keyup", function (e) { if (e.key === " " || e.key === "Enter") up(); });
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  /* ---------- 0. выбор занятия */
  // Разметка выбора стоит в index.html сразу (панель не прыгает, пока грузится 3D); сюда её возвращает «Начать сначала»
  var CHOICE = { step: ui.step.textContent, title: ui.title.textContent, hint: ui.hint.innerHTML, controls: ui.controls.innerHTML };
  function startChoice() {
    state = "choose";
    setMode("wheel");
    focus = "wheel"; framing("wheel");
    grab(false); hold(false); tip("");
    heroEl.classList.remove("cta-on", "is-done");
    ui.frieze.querySelectorAll("li").forEach(function (li) { li.classList.remove("is-active", "is-done"); });
    if (ui.restart) ui.restart.hidden = true;
    ui.step.textContent = CHOICE.step;
    panel(CHOICE.title, CHOICE.hint, CHOICE.controls, "choose");
    // витрина: расписанная амфора под глазурью неспешно кружится на круге
    var tmp = new Float32Array(N);
    placeShape(tmp, presetProfile("amphora", tmp));
    piece.position.set(0, 0, 0); piece.rotation.set(0, 0, 0);
    skinBisque();
    drawBand("meander", outerV(30), "#2b1c30"); drawBand("chuvash", outerV(16), "#9e4b35"); drawBand("dots", outerV(38), "#3fc1c9");
    matGlazed();
    spinGoal = 0.6;
    ui.controls.querySelectorAll("[data-mode]").forEach(function (b) {
      b.addEventListener("click", function () { choose(b.dataset.mode); });
    });
  }
  function choose(m) {
    if (state !== "choose") return;
    state = "leaving";
    ui.controls.querySelectorAll("[data-mode]").forEach(function (b) { b.disabled = true; b.classList.toggle("is-picked", b.dataset.mode === m); });
    // витрина уезжает вверх, на её место ложится ком глины или заготовка
    tween(0.5, function (k) { piece.position.y = easeInOut(k) * 5.5; }, function () {
      piece.position.y = 0;
      if (m === "wheel") startLump();
      else { setMode("decor"); setBlank(BLANK_ORDER[0]); startPick(true); }
    });
  }

  /* ---------- Р1. заготовка: выбор изделия для росписи */
  var pickGo = false;
  function startPick(drop) {
    state = "pick"; pickGo = false;
    setStep("pick");
    grab(false); hold(false); tip("");
    heroEl.classList.remove("cta-on");
    matBisque(); skinBlank(); blankStage("pick");
    spinGoal = blank.spin ? 0.6 : 0;
    var chips = BLANK_ORDER.map(function (id) {
      var b = BLANKS[id];
      return '<button class="chip chip-blank" type="button" data-blank="' + id + '" aria-pressed="' + (b === blank) + '"><span class="blank-ico blank-' + id + '" aria-hidden="true"></span>' + b.name + "</button>";
    }).join("");
    panel("Заготовка",
      'Выберите изделие из обожжённой глины.<span class="hint-more"> Вы его распишете, покроете глазурью и обожжёте в печи.</span>',
      '<div class="row row-blanks">' + chips + "</div>" +
      '<button class="btn btn-glaze" type="button" id="toDecor">Расписать <span class="ico ico-arrow" aria-hidden="true"></span></button>', "pick");
    ui.controls.querySelectorAll("[data-blank]").forEach(function (c) {
      c.addEventListener("click", function () {
        ui.controls.querySelectorAll("[data-blank]").forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
        swapBlank(c.dataset.blank);
      });
    });
    // пока заготовка меняется, нажатие «Расписать» ждёт, когда новая встанет на турнетку
    document.getElementById("toDecor").addEventListener("click", function () { if (state === "pick") startPaint(); else pickGo = true; });
    if (drop) dropIn();
    save();
  }
  function dropIn(done) {
    piece.position.y = 4;
    tween(0.55, function (k) { piece.position.y = 4 * (1 - easeOut(k)); }, done);
  }
  function swapBlank(id) {
    if (state !== "pick" && state !== "swap") return;
    if (state === "pick" && blank.id === id) return;
    state = "swap";
    tweens.length = 0;
    var y0 = piece.position.y;
    tween(0.28, function (k) { piece.position.y = lerp(y0, 4, k * k); }, function () {
      setBlank(id); matBisque(); skinBlank(); blankStage("pick");
      spinGoal = blank.spin ? 0.6 : 0;
      dropIn(function () {
        state = "pick"; save();
        if (pickGo) startPaint();
      });
    });
  }
  // Глина заготовки: белая, с мелкой крапкой; на телах вращения едва видны кольца от токарного станка
  function skinBlank() {
    skin.globalAlpha = 1;
    skin.fillStyle = blank.base || CLAY_D; skin.fillRect(0, 0, SKIN, SKIN);
    if (blank.wrap) { skin.globalAlpha = .06; skin.drawImage(streakCv, 0, 0, SKIN, SKIN); }
    skin.globalAlpha = .4;
    for (var i = 0; i < 2400; i++) {
      skin.fillStyle = Math.random() < .5 ? "#cdb59f" : "#fbf6f0";
      skin.fillRect(rand(0, SKIN), rand(0, SKIN), rand(1, 2.2), rand(1, 2.2));
    }
    skin.globalAlpha = 1;
    skinTex.needsUpdate = true;
  }

  /* ---------- 1. ком */
  function startLump() {
    state = "drop";
    focus = "wheel"; framing("wheel");
    setStep("lump");
    grab(false); hold(true);
    heroEl.classList.remove("cta-on");
    openK = 0; wobbleK = 1; center = 0;
    shapeLump(); dirty = true;
    matWet(); skinNeutral();
    piece.position.set(0, 0, 0);
    spinGoal = 2.2;
    panel("Ком глины", "Глина легла на круг неровно, и её бьёт из стороны в сторону. <strong>Зажмите кнопку или саму глину</strong>, чтобы отцентровать ком.",
      '<button class="hold" type="button" id="holdCenter"><span>Центровать</span></button>', "lump");
    var b = document.getElementById("holdCenter");
    bindHold(b);
    clay.position.y = 4;
    tween(0.9, function (k) {
      var e = k < .7 ? Math.pow(k / .7, 2) : 1;
      clay.position.y = 4 * (1 - e);
      var sq = k > .7 ? Math.sin((k - .7) / .3 * Math.PI) * .22 : 0;
      clay.scale.set(1 + sq, 1 - sq, 1 + sq);
    }, function () { clay.position.y = 0; clay.scale.set(1, 1, 1); state = "lump"; tip("Зажмите глину — круг её отцентрует"); });
  }

  function updateLump(dt) {
    var b = document.getElementById("holdCenter");
    var press = holding || (pointer.down && pointer.onCanvas);
    if (press) { center = Math.min(1, center + dt / 2.8); tip(""); }
    if (b) b.style.setProperty("--p", center.toFixed(3));
    wobbleK = 1 - easeInOut(center);
    // «конусование»: мастер поднимает ком конусом и опускает обратно
    var base = 1.15, wave = press ? Math.sin(center * Math.PI * 4) * 0.32 * (1 - center) : 0;
    var targetH = base + Math.max(0, wave);
    // ком не трогают и он уже осел — форма та же, геометрию не пересобираем
    if (!press && Math.abs(targetH - H) < 1e-4) return;
    H += (targetH - H) * Math.min(1, dt * 8);
    var s = Math.sqrt(base / H);
    for (var i = 0; i < N; i++) { var t = i / (N - 1); R[i] = (0.06 + Math.pow(1 - Math.pow(t, 2.1), .5) * (1 - .08 * t)) * s; }
    dirty = true;
    if (center >= 1) {
      state = "opening"; holding = false;
      panel("Ком глины", "Ком ровный. Большие пальцы уходят в центр, и <strong>ком раскрывается</strong>.", "");
      var from = Float32Array.from(R), to = new Float32Array(N), h0 = H, h1 = presetProfile("cylinder", to);
      tween(1.5, function (k) {
        var e = easeInOut(k);
        for (var i = 0; i < N; i++) R[i] = lerp(from[i], to[i], e);
        H = lerp(h0, h1, e); openK = e; wobbleK = 0; dirty = true;
      }, startShape);
    }
  }

  /* ---------- 2. гончарный круг */
  // Форму ведут только пальцем, без готовых заготовок: после центровки сразу к стенке
  function startShape() {
    state = "shape";
    setStep("shape");
    grab(true); hold(false);
    V0 = H * meanR();
    tip("Ведите пальцем по стенке вазы");
    panel("Гончарный круг",
      'Ведите пальцем по стенке: к центру — сужаете, наружу — расширяете.<span class="hint-more"> Глина тянется вверх, когда вы её сужаете.</span>',
      '<button class="btn btn-glaze" type="button" id="toPaint">Расписать <span class="ico ico-arrow" aria-hidden="true"></span></button>', "shape");
    document.getElementById("toPaint").addEventListener("click", startDrying);
    save();
  }

  var raycaster = new THREE.Raycaster();
  var tmp = new V3(), planeN = new V3(), axisDir = new V3(), shapePlane = new THREE.Plane();
  function updateShape(dt) {
    finger.visible = false;
    if (!pointer.onCanvas && !pointer.down) return;
    camera.getWorldDirection(planeN); planeN.y = 0; planeN.normalize().negate();
    shapePlane.setFromNormalAndCoplanarPoint(planeN, piece.position);
    axisDir.set(planeN.z, 0, -planeN.x);
    raycaster.setFromCamera(pointer.ndc, camera);
    if (!raycaster.ray.intersectPlane(shapePlane, tmp)) return;
    tmp.sub(piece.position);
    var y = tmp.y, d = tmp.dot(axisDir), side = d < 0 ? -1 : 1;
    d = Math.abs(d);
    if (y < -0.2 || y > H + 0.9) return;
    var yc = clamp(y, BASE, H);
    var i0 = clamp(Math.round((yc - BASE) / (H - BASE) * (N - 1)), 0, N - 1);
    var surfR = R[i0];
    finger.visible = true;
    finger.position.copy(axisDir).multiplyScalar(side * (pointer.down ? Math.min(d, surfR + .05) : surfR + .09));
    finger.position.y = yc;
    if (!pointer.down) return;
    tip("");

    var target = clamp(d, 0.3, RMAX);
    var sigma = 0.14 + 0.05 * H;
    var k = Math.min(1, dt * 7);
    for (var i = 0; i < N; i++) {
      var w = Math.exp(-Math.pow((yAt(i) - yc) / sigma, 2));
      if (y > H) w *= (i > N - 6 ? 1 : 0);
      R[i] += (target - R[i]) * w * k;
    }
    // сглаживание и минимальная толщина
    for (var p = 0; p < 2; p++) for (var j = 1; j < N - 1; j++) R[j] = R[j] * .8 + (R[j - 1] + R[j + 1]) * .1;
    for (var q = 0; q < N; q++) R[q] = clamp(R[q], 0.3, RMAX);
    R[0] = Math.max(R[0], 0.42);
    // объём глины сохраняется: сузили — вытянулась вверх
    var goalH = clamp(V0 / meanR(), 0.75, HMAX);
    H += (goalH - H) * Math.min(1, dt * 5);
    dirty = true;
  }

  /* ---------- 4. глазурь и обжиг */
  var fire = null;
  var fireSkin = null; // роспись до трещины: «Попробовать снова» возвращает её
  var PHASES = [
    { name: "Сушка", lo: 100, hi: 260, need: 1.8 },
    { name: "Подъём", lo: 450, hi: 650, need: 2.0 },
    { name: "Обжиг", lo: 860, hi: 1020, need: 2.4 }
  ];
  var TMAX = 1250;
  function startFire() {
    state = "transfer"; grab(false); finger.visible = false; tip("");
    setStep("fire"); blankStage("fire");
    panel("Глазурь и обжиг", "Покрываем " + (blank ? blank.acc : "вазу") + " прозрачной глазурью и переносим в печь…", "");
    spinGoal = 0;
    save();
    tween(0.6, function (k) { piece.position.y = easeInOut(k) * 5.5; }, function () {
      focus = "kiln"; framing("kiln");
      piece.position.set(KX, 5.5, 0);
      piece.rotation.y = clay.rotation.y;
      tween(1.0, function () {}, function () {
        tween(0.8, function (k) { piece.position.y = 5.5 * (1 - easeOut(k)); }, beginFiring);
      });
    });
  }
  function beginFiring() {
    state = "fire"; hold(true);
    fire = { T: 20, phase: 0, prog: 0, stress: 0 };
    gaugeCache = {};
    matBisque();
    panel("Глазурь и обжиг",
      "Держите <strong>«Жар»</strong> и не выпускайте стрелку из светлой зоны, пока этап не закончится. Перегреете — глина треснет.",
      '<div class="gauge"><div class="gauge-track"><div class="gauge-band" id="gBand"></div><div class="gauge-needle" id="gNeedle"></div></div>' +
      '<div class="gauge-meta"><span id="gPhase"></span><b id="gTemp">20 °C</b></div><div class="stress" title="Напряжение в глине"><i id="gStress"></i></div></div>' +
      '<button class="hold is-heat" type="button" id="holdHeat"><span>Жар</span></button>', "fire");
    bindHold(document.getElementById("holdHeat"));
    updateGauge();
  }
  // Шкала обновляется каждый кадр: трогаем DOM, только когда значение действительно сменилось,
  // иначе телефон пересчитывает раскладку панели 60 раз в секунду и сцена подтормаживает
  var gaugeCache = {};
  function gaugeSet(id, prop, value) {
    var key = id + prop;
    if (gaugeCache[key] === value) return;
    gaugeCache[key] = value;
    var el = document.getElementById(id);
    if (!el) return;
    if (prop === "text") el.textContent = value; else el.style[prop] = value;
  }
  function updateGauge() {
    var ph = PHASES[fire.phase];
    if (!document.getElementById("gBand")) return;
    gaugeSet("gBand", "left", (ph.lo / TMAX * 100) + "%");
    gaugeSet("gBand", "width", ((ph.hi - ph.lo) / TMAX * 100) + "%");
    gaugeSet("gNeedle", "left", clamp(fire.T / TMAX * 100, 0, 100).toFixed(1) + "%");
    gaugeSet("gPhase", "text", ph.name + " · " + (fire.phase + 1) + "/3 · " + Math.round(fire.prog / ph.need * 100) + "%");
    gaugeSet("gTemp", "text", Math.round(fire.T) + " °C");
    gaugeSet("gStress", "transform", "scaleX(" + Math.min(1, fire.stress).toFixed(2) + ")");
  }  function updateFire(dt) {
    var f = fire, ph = PHASES[f.phase];
    var heat = holding || (pointer.down && pointer.onCanvas);
    if (heat) f.T += (240 + f.T * 0.35) * dt;
    else f.T -= (70 + f.T * 0.12) * dt;
    f.T = clamp(f.T, 20, TMAX);
    if (f.T >= ph.lo && f.T <= ph.hi) f.prog += dt;
    var over = f.T - (ph.hi + 70);
    if (over > 0) f.stress += dt * (0.45 + over / 220);
    else f.stress = Math.max(0, f.stress - dt * 0.12);
    var glow = smooth(f.T, 480, 1050);
    clayMat.emissiveIntensity = glow * 1.4;
    coilMat.emissiveIntensity = smooth(f.T, 60, 950) * 5;
    kilnLight.intensity = smooth(f.T, 60, 1000) * 26;
    if (f.stress >= 1) return crack();
    if (f.prog >= ph.need) {
      f.phase++; f.prog = 0;
      if (f.phase >= PHASES.length) return finishFiring();
    }
    updateGauge();
  }
  function crack() {
    state = "cracked"; holding = false;
    if (!fireSkin) fireSkin = makeCanvas(SKIN, SKIN);
    copySkin(fireSkin, skinCv);
    skin.save();
    skin.strokeStyle = "#1c0f0c"; skin.lineCap = "round"; skin.lineJoin = "round";
    for (var c = 0; c < 3; c++) {
      var x = rand(0, SKIN), y = SKIN * rand(.55, .8);
      skin.lineWidth = rand(3, 6);
      skin.beginPath(); skin.moveTo(x, y);
      for (var s = 0; s < 14; s++) { x += rand(-22, 22); y += rand(-34, -10); skin.lineTo(x, y); }
      skin.stroke();
    }
    skin.restore(); skinTex.needsUpdate = true;
    panel("Глазурь и обжиг",
      "<strong>Трещина.</strong> Жар поднялся слишком резко. В настоящей печи за обжигом следит мастер, а здесь можно попробовать ещё раз.",
      '<button class="btn btn-glaze" type="button" id="retryFire">Попробовать снова</button>');
    document.getElementById("retryFire").addEventListener("click", function () { copySkin(skinCv, fireSkin); skinTex.needsUpdate = true; beginFiring(); });
  }
  function finishFiring() {
    state = "cooling"; holding = false; hold(false);
    save();
    panel("Глазурь и обжиг", "Обжиг удался. Печь остывает, глина стала твёрдой и звонкой, а <strong>глазурь расплавилась и стала стеклом</strong>.", "");
    var T0 = fire.T, r0 = clayMat.roughness;
    tween(1.8, function (k) {
      var T = lerp(T0, 60, easeOut(k));
      clayMat.emissiveIntensity = smooth(T, 480, 1050) * 1.4;
      coilMat.emissiveIntensity = smooth(T, 60, 950) * 5;
      kilnLight.intensity = smooth(T, 60, 1000) * 26;
      var g = easeInOut(k);
      clayMat.roughness = lerp(r0, .3, g);
      clayMat.clearcoat = g; clayMat.clearcoatRoughness = .08;
      clayMat.bumpScale = lerp(.5, .15, g);
    }, function () {
      matGlazed();
      // обратно на круг — показать готовую вазу
      tween(0.7, function (k) { piece.position.y = easeInOut(k) * 5.5; }, function () {
        focus = "wheel"; framing("wheel");
        piece.position.set(0, 5.5, 0);
        tween(1.0, function () {}, function () {
          tween(0.8, function (k) { piece.position.y = 5.5 * (1 - easeOut(k)); }, startDone);
        });
      });
    });
  }

  /* ---------- 3. роспись */
  // Глина подсыхает прямо на круге: по кожетвёрдой глине расписывают ангобами
  function startDrying() {
    state = "drying"; grab(false); finger.visible = false; tip("");
    setStep("paint");
    spinGoal = 1.0;
    panel("Роспись", "Глина немного подсыхает: по <strong>кожетвёрдой</strong> глине удобно расписывать ангобами.", "");
    // кожица росписи сразу, а цвет материала подобран так, чтобы ваза не мигнула (см. COLORS.leather)
    skinBisque();
    clayMat.color.copy(COLORS.leather);
    tween(1.4, function (k) {
      var e = easeInOut(k);
      clayMat.color.copy(COLORS.leather).lerp(COLORS.bisque, e);
      clayMat.roughness = lerp(.6, .86, e); clayMat.clearcoat = lerp(.1, 0, e);
      clayMat.bumpScale = lerp(2.3, .5, e);
    }, function () { matBisque(); startPaint(); save(); });
  }
  // тонкая кисть — 0.04: на телефоне палец и так закрывает мазок, линия должна выходить тонкой
  var paint = { color: "#2b1c30", size: 0.04, tool: "brush", last: null, snapped: false };
  var PALETTE = [
    ["#2b1c30", "Аубергин (чёрный ангоб)"], ["#9e4b35", "Терракота"], ["#c8352b", "Красный"], ["#d6a23e", "Охра"],
    ["#3d8c4f", "Зелёный"], ["#3fc1c9", "Бирюза"], ["#8f7fd0", "Лаванда"], ["#f6efe7", "Белый ангоб"]
  ];
  // Заготовки из белой глины: вторым идёт кобальт, как в гжели; белый — последним, им пишут поверх цвета (лицо, горошек, блики)
  var PALETTE_D = [
    ["#2b1c30", "Аубергин (чёрный)"], ["#2f55a4", "Кобальт"], ["#3fc1c9", "Бирюза"], ["#3d8c4f", "Зелёный"],
    ["#d6a23e", "Охра"], ["#c8352b", "Красный"], ["#9e4b35", "Терракота"], ["#8f7fd0", "Лаванда"], ["#ffffff", "Белый"]
  ];
  var ORNAMENTS = [["meander", "Греческий меандр", "Меандр"], ["chuvash", "Чувашский орнамент", "Чувашский"], ["wave", "Узор «Волна»", "Волна"], ["dots", "Узор «Точки»", "Точки"]];

  // «Назад» в росписи: перед каждым действием (мазок, пояс, смывка) кладём снимок росписи в стек.
  // Снимки — отдельные холсты из пула, чтобы не создавать по 4 МБ на каждый мазок.
  var UNDO_MAX = 12, undoStack = [], undoPool = [];
  function copySkin(to, from) {
    var g = to.getContext("2d");
    g.save(); g.globalAlpha = 1; g.globalCompositeOperation = "copy"; g.drawImage(from, 0, 0); g.restore();
  }
  function snapSkin() {
    var c = undoStack.length >= UNDO_MAX ? undoStack.shift() : (undoPool.pop() || makeCanvas(SKIN, SKIN));
    copySkin(c, skinCv);
    undoStack.push(c);
    updateUndo();
  }
  function undoPaint() {
    var c = undoStack.pop();
    if (!c || state !== "paint") return;
    txt.on = false; // надпись, которую ещё двигали, уходит вместе со снимком под ней
    copySkin(skinCv, c);
    skinTex.needsUpdate = true;
    undoPool.push(c);
    updateUndo();
    saveSoon();
  }
  function clearUndo() { while (undoStack.length) undoPool.push(undoStack.pop()); updateUndo(); }
  function updateUndo() { var b = document.getElementById("undo"); if (b) b.disabled = !undoStack.length; }
  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.tagName === "INPUT") return; // в поле надписи Ctrl+Z правит сам текст
    if (state === "paint" && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "KeyZ") { e.preventDefault(); undoPaint(); }
  });

  /* Надпись на заготовке. Пока её двигают, она «плавает» над росписью (txt.base — роспись под ней) в пунктирной рамке.
     Закрепляется, когда берут другой инструмент, начинают следующую надпись или несут изделие в печь. */
  var FONTS = [["Bad Script", "400", "рукописный"], ["Ledger", "400", "антиква"], ["Golos Text", "600", "простой"]];
  var TXT_DEFAULT = "С любовью";
  // arc — надпись дугой: на тарелке она идёт по кругу вокруг центра, на остальных изделиях выгибается аркой
  var txt = { on: false, touched: false, str: TXT_DEFAULT, u: .5, v: .5, size: .26, font: 0, rot: 0, arc: false, base: null };
  var TF = 120; // кегль, которым буквы рисуются, а потом масштабируются до мирового размера
  function txtFont(px) { var f = FONTS[txt.font]; return f[1] + " " + px + 'px "' + f[0] + '"'; }
  function txtDraw(outline) {
    copySkin(skinCv, txt.base);
    var str = txt.str.trim();
    if (str) {
      skin.save();
      skin.font = txtFont(TF);
      skin.textAlign = "center"; skin.textBaseline = "alphabetic";
      skin.fillStyle = paint.color;
      var m = skin.measureText(str);
      var M = { w: m.width, asc: m.actualBoundingBoxAscent || TF * .7, desc: m.actualBoundingBoxDescent || TF * .2 };
      M.mid = (M.asc - M.desc) / 2; // сдвиг базовой линии: середина букв ложится точно на точку надписи
      if (txt.arc && blank.kind === "disc") txtRing(str, M, outline); else txtLine(str, M, outline);
      skin.restore();
    }
    skinTex.needsUpdate = true;
  }
  // Прямая надпись или арка. Буквы рисуются в мировых единицах: на развёртке их растягивает так же, как саму поверхность.
  function txtLine(str, M, outline) {
    var h = txt.size, w = M.w;
    // не длиннее окружности изделия, ширины тарелки или картины
    var lim = blank.kind === "disc" ? blank.D * .85 : blank.bandLen(txt.v) * (blank.wrap ? .9 : .95);
    if (w / TF * h > lim) h = lim * TF / w;
    var sx = pxU(txt.v) * h / TF, sy = pxV(txt.v) * h / TF;
    var x = txt.u * SKIN, y = (1 - txt.v) * SKIN;
    // арка охватывает ~100°: на выпуклом боку изделия круче она уже не читается; её середина по высоте — в точке надписи
    var span = 1.75, R = w / span, sag = R * (1 - Math.cos(span / 2)), cy = R - sag / 2;
    (blank.wrap ? [-SKIN, 0, SKIN] : [0]).forEach(function (o) {
      skin.save();
      skin.translate(x + o, y);
      // тарелка вращается в своей плоскости: надпись разворачиваем так, чтобы она стояла ровно к зрителю
      if (blank.kind === "disc") skin.rotate(txt.rot);
      skin.scale(sx, sy);
      if (txt.arc) {
        var acc = 0;
        for (var i = 0; i < str.length; i++) {
          var cw = skin.measureText(str[i]).width, a = -Math.PI / 2 - span / 2 + (acc + cw / 2) / R;
          acc += cw;
          skin.save();
          skin.translate(R * Math.cos(a), cy + R * Math.sin(a)); skin.rotate(a + Math.PI / 2);
          skin.fillText(str[i], 0, M.mid);
          skin.restore();
        }
      } else skin.fillText(str, 0, M.mid);
      if (outline) {
        var pad = TF * .14, hw = txt.arc ? R * Math.sin(span / 2) + TF * .4 : w / 2;
        var top = txt.arc ? -sag / 2 + M.mid - M.asc : M.mid - M.asc, bottom = txt.arc ? sag / 2 + M.mid + M.desc + TF * .3 : M.mid + M.desc;
        skin.setLineDash([TF * .14, TF * .09]); skin.lineWidth = TF * .04; skin.strokeStyle = "#3fc1c9";
        skin.strokeRect(-hw - pad, top - pad, 2 * hw + 2 * pad, bottom - top + 2 * pad);
      }
      skin.restore();
    });
  }
  // Надпись по кругу тарелки: центр дуги — центр тарелки, радиус и место — там, где надпись поставили.
  // Наверху (как видит зритель) буквы смотрят к краю, внизу — к центру: и там и там текст читается слева направо.
  function txtRing(str, M, outline) {
    var s = SKIN / blank.D, cx = SKIN / 2, cy = SKIN / 2, x = txt.u * SKIN, y = (1 - txt.v) * SKIN;
    var rpx = Math.max(Math.hypot(x - cx, y - cy), .3 * s);
    var k = txt.size * s / TF, span = M.w * k / rpx;
    if (span > 5.6) { k *= 5.6 / span; span = 5.6; } // не больше ~320° — концы не наезжают друг на друга
    var phi = Math.atan2(y - cy, x - cx), up = Math.sin(phi - txt.rot) < 0, acc = 0;
    for (var i = 0; i < str.length; i++) {
      var cw = skin.measureText(str[i]).width, off = (acc + cw / 2) * k / rpx;
      acc += cw;
      var a = up ? phi - span / 2 + off : phi + span / 2 - off;
      skin.save();
      skin.translate(cx + rpx * Math.cos(a), cy + rpx * Math.sin(a));
      skin.rotate(up ? a + Math.PI / 2 : a - Math.PI / 2);
      skin.scale(k, k);
      skin.fillText(str[i], 0, M.mid);
      skin.restore();
    }
    if (outline) {
      var band = (M.asc + M.desc) / 2 * k + 8, gap = .06;
      skin.setLineDash([16, 10]); skin.lineWidth = 4.5; skin.strokeStyle = "#3fc1c9";
      skin.beginPath();
      skin.arc(cx, cy, rpx + band, phi - span / 2 - gap, phi + span / 2 + gap);
      skin.arc(cx, cy, Math.max(4, rpx - band), phi + span / 2 + gap, phi - span / 2 - gap, true);
      skin.closePath(); skin.stroke();
    }
  }
  // Дугу на тарелке включили, а надпись стоит у центра — переносим её к краю, наверх (как видит зритель)
  function txtToRim() {
    var r = Math.hypot(txt.u - .5, txt.v - .5) * blank.D;
    if (r > .5) return;
    var th = txt.rot = clay.rotation.y % (Math.PI * 2);
    txt.u = .5 + .86 * Math.sin(th) / blank.D; txt.v = .5 + .86 * Math.cos(th) / blank.D;
  }
  function txtStart() {
    if (txt.on || !blank || !txt.str.trim()) return;
    snapSkin(); // «Назад» убирает надпись целиком
    if (!txt.base) txt.base = makeCanvas(SKIN, SKIN);
    copySkin(txt.base, skinCv);
    txt.on = true; txt.touched = false;
    txtAnchor();
    txtDraw(true);
  }
  // Точка посередине видимой стороны изделия: туда встаёт новая надпись и символ, поставленный с клавиатуры
  function viewUV() {
    tmp.set(piece.position.x, piece.position.y + blank.textY, piece.position.z).project(camera);
    raycaster.setFromCamera(new V2(tmp.x, tmp.y), camera);
    var hit = raycaster.intersectObject(clay, false)[0];
    return hit && hit.uv ? hit.uv.clone() : null;
  }
  function txtAnchor() {
    txt.rot = clay.rotation.y % (Math.PI * 2);
    var uv = viewUV();
    if (uv) { txt.u = uv.x; txt.v = uv.y; }
    if (txt.arc && blank.kind === "disc") txtToRim();
  }
  // Надпись едет за пальцем по изделию
  function txtMove(uv) {
    if (!txt.on) txtStart();
    if (!txt.on) { tip("Сначала напишите текст в поле"); return; }
    var u = blank.wrap ? uv.x : clamp(uv.x, .04, .96), v = clamp(uv.y, .04, .96);
    if (Math.abs(u - txt.u) + Math.abs(v - txt.v) < 1e-4) return;
    txt.u = u; txt.v = v; txt.rot = clay.rotation.y % (Math.PI * 2);
    txt.touched = true;
    txtDraw(true);
    paint.changed = true;
  }
  function txtCommit() {
    if (!txt.on) return;
    txtDraw(false);
    txt.on = false;
    // пустая надпись — пустой шаг в «Назад», его убираем
    if (!txt.str.trim()) { var c = undoStack.pop(); if (c) undoPool.push(c); updateUndo(); }
    saveSoon();
  }
  // заглянули в «Текст» и ушли, ничего не тронув: «С любовью» не остаётся ни на изделии, ни в «Назад»
  function txtCancel() {
    if (!txt.on) return;
    copySkin(skinCv, txt.base); skinTex.needsUpdate = true;
    txt.on = false;
    var c = undoStack.pop(); if (c) undoPool.push(c);
    updateUndo();
  }
  function txtLeave() { if (txt.touched) txtCommit(); else txtCancel(); }
  function txtSize(k) {
    txt.size = clamp(txt.size * k, .1, .7);
    if (txt.on) txtDraw(true); else txtStart();
    txt.touched = true;
  }
  // Шрифт мог ещё не прийти (кириллица грузится отдельным файлом) — перерисуем, когда придёт
  function fontReady() {
    var f = txtFont(TF), probe = txt.str.trim() || "Аа";
    if (!document.fonts || !document.fonts.load || document.fonts.check(f, probe)) return;
    document.fonts.load(f, probe).then(function () { if (txt.on) txtDraw(true); });
  }

  /* Символы-штампы для заготовок: ставятся касанием туда, куда нажали, цветом из палитры.
     Каждый рисуется в квадрате от −1 до 1 (ось y вниз); светлые блики — полупрозрачным белым поверх цвета. */
  var HI = "rgba(255,255,255,.5)", TAU = Math.PI * 2;
  function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  var SYMBOLS = [
    ["heart", "Сердечко", function (g) {
      g.beginPath(); g.moveTo(0, .9); g.bezierCurveTo(-1.3, .02, -.82, -1.02, 0, -.4); g.bezierCurveTo(.82, -1.02, 1.3, .02, 0, .9); g.fill();
    }],
    ["star", "Звёздочка", function (g) {
      g.beginPath();
      for (var i = 0; i < 10; i++) { var r = i % 2 ? .42 : 1, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(r * Math.cos(a), r * Math.sin(a) + .08); }
      g.closePath(); g.fill();
    }],
    ["leaf", "Листик", function (g) {
      g.rotate(-.55);
      g.beginPath(); g.moveTo(0, -1); g.quadraticCurveTo(.78, -.1, 0, .82); g.quadraticCurveTo(-.78, -.1, 0, -1); g.fill();
      g.lineWidth = .09; g.lineCap = "round"; g.beginPath(); g.moveTo(0, .7); g.lineTo(0, 1.05); g.stroke();
      g.strokeStyle = HI; g.lineWidth = .06; g.beginPath(); g.moveTo(0, .66); g.lineTo(0, -.75); g.stroke();
    }],
    ["sun", "Солнышко", function (g) {
      dot(g, 0, 0, .46);
      g.lineWidth = .13; g.lineCap = "round";
      for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; g.beginPath(); g.moveTo(.63 * Math.cos(a), .63 * Math.sin(a)); g.lineTo(.96 * Math.cos(a), .96 * Math.sin(a)); g.stroke(); }
    }],
    ["flower", "Цветок", function (g) {
      for (var k = 0; k < 5; k++) { g.save(); g.rotate(k * TAU / 5); g.beginPath(); g.ellipse(0, -.5, .3, .47, 0, 0, TAU); g.fill(); g.restore(); }
      g.fillStyle = HI; dot(g, 0, 0, .2);
    }],
    ["snow", "Снежинка", function (g) {
      g.lineWidth = .1; g.lineCap = "round";
      for (var k = 0; k < 6; k++) {
        g.save(); g.rotate(k * Math.PI / 3);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -.98);
        g.moveTo(0, -.5); g.lineTo(-.24, -.74); g.moveTo(0, -.5); g.lineTo(.24, -.74);
        g.moveTo(0, -.24); g.lineTo(-.15, -.4); g.moveTo(0, -.24); g.lineTo(.15, -.4);
        g.stroke(); g.restore();
      }
    }],
    ["moon", "Месяц", function (g) {
      // часть круга r = 0.9, не закрытая кругом r = 0.78 со сдвигом 0.38 (точки пересечения посчитаны заранее)
      g.rotate(-.35);
      g.beginPath(); g.arc(0, 0, .9, 1.04, TAU - 1.04); g.arc(.38, 0, .78, TAU - 1.475, 1.475, true); g.closePath(); g.fill();
    }],
    ["cherry", "Вишенки", function (g) {
      g.lineWidth = .08; g.lineCap = "round";
      g.beginPath(); g.moveTo(-.42, .3); g.quadraticCurveTo(-.26, -.4, .12, -.82); g.moveTo(.38, .38); g.quadraticCurveTo(.3, -.3, .12, -.82); g.stroke();
      dot(g, -.42, .55, .32); dot(g, .38, .62, .32);
      g.beginPath(); g.ellipse(.42, -.78, .3, .13, -.4, 0, TAU); g.fill();
      g.fillStyle = HI; dot(g, -.52, .45, .07); dot(g, .28, .52, .07);
    }],
    ["cloud", "Облачко", function (g) {
      dot(g, -.48, .15, .36); dot(g, .02, -.12, .5); dot(g, .52, .16, .36);
      g.fillRect(-.48, .15, 1, .36);
    }],
    ["butterfly", "Бабочка", function (g) {
      [-1, 1].forEach(function (s) {
        g.beginPath(); g.ellipse(s * .45, -.3, .44, .36, -s * .5, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(s * .33, .38, .3, .27, s * .5, 0, TAU); g.fill();
      });
      g.beginPath(); g.ellipse(0, .05, .09, .6, 0, 0, TAU); g.fill();
      g.lineWidth = .06; g.lineCap = "round";
      g.beginPath(); g.moveTo(-.04, -.5); g.quadraticCurveTo(-.15, -.85, -.32, -.92); g.moveTo(.04, -.5); g.quadraticCurveTo(.15, -.85, .32, -.92); g.stroke();
      g.fillStyle = HI; dot(g, -.5, -.32, .12); dot(g, .5, -.32, .12);
    }],
    ["bird", "Птичка", function (g) {
      g.beginPath(); g.ellipse(-.08, .15, .58, .4, -.15, 0, TAU); g.fill();
      dot(g, .45, -.22, .27);
      g.beginPath(); g.moveTo(.68, -.3); g.lineTo(.98, -.18); g.lineTo(.68, -.1); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-.55, .05); g.lineTo(-1, -.3); g.lineTo(-.92, .3); g.closePath(); g.fill();
      g.fillStyle = HI;
      g.beginPath(); g.ellipse(-.15, .05, .32, .16, -.3, 0, TAU); g.fill();
      dot(g, .5, -.27, .055);
    }],
    ["face", "Личико", function (g) {
      // для неваляшки и матрёшки: глаза, улыбка, румяные щёки
      g.lineWidth = .07; g.lineCap = "round";
      g.beginPath(); g.arc(0, 0, .95, 0, TAU); g.stroke();
      g.beginPath(); g.ellipse(-.33, -.15, .09, .13, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(.33, -.15, .09, .13, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(0, .1, .36, .2 * Math.PI, .8 * Math.PI); g.stroke();
      g.globalAlpha *= .35; dot(g, -.58, .22, .16); dot(g, .58, .22, .16);
    }]
  ];
  var sym = { id: "heart", size: .17, icons: null };
  function symDraw(id) { for (var i = 0; i < SYMBOLS.length; i++) if (SYMBOLS[i][0] === id) return SYMBOLS[i][2]; }
  // значки для кнопок: белый силуэт, кнопка красит его своим цветом через маску (как остальные иконки)
  function symIcons() {
    if (sym.icons) return sym.icons;
    sym.icons = {};
    SYMBOLS.forEach(function (s) {
      var c = makeCanvas(64, 64), g = c.getContext("2d");
      g.fillStyle = g.strokeStyle = "#fff"; g.translate(32, 32); g.scale(27, 27);
      s[2](g);
      sym.icons[s[0]] = c.toDataURL();
    });
    return sym.icons;
  }
  function stampAt(uv) {
    var h = sym.size, sx = pxU(uv.y) * h, sy = pxV(uv.y) * h, x = uv.x * SKIN, y = (1 - uv.y) * SKIN, draw = symDraw(sym.id);
    (wraps() ? [-SKIN, 0, SKIN] : [0]).forEach(function (o) {
      skin.save();
      skin.fillStyle = skin.strokeStyle = paint.color; skin.globalAlpha = .95;
      skin.translate(x + o, y);
      // на вращающейся тарелке символ встаёт ровно к зрителю, как надпись
      if (blank.kind === "disc") skin.rotate(clay.rotation.y % TAU);
      skin.scale(sx, sy);
      draw(skin);
      skin.restore();
    });
    skinTex.needsUpdate = true;
  }

  function startPaint() {
    var D = mode === "decor"; // роспись заготовки: своя палитра, надпись, у картины нет вращения
    state = "paint"; grab(true);
    tip(D ? "Коснитесь " + blank.gen + " кистью" : "Коснитесь вазы кистью");
    setStep("paint"); blankStage("paint");
    spinGoal = D && !blank.spin ? 0 : 1.0;
    var pal = D ? PALETTE_D : PALETTE;
    paint.color = pal[0][0]; paint.size = 0.04; paint.tool = "brush"; paint.last = null;
    txt.on = false; txt.str = TXT_DEFAULT; txt.arc = false;
    var sw = pal.map(function (p, i) {
      return '<button class="swatch" type="button" style="--c:' + p[0] + '" data-color="' + p[0] + '" aria-label="' + p[1] + '" title="' + p[1] + '" aria-pressed="' + (i === 0) + '"></button>';
    }).join("");
    // у заготовок к кистям добавляется «Текст», поэтому подписи орнаментов короче: панель не должна расти
    var orn = ORNAMENTS.map(function (o) {
      return '<button class="chip" type="button" data-orn="' + o[0] + '" aria-pressed="false"' + (D ? ' title="' + o[1] + '"' : "") + '><span class="orn-ico orn-' + o[0] + '" aria-hidden="true"></span>' + (D ? o[2] : o[1]) + "</button>";
    }).join("");
    // Надпись и символы — только у заготовок: их строка появляется под инструментами, когда выбран «Текст» или «Символы»
    var sq = function (id, title, inner) { return '<button class="chip chip-sq" type="button" id="' + id + '" title="' + title + '" aria-label="' + title + '">' + inner + "</button>"; };
    var textChip = D ? '<button class="chip" type="button" data-tool="text" aria-pressed="false"><span class="ico ico-text" aria-hidden="true"></span><span class="lbl">Текст</span></button>' +
      '<button class="chip" type="button" data-tool="sym" aria-pressed="false"><span class="ico ico-sym" aria-hidden="true"></span>Символы</button>' : "";
    var subRows = D ? '<div class="row row-text" id="textRow" hidden>' +
      '<input class="text-in" id="textIn" type="text" maxlength="28" aria-label="Текст надписи" enterkeyhint="done" autocomplete="off" spellcheck="false">' +
      '<button class="chip chip-sq" type="button" id="textFont"><span class="font-aa" aria-hidden="true">Аа</span></button>' +
      '<button class="chip chip-sq" type="button" id="textArc" aria-pressed="false" title="' + (blank.kind === "disc" ? "Надпись по кругу тарелки" : "Надпись дугой") + '" aria-label="' + (blank.kind === "disc" ? "Надпись по кругу тарелки" : "Надпись дугой") + '"><span class="ico ico-arc" aria-hidden="true"></span></button>' +
      sq("textSmall", "Мельче", '<span class="ico ico-minus" aria-hidden="true"></span>') +
      sq("textBig", "Крупнее", '<span class="ico ico-plus" aria-hidden="true"></span>') + "</div>" +
      '<div class="row row-sym" id="symRow" hidden>' +
      SYMBOLS.map(function (s) { return '<button class="chip chip-sq" type="button" data-sym="' + s[0] + '" title="' + s[1] + '" aria-label="' + s[1] + '" aria-pressed="' + (s[0] === sym.id) + '"><span class="ico" aria-hidden="true"></span></button>'; }).join("") +
      sq("symSmall", "Символ мельче", '<span class="ico ico-minus" aria-hidden="true"></span>') +
      sq("symBig", "Символ крупнее", '<span class="ico ico-plus" aria-hidden="true"></span>') + "</div>" : "";
    // На телефоне инструменты — одна строка с прокруткой вбок (.tools), чтобы панель не съедала место у вазы
    panel("Роспись",
      D ? blank.paintHint : 'Коснитесь вазы — круг проведёт поясок.<span class="hint-more"> Орнамент ляжет туда, куда вы нажмёте.</span>',
      '<p class="label">Цвет</p><div class="row row-swatches">' + sw + "</div>" +
      '<div class="tools"><p class="label">' + (D ? "Кисть, текст, символы и орнамент" : "Кисть и орнамент") + '</p><div class="row">' +
      '<button class="chip" type="button" data-size="0.04" aria-pressed="true">Тонкая кисть</button>' +
      '<button class="chip" type="button" data-size="0.12" aria-pressed="false">Широкая кисть</button>' + textChip + orn + "</div></div>" + subRows +
      '<div class="row row-actions"><button class="btn btn-undo" type="button" id="undo" title="Отменить последнее действие (Ctrl+Z)" disabled><span class="ico ico-undo" aria-hidden="true"></span>Назад</button>' +
      '<button class="btn btn-glaze" type="button" id="toGlaze">Глазуровать и в печь <span class="ico ico-arrow" aria-hidden="true"></span></button></div>', "paint",
      // на виду сразу под заголовком: без них непонятно, что круг можно остановить, а роспись — смыть
      (D && !blank.spin ? "" : '<button class="chip chip-tool" type="button" id="spinToggle" aria-pressed="false"><span class="ico ico-pause" aria-hidden="true"></span><span class="lbl">Остановить круг</span></button>') +
      '<button class="chip chip-tool" type="button" id="wipe"><span class="ico ico-wipe" aria-hidden="true"></span>Смыть роспись</button>');
    clearUndo();
    var C = ui.controls;
    document.getElementById("undo").addEventListener("click", undoPaint);
    C.querySelectorAll("[data-color]").forEach(function (b) {
      b.addEventListener("click", function () {
        paint.color = b.dataset.color;
        C.querySelectorAll("[data-color]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        if (txt.on) { txt.touched = true; txtDraw(true); }
      });
    });
    function toolBtns(active) {
      C.querySelectorAll("[data-size],[data-orn],[data-tool]").forEach(function (x) { x.setAttribute("aria-pressed", x === active ? "true" : "false"); });
      if (D) subMode();
    }
    C.querySelectorAll("[data-size]").forEach(function (b) {
      b.addEventListener("click", function () { paint.size = +b.dataset.size; paint.tool = "brush"; toolBtns(b); });
    });
    C.querySelectorAll("[data-orn]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        paint.tool = b.dataset.orn; toolBtns(b);
        if (e.detail === 0) { // с клавиатуры: кладём пояс на случайную высоту
          snapSkin();
          if (D) bandAt(randomBandUV());
          else drawBand(paint.tool, outerV(Math.floor(rand(.25, .85) * (N - 1))), paint.color);
          saveSoon();
        }
      });
    });
    var spinBtn = document.getElementById("spinToggle");
    function setSpin(stopped) {
      // aria-pressed = «круг остановлен»; подпись говорит, что случится по нажатию
      spinBtn.setAttribute("aria-pressed", stopped ? "true" : "false");
      spinBtn.querySelector(".lbl").textContent = stopped ? "Запустить круг" : "Остановить круг";
      spinBtn.querySelector(".ico").className = "ico " + (stopped ? "ico-play" : "ico-pause");
      spinGoal = stopped ? 0 : 1.0;
    }
    if (spinBtn) spinBtn.addEventListener("click", function () { setSpin(this.getAttribute("aria-pressed") !== "true"); });
    document.getElementById("wipe").addEventListener("click", function () { txtLeave(); snapSkin(); if (D) skinBlank(); else skinBisque(); saveSoon(); });
    document.getElementById("toGlaze").addEventListener("click", function () { txtCommit(); startFire(); });
    if (!D) return;

    // Надпись: поле, шрифт (по кругу из трёх), дуга, мельче/крупнее; двигают пальцем прямо по изделию.
    // Символы: выбирают значок и ставят касанием, мельче/крупнее.
    var textRow = document.getElementById("textRow"), symRow = document.getElementById("symRow"), inp = document.getElementById("textIn");
    var chipT = C.querySelector("[data-tool=text]"), chipS = C.querySelector("[data-tool=sym]"), fontB = document.getElementById("textFont"), arcB = document.getElementById("textArc");
    inp.value = txt.str;
    arcB.setAttribute("aria-pressed", txt.arc ? "true" : "false");
    function subMode() {
      var t = paint.tool === "text", s = paint.tool === "sym";
      if (!t) txtLeave();
      textRow.hidden = !t; symRow.hidden = !s;
      // пока открыта строка надписи или символов, подписи групп прячутся: строка встаёт на их место, и панель не растёт
      C.classList.toggle("is-sub", t || s);
      chipT.querySelector(".lbl").textContent = t ? "Ещё надпись" : "Текст";
      ui.hint.innerHTML = t ? "Перетащите надпись пальцем по " + blank.dat + "." : s ? "Выберите символ и нажмите на " + blank.acc + "." : blank.paintHint;
      tip(t ? "Ведите надпись пальцем" : s ? "Нажмите, куда поставить символ" : "");
      if (!t) return;
      // по неподвижному изделию надпись вести проще; круг встаёт сразу, чтобы надпись не уехала из-под глаз
      if (spinBtn) { setSpin(true); spin = 0; }
      txtStart(); fontReady();
    }
    chipT.addEventListener("click", function () {
      // уже пишем: эта надпись остаётся на изделии, следующую набирают заново
      if (paint.tool === "text") { txtCommit(); inp.value = txt.str = ""; inp.focus(); return; }
      paint.tool = "text"; toolBtns(chipT);
    });
    chipS.addEventListener("click", function () { paint.tool = "sym"; toolBtns(chipS); });
    var icons = symIcons();
    symRow.querySelectorAll("[data-sym]").forEach(function (b) {
      b.querySelector(".ico").style.setProperty("--ic", "url(" + icons[b.dataset.sym] + ")");
      b.addEventListener("click", function (e) {
        sym.id = b.dataset.sym;
        symRow.querySelectorAll("[data-sym]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        if (e.detail === 0) { var uv = viewUV(); if (uv) { snapSkin(); stampAt(uv); saveSoon(); } } // с клавиатуры — посередине видимой стороны
      });
    });
    document.getElementById("symSmall").addEventListener("click", function () { sym.size = clamp(sym.size / 1.2, .08, .45); });
    document.getElementById("symBig").addEventListener("click", function () { sym.size = clamp(sym.size * 1.2, .08, .45); });
    arcB.addEventListener("click", function () {
      txt.arc = !txt.arc;
      arcB.setAttribute("aria-pressed", txt.arc ? "true" : "false");
      if (!txt.on) txtStart();
      if (!txt.on) return;
      if (txt.arc && blank.kind === "disc") txtToRim();
      txtDraw(true); txt.touched = true;
    });
    inp.addEventListener("input", function () {
      inp.dataset.touched = "1";
      txt.str = inp.value;
      if (txt.on) txtDraw(true); else txtStart();
      txt.touched = true;
      fontReady();
    });
    // первое касание поля выделяет «С любовью», чтобы сразу писать своё
    inp.addEventListener("focus", function () { if (!inp.dataset.touched) inp.select(); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } });
    function fontLabel() {
      var f = FONTS[txt.font];
      fontB.querySelector(".font-aa").style.fontFamily = '"' + f[0] + '", serif';
      fontB.title = "Шрифт: " + f[2] + ". Нажмите, чтобы сменить";
      fontB.setAttribute("aria-label", fontB.title);
    }
    fontLabel();
    fontB.addEventListener("click", function () {
      txt.font = (txt.font + 1) % FONTS.length; fontLabel(); fontReady();
      if (txt.on) txtDraw(true); else txtStart();
      txt.touched = true;
    });
    document.getElementById("textSmall").addEventListener("click", function () { txtSize(1 / 1.2); });
    document.getElementById("textBig").addEventListener("click", function () { txtSize(1.2); });
  }

  function outerV(i) { return (2 + i) / (P - 1); }
  function rAtV(v) { var i = Math.round(v * (P - 1)) - 2; return R[clamp(i, 0, N - 1)]; }
  // Масштаб холста росписи: пикселей на единицу длины вокруг изделия (u) и вдоль профиля (v). У заготовок — свой.
  function pxU(v) { return blank ? blank.pxU(v) : SKIN / (2 * Math.PI * Math.max(rAtV(v), .2)); }
  function pxV(v) { return blank ? blank.pxV(v) : SKIN * (N - 1) / ((P - 1) * (H - BASE)); }
  // тела вращения замкнуты по u; тарелка и картина — плоский лист с краями
  function wraps() { return !blank || blank.wrap; }

  function dab(x, y, rx, ry) {
    var w = wraps() ? 1 : 0;
    for (var o = -w; o <= w; o++) {
      var xx = x + o * SKIN;
      if (xx + rx < 0 || xx - rx > SKIN) continue;
      skin.beginPath(); skin.ellipse(xx, y, rx, ry, 0, 0, Math.PI * 2); skin.fill();
    }
  }
  function strokeUV(a, b) {
    var ux = pxU(b.y), vy = pxV(b.y), wrap = wraps();
    // у самой оси (центр дна) окружность крошечная, и пятно кисти по u растёт; больше полхолста не бывает
    var rx = Math.min(paint.size * ux, SKIN / 2), ry = paint.size * vy;
    var du = b.x - a.x;
    if (wrap) { if (du > .5) du -= 1; else if (du < -.5) du += 1; }
    var x0 = a.x * SKIN, y0 = (1 - a.y) * SKIN, dx = du * SKIN, dy = (a.y - b.y) * SKIN;
    var steps = Math.min(80, Math.ceil(Math.max(Math.abs(dx) / rx, Math.abs(dy) / ry) * 2.5) + 1);
    skin.fillStyle = paint.color; skin.globalAlpha = .92;
    for (var s = 0; s <= steps; s++) {
      var t = s / steps, x = x0 + dx * t;
      if (wrap) x = ((x % SKIN) + SKIN) % SKIN;
      dab(x, y0 + dy * t, rx * rand(.92, 1.05), ry * rand(.92, 1.05));
    }
    skin.globalAlpha = 1;
    skinTex.needsUpdate = true;
  }

  // Орнаментальные пояса: рисуем в мировых единицах, учитывая окружность (у картины — ширину)
  function drawBand(type, v, color) {
    var C = blank ? blank.bandLen(v) : 2 * Math.PI * Math.max(rAtV(v), .2);
    var bandH = 0.22, cellW = type === "chuvash" ? 0.46 : (type === "dots" ? 0.16 : 0.24);
    var n = Math.max(4, Math.round(C / cellW)); cellW = C / n;
    var su = SKIN / C, sv = pxV(v);
    var cy = (1 - v) * SKIN;
    skin.save();
    skin.fillStyle = color; skin.strokeStyle = color;
    skin.translate(0, cy - bandH * sv / 2);
    skin.scale(su, sv);
    // верхняя и нижняя линии пояса
    skin.fillRect(0, 0, C, 0.018); skin.fillRect(0, bandH - 0.018, C, 0.018);
    for (var k = 0; k < n; k++) {
      skin.save();
      skin.translate(k * cellW, 0);
      bandCell(type, cellW, bandH);
      skin.restore();
    }
    skin.restore();
    skinTex.needsUpdate = true;
  }
  // Тарелка: орнамент ложится кольцом вокруг центра, верх узора — к краю
  function drawRing(type, r, color) {
    var bandH = 0.2, s = SKIN / blank.D;
    r = clamp(r, .24, blank.rimR - bandH / 2);
    var C = 2 * Math.PI * r, cellW = type === "chuvash" ? 0.46 : (type === "dots" ? 0.16 : 0.24);
    var n = Math.max(8, Math.round(C / cellW)); cellW = C / n;
    skin.save();
    skin.fillStyle = color; skin.strokeStyle = color;
    skin.translate(SKIN / 2, SKIN / 2); skin.scale(s, s);
    skin.lineWidth = 0.018;
    [r + bandH / 2 - .009, r - bandH / 2 + .009].forEach(function (rr) { skin.beginPath(); skin.arc(0, 0, rr, 0, Math.PI * 2); skin.stroke(); });
    for (var k = 0; k < n; k++) {
      skin.save();
      skin.rotate(k / n * Math.PI * 2);
      skin.translate(-cellW / 2, -(r + bandH / 2));
      bandCell(type, cellW, bandH);
      skin.restore();
    }
    skin.restore();
    skinTex.needsUpdate = true;
  }
  // Орнамент на заготовке там, куда нажали
  function bandAt(uv) {
    if (blank.kind === "disc") drawRing(paint.tool, Math.hypot(uv.x - .5, uv.y - .5) * blank.D, paint.color);
    else drawBand(paint.tool, clamp(uv.y, .04, .96), paint.color);
  }
  function randomBandUV() {
    if (blank.kind === "disc") return new V2(.5 + rand(.12, .4), .5);
    if (blank.kind === "flat") return new V2(.5, rand(.2, .8));
    var s = blank.surf;
    return new V2(.5, lerp(s.o0, s.o1, rand(.25, .85)) / (s.n - 1));
  }
  // Одна ячейка орнамента в прямоугольнике cellW × bandH (мировые единицы), верх ячейки — y = 0
  function bandCell(type, cellW, bandH) {
    if (type === "meander") {
      skin.scale(cellW / 28, bandH / 28);
      skin.lineWidth = 2.8; skin.lineCap = "square";
      skin.beginPath(); skin.moveTo(21, 24.5); skin.lineTo(21, 5); skin.lineTo(5, 5); skin.lineTo(5, 19); skin.lineTo(15, 19); skin.lineTo(15, 11); skin.lineTo(10, 11);
      skin.moveTo(0, 24.5); skin.lineTo(28, 24.5);
      skin.stroke();
    } else if (type === "chuvash") {
      skin.scale(cellW / 56, bandH / 28);
      skin.lineWidth = 2.4;
      skin.beginPath(); skin.moveTo(14, 4.5); skin.lineTo(23.5, 14); skin.lineTo(14, 23.5); skin.lineTo(4.5, 14); skin.closePath(); skin.stroke();
      skin.beginPath(); skin.moveTo(14, 9.5); skin.lineTo(18.5, 14); skin.lineTo(14, 18.5); skin.lineTo(9.5, 14); skin.closePath(); skin.fill();
      skin.fillRect(37, 9, 10, 10);
      skin.beginPath(); skin.moveTo(42, 6.2); skin.lineTo(49.8, 14); skin.lineTo(42, 21.8); skin.lineTo(34.2, 14); skin.closePath(); skin.fill();
      skin.lineWidth = 1.8;
      skin.beginPath(); skin.moveTo(28, 8); skin.lineTo(28, 20); skin.moveTo(26, 10); skin.lineTo(30, 10); skin.moveTo(26, 18); skin.lineTo(30, 18); skin.stroke();
    } else if (type === "wave") {
      skin.scale(cellW / 28, bandH / 28);
      skin.beginPath();
      skin.moveTo(0, 24); skin.lineTo(0, 18);
      skin.bezierCurveTo(4, 8, 14, 4, 20, 10);
      skin.bezierCurveTo(24, 14, 19, 19, 16, 15);
      skin.bezierCurveTo(14, 12, 20, 11, 21, 15);
      skin.bezierCurveTo(23, 20, 26, 20, 28, 18);
      skin.lineTo(28, 24); skin.closePath(); skin.fill();
    } else {
      skin.scale(cellW / 16, bandH / 28);
      skin.beginPath(); skin.ellipse(8, 14, 3.6, 3.6, 0, 0, Math.PI * 2); skin.fill();
    }
  }

  function updatePaint() {
    if (!pointer.down || !pointer.onCanvas) { paint.last = null; return; }
    tip("");
    raycaster.setFromCamera(pointer.ndc, camera);
    // у кружки расписывается и ручка
    var hit = blank ? raycaster.intersectObjects(blank.targets, false)[0] : raycaster.intersectObject(clay, false)[0];
    if (!hit || !hit.uv) { paint.last = null; return; }
    var uv = hit.uv.clone();
    if (paint.tool === "text") { pointer.fresh = false; txtMove(uv); return; }
    if (paint.tool === "sym") {
      if (pointer.fresh) { snapSkin(); stampAt(uv); paint.changed = true; }
      pointer.fresh = false;
      return;
    }
    if (paint.tool !== "brush") {
      if (pointer.fresh) {
        snapSkin();
        if (blank) bandAt(uv);
        else drawBand(paint.tool, clamp(uv.y, outerV(2), outerV(N - 3)), paint.color);
        paint.changed = true;
      }
      pointer.fresh = false;
      return;
    }
    pointer.fresh = false;
    // один мазок от касания до отпускания — один шаг «Назад», даже если палец соскальзывал с вазы
    if (!paint.snapped) { snapSkin(); paint.snapped = true; }
    strokeUV(paint.last || uv, uv);
    paint.last = uv;
    paint.changed = true;
  }

  /* ---------- 5. готово */
  function startDone() {
    var D = mode === "decor";
    state = "done"; clayMat.emissiveIntensity = 0;
    photo = null;
    focus = "done"; framing("done");
    setStep("done"); spinGoal = D && !blank.spin ? 0 : 0.35;
    blankStage("done");
    // кнопка записи появляется только сейчас: на ПК — под аркой, на телефоне — в панели (.game-cta), чтобы не уходить за край экрана
    heroEl.classList.add("cta-on");
    var cta = heroEl.querySelector(".hero-cta");
    // «Сохранить фото» — заметная кнопка с мягкой пульсацией, чтобы её не пропустили; «Поделиться» — там, где браузер умеет отправлять файлы.
    // Рядом — второе занятие: после круга можно расписать заготовку, после росписи — слепить на круге.
    panel("Готово!",
      D ? blank.done : 'Ваза обожжена и сияет глазурью. Настоящую слепите в «Сенсорике»!<span class="hint-more"> Она будет тяжёлой, тёплой и только вашей.</span>',
      '<div class="row"><button class="btn btn-save" type="button" id="savePic"><span class="ico ico-camera" aria-hidden="true"></span>Сохранить фото</button>' +
      (CAN_SHARE ? '<button class="btn btn-share" type="button" id="sharePic"><span class="ico ico-share" aria-hidden="true"></span>Поделиться</button>' : "") +
      '<button class="chip" type="button" id="again">' + (D ? "Расписать ещё" : "Слепить ещё") + "</button>" +
      '<button class="chip" type="button" id="other">' + (D ? "Слепить на круге" : "Расписать изделие") + "</button></div>" +
      (cta ? '<a class="btn btn-glaze game-cta" href="' + cta.href + '" target="_blank" rel="noopener">Записаться в мастерскую</a>' : ""), "done");
    document.getElementById("savePic").addEventListener("click", savePicture);
    if (CAN_SHARE) document.getElementById("sharePic").addEventListener("click", sharePicture);
    document.getElementById("again").addEventListener("click", D ? againDecor : restart);
    document.getElementById("other").addEventListener("click", function () { switchTo(D ? "wheel" : "decor"); });
  }
  // «Расписать ещё»: на турнетку встаёт чистая заготовка того же вида, её можно сменить
  function againDecor() {
    resetPlay();
    startPick(true);
    save();
  }
  // Со страницы «Готово» — сразу во второе занятие, минуя выбор
  function switchTo(m) {
    resetPlay();
    if (m === "wheel") { setMode("wheel"); startLump(); }
    else { setMode("decor"); setBlank(BLANK_ORDER[0]); startPick(true); }
    save();
  }
  // Открытка с готовой вазой 1080×1350. «Сохранить фото»: на iPhone и iPad — через меню «Поделиться» (в фото оттуда сохраняет
  // только «Сохранить изображение»), на Android и компьютере — файлом, на Android он появляется в галерее.
  // «Поделиться» отправляет саму картинку в мессенджер или соцсеть.
  var IOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var PHOTO_NAME = "moya-vaza-sensorika.jpg";
  function photoName() { return mode === "decor" ? blank.file : PHOTO_NAME; }
  var CAN_SHARE = (function () {
    try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([""], PHOTO_NAME, { type: "image/jpeg" })] })); }
    catch (e) { return false; }
  })();
  function renderPostcard() {
    var W = 1080, H = 1350;
    var size = new V2(); renderer.getSize(size);
    var pr = renderer.getPixelRatio(), asp = camera.aspect;
    renderer.setPixelRatio(1);
    renderer.setSize(W, 1080, false);
    camera.aspect = 1; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    var out = makeCanvas(W, H), g = out.getContext("2d");
    var grd = g.createRadialGradient(W / 2, 600, 40, W / 2, 600, 820);
    grd.addColorStop(0, "#5a3138"); grd.addColorStop(.55, "#2e1c2f"); grd.addColorStop(1, "#1f1424");
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.drawImage(renderer.domElement, 0, 90, W, 1080);
    renderer.setPixelRatio(pr);
    renderer.setSize(size.x, size.y, false);
    camera.aspect = asp; camera.updateProjectionMatrix();
    // пояс-орнамент: ромбы со звёздами, как под первым экраном
    var bandY = 1112, bh = 74;
    g.fillStyle = "#e7a082"; g.fillRect(0, bandY, W, bh);
    g.strokeStyle = g.fillStyle = "#2b1c30"; g.lineWidth = 5;
    for (var x = 0; x < W + 120; x += 120) {
      g.beginPath(); g.moveTo(x, bandY + 8); g.lineTo(x + 56, bandY + bh / 2); g.lineTo(x, bandY + bh - 8); g.lineTo(x - 56, bandY + bh / 2); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(x, bandY + 24); g.lineTo(x + 13, bandY + bh / 2); g.lineTo(x, bandY + bh - 24); g.lineTo(x - 13, bandY + bh / 2); g.closePath(); g.fill();
    }
    g.fillStyle = "#1f1424"; g.fillRect(0, bandY + bh, W, H - bandY - bh);
    g.textAlign = "center"; g.fillStyle = "#f6decf";
    g.font = "64px Ledger, Forum, serif";
    g.fillText(mode === "decor" ? blank.card : "МОЯ ПЕРВАЯ ВАЗА", W / 2, 110);
    // Контакты мастерской под поясом: логотип, название, адрес и телефон из data/site.js
    var st = (window.SITE && window.SITE.studio) || {};
    var logo = document.querySelector(".brand-mark"), fy = bandY + bh, tx = 72;
    if (logo && logo.complete && logo.naturalWidth) {
      g.save(); g.beginPath(); g.arc(72 + 54, fy + 82, 54, 0, Math.PI * 2); g.clip();
      g.drawImage(logo, 72, fy + 28, 108, 108); g.restore();
      g.strokeStyle = "rgba(233,178,147,.5)"; g.lineWidth = 3;
      g.beginPath(); g.arc(72 + 54, fy + 82, 56, 0, Math.PI * 2); g.stroke();
      tx = 72 + 108 + 36;
    }
    function line(text, font, size, color, y) {
      var max = W - tx - 56;
      g.font = font.replace("#", size);
      while (g.measureText(text).width > max && size > 20) { size -= 1; g.font = font.replace("#", size); }
      g.fillStyle = color; g.fillText(text, tx, y);
    }
    g.textAlign = "left";
    line("Творческая мастерская «" + (st.name || "Сенсорика") + "»", "#px 'Bad Script', cursive", 44, "#f0b49a", fy + 60);
    line([st.city, st.address].filter(Boolean).join(", "), "#px 'Golos Text', sans-serif", 31, "#f6decf", fy + 104);
    if (st.phone) line(st.phone, "600 #px 'Golos Text', sans-serif", 34, "#f6decf", fy + 146);
    return out;
  }
  // Открытка рисуется при первом нажатии и дальше берётся готовой (сбрасывает её startDone):
  // повторное «Поделиться» открывается сразу, пока браузер ещё считает его ответом на нажатие
  var photo = null;
  function postcard() {
    if (photo) return photo;
    var p = photo = { card: renderPostcard(), file: null, ready: [] };
    p.card.toBlob(function (blob) {
      if (!blob) { if (photo === p) photo = null; return; }
      p.file = new File([blob], photoName(), { type: "image/jpeg" });
      p.ready.forEach(function (f) { f(p.file); });
      p.ready.length = 0;
    }, "image/jpeg", 0.92);
    return p;
  }
  function withFile(cb) { var p = postcard(); if (p.file) cb(p.file); else p.ready.push(cb); }
  function download(blob) {
    var a = document.createElement("a");
    a.download = photoName();
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  // Кадр «снят»: вспышка в арке, готовая открытка всплывает фотокарточкой и улетает в кнопку
  function snapEffect(card) {
    if (REDUCED || !card.animate) return;
    var flash = document.createElement("div");
    flash.className = "snap-flash";
    stageEl.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 700);
    var r = stageEl.getBoundingClientRect(), w = Math.min(Math.max(r.width * 1.05, 180), 300);
    var wrap = document.createElement("div");
    wrap.className = "snap-card"; wrap.setAttribute("aria-hidden", "true");
    wrap.appendChild(card);
    wrap.style.left = (r.left + r.width / 2 - w / 2) + "px";
    wrap.style.width = w + "px";
    document.body.appendChild(wrap);
    var h = wrap.offsetHeight, top = Math.max(8, r.top + r.height / 2 - h / 2);
    wrap.style.top = top + "px";
    var btn = document.getElementById("savePic"), b = btn && btn.getBoundingClientRect();
    var dx = b ? b.left + b.width / 2 - (r.left + r.width / 2) : 0, dy = b ? b.top + b.height / 2 - (top + h / 2) : h;
    wrap.animate([
      { opacity: 0, transform: "scale(1.12)" },
      { opacity: 1, transform: "scale(1) rotate(0deg)", offset: .14 },
      { opacity: 1, transform: "scale(.96) rotate(-3deg)", offset: .62 },
      { opacity: 0, transform: "translate(" + dx + "px," + dy + "px) scale(.12) rotate(-12deg)" }
    ], { duration: 1800, easing: "cubic-bezier(.45,0,.25,1)", fill: "forwards" }).onfinish = function () { wrap.remove(); };
  }
  // Только файл, без текста и заголовка: получив вместе с картинкой подпись, многие мессенджеры и соцсети
  // отправляют одну подпись. Название, адрес и телефон мастерской и так нарисованы на открытке.
  function shareFile(file) {
    navigator.share({ files: [file] }).catch(function (err) { if (err && err.name !== "AbortError") download(file); });
  }
  function savePicture() {
    var btn = document.getElementById("savePic");
    if (btn) btn.classList.add("is-saved");
    var t0 = performance.now(), viaShare = IOS && CAN_SHARE;
    snapEffect(postcard().card);
    withFile(function (file) {
      // iPhone: меню «Поделиться» должно открыться в пределах секунды после нажатия, иначе Safari его не пустит.
      // Остальные: файл сохраняется, когда карточка долетела до кнопки.
      var wait = Math.max(0, (viaShare ? 600 : 1500) - (performance.now() - t0));
      setTimeout(function () { if (viaShare) shareFile(file); else download(file); }, wait);
    });
  }
  function sharePicture() {
    withFile(function (file) {
      if (navigator.canShare({ files: [file] })) shareFile(file); else download(file);
    });
  }
  /* ---------------------------------------------------------------- указатель */
  var pointer = { ndc: new V2(), down: false, onCanvas: false, fresh: false, x: 0, y: 0 };
  function setPointer(e) {
    var r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    pointer.ndc.set(pointer.x / r.width * 2 - 1, -(pointer.y / r.height) * 2 + 1);
    ui.ring.style.transform = "translate(" + pointer.x + "px," + pointer.y + "px)";
  }
  function interactive() { return state === "shape" || state === "paint"; }
  canvas.addEventListener("pointerdown", function (e) {
    setPointer(e);
    pointer.onCanvas = true;
    markPlaying();
    // набрали надпись и взялись двигать её по изделию: клавиатура телефона прячется и не закрывает арку
    var ae = document.activeElement;
    if (ae && ae.tagName === "INPUT" && ui.controls.contains(ae)) ae.blur();
    if (interactive() || state === "lump" || state === "fire") {
      pointer.down = true; pointer.fresh = true;
      if (interactive()) canvas.setPointerCapture(e.pointerId);
    }
    ui.ring.classList.toggle("is-on", interactive());
  });
  canvas.addEventListener("pointermove", function (e) {
    setPointer(e); pointer.onCanvas = true;
    ui.ring.classList.toggle("is-on", interactive() && (e.pointerType === "mouse" || pointer.down));
  });
  function release() {
    if (!pointer.down) return;
    pointer.down = false; paint.last = null; paint.snapped = false;
    if (!matchMedia("(hover: hover)").matches) ui.ring.classList.remove("is-on");
    // отпустили палец — форма или роспись сохраняются
    if (state === "shape") saveSoon();
    else if (state === "paint" && paint.changed) { paint.changed = false; saveSoon(); }
  }
  // долгое нажатие на телефоне открывает меню и выделение — в игре оно не нужно
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  // палец ушёл с глины и отпущен уже за её пределами (на ком и печи захвата нет)
  window.addEventListener("pointerup", release);
  canvas.addEventListener("pointerleave", function () { if (!pointer.down) { pointer.onCanvas = false; ui.ring.classList.remove("is-on"); finger.visible = false; } });

  /* ---------------------------------------------------------------- цикл */
  var clock = new THREE.Clock();
  var visible = true, started = false, raf = 0;
  function frame() {
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = Math.min(clock.getDelta(), 1 / 20);
    var time = clock.elapsedTime;

    for (var i = tweens.length - 1; i >= 0; i--) {
      var tw = tweens[i];
      tw.t += dt;
      var k = Math.min(1, tw.t / tw.d);
      tw.fn(k);
      if (k >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
    }

    if (state === "lump") updateLump(dt);
    else if (state === "shape") updateShape(dt);
    else if (state === "fire") updateFire(dt);
    else if (state === "paint") updatePaint();

    spin += (spinGoal - spin) * Math.min(1, dt * 2.5);
    var dA = spin * dt;
    wheelHead.rotation.y += dA;
    // картина стоит на подставке и не вращается
    if (state !== "transfer" && state !== "cooling" && state !== "fire" && state !== "cracked" && !(blank && !blank.spin)) clay.rotation.y += dA;

    if (dirty) rebuild();

    if (blank) {
      // бока картины повторяют глину лицевой стороны: обжиг, свечение, глазурь
      if (blank.kind === "flat") {
        edgeMat.roughness = clayMat.roughness; edgeMat.clearcoat = clayMat.clearcoat;
        edgeMat.clearcoatRoughness = clayMat.clearcoatRoughness; edgeMat.emissiveIntensity = clayMat.emissiveIntensity;
      }
      if (blank.flame && blank.flame.visible) {
        var fl = Math.sin(time * 11) * .5 + Math.sin(time * 27 + 1.3) * .3;
        candleLight.intensity = 2.4 + fl * .5;
        blank.flame.scale.set(1 - fl * .06, 2.2 + fl * .25, 1 - fl * .06);
      }
    }

    flames.forEach(function (f) {
      var n = Math.sin(time * 9 + f.seed) * .5 + Math.sin(time * 23 + f.seed * 3) * .3;
      f.light.intensity = 3 + n * .7;
    });

    var damp = 1 - Math.exp(-dt * (REDUCED ? 60 : 3.2));
    view.pos.lerp(view.goalPos, damp);
    view.target.lerp(view.goalTarget, damp);
    camera.position.copy(view.pos);
    camera.lookAt(view.target);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !document.hidden) { clock.getDelta(); raf = requestAnimationFrame(frame); } }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }, { threshold: 0.02 }).observe(heroEl);
  }
  document.addEventListener("visibilitychange", kick);
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stageEl);
  else window.addEventListener("resize", resize);

  resize();
  framing("wheel"); snapCamera();
  started = true;

  function begin() {
    var demo = (location.search.match(/[?&]demo=([\w-]+)/) || [])[1];
    var saved = loadSave();
    var tmp = new Float32Array(N);
    var dm = demo && demo.match(/^(pick|paint|fire|done)-(\w+)$/);
    // ?demo=shape|fire|paint|done — сразу нужный этап круга (для проверки кадра и скриншотов), без сохранения;
    // ?demo=paint-mug, done-plate… — то же для заготовок (mug, candle, vase, plate, picture); ?demo=lump — сразу ком
    if (demo === "lump") startLump();
    else if (demo === "shape") { placeShape(tmp, presetProfile("jar", tmp)); matWet(); skinNeutral(); startShape(); }
    else if (demo === "fire") restore({ step: "fire", R: tmp, H: presetProfile("vase", tmp) });
    else if (demo === "paint") restore({ step: "paint", R: tmp, H: presetProfile("vase", tmp) });
    else if (demo === "done") {
      restore({ step: "done", R: tmp, H: presetProfile("amphora", tmp) });
      drawBand("meander", outerV(30), "#2b1c30"); drawBand("chuvash", outerV(16), "#9e4b35"); drawBand("dots", outerV(38), "#3fc1c9");
    }
    else if (dm && BLANKS[dm[2]]) {
      restore({ mode: "decor", blank: dm[2], step: dm[1] });
      if (dm[1] === "done") {
        paint.tool = "chuvash"; bandAt(randomBandUV()); paint.tool = "meander"; bandAt(randomBandUV());
        txt.base = makeCanvas(SKIN, SKIN); copySkin(txt.base, skinCv);
        txt.u = blank.wrap ? 0 : .5; txt.v = blank.wrap ? vAtY(blank.surf, blank.textY) : .5;
        txtDraw(false);
      }
    }
    else if (saved && (saved.mode === "decor" || saved.step !== "lump")) restore(saved);
    else startChoice();
    kick();
  }
  // Первый вход: ком падает на круг, когда уходит заставка, а не под ней
  if (document.documentElement.classList.contains("is-splash")) {
    state = "intro";
    window.addEventListener("splashdone", begin, { once: true });
    kick();
  } else begin();
})();

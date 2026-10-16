/* ==========================================================================
   Сенсорика: «Слепите вазу» — 3D-демо полного цикла
   ком → центровка → формовка на круге → роспись → глазурь и обжиг → готово
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
  var batSide = new THREE.MeshStandardMaterial({ color: 0x4a3534, roughness: .55, metalness: .1 });
  var wheelHead = new THREE.Mesh(
    new THREE.CylinderGeometry(1.62, 1.66, 0.3, 120),
    [batSide, new THREE.MeshPhysicalMaterial({ map: batTexture(), roughness: .42, clearcoat: .4, clearcoatRoughness: .35 }), batSide]
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
      else if (name === "bowl") r = 0.56 + 0.64 * Math.pow(Math.sin(t * Math.PI / 2), 0.75);
      else if (name === "jar") r = 0.6 + 0.3 * Math.exp(-Math.pow((t - .42) / .3, 2)) - 0.1 * smooth(t, .6, .86) + 0.14 * smooth(t, .86, 1);
      else if (name === "mug") r = 0.86 - 0.04 * t + 0.03 * Math.exp(-Math.pow((t - .12) / .1, 2));
      else if (name === "vase") r = 0.48 + 0.58 * Math.exp(-Math.pow((t - .34) / .24, 2)) - 0.12 * smooth(t, .55, .82) + 0.28 * smooth(t, .8, 1);
      else r = 0.38 + 0.6 * Math.exp(-Math.pow((t - .42) / .22, 2)) - 0.02 * t + 0.15 * smooth(t, .88, 1); // amphora
      out[i] = r;
    }
    return { jar: 1.75, cylinder: 1.3, bowl: 1.0, mug: 1.55, vase: 2.1, amphora: 2.3 }[name];
  }

  /* ---------------------------------------------------------------- камера и кадр */
  var view = { pos: new V3(), target: new V3(), goalPos: new V3(), goalTarget: new V3() };
  var focus = "wheel";
  // Один близкий ракурс на всех этапах — у круга, в печи и на росписи: ваза не меняет размер, мелкие детали удобно вести пальцем.
  // Кадр подобран под самую большую форму (RMAX × HMAX) при соотношении сторон проёма арки ≈ 0,92.
  var FRAME = { y: 1.08, half: 1.53, elev: 0.18 };
  function framing(where) {
    var cx = where === "kiln" ? KX : 0;
    var dist = FRAME.half / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    view.goalTarget.set(cx, FRAME.y, 0);
    view.goalPos.set(cx, FRAME.y + dist * Math.sin(FRAME.elev), dist * Math.cos(FRAME.elev));
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
  function setStep(name) {
    var idx = STEPS.indexOf(name);
    ui.frieze.querySelectorAll("li").forEach(function (li, i) {
      li.classList.toggle("is-active", i === idx);
      li.classList.toggle("is-done", i < idx);
    });
    ui.step.textContent = "Этап " + (idx + 1) + " из 5";
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
  var saveTimer = 0;
  function loadSave() {
    if (DEMO) return null;
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!s || s.v !== 1 || Date.now() - s.t > SAVE_TTL) return null;
      if (s.step !== "lump" && !(s.R && s.R.length === N)) return null;
      return s;
    } catch (e) { return null; }
  }
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (DEMO) return;
    var step = SAVE_STEP[state] || "lump";
    var s = { v: 1, t: Date.now(), step: step };
    if (step !== "lump") {
      s.H = +H.toFixed(4);
      s.R = Array.prototype.map.call(R, function (r) { return +r.toFixed(4); });
    }
    // роспись — картинкой: пока глина подсыхает, на изделии ещё нет росписи
    if ((step === "paint" && state !== "drying") || step === "fire" || step === "done") {
      try { s.skin = skinCv.toDataURL("image/jpeg", 0.86); } catch (e) {}
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
    placeShape(s.R, s.H);
    if (s.step === "shape") { matWet(); skinNeutral(); startShape(); return; }
    skinBisque();
    if (s.skin) drawSkin(s.skin);
    if (s.step === "fire") {
      matBisque();
      setStep("fire"); spinGoal = 0; grab(false); tip("");
      focus = "kiln"; framing("kiln"); snapCamera();
      piece.position.set(KX, 0, 0);
      beginFiring();
    }
    else if (s.step === "done") { matGlazed(); startDone(); }
    else { matBisque(); startPaint(); }
  }

  // «Начать сначала» на любом этапе. Если работа уже есть, кнопка просит подтвердить вторым нажатием.
  function restart() {
    tweens.length = 0; morph = null; fire = null;
    holding = false; holdBtn = null; pointer.down = false; paint.last = null;
    finger.visible = false;
    coilMat.emissiveIntensity = 0; kilnLight.intensity = 0;
    var fromKiln = focus === "kiln";
    startLump();
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
    var risky = state !== "drop" && state !== "lump" && state !== "intro";
    if (risky && !ui.restart.classList.contains("is-confirm")) {
      ui.restart.classList.add("is-confirm");
      ui.restart.querySelector(".game-restart-label").textContent = "Точно сначала?";
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(resetRestartBtn, 3500);
      return;
    }
    resetRestartBtn();
    restart();
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
  var morph = null;
  function startShape() {
    state = "shape";
    setStep("shape");
    grab(true); hold(false);
    V0 = H * meanR();
    tip("Ведите пальцем по стенке вазы");
    panel("Гончарный круг",
      'Ведите пальцем по стенке: к центру — сужаете, наружу — расширяете.<span class="hint-more"> Или возьмите готовую форму:</span>',
      '<div class="row">' +
      '<button class="chip" type="button" data-preset="bowl">Чаша</button>' +
      '<button class="chip" type="button" data-preset="mug">Кружка</button>' +
      '<button class="chip" type="button" data-preset="vase">Ваза</button>' +
      '<button class="chip" type="button" data-preset="amphora">Амфора</button></div>' +
      '<button class="btn btn-glaze" type="button" id="toPaint">Расписать <span class="ico ico-arrow" aria-hidden="true"></span></button>', "shape");
    ui.controls.querySelectorAll("[data-preset]").forEach(function (c) {
      c.addEventListener("click", function () {
        ui.controls.querySelectorAll("[data-preset]").forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
        var from = Float32Array.from(R), to = new Float32Array(N), h0 = H, h1 = presetProfile(c.dataset.preset, to);
        morph = true;
        tween(0.8, function (k) {
          var e = easeInOut(k);
          for (var i = 0; i < N; i++) R[i] = lerp(from[i], to[i], e);
          H = lerp(h0, h1, e); dirty = true;
        }, function () { morph = null; V0 = H * meanR(); saveSoon(); });
      });
    });
    document.getElementById("toPaint").addEventListener("click", startDrying);
    save();
  }

  var raycaster = new THREE.Raycaster();
  var tmp = new V3(), planeN = new V3(), axisDir = new V3(), shapePlane = new THREE.Plane();
  function updateShape(dt) {
    finger.visible = false;
    if (morph) return;
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
    setStep("fire");
    panel("Глазурь и обжиг", "Покрываем вазу прозрачной глазурью и переносим в печь…", "");
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
  var paint = { color: "#2b1c30", size: 0.05, tool: "brush", last: null, snapped: false };
  var PALETTE = [
    ["#2b1c30", "Аубергин (чёрный ангоб)"], ["#9e4b35", "Терракота"], ["#c8352b", "Красный"], ["#d6a23e", "Охра"],
    ["#3d8c4f", "Зелёный"], ["#3fc1c9", "Бирюза"], ["#8f7fd0", "Лаванда"], ["#f6efe7", "Белый ангоб"]
  ];
  var ORNAMENTS = [["meander", "Греческий меандр"], ["chuvash", "Чувашский орнамент"], ["wave", "Узор «Волна»"], ["dots", "Узор «Точки»"]];

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
    copySkin(skinCv, c);
    skinTex.needsUpdate = true;
    undoPool.push(c);
    updateUndo();
    saveSoon();
  }
  function clearUndo() { while (undoStack.length) undoPool.push(undoStack.pop()); updateUndo(); }
  function updateUndo() { var b = document.getElementById("undo"); if (b) b.disabled = !undoStack.length; }
  document.addEventListener("keydown", function (e) {
    if (state === "paint" && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "KeyZ") { e.preventDefault(); undoPaint(); }
  });

  function startPaint() {
    state = "paint"; grab(true);
    tip("Коснитесь вазы кистью");
    setStep("paint");
    spinGoal = 1.0;
    paint.color = PALETTE[0][0]; paint.size = 0.05; paint.tool = "brush"; paint.last = null;
    var sw = PALETTE.map(function (p, i) {
      return '<button class="swatch" type="button" style="--c:' + p[0] + '" data-color="' + p[0] + '" aria-label="' + p[1] + '" title="' + p[1] + '" aria-pressed="' + (i === 0) + '"></button>';
    }).join("");
    var orn = ORNAMENTS.map(function (o) {
      return '<button class="chip" type="button" data-orn="' + o[0] + '" aria-pressed="false"><span class="orn-ico orn-' + o[0] + '" aria-hidden="true"></span>' + o[1] + "</button>";
    }).join("");
    // На телефоне инструменты — одна строка с прокруткой вбок (.tools), чтобы панель не съедала место у вазы
    panel("Роспись",
      'Коснитесь вазы — круг проведёт поясок.<span class="hint-more"> Орнамент ляжет туда, куда вы нажмёте.</span>',
      '<p class="label">Цвет</p><div class="row row-swatches">' + sw + "</div>" +
      '<div class="tools"><p class="label">Кисть и орнамент</p><div class="row">' +
      '<button class="chip" type="button" data-size="0.05" aria-pressed="true">Тонкая кисть</button>' +
      '<button class="chip" type="button" data-size="0.12" aria-pressed="false">Широкая кисть</button>' + orn + "</div></div>" +
      '<div class="row row-actions"><button class="btn btn-undo" type="button" id="undo" title="Отменить последнее действие (Ctrl+Z)" disabled><span class="ico ico-undo" aria-hidden="true"></span>Назад</button>' +
      '<button class="btn btn-glaze" type="button" id="toGlaze">Глазуровать и в печь <span class="ico ico-arrow" aria-hidden="true"></span></button></div>', "paint",
      // на виду сразу под заголовком: без них непонятно, что круг можно остановить, а роспись — смыть
      '<button class="chip chip-tool" type="button" id="spinToggle" aria-pressed="false"><span class="ico ico-pause" aria-hidden="true"></span><span class="lbl">Остановить круг</span></button>' +
      '<button class="chip chip-tool" type="button" id="wipe"><span class="ico ico-wipe" aria-hidden="true"></span>Смыть роспись</button>');
    clearUndo();
    var C = ui.controls;
    document.getElementById("undo").addEventListener("click", undoPaint);
    C.querySelectorAll("[data-color]").forEach(function (b) {
      b.addEventListener("click", function () {
        paint.color = b.dataset.color;
        C.querySelectorAll("[data-color]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      });
    });
    function toolBtns(active) {
      C.querySelectorAll("[data-size],[data-orn]").forEach(function (x) { x.setAttribute("aria-pressed", x === active ? "true" : "false"); });
    }
    C.querySelectorAll("[data-size]").forEach(function (b) {
      b.addEventListener("click", function () { paint.size = +b.dataset.size; paint.tool = "brush"; toolBtns(b); });
    });
    C.querySelectorAll("[data-orn]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        paint.tool = b.dataset.orn; toolBtns(b);
        if (e.detail === 0) { // с клавиатуры: кладём пояс на случайную высоту
          var v = outerV(Math.floor(rand(.25, .85) * (N - 1)));
          snapSkin();
          drawBand(paint.tool, v, paint.color);
          saveSoon();
        }
      });
    });
    document.getElementById("spinToggle").addEventListener("click", function () {
      // aria-pressed = «круг остановлен»; подпись говорит, что случится по нажатию
      var stopped = this.getAttribute("aria-pressed") !== "true";
      this.setAttribute("aria-pressed", stopped ? "true" : "false");
      this.querySelector(".lbl").textContent = stopped ? "Запустить круг" : "Остановить круг";
      this.querySelector(".ico").className = "ico " + (stopped ? "ico-play" : "ico-pause");
      spinGoal = stopped ? 0 : 1.0;
    });
    document.getElementById("wipe").addEventListener("click", function () { snapSkin(); skinBisque(); saveSoon(); });
    document.getElementById("toGlaze").addEventListener("click", startFire);
  }

  function outerV(i) { return (2 + i) / (P - 1); }
  function rAtV(v) { var i = Math.round(v * (P - 1)) - 2; return R[clamp(i, 0, N - 1)]; }
  function pxU(v) { return SKIN / (2 * Math.PI * Math.max(rAtV(v), .2)); }
  function pxV() { return SKIN * (N - 1) / ((P - 1) * (H - BASE)); }

  function dab(x, y, rx, ry) {
    for (var o = -1; o <= 1; o++) {
      var xx = x + o * SKIN;
      if (xx + rx < 0 || xx - rx > SKIN) continue;
      skin.beginPath(); skin.ellipse(xx, y, rx, ry, 0, 0, Math.PI * 2); skin.fill();
    }
  }
  function strokeUV(a, b) {
    var ux = pxU(b.y), vy = pxV();
    var rx = paint.size * ux, ry = paint.size * vy;
    var du = b.x - a.x;
    if (du > .5) du -= 1; else if (du < -.5) du += 1;
    var x0 = a.x * SKIN, y0 = (1 - a.y) * SKIN, dx = du * SKIN, dy = (a.y - b.y) * SKIN;
    var steps = Math.min(80, Math.ceil(Math.max(Math.abs(dx) / rx, Math.abs(dy) / ry) * 2.5) + 1);
    skin.fillStyle = paint.color; skin.globalAlpha = .92;
    for (var s = 0; s <= steps; s++) {
      var t = s / steps, x = x0 + dx * t;
      x = ((x % SKIN) + SKIN) % SKIN;
      dab(x, y0 + dy * t, rx * rand(.92, 1.05), ry * rand(.92, 1.05));
    }
    skin.globalAlpha = 1;
    skinTex.needsUpdate = true;
  }

  // Орнаментальные пояса: рисуем в мировых единицах, учитывая окружность
  function drawBand(type, v, color) {
    var R0 = Math.max(rAtV(v), .2), C = 2 * Math.PI * R0;
    var bandH = 0.22, cellW = type === "chuvash" ? 0.46 : (type === "dots" ? 0.16 : 0.24);
    var n = Math.max(4, Math.round(C / cellW)); cellW = C / n;
    var su = SKIN / C, sv = pxV();
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
      skin.restore();
    }
    skin.restore();
    skinTex.needsUpdate = true;
  }

  function updatePaint() {
    if (!pointer.down || !pointer.onCanvas) { paint.last = null; return; }
    tip("");
    raycaster.setFromCamera(pointer.ndc, camera);
    var hit = raycaster.intersectObject(clay, false)[0];
    if (!hit || !hit.uv) { paint.last = null; return; }
    var uv = hit.uv.clone();
    if (paint.tool !== "brush") {
      if (pointer.fresh) {
        var v = clamp(uv.y, outerV(2), outerV(N - 3));
        snapSkin();
        drawBand(paint.tool, v, paint.color);
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
    state = "done"; clayMat.emissiveIntensity = 0;
    photo = null;
    focus = "done"; framing("done");
    setStep("done"); spinGoal = 0.35;
    // кнопка записи появляется только сейчас: на ПК — под аркой, на телефоне — в панели (.game-cta), чтобы не уходить за край экрана
    heroEl.classList.add("cta-on");
    var cta = heroEl.querySelector(".hero-cta");
    // «Сохранить фото» — заметная кнопка с мягкой пульсацией, чтобы её не пропустили; «Поделиться» — там, где браузер умеет отправлять файлы
    panel("Готово!",
      'Ваза обожжена и сияет глазурью. Настоящую слепите в «Сенсорике»!<span class="hint-more"> Она будет тяжёлой, тёплой и только вашей.</span>',
      '<div class="row"><button class="btn btn-save" type="button" id="savePic"><span class="ico ico-camera" aria-hidden="true"></span>Сохранить фото</button>' +
      (CAN_SHARE ? '<button class="btn btn-share" type="button" id="sharePic"><span class="ico ico-share" aria-hidden="true"></span>Поделиться</button>' : "") +
      '<button class="chip" type="button" id="again">Слепить ещё</button></div>' +
      (cta ? '<a class="btn btn-glaze game-cta" href="' + cta.href + '" target="_blank" rel="noopener">Записаться в мастерскую</a>' : ""), "done");
    document.getElementById("savePic").addEventListener("click", savePicture);
    if (CAN_SHARE) document.getElementById("sharePic").addEventListener("click", sharePicture);
    document.getElementById("again").addEventListener("click", restart);
  }
  // Открытка с готовой вазой 1080×1350. «Сохранить фото»: на iPhone и iPad — через меню «Поделиться» (в фото оттуда сохраняет
  // только «Сохранить изображение»), на Android и компьютере — файлом, на Android он появляется в галерее.
  // «Поделиться» отправляет саму картинку в мессенджер или соцсеть.
  var IOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var PHOTO_NAME = "moya-vaza-sensorika.jpg";
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
    g.fillText("МОЯ ПЕРВАЯ ВАЗА", W / 2, 110);
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
      p.file = new File([blob], PHOTO_NAME, { type: "image/jpeg" });
      p.ready.forEach(function (f) { f(p.file); });
      p.ready.length = 0;
    }, "image/jpeg", 0.92);
    return p;
  }
  function withFile(cb) { var p = postcard(); if (p.file) cb(p.file); else p.ready.push(cb); }
  function download(blob) {
    var a = document.createElement("a");
    a.download = PHOTO_NAME;
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
    if (state !== "transfer" && state !== "cooling" && state !== "fire" && state !== "cracked") clay.rotation.y += dA;

    if (dirty) rebuild();

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
    var demo = (location.search.match(/[?&]demo=(\w+)/) || [])[1];
    var saved = loadSave();
    var tmp = new Float32Array(N);
    // ?demo=shape|fire|paint|done — сразу нужный этап (для проверки кадра и скриншотов), без сохранения
    if (demo === "shape") { placeShape(tmp, presetProfile("jar", tmp)); matWet(); skinNeutral(); startShape(); }
    else if (demo === "fire") restore({ step: "fire", R: tmp, H: presetProfile("vase", tmp) });
    else if (demo === "paint") restore({ step: "paint", R: tmp, H: presetProfile("vase", tmp) });
    else if (demo === "done") {
      restore({ step: "done", R: tmp, H: presetProfile("amphora", tmp) });
      drawBand("meander", outerV(30), "#2b1c30"); drawBand("chuvash", outerV(16), "#9e4b35"); drawBand("dots", outerV(38), "#3fc1c9");
    }
    else if (saved && saved.step !== "lump") restore(saved);
    else startLump();
    kick();
  }
  // Первый вход: ком падает на круг, когда уходит заставка, а не под ней
  if (document.documentElement.classList.contains("is-splash")) {
    state = "intro";
    window.addEventListener("splashdone", begin, { once: true });
    kick();
  } else begin();
})();

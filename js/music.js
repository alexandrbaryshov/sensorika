/* ==========================================================================
   Фоновая музыка «Тёплая глина»: тихая мелодия (сгенерирована нейросетью Suno), играет по кругу.
   Трек идёт внахлёст сам с собой: последние XF секунд затихают, а начало в это время плавно нарастает,
   поэтому стык не слышен. Браузер даёт включить звук только по нажатию, поэтому музыка начинается
   с первого касания игры или кнопкой с нотой в шапке. Выключенная кнопкой, сама она больше не включится
   (выбор помнится в браузере). Пока вкладка скрыта, звук на паузе.
   ========================================================================== */
(function () {
  "use strict";

  var btn = document.getElementById("musicBtn");
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn) return;
  if (!AC || !window.Promise) { btn.hidden = true; return; }

  var SRC = "assets/audio/warm-clay.mp3", KEY = "sensorika:music";
  var VOL = 0.4;  // общая громкость: фон, под который спокойно расписывают
  var XF = 8;     // секунды перехода конца трека в начало
  var ctx = null, out = null, buf = null, loading = null, timer = 0, next = 0, started = false, on = false;

  function pref(v) {
    try { if (v === undefined) return localStorage.getItem(KEY); localStorage.setItem(KEY, v); } catch (e) {}
    return null;
  }
  function render() {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.title = on ? "Выключить музыку" : "Включить музыку";
    btn.querySelector(".ico").className = "ico " + (on ? "ico-music" : "ico-music-off");
  }

  // Звук включают внутри нажатия: там же создаём и «будим» AudioContext (иначе iPhone его не запустит)
  function wake() {
    if (!ctx) {
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0;
      out.connect(ctx.destination);
    }
    if (ctx.state !== "running" && !document.hidden) ctx.resume();
  }
  // Файл берём через XHR, а не fetch: так музыка играет и у страницы, открытой с диска (fetch не читает file://)
  function load() {
    if (!loading) {
      loading = new Promise(function (res, rej) {
        var x = new XMLHttpRequest();
        x.open("GET", SRC);
        x.responseType = "arraybuffer";
        x.onload = function () { if (x.status === 200 || (x.status === 0 && x.response)) res(x.response); else rej(new Error("music " + x.status)); };
        x.onerror = rej;
        x.send();
      })
        // старый Safari умеет decodeAudioData только с колбэками
        .then(function (data) { return new Promise(function (res, rej) { ctx.decodeAudioData(data, res, rej); }); })
        .then(function (b) { buf = b; });
      loading.catch(function () { loading = null; });
    }
    return loading;
  }

  // Кривые равной мощности: при сложении затухающего конца и нарастающего начала громкость не проседает
  function curve(up) {
    var n = 256, c = new Float32Array(n);
    for (var i = 0; i < n; i++) { var a = i / (n - 1) * Math.PI / 2; c[i] = up ? Math.sin(a) : Math.cos(a); }
    return c;
  }
  var UP = curve(true), DOWN = curve(false);
  // Одно проигрывание трека с момента t; возвращает, когда начать следующее
  function voice(t, first) {
    var s = ctx.createBufferSource(), g = ctx.createGain(), d = buf.duration;
    s.buffer = buf;
    s.connect(g); g.connect(out);
    g.gain.setValueCurveAtTime(UP, t, first ? 3 : XF);
    g.gain.setValueCurveAtTime(DOWN, t + d - XF, XF);
    s.start(t);
    s.stop(t + d);
    s.onended = function () { s.disconnect(); g.disconnect(); };
    return t + d - XF;
  }
  // Следующее проигрывание ставим в очередь за целый трек вперёд: запоздавший таймер не оставит паузы
  function plan() {
    clearTimeout(timer);
    if (!on || !buf) return;
    while (next < ctx.currentTime + buf.duration) next = voice(next, false);
    timer = setTimeout(plan, Math.max(5, next - buf.duration - ctx.currentTime + 1) * 1000);
  }
  function fade(to, sec) {
    var now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(to, now + sec);
  }

  function play() {
    on = true; started = true; render();
    wake();
    load().then(function () {
      if (!on) return;
      if (!next) next = voice(ctx.currentTime + .05, true);
      plan();
      fade(VOL, 1.2);
    }, function () {
      // файл не загрузился: кнопка возвращается в «выключено», можно попробовать ещё раз
      on = false; render();
    });
  }
  function pause() {
    on = false; render();
    clearTimeout(timer);
    if (!ctx) return;
    fade(0, .5);
    setTimeout(function () { if (!on && ctx.state === "running") ctx.suspend(); }, 600);
  }

  btn.addEventListener("click", function () {
    if (on) { pause(); pref("off"); }
    else { play(); pref("on"); }
  });

  // Первое касание игры (круг или её панель) включает музыку, если её не выключали и не включён режим экономии трафика.
  // Если браузер не принял первое касание как разрешение на звук, следующее касание будит звук ещё раз.
  var GAME = "#wheel, #gamePanel";
  var SAVE_DATA = !!(navigator.connection && navigator.connection.saveData);
  function gesture(e) {
    if (!e.target || !e.target.closest || !e.target.closest(GAME)) return;
    if (!started) { if (pref() !== "off" && !SAVE_DATA) play(); return; }
    if (on && ctx && ctx.state !== "running" && !document.hidden) ctx.resume();
  }
  ["pointerup", "touchend", "click", "keydown"].forEach(function (type) {
    document.addEventListener(type, gesture, true);
  });

  // Скрытая вкладка — пауза; вернулись — музыка с того же места
  document.addEventListener("visibilitychange", function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (on) ctx.resume();
  });

  render();
})();

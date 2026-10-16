/* Сенсорика: наполнение страницы из data/site.js */
(function () {
  "use strict";
  // Единица макета: 1/2752 ширины окна без полосы прокрутки
  function unit() { document.documentElement.style.setProperty("--u", document.documentElement.clientWidth / 2752 + "px"); }
  unit();

  // Заголовок дугой, как надпись по плечу сосуда: буквы раскладываются по окружности
  var arcEl = document.querySelector("[data-arc]");
  var measureCtx = document.createElement("canvas").getContext("2d");
  function layoutArc() {
    if (!arcEl) return;
    var h1 = arcEl.parentNode;
    var text = arcEl.getAttribute("data-text") || arcEl.textContent.trim();
    arcEl.setAttribute("data-text", text);
    h1.setAttribute("aria-label", text);
    var cs = getComputedStyle(h1);
    var fs = parseFloat(cs.fontSize), W = h1.clientWidth;
    if (!W || !fs) return;
    var ls = fs * 0.012;
    measureCtx.font = fs + "px " + cs.fontFamily;
    var chars = text.toUpperCase().split("");
    var widths = chars.map(function (c) { return measureCtx.measureText(c).width + ls; });
    var total = widths.reduce(function (a, b) { return a + b; }, 0);
    // не влезает в ширину (телефон) — уменьшаем кегль и раскладываем заново
    if (total > W * 0.94 && !layoutArc.fitting) {
      layoutArc.fitting = true;
      h1.style.fontSize = (fs * W * 0.94 / total).toFixed(1) + "px";
      layoutArc();
      layoutArc.fitting = false;
      return;
    }
    var sag = W * 0.036, chord = Math.min(W * 0.98, total * 0.97);
    var R = (chord * chord / 4 + sag * sag) / (2 * sag);
    var apex = fs * 1.02, cx = W / 2, cy = apex + R;
    var start = -total / 2, acc = 0, html = "";
    chars.forEach(function (c, i) {
      var th = (start + acc + widths[i] / 2) / R;
      acc += widths[i];
      var x = cx + R * Math.sin(th), y = cy - R * Math.cos(th);
      html += '<span class="arc-ch" style="left:' + x.toFixed(1) + "px;top:" + y.toFixed(1) + "px;transform:translate(-50%,-80%) rotate(" + th.toFixed(4) + 'rad)">' + (c === " " ? "&nbsp;" : c) + "</span>";
    });
    arcEl.innerHTML = '<span class="visually-hidden">' + text + "</span>" + html.replace(/class="arc-ch"/g, 'class="arc-ch" aria-hidden="true"');
    var endDrop = R - Math.sqrt(Math.max(0, R * R - (total / 2) * (total / 2)));
    h1.style.height = (apex + endDrop + fs * 0.25).toFixed(1) + "px";
  }
  layoutArc();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutArc);
  // На телефоне resize летит при каждом показе/скрытии адресной строки во время прокрутки.
  // Раскладка зависит только от ширины, поэтому пересчитываем её раз в кадр и лишь когда ширина изменилась.
  var lastW = document.documentElement.clientWidth, resizeRaf = 0;
  function relayout() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      var w = document.documentElement.clientWidth;
      if (w === lastW) return;
      lastW = w;
      unit();
      if (arcEl) arcEl.parentNode.style.fontSize = "";
      layoutArc();
    });
  }
  window.addEventListener("resize", relayout);
  // Под заставкой прокрутка выключена и полосы прокрутки нет; когда заставка уходит, полоса появляется и окно сужается без resize
  window.addEventListener("splashdone", relayout);
  // Телефон: ниша с кругом берёт высоту, оставшуюся от рельса этапов и места под панель, — всё видно без прокрутки.
  // Место под панель постоянное (--panel-res в CSS), поэтому арка не меняет размер от этапа к этапу.
  var hero = document.getElementById("hero"), rail = document.getElementById("stepsRail");
  if (hero && rail && "ResizeObserver" in window) {
    new ResizeObserver(function () { hero.style.setProperty("--rail-h", rail.offsetHeight + "px"); }).observe(rail);
  }

  var S = window.SITE;
  if (!S) return;

  var TBD = '<span class="tbd" title="Данные появятся позже">уточняется</span>';
  var ARROW = '<span class="ico ico-arrow" aria-hidden="true"></span>';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function rub(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F") + "\u00A0₽";
  }
  // Цена позиции прайса: «5 000 ₽» или диапазон «1 500–5 000 ₽»
  function priceOf(it) {
    if (!it || !it.price) return TBD;
    return it.priceTo ? rub(it.price).replace(/\s₽$/, "") + "–" + rub(it.priceTo) : rub(it.price);
  }
  function val(v) { return v == null || v === "" ? TBD : esc(v); }

  // Ссылка записи: YClients, а пока её нет — ВКонтакте. На телефоне мини-приложение YClients открывается в приложении
  // ВКонтакте сразу на записи. На ПК оно открывается на сайте vk.ru: без входа во ВКонтакте просит войти, а администратору
  // сообщества, судя по всему, открывает вход в кабинет YClients вместо записи. Поэтому на ПК, когда есть прямая ссылка на форму записи, ведём на неё.
  var pc = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var bookUrl = (pc && S.studio.yclientsForm) || S.studio.yclients || S.studio.vk;
  document.querySelectorAll("[data-book]").forEach(function (a) {
    a.href = bookUrl;
    a.target = "_blank";
    a.rel = "noopener";
  });

  // Направления
  var dirList = document.getElementById("dirList");
  if (dirList) {
    dirList.innerHTML = S.services.map(function (s) {
      var anchor = s.id === "date" ? "#date" : bookUrl;
      var ext = anchor.charAt(0) !== "#";
      return (
        '<li class="dir-item" id="dir-' + s.id + '">' +
          '<img class="dir-tondo" src="assets/illustrations/tondo-' + s.id + '.webp" width="280" height="280" alt="" loading="lazy" decoding="async">' +
          "<div><h3>" + esc(s.title) + "</h3>" +
          '<p class="dir-tags">' + s.who.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("") + "</p></div>" +
          '<p class="dir-lead">' + esc(s.lead) + (s.duration ? "<br>Длительность: " + esc(s.duration) : "") + "</p>" +
          '<div class="dir-meta">' +
            // без цены (price: null) карточка показывает только ссылку
            (s.price ? '<span class="dir-price">от ' + rub(s.price) + "</span>" +
              '<span class="dir-unit">' + esc(s.unit) + "</span>" : "") +
            '<a href="' + anchor + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" +
              (ext ? "Записаться" : "Подробнее") + ARROW + "</a>" +
          "</div>" +
        "</li>"
      );
    }).join("");
  }

  // Прайс
  var pl = document.getElementById("priceList");
  if (pl) {
    pl.innerHTML = S.prices.map(function (g) {
      return '<div class="price-group"><h3>' + esc(g.group) + "</h3>" +
        g.items.map(function (it) {
          return '<div class="price-row"><span class="price-name">' + esc(it.name) +
            (it.note ? '<span class="price-note">' + esc(it.note) + "</span>" : "") +
            '</span><span class="price-dots" aria-hidden="true"></span><span class="price-val' + (it.priceTo ? ' is-range' : '') + '">' +
            priceOf(it) + "</span></div>";
        }).join("") + "</div>";
    }).join("");
  }

  // Точечные поля: data-fill="studio:phone" | "service:date:price" | "price:Группа:индекс"
  document.querySelectorAll("[data-fill]").forEach(function (el) {
    var k = el.getAttribute("data-fill").split(":");
    var out = TBD;
    if (k[0] === "studio") {
      var v = S.studio[k[1]];
      if (k[1] === "phone" && v) out = '<a href="tel:' + esc(v.replace(/[^\d+]/g, "")) + '">' + esc(v) + "</a>";
      else out = val(v);
    } else if (k[0] === "service") {
      var s = S.services.filter(function (x) { return x.id === k[1]; })[0];
      if (s) {
        var sv = s[k[2]];
        out = k[2] === "price" && sv ? rub(sv) + " " + esc(s.unit) : val(sv);
      }
    } else if (k[0] === "price") {
      var g = S.prices.filter(function (x) { return x.group === k[1]; })[0];
      var it = g && g.items[+k[2]];
      out = priceOf(it);
    }
    el.innerHTML = out;
  });

  // Мобильное меню закрывается после перехода
  var mob = document.querySelector(".nav-mobile");
  if (mob) mob.addEventListener("click", function (e) { if (e.target.closest("a")) mob.open = false; });
})();

/* Место на странице.
   Разделы из меню открываются без якоря в адресе: иначе #gift после «Сертификатов» остаётся в истории браузера
   и в подсказках адресной строки, и следующий вход на сайт открывается на сертификатах, а не на игре.
   Новый вход всегда начинается с игры: старый якорь из адреса убирает скрипт в <head> до разбора страницы,
   а оставляет, только если по ссылке пришли с другого сайта (пост во ВКонтакте), — тогда открываем этот раздел.
   Обновили страницу — остаёмся там же, где были. Сам браузер при перезагрузке то прыгает к якорю из адреса,
   то возвращает устаревшее место (Chrome запоминает прокрутку с задержкой). Поэтому место запоминаем сами — только
   в этой вкладке — и ставим его, когда страница собралась: здесь, после наполнения из data/site.js, и ещё раз после загрузки.
   Вкладку открыли спустя полчаса и больше (телефон выгрузил её из памяти) — это уже новый вход. */
(function () {
  "use strict";
  var KEY = "sensorika:scroll", path = location.pathname;

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var id = a.getAttribute("href").slice(1), el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    // плавность и отступ под шапку берутся из CSS (scroll-behavior, scroll-padding-top); шапка закреплена, к ней — просто наверх
    if (id === "top") window.scrollTo(0, 0);
    else el.scrollIntoView();
    // с клавиатуры («Перейти к содержанию») фокус уходит в раздел, как при обычном переходе по якорю
    if (e.detail === 0) {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
  });

  if (!("scrollRestoration" in history)) return;
  history.scrollRestoration = "manual";
  function remember() {
    try { sessionStorage.setItem(KEY, JSON.stringify({ y: Math.round(window.scrollY), path: path, t: Date.now() })); } catch (e) {}
  }
  var timer = 0;
  window.addEventListener("scroll", function () { if (!timer) timer = setTimeout(function () { timer = 0; remember(); }, 250); }, { passive: true });
  window.addEventListener("pagehide", remember);

  var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  // перезагрузка или возврат «Назад» на страницу, которую браузер не держал в памяти
  var reload = nav ? nav.type === "reload" || nav.type === "back_forward" : performance.navigation && performance.navigation.type > 0;
  var saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
  // куда ставить страницу: запомненное место, раздел из ссылки с другого сайта или начало с игрой
  var target = 0;
  if (reload && saved && saved.path === path && Date.now() - (saved.t || 0) < 18e5) target = saved.y;
  else if (location.hash) { try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))) || 0; } catch (e) {} }
  // пока человек сам не тронул страницу, держим её на месте (после загрузки шрифтов и фото вёрстка чуть сдвигается)
  var touched = false;
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (t) { window.addEventListener(t, function () { touched = true; }, { once: true, passive: true }); });
  function put() {
    if (touched) return;
    var html = document.documentElement, sb = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto"; // без плавной прокрутки из CSS: страница сразу на месте
    if (typeof target === "number") window.scrollTo(0, target);
    else target.scrollIntoView();
    html.style.scrollBehavior = sb;
  }
  put();
  if (document.readyState === "complete") setTimeout(put, 0);
  else window.addEventListener("load", function () { setTimeout(put, 0); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(put);
})();

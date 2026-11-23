/* Claude Monet — dijital katalog
   StPageFlip (page-flip 2.0.7, MIT) üzerine kurulu sayfa çevirme. */
(function () {
  'use strict';

  var TOTAL = 16;
  var TOC_PAGE = 2;                 // İçindekiler sayfası (1 tabanlı)
  var FIRST_BATCH = 4;              // Hemen yüklenecek sayfa sayısı
  var PAGE_W = 1150, PAGE_H = 1600; // Sayfa görsellerinin piksel boyutu
  var RATIO = PAGE_W / PAGE_H;
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FLIP_MS = reduceMotion ? 450 : 900;

  var TITLES = {
    1: 'Ön kapak', 2: 'İçindekiler', 3: 'Küratörün Sunuşu', 4: 'Claude Monet (1840–1926)',
    6: 'Musée Marmottan Monet', 7: 'Marmottan’da Monet', 8: 'Nilüferler: Suyun Üzerindeki Işık',
    10: 'İzlenimin Doğuşu', 12: 'Giverny’de Bir Düş: Japon Köprüsü', 14: 'Doğanın İçinde Renk',
    15: 'Gelincikler, 1873', 16: 'Arka kapak'
  };

  /* İçindekiler sayfasındaki tıklanabilir satırlar.
     Konumlar sayfa görselinden ölçüldü (sayfanın yüzdesi olarak):
     top = satırın üstü, w = satır genişliği. Tasarım değişirse güncelleyin. */
  var TOC_LINKS = [
    { page: 3,  top: 22.88, w: 26.3 },
    { page: 4,  top: 27.72, w: 35.1 },
    { page: 6,  top: 32.70, w: 34.2 },
    { page: 7,  top: 37.54, w: 29.3 },
    { page: 8,  top: 42.46, w: 40.9 },
    { page: 10, top: 47.41, w: 25.6 },
    { page: 12, top: 52.28, w: 43.5 },
    { page: 14, top: 57.20, w: 28.6 },
    { page: 15, top: 62.14, w: 23.7 }
  ];
  // Satırlar arası mesafe ~%4,9. Dokunma alanları aralarında boşluk
  // kalmayacak şekilde tüm satır aralığını ve sayfanın sol yarısını kaplar;
  // telefonda küçük satırlara da kolay dokunulur.
  var TOC_LEFT = 18, TOC_WIDTH = 52, TOC_ROW_H = 4.92, TOC_LINE_H = 1.75;

  function tocLinksHtml() {
    return TOC_LINKS.map(function (l) {
      var top = l.top + TOC_LINE_H / 2 - TOC_ROW_H / 2;
      // Buton boş olmalı: kütüphane yalnızca tıklanan öğe <button> ise
      // sayfa çevirmeyi başlatmıyor.
      return '<button type="button" class="toc-link" data-goto="' + l.page + '"' +
        ' aria-label="' + TITLES[l.page] + ', sayfa ' + l.page + '"' +
        ' title="' + TITLES[l.page] + ' — sayfa ' + l.page + '"' +
        ' style="left:' + TOC_LEFT + '%;top:' + top.toFixed(2) + '%;' +
        'width:' + Math.max(TOC_WIDTH, l.w + 7) + '%;height:' + TOC_ROW_H + '%"></button>';
    }).join('');
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function pageSrc(n) { return 'img/pages/page-' + pad(n) + '.webp'; }
  function zoomSrc(n) { return 'img/zoom/page-' + pad(n) + '.webp'; }

  var $ = function (id) { return document.getElementById(id); };
  var host = $('bookHost'), shadow = $('deskShadow'), counter = $('counter'), hint = $('hint');
  var btnPrev = $('btnPrev'), btnNext = $('btnNext');

  var pf = null;            // PageFlip örneği
  var mode = null;          // 'landscape' | 'portrait'
  var currentIndex = 0;     // 0 tabanlı sayfa indeksi
  var loaded = {};          // n -> true (görsel yüklendi)
  var allowAll = false;     // ilk paket bitti mi

  /* ── Görsel yükleme ─────────────────────────────── */
  function preload(n) {
    return new Promise(function (resolve) {
      var img = new Image();
      var done = function () { loaded[n] = true; resolve(); };
      img.onload = done;
      img.onerror = done;            // hata olsa da açılışı bekletme
      img.src = pageSrc(n);
      setTimeout(done, 15000);
    });
  }

  function attachSrc(img) {
    var n = +img.getAttribute('data-n');
    if (img.getAttribute('src')) return;
    if (!allowAll && !loaded[n]) return;
    img.onload = function () { img.classList.add('ready'); };
    img.src = pageSrc(n);
    if (img.complete) img.classList.add('ready');
  }

  /* ── Kitap ──────────────────────────────────────── */
  function buildPages(el) {
    var html = '';
    for (var n = 1; n <= TOTAL; n++) {
      var hard = (n === 1 || n === TOTAL) ? 'hard' : 'soft';
      var alt = 'Sayfa ' + n + (TITLES[n] ? ' — ' + TITLES[n] : '');
      html += '<div class="page" data-density="' + hard + '">' +
                '<img data-n="' + n + '" alt="' + alt + '" decoding="async" draggable="false">' +
                '<span class="grain"></span><span class="light"></span><span class="shade"></span>' +
                (n === TOC_PAGE ? tocLinksHtml() : '') +
              '</div>';
    }
    el.innerHTML = html;
    Array.prototype.forEach.call(el.querySelectorAll('img'), attachSrc);
    return el.querySelectorAll('.page');
  }

  /* Her ekranda kitap görünümü: kapalıyken tek kapak, açınca çift sayfa,
     arka kapakta yine tek. (Tek sayfa görünümü kullanılmıyor.) */
  function wantedMode() { return 'landscape'; }

  function createBook() {
    var start = currentIndex;
    if (pf) { try { pf.destroy(); } catch (e) { /* yoksay */ } pf = null; }

    var old = $('book');
    var el = document.createElement('div');
    el.id = 'book';
    old.parentNode.replaceChild(el, old);

    mode = wantedMode();
    var pages = buildPages(el);

    pf = new St.PageFlip(el, {
      width: PAGE_W,
      height: PAGE_H,
      size: 'stretch',
      // Dikey modda tek sayfa için eşik yüksek, yatayda çift sayfa için düşük
      minWidth: 1,
      maxWidth: 6000,
      minHeight: 1,
      maxHeight: 6000,
      autoSize: false,
      usePortrait: false,
      showCover: true,
      drawShadow: true,
      maxShadowOpacity: 0.55,
      flippingTime: FLIP_MS,
      showPageCorners: true,
      mobileScrollSupport: false,
      swipeDistance: 30,
      startPage: start
    });

    pf.on('flip', function (e) { currentIndex = e.data; afterFlip(); });
    pf.on('changeState', function (e) {
      if (e.data === 'flipping' || e.data === 'user_fold') dismissHint();
    });
    // Yamalı kütüphanenin olayı: animasyon başlarken hedef belli olur
    pf.on('flipStart', function (e) {
      var d = e.data;
      if (!d.turned) return;
      var cur = pf.getPageCollection().getCurrentSpreadIndex();
      var lastSpread = pf.getPageCollection().getSpread().length - 1;
      // Kapak kitabın üstüne kapanıyor mu (ön kapak geri, arka kapak ileri)?
      var closing = d.direction === 1 ? cur === 1 : cur === lastSpread - 1;
      Sound.play(d.hard, d.duration, closing);
      if (mode !== 'landscape') return;
      var target = d.direction === 1 ? cur - 1 : cur + 1;
      layout(spreadPages(target), d.duration);
    });
    pf.on('changeOrientation', function () { afterFlip(); });
    pf.on('init', function () { afterFlip(); });

    pf.loadFromHTML(pages);
    afterFlip();
  }

  /* Görünen sayfalar (1 tabanlı) */
  function visiblePages() {
    var i = currentIndex;
    if (mode === 'portrait') return [i + 1];
    if (i === 0) return [1];
    if (i >= TOTAL - 1) return [TOTAL];
    var left = (i % 2 === 1) ? i : i - 1;   // 0 tabanlı sol sayfa
    return [left + 1, left + 2];
  }

  /* Yatay görünümde yayılım (spread) indeksinden görünen sayfalar */
  function spreadPages(si) {
    var last = TOTAL / 2;                     // 16 sayfa → 0..8
    si = Math.max(0, Math.min(last, si));
    if (si === 0) return [1];
    if (si === last) return [TOTAL];
    return [si * 2, si * 2 + 1];
  }

  function afterFlip() {
    if (!pf) return;
    var v = visiblePages();
    counter.innerHTML = '<span class="c-cur">' + (v.length === 2 ? v[0] + '–' + v[1] : v[0]) +
      '</span> <span class="c-tot">/ ' + TOTAL + '</span>';
    btnPrev.disabled = v[0] <= 1;
    btnNext.disabled = v[v.length - 1] >= TOTAL;
    layout(v, 450);
  }

  /* Kitabın konumu, masa gölgesi ve kenarlar.
     Kapalıyken kapak ekranın ortasında durur; açılırken kitap çift sayfanın
     ortasına kayar. Süre, kapak animasyonuyla aynıdır. */
  var slide = $('bookSlide');
  var lastLayoutKey = '';
  function layout(v, ms) {
    var b;
    try { b = pf.getBoundsRect(); } catch (e) { return; }
    if (!b || !b.pageWidth) return;
    var pw = b.pageWidth, x = b.left, w = b.width, dx = 0, state = 'open';
    if (mode === 'portrait') { x = b.left + pw; w = pw; state = v[0] === 1 ? 'closed-front' : v[0] === TOTAL ? 'closed-back' : 'open'; }
    else if (v.length === 1 && v[0] === 1) { x = b.left + pw; w = pw; dx = -pw / 2; state = 'closed-front'; }
    else if (v.length === 1) { w = pw; dx = pw / 2; state = 'closed-back'; }

    var key = [x, w, dx, b.top, b.height, state].join(',');
    var first = !shadow.classList.contains('on');
    var dur = first ? 0 : (ms || 0);
    var ease = 'cubic-bezier(.65,0,.35,1)';
    slide.style.transition = dur ? 'transform ' + dur + 'ms ' + ease : 'none';
    if (key === lastLayoutKey) return;
    lastLayoutKey = key;

    // Masa gölgesi kapağın hareketini izlesin: açılırken kapak dikeyi geçince
    // genişler, kapanırken kapak dikeye gelmeden daralır. Böylece boş masada
    // gölge (iz) kalmaz.
    var prevW = parseFloat(shadow.style.width) || 0;
    var grow = w > prevW + 1, shrink = w < prevW - 1;
    var sizeDur = (grow || shrink) ? Math.round(dur * 0.55) : dur;
    var sizeDelay = grow ? Math.round(dur * 0.45) : 0;
    shadow.style.transitionDuration = [sizeDur, sizeDur, 300, 300, 500, sizeDur].map(function (t) { return t + 'ms'; }).join(',');
    shadow.style.transitionDelay = [sizeDelay, sizeDelay, 0, 0, 0, sizeDelay].map(function (t) { return t + 'ms'; }).join(',');

    slide.style.transform = 'translate3d(' + dx + 'px,0,0)';
    shadow.style.left = x + 'px';
    shadow.style.top = b.top + 'px';
    shadow.style.width = w + 'px';
    shadow.style.height = b.height + 'px';
    shadow.classList.remove('closed-front', 'closed-back', 'open');
    shadow.classList.add(state, 'on');
  }

  /* Ekran boyutu / telefon yönü değişince kitabı yeniden ölçeklendir.
     Telefonlarda yön değişiminden sonra boyutlar biraz gecikmeli
     oturduğu için iki kez ölçülür. */
  var resizeTimer = null, resizeTimer2 = null;
  function refit() {
    if (!pf) return;
    lastLayoutKey = '';
    pf.update();
    afterFlip();
  }
  function onViewportChange() {
    clearTimeout(resizeTimer); clearTimeout(resizeTimer2);
    resizeTimer = setTimeout(refit, 120);
    resizeTimer2 = setTimeout(refit, 450);
  }
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewportChange);

  /* ── Kontroller ─────────────────────────────────── */
  btnPrev.addEventListener('click', function () { if (pf) pf.flipPrev('bottom'); });
  btnNext.addEventListener('click', function () { if (pf) pf.flipNext('bottom'); });
  $('btnToc').addEventListener('click', function () { if (pf) pf.flip(TOC_PAGE - 1, 'bottom'); });

  // İçindekiler satırına tıklanınca o sayfaya çevir
  var tocSwipe = null, suppressTocClick = 0;
  host.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.toc-link');
    if (!t || !pf || pf.getState() !== 'read') return;
    e.preventDefault();
    if (Date.now() < suppressTocClick) return;
    pf.flip(+t.getAttribute('data-goto') - 1, 'bottom');
  });
  // Kütüphane buton üstünde başlayan dokunuşları yok saydığı için,
  // içindekiler satırları üzerinde yapılan yatay kaydırmayı burada yakala:
  // kısa dokunuş = satıra git, kaydırma = sayfa çevir.
  host.addEventListener('touchstart', function (e) {
    var t = e.target.closest && e.target.closest('.toc-link');
    if (!t || e.touches.length !== 1) { tocSwipe = null; return; }
    tocSwipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  host.addEventListener('touchend', function (e) {
    if (!tocSwipe || !pf) return;
    var p = e.changedTouches[0], s = tocSwipe;
    tocSwipe = null;
    var dx = p.clientX - s.x, dy = p.clientY - s.y;
    if (Math.abs(dx) > 30 && Math.abs(dy) < 60 && Date.now() - s.t < 600) {
      suppressTocClick = Date.now() + 500;
      if (pf.getState() !== 'read') return;
      if (dx > 0) pf.flipPrev('bottom'); else pf.flipNext('bottom');
    }
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (Zoom.isOpen()) {
      if (e.key === 'Escape') Zoom.close();
      else if (e.key === 'ArrowLeft') Zoom.step(-1);
      else if (e.key === 'ArrowRight') Zoom.step(1);
      return;
    }
    if (!pf || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); pf.flipPrev('bottom'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); pf.flipNext('bottom'); }
  });

  /* Tam ekran */
  var btnFull = $('btnFull');
  var root = document.documentElement;
  var canFull = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  if (!canFull) btnFull.hidden = true;
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement; }
  btnFull.addEventListener('click', function () {
    if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
  });
  function onFs() {
    var on = !!fsElement();
    root.classList.toggle('is-fullscreen', on);
    btnFull.setAttribute('aria-label', on ? 'Tam ekrandan çık' : 'Tam ekran');
    btnFull.title = on ? 'Tam ekrandan çık' : 'Tam ekran';
  }
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);

  /* İpucu */
  var hintTimer = null;
  function showHint() {
    hint.classList.add('show');
    hintTimer = setTimeout(dismissHint, 6500);
  }
  function dismissHint() { clearTimeout(hintTimer); hint.classList.remove('show'); }

  /* ── Kağıt sesi ─────────────────────────────────────
     Gerçek kayıtlar (Wikimedia Commons, kamu malı): iç sayfalar için sayfa
     çevirme, kapaklar için kitap kapağı sesi. Dosyalar yalnızca ses açılınca
     yüklenir. Yüklenemezse sentezlenmiş yedek ses çalar. */
  var Sound = (function () {
    var ctx = null, on = false, bufs = {}, noise = null, loading = null;
    var btn = $('btnSound');
    var FILES = {
      pageA: 'assets/audio/page-a.mp3',   // sayfa çevirme (ana)
      pageB: 'assets/audio/page-b.mp3',   // sayfa çevirme (çeşitlilik)
      thudA: 'assets/audio/thud-a.mp3',   // kapak yere oturma
      thudB: 'assets/audio/thud-b.mp3'
    };

    function ensure() {
      if (ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      loading = Promise.all(Object.keys(FILES).map(function (k) {
        return fetch(FILES[k]).then(function (r) {
          if (!r.ok) throw new Error(r.status);
          return r.arrayBuffer();
        }).then(function (ab) {
          return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); });
        }).then(function (b) { bufs[k] = b; }).catch(function () { /* yedek ses kullanılır */ });
      }));
    }

    function synth(t, dur) {
      if (!noise) {
        var len = Math.floor(ctx.sampleRate * 0.9);
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = noise.getChannelData(0), last = 0;
        for (var i = 0; i < len; i++) {
          var w = Math.random() * 2 - 1;
          last = 0.82 * last + 0.18 * w;
          d[i] = last * 1.6 + w * 0.25 + (Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.9 : 0);
        }
      }
      var src = ctx.createBufferSource(); src.buffer = noise;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(3400, t); bp.frequency.exponentialRampToValueAtTime(900, t + dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + dur * 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      src.start(t, 0, dur + 0.05);
    }

    function rnd(a, b) { return a + Math.random() * (b - a); }

    // Tek bir klibi çal: hız, ses seviyesi ve isteğe bağlı alçak geçiren filtre
    function clip(buf, when, rate, gain, lowpass) {
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      var g = ctx.createGain();
      g.gain.value = gain;
      var node = src;
      if (lowpass) {
        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = lowpass; lp.Q.value = 0.5;
        src.connect(lp); node = lp;
      }
      node.connect(g); g.connect(ctx.destination);
      src.start(when);
    }

    /* hard: kapak mı, ms: animasyon süresi, closing: kapak kitabın üstüne mi kapanıyor */
    function play(hard, ms, closing) {
      if (!on || !ctx) return;
      var t = ctx.currentTime;
      var page = Math.random() < 0.65 ? bufs.pageA || bufs.pageB : bufs.pageB || bufs.pageA;
      if (!page) { synth(t, FLIP_MS / 1000 * 0.75); return; }

      if (!hard) {
        // İç sayfa: gerçek kağıt hışırtısı, her seferinde biraz farklı
        clip(page, t, rnd(0.95, 1.07), rnd(0.6, 0.75));
        return;
      }
      // Kapak: kalın kartonun havayı itmesi (yavaş, boğuk hışırtı) …
      var dur = (ms || FLIP_MS * 1.45) / 1000;
      clip(bufs.pageA || page, t, 0.74, 0.42, 1700);
      // … ve kapak yerine oturduğu anda tok ses. Kapanırken daha dolgun.
      var thud = Math.random() < 0.6 ? bufs.thudA || bufs.thudB : bufs.thudB || bufs.thudA;
      if (thud) clip(thud, t + Math.max(0.1, dur - 0.06), rnd(0.96, 1.04), closing ? 0.85 : 0.5, closing ? 0 : 2600);
    }

    btn.addEventListener('click', function () {
      on = !on;
      if (on) {
        ensure();
        if (ctx && ctx.state === 'suspended') ctx.resume();
      }
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = on ? 'Ses: açık' : 'Ses: kapalı';
      if (on && loading) loading.then(function () { play(false); });
    });

    return { play: play };
  })();

  /* ── Yakınlaştırma (büyüteç) ───────────────────── */
  var Zoom = (function () {
    var box = $('zoom'), stage = $('zoomStage'), img = $('zoomImg'), label = $('zoomLabel');
    var page = 1, s = 1, tx = 0, ty = 0, fit = { x: 0, y: 0, w: 0, h: 0 };
    var pointers = {}, pinch = null, pan = null, lastTap = 0, swipe = null;
    var MAX = 5;

    function layout() {
      var W = stage.clientWidth, H = stage.clientHeight;
      var m = W < 600 ? 8 : 40;
      var vReserve = W < 640 ? 130 : 40;   // üst etiket + alt oklar
      var w = Math.min(W - m * 2, (H - m * 2 - vReserve) * RATIO);
      var h = w / RATIO;
      fit = { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h, W: W, H: H };
      img.style.width = w + 'px';
      img.style.height = h + 'px';
      img.style.left = fit.x + 'px';
      img.style.top = fit.y + 'px';
    }

    function clamp() {
      var sw = fit.w * s, sh = fit.h * s;
      if (sw <= fit.W) tx = (fit.W - sw) / 2 - fit.x;
      else tx = Math.min(-fit.x, Math.max(fit.W - fit.x - sw, tx));
      if (sh <= fit.H) ty = (fit.H - sh) / 2 - fit.y;
      else ty = Math.min(-fit.y, Math.max(fit.H - fit.y - sh, ty));
    }

    function apply(animate) {
      clamp();
      img.style.transition = animate ? 'transform .3s ease' : 'none';
      img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
      stage.classList.toggle('zoomed', s > 1.01);
    }

    function zoomAt(px, py, ns, animate) {
      ns = Math.max(1, Math.min(MAX, ns));
      var u = (px - fit.x - tx) / s, v = (py - fit.y - ty) / s;
      s = ns;
      tx = px - fit.x - s * u;
      ty = py - fit.y - s * v;
      apply(animate);
    }

    function show(n) {
      page = Math.max(1, Math.min(TOTAL, n));
      s = 1; tx = 0; ty = 0;
      label.textContent = 'Sayfa ' + page + ' / ' + TOTAL;
      $('zoomPrev').disabled = page <= 1;
      $('zoomNext').disabled = page >= TOTAL;
      img.alt = 'Sayfa ' + page + (TITLES[page] ? ' — ' + TITLES[page] : '');
      img.src = pageSrc(page);                // önce hafif sürüm
      var hi = new Image(), want = page;
      hi.onload = function () { if (page === want) img.src = hi.src; };
      hi.src = zoomSrc(page);                 // sonra yüksek çözünürlük
      layout(); apply(false);
    }

    function open() {
      var v = visiblePages();
      box.hidden = false;
      show(v[0]);
      $('zoomClose').focus();
    }

    function close() {
      box.hidden = true;
      if (pf) {
        var v = visiblePages();
        if (v.indexOf(page) === -1) { pf.turnToPage(page - 1); currentIndex = pf.getCurrentPageIndex(); afterFlip(); }
      }
      $('btnZoom').focus();
    }

    function local(e) {
      var r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    stage.addEventListener('pointerdown', function (e) {
      stage.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = local(e);
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: s };
        pan = null; swipe = null;
      } else if (ids.length === 1) {
        var p = pointers[ids[0]];
        pan = { x: p.x, y: p.y, tx: tx, ty: ty, moved: false };
        swipe = s <= 1.01 ? { x: p.x, y: p.y, t: Date.now() } : null;
        stage.classList.add('dragging');
      }
    });

    stage.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = local(e);
      var ids = Object.keys(pointers);
      if (pinch && ids.length >= 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.s * d / pinch.d, false);
        pinch.s = s; pinch.d = d;
      } else if (pan && ids.length === 1) {
        var p = pointers[ids[0]];
        if (Math.abs(p.x - pan.x) + Math.abs(p.y - pan.y) > 6) pan.moved = true;
        if (s > 1.01) { tx = pan.tx + (p.x - pan.x); ty = pan.ty + (p.y - pan.y); apply(false); }
      }
    });

    function up(e) {
      if (!pointers[e.pointerId]) return;
      var p = local(e);
      delete pointers[e.pointerId];
      var left = Object.keys(pointers).length;
      if (left < 2) pinch = null;
      if (left === 0) {
        stage.classList.remove('dragging');
        if (swipe) {
          var dx = p.x - swipe.x, dy = p.y - swipe.y;
          if (Math.abs(dx) > 60 && Math.abs(dy) < 80 && Date.now() - swipe.t < 500) {
            step(dx < 0 ? 1 : -1); swipe = null; pan = null; return;
          }
        }
        if (pan && !pan.moved) {
          var now = Date.now();
          if (now - lastTap < 320) {           // çift dokunma / çift tık
            if (s > 1.01) { s = 1; apply(true); } else zoomAt(p.x, p.y, 2.5, true);
            lastTap = 0;
          } else lastTap = now;
        }
        pan = null; swipe = null;
      }
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = local(e);
      zoomAt(p.x, p.y, s * Math.exp(-e.deltaY * 0.0022), false);
    }, { passive: false });

    window.addEventListener('resize', function () { if (!box.hidden) { layout(); apply(false); } });

    function step(d) { show(page + d); }

    $('zoomClose').addEventListener('click', close);
    $('zoomPrev').addEventListener('click', function () { step(-1); });
    $('zoomNext').addEventListener('click', function () { step(1); });
    $('btnZoom').addEventListener('click', open);

    return { open: open, close: close, step: step, isOpen: function () { return !box.hidden; } };
  })();

  /* ── Başlat ─────────────────────────────────────── */
  var fill = $('loaderFill');
  var done = 0;
  var first = [];
  for (var n = 1; n <= FIRST_BATCH; n++) {
    first.push(preload(n).then(function () {
      done++;
      fill.style.width = Math.round(done / FIRST_BATCH * 100) + '%';
    }));
  }

  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

  Promise.all(first).then(function () {
    return Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1200); })]);
  }).then(function () {
    createBook();
    requestAnimationFrame(function () {
      $('loader').classList.add('done');
      setTimeout(showHint, 900);
    });
    // Kalan sayfaları arka planda sırayla yükle
    allowAll = false;
    var rest = [];
    for (var k = FIRST_BATCH + 1; k <= TOTAL; k++) rest.push(k);
    (function next() {
      if (!rest.length) { allowAll = true; return; }
      var k = rest.shift();
      preload(k).then(function () {
        var img = document.querySelector('#book img[data-n="' + k + '"]');
        if (img) attachSrc(img);
        next();
      });
    })();
  });
})();

(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var qsa = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };

  var rafThrottle = function (fn) {
    var scheduled = false;
    return function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        fn();
      });
    };
  };

  var nav = document.getElementById("nav");
  var heroActions = document.querySelector("#hero .hero__actions");
  var NAV_SCROLL = 320;
  var logoRetracted = false;
  var heroPast = false;
  var atFooter = false;

  function isHeroActionsPast() {
    if (!heroActions) return false;
    var r = heroActions.getBoundingClientRect();
    return r.bottom <= 0;
  }

  function setHeroPast(past) {
    if (!nav || past === heroPast) return;
    heroPast = past;
    nav.classList.toggle("nav--cta-visible", past);
    updateLogoRetract();
  }

  function setAtFooter(at) {
    if (at === atFooter) return;
    atFooter = at;
    updateLogoRetract();
  }

  function updateLogoRetract() {
    setLogoRetract(heroPast && !atFooter);
  }

  function setLogoRetract(retract) {
    if (!nav || retract === logoRetracted) return;
    logoRetracted = retract;
    nav.classList.toggle("nav--logo-retract", retract);
  }

  function navEase(t) {
    return 1 - Math.pow(1 - t, 2.4);
  }
  function onScroll() {
    if (!nav) return;
    var y = window.scrollY || 0;
    var t = navEase(Math.min(1, y / NAV_SCROLL));
    nav.style.setProperty("--nav-blur", (t * 26).toFixed(1) + "px");
    nav.style.setProperty("--nav-bg", (t * 0.88).toFixed(3));
    nav.style.setProperty("--nav-fade", t.toFixed(3));
  }
  window.addEventListener("scroll", rafThrottle(onScroll), { passive: true });

  if (heroActions && "IntersectionObserver" in window) {
    var heroPastIo = new IntersectionObserver(
      function (entries) {
        var e = entries[0];
        if (!e) return;
        var past = !e.isIntersecting && e.boundingClientRect.top < 0;
        setHeroPast(past);
      },
      { threshold: 0 },
    );
    heroPastIo.observe(heroActions);
  } else if (heroActions) {
    window.addEventListener(
      "scroll",
      function () {
        setHeroPast(isHeroActionsPast());
      },
      { passive: true },
    );
  }

  var footerEl = document.getElementById("join");
  function isFooterReached() {
    if (!footerEl) return false;
    var r = footerEl.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return r.top <= vh * 0.5;
  }
  if (footerEl && "IntersectionObserver" in window) {
    var footerIo = new IntersectionObserver(
      function (entries) {
        var e = entries[0];
        if (!e) return;
        setAtFooter(e.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px 0px -50% 0px" },
    );
    footerIo.observe(footerEl);
  } else if (footerEl) {
    window.addEventListener(
      "scroll",
      function () {
        setAtFooter(isFooterReached());
      },
      { passive: true },
    );
  }

  setHeroPast(isHeroActionsPast());
  onScroll();

  document.body.classList.add("is-loaded");

  qsa("[data-grid-lines]").forEach(function (sec) {
    var misplaced = sec.querySelector(".container > .section-grid, .kard-shell > .section-grid");
    if (misplaced) sec.insertBefore(misplaced, sec.firstChild);
    var existing = sec.querySelector(":scope > .section-grid");
    if (existing) {
      var oldHlines = existing.querySelector(".section-grid__hlines");
      if (oldHlines) oldHlines.remove();
      return;
    }
    var wrap = document.createElement("div");
    wrap.className = "section-grid";
    wrap.setAttribute("aria-hidden", "true");
    var frame = document.createElement("div");
    frame.className = "section-grid__frame";
    for (var c = 0; c < 12; c++) {
      var col = document.createElement("span");
      col.className = "section-grid__col";
      frame.appendChild(col);
    }
    wrap.appendChild(frame);
    sec.insertBefore(wrap, sec.firstChild);
  });

  var heroEl = document.getElementById("hero");
  var HERO_READY_DELAY = 280;
  function revealNavLogo() {
    if (nav) nav.classList.add("nav--logo-in");
  }
  function revealHero() {
    if (heroEl) heroEl.classList.add("hero--ready");
  }
  if (reduced) {
    revealNavLogo();
    revealHero();
  } else {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        revealNavLogo();
        window.setTimeout(revealHero, HERO_READY_DELAY);
      });
    });
  }

  var gaugeEl = document.querySelector("#output .gauge");
  if (gaugeEl) {
    if (reduced) gaugeEl.classList.add("gauge--in-view");
    else if ("IntersectionObserver" in window) {
      var gIo = new IntersectionObserver(
        function (en) {
          en.forEach(function (e) {
            if (e.isIntersecting) {
              gaugeEl.classList.add("gauge--in-view");
              gIo.unobserve(e.target);
            }
          });
        },
        { threshold: 0.22, rootMargin: "0px 0px 18% 0px" },
      );
      gIo.observe(gaugeEl);
    } else gaugeEl.classList.add("gauge--in-view");
  }

  var scalingDiagram = document.querySelector("#scaling .diagram");
  var scalingImg = scalingDiagram ? scalingDiagram.querySelector("img") : null;

  var scalingMeasured = null;
  var SCALING_FALLBACK = {
    optimus: { cx: 270, left: 250, top: 690, base: 718 },
    starship: { cx: 477, left: 405, top: 250, base: 718 },
    sat: { cx: 693, left: 676, top: 64, base: 718 },
  };
  function measureScalingAnchors(img) {
    var w = img.naturalWidth;
    var h = img.naturalHeight;
    if (!w || !h) return null;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, w, h).data;
    var bands = [
      { key: "optimus", x0: 0, x1: Math.floor(w / 3) },
      { key: "starship", x0: Math.floor(w / 3), x1: Math.floor((2 * w) / 3) },
      { key: "sat", x0: Math.floor((2 * w) / 3), x1: w },
    ];
    var out = {};
    bands.forEach(function (band) {
      var mass = 0,
        weighted = 0,
        minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity,
        i;
      for (var x = band.x0; x < band.x1; x++) {
        var count = 0,
          cMinY = Infinity,
          cMaxY = -Infinity;
        for (var y = 0; y < h; y++) {
          i = (y * w + x) * 4;
          if (Math.max(data[i], data[i + 1], data[i + 2]) > 8 && data[i + 3] > 8) {
            count++;
            if (y < cMinY) cMinY = y;
            if (y > cMaxY) cMaxY = y;
          }
        }
        if (count > 2) {
          mass += count;
          weighted += x * count;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (cMinY < minY) minY = cMinY;
          if (cMaxY > maxY) maxY = cMaxY;
        }
      }
      out[band.key] = mass
        ? { cx: weighted / mass, left: minX, right: maxX, top: minY, base: maxY }
        : null;
    });
    return out;
  }
  function applyScalingAnchors() {
    if (!scalingDiagram) return;
    var w = scalingImg && scalingImg.naturalWidth ? scalingImg.naturalWidth : 985;
    var h = scalingImg && scalingImg.naturalHeight ? scalingImg.naturalHeight : 777;
    var measured = scalingImg
      ? scalingMeasured || (scalingMeasured = measureScalingAnchors(scalingImg))
      : null;
    var s = scalingDiagram.style;
    ["optimus", "starship", "sat"].forEach(function (key) {
      var o = (measured && measured[key]) || SCALING_FALLBACK[key];
      s.setProperty("--anchor-" + key, ((o.cx / w) * 100).toFixed(2) + "%");
      s.setProperty("--obj-" + key + "-x", ((o.left / w) * 100).toFixed(2) + "%");
      s.setProperty("--obj-" + key + "-base", ((o.base / h) * 100).toFixed(2) + "%");
      s.setProperty("--obj-" + key + "-h", (((o.base - o.top) / h) * 100).toFixed(2) + "%");
    });
  }
  applyScalingAnchors();
  if (scalingImg) {
    if (!scalingImg.complete) scalingImg.addEventListener("load", applyScalingAnchors);
    else applyScalingAnchors();
    window.addEventListener("resize", applyScalingAnchors);
  }

  var SEL = ".reveal, .h2, .statement";
  var els = qsa(SEL);
  els.forEach(function (el) {
    var p = el.parentElement;
    if (!p) return;
    var sibs = Array.prototype.filter.call(p.children, function (c) {
      return c.matches && c.matches(SEL);
    });
    var i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty("--reveal-delay", Math.min(i * 0.07, 0.4) + "s");
  });
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(
      function (en) {
        en.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  } else {
    els.forEach(function (el) {
      el.classList.add("in-view");
    });
  }

  var stmtSec = document.querySelector(".statement-sec");
  var stmtEl = stmtSec ? stmtSec.querySelector(".statement") : null;
  if (stmtEl && !stmtEl.dataset.words) {
    stmtEl.dataset.words = "1";
    var parts = stmtEl.innerHTML.trim().split(/<br\s*\/?>/i);
    var words = [];
    parts.forEach(function (html, li) {
      if (li) words.push({ br: true });
      html
        .replace(/<[^>]+>/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .forEach(function (w) {
          words.push({ text: w });
        });
    });
    var wordCount = words.filter(function (x) {
      return x.text;
    }).length;
    var emphFrom = Math.max(0, wordCount - 5);
    stmtEl.textContent = "";
    var wi = 0;
    var needSpace = false;
    words.forEach(function (item) {
      if (item.br) {
        stmtEl.appendChild(document.createElement("br"));
        needSpace = false;
        return;
      }
      if (needSpace) stmtEl.appendChild(document.createTextNode(" "));
      var span = document.createElement("span");
      span.className = "statement__w" + (wi >= emphFrom ? " statement__w--emph" : "");
      span.textContent = item.text;
      stmtEl.appendChild(span);
      wi += 1;
      needSpace = true;
    });
  }
  var stmtWords = stmtEl ? qsa(".statement__w", stmtEl) : [];
  if (stmtSec && stmtWords.length) {
    function applyStatementScroll() {
      var rect = stmtSec.getBoundingClientRect();
      var vh = window.innerHeight;
      var t = (vh * 0.72 - rect.top) / (rect.height + vh * 0.16);
      t = Math.max(0, Math.min(1, t));
      var lit = Math.ceil(t * stmtWords.length);
      stmtWords.forEach(function (w, i) {
        w.classList.toggle("is-lit", i < lit);
      });
    }
    if (reduced)
      stmtWords.forEach(function (w) {
        w.classList.add("is-lit");
      });
    else {
      window.addEventListener("scroll", rafThrottle(applyStatementScroll), { passive: true });
      window.addEventListener("resize", applyStatementScroll, { passive: true });
      applyStatementScroll();
    }
  }

  var siteDesktopMq = window.matchMedia("(min-width: 981px)");
  function siteDesktop() {
    return siteDesktopMq.matches;
  }
  function scrollVh() {
    return window.innerHeight || document.documentElement.clientHeight;
  }

  var tiers = qsa(".scale__tier");
  var ksection = document.getElementById("kardashev"),
    shell = ksection ? ksection.querySelector(".kard-shell") : null;
  var seg = {};
  qsa(".kard__vid").forEach(function (v) {
    seg[v.dataset.seg] = v;
  });
  var dur = { 1: 6.083, 2: 6.083 },
    lastTier = 0,
    kTarget = 0,
    kCurrent = 0,
    kardSegOn = 1,
    kardMode = null;

  var kIsAndroid = /Android/i.test(navigator.userAgent || "");
  var KFPS = 10;
  var KFRAME_COUNT = { 1: 61, 2: 61 };
  var kframes = { 1: [], 2: [] },
    kCanvas = null,
    kCtx = null;
  function setTier(n) {
    if (n === lastTier) return;
    lastTier = n;
    tiers.forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.tier === String(n));
    });
  }
  function applyTierVisual(p) {
    if (siteDesktop()) {
      setTier(p < 0.25 ? 1 : p < 0.75 ? 2 : 3);
      tiers.forEach(function (t) {
        t.style.opacity = "";
      });
      return;
    }
    tiers.forEach(function (t) {
      var n = parseInt(t.dataset.tier, 10);
      var center = n === 1 ? 0.14 : n === 2 ? 0.5 : 0.86;
      var o = 0.42 + 0.58 * Math.max(0, 1 - Math.abs(p - center) / 0.3);
      t.style.opacity = String(Math.min(1, o));
      t.classList.toggle("is-active", o >= 0.8);
      if (o >= 0.8) lastTier = n;
    });
  }
  function clearKardSegStyles() {
    Object.keys(seg).forEach(function (k) {
      var v = seg[k];
      v.style.opacity = "";
      v.style.visibility = "";
      v.classList.remove("is-active");
    });
    if (seg["1"]) seg["1"].classList.add("is-active");
  }
  function setKardSources() {}
  function showSeg(n) {
    var useTwo = n === 2 && seg["2"] && seg["2"].readyState >= 1;
    if (seg["1"]) seg["1"].classList.toggle("is-active", n === 1 || (n === 2 && !useTwo));
    if (seg["2"]) seg["2"].classList.toggle("is-active", useTwo);
  }
  function setSegOpacity(o1, o2) {
    if (seg["1"]) {
      seg["1"].style.opacity = String(o1);
      seg["1"].style.visibility = o1 > 0 ? "visible" : "hidden";
    }
    if (seg["2"]) {
      seg["2"].style.opacity = String(o2);
      seg["2"].style.visibility = o2 > 0 ? "visible" : "hidden";
    }
  }
  function primeVideoMobile(v, cb) {
    if (!v || v.dataset.kardPrimed === "1") {
      if (cb) cb();
      return;
    }
    var done = function () {
      v.dataset.kardPrimed = "1";
      v.pause();
      if (cb) cb();
    };
    var pr = v.play();
    if (pr && pr.then)
      pr.then(done).catch(function () {
        v.addEventListener("loadeddata", done, { once: true });
        v.load();
      });
    else done();
  }
  function primeVideoDesktop(v, cb) {
    if (!v || v.dataset.kardPrimed === "1") {
      if (cb) cb();
      return;
    }
    var done = function () {
      v.dataset.kardPrimed = "1";
      v.pause();
      try {
        if (v.currentTime > 0.02) v.currentTime = 0;
      } catch (e) {}
      if (cb) cb();
    };
    var kick = function () {
      var pr = v.play();
      if (pr && pr.then) pr.then(done).catch(done);
      else done();
    };
    if (v.readyState >= 2) kick();
    else v.addEventListener("loadeddata", kick, { once: true });
  }
  function primeVideo(v, cb) {
    if (siteDesktop()) primeVideoDesktop(v, cb);
    else primeVideoMobile(v, cb);
  }
  function seekMobile(v, t) {
    if (!v) return;
    var run = function () {
      if (!v.duration || isNaN(v.duration)) return;
      if (Math.abs(v.currentTime - t) > 0.012) {
        try {
          v.currentTime = t;
        } catch (e) {}
      }
    };
    if (v.readyState >= 1) run();
    else v.addEventListener("loadeddata", run, { once: true });
  }
  function seekDesktop(v, t) {
    if (!v) return;
    v.dataset.kardSeek = String(t);
    var run = function () {
      if (!v.duration || isNaN(v.duration)) return;
      var target = parseFloat(v.dataset.kardSeek);
      if (isNaN(target)) return;
      if (Math.abs(v.currentTime - target) <= 0.03) return;
      if (v.dataset.kardSeeking === "1") return;
      v.dataset.kardSeeking = "1";
      var onSeeked = function () {
        v.dataset.kardSeeking = "0";
        var next = parseFloat(v.dataset.kardSeek);
        if (!isNaN(next) && Math.abs(v.currentTime - next) > 0.03) run();
      };
      v.addEventListener("seeked", onSeeked, { once: true });
      try {
        v.currentTime = target;
      } catch (e) {
        v.removeEventListener("seeked", onSeeked);
        v.dataset.kardSeeking = "0";
      }
    };
    if (v.readyState >= 1) run();
    else v.addEventListener("loadeddata", run, { once: true });
  }
  function seek(v, t) {
    if (siteDesktop()) seekDesktop(v, t);
    else seekMobile(v, t);
  }
  function kardInView() {
    if (!ksection) return false;
    var r = ksection.getBoundingClientRect();
    var vh = scrollVh();
    return r.bottom > 0 && r.top < vh;
  }
  function kProgress() {
    if (!ksection) return 0;
    var vh = scrollVh();
    if (shell) {
      var total = shell.offsetHeight - vh;
      if (total > 48) {
        var r = shell.getBoundingClientRect();
        if (!siteDesktop()) {
          var startTop = vh * 0.1;
          var range = Math.max(total + startTop, 1);
          return Math.min(Math.max((startTop - r.top) / range, 0), 1);
        }
        return Math.min(Math.max(-r.top / total, 0), 1);
      }
    }
    var rr = ksection.getBoundingClientRect();
    return Math.min(Math.max((vh - rr.top) / (vh + rr.height), 0), 1);
  }
  function applyKardMobile(p) {
    applyTierVisual(p);
    if (p < 0.5) {
      showSeg(1);
      seek(seg["1"], (p / 0.5) * dur["1"]);
    } else {
      showSeg(2);
      seek(seg["2"], ((p - 0.5) / 0.5) * dur["2"]);
    }
  }
  function applyKardDesktop(p) {
    applyTierVisual(p);
    var v2ready = seg["2"] && seg["2"].readyState >= 1;
    if (v2ready) {
      if (p >= 0.5) kardSegOn = 2;
      else if (p < 0.46) kardSegOn = 1;
    } else {
      kardSegOn = 1;
    }
    if (kardSegOn === 1) {
      setSegOpacity(1, 0);
      seek(seg["1"], Math.min(1, p / 0.5) * dur["1"]);
      if (p > 0.38) seek(seg["2"], 0);
    } else {
      setSegOpacity(0, 1);
      seek(seg["2"], Math.max(0, (p - 0.5) / 0.5) * dur["2"]);
    }
  }

  function kpad3(n) {
    n = String(n);
    while (n.length < 3) n = "0" + n;
    return n;
  }
  function kSetupCanvas() {
    if (kCanvas || !ksection) return;
    var media = ksection.querySelector(".kard-media");
    if (!media) return;
    kCanvas = document.createElement("canvas");
    kCanvas.className = "kard__canvas";
    kCanvas.width = 1280;
    kCanvas.height = 720;
    kCtx = kCanvas.getContext("2d");
    var scrim = media.querySelector(".kard-scrim");
    media.insertBefore(kCanvas, scrim);
    media.classList.add("is-frames");

    Object.keys(seg).forEach(function (k) {
      var v = seg[k];
      if (!v) return;
      v.removeAttribute("poster");
      v.preload = "none";
      v.innerHTML = "";
      try {
        v.load();
      } catch (e) {}
    });
  }
  function kPreloadFrames() {
    if (kframes["1"].length) return;
    ["1", "2"].forEach(function (s) {
      for (var i = 0; i < KFRAME_COUNT[s]; i++) {
        var img = new Image();
        img.decoding = "async";
        img.addEventListener("load", kRedraw, { once: true });
        img.src = "assets/kardashev/frames/s" + s + "/f_" + kpad3(i) + ".webp";
        kframes[s][i] = img;
      }
    });
  }
  function kDrawFrame(s, t) {}
  function applyKardAndroid(p) {
    applyKard(p);
  }
  function kRedraw() {}
  function applyKard(p) {
    applyTierVisual(p);
    var layers = [
      document.querySelector(".kard__bg-layer--1"),
      document.querySelector(".kard__bg-layer--2"),
      document.querySelector(".kard__bg-layer--3"),
    ];
    if (layers[0] && layers[1] && layers[2]) {
      var p1 = Math.min(1, Math.max(0, p / 0.45));
      var scale1 = 1.15 - 0.2 * p1;
      var op1 = 1 - p1;
      layers[0].style.transform = "scale(" + scale1.toFixed(3) + ")";
      layers[0].style.opacity = op1.toFixed(3);
      layers[0].style.zIndex = op1 > 0.01 ? "2" : "1";

      var scale2 = 1.15;
      var op2 = 0;
      if (p < 0.5) {
        var p2_in = Math.min(1, Math.max(0, (p - 0.15) / 0.3));
        scale2 = 1.15 - 0.1 * p2_in;
        op2 = p2_in;
      } else {
        var p2_out = Math.min(1, Math.max(0, (p - 0.5) / 0.35));
        scale2 = 1.05 - 0.1 * p2_out;
        op2 = 1 - p2_out;
      }
      layers[1].style.transform = "scale(" + scale2.toFixed(3) + ")";
      layers[1].style.opacity = op2.toFixed(3);
      layers[1].style.zIndex = op2 > 0.01 ? "2" : "1";

      var p3 = Math.min(1, Math.max(0, (p - 0.45) / 0.45));
      var scale3 = 1.15 - 0.15 * p3;
      var op3 = p3;
      layers[2].style.transform = "scale(" + scale3.toFixed(3) + ")";
      layers[2].style.opacity = op3.toFixed(3);
      layers[2].style.zIndex = op3 > 0.01 ? "2" : "1";
    }
  }
  function primeAllKard(cb) {
    if (cb) cb();
  }
  var kardSourcesLoaded = false;
  function initKardSources() {
    if (kardSourcesLoaded) return;
    kardSourcesLoaded = true;
  }
  if (ksection && "IntersectionObserver" in window) {
    var kLoadIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            initKardSources();
            kLoadIo.disconnect();
          }
        });
      },
      { rootMargin: "400px" },
    );
    kLoadIo.observe(ksection);
    var kPrimeIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          primeAllKard(function () {
            applyKard(kCurrent);
          });
          kPrimeIo.disconnect();
        });
      },
      { threshold: 0.12, rootMargin: "12% 0px 0px 0px" },
    );
    kPrimeIo.observe(ksection);
  }
  if (tiers.length && ksection) {
    function absTop(el) {
      return el.getBoundingClientRect().top + window.pageYOffset;
    }
    tiers.forEach(function (t) {
      t.addEventListener("click", function () {
        var n = parseInt(t.dataset.tier, 10),
          tp = n === 1 ? 0 : n === 2 ? 0.5 : 1,
          y;
        var vh = scrollVh();
        if (shell && shell.offsetHeight > vh + 48) {
          y = absTop(shell) + tp * (shell.offsetHeight - vh);
        } else {
          var h = ksection.offsetHeight || vh;
          y = absTop(ksection) + tp * (h + vh) - vh;
        }
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });
    function onKardLayoutChange() {
      setKardSources();
      kTarget = kProgress();
      kCurrent = kTarget;
      primeAllKard(function () {
        applyKard(kCurrent);
      });
    }
    if (siteDesktopMq.addEventListener)
      siteDesktopMq.addEventListener("change", onKardLayoutChange);
    else siteDesktopMq.addListener(onKardLayoutChange);
    if (reduced) {
      window.addEventListener(
        "scroll",
        function () {
          kTarget = kProgress();
          kCurrent = kTarget;
          applyKard(kCurrent);
        },
        { passive: true },
      );
      applyKard(kProgress());
    } else if (!siteDesktop()) {
      window.addEventListener(
        "scroll",
        function () {
          kTarget = kProgress();
          kCurrent = kTarget;
          if (kardInView()) applyKard(kCurrent);
        },
        { passive: true },
      );
      kTarget = kProgress();
      kCurrent = kTarget;
      applyKard(kCurrent);
    } else {
      window.addEventListener(
        "scroll",
        function () {
          kTarget = kProgress();
        },
        { passive: true },
      );
      window.addEventListener("resize", function () {
        kTarget = kProgress();
      });
      kTarget = kProgress();
      (function loop() {
        var delta = kTarget - kCurrent;
        kCurrent += Math.abs(delta) > 0.35 ? delta * 0.22 : delta * 0.12;
        if (kardInView()) applyKard(kCurrent);
        requestAnimationFrame(loop);
      })();
    }
  }
})();

(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initField(canvas, opts) {
    if (!canvas || !canvas.getContext) return null;
    opts = opts || {};
    var interactive = opts.interactive === true;
    var ctx = canvas.getContext("2d");
    var host = canvas.parentElement;
    var PITCH = opts.pitch || 22;
    var BASE = opts.base != null ? opts.base : 0.045;
    var PEAK = opts.peak != null ? opts.peak : 0.72;
    var dpr = 1,
      cssW = 0,
      cssH = 0,
      cols = 0,
      rows = 0,
      offX = 0,
      offY = 0,
      R = interactive ? 180 : 0;
    var bx = null,
      by = null,
      ox = null,
      oy = null,
      wt = null,
      ph = null,
      twSpd = null,
      starHue = null,
      starTint = null,
      introCol = null,
      introGlow = null,
      shimCol = null,
      shimGlow = null,
      twExtra = null;
    var PULSE_ATTACK = 0.2;
    var PULSE_DECAY = 0.982;
    var lastFrameNow = 0;
    var pulseSmooth = !!(opts.intro || opts.periodicShimmer);
    var twinkle = !!opts.twinkle;
    var periodicShimmer = !!opts.periodicShimmer;
    var scrollShimmer = !!opts.scrollShimmer;
    var scrollShimmerEl = opts.scrollShimmerEl || null;
    var shimmerStart = 0;
    var shimmerNextAt = 0;
    var shimmerDur = opts.shimmerDur != null ? opts.shimmerDur : 2600;
    var shimmerBandW = 0.2;
    var shimmerVaryDir = opts.shimmerVaryDir === true;
    var SHIMMER_IDLE_MIN = opts.shimmerIdleMin != null ? opts.shimmerIdleMin : 4000;
    var SHIMMER_IDLE_RANGE = opts.shimmerIdleRange != null ? opts.shimmerIdleRange : 2800;

    var patternField = !!opts.patternField;
    var patternScale = opts.patternScale != null ? opts.patternScale : 3.4;
    var patternSpeed = opts.patternSpeed != null ? opts.patternSpeed : 0.1;
    var patternRot = opts.patternRot != null ? opts.patternRot : 0.045;
    var patternFloor = opts.patternFloor != null ? opts.patternFloor : 0.5;
    var patternAmp = opts.patternAmp != null ? opts.patternAmp : 1;
    var starsOnly = !!opts.stars;
    var starHover = opts.starHover != null ? !!opts.starHover : starsOnly;
    var autoRun = !!opts.autoRun;
    var autoDrift = !!opts.autoDrift;
    var driftMul = opts.driftMul != null ? opts.driftMul : 1;
    var driftAmp = opts.driftAmp != null ? opts.driftAmp : 1;
    var waveMul = opts.waveMul != null ? opts.waveMul : 1;
    var twMul = opts.twinkleMul != null ? opts.twinkleMul : 1;
    var timeMul = opts.timeMul != null ? opts.timeMul : 1;
    var starTwPow = opts.starTwPow != null ? opts.starTwPow : 1.35;
    var starTwFloor = opts.starTwFloor != null ? opts.starTwFloor : 0.04;
    var tintRate = opts.tintRate != null ? opts.tintRate : starsOnly ? 0.26 : 0;
    var sparkCutoff = opts.sparkCutoff != null ? opts.sparkCutoff : null;
    var alphaMul = opts.alphaMul != null ? opts.alphaMul : 1;
    var maxAlpha = opts.maxAlpha != null ? opts.maxAlpha : 0.98;
    var textShields = null;
    var textShieldFloor = opts.textShieldFloor != null ? opts.textShieldFloor : 0.76;
    var textShieldFeather = opts.textShieldFeather != null ? opts.textShieldFeather : 52;
    var sizeMul = opts.sizeMul != null ? opts.sizeMul : 1;
    var heroDots = !!opts.heroDots;
    var topScatter = !!opts.topScatter;
    var scatterBand = opts.scatterBand != null ? opts.scatterBand : 0.5;
    var scatterDepth = opts.scatterDepth != null ? opts.scatterDepth : 0.38;
    var scatterKeep = opts.scatterKeep != null ? opts.scatterKeep : null;
    var rightScatter = !!opts.rightScatter;
    var rightFade = opts.rightFade != null ? opts.rightFade : 0;
    var leftFade = opts.leftFade != null ? opts.leftFade : 0;
    var edgeGate = null;
    var insetL = 0,
      insetR = 0,
      insetT = 0,
      insetB = 0;
    var fieldW = 0,
      fieldH = 0;
    var hasInset = false;
    var insetFeather = opts.insetFeather != null ? opts.insetFeather : 52;
    (function applyInsetOpts() {
      var ins = opts.inset;
      if (typeof ins === "number") insetL = insetR = insetT = insetB = ins;
      else if (ins && typeof ins === "object") {
        insetT = ins.top || 0;
        insetR = ins.right || 0;
        insetB = ins.bottom || 0;
        insetL = ins.left || 0;
      }
      if (opts.insetX != null) insetL = insetR = opts.insetX;
      if (opts.insetY != null) insetT = insetB = opts.insetY;
      if (opts.insetTop != null) insetT = opts.insetTop;
      if (opts.insetRight != null) insetR = opts.insetRight;
      if (opts.insetBottom != null) insetB = opts.insetBottom;
      if (opts.insetLeft != null) insetL = opts.insetLeft;
      hasInset = insetL + insetR + insetT + insetB > 0;
    })();
    var px = -9999,
      py = -9999,
      tx = 0,
      ty = 0;
    var hasPointer = false,
      lastMove = -9999,
      raf = 0,
      running = false;
    var boostTarget = 0,
      boost = 0,
      hotX = -9999,
      hotY = -9999;
    var intro = !!opts.intro;
    var deferIntroVisible = !!opts.deferIntroVisible;
    var introStart = 0;
    var INTRO_MS = 2800;
    var INTRO_BAND = 0.24;
    var INTRO_TAIL_MS = 1400;
    function easeOut3(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function smooth01(t) {
      return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
    }
    function pulseMix(v, lo, hi) {
      return smooth01((v - lo) / (hi - lo));
    }

    function hash01(a, b, c) {
      var x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
      return x - Math.floor(x);
    }

    function edgeInsetDim(cx, cy) {
      if (!hasInset) return 1;
      var dl = cx - insetL;
      var dr = insetR > 0 ? cssW - insetR - cx : Infinity;
      var dt = cy - insetT;
      var db = cssH - insetB - cy;
      var d = Math.min(dl, dr, dt, db);
      if (d >= insetFeather) return 1;
      if (d <= 0) return 0;
      return smooth01(d / insetFeather);
    }

    function sideFadeDim(cx) {
      var dim = 1;
      var rf = rightFade > 0 && rightFade <= 1 ? rightFade * cssW : rightFade;
      var lf = leftFade > 0 && leftFade <= 1 ? leftFade * cssW : leftFade;
      if (rf > 0 && cx > cssW - rf) dim *= smooth01((cssW - cx) / rf);
      if (lf > 0 && cx < lf) dim *= smooth01(cx / lf);
      return dim;
    }

    function rightScatterGate(x, c, r, ph) {
      var xNorm = cssW > 0 ? x / cssW : 0;
      if (xNorm < 0.5) return 1;
      var t = smooth01((xNorm - 0.5) / 0.5);
      var spor = hash01(ph, c * 0.43, r * 0.29);
      var cut = 0.52 + t * 0.46;
      if (spor > cut) return 0;
      return 0.35 + (1 - t) * 0.65 * (0.5 + spor * 0.5);
    }

    function topScatterGate(y, x, c, r, ph, w) {
      var xNorm = fieldW > 0 ? (x - insetL) / fieldW : 0;
      var yn = fieldH > 0 ? (y - insetT) / fieldH : y / cssH;
      var edge =
        scatterBand +
        Math.sin(xNorm * 8.1 + ph * 0.42) * 0.15 +
        Math.sin(xNorm * 3.1 + c * 0.51 + r * 0.17) * 0.13 +
        Math.cos(xNorm * 5.4 - ph * 1.1 + r * 0.28) * 0.1 +
        (hash01(ph, c * 0.37, r * 0.21) - 0.5) * 0.28;
      var dist = yn - edge;
      if (dist >= scatterDepth) return 1;
      if (dist <= -scatterDepth * 0.28) return 0;
      var t = smooth01((dist + scatterDepth * 0.28) / (scatterDepth * 1.22));
      var n1 = hash01(ph, c * 0.17, r * 0.23);
      var n2 = 0.5 + 0.5 * Math.sin(ph * 4.1 + c * 0.91 + r * 1.37);
      var n3 = 0.5 + 0.5 * Math.cos(ph * 2.6 - c * 1.2 + r * 0.55);
      var spor = n1 * n2 * n3;
      var gate = 0.1 + t * (0.22 + spor * 0.78) * (0.42 + w * 0.58);
      if (t < 0.32 && spor < 0.18) gate *= 0.32;
      return Math.min(1, gate);
    }

    function textShieldDim(cx, cy) {
      if (!textShields || !textShields.length) return 1;
      var dim = 1,
        si,
        sh,
        sdx,
        sdy,
        sd,
        floor,
        feather;
      for (si = 0; si < textShields.length; si++) {
        sh = textShields[si];
        floor = sh.floor != null ? sh.floor : textShieldFloor;
        feather = sh.feather != null ? sh.feather : textShieldFeather;
        sdx = Math.max(sh.x0 - cx, 0, cx - sh.x1);
        sdy = Math.max(sh.y0 - cy, 0, cy - sh.y1);
        sd = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sd < feather) {
          dim = Math.min(dim, sd <= 0 ? floor : floor + (sd / feather) * (1 - floor));
        }
      }
      return dim;
    }

    function armShimmerPause(now, delayMs) {
      shimmerNextAt =
        now + (delayMs != null ? delayMs : SHIMMER_IDLE_MIN + Math.random() * SHIMMER_IDLE_RANGE);
    }

    function triggerShimmer(now) {
      shimmerStart = now;
      shimmerBandW = 0.14 + Math.random() * 0.13;

      if (shimmerVaryDir && shimCol && bx && shimCol.length === bx.length) {
        var ang = Math.random() * Math.PI * 2;
        var dx = Math.cos(ang),
          dy = Math.sin(ang);
        var minS = Infinity,
          maxS = -Infinity,
          si,
          s;
        for (si = 0; si < bx.length; si++) {
          s = (bx[si] / cssW) * dx + (by[si] / cssH) * dy;
          shimCol[si] = s;
          if (s < minS) minS = s;
          if (s > maxS) maxS = s;
        }
        var rng = maxS - minS || 1;
        for (si = 0; si < bx.length; si++) shimCol[si] = (shimCol[si] - minS) / rng;
      }
    }

    function size() {
      var r = host.getBoundingClientRect();
      cssW = Math.max(1, r.width);
      cssH = Math.max(1, r.height);
      if (typeof opts.getInset === "function") {
        var ins = opts.getInset(host, cssW, cssH);
        insetT = ins.top || 0;
        insetR = ins.right || 0;
        insetB = ins.bottom || 0;
        insetL = ins.left || 0;
        hasInset = insetL + insetR + insetT + insetB > 0;
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = starsOnly
        ? Math.max(130, Math.min(cssW * 0.22, 260))
        : Math.max(140, Math.min(cssW * 0.18, 250));
      fieldW = Math.max(PITCH * 3, cssW - insetL - insetR);
      fieldH = Math.max(PITCH * 3, cssH - insetT - insetB);
      if (hasInset) {
        cols = Math.max(3, Math.ceil(fieldW / PITCH) + 1);
        rows = Math.max(3, Math.ceil(fieldH / PITCH) + 1);
      } else {
        cols = Math.ceil(fieldW / PITCH) + 2;
        rows = Math.ceil(fieldH / PITCH) + 2;
      }
      offX = insetL + Math.round((fieldW - (cols - 1) * PITCH) / 2);
      offY = insetT + Math.round((fieldH - (rows - 1) * PITCH) / 2);
      var n = cols * rows;
      bx = new Float32Array(n);
      by = new Float32Array(n);
      ox = new Float32Array(n);
      oy = new Float32Array(n);
      wt = new Float32Array(n);
      ph = new Float32Array(n);
      if (twinkle) twSpd = new Float32Array(n);
      if (starsOnly) {
        starHue = new Float32Array(n);
        starTint = new Float32Array(n);
      }
      if (intro) introCol = new Float32Array(n);
      if (topScatter || scatterKeep != null || rightScatter) edgeGate = new Float32Array(n);
      var k = 0;
      for (var rr = 0; rr < rows; rr++)
        for (var c = 0; c < cols; c++) {
          bx[k] = offX + c * PITCH;
          by[k] = offY + rr * PITCH;

          wt[k] = 0.45 + Math.random() * 0.55;
          ph[k] = Math.random() * 6.283;
          if (twinkle) {
            var tb = starsOnly ? (opts.starTwBase != null ? opts.starTwBase : 0.18) : 0.55;
            var tr = starsOnly ? (opts.starTwRange != null ? opts.starTwRange : 0.75) : 2.4;
            twSpd[k] = (tb + Math.random() * tr) * twMul;
          }
          if (starsOnly) {
            starHue[k] = 185 + Math.random() * 155;
            starTint[k] = Math.random() < tintRate ? 1 : 0;
          }
          if (topScatter || scatterKeep != null || rightScatter) {
            var gate = 1;
            if (topScatter) gate *= topScatterGate(by[k], bx[k], c, rr, ph[k], wt[k]);
            if (scatterKeep != null && hash01(ph[k], c * 0.37, rr * 0.21) > scatterKeep) gate = 0;
            if (rightScatter) gate *= rightScatterGate(bx[k], c, rr, ph[k]);
            edgeGate[k] = gate;
          }
          k++;
        }
      if (intro && bx.length) {
        if (!introCol || introCol.length !== bx.length) introCol = new Float32Array(bx.length);
        if (!introGlow || introGlow.length !== bx.length) introGlow = new Float32Array(bx.length);
        var iMin = Infinity,
          iMax = -Infinity,
          ii;
        for (ii = 0; ii < bx.length; ii++) {
          var iv =
            (bx[ii] / cssW) * (0.8 + Math.sin(ph[ii] * 1.25) * 0.05) +
            (by[ii] / cssH) * (0.3 + Math.cos(ph[ii] * 1.6) * 0.06);
          introCol[ii] = iv;
          if (iv < iMin) iMin = iv;
          if (iv > iMax) iMax = iv;
        }
        var iRange = iMax - iMin || 1;
        for (ii = 0; ii < bx.length; ii++) introCol[ii] = (introCol[ii] - iMin) / iRange;
      }
      if (pulseSmooth && bx.length) {
        if (!twExtra || twExtra.length !== bx.length) twExtra = new Float32Array(bx.length);
      }
      if (periodicShimmer && bx.length) {
        if (!shimCol || shimCol.length !== bx.length) shimCol = new Float32Array(bx.length);
        if (!shimGlow || shimGlow.length !== bx.length) shimGlow = new Float32Array(bx.length);
        var minS = Infinity,
          maxS = -Infinity,
          si;
        for (si = 0; si < bx.length; si++) {
          var s =
            (bx[si] / cssW) * (0.76 + Math.sin(ph[si] * 1.3) * 0.04) +
            (by[si] / cssH) * (0.26 + Math.cos(ph[si] * 1.7) * 0.05);
          shimCol[si] = s;
          if (s < minS) minS = s;
          if (s > maxS) maxS = s;
        }
        var sRange = maxS - minS || 1;
        for (si = 0; si < bx.length; si++) shimCol[si] = (shimCol[si] - minS) / sRange;
      }
    }

    function render(now) {
      var dt = lastFrameNow > 0 ? Math.min(48, now - lastFrameNow) : 16.67;
      lastFrameNow = now;
      var pulseDecay = Math.pow(PULSE_DECAY, dt / 16.67);
      var pulseAttack = 1 - Math.pow(1 - PULSE_ATTACK, dt / 16.67);
      var aa = now * 0.00018;
      if (interactive) {
        var auto = !hasPointer || now - lastMove > 2400;
        if (auto) {
          tx = cssW * (0.5 + 0.3 * Math.cos(aa) + 0.07 * Math.cos(aa * 2.7));
          ty = cssH * (0.46 + 0.26 * Math.sin(aa * 1.25));
        }
        if (px < -9000) {
          px = tx;
          py = ty;
        }
        px += (tx - px) * 0.09;
        py += (ty - py) * 0.09;
      } else if (autoDrift) {
        tx = cssW * (0.5 + 0.34 * Math.cos(aa) + 0.09 * Math.cos(aa * 2.4));
        ty = cssH * (0.48 + 0.26 * Math.sin(aa * 1.3) + 0.07 * Math.sin(aa * 2.1));
        if (px < -9000) {
          px = tx;
          py = ty;
        }
        px += (tx - px) * 0.07;
        py += (ty - py) * 0.07;
      } else if (!starsOnly) {
        tx = cssW * (0.52 + 0.22 * Math.cos(aa) + 0.06 * Math.sin(aa * 1.8));
        ty = cssH * (0.44 + 0.18 * Math.sin(aa * 1.1) + 0.05 * Math.cos(aa * 2.4));
        px = tx;
        py = ty;
      }
      if (starHover && hasPointer) {
        if (px < -9000) {
          px = tx;
          py = ty;
        }
        px += (tx - px) * 0.12;
        py += (ty - py) * 0.12;
      }
      boost += (boostTarget - boost) * (boostTarget > boost ? 0.14 : 0.07);
      var Rnow = R * (1 + boost * 1.05);
      var T = now * 0.001,
        Tt = T * (starsOnly ? (0.32 + boost * 1.15) * timeMul : 1);
      var R2 = Rnow * Rnow,
        n = bx.length;
      var hotR = Rnow * (1.22 + boost * 0.32),
        hotR2 = hotR * hotR;
      var hotOn = boost > 0.04 && hotX > -9000;
      var patInvW = 0,
        patInvH = 0,
        patCos = 1,
        patSin = 0,
        patPhase = 0;
      if (patternField) {
        patInvW = 1 / cssW;
        patInvH = 1 / cssH;
        var patAng = T * patternRot;
        patCos = Math.cos(patAng);
        patSin = Math.sin(patAng);
        patPhase = T * patternSpeed;
      }

      var introBusy = intro && introStart > 0 && now - introStart < INTRO_MS + INTRO_TAIL_MS;
      if (periodicShimmer && !reduced) {
        if (!introBusy) {
          if (shimmerStart > 0 && now - shimmerStart >= shimmerDur) {
            shimmerStart = 0;
            armShimmerPause(now);
          } else if (shimmerStart <= 0 && now >= shimmerNextAt) {
            triggerShimmer(now);
          }
        }
      }

      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = "#ffffff";
      for (var i = 0; i < n; i++) {
        var X = bx[i],
          Y = by[i];
        var footerStar = autoDrift && starsOnly && !heroDots;
        var driftT = footerStar ? T * timeMul : T;
        var fx = Math.sin(driftT * 0.55 + X * 0.011 + ph[i]);
        var fy = Math.cos(driftT * 0.52 + Y * 0.013 + ph[i]);
        var dx = X - px,
          dy = Y - py,
          d2 = dx * dx + dy * dy;
        var illum = 0,
          repel = 0,
          hover = 0;
        if ((interactive || starHover) && px > -9000 && d2 < R2) {
          var d = Math.sqrt(d2) || 1,
            t = 1 - d / Rnow,
            s = t * t * (3 - 2 * t);
          illum = s;
          hover = s;
          if (interactive) repel = (s * 16) / d;
        }
        if (hotOn) {
          var hdx = X - hotX,
            hdy = Y - hotY,
            hd2 = hdx * hdx + hdy * hdy;
          if (hd2 < hotR2) {
            var hd = Math.sqrt(hd2) || 1,
              ht = 1 - hd / hotR,
              hs = ht * ht * (3 - 2 * ht) * boost;
            illum = Math.max(illum, hs * 0.68);
            hover = Math.max(hover, hs * 0.5);
            repel += (hs * (9 + boost * 4)) / hd;
          }
        }
        var wave = interactive
          ? 0
          : footerStar
            ? 0.09 * waveMul * (0.5 + 0.5 * Math.sin(driftT * 1.35 + ph[i] * 2 + X * 0.01))
            : starsOnly
              ? 0
              : (twinkle ? 0.05 : 0.14) * (0.5 + 0.5 * Math.sin(T * 0.9 + ph[i] * 2 + X * 0.008));
        var drift = starsOnly
          ? autoDrift
            ? 0.12 * driftMul * driftAmp
            : 0.12
          : twinkle
            ? 0.5
            : 1.2;
        var tox = fx * drift + dx * repel;
        var toy = fy * drift + dy * repel;
        var settle = starsOnly ? (autoDrift ? 0.075 : 0.04) : twinkle ? 0.06 : 0.12;
        ox[i] += (tox - ox[i]) * settle;
        oy[i] += (toy - oy[i]) * settle;
        var w = wt[i];
        var tw = 1,
          sparkle = 0;
        if (twinkle) {
          var t1 = Math.sin(Tt * twSpd[i] * (1 + boost * 0.8) + ph[i]);
          var t2 = Math.sin(Tt * twSpd[i] * 1.9 * (1 + boost * 0.5) + ph[i] * 1.85);
          var t3 = Math.sin(Tt * twSpd[i] * 0.35 + ph[i] * 0.6);
          var twPow = footerStar ? starTwPow - boost * 0.28 : 1.7 - boost * 0.35;
          var twSpan = 1 - starTwFloor;
          tw = footerStar
            ? starTwFloor +
              twSpan * Math.pow(0.5 + 0.5 * t1, twPow) * (0.5 + 0.5 * (0.5 + 0.5 * t3))
            : 0.06 + 0.94 * Math.pow(0.5 + 0.5 * t1, twPow) * (0.65 + 0.35 * (0.5 + 0.5 * t3));
          var cut = sparkCutoff != null ? sparkCutoff : 0.96 - boost * 0.12;
          var cutW = footerStar ? 0.2 : 0.04;
          if (t2 > cut) {
            sparkle = 1;
            tw = Math.min(footerStar ? 2.65 : 1.85, tw + (0.7 + boost * 0.5) * ((t2 - cut) / cutW));
          }
        }
        var a;
        if (starsOnly) {
          a =
            (BASE * w * tw * 3.1 + (w > 0.82 ? 0.05 * tw : 0) + wave * w) *
            (1 + boost * 0.45) *
            alphaMul;
          if (hover > 0.04) a *= 1 + hover * (0.22 + boost * 0.35);
        } else
          a =
            (BASE * w +
              0.018 * (0.5 + 0.5 * fx) +
              illum * PEAK * w * (1 + boost * 0.5) +
              wave * w) *
            tw;
        var patB = 0;
        if (patternField) {
          var pnx = X * patInvW,
            pny = Y * patInvH;
          var pu = pnx * patCos + pny * patSin;
          var pv = pny * patCos - pnx * patSin;
          var pband =
            Math.sin((pu * patternScale - patPhase) * 6.2831853) * 0.6 +
            Math.sin((pv * patternScale * 0.85 + patPhase * 0.7) * 6.2831853) * 0.4;
          patB = 0.5 + 0.5 * pband;
          patB = patB * patB * (3 - 2 * patB);
          a *= patternFloor + patternAmp * patB;
        }
        if (intro && introCol && !reduced && !introStart) continue;

        var pulseTarget = 0;
        if (intro && introCol && !reduced && introStart > 0) {
          var introElapsed = now - introStart;
          var introT = Math.min(1, introElapsed / INTRO_MS);
          if (introT < 1) {
            var introFront = easeOut3(introT) * (1 + INTRO_BAND * 1.45);
            var introNx = introCol[i] + Math.sin(ph[i] * 2.3 + Y * 0.008 + X * 0.005) * 0.058;
            var introBand = (introFront - introNx) / INTRO_BAND;
            var introGate = smooth01(introBand);
            var introWake = smooth01(
              (introFront - introNx + INTRO_BAND * 0.62) / (INTRO_BAND * 1.85),
            );
            var textDimIntro = textShields ? textShieldDim(X, Y) : 1;
            a *= Math.max(introGate, introWake * 0.16 * (0.4 + 0.6 * textDimIntro));
            if (a < 0.008) continue;
            var introCrest = 0;
            if (introBand > 0 && introBand < 1) {
              introCrest = Math.pow(Math.sin(introBand * Math.PI), 0.78);
              if (introGlow) introGlow[i] = Math.max(introGlow[i], introCrest);
              pulseTarget = Math.max(
                pulseTarget,
                introCrest * (1.35 + wt[i] * 0.32) + introGate * 0.18,
              );
            } else if (introWake > 0.35 && introGlow) {
              introGlow[i] = Math.max(introGlow[i], introWake * 0.28);
              pulseTarget = Math.max(pulseTarget, introWake * 0.18);
            }
          }
          if (introGlow) {
            var iGlow = introGlow[i];
            if (iGlow > 0.002) {
              iGlow *= Math.pow(0.962, dt / 16.67);
              introGlow[i] = iGlow;
              pulseTarget = Math.max(pulseTarget, iGlow * (0.9 + wt[i] * 0.24));
            } else {
              introGlow[i] = 0;
            }
          }
        }
        if (periodicShimmer && shimCol && shimmerStart > 0) {
          var shimT = Math.min(1, (now - shimmerStart) / shimmerDur);
          var shimFront = easeOut3(shimT) * (1 + shimmerBandW * 1.2);
          var shimPos = shimCol[i] + Math.sin(ph[i] * 2.4 + X * 0.009 + Y * 0.007) * 0.055;
          var shimBand = (shimFront - shimPos) / shimmerBandW;
          var shimGate = smooth01(shimBand);
          if (shimGate > 0.02) {
            var shimPulse = Math.sin(shimBand * Math.PI);
            if (shimGlow) shimGlow[i] = Math.max(shimGlow[i], shimPulse);
            pulseTarget = Math.max(pulseTarget, shimPulse * (1.02 + wt[i] * 0.32));
          }
        }
        if (periodicShimmer && shimGlow) {
          var glow = shimGlow[i];
          if (glow > 0.002) {
            glow *= Math.pow(0.978, dt / 16.67);
            shimGlow[i] = glow;
            pulseTarget = Math.max(pulseTarget, glow * (0.76 + wt[i] * 0.18));
          } else {
            shimGlow[i] = 0;
          }
        }
        var cx = X + ox[i],
          cy = Y + oy[i];
        var textDim = textShields ? textShieldDim(cx, cy) : 1;
        if (textDim < 0.92 && pulseTarget > 0) {
          pulseTarget *= 0.42 + 0.58 * textDim;
        }
        var extra = 0;
        var twDraw = tw;
        if (twExtra) {
          extra = twExtra[i];
          if (pulseTarget > extra) extra += (pulseTarget - extra) * pulseAttack;
          else {
            var extraDecay = pulseDecay;
            if (textDim < 0.9) extraDecay = Math.pow(0.93, dt / 16.67);
            extra *= extraDecay;
            if (extra < 0.002) extra = 0;
          }
          twExtra[i] = extra;
          twDraw = tw + extra;
          a *= 1 + extra * 0.3;
        }
        a *= textDim;
        if (edgeGate) a *= edgeGate[i];
        if (rightFade || leftFade) a *= sideFadeDim(cx);
        if (hasInset) {
          var insetDim = edgeInsetDim(cx, cy);
          a *= insetDim;
          if (insetDim < 0.008) continue;
        }
        if (a < 0.008) continue;
        if (a > maxAlpha) a = maxAlpha;
        ctx.globalAlpha = a;
        if (starsOnly) {
          if (hover > 0.04) {
            var hue = (ph[i] * 57.3 + Math.atan2(dy, dx) * 57.3 + 240) % 360;
            ctx.fillStyle =
              "hsl(" + hue.toFixed(0) + ", " + (62 + hover * 32) + "%, " + (56 + hover * 34) + "%)";
          } else {
            var tintMix = periodicShimmer || intro ? pulseMix(extra, 0.035, 0.24) : 0;
            if (tintMix > 0.001) {
              var sh = 205 + Math.sin(ph[i] * 1.6 + Tt * 0.6) * 22 + starHue[i] * 0.04;
              var sat = (20 + twDraw * 16) * tintMix;
              var lit = 92 * (1 - tintMix) + (72 + twDraw * 24) * tintMix;
              ctx.fillStyle =
                "hsl(" + sh.toFixed(0) + ", " + sat.toFixed(0) + "%, " + lit.toFixed(0) + "%)";
            } else if (
              starTint[i] > 0.5 &&
              (sparkle || twDraw > (autoDrift && sparkle ? 0.55 : 0.82))
            ) {
              var h = starHue[i] + Math.sin(Tt * 0.45 + ph[i]) * 14;
              ctx.fillStyle =
                "hsl(" +
                h.toFixed(0) +
                ", " +
                (48 + twDraw * 42).toFixed(0) +
                "%, " +
                (52 + twDraw * 34).toFixed(0) +
                "%)";
            } else if (autoDrift && sparkle) {
              ctx.fillStyle =
                "hsl(" +
                (210 + Math.sin(Tt + ph[i]) * 18).toFixed(0) +
                ", 28%, " +
                (78 + twDraw * 18).toFixed(0) +
                "%)";
            } else {
              ctx.fillStyle = "#ffffff";
            }
          }
          var pulseSz = extra * 1.05;
          var szPulse = footerStar ? 0.35 * (0.5 + 0.5 * Math.sin(Tt * 1.4 + ph[i])) : 0;
          var sz =
            (0.65 +
              w * 0.55 +
              twDraw * (footerStar ? 2.15 : 1.85) +
              szPulse +
              (autoDrift && sparkle ? 0.65 : 0) +
              pulseSz +
              patB * 0.8) *
            sizeMul *
            (1 + hover * (0.18 + boost * 0.22) + boost * 0.08);
          var half = sz * 0.5;
          ctx.fillRect(cx - half, cy - half, sz, sz);
        } else {
          var sz = (twinkle ? 1 + twDraw * 1.6 + illum * 2.2 : 2 + illum * 2.6) * (1 + boost * 0.2);
          ctx.fillRect(cx - sz * 0.5, cy - sz * 0.5, sz, sz);
        }
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(render);
    }

    function armIntro() {
      if (!intro || introStart || reduced) return;
      introStart = performance.now();
      if (deferIntroVisible) canvas.classList.add("is-on");
      if (periodicShimmer && !shimmerNextAt) {
        armShimmerPause(introStart, INTRO_MS + INTRO_TAIL_MS + 1800);
      }
    }

    function start() {
      if (running || reduced) return;
      var now = performance.now();
      if (periodicShimmer && !shimmerNextAt && !intro) {
        armShimmerPause(now, 2400 + Math.random() * 1200);
      }
      running = true;
      raf = requestAnimationFrame(render);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    }

    if (interactive || starHover) {
      window.addEventListener(
        "pointermove",
        function (e) {
          var r = host.getBoundingClientRect();
          var inside =
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom;
          if (!inside) {
            hasPointer = false;
            px = -9999;
            py = -9999;
            return;
          }
          tx = e.clientX - r.left;
          ty = e.clientY - r.top;
          hasPointer = true;
          lastMove = performance.now();
        },
        { passive: true },
      );
    }

    var rT;
    window.addEventListener(
      "resize",
      function () {
        clearTimeout(rT);
        rT = setTimeout(function () {
          size();
          if (reduced) render(performance.now());
        }, 160);
      },
      { passive: true },
    );

    size();
    if (reduced) {
      px = cssW * 0.6;
      py = cssH * 0.46;
      render(performance.now());
      canvas.classList.add("is-on");
      return;
    }

    if (autoRun) {
      if (!deferIntroVisible) canvas.classList.add("is-on");
      start();
      if ("IntersectionObserver" in window) {
        var ioAuto = new IntersectionObserver(
          function (en) {
            en[0].isIntersecting ? start() : stop();
          },
          { threshold: 0 },
        );
        ioAuto.observe(host);
      }
    } else {
      requestAnimationFrame(function () {
        canvas.classList.add("is-on");
      });
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(
          function (en) {
            en[0].isIntersecting ? start() : stop();
          },
          { threshold: 0.02 },
        );
        io.observe(host);
      } else {
        start();
      }
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (autoRun || !("IntersectionObserver" in window)) start();
    });

    if (scrollShimmer && periodicShimmer && "IntersectionObserver" in window && !reduced) {
      var shimTarget = scrollShimmerEl ? document.querySelector(scrollShimmerEl) : host;
      if (shimTarget) {
        var scrollShimmerFired = false;
        var ioScrollShim = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              if (!e.isIntersecting || scrollShimmerFired) return;
              scrollShimmerFired = true;
              ioScrollShim.disconnect();
              start();
              window.setTimeout(function () {
                var now = performance.now();
                triggerShimmer(now);
                armShimmerPause(
                  now,
                  shimmerDur + SHIMMER_IDLE_MIN + Math.random() * SHIMMER_IDLE_RANGE,
                );
              }, 160);
            });
          },
          { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
        );
        ioScrollShim.observe(shimTarget);
      }
    }

    return {
      setBoost: function (v) {
        boostTarget = Math.max(0, Math.min(1, v));
      },
      setHotspot: function (x, y) {
        hotX = x;
        hotY = y;
        tx = x;
        ty = y;
        px = x;
        py = y;
        hasPointer = true;
        lastMove = performance.now();
      },
      setTextShields: function (rects) {
        textShields = rects && rects.length ? rects : null;
      },
      armIntro: armIntro,
      fireShimmer: function () {
        if (reduced || !periodicShimmer) return;
        start();
        var now = performance.now();
        triggerShimmer(now);
        armShimmerPause(now, shimmerDur + SHIMMER_IDLE_MIN + Math.random() * SHIMMER_IDLE_RANGE);
      },
    };
  }

  function makeDotGrid(canvas, opts) {
    var api = {
      setBoost: function () {},
      setTextShields: function () {},
      armIntro: function () {},
    };
    if (!canvas || !canvas.getContext) return api;
    var ctx = canvas.getContext("2d");
    var PITCH = opts && opts.pitch != null ? opts.pitch : 14;
    var DOT = 1.05;
    var BASE = opts && opts.base != null ? opts.base : 0.15;
    var SPARK = opts && opts.spark != null ? opts.spark : 0.3;
    var DEPTH = opts && opts.depth != null ? opts.depth : 0.5;
    var VIS_FLOOR = 0.92;
    var AMB = 1.15;
    var HOVER = 2.4;
    var FLSPD = 0.0033;
    var CLIFT = 0.45;
    var SIZE_LIFT = 0.35;
    var GLOW_R = 460;
    var TRAIL_DECAY = 0.986;
    var EDGE = 60;
    var INTRO_MS = opts && opts.introMs != null ? opts.introMs : 3000;
    var INTRO_BAND = 0.3;
    var CREST = 1.2;
    var CRESTW = 0.13;
    var RAMP_MS = 900;
    var scatterMode = opts && opts.scatter ? String(opts.scatter) : "";
    var getInset = opts && opts.getInset;
    var insetFeather = opts && opts.insetFeather != null ? opts.insetFeather : 52;
    var insetL = 0,
      insetR = 0,
      insetT = 0,
      insetB = 0,
      fieldW = 0,
      fieldH = 0;
    var TAU = Math.PI * 2;
    function smooth01(t) {
      return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
    }
    function applyInset() {
      insetL = insetR = insetT = insetB = 0;
      fieldW = cssW;
      fieldH = cssH;
      if (!getInset) return;
      var ins = getInset(canvas, cssW, cssH);
      if (!ins) return;
      insetT = ins.top || 0;
      insetR = ins.right || 0;
      insetB = ins.bottom || 0;
      insetL = ins.left || 0;
      fieldW = Math.max(1, cssW - insetL - insetR);
      fieldH = Math.max(1, cssH - insetT - insetB);
    }
    function insetDim(cx, cy) {
      if (!getInset) return 1;
      var dl = cx - insetL;
      var dr = insetR > 0 ? cssW - insetR - cx : Infinity;
      var dt = cy - insetT;
      var db = cssH - insetB - cy;
      var d = Math.min(dl, dr, dt, db);
      if (d >= insetFeather) return 1;
      if (d <= 0) return 0;
      return smooth01(d / insetFeather);
    }
    function scatterDim(x, y, col, row, ph, idx) {
      if (!scatterMode) return 1;
      var fx = x - insetL;
      var fy = y - insetT;
      var xn = fieldW > 0 ? fx / fieldW : 0;
      var yn = fieldH > 0 ? fy / fieldH : 0;
      if (scatterMode === "footer") {
        var spor =
          rnd(idx + 99) *
          (0.5 + 0.5 * Math.sin(ph * 4.1 + col * 0.91 + row * 1.37)) *
          (0.5 + 0.5 * Math.cos(ph * 2.6 - col * 1.2 + row * 0.55));
        var topEdge =
          -0.06 +
          Math.sin(xn * 7.4 + ph * 0.41) * 0.14 +
          Math.sin(xn * 3.6 + col * 0.43) * 0.1 +
          (rnd(idx + 404) - 0.5) * 0.12;
        var botEdge =
          1.04 +
          Math.sin(xn * 6.1 - ph * 0.62) * 0.12 +
          Math.cos(xn * 4.2 + row * 0.31) * 0.09 +
          (rnd(idx + 505) - 0.5) * 0.1;
        var leftEdge =
          -0.05 +
          Math.sin(yn * 8.2 + ph * 0.33) * 0.14 +
          Math.cos(yn * 3.8 + col * 0.27) * 0.1 +
          (rnd(idx + 606) - 0.5) * 0.11;
        var rightEdge =
          1.05 +
          Math.sin(yn * 5.6 - ph * 0.48) * 0.13 +
          Math.cos(yn * 7.1 + row * 0.19) * 0.09 +
          (rnd(idx + 707) - 0.5) * 0.11;
        var fromTop = yn - topEdge;
        var fromBot = botEdge - yn;
        var fromLeft = xn - leftEdge;
        var fromRight = rightEdge - xn;
        if (fromTop <= -0.08 || fromBot <= -0.08 || fromLeft <= -0.08 || fromRight <= -0.08)
          return 0;
        var gate =
          smooth01(fromTop / 0.22) *
          smooth01(fromBot / 0.22) *
          smooth01(fromLeft / 0.2) *
          smooth01(fromRight / 0.2);
        gate *= 0.38 + spor * 0.62;
        if (fromTop < 0.14 && spor < 0.14) gate *= 0.35;
        if (fromBot < 0.14 && spor < 0.16) gate *= 0.35;
        gate *= 1.05 - xn * 0.12;

        if (rnd(idx + 1201) > 0.74 + gate * 0.18) return 0;
        if (rnd(idx + 1302) > 0.88 && spor < 0.35) return 0;
        return gate;
      }
      return 1;
    }
    var dpr = 1,
      cssW = 0,
      cssH = 0,
      cols = 0,
      rows = 0,
      offX = 0,
      offY = 0;
    var spark = null,
      depth = null,
      phase = null,
      spd = null,
      heat = null;
    var px = 0,
      py = 0,
      gx = 0,
      gy = 0,
      pointerSeen = false;
    var raf = 0,
      running = false,
      inView = true,
      primed = false,
      introStart = -1,
      introEnd = -1;
    var introFired = false,
      deferIntro = !!(opts && opts.deferIntroVisible);
    var skipIntro = !!(opts && opts.skipIntro);

    function rnd(i) {
      var x = Math.sin(i * 127.1 + 11.7) * 43758.5453;
      return x - Math.floor(x);
    }
    function spike(t, c, w) {
      var z = (t - c) / w;
      return Math.exp(-z * z);
    }
    function fieldNoise(x, y) {
      var n =
        Math.sin(x * 0.0125 + y * 0.0071) * 0.5 +
        Math.sin(x * 0.027 - y * 0.019 + 1.7) * 0.32 +
        Math.sin((x + y) * 0.0094 + 2.3) * 0.18;
      return 0.5 + 0.5 * n;
    }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = canvas.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      if (!cssW || !cssH) return;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      cols = Math.ceil(cssW / PITCH) + 1;
      rows = Math.ceil(cssH / PITCH) + 1;
      offX = Math.round((cssW - (cols - 1) * PITCH) / 2);
      offY = Math.round((cssH - (rows - 1) * PITCH) / 2);
      spark = new Float32Array(cols * rows);
      depth = new Float32Array(cols * rows);
      phase = new Float32Array(cols * rows);
      spd = new Float32Array(cols * rows);
      heat = new Float32Array(cols * rows);
      var k = 0;
      for (var rr = 0; rr < rows; rr++) {
        for (var c = 0; c < cols; c++) {
          var v = rnd(k + 1);
          spark[k] = v * v;
          depth[k] = fieldNoise(offX + c * PITCH, offY + rr * PITCH);
          phase[k] = rnd(k + 941) * TAU;
          spd[k] = 0.4 + 1.2 * rnd(k + 5003);
          k++;
        }
      }
      applyInset();
      if (!primed) {
        px = gx = insetL + fieldW * 0.35;
        py = gy = insetT + fieldH * 0.42;
        primed = true;
      }
    }
    function edgeDim(x, y) {
      var d = Math.min(x, cssW - x, y, cssH - y);
      return d >= EDGE ? 1 : d <= 0 ? 0 : d / EDGE;
    }
    function draw(now) {
      if (!cssW || !cssH || !spark) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      if (!reduced && !introFired) return;
      var introActive = false,
        front = 0;
      if (introStart >= 0) {
        var ip = (now - introStart) / INTRO_MS;
        if (ip >= 1) {
          introStart = -1;
          introEnd = now;
        } else {
          introActive = true;
          var t = ip < 0 ? 0 : ip;
          var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          front = e * (1 + 2 * INTRO_BAND) - INTRO_BAND;
        }
      }

      var iFac = introStart >= 0 ? 0 : introEnd >= 0 ? Math.min(1, (now - introEnd) / RAMP_MS) : 1;
      var paint = iFac > 0 && pointerSeen;
      ctx.fillStyle = "#fff";
      var k = 0;
      for (var rr = 0; rr < rows; rr++) {
        for (var c = 0; c < cols; c++) {
          var s = spark[k],
            dp = depth[k],
            ph = phase[k],
            sp = spd[k];
          var x = offX + c * PITCH,
            y = offY + rr * PITCH;

          var h = heat[k] * TRAIL_DECAY;
          if (paint) {
            var dx = x - gx,
              dy = y - gy,
              d2 = dx * dx + dy * dy;
            if (d2 < GLOW_R * GLOW_R) {
              var pr = 1 - Math.sqrt(d2) / GLOW_R;
              pr = pr * pr * iFac;
              if (pr > h) h += (pr - h) * 0.1;
            }
          }
          heat[k] = h;
          k++;
          var glow = h;

          var f =
            (0.5 + 0.5 * Math.sin(now * FLSPD * sp + ph)) *
            (0.5 + 0.5 * Math.sin(now * FLSPD * sp * 0.53 + ph * 2.3 + 1.1));
          f = f * f;
          var a =
            (BASE + SPARK * s) *
            (1 - DEPTH + DEPTH * dp) *
            (VIS_FLOOR + (AMB + HOVER * glow) * f) *
            (1 + CLIFT * glow);
          var rad = DOT * (0.78 + 0.5 * dp) * (1 + SIZE_LIFT * glow);
          if (introActive) {
            var dpos = (x / cssW + y / cssH) * 0.5 + (ph / TAU - 0.5) * 0.22;
            var dd = front - dpos;
            var rt = dd / INTRO_BAND;
            var reveal = rt <= 0 ? 0 : rt >= 1 ? 1 : rt * rt * (3 - 2 * rt);
            if (reveal <= 0) continue;
            a = (a + CREST * Math.exp(-(dd * dd) / (CRESTW * CRESTW)) * (0.4 + 0.6 * s)) * reveal;
            rad *= 0.45 + 0.55 * reveal;
          }
          a *= scatterDim(x, y, c, rr, ph, k - 1);
          if (a <= 0.004) continue;
          a *= insetDim(x, y);
          if (a <= 0.004) continue;
          if (!getInset) a *= edgeDim(x, y);
          if (a <= 0.004) continue;
          ctx.globalAlpha = a > 1 ? 1 : a;
          ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      }
      ctx.globalAlpha = 1;
    }
    function frame() {
      gx += (px - gx) * 0.14;
      gy += (py - gy) * 0.14;
      draw(performance.now());
      if (running) raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    function triggerIntro() {
      if (introFired || reduced) return;
      introFired = true;
      introStart = performance.now();
      start();
    }
    api.armIntro = triggerIntro;

    size();
    if (skipIntro) introFired = true;
    draw(performance.now());
    canvas.classList.add("is-on");
    if (reduced) return api;
    if (deferIntro) window.setTimeout(triggerIntro, 250);

    window.addEventListener(
      "pointermove",
      function (e) {
        var r = canvas.getBoundingClientRect();
        var nx = e.clientX - r.left,
          ny = e.clientY - r.top;
        if (!pointerSeen) {
          gx = nx;
          gy = ny;
        }
        px = nx;
        py = ny;
        pointerSeen = true;
        if (inView && introFired) start();
      },
      { passive: true },
    );
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (en) {
          inView = en[0].isIntersecting;
          if (inView) {
            if (introFired) start();
            else if (!deferIntro) triggerIntro();
          } else stop();
        },
        { threshold: 0.01 },
      );
      io.observe(canvas);
    } else if (!deferIntro) triggerIntro();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (inView && introFired) start();
    });
    var rt;
    window.addEventListener(
      "resize",
      function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
          size();
          draw(performance.now());
        }, 150);
      },
      { passive: true },
    );
    return api;
  }
  initField = makeDotGrid;

  var heroGrid = initField(document.querySelector(".hero__grid-fx"), {
    twinkle: true,
    stars: true,
    starHover: false,
    autoRun: true,
    intro: true,
    deferIntroVisible: true,
    periodicShimmer: true,
    patternField: true,
    pitch: 20,
    base: 0.053,
    peak: 0,
    alphaMul: 0.96,
    maxAlpha: 0.93,
    textShieldFloor: 0.7,
    textShieldFeather: 52,
    scatterKeep: 0.68,
    rightScatter: true,
    rightFade: 0.48,
    insetFeather: 88,
    getInset: function (host, w, h) {
      var hero = host.closest(".hero") || host.parentElement;
      var box = hero && hero.querySelector(".container");
      var bleedX = 48;
      var edgeMin = 20;
      var top = Math.round(20 + h * 0.02);
      var bottom = Math.round(40 + h * 0.04);
      if (!box || !hero) {
        return { top: top, bottom: bottom, left: edgeMin, right: 0 };
      }
      var hr = hero.getBoundingClientRect();
      var cr = box.getBoundingClientRect();
      return {
        top: top,
        bottom: bottom,
        left: Math.max(edgeMin, Math.round(cr.left - hr.left - bleedX)),
        right: 0,
      };
    },
  });
  if (heroGrid && !reduced) heroGrid.setBoost(0.12);
  (function wireHeroTextShield() {
    if (!heroGrid || reduced) return;
    var hero = document.getElementById("hero");
    if (!hero) return;
    var titleEl = hero.querySelector(".hero__title");
    function measure() {
      var hr = hero.getBoundingClientRect();
      var rects = [];
      if (titleEl) {
        var r = titleEl.getBoundingClientRect();
        rects.push({
          x0: r.left - hr.left - 20,
          y0: r.top - hr.top - 14,
          x1: r.right - hr.left + 28,
          y1: r.bottom - hr.top + 16,
          floor: 0.56,
          feather: 44,
        });
      }
      heroGrid.setTextShields(rects);
    }
    measure();
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("load", measure);
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(measure);
      ro.observe(hero);
      if (titleEl) ro.observe(titleEl);
    }
    if ("MutationObserver" in window) {
      new MutationObserver(function () {
        if (hero.classList.contains("hero--ready")) measure();
      }).observe(hero, { attributes: true, attributeFilter: ["class"] });
    }
  })();
  (function wireHeroIntro() {
    if (!heroGrid || reduced) return;
    var hero = document.getElementById("hero");
    var gridIntroDone = false;
    var fallbackTimer = null;
    function fireGridIntro() {
      if (gridIntroDone) return;
      gridIntroDone = true;
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      heroGrid.armIntro();
    }
    function waitForHeroEntrance() {
      if (!hero || !hero.classList.contains("hero--ready")) return;

      var targets = hero.querySelectorAll(".hero__line:nth-child(-n+3)");
      if (!targets.length) {
        fireGridIntro();
        return;
      }
      var remaining = targets.length;
      function oneDone(e) {
        if (e && e.animationName && e.animationName !== "heroLineIn") return;
        remaining--;
        if (remaining <= 0) fireGridIntro();
      }
      targets.forEach(function (el) {
        el.addEventListener("animationend", oneDone, { once: true });
      });
      var maxEnd = 0;
      targets.forEach(function (el) {
        var cs = window.getComputedStyle(el);
        var delay = parseFloat(cs.animationDelay) || 0;
        var dur = parseFloat(cs.animationDuration) || 0;
        if (delay + dur > maxEnd) maxEnd = delay + dur;
      });
      fallbackTimer = window.setTimeout(fireGridIntro, maxEnd * 1000 + 20);
    }
    if (!hero) {
      fireGridIntro();
      return;
    }
    function kick() {
      if (hero.classList.contains("hero--ready")) waitForHeroEntrance();
    }
    kick();
    if (!hero.classList.contains("hero--ready") && "MutationObserver" in window) {
      new MutationObserver(kick).observe(hero, { attributes: true, attributeFilter: ["class"] });
    }
  })();

  initField(document.querySelector(".footer__grid-fx"), {
    scatter: "footer",
    pitch: 11,
    base: 0.19,
    spark: 0.36,
    depth: 0.62,
    skipIntro: true,
    deferIntroVisible: false,
    insetFeather: 36,
    getInset: function (host, w, h) {
      var footer = host.closest(".footer");
      var box = footer && footer.querySelector(".container");
      var bleedX = Math.round(Math.min(80, Math.max(44, w * 0.055)));
      var bleedY = Math.round(Math.min(28, h * 0.035));
      var top = Math.max(0, Math.round(6 + h * 0.008 - bleedY));
      var bottom = 0;
      if (!box || !footer) {
        return {
          top: top,
          bottom: bottom,
          left: Math.round(w * 0.02),
          right: Math.round(w * 0.02),
        };
      }
      var fr = footer.getBoundingClientRect();
      var cr = box.getBoundingClientRect();
      return {
        top: top,
        bottom: bottom,
        left: Math.max(0, Math.round(cr.left - fr.left - bleedX)),
        right: Math.max(0, Math.round(fr.right - cr.right - bleedX)),
      };
    },
  });
})();

(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var qsa = function (s) {
    return Array.prototype.slice.call(document.querySelectorAll(s));
  };
  var ARROW_HTML =
    '<span class="link-cta__arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line data-part="shaft" x1="15" y1="12" x2="15" y2="12"></line><line data-part="upper" x1="11" y1="8" x2="15" y2="12"></line><line data-part="lower" x1="11" y1="16" x2="15" y2="12"></line></svg></span>';

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function setArrowProgress(svg, p) {
    var shaft = svg.querySelector('[data-part="shaft"]');
    var upper = svg.querySelector('[data-part="upper"]');
    var lower = svg.querySelector('[data-part="lower"]');
    if (!shaft || !upper || !lower) return;
    shaft.setAttribute("x1", String(lerp(15, 9, p)));
    shaft.setAttribute("x2", String(lerp(15, 18, p)));
    shaft.style.opacity = p < 0.1 ? "0" : String(lerp(0, 1, (p - 0.1) / 0.9));
    upper.setAttribute("x1", String(lerp(11, 14, p)));
    upper.setAttribute("x2", String(lerp(15, 18, p)));
    lower.setAttribute("x1", String(lerp(11, 14, p)));
    lower.setAttribute("x2", String(lerp(15, 18, p)));
  }

  qsa(".link-cta").forEach(function (link) {
    if (!link.querySelector(".link-cta__arrow")) link.insertAdjacentHTML("beforeend", ARROW_HTML);
    var svg = link.querySelector(".link-cta__arrow svg");
    if (!svg) return;
    setArrowProgress(svg, 0);

    if (reduced) {
      link.addEventListener("mouseenter", function () {
        setArrowProgress(svg, 1);
      });
      link.addEventListener("mouseleave", function () {
        setArrowProgress(svg, 0);
      });
      link.addEventListener("focusin", function () {
        setArrowProgress(svg, 1);
      });
      link.addEventListener("focusout", function () {
        setArrowProgress(svg, 0);
      });
      return;
    }

    var progress = 0,
      target = 0,
      velocity = 0,
      raf = 0;
    function tick() {
      var spring = -500 * (progress - target) - 30 * velocity;
      velocity += spring * (1 / 60);
      progress += velocity * (1 / 60);
      if (Math.abs(progress - target) < 0.002 && Math.abs(velocity) < 0.002) {
        progress = target;
        velocity = 0;
      }
      setArrowProgress(svg, progress);
      if (progress !== target || Math.abs(velocity) > 0.002) raf = requestAnimationFrame(tick);
      else raf = 0;
    }
    function setTarget(v) {
      target = v;
      if (!raf) raf = requestAnimationFrame(tick);
    }
    link.addEventListener("mouseenter", function () {
      setTarget(1);
    });
    link.addEventListener("mouseleave", function () {
      setTarget(0);
    });
    link.addEventListener("focusin", function () {
      setTarget(1);
    });
    link.addEventListener("focusout", function () {
      setTarget(0);
    });
  });
})();

(function () {
  "use strict";
  var glow = document.querySelector(".space__sun-glow");
  var section = document.getElementById("space");
  if (!glow || !section) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    glow.style.opacity = "0.55";
    return;
  }
  var scheduled = false;
  function spaceSunYRatio() {
    var y = getComputedStyle(section).getPropertyValue("--space-sun-y").trim();
    if (y.endsWith("%")) return parseFloat(y) / 100;
    return 0.1;
  }
  var media = section.querySelector(".scene__media");
  function apply() {
    scheduled = false;
    var r = (media || section).getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var sunY = r.top + r.height * spaceSunYRatio();
    var p = (vh - sunY) / (vh * 0.6);
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    var e = p * p * (3 - 2 * p);
    glow.style.opacity = (e * 0.55).toFixed(3);
  }
  function onScroll() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(apply);
    }
  }
  apply();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
})();

(function () {
  "use strict";
  var openers = Array.prototype.slice.call(document.querySelectorAll("[data-video-open]"));
  if (!openers.length) return;

  var siteDesktopMq = window.matchMedia("(min-width: 981px)");
  var MODAL_MS = 500;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) MODAL_MS = 120;
  var openT = 0;
  var closeT = 0;

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60),
      s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function setupPlayer(root) {
    var video = root.querySelector("video");
    var frame = root.querySelector(".vplayer__frame");
    var toggle = root.querySelector(".vplayer__toggle");
    var scrub = root.querySelector(".vplayer__scrub");
    var buffer = root.querySelector(".vplayer__buffer");
    var cur = root.querySelector(".vplayer__cur");
    var dur = root.querySelector(".vplayer__dur");
    var mute = root.querySelector(".vplayer__mute");
    var volume = root.querySelector(".vplayer__audio");
    var vol = root.querySelector(".vplayer__vol");
    var fsBtn = root.querySelector(".vplayer__fs");
    if (!video || !frame) return null;
    var hideT = 0;
    var CHROME_HIDE_MS = 2800;
    var dragging = false;
    var scrubDragged = false;
    var scrubReleased = false;
    var scrubStartX = 0;
    var scrubStartY = 0;
    var scrubTapP = 0;
    var SCRUB_DRAG_THRESH = 8;
    var seekAnimating = false;
    var seekAnimRaf = 0;
    var SEEK_ANIM_MS = 240;
    var volDragging = false;
    var volAnimating = false;
    var volAnimRaf = 0;
    var smoothVol = 1;
    var lastVol = 1;
    var VOL_ANIM_MS = 400;
    var smoothP = 0;
    var progressRaf = 0;
    var progressOn = false;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var toggleAnimT = 0;
    var muteAnimT = 0;
    var fsAnimT = 0;

    function fsTarget() {
      return frame;
    }
    function fsActive() {
      var el = fsTarget();
      return document.fullscreenElement === el || document.webkitFullscreenElement === el;
    }
    function exitFs() {
      if (!fsActive()) return;
      var x = document.exitFullscreen || document.webkitExitFullscreen;
      if (x) x.call(document);
    }
    function enterFs() {
      var el = fsTarget();
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) return;
      var p = req.call(el);
      if (p && p.catch) p.catch(function () {});
    }
    function toggleFs() {
      if (fsActive()) exitFs();
      else enterFs();
    }
    function onFsChange() {
      var on = fsActive();
      root.classList.toggle("is-fullscreen", on);
      if (fsBtn) fsBtn.setAttribute("aria-label", on ? "Exit fullscreen" : "Fullscreen");
    }
    function pulseFsAnim() {
      if (!fsBtn || reduceMotion) return;
      fsBtn.classList.add("is-animating");
      window.clearTimeout(fsAnimT);
      fsAnimT = window.setTimeout(function () {
        fsBtn.classList.remove("is-animating");
      }, 440);
    }

    function setVolUI(p) {
      smoothVol = Math.max(0, Math.min(1, p));
      if (!vol) return;
      vol.style.setProperty("--vp-vol", smoothVol.toFixed(4));
      vol.setAttribute("aria-valuenow", Math.round(smoothVol * 100));
    }
    function cancelVolAnim() {
      if (volAnimRaf) cancelAnimationFrame(volAnimRaf);
      volAnimRaf = 0;
      volAnimating = false;
      if (vol) vol.classList.remove("is-animating");
    }
    function animateVolTo(target, onDone) {
      target = Math.max(0, Math.min(1, target));
      cancelVolAnim();
      if (reduceMotion) {
        setVolUI(target);
        if (onDone) onDone();
        return;
      }
      volAnimating = true;
      if (vol) vol.classList.add("is-animating");
      var start = smoothVol;
      var t0 = performance.now();
      function tick(now) {
        var u = Math.min(1, (now - t0) / VOL_ANIM_MS);
        var eased = 1 - Math.pow(1 - u, 3);
        setVolUI(start + (target - start) * eased);
        if (u < 1) {
          volAnimRaf = requestAnimationFrame(tick);
          return;
        }
        setVolUI(target);
        cancelVolAnim();
        if (onDone) onDone();
      }
      volAnimRaf = requestAnimationFrame(tick);
    }
    function syncMuteState() {
      var muted = video.muted || video.volume === 0;
      root.classList.toggle("is-muted", muted);
      if (mute) mute.setAttribute("aria-label", muted ? "Unmute" : "Mute");
    }
    function setVolumeLevel(p, remember) {
      cancelVolAnim();
      p = Math.max(0, Math.min(1, p));
      if (p === 0) {
        if (video.volume > 0 && remember !== false) lastVol = video.volume;
        video.muted = true;
        setVolUI(0);
      } else {
        if (remember !== false) lastVol = p;
        video.muted = false;
        video.volume = p;
        setVolUI(p);
      }
      syncMuteState();
    }

    function setProgress(p) {
      if (!scrub) return;
      p = Math.max(0, Math.min(1, p));
      scrub.style.setProperty("--vp-p", p.toFixed(5));
    }
    function setBuffer(p) {
      if (!scrub) return;
      scrub.style.setProperty("--vp-buffer", Math.max(0, Math.min(1, p)).toFixed(5));
    }
    function targetProgress() {
      var d = video.duration;
      return d && isFinite(d) ? video.currentTime / d : 0;
    }
    function progressTick() {
      if (!progressOn) return;
      if (seekAnimating) {
        progressRaf = requestAnimationFrame(progressTick);
        return;
      }
      var target = targetProgress();
      if (dragging || reduceMotion) {
        smoothP = target;
      } else if (!video.paused) {
        var diff = target - smoothP;
        smoothP += diff * 0.35;
        if (Math.abs(diff) < 0.00006) smoothP = target;
      } else {
        smoothP += (target - smoothP) * 0.55;
        if (Math.abs(target - smoothP) < 0.00006) smoothP = target;
      }
      setProgress(smoothP);
      progressRaf = requestAnimationFrame(progressTick);
    }
    function startProgress() {
      if (progressOn) return;
      progressOn = true;
      progressRaf = requestAnimationFrame(progressTick);
    }
    function stopProgress() {
      progressOn = false;
      if (progressRaf) cancelAnimationFrame(progressRaf);
      progressRaf = 0;
    }
    function pulseToggleAnim() {
      if (!toggle || reduceMotion) return;
      toggle.classList.add("is-animating");
      window.clearTimeout(toggleAnimT);
      toggleAnimT = window.setTimeout(function () {
        toggle.classList.remove("is-animating");
      }, 440);
    }
    function pulseMuteAnim() {
      if (!mute || reduceMotion) return;
      mute.classList.add("is-animating");
      window.clearTimeout(muteAnimT);
      muteAnimT = window.setTimeout(function () {
        mute.classList.remove("is-animating");
      }, 440);
    }

    function showChrome(persist) {
      root.classList.remove("is-idle");
      root.classList.add("is-chrome-visible");
      window.clearTimeout(hideT);
      if (!persist && !video.paused && !dragging && !volDragging && !seekAnimating) {
        hideT = window.setTimeout(function () {
          root.classList.remove("is-chrome-visible");
          root.classList.add("is-idle");
        }, CHROME_HIDE_MS);
      }
    }
    function hideChromeSoon() {
      if (video.paused || dragging || volDragging || seekAnimating) showChrome(true);
      else showChrome(false);
    }

    function playPause() {
      pulseToggleAnim();
      if (video.paused) {
        var pr = video.play();
        if (pr && pr.catch) pr.catch(function () {});
      } else {
        video.pause();
      }
    }
    if (toggle) {
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        playPause();
        showChrome(true);
      });
    }
    frame.addEventListener("click", function (e) {
      if (e.target.closest(".vplayer__close, .vplayer__dock")) return;
      playPause();
      showChrome(true);
    });
    video.addEventListener("play", function () {
      root.classList.add("is-playing");
      if (toggle) toggle.setAttribute("aria-label", "Pause");
      hideChromeSoon();
    });
    video.addEventListener("pause", function () {
      root.classList.remove("is-playing");
      if (toggle) toggle.setAttribute("aria-label", "Play");
      showChrome(true);
    });
    video.addEventListener("ended", function () {
      root.classList.remove("is-playing");
      if (toggle) toggle.setAttribute("aria-label", "Play");
      try {
        video.currentTime = 0;
      } catch (e) {}
      showChrome(true);
    });
    video.addEventListener("timeupdate", function () {
      var d = video.duration || 0;
      if (cur) cur.textContent = fmt(video.currentTime);
      if (scrub && d)
        scrub.setAttribute("aria-valuenow", Math.round((video.currentTime / d) * 100));
    });
    video.addEventListener("progress", function () {
      try {
        if (video.buffered.length && video.duration) {
          setBuffer(video.buffered.end(video.buffered.length - 1) / video.duration);
        }
      } catch (e) {}
    });
    video.addEventListener("loadedmetadata", function () {
      if (dur) dur.textContent = fmt(video.duration);
    });
    video.addEventListener("volumechange", function () {
      if (!video.muted && video.volume > 0) lastVol = video.volume;
      if (!volAnimating && !volDragging) {
        setVolUI(video.muted || video.volume === 0 ? 0 : video.volume);
      }
      syncMuteState();
    });
    if (mute) {
      mute.addEventListener("click", function (e) {
        e.stopPropagation();
        pulseMuteAnim();
        if (video.muted || video.volume === 0) {
          var restore = lastVol > 0 ? lastVol : 1;
          video.muted = false;
          video.volume = restore;
          syncMuteState();
          animateVolTo(restore);
        } else {
          lastVol = video.volume > 0 ? video.volume : lastVol;
          video.muted = true;
          syncMuteState();
          animateVolTo(0);
        }
        showChrome(true);
      });
    }
    function volAt(clientX) {
      if (!vol) return;
      var line = vol.querySelector(".vplayer__vol-line");
      var r = line ? line.getBoundingClientRect() : vol.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      setVolumeLevel(p, true);
    }
    function endVolDrag() {
      volDragging = false;
      if (volume) volume.classList.remove("is-dragging");
      if (vol) vol.classList.remove("is-dragging");
      hideChromeSoon();
    }
    if (vol) {
      setVolUI(video.muted ? 0 : video.volume || 1);
      vol.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        volDragging = true;
        if (volume) volume.classList.add("is-dragging");
        vol.classList.add("is-dragging");
        showChrome(true);
        try {
          vol.setPointerCapture(e.pointerId);
        } catch (x) {}
        volAt(e.clientX);
      });
      vol.addEventListener("pointermove", function (e) {
        if (volDragging) volAt(e.clientX);
      });
      vol.addEventListener("pointerup", endVolDrag);
      vol.addEventListener("pointercancel", endVolDrag);
      vol.addEventListener("lostpointercapture", endVolDrag);
      vol.addEventListener("keydown", function (e) {
        var step = 0.05;
        var v = video.muted ? 0 : video.volume;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          setVolumeLevel(Math.min(1, v + step), true);
          e.preventDefault();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          setVolumeLevel(Math.max(0, v - step), true);
          e.preventDefault();
        }
        showChrome(true);
      });
    }
    if (fsBtn) {
      fsBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        pulseFsAnim();
        toggleFs();
        showChrome(true);
      });
    }
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    function scrubRatio(clientX) {
      if (!scrub) return 0;
      var line = scrub.querySelector(".vplayer__track-line");
      var r = line ? line.getBoundingClientRect() : scrub.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    }
    function cancelSeekAnim() {
      if (seekAnimRaf) cancelAnimationFrame(seekAnimRaf);
      seekAnimRaf = 0;
      seekAnimating = false;
      if (scrub) scrub.classList.remove("is-seeking");
    }
    function applySeek(p) {
      if (!video.duration) return;
      p = Math.max(0, Math.min(1, p));
      try {
        video.currentTime = p * video.duration;
      } catch (e) {}
      smoothP = p;
      setProgress(p);
      if (scrub) scrub.setAttribute("aria-valuenow", Math.round(p * 100));
      if (cur) cur.textContent = fmt(video.currentTime);
    }
    function seekVideoTo(p) {
      if (!video.duration) return;
      p = Math.max(0, Math.min(1, p));
      try {
        video.currentTime = p * video.duration;
      } catch (e) {}
      if (cur) cur.textContent = fmt(video.currentTime);
    }
    function setSeekUI(p) {
      p = Math.max(0, Math.min(1, p));
      smoothP = p;
      setProgress(p);
      if (scrub) scrub.setAttribute("aria-valuenow", Math.round(p * 100));
    }
    function animateSeekTo(p) {
      if (!video.duration) return;
      p = Math.max(0, Math.min(1, p));
      cancelSeekAnim();
      seekVideoTo(p);
      if (reduceMotion) {
        setSeekUI(p);
        hideChromeSoon();
        return;
      }
      seekAnimating = true;
      if (scrub) scrub.classList.add("is-seeking");
      showChrome(true);
      var startP = smoothP;
      var t0 = performance.now();
      function tick(now) {
        var u = Math.min(1, (now - t0) / SEEK_ANIM_MS);
        var eased = 1 - Math.pow(1 - u, 3);
        setSeekUI(startP + (p - startP) * eased);
        if (u < 1) {
          seekAnimRaf = requestAnimationFrame(tick);
          return;
        }
        setSeekUI(p);
        cancelSeekAnim();
        hideChromeSoon();
      }
      seekAnimRaf = requestAnimationFrame(tick);
    }
    function seekAt(clientX) {
      if (!scrub || !video.duration) return;
      cancelSeekAnim();
      applySeek(scrubRatio(clientX));
    }
    function endDrag() {
      dragging = false;
      scrubDragged = false;
      if (scrub) scrub.classList.remove("is-dragging");
      hideChromeSoon();
    }
    function releaseScrub(e) {
      if (scrubReleased) return;
      scrubReleased = true;
      if (dragging && !scrubDragged && video.duration) {
        var p = scrubTapP;
        if (e && e.clientX != null) p = scrubRatio(e.clientX);
        animateSeekTo(p);
      }
      endDrag();
    }
    if (scrub) {
      scrub.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        cancelSeekAnim();
        dragging = true;
        scrubReleased = false;
        scrubDragged = false;
        scrubStartX = e.clientX;
        scrubStartY = e.clientY;
        scrubTapP = scrubRatio(e.clientX);
        showChrome(true);
        scrub.classList.add("is-dragging");
        try {
          scrub.setPointerCapture(e.pointerId);
        } catch (x) {}
      });
      scrub.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        if (!scrubDragged) {
          var dx = e.clientX - scrubStartX;
          var dy = e.clientY - scrubStartY;
          if (dx * dx + dy * dy < SCRUB_DRAG_THRESH * SCRUB_DRAG_THRESH) return;
          scrubDragged = true;
        }
        seekAt(e.clientX);
      });
      scrub.addEventListener("pointerup", releaseScrub);
      scrub.addEventListener("pointercancel", releaseScrub);
      scrub.addEventListener("lostpointercapture", releaseScrub);
      scrub.addEventListener("keydown", function (e) {
        if (!video.duration) return;
        if (e.key === "ArrowRight") {
          animateSeekTo(Math.min(1, (video.currentTime + 5) / video.duration));
          e.preventDefault();
        } else if (e.key === "ArrowLeft") {
          animateSeekTo(Math.max(0, (video.currentTime - 5) / video.duration));
          e.preventDefault();
        }
        showChrome(true);
      });
    }
    frame.addEventListener("pointermove", function () {
      if (root.classList.contains("is-open")) {
        showChrome(!video.paused && !dragging && !volDragging && !seekAnimating);
      }
    });
    frame.addEventListener("pointerleave", function () {
      if (!root.classList.contains("is-ready")) return;
      if (!video.paused && !dragging && !volDragging && !seekAnimating) showChrome(false);
    });

    return {
      prime: function () {
        try {
          video.load();
        } catch (e) {}
        startProgress();
      },
      play: function () {
        showChrome(true);
        startProgress();
        var pr = video.play();
        if (pr && pr.catch) pr.catch(function () {});
      },
      stop: function () {
        window.clearTimeout(hideT);
        window.clearTimeout(toggleAnimT);
        window.clearTimeout(muteAnimT);
        window.clearTimeout(fsAnimT);
        cancelVolAnim();
        cancelSeekAnim();
        exitFs();
        stopProgress();
        try {
          video.pause();
          video.currentTime = 0;
        } catch (e) {}
        video.muted = false;
        video.volume = 1;
        lastVol = 1;
        smoothVol = 1;
        setVolUI(1);
        smoothP = 0;
        setProgress(0);
        setBuffer(0);
        if (cur) cur.textContent = "0:00";
        if (dur) dur.textContent = "0:00";
        if (scrub) {
          scrub.classList.remove("is-dragging");
          scrub.setAttribute("aria-valuenow", "0");
        }
        dragging = false;
        if (toggle) toggle.classList.remove("is-animating");
        if (mute) {
          mute.classList.remove("is-animating");
          mute.setAttribute("aria-label", "Mute");
        }
        if (fsBtn) {
          fsBtn.classList.remove("is-animating");
          fsBtn.setAttribute("aria-label", "Fullscreen");
        }
        if (volume) volume.classList.remove("is-dragging");
        if (vol) vol.classList.remove("is-dragging");
        volDragging = false;
        root.classList.remove(
          "is-playing",
          "is-muted",
          "is-fullscreen",
          "is-chrome-visible",
          "is-idle",
        );
        if (toggle) toggle.setAttribute("aria-label", "Play");
      },
    };
  }

  function openNativePlayer(root) {
    var srcVideo = root.querySelector(".vplayer__video");
    var srcUrl = "";
    if (srcVideo) {
      var s = srcVideo.querySelector("source");
      srcUrl = (s && s.src) || srcVideo.currentSrc || "";
    }
    if (!srcUrl) return;

    var prior = document.querySelector(".vplayer-native");
    if (prior) prior.remove();

    var shell = document.createElement("div");
    shell.className = "vplayer-native";
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "true");
    shell.setAttribute("aria-label", "Video");

    var v = document.createElement("video");
    v.className = "vplayer-native__video";
    v.src = srcUrl;
    v.controls = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.preload = "auto";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "vplayer-native__close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "\u00d7";

    shell.appendChild(v);
    shell.appendChild(closeBtn);
    document.body.appendChild(shell);
    document.documentElement.style.overflow = "hidden";

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch (e) {}
      shell.remove();
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape" || e.keyCode === 27) close();
    }

    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      close();
    });
    v.addEventListener("ended", close);
    document.addEventListener("keydown", onKey);

    var pr = v.play();
    if (pr && pr.catch) pr.catch(function () {});
  }

  function openDialog(root, api) {
    if (root.classList.contains("is-active")) return;
    window.clearTimeout(openT);
    window.clearTimeout(closeT);
    root.classList.remove(
      "is-open",
      "is-closing",
      "is-ready",
      "is-playing",
      "is-chrome-visible",
      "is-idle",
    );
    root.classList.add("is-active");
    root.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    if (api) api.prime();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add("is-open", "is-chrome-visible");
        root.classList.remove("is-idle");
      });
    });
    openT = window.setTimeout(function () {
      root.classList.add("is-ready");
      if (api) api.play();
    }, MODAL_MS);
  }

  function closeDialog(root, api) {
    if (!root.classList.contains("is-active")) return;
    window.clearTimeout(openT);
    window.clearTimeout(closeT);
    if (api) api.stop();
    root.classList.remove("is-open", "is-ready", "is-playing", "is-chrome-visible", "is-idle");
    root.classList.add("is-closing");
    closeT = window.setTimeout(function () {
      root.classList.remove("is-active", "is-closing");
      root.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = "";
    }, MODAL_MS);
  }

  openers.forEach(function (btn) {
    var root = document.getElementById(btn.getAttribute("data-video-open"));
    if (!root) return;
    if (!siteDesktopMq.matches) {
      btn.addEventListener("click", function () {
        openNativePlayer(root);
      });
      return;
    }
    var api = setupPlayer(root);
    btn.addEventListener("click", function () {
      openDialog(root, api);
    });
    Array.prototype.slice.call(root.querySelectorAll("[data-vplayer-close]")).forEach(function (c) {
      c.addEventListener("click", function (e) {
        e.stopPropagation();
        closeDialog(root, api);
      });
    });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.keyCode === 27) && root.classList.contains("is-active")) {
        closeDialog(root, api);
      }
      if (e.key === " " && root.classList.contains("is-open")) {
        var scrubEl = root.querySelector(".vplayer__scrub");
        if (scrubEl && document.activeElement === scrubEl) return;
        var volEl = root.querySelector(".vplayer__vol");
        if (volEl && document.activeElement === volEl) return;
        e.preventDefault();
        var v = root.querySelector("video");
        if (!v) return;
        if (v.paused) {
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else v.pause();
      }
      if ((e.key === "f" || e.key === "F") && root.classList.contains("is-open")) {
        var fs = root.querySelector(".vplayer__fs");
        if (fs) {
          fs.click();
          e.preventDefault();
        }
      }
    });
  });
})();

(function () {
  var section = document.getElementById("output");
  if (!section) return;
  var shell = section.querySelector(".osc-shell");
  var v = section.querySelector(".osc__vid");
  if (!shell || !v) return;
  var capGF = section.querySelector(".osc-cap--gf");
  var capTF = section.querySelector(".osc-cap--tf");
  var compare = section.querySelector(".osc-compare");
  var media = section.querySelector(".osc-media");
  var mobileMq = window.matchMedia("(max-width: 560px)");

  var isAndroid = false;
  var EXTRACT_FPS = 5;
  var FRAME_COUNT = 128;
  var FRAME_BASE = "assets/metrofab/frames/f_";
  var frames = [],
    canvas = null,
    ctx = null;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var T_START = 0.87;
  var T_END = 39.8;
  var SPLIT = 0.5;

  function vh() {
    return window.innerHeight || document.documentElement.clientHeight;
  }
  function inView() {
    var r = section.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh();
  }
  function progress() {
    var vp = vh();
    if (mobileMq.matches && media) {
      var m = media.getBoundingClientRect();
      var startTop = vp - m.height - vp * 0.1;
      var endTop = vp * 0.2;
      var span = startTop - endTop;
      if (span < 48) return Math.min(1, Math.max(0, 1 - m.top / Math.max(vp, 1)));
      return Math.min(1, Math.max(0, (startTop - m.top) / span));
    }
    var total = shell.offsetHeight - vp;
    if (total < 48) return 0;
    var lead = vp * 0.12;
    return Math.min(1, Math.max(0, (lead - shell.getBoundingClientRect().top) / (total + lead)));
  }
  function timeForProgress(p) {
    var end = v.duration && !isNaN(v.duration) ? Math.min(T_END, v.duration - 0.05) : T_END;
    var start = T_START;

    var p0 = 0,
      t0 = start;
    var p1 = 0.3,
      t1 = start + (end - start) * 0.28;
    var p2 = 0.7,
      t2 = start + (end - start) * 0.8;
    var p3 = 1.0,
      t3 = end;

    if (p < p1) {
      var f = (p - p0) / (p1 - p0);
      f = Math.sin((f * Math.PI) / 2);
      return t0 + f * (t1 - t0);
    } else if (p < p2) {
      var f = (p - p1) / (p2 - p1);
      return t1 + f * (t2 - t1);
    } else {
      var f = (p - p2) / (p3 - p2);
      f = 1 - Math.cos((f * Math.PI) / 2);
      return t2 + f * (t3 - t2);
    }
  }

  function seek(t) {
    v.dataset.seek = String(t);
    if (!v.duration || isNaN(v.duration)) return;
    var target = parseFloat(v.dataset.seek);
    if (isNaN(target) || Math.abs(v.currentTime - target) <= 0.03) return;
    if (v.dataset.seeking === "1") return;
    v.dataset.seeking = "1";
    v.addEventListener(
      "seeked",
      function onSeeked() {
        v.dataset.seeking = "0";
        var next = parseFloat(v.dataset.seek);
        if (!isNaN(next) && Math.abs(v.currentTime - next) > 0.03) seek(next);
      },
      { once: true },
    );
    try {
      v.currentTime = target;
    } catch (e) {
      v.dataset.seeking = "0";
    }
  }

  function pad3(n) {
    n = String(n);
    while (n.length < 3) n = "0" + n;
    return n;
  }
  function drawFrameForTime(t) {
    if (!ctx) return;
    var idx = Math.round(t * EXTRACT_FPS);
    if (idx < 0) idx = 0;
    else if (idx > FRAME_COUNT - 1) idx = FRAME_COUNT - 1;
    var img = frames[idx];

    if (!(img && img.complete && img.naturalWidth)) {
      for (var d = 1; d < FRAME_COUNT; d++) {
        var a = frames[idx - d],
          b = frames[idx + d];
        if (a && a.complete && a.naturalWidth) {
          img = a;
          break;
        }
        if (b && b.complete && b.naturalWidth) {
          img = b;
          break;
        }
      }
    }
    if (img && img.complete && img.naturalWidth)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  function redraw() {
    if (inView()) drawFrameForTime(timeForProgress(cur));
  }
  function setupCanvas() {
    canvas = document.createElement("canvas");
    canvas.className = "osc__canvas";
    canvas.width = 1280;
    canvas.height = 720;
    ctx = canvas.getContext("2d");
    media.insertBefore(canvas, media.firstChild);
    media.classList.add("is-frames");

    var src = v.querySelector("source");
    if (src) src.removeAttribute("src");
    v.removeAttribute("poster");
    try {
      v.load();
    } catch (e) {}
  }
  function preloadFrames() {
    if (frames.length) return;
    for (var i = 0; i < FRAME_COUNT; i++) {
      var img = new Image();
      img.decoding = "async";
      img.addEventListener("load", redraw, { once: true });
      img.src = FRAME_BASE + pad3(i) + ".webp";
      frames[i] = img;
    }
  }
  function setIn(el, on) {
    if (!el) return;
    if (on) el.classList.remove("is-snap");
    el.classList.toggle("is-in", on);
  }
  function snapHide(el) {
    if (el) {
      el.classList.add("is-snap");
      el.classList.remove("is-in");
    }
  }
  function apply(p) {
    if (isAndroid) drawFrameForTime(timeForProgress(p));
    else seek(timeForProgress(p));

    var gfOn = p >= 0.1 && p <= 0.45;
    var tfOn = p >= 0.45 && p <= 0.85;
    var compareOn = p >= 0.72;

    if (gfOn) snapHide(capTF);
    else if (tfOn) snapHide(capGF);
    setIn(capGF, gfOn);
    setIn(capTF, tfOn);
    setIn(compare, compareOn);
  }

  var primed = false;
  function prime(cb) {
    if (primed) {
      if (cb) cb();
      return;
    }
    var done = function () {
      primed = true;
      v.pause();
      try {
        if (v.currentTime > 0.02) v.currentTime = 0;
      } catch (e) {}
      if (cb) cb();
    };
    var pr = v.play();
    if (pr && pr.then)
      pr.then(done).catch(function () {
        v.addEventListener("loadeddata", done, { once: true });
        v.load();
      });
    else done();
  }

  var target = 0,
    cur = 0;

  if (isAndroid) setupCanvas();
  v.addEventListener("loadedmetadata", function () {
    apply(cur);
  });
  window.addEventListener(
    "scroll",
    function () {
      target = progress();
    },
    { passive: true },
  );
  window.addEventListener("resize", function () {
    target = progress();
  });
  target = cur = progress();

  function start() {
    if (isAndroid) {
      preloadFrames();
      redraw();
    } else {
      prime(function () {
        apply(cur);
      });
    }
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          start();
          io.disconnect();
        });
      },
      { rootMargin: "25% 0px 25% 0px" },
    );
    io.observe(section);
  } else {
    start();
  }

  if (!isAndroid) {
    var gesturePrime = function () {
      prime(function () {
        apply(cur);
      });
    };
    document.addEventListener("touchstart", gesturePrime, { once: true, passive: true });
    document.addEventListener("pointerdown", gesturePrime, { once: true, passive: true });
  }

  if (reduced) {
    window.addEventListener(
      "scroll",
      function () {
        cur = progress();
        apply(cur);
      },
      { passive: true },
    );
    apply(progress());
  } else {
    (function loop() {
      var d = target - cur;

      cur += d * 0.055;
      if (inView()) apply(cur);
      requestAnimationFrame(loop);
    })();
  }
})();

(function () {
  var pinkStations = [
    "Majlis Park",
    "Azadpur",
    "Netaji Subash Place",
    "Rajouri Garden",
    "South Campus",
    "INA",
    "Lajpat Nagar",
    "Mayur Vihar-I",
    "Anand Vihar",
    "Karkarduma",
    "Welcome",
    "Shiv Vihar",
  ];
  var bookedTickets = [];

  var walletTrigger = document.getElementById("wallet-trigger");
  var walletDropdown = document.getElementById("wallet-dropdown");

  if (walletTrigger && walletDropdown) {
    walletTrigger.addEventListener("click", function (e) {
      e.stopPropagation();
      walletDropdown.classList.toggle("is-active");
    });

    document.addEventListener("click", function (e) {
      if (!walletDropdown.contains(e.target) && e.target !== walletTrigger) {
        walletDropdown.classList.remove("is-active");
      }
    });
  }

  function saveBookedTicket(ticketObj) {
    bookedTickets.push(ticketObj);

    var countSpan = walletTrigger ? walletTrigger.querySelector("span") : null;
    if (countSpan) {
      countSpan.textContent = "Passes (" + bookedTickets.length + ")";
    }

    if (walletDropdown) {
      if (bookedTickets.length === 0) {
        walletDropdown.innerHTML = '<div class="wallet-empty">No active passes</div>';
      } else {
        walletDropdown.innerHTML = "";
        bookedTickets.forEach(function (t, idx) {
          var item = document.createElement("div");
          item.className = "wallet-item";
          item.setAttribute("data-idx", idx);

          var meta = document.createElement("div");
          meta.className = "wallet-item-meta";

          var name = document.createElement("span");
          name.className = "wallet-item-name";
          name.textContent = t.passenger.toUpperCase();

          var route = document.createElement("span");
          route.className = "wallet-item-route";
          route.textContent = "CAS ⇄ " + t.destination.substring(0, 3).toUpperCase();

          meta.appendChild(name);
          meta.appendChild(route);

          var typeBadge = document.createElement("span");
          var tLower = t.type.toLowerCase();
          typeBadge.className =
            "wallet-item-type " +
            (tLower.indexOf("sky") !== -1
              ? "sky"
              : tLower.indexOf("ocean") !== -1
                ? "ocean"
                : "land");
          typeBadge.textContent = t.type;

          item.appendChild(meta);
          item.appendChild(typeBadge);

          item.addEventListener("click", function () {
            triggerFlyingTicket(t.destination, t.passenger, t.type, t.platform);
            updateLeftTicketDisplay(t.destination, t.passenger, t.type, t.platform);
            walletDropdown.classList.remove("is-active");
          });

          walletDropdown.appendChild(item);
        });
      }
    }
  }

  function appendChatMessage(sender, text, isHtml, ticketData) {
    if (!chatHistory) return;
    var msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg " + (sender === "user" ? "chat-msg--user" : "chat-msg--assistant");

    var avatarDiv = document.createElement("div");
    avatarDiv.className = "chat-msg__avatar";
    avatarDiv.textContent = sender === "user" ? "YOU" : "AI";

    var bodyDiv = document.createElement("div");
    bodyDiv.className = "chat-msg__body";
    if (isHtml) {
      bodyDiv.innerHTML = text;
    } else {
      var lines = text.split("\n");
      var htmlContent = "";
      lines.forEach(function (line) {
        if (line.trim()) {
          htmlContent += "<p>" + escapeHtml(line) + "</p>";
        }
      });
      bodyDiv.innerHTML = htmlContent;
    }

    if (ticketData) {
      var inlineCard = document.createElement("div");
      inlineCard.className = "inline-ticket-card";

      var dest = ticketData.destination;
      var typeUpper = ticketData.type.toUpperCase();

      inlineCard.innerHTML =
        '<div class="inline-ticket-hdr">' +
        '<span class="inline-ticket-title">BOARDING PASS ISSUED</span>' +
        '<span class="inline-ticket-type">' +
        typeUpper +
        "</span>" +
        "</div>" +
        '<div class="inline-ticket-body">' +
        '<div class="inline-ticket-row">' +
        '<span class="inline-label">PASSENGER:</span>' +
        '<span class="inline-val">' +
        escapeHtml(ticketData.passenger.toUpperCase()) +
        "</span>" +
        "</div>" +
        '<div class="inline-ticket-row">' +
        '<span class="inline-label">DESTINATION:</span>' +
        '<span class="inline-val">' +
        escapeHtml(dest.toUpperCase()) +
        "</span>" +
        "</div>" +
        '<div class="inline-ticket-row">' +
        '<span class="inline-label">PLATFORM:</span>' +
        '<span class="inline-val">' +
        escapeHtml(ticketData.platform) +
        "</span>" +
        "</div>" +
        "</div>" +
        '<button class="inline-ticket-view-btn" type="button">VIEW FULL TICKET</button>';

      inlineCard.querySelector(".inline-ticket-view-btn").addEventListener("click", function () {
        triggerFlyingTicket(
          ticketData.destination,
          ticketData.passenger,
          ticketData.type,
          ticketData.platform,
        );
      });

      bodyDiv.appendChild(inlineCard);
    }

    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(bodyDiv);
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  var transitModal = document.getElementById("transit-feature-modal");
  var modalTitle = document.getElementById("modal-feature-title");
  var modalBody = document.getElementById("modal-feature-body");
  var modalClose = document.getElementById("modal-close-trigger");

  function openFeatureModal(title, htmlContent) {
    if (!transitModal || !modalTitle || !modalBody) return;
    modalTitle.textContent = title;
    modalBody.innerHTML = htmlContent;
    transitModal.classList.add("is-active");
    transitModal.setAttribute("aria-hidden", "false");
  }

  function closeFeatureModal() {
    if (!transitModal) return;
    transitModal.classList.remove("is-active");
    transitModal.setAttribute("aria-hidden", "true");
  }

  if (modalClose) {
    modalClose.addEventListener("click", closeFeatureModal);
  }

  var modalBackdrop = transitModal ? transitModal.querySelector(".transit-modal__backdrop") : null;
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", closeFeatureModal);
  }

  if (transitModal) {
    document.addEventListener("keydown", function (e) {
      if (!transitModal.classList.contains("is-active")) return;

      if (e.key === "Escape" || e.keyCode === 27) {
        closeFeatureModal();
        return;
      }

      if (e.key !== "Tab" && e.keyCode !== 9) return;

      var focusables = transitModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  (function initStationStories() {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var STORIES = {
      "MAJLIS PARK": {
        district: "Northern Gateway",
        opened: "2031",
        footfall: "84,000",
        architecture:
          "A cantilevered timber canopy folds over the concourse, cut with 400 skylights that track the sun across the platform floor.",
        mural:
          "“First Light” — a 60-metre ceramic relief by Ira Sahni, fired in the kiln district it replaced.",
        chime: "A rising major third, soft-struck. The sound of a day beginning.",
        notes: [523.25, 659.25],
      },
      AZADPUR: {
        district: "Market Quarter",
        opened: "2031",
        footfall: "142,000",
        architecture:
          "Built inside the shell of the old wholesale fruit market. The original iron trusses were left rusted and sealed under resin.",
        mural:
          "“Weights & Measures” — brass scales suspended in the atrium, one for every trader displaced by construction.",
        chime: "Four notes, descending, like a vendor's call at closing.",
        notes: [659.25, 587.33, 523.25, 440.0],
      },
      "NETAJI SUBASH": {
        district: "Civic Spine",
        opened: "2032",
        footfall: "196,000",
        architecture:
          "The deepest station on the line. A single helical stair wraps a 40-metre light well down to the platforms.",
        mural:
          "“Descent” — fibre-optic strands trace the stair's curve, brightening as trains approach.",
        chime:
          "A low drone that resolves upward. Passengers describe it as 'the building exhaling'.",
        notes: [329.63, 392.0, 493.88],
      },
      "RAJOURI GDN": {
        district: "Garden Terraces",
        opened: "2033",
        footfall: "118,000",
        architecture:
          "Biophilic. Nine tiers of planted terrace step down to the tracks; the platform runs 4°C cooler than the street above.",
        mural:
          "Living. A vertical meadow of 22,000 native plants, re-seeded each spring by the district's schoolchildren.",
        chime: "Birdsong, sampled at dawn from the gardens, pitched to a perfect fifth.",
        notes: [587.33, 880.0],
      },
      "SOUTH CAMPUS": {
        district: "Learning Quarter",
        opened: "2033",
        footfall: "97,000",
        architecture:
          "Platform walls are a continuous chalkboard. Anyone may write; nothing is erased until the last train Sunday.",
        mural: "Authored nightly by strangers. The only artwork on the network with no signature.",
        chime: "A single struck note, allowed to decay fully. Silence is part of it.",
        notes: [440.0],
      },
      INA: {
        district: "Diplomatic Row",
        opened: "2032",
        footfall: "76,000",
        architecture:
          "Polished basalt and hand-set glass mosaic. The most restrained station on the line, and the most expensive.",
        mural:
          "“Accord” — 193 glass tesserae, one per nation, arranged so no colour touches its own kind.",
        chime: "Two notes, a perfect fourth apart. Neutral by design.",
        notes: [523.25, 698.46],
      },
      "LAJPAT NGR": {
        district: "Textile Bazaar",
        opened: "2034",
        footfall: "155,000",
        architecture:
          "Suspended fabric baffles — 3,000 metres of dyed cotton — soften the acoustics and shift colour by season.",
        mural:
          "“Warp and Weft” — the platform floor is a woven pattern in inlaid stone, drawn from a shawl in the district museum.",
        chime: "A shuttle-loom rhythm, tuned and slowed until it becomes melody.",
        notes: [493.88, 587.33, 493.88, 392.0],
      },
      "MAYUR VIHAR-I": {
        district: "Riverside",
        opened: "2034",
        footfall: "89,000",
        architecture:
          "The only above-ground station. A glass tube bridges the floodplain; at high water the train appears to run on the river itself.",
        mural: "“Monsoon” — the ceiling floods with projected rain when the real rain begins.",
        chime: "Water on stone, resolved into three falling notes.",
        notes: [698.46, 587.33, 493.88],
      },
      "ANAND VIHAR": {
        district: "Interchange",
        opened: "2032",
        footfall: "241,000",
        architecture:
          "The network's busiest node. Four lines converge in a single elliptical hall with no columns — a 90-metre clear span.",
        mural:
          "“Confluence” — a kinetic ceiling of 12,000 anodised discs that ripple with the crowd's movement below.",
        chime: "Deliberately plain. A station this loud needs a sound that cuts, not charms.",
        notes: [880.0, 880.0],
      },
      KARKARDUMA: {
        district: "Judicial Quarter",
        opened: "2035",
        footfall: "68,000",
        architecture:
          "Board-marked concrete, lit from a single clerestory. Severe, symmetrical, and quiet enough to hear the escalators.",
        mural:
          "“Due Process” — a slow-scrolling LED frieze reciting the network's passenger charter, front to back, in 14 hours.",
        chime: "A gavel's pitch, softened. Two strikes, evenly spaced.",
        notes: [392.0, 392.0],
      },
      WELCOME: {
        district: "Arrival District",
        opened: "2035",
        footfall: "103,000",
        architecture:
          "Named before it was designed. Every surface angles toward the exit stair — the station is built to release you.",
        mural:
          "“Welcome” — the word, in 89 scripts, cut through backlit brass across the full length of the platform.",
        chime: "An open major chord. The warmest sound on the line.",
        notes: [523.25, 659.25, 783.99],
      },
      "SHIV VIHAR": {
        district: "Eastern Terminus",
        opened: "2036",
        footfall: "61,000",
        architecture:
          "The end of the line. The tunnel simply stops, sealed with a polished steel disc that reflects the whole platform back.",
        mural: "“Terminus” — nothing is painted here. The mirror is the work.",
        chime: "A single low note, held. Then nothing.",
        notes: [261.63],
      },
    };

    var storyAudioCtx = null;

    function playChime(notes) {
      try {
        if (!storyAudioCtx) {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          storyAudioCtx = new Ctx();
        }
        var ctx = storyAudioCtx;
        if (ctx.state === "suspended") ctx.resume();

        notes.forEach(function (freq, i) {
          var t0 = ctx.currentTime + i * 0.26;
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t0);

          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 1.2);
        });
      } catch (e) {
        console.warn("Chime playback unavailable", e);
      }
    }

    function storyMarkup(name, s) {
      return (
        "" +
        '<div class="station-story">' +
        '<div class="station-story__meta">' +
        '<div class="station-story__meta-item">' +
        '<span class="station-story__meta-label">District</span>' +
        "<strong>" +
        escapeHtml(s.district) +
        "</strong>" +
        "</div>" +
        '<div class="station-story__meta-item">' +
        '<span class="station-story__meta-label">Opened</span>' +
        "<strong>" +
        escapeHtml(s.opened) +
        "</strong>" +
        "</div>" +
        '<div class="station-story__meta-item">' +
        '<span class="station-story__meta-label">Daily Footfall</span>' +
        "<strong>" +
        escapeHtml(s.footfall) +
        "</strong>" +
        "</div>" +
        "</div>" +
        '<div class="station-story__field">' +
        '<span class="station-story__label">Architecture</span>' +
        "<p>" +
        escapeHtml(s.architecture) +
        "</p>" +
        "</div>" +
        '<div class="station-story__field">' +
        '<span class="station-story__label">On the concourse</span>' +
        "<p>" +
        escapeHtml(s.mural) +
        "</p>" +
        "</div>" +
        '<div class="station-story__field">' +
        '<span class="station-story__label">Platform chime</span>' +
        "<p>" +
        escapeHtml(s.chime) +
        "</p>" +
        '<button type="button" class="station-story__chime" id="station-chime-btn">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
        '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
        "</svg>" +
        "<span>Play chime</span>" +
        "</button>" +
        "</div>" +
        "</div>"
      );
    }

    var lastFocused = null;

    function openStory(name) {
      var s = STORIES[name];
      if (!s) return;
      lastFocused = document.activeElement;
      openFeatureModal(name, storyMarkup(name, s));

      var btn = document.getElementById("station-chime-btn");
      if (btn) {
        btn.addEventListener("click", function () {
          playChime(s.notes);
        });

        if (!reduced)
          setTimeout(function () {
            playChime(s.notes);
          }, 260);
      }
      if (modalClose) modalClose.focus();
    }

    var track = document.getElementById("pink-line-track-nodes");
    if (!track) return;

    track.addEventListener("click", function (e) {
      var node = e.target.closest ? e.target.closest(".pink-station") : null;
      if (!node) return;
      var name = node.getAttribute("data-station");
      if (name) openStory(name.toUpperCase());
    });

    if (transitModal) {
      transitModal.addEventListener("transitionend", function () {
        if (!transitModal.classList.contains("is-active") && lastFocused) {
          lastFocused.focus();
          lastFocused = null;
        }
      });
    }
  })();

  var plannerForm = document.getElementById("journey-planner-form");
  if (plannerForm) {
    plannerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var fromSel = document.getElementById("journey-from-station");
      var toSel = document.getElementById("journey-to-station");
      if (!fromSel || !toSel) return;

      var fromSt = fromSel.value;
      var toSt = toSel.value;

      if (fromSt === toSt) {
        alert("Origin and Destination stations cannot be the same!");
        return;
      }

      var idxA = pinkStations
        .map(function (s) {
          return s.toUpperCase();
        })
        .indexOf(fromSt);
      var idxB = pinkStations
        .map(function (s) {
          return s.toUpperCase();
        })
        .indexOf(toSt);

      var path = [];
      if (idxA < idxB) {
        path = pinkStations.slice(idxA, idxB + 1);
      } else {
        path = pinkStations.slice(idxB, idxA + 1).reverse();
      }

      var numStops = path.length - 1;
      var fare = 10 + numStops * 5;
      var travelTime = numStops * 2.2;
      var eta = Math.ceil(travelTime);

      var modalHtml =
        '<div class="ai-modal-layout">' +
        '<p class="ai-modal-desc font-mono">METROFAB AI CORE // ROUTING COMPLETED</p>' +
        '<div style="background:#111115; border:1px solid rgba(255,255,255,0.05); padding:20px; display:flex; flex-direction:column; gap:12px;">' +
        '<div style="display:flex; justify-content:space-between; font-size:14px;">' +
        "<span>Route:</span>" +
        '<strong style="color:#00f0ff;">' +
        fromSt +
        " ⇄ " +
        toSt +
        "</strong>" +
        "</div>" +
        '<div style="display:flex; justify-content:space-between; font-size:14px;">' +
        "<span>Stations:</span>" +
        "<strong>" +
        numStops +
        " Stops</strong>" +
        "</div>" +
        '<div style="display:flex; justify-content:space-between; font-size:14px;">' +
        "<span>Estimated Fare:</span>" +
        '<strong style="color:#eab308;">₹' +
        fare +
        "</strong>" +
        "</div>" +
        '<div style="display:flex; justify-content:space-between; font-size:14px;">' +
        "<span>Travel Time:</span>" +
        "<strong>" +
        eta +
        " Minutes</strong>" +
        "</div>" +
        "</div>" +
        '<div style="display:flex; flex-direction:column; gap:6px;">' +
        '<label class="font-mono" style="font-size:11px; color:rgba(255,255,255,0.4);">PASSENGER NAME</label>' +
        '<input type="text" id="booking-passenger-name" class="ai-modal-input" placeholder="Enter passenger name" value="EDITH" />' +
        "</div>" +
        '<button type="button" class="ai-modal-btn" id="confirm-booking-btn">CONFIRM AND GENERATE PASS</button>' +
        "</div>";

      openFeatureModal("Journey Plan & Fare", modalHtml);

      var confirmBtn = document.getElementById("confirm-booking-btn");
      if (confirmBtn) {
        confirmBtn.addEventListener("click", function () {
          var passengerInput = document.getElementById("booking-passenger-name");
          var passenger = passengerInput ? passengerInput.value.trim() : "EDITH";
          if (!passenger) passenger = "EDITH";

          closeFeatureModal();
          updateMascotText("Boarding pass compiled successfully for " + passenger + "!");

          var ticketObj = {
            destination: toSt,
            passenger: passenger,
            type: "Pink-Line Express",
            platform: "Platform " + (Math.floor(Math.random() * 4) + 1),
          };

          saveBookedTicket(ticketObj);
          updateLeftTicketDisplay(toSt, passenger, "Pink-Line Express", ticketObj.platform);
          triggerFlyingTicket(toSt, passenger, "Pink-Line Express", ticketObj.platform);
        });
      }
    });
  }

  var featureCards = document.querySelectorAll(".feature-card");
  featureCards.forEach(function (card) {
    card.addEventListener("click", function () {
      var feature = card.getAttribute("data-feature");
      if (!feature) return;

      var title = card.querySelector(".feature-card__title").textContent.replace("NEW", "").trim();
      var contentHtml = "";

      if (feature === "fare-calculator") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">Select stations to estimate the fare using real-time coordinates.</p>' +
          '<div class="ai-modal-input-group">' +
          "<label>FROM STATION</label>" +
          '<select id="fc-from" class="ai-modal-input">' +
          pinkStations
            .map(function (s) {
              return '<option value="' + s.toUpperCase() + '">' + s + "</option>";
            })
            .join("") +
          "</select>" +
          "</div>" +
          '<div class="ai-modal-input-group">' +
          "<label>TO STATION</label>" +
          '<select id="fc-to" class="ai-modal-input">' +
          pinkStations
            .slice()
            .reverse()
            .map(function (s) {
              return '<option value="' + s.toUpperCase() + '">' + s + "</option>";
            })
            .join("") +
          "</select>" +
          "</div>" +
          '<button type="button" class="ai-modal-btn" id="run-fc-calc">RUN FARE ESTIMATOR</button>' +
          '<div id="fc-results" class="ai-modal-result"></div>' +
          "</div>";
      } else if (feature === "ncmc") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">Verify balance, register card, and configure AI-predicted auto-topups.</p>' +
          '<div style="background:#111115; border:1px solid rgba(255,255,255,0.05); padding:16px; display:flex; justify-content:space-between; align-items:center;">' +
          "<div>" +
          '<span style="font-size:12px; color:rgba(255,255,255,0.4); display:block; letter-spacing:0.05em;">ACTIVE SERIAL</span>' +
          '<strong style="font-size:12px; color:#fff;" id="ncmc-serial-val">NCMC-883921-IN</strong>' +
          "</div>" +
          '<div style="text-align:right;">' +
          '<span style="font-size:12px; color:rgba(255,255,255,0.4); display:block; letter-spacing:0.05em;">CARD BALANCE</span>' +
          '<strong style="font-size:16px; color:#00f0ff;" id="ncmc-balance-val">₹350.00</strong>' +
          "</div>" +
          "</div>" +
          '<div class="ai-modal-input-group">' +
          "<label>REGISTER NEW CARD</label>" +
          '<input type="text" id="ncmc-register-input" class="ai-modal-input" placeholder="Enter NCMC Card Serial Number" />' +
          "</div>" +
          '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">' +
          '<button type="button" class="ai-modal-btn" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff;" id="ncmc-topup-btn">AUTO TOPUP (₹100)</button>' +
          '<button type="button" class="ai-modal-btn" id="ncmc-register-btn">REGISTER CARD</button>' +
          "</div>" +
          '<div id="ncmc-log" class="ai-modal-result font-mono" style="font-size:13px; color:#00e66e; text-align:center;"></div>' +
          "</div>";
      } else if (feature === "train-time") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">Query first and last train timetables for interchange hub stations.</p>' +
          '<div class="ai-modal-input-group">' +
          "<label>SELECT STATION</label>" +
          '<select id="tt-station" class="ai-modal-input">' +
          pinkStations
            .map(function (s) {
              return '<option value="' + s.toUpperCase() + '">' + s + "</option>";
            })
            .join("") +
          "</select>" +
          "</div>" +
          '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:8px;">' +
          '<div style="background:#111115; border:1px solid rgba(255,255,255,0.05); padding:16px;">' +
          '<span style="font-size:12px; color:rgba(255,255,255,0.4); display:block; margin-bottom:6px;">MAJLIS PARK BOUND</span>' +
          '<div style="font-size:14px; color:#fff; display:flex; flex-direction:column; gap:4px;">' +
          "<span>First Train: <strong>06:00 AM</strong></span>" +
          "<span>Last Train: <strong>11:00 PM</strong></span>" +
          "</div>" +
          "</div>" +
          '<div style="background:#111115; border:1px solid rgba(255,255,255,0.05); padding:16px;">' +
          '<span style="font-size:12px; color:rgba(255,255,255,0.4); display:block; margin-bottom:6px;">SHIV VIHAR BOUND</span>' +
          '<div style="font-size:14px; color:#fff; display:flex; flex-direction:column; gap:4px;">' +
          "<span>First Train: <strong>06:15 AM</strong></span>" +
          "<span>Last Train: <strong>11:10 PM</strong></span>" +
          "</div>" +
          "</div>" +
          "</div>" +
          '<div id="tt-log" class="ai-modal-result font-mono" style="font-size:13px; color:rgba(255,255,255,0.4); text-align:center;">AI Core queries completed.</div>' +
          "</div>";
      } else if (feature === "tickets") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">Compile dynamic QR single journey tickets using AI-validated encryption keys.</p>' +
          '<div class="ai-modal-input-group">' +
          "<label>FROM STATION</label>" +
          '<select id="t-from" class="ai-modal-input">' +
          pinkStations
            .map(function (s) {
              return '<option value="' + s.toUpperCase() + '">' + s + "</option>";
            })
            .join("") +
          "</select>" +
          "</div>" +
          '<div class="ai-modal-input-group">' +
          "<label>TO STATION</label>" +
          '<select id="t-to" class="ai-modal-input">' +
          pinkStations
            .slice()
            .reverse()
            .map(function (s) {
              return '<option value="' + s.toUpperCase() + '">' + s + "</option>";
            })
            .join("") +
          "</select>" +
          "</div>" +
          '<div class="ai-modal-input-group">' +
          "<label>PASSENGER NAME</label>" +
          '<input type="text" id="t-passenger" class="ai-modal-input" placeholder="Enter Passenger Name" value="EDITH" />' +
          "</div>" +
          '<button type="button" class="ai-modal-btn" id="generate-qr-ticket-btn">COMPILE QR PASS (AI SECURE)</button>' +
          '<div id="qr-results" class="ai-modal-result"></div>' +
          "</div>";
      } else if (feature === "tour-guide") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">Explore local landmarks and points of interest around Delhi Metro interchange stations.</p>' +
          '<div class="ai-modal-input-group">' +
          "<label>SELECT STATION</label>" +
          '<select id="tg-station" class="ai-modal-input">' +
          pinkStations
            .map(function (s) {
              return '<option value="' + s.toUpperCase() + '">' + s + "</option>";
            })
            .join("") +
          "</select>" +
          "</div>" +
          '<button type="button" class="ai-modal-btn" id="run-tg-query">GENERATE TOUR GUIDE REPORT</button>' +
          '<div id="tg-results" class="ai-modal-result"></div>' +
          "</div>";
      } else if (feature === "museum") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">Book entry passes for the Delhi Metro Museum located at Patel Chowk.</p>' +
          '<div style="background:#111115; border:1px solid rgba(255,255,255,0.05); padding:16px; display:flex; flex-direction:column; gap:8px;">' +
          '<span style="font-size:13px; color:#fff; font-weight:600;">EXHIBITIONS CURRENTLY RUNNING</span>' +
          '<ul style="font-size:14px; color:rgba(255,255,255,0.6); padding-left:16px; margin:0; display:flex; flex-direction:column; gap:4px;">' +
          "<li>History of Maglev Systems (Tunnel 3)</li>" +
          "<li>Delhi Metro Chronology: 2002-2026 (Galleries A-B)</li>" +
          "<li>Interactive Cabin Simulators (Room 12)</li>" +
          "</ul>" +
          "</div>" +
          '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">' +
          '<div class="ai-modal-input-group">' +
          "<label>DATE</label>" +
          '<input type="date" id="museum-date" class="ai-modal-input" value="2026-07-11" />' +
          "</div>" +
          '<div class="ai-modal-input-group">' +
          "<label>PASSENGER COUNT</label>" +
          '<input type="number" id="museum-count" class="ai-modal-input" value="1" min="1" max="10" />' +
          "</div>" +
          "</div>" +
          '<button type="button" class="ai-modal-btn" id="book-museum-ticket-btn">BOOK MUSEUM PASS (₹20/person)</button>' +
          '<div id="museum-results" class="ai-modal-result"></div>' +
          "</div>";
      } else if (feature === "lost-found") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">Query retrieved items or register a claim on the AI-synchronized database.</p>' +
          '<div class="ai-modal-input-group">' +
          "<label>SEARCH KEYWORD</label>" +
          '<input type="text" id="lf-query" class="ai-modal-input" placeholder="e.g. Wallet, Keys, Phone, Bag" />' +
          "</div>" +
          '<button type="button" class="ai-modal-btn" id="run-lf-search">QUERY LOST DATABASE (AI ENGINE)</button>' +
          '<div id="lf-results" class="ai-modal-result"></div>' +
          "</div>";
      } else if (feature === "advisory") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">Real-time status analysis of line arteries and security protocols.</p>' +
          '<div id="advisory-loader" class="ai-inference-loader">' +
          '<span class="font-mono" style="font-size:13px; color:#fff;">SCANNING SYSTEMS ARTERIES...</span>' +
          '<div class="ai-loader-bar-wrap"><div class="ai-loader-bar" id="adv-bar"></div></div>' +
          "</div>" +
          '<div id="advisory-results" style="display:none; flex-direction:column; gap:12px;">' +
          '<div style="background:#111115; border:1px solid rgba(255, 255, 255, 0.05); padding:16px; display:flex; flex-direction:column; gap:8px;">' +
          '<div style="display:flex; justify-content:space-between; font-size:14px;">' +
          "<span>Line A (Pink Line):</span>" +
          '<strong style="color:#00e66e;">OPERATIONAL // NORMAL</strong>' +
          "</div>" +
          '<div style="display:flex; justify-content:space-between; font-size:14px;">' +
          "<span>Line B (Blue Line):</span>" +
          '<strong style="color:#00e66e;">OPERATIONAL // NORMAL</strong>' +
          "</div>" +
          '<div style="display:flex; justify-content:space-between; font-size:14px;">' +
          "<span>Line C (Yellow Line):</span>" +
          '<strong style="color:#ffcc00;">SIGNAL FLUCTUATIONS // RUNNING OK</strong>' +
          "</div>" +
          "</div>" +
          '<span style="font-size:13px; color:rgba(255,255,255,0.4); text-align:center; display:block;">AI Core analysis completed. 0 safety alerts active.</span>' +
          "</div>" +
          "</div>";
      } else if (feature === "last-mile") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">AI-calculated availability of E-rickshaws, bike hubs, and feeder buses at stations.</p>' +
          '<div class="ai-modal-input-group">' +
          "<label>CURRENT STATION</label>" +
          '<select id="lm-station" class="ai-modal-input">' +
          pinkStations
            .map(function (s) {
              return '<option value="' + s.toUpperCase() + '">' + s + "</option>";
            })
            .join("") +
          "</select>" +
          "</div>" +
          '<button type="button" class="ai-modal-btn" id="run-lm-query">FIND FEEDER TRANSIT (AI ENGINE)</button>' +
          '<div id="lm-results" class="ai-modal-result"></div>' +
          "</div>";
      } else if (feature === "carbonlite") {
        contentHtml =
          '<div class="ai-modal-layout">' +
          '<p class="ai-modal-desc font-mono">Calculate your commute carbon offset details using AI comparative algorithms.</p>' +
          '<div class="ai-modal-input-group">' +
          "<label>COMMUTE TRIPS PER WEEK</label>" +
          '<input type="number" id="cl-trips" class="ai-modal-input" value="10" min="1" max="50" />' +
          "</div>" +
          '<button type="button" class="ai-modal-btn" id="run-cl-calc">EVALUATE CO2 OFFSETS (AI CORE)</button>' +
          '<div id="cl-results" class="ai-modal-result"></div>' +
          "</div>";
      }

      openFeatureModal(title, contentHtml);

      if (feature === "fare-calculator") {
        document.getElementById("run-fc-calc").addEventListener("click", function () {
          var fcFrom = document.getElementById("fc-from").value;
          var fcTo = document.getElementById("fc-to").value;
          var fcRes = document.getElementById("fc-results");
          if (fcFrom === fcTo) {
            fcRes.innerHTML =
              '<span style="color:#ef4444; font-size:14px;">Origin and destination cannot be identical!</span>';
            return;
          }

          fcRes.innerHTML =
            '<div class="ai-inference-loader">' +
            '<span class="font-mono" style="font-size:12px;">CALCULATING TRIP TELEMETRY...</span>' +
            '<div class="ai-loader-bar-wrap"><div class="ai-loader-bar"></div></div>' +
            "</div>";

          setTimeout(function () {
            var iA = pinkStations
              .map(function (s) {
                return s.toUpperCase();
              })
              .indexOf(fcFrom);
            var iB = pinkStations
              .map(function (s) {
                return s.toUpperCase();
              })
              .indexOf(fcTo);
            var stops = Math.abs(iA - iB);
            var fare = 10 + stops * 5;
            var duration = stops * 2.2;

            fcRes.innerHTML =
              '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); padding:16px; font-size:14px; display:flex; flex-direction:column; gap:8px;">' +
              "<span>Path duration: <strong>" +
              Math.ceil(duration) +
              " Minutes</strong></span>" +
              "<span>Total Stops: <strong>" +
              stops +
              " Interchange Stops</strong></span>" +
              '<span style="font-size:13px; color:#00f0ff;">Calculated Fare: <strong>₹' +
              fare +
              "</strong></span>" +
              "</div>";
          }, 1500);
        });
      } else if (feature === "ncmc") {
        document.getElementById("ncmc-register-btn").addEventListener("click", function () {
          var serial = document.getElementById("ncmc-register-input").value.trim();
          var log = document.getElementById("ncmc-log");
          if (!serial) {
            log.innerHTML = '<span style="color:#ef4444;">Please input card serial!</span>';
            return;
          }
          log.innerHTML = "Processing card registration...";
          setTimeout(function () {
            document.getElementById("ncmc-serial-val").textContent = serial.toUpperCase();
            document.getElementById("ncmc-balance-val").textContent = "₹150.00";
            log.innerHTML = "Card successfully registered to passenger wallet!";
          }, 1000);
        });

        document.getElementById("ncmc-topup-btn").addEventListener("click", function () {
          var balEl = document.getElementById("ncmc-balance-val");
          var log = document.getElementById("ncmc-log");
          var currentVal = parseFloat(balEl.textContent.replace("₹", "")) || 0;
          log.innerHTML = "Authorizing AI predictive topup request...";
          setTimeout(function () {
            var newVal = currentVal + 100;
            balEl.textContent = "₹" + newVal.toFixed(2);
            log.innerHTML = "Topup Authorized! Added ₹100.00 to Card.";
          }, 1200);
        });
      } else if (feature === "tickets") {
        document.getElementById("generate-qr-ticket-btn").addEventListener("click", function () {
          var tf = document.getElementById("t-from").value;
          var tt = document.getElementById("t-to").value;
          var tp = document.getElementById("t-passenger").value.trim() || "EDITH";
          var qrRes = document.getElementById("qr-results");

          if (tf === tt) {
            qrRes.innerHTML =
              '<span style="color:#ef4444; font-size:14px;">Origin and destination cannot be identical!</span>';
            return;
          }

          qrRes.innerHTML =
            '<div class="ai-inference-loader">' +
            '<span class="font-mono" style="font-size:12px;">ENCRYPTING QR PASSKEY...</span>' +
            '<div class="ai-loader-bar-wrap"><div class="ai-loader-bar"></div></div>' +
            "</div>";

          setTimeout(function () {
            var passkey = "TKT-" + Math.floor(Math.random() * 89999 + 10000);
            qrRes.innerHTML =
              '<div class="qr-ticket-box">' +
              '<div class="qr-ticket-cutout-left"></div>' +
              '<div class="qr-ticket-cutout-right"></div>' +
              '<svg class="qr-code-svg" viewBox="0 0 100 100">' +
              '<rect x="10" y="10" width="20" height="20" fill="#000" />' +
              '<rect x="70" y="10" width="20" height="20" fill="#000" />' +
              '<rect x="10" y="70" width="20" height="20" fill="#000" />' +
              '<rect x="25" y="25" width="50" height="50" fill="none" stroke="#000" stroke-width="4" stroke-dasharray="8 6" />' +
              '<rect x="40" y="40" width="20" height="20" fill="#000" />' +
              "</svg>" +
              '<div style="text-align:center;">' +
              '<strong style="font-size:14px; color:#00f0ff;" class="font-mono">' +
              passkey +
              "</strong>" +
              '<span style="font-size:11px; color:rgba(255,255,255,0.4); display:block; margin-top:2px;">AI CRYPTO-VALIDATED PASS</span>' +
              "</div>" +
              '<div class="qr-ticket-details">' +
              '<div class="qr-ticket-detail-item"><span>PASSENGER</span><strong>' +
              tp.toUpperCase() +
              "</strong></div>" +
              '<div class="qr-ticket-detail-item"><span>ROUTE</span><strong>' +
              tf.substring(0, 3) +
              " ⇄ " +
              tt.substring(0, 3) +
              "</strong></div>" +
              "</div>" +
              "</div>";
          }, 1500);
        });
      } else if (feature === "tour-guide") {
        document.getElementById("run-tg-query").addEventListener("click", function () {
          var station = document.getElementById("tg-station").value;
          var tgRes = document.getElementById("tg-results");

          tgRes.innerHTML =
            '<div class="ai-inference-loader">' +
            '<span class="font-mono" style="font-size:12px;">AI RETRIEVING HISTORICAL MAPS...</span>' +
            '<div class="ai-loader-bar-wrap"><div class="ai-loader-bar"></div></div>' +
            "</div>";

          setTimeout(function () {
            var attractions = {
              "MAJLIS PARK":
                "Majlis Park Lake & Eco Walkways (0.8km). AI recommends early morning visits.",
              AZADPUR:
                "Azadpur Fruit Sanctuary - Asia\'s largest distribution hub (0.5km). Recommendation score: 8.8.",
              "NETAJI SUBASH PLACE":
                "NSP Bento Culinary Plaza & Shopping Arcades (0.1km). AI recommends local snacks.",
              "RAJOURI GARDEN":
                "Rajouri Street Food Hub & Electronic District (0.3km). Match confidence: 92%.",
              "SOUTH CAMPUS":
                "Durgabai Deshmukh Ridge Sanctuary Trail (0.6km). Recommends afternoon walks.",
              INA: "Dilli Haat Crafts Conservatory & Culinary Hub (0.1km). Exquisite handicraft matches.",
              "LAJPAT NAGAR":
                "Central Market Textile District & Local Hub (0.2km). AI recommends matching fabrics.",
              "MAYUR VIHAR-I":
                "Sanjay Lake Wetlands & Boating Pier (0.7km). Highly recommended for photography.",
              "ANAND VIHAR": "Vikas Marg East Terminal Plazas (0.4km). Match score: 7.9.",
              KARKARDUMA: "District Court Library Archives & Local Cafes (0.3km).",
              WELCOME: "Welcome Heritage Crafts Conservatory & Handloom Plaza (0.5km).",
              "SHIV VIHAR":
                "Karawal Nagar Ridge Wetlands Path (1.2km). Recommended for scenic bird watching.",
            };

            var desc =
              attractions[station] ||
              "Historical Crafts Bazaar & local heritage points (within 1km).";

            tgRes.innerHTML =
              '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); padding:16px; font-size:14px; display:flex; flex-direction:column; gap:8px;">' +
              '<span style="font-size:12px; color:#a855f7;">AI CORE TOUR ADVISOR FOR ' +
              station +
              ":</span>" +
              '<span style="color:#fff;">' +
              desc +
              "</span>" +
              "</div>";
          }, 1500);
        });
      } else if (feature === "museum") {
        document.getElementById("book-museum-ticket-btn").addEventListener("click", function () {
          var date = document.getElementById("museum-date").value;
          var count = parseInt(document.getElementById("museum-count").value, 10) || 1;
          var musRes = document.getElementById("museum-results");

          musRes.innerHTML = "Compiling museum boarding code...";
          setTimeout(function () {
            var total = count * 20;
            musRes.innerHTML =
              '<div style="background:#111115; border:1px solid rgba(0,230,110,0.2); padding:16px; font-size:14px; text-align:center; display:flex; flex-direction:column; gap:6px;">' +
              '<span style="color:#00e66e; font-weight:600;">MUSEUM PASS RESERVED</span>' +
              '<span style="color:#fff;">Date: <strong>' +
              date +
              "</strong> | Tickets: <strong>" +
              count +
              "</strong></span>" +
              '<span style="font-size:12px; color:#fff;">Paid: <strong>₹' +
              total +
              "</strong></span>" +
              "</div>";
          }, 1000);
        });
      } else if (feature === "lost-found") {
        document.getElementById("run-lf-search").addEventListener("click", function () {
          var query = document.getElementById("lf-query").value.trim().toLowerCase();
          var lfRes = document.getElementById("lf-results");
          if (!query) {
            lfRes.innerHTML =
              '<span style="color:#ef4444; font-size:14px;">Please enter item name to query!</span>';
            return;
          }

          lfRes.innerHTML =
            '<div class="ai-inference-loader">' +
            '<span class="font-mono" style="font-size:12px;">AI DATABASE MATCHING CROSS-REF...</span>' +
            '<div class="ai-loader-bar-wrap"><div class="ai-loader-bar"></div></div>' +
            "</div>";

          setTimeout(function () {
            var mockDatabase = [
              { item: "leather wallet", station: "Azadpur", date: "2026-07-08", id: "LF-77291" },
              { item: "iphone 15", station: "Lajpat Nagar", date: "2026-07-09", id: "LF-78812" },
              { item: "silver keys", station: "INA", date: "2026-07-10", id: "LF-79921" },
              {
                item: "black backpack",
                station: "South Campus",
                date: "2026-07-07",
                id: "LF-76621",
              },
            ];

            var matches = mockDatabase.filter(function (d) {
              return d.item.indexOf(query) !== -1 || query.indexOf(d.item) !== -1;
            });
            if (matches.length > 0) {
              var matchesHtml = matches
                .map(function (m) {
                  return (
                    '<div style="background:rgba(0,230,110,0.03); border:1px solid rgba(0,230,110,0.2); padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">' +
                    "<div>" +
                    '<strong style="color:#00e66e;">' +
                    m.item.toUpperCase() +
                    "</strong>" +
                    '<span style="font-size:12px; color:rgba(255,255,255,0.4); display:block;">Found at ' +
                    m.station +
                    " on " +
                    m.date +
                    "</span>" +
                    "</div>" +
                    '<span class="font-mono" style="font-size:13px; color:#fff;">' +
                    m.id +
                    "</span>" +
                    "</div>"
                  );
                })
                .join("");
              lfRes.innerHTML =
                '<span style="font-size:12px; color:rgba(255,255,255,0.4); display:block; margin-bottom:8px;">AI ENGINE FOUND ' +
                matches.length +
                " MATCHES:</span>" +
                matchesHtml;
            } else {
              lfRes.innerHTML =
                '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); padding:16px; text-align:center;">' +
                '<span style="color:rgba(255,255,255,0.5);">No match found in current AI catalog. Your report has been logged.</span>' +
                "</div>";
            }
          }, 1500);
        });
      } else if (feature === "advisory") {
        setTimeout(function () {
          var loader = document.getElementById("advisory-loader");
          var results = document.getElementById("advisory-results");
          if (loader) loader.style.display = "none";
          if (results) results.style.display = "flex";
        }, 1500);
      } else if (feature === "last-mile") {
        document.getElementById("run-lm-query").addEventListener("click", function () {
          var station = document.getElementById("lm-station").value;
          var lmRes = document.getElementById("lm-results");

          lmRes.innerHTML =
            '<div class="ai-inference-loader">' +
            '<span class="font-mono" style="font-size:12px;">AI ETAS COMPILING...</span>' +
            '<div class="ai-loader-bar-wrap"><div class="ai-loader-bar"></div></div>' +
            "</div>";

          setTimeout(function () {
            var rickshaws = Math.floor(Math.random() * 8) + 2;
            var cycles = Math.floor(Math.random() * 15) + 5;

            lmRes.innerHTML =
              '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); padding:16px; font-size:14px; display:flex; flex-direction:column; gap:8px;">' +
              '<span style="font-size:12px; color:#ff007f;">FEEDER STATUS FOR ' +
              station +
              ":</span>" +
              "<span>E-Rickshaws nearby: <strong>" +
              rickshaws +
              " Available (ETA: 3 mins)</strong></span>" +
              "<span>Cycles in Dock: <strong>" +
              cycles +
              " Available</strong></span>" +
              "<span>Bus Feeder Transit: <strong>Route 51B arriving in 6 mins</strong></span>" +
              "</div>";
          }, 1500);
        });
      } else if (feature === "carbonlite") {
        document.getElementById("run-cl-calc").addEventListener("click", function () {
          var trips = parseInt(document.getElementById("cl-trips").value, 10) || 10;
          var clRes = document.getElementById("cl-results");

          clRes.innerHTML =
            '<div class="ai-inference-loader">' +
            '<span class="font-mono" style="font-size:12px;">EVALUATING ECO COMMUTE GRAPH...</span>' +
            '<div class="ai-loader-bar-wrap"><div class="ai-loader-bar"></div></div>' +
            "</div>";

          setTimeout(function () {
            var co2 = trips * 1.84;
            var trees = co2 * 0.05;

            clRes.innerHTML =
              '<div style="background:#111115; border:1px solid rgba(0,230,110,0.2); padding:16px; font-size:14px; display:flex; flex-direction:column; gap:8px;">' +
              '<span style="color:#4ade80; font-weight:600;">CARBON SAVINGS COMPARATIVE</span>' +
              "<span>CO2 Prevented: <strong>" +
              co2.toFixed(2) +
              " kg / week</strong></span>" +
              "<span>Equivalent Trees Planted: <strong>" +
              trees.toFixed(3) +
              " trees</strong></span>" +
              '<span style="font-size:12px; color:rgba(255,255,255,0.4);">Calculated relative to standard petrol hatchback emissions.</span>' +
              "</div>";
          }, 1500);
        });
      }
    });
  });

  function updateLeftTicketDisplay(destination, passenger, type, platform) {
    var container = document.getElementById("static-ticket-display");
    if (!container) return;

    var typeLower = type.toLowerCase();
    var transitLine = "Land-Artery Maglev";
    if (typeLower.indexOf("sky") !== -1) {
      transitLine = "Sky-Orbital Monorail";
    } else if (typeLower.indexOf("ocean") !== -1 || typeLower.indexOf("sea") !== -1) {
      transitLine = "Sub-sea Pressure Capsule";
    }

    var departureCode = "CAS";
    var departureName = "Casablanca Station";
    var destCode = destination.substring(0, 3).toUpperCase();
    var serial = "MNX-" + Math.floor(Math.random() * 900000 + 100000);

    container.innerHTML =
      '<div class="ticket-art-left" style="padding: 16px 20px;">' +
      '<div class="ticket-art-logo">' +
      '<svg class="ticket-m-logo" viewBox="0 0 100 100" width="18" height="18" style="display:block;">' +
      '<path d="M10,90 L10,10 L35,10 L50,45 L65,10 L90,10 L90,90 L75,90 L75,35 L50,70 L25,35 L25,90 Z" fill="#000"/>' +
      "</svg>" +
      '<div class="ticket-art-brand-text">' +
      '<div style="font-weight: 800; font-size: 9px; letter-spacing: 0.15em; line-height: 1; color:#000;">METRO</div>' +
      '<div style="font-weight: 800; font-size: 9px; letter-spacing: 0.15em; line-height: 1; color:#000;">FAB</div>' +
      "</div>" +
      "</div>" +
      '<div class="ticket-art-watermark" style="width: 100px; height: 100px;">' +
      '<svg viewBox="0 0 100 100" width="100%" height="100%">' +
      '<path d="M10,90 L10,10 L35,10 L50,45 L65,10 L90,10 L90,90 L75,90 L75,35 L50,70 L25,35 L25,90 Z" fill="rgba(0,0,0,0.03)"/>' +
      "</svg>" +
      "</div>" +
      '<div class="ticket-art-route-info" style="margin-top: 24px;">' +
      '<div class="ticket-route-field">' +
      '<span class="ticket-field-label">FROM</span>' +
      '<span class="ticket-field-val" style="font-size: 13px;">' +
      departureName.toUpperCase() +
      "</span>" +
      "</div>" +
      '<div class="ticket-route-connector" style="display:flex; flex-direction:column; align-items:flex-start; margin-left: 2px; height: auto !important;">' +
      '<span class="connector-dot"></span>' +
      '<span class="connector-line" style="height: 10px; width: 1.5px; background: #000; margin: 1px 0 1px 2px;"></span>' +
      '<span class="connector-dot connector-dot--empty"></span>' +
      "</div>" +
      '<div class="ticket-route-field">' +
      '<span class="ticket-field-label">TO</span>' +
      '<span class="ticket-field-val" style="font-size: 13px;">' +
      destination.toUpperCase() +
      "</span>" +
      "</div>" +
      "</div>" +
      '<div class="ticket-art-footer" style="padding-top: 10px; margin-top: 16px;">' +
      '<svg class="ticket-train-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">' +
      '<rect x="4" y="3" width="16" height="16" rx="2"/>' +
      '<path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3M9 15h6"/>' +
      "</svg>" +
      '<span class="ticket-footer-text" style="font-size: 8px;">PASSENGER: ' +
      passenger.toUpperCase() +
      "</span>" +
      '<span class="ticket-footer-sep">|</span>' +
      '<span class="ticket-footer-text" style="font-size: 8px;">PLATFORM: ' +
      platform +
      "</span>" +
      "</div>" +
      "</div>" +
      '<div class="ticket-art-right" style="padding: 16px 10px;">' +
      '<div class="ticket-art-slogan" style="font-size: 8px;">MOVE THROUGH THE FUTURE</div>' +
      '<div class="ticket-art-barcode-container" style="margin: 10px 0;">' +
      '<div class="ticket-art-barcode" style="height: 100px; width: 36px;"></div>' +
      "</div>" +
      '<div class="ticket-art-serial" style="font-size: 7px;">' +
      serial +
      "</div>" +
      "</div>";

    container.style.display = "";
    container.style.width = "";
    container.style.height = "";
    container.style.background = "";
    container.style.border = "";
    container.style.borderRadius = "";
    container.style.position = "";
    container.style.overflow = "";
    container.style.color = "";

    container.classList.add("angled-ticket-active");
  }

  function triggerFlyingTicket(destination, passenger, type, platform) {
    var ticket = document.createElement("div");
    ticket.className = "fab-ticket-artifact";

    var typeLower = type.toLowerCase();
    var transitLine = "Land-Artery Maglev";
    if (typeLower.indexOf("sky") !== -1) {
      transitLine = "Sky-Orbital Monorail";
      ticket.style.setProperty("--neon-rgb", "255, 255, 255");
    } else if (typeLower.indexOf("ocean") !== -1 || typeLower.indexOf("sea") !== -1) {
      transitLine = "Sub-sea Pressure Capsule";
      ticket.style.setProperty("--neon-rgb", "0, 160, 255");
    } else {
      transitLine = "Land-Artery Maglev";
      ticket.style.setProperty("--neon-rgb", "0, 230, 110");
    }

    var departureCode = "CAS";
    var departureName = "Casablanca Station";
    var destCode = destination.substring(0, 3).toUpperCase();
    var serial = "MNX-" + Math.floor(Math.random() * 900000 + 100000);

    ticket.innerHTML =
      '<div class="ticket-art-left">' +
      '<div class="ticket-close-wrap">' +
      '<button class="ticket-close" type="button">✕</button>' +
      "</div>" +
      '<div class="ticket-art-logo">' +
      '<svg class="ticket-m-logo" viewBox="0 0 100 100" width="20" height="20" style="display:block;">' +
      '<path d="M10,90 L10,10 L35,10 L50,45 L65,10 L90,10 L90,90 L75,90 L75,35 L50,70 L25,35 L25,90 Z" fill="#000"/>' +
      "</svg>" +
      '<div class="ticket-art-brand-text">' +
      '<div style="font-weight: 800; font-size: 10px; letter-spacing: 0.15em; line-height: 1; color:#000;">METRO</div>' +
      '<div style="font-weight: 800; font-size: 10px; letter-spacing: 0.15em; line-height: 1; color:#000;">FAB</div>' +
      "</div>" +
      "</div>" +
      '<div class="ticket-art-watermark">' +
      '<svg viewBox="0 0 100 100" width="100%" height="100%">' +
      '<path d="M10,90 L10,10 L35,10 L50,45 L65,10 L90,10 L90,90 L75,90 L75,35 L50,70 L25,35 L25,90 Z" fill="rgba(0,0,0,0.03)"/>' +
      "</svg>" +
      "</div>" +
      '<div class="ticket-art-route-info">' +
      '<div class="ticket-route-field">' +
      '<span class="ticket-field-label">FROM</span>' +
      '<span class="ticket-field-val">' +
      departureName.toUpperCase() +
      "</span>" +
      "</div>" +
      '<div class="ticket-route-connector" style="display:flex; flex-direction:column; align-items:flex-start; margin-left: 2px; height: auto !important;">' +
      '<span class="connector-dot"></span>' +
      '<span class="connector-line" style="height: 14px; width: 1.5px; background: #000; margin: 2px 0 2px 2px;"></span>' +
      '<span class="connector-dot connector-dot--empty"></span>' +
      "</div>" +
      '<div class="ticket-route-field">' +
      '<span class="ticket-field-label">TO</span>' +
      '<span class="ticket-field-val">' +
      destination.toUpperCase() +
      "</span>" +
      "</div>" +
      "</div>" +
      '<div class="ticket-art-footer">' +
      '<svg class="ticket-train-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">' +
      '<rect x="4" y="3" width="16" height="16" rx="2"/>' +
      '<path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3M9 15h6"/>' +
      "</svg>" +
      '<span class="ticket-footer-text">PASSENGER: ' +
      passenger.toUpperCase() +
      "</span>" +
      '<span class="ticket-footer-sep">|</span>' +
      '<span class="ticket-footer-text">PLATFORM: ' +
      platform +
      "</span>" +
      '<span class="ticket-footer-sep">|</span>' +
      '<span class="ticket-footer-text">VALID TODAY →</span>' +
      "</div>" +
      "</div>" +
      '<div class="ticket-art-right">' +
      '<div class="ticket-art-slogan">MOVE THROUGH THE FUTURE</div>' +
      '<div class="ticket-art-barcode-container">' +
      '<div class="ticket-art-barcode"></div>' +
      "</div>" +
      '<div class="ticket-art-serial">' +
      serial +
      "</div>" +
      "</div>";

    document.body.appendChild(ticket);
    playFlightSound();

    var ticket3d = document.querySelector(".ticket-3d");
    var rect = ticket3d ? ticket3d.getBoundingClientRect() : null;
    var startX = rect ? rect.left + rect.width / 2 : window.innerWidth * 0.2;
    var startY = rect ? rect.top + rect.height / 2 : window.innerHeight * 0.3;

    ticket.style.left = startX + "px";
    ticket.style.top = startY + "px";

    requestAnimationFrame(function () {
      ticket.style.transition = "none";
      ticket.style.left = "50%";
      ticket.style.top = "50%";
      ticket.style.animation = "fabTicketFlyIn 1.6s cubic-bezier(0.19, 1, 0.22, 1) forwards";
    });

    var closeBtn = ticket.querySelector(".ticket-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        ticket.style.animation = "none";
        ticket.style.transition = "transform 0.5s ease, opacity 0.5s ease";
        ticket.style.transform = "translate(-50%, -50%) scale(0.2) rotate(-20deg)";
        ticket.style.opacity = "0";
        setTimeout(function () {
          if (ticket.parentNode) {
            ticket.parentNode.removeChild(ticket);
          }
        }, 500);
      });
    }
  }

  function playFlightSound() {
    try {
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      var osc1 = audioCtx.createOscillator();
      var gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(80, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.6);

      gain1.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 1.2);

      var osc2 = audioCtx.createOscillator();
      var gain2 = audioCtx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(440, audioCtx.currentTime + 0.4);
      osc2.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.8);

      gain2.gain.setValueAtTime(0.001, audioCtx.currentTime + 0.4);
      gain2.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.6);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.6);

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.4);
      osc2.stop(audioCtx.currentTime + 1.6);
    } catch (e) {
      console.warn("Audio Context blocked/not supported", e);
    }
  }

  var mascotBubbleText = document.querySelector(".mascot-bubble span");
  var leftTicket3d = document.querySelector(".ticket-3d");

  function updateMascotText(text) {
    if (mascotBubbleText) {
      mascotBubbleText.textContent = text;
    }
  }

  if (leftTicket3d) {
    leftTicket3d.addEventListener("click", function () {
      if (bookedTickets.length > 0) {
        var lastTicket = bookedTickets[bookedTickets.length - 1];
        triggerFlyingTicket(
          lastTicket.destination,
          lastTicket.passenger,
          lastTicket.type,
          lastTicket.platform,
        );
        updateMascotText("Opening active boarding pass for " + lastTicket.passenger + "!");
      } else {
        updateMascotText("No active passes compiled yet. Tell the assistant where to go!");
        if (chatInput) chatInput.focus();
      }
    });
  }

  (function initSolariBoard() {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var rowsEl = document.getElementById("solari-rows");
    var clockEl = document.getElementById("solari-clock");
    var srEl = document.getElementById("solari-sr");
    if (!rowsEl) return;

    var CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-.";
    var ROW_COUNT = 6;
    var FIELDS = [
      { key: "time", len: 5, cls: "sf--time" },
      { key: "dest", len: 14, cls: "sf--dest" },
      { key: "line", len: 1, cls: "sf--line" },
      { key: "plat", len: 2, cls: "sf--plat" },
      { key: "status", len: 8, cls: "sf--status" },
    ];

    var LINE_COLORS = {
      A: "#00f0ff",
      B: "#3b82f6",
      C: "#eab308",
      D: "#ec4899",
      E: "#a855f7",
      F: "#f97316",
    };

    var DESTINATIONS = [
      "SHIV VIHAR",
      "MAJLIS PARK",
      "ANAND VIHAR",
      "RAJOURI GDN",
      "SOUTH CAMPUS",
      "LAJPAT NAGAR",
      "KARKARDUMA",
      "AZADPUR",
      "MAYUR VIHAR",
      "NETAJI SUBASH",
      "WELCOME",
      "INA",
    ];
    var LINES = ["A", "B", "C", "D", "E", "F"];
    var STATUSES = ["ON TIME", "ON TIME", "ON TIME", "BOARDING", "DELAYED"];

    function pad(str, len) {
      str = String(str).toUpperCase().slice(0, len);
      while (str.length < len) str += " ";
      return str;
    }

    function fmtClock(d) {
      function p2(n) {
        return (n < 10 ? "0" : "") + n;
      }
      return p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds());
    }

    var cursor = new Date(Date.now() + 2 * 60000);

    function makeDeparture(first) {
      function p2(n) {
        return (n < 10 ? "0" : "") + n;
      }
      var status = first ? "BOARDING" : STATUSES[Math.floor(Math.random() * STATUSES.length)];
      var dep = {
        time: p2(cursor.getHours()) + ":" + p2(cursor.getMinutes()),
        dest: DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)],
        line: LINES[Math.floor(Math.random() * LINES.length)],
        plat: String(1 + Math.floor(Math.random() * 18)),
        status: status,
      };

      cursor = new Date(cursor.getTime() + (3 + Math.floor(Math.random() * 4)) * 60000);
      return dep;
    }

    function rollTo(cell, target) {
      var current = cell.textContent || " ";
      if (current === target) return;

      if (reduced) {
        cell.textContent = target;
        cell.classList.toggle("is-blank", target === " ");
        return;
      }

      var from = CHARSET.indexOf(current);
      var to = CHARSET.indexOf(target);
      if (from < 0) from = 0;
      if (to < 0) {
        cell.textContent = target;
        return;
      }

      var steps = (to - from + CHARSET.length) % CHARSET.length;
      var i = 0;

      if (cell._sfTimer) clearInterval(cell._sfTimer);

      cell._sfTimer = setInterval(function () {
        i++;
        var ch = CHARSET[(from + i) % CHARSET.length];
        cell.textContent = ch;
        cell.classList.toggle("is-blank", ch === " ");
        cell.classList.remove("is-flip");

        void cell.offsetWidth;
        cell.classList.add("is-flip");

        if (i >= steps) {
          clearInterval(cell._sfTimer);
          cell._sfTimer = null;
        }
      }, 28);
    }

    function buildField(field) {
      var wrap = document.createElement("div");
      wrap.className = "sf " + field.cls;
      for (var i = 0; i < field.len; i++) {
        var c = document.createElement("span");
        c.className = "sf-c is-blank";
        c.textContent = " ";
        wrap.appendChild(c);
      }
      return wrap;
    }

    function buildRow() {
      var row = document.createElement("div");
      row.className = "solari__row";
      row.setAttribute("aria-hidden", "true");
      FIELDS.forEach(function (f) {
        row.appendChild(buildField(f));
      });
      return row;
    }

    function paintRow(row, dep) {
      row.setAttribute("data-status", dep.status);
      row.style.setProperty("--row-line-color", LINE_COLORS[dep.line] || "#fff");
      FIELDS.forEach(function (f, fi) {
        var text = pad(dep[f.key], f.len);
        var cells = row.children[fi].children;
        for (var i = 0; i < cells.length; i++) {
          rollTo(cells[i], text[i]);
        }
      });
    }

    var board = [];
    for (var r = 0; r < ROW_COUNT; r++) {
      board.push(makeDeparture(r === 0));
      rowsEl.appendChild(buildRow());
    }

    function announce() {
      if (!srEl) return;
      srEl.textContent =
        "Next departure: " +
        board[0].dest +
        " on line " +
        board[0].line +
        " from platform " +
        board[0].plat +
        " at " +
        board[0].time +
        ", " +
        board[0].status.toLowerCase() +
        ".";
    }

    function render() {
      for (var i = 0; i < board.length; i++) {
        paintRow(rowsEl.children[i], board[i]);
      }
      announce();
    }

    board.forEach(function (dep, i) {
      setTimeout(
        function () {
          paintRow(rowsEl.children[i], dep);
        },
        reduced ? 0 : i * 110,
      );
    });
    announce();

    setInterval(function () {
      board.shift();
      board.push(makeDeparture(false));
      board[0].status = "BOARDING";
      render();
    }, 9000);

    if (clockEl) {
      (function tickClock() {
        clockEl.textContent = fmtClock(new Date());
        setTimeout(tickClock, 1000);
      })();
    }
  })();

  (function initTelemetryHub() {
    var trainCards = document.querySelectorAll(".train-card");
    var focusTrainId = document.getElementById("focus-train-id");
    var focusTrainLine = document.getElementById("focus-train-line");
    var focusSpeed = document.getElementById("focus-speed");
    var focusCapacity = document.getElementById("focus-capacity");
    var focusCapacityBar = document.getElementById("focus-capacity-bar");
    var focusEta = document.getElementById("focus-eta");
    var focusPower = document.getElementById("focus-power");
    var focusOrigin = document.getElementById("focus-origin");
    var focusDestination = document.getElementById("focus-destination");
    var focusDestText = document.getElementById("focus-dest-text");
    var focusTrackProgress = document.getElementById("focus-track-progress");
    var indicatorTrainId = document.getElementById("indicator-train-id");
    var trainIndicator = document.querySelector(".track-train-indicator");

    if (!trainCards.length) return;

    var trainStates = {
      "TRN-082": { progress: 65, dir: "forward", status: "ON TIME", line: "LINE A • CYAN LINE" },
      "TRN-104": { progress: 40, dir: "forward", status: "+2 MIN", line: "LINE B • BLUE LINE" },
      "TRN-091": { progress: 85, dir: "forward", status: "ON TIME", line: "LINE C • YELLOW LINE" },
      "TRN-212": { progress: 50, dir: "forward", status: "ON TIME", line: "LINE D • PINK LINE" },
      "TRN-055": { progress: 20, dir: "forward", status: "DELAY", line: "LINE E • PURPLE LINE" },
      "TRN-118": { progress: 75, dir: "forward", status: "ON TIME", line: "LINE F • ORANGE LINE" },
    };

    function updateActiveRouteTracker(activeId) {
      var state = trainStates[activeId];
      if (!state) return;

      var panel = document.getElementById("active-route-panel");
      if (!panel) return;

      var lineColors = {
        "TRN-082": "#00f0ff",
        "TRN-104": "#3b82f6",
        "TRN-091": "#eab308",
        "TRN-212": "#ec4899",
        "TRN-055": "#a855f7",
        "TRN-118": "#f97316",
      };

      panel.style.setProperty("--line-color", lineColors[activeId] || "#ff007f");

      panel.setAttribute(
        "data-status",
        state.status === "DELAY" || state.status === "+2 MIN" ? "delay" : "on-time",
      );

      var routeLineName = document.getElementById("route-line-name");
      var routeTrainId = document.getElementById("route-train-id");
      var routeTrainStatus = document.getElementById("route-train-status");
      var routeTrainEta = document.getElementById("route-train-eta");
      var markerTrainId = document.getElementById("pink-marker-train-id");

      if (routeLineName) routeLineName.textContent = state.line;
      if (routeTrainId) routeTrainId.textContent = activeId;
      if (routeTrainStatus) {
        routeTrainStatus.textContent = state.status;
        routeTrainStatus.className =
          "active-route-status " +
          (state.status === "DELAY" || state.status === "+2 MIN" ? "delay" : "on-time");
      }
      if (markerTrainId) markerTrainId.textContent = activeId;

      var p = state.progress;

      var progressFill = document.getElementById("pink-progress-fill");
      var progressMarker = document.getElementById("pink-progress-marker");
      if (progressFill) progressFill.style.width = p + "%";
      if (progressMarker) progressMarker.style.left = p + "%";

      var stations = [
        "MAJLIS PARK",
        "AZADPUR",
        "NETAJI SUBASH",
        "RAJOURI GDN",
        "SOUTH CAMPUS",
        "INA",
        "LAJPAT NGR",
        "MAYUR VIHAR-I",
        "ANAND VIHAR",
        "KARKARDUMA",
        "WELCOME",
        "SHIV VIHAR",
      ];
      if (state.dir === "reverse") {
        stations.reverse();
      }

      var stationNodes = panel.querySelectorAll(".pink-station");
      var segments = panel.querySelectorAll(".pink-line-segment");

      stationNodes.forEach(function (node, idx) {
        var label = node.querySelector(".pink-station__label");
        if (label) {
          label.textContent = stations[idx];
        }

        node.setAttribute("data-station", stations[idx]);
        node.setAttribute("aria-label", stations[idx] + " station — open station story");
        node.classList.remove("visited", "current");
      });

      segments.forEach(function (seg) {
        seg.classList.remove("filled");
      });

      var nodeCount = stations.length;
      var activeIndex = Math.floor((p / 100) * (nodeCount - 1));

      stationNodes.forEach(function (node, idx) {
        if (idx < activeIndex) {
          node.classList.add("visited");
        } else if (idx === activeIndex) {
          node.classList.add("visited", "current");
        }
      });

      segments.forEach(function (seg, idx) {
        if (idx < activeIndex) {
          seg.classList.add("filled");
        }
      });

      var currentStation = stations[activeIndex];
      var nextStation =
        activeIndex < nodeCount - 1 ? stations[activeIndex + 1] : stations[activeIndex];
      var footerStatus = document.getElementById("route-footer-status");

      if (footerStatus) {
        if (p >= 50 && p < 55) {
          footerStatus.textContent = "ARRIVING AT " + currentStation;
        } else {
          footerStatus.textContent = "IN TRANSIT: " + currentStation + " → " + nextStation;
        }
      }

      var activeTCard = document.querySelector('.train-card[data-id="' + activeId + '"]');
      var speed = activeTCard ? activeTCard.getAttribute("data-speed") : "90";
      var power = activeTCard ? activeTCard.getAttribute("data-power") : "400";

      var footerSpeed = document.getElementById("route-footer-speed");
      var footerPower = document.getElementById("route-footer-power");
      if (footerSpeed) footerSpeed.textContent = speed + " KM/H";
      if (footerPower) footerPower.textContent = power + " kW";

      var remainingMinutes = Math.max(1, Math.ceil((100 - p) * 0.08));
      var remainingSeconds = Math.floor((p * 7) % 60);
      var formattedEta =
        (remainingMinutes < 10 ? "0" : "") +
        remainingMinutes +
        ":" +
        (remainingSeconds < 10 ? "0" : "") +
        remainingSeconds;
      if (routeTrainEta) routeTrainEta.textContent = "ETA: " + formattedEta + " MIN";
    }

    var CAR_COUNT = 8;
    var carriageTrain = document.getElementById("carriage-train");
    var carriageDetail = document.getElementById("carriage-detail");
    var carriageAdvice = document.getElementById("carriage-advice");
    var selectedCar = null;
    var carState = [];

    function isAccessible(carNo) {
      return carNo === 1 || carNo === CAR_COUNT;
    }

    function carBias(trainId, carNo) {
      var seed = 0;
      for (var i = 0; i < trainId.length; i++) seed += trainId.charCodeAt(i);
      var mid = (CAR_COUNT + 1) / 2;
      var centreness = 1 - Math.abs(carNo - mid) / mid;
      var wobble = ((seed * (carNo + 7)) % 17) - 8;
      return centreness * 22 + wobble;
    }

    function loadBand(pct) {
      if (pct >= 75) return "high";
      if (pct >= 45) return "mid";
      return "low";
    }

    function buildCars() {
      if (!carriageTrain) return;
      var accSvg =
        '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M12 6v6m0 0l-3 6m3-6l3 6M7 9h10"/></svg>';
      for (var n = 1; n <= CAR_COUNT; n++) {
        var car = document.createElement("button");
        car.type = "button";
        car.className = "car";
        car.setAttribute("data-car", String(n));
        car.innerHTML =
          '<span class="car__num">' +
          n +
          "</span>" +
          '<span class="car__gauge"><span class="car__fill"></span></span>' +
          '<span class="car__pct">--</span>' +
          '<span class="car__icons">' +
          (isAccessible(n) ? accSvg : "") +
          "</span>";
        carriageTrain.appendChild(car);
      }

      carriageTrain.addEventListener("click", function (e) {
        var car = e.target.closest ? e.target.closest(".car") : null;
        if (!car) return;
        selectedCar = parseInt(car.getAttribute("data-car"), 10);
        paintSelection();
      });
    }

    function paintSelection() {
      if (!carriageTrain) return;
      Array.prototype.forEach.call(carriageTrain.children, function (car) {
        var n = parseInt(car.getAttribute("data-car"), 10);
        car.classList.toggle("is-selected", n === selectedCar);
        car.setAttribute("aria-pressed", n === selectedCar ? "true" : "false");
      });

      if (!carriageDetail) return;
      var c = carState[selectedCar - 1];
      if (!c) {
        carriageDetail.innerHTML = '<span class="carriages__detail-empty">Select a carriage</span>';
        return;
      }
      var label = c.pct >= 75 ? "Crowded" : c.pct >= 45 ? "Filling" : "Space available";
      carriageDetail.innerHTML =
        "<span><strong>Car " +
        c.n +
        "</strong> &middot; " +
        c.pct +
        "% full &middot; " +
        label +
        " &middot; " +
        c.seats +
        " seats free &middot; " +
        c.temp +
        "&deg;C" +
        (c.accessible ? " &middot; step-free boarding" : "") +
        "</span>";
    }

    function updateCarriages(trainId, capacityPct) {
      if (!carriageTrain || !carriageTrain.children.length) return;
      var base = parseInt(capacityPct, 10);
      if (isNaN(base)) base = 70;

      carState = [];
      for (var n = 1; n <= CAR_COUNT; n++) {
        var pct = base - 18 + carBias(trainId, n) + (Math.random() * 6 - 3);
        pct = Math.max(4, Math.min(99, Math.round(pct)));
        carState.push({
          n: n,
          pct: pct,
          seats: Math.max(0, Math.round((100 - pct) * 0.46)),
          temp: 21 + Math.round((pct / 100) * 3),
          accessible: isAccessible(n),
        });
      }

      var best = carState.reduce(function (a, b) {
        return b.pct < a.pct ? b : a;
      });
      var worst = carState.reduce(function (a, b) {
        return b.pct > a.pct ? b : a;
      });

      Array.prototype.forEach.call(carriageTrain.children, function (carEl, i) {
        var c = carState[i];
        var band = loadBand(c.pct);
        carEl.setAttribute("data-load", band);
        carEl.classList.toggle("is-best", c.n === best.n);
        carEl.querySelector(".car__fill").style.height = c.pct + "%";
        carEl.querySelector(".car__pct").textContent = c.pct + "%";
        carEl.setAttribute(
          "aria-label",
          "Car " +
            c.n +
            ", " +
            c.pct +
            "% full, " +
            c.seats +
            " seats free" +
            (c.accessible ? ", step-free boarding" : ""),
        );
      });

      if (carriageAdvice) {
        var diff = worst.pct - best.pct;
        carriageAdvice.textContent =
          diff >= 12
            ? "Board car " + best.n + " — " + diff + "% emptier than car " + worst.n
            : "Load is even across the train";
      }

      paintSelection();
    }

    buildCars();

    trainCards.forEach(function (card) {
      card.addEventListener("click", function () {
        trainCards.forEach(function (c) {
          c.classList.remove("active");
        });

        card.classList.add("active");

        var id = card.getAttribute("data-id");
        var speed = card.getAttribute("data-speed");
        var capacity = card.getAttribute("data-capacity");
        var eta = card.getAttribute("data-eta");
        var power = card.getAttribute("data-power");
        var origin = card.getAttribute("data-origin");
        var dest = card.getAttribute("data-dest");
        var line = card.getAttribute("data-line");

        if (focusTrainId) focusTrainId.textContent = id;
        if (focusTrainLine) focusTrainLine.textContent = line;
        if (focusSpeed) focusSpeed.textContent = speed;
        if (focusCapacity) focusCapacity.textContent = capacity;
        if (focusCapacityBar) focusCapacityBar.style.width = capacity + "%";
        if (focusEta) focusEta.textContent = eta;
        if (focusPower) focusPower.textContent = power;
        if (focusOrigin) focusOrigin.textContent = origin.toUpperCase();
        if (focusDestination) focusDestination.textContent = dest.toUpperCase();
        if (focusDestText) focusDestText.textContent = dest.toUpperCase() + " STATION";
        if (indicatorTrainId) indicatorTrainId.textContent = id;

        var state = trainStates[id];
        if (state) {
          if (focusTrackProgress) focusTrackProgress.style.width = state.progress + "%";
          if (trainIndicator) trainIndicator.style.left = state.progress + "%";
        }

        selectedCar = null;
        updateCarriages(id, capacity);

        updateActiveRouteTracker(id);
      });
    });

    setInterval(function () {
      var allTrainCards = document.querySelectorAll(".train-card");
      var activeTrainIdEl = document.getElementById("focus-train-id");
      var activeId = activeTrainIdEl ? activeTrainIdEl.textContent : "";

      allTrainCards.forEach(function (tCard) {
        var tId = tCard.getAttribute("data-id");

        var currentSpeed = parseInt(tCard.getAttribute("data-speed"), 10) || 90;
        var variation = Math.floor(Math.random() * 5) - 2;
        var newSpeed = Math.max(30, Math.min(140, currentSpeed + variation));
        tCard.setAttribute("data-speed", newSpeed);

        var speedMini = tCard.querySelector(".train-speed-mini");
        if (speedMini) speedMini.textContent = newSpeed + " KM/H";

        var currentPower = parseInt(tCard.getAttribute("data-power"), 10) || 400;
        var powerVar = Math.floor(Math.random() * 11) - 5;
        var newPower = Math.max(100, currentPower + powerVar);
        tCard.setAttribute("data-power", newPower);

        if (tId === activeId) {
          if (focusSpeed) focusSpeed.textContent = newSpeed;
          if (focusPower) focusPower.textContent = newPower;
        }

        var state = trainStates[tId];
        if (state) {
          var nextProgress = state.progress + 1;
          if (nextProgress > 95) {
            nextProgress = 5;
            state.dir = state.dir === "forward" ? "reverse" : "forward";
          }
          state.progress = nextProgress;
        }
      });

      if (activeId) {
        updateActiveRouteTracker(activeId);

        var activeCard = document.querySelector('.train-card[data-id="' + activeId + '"]');
        if (activeCard) {
          updateCarriages(activeId, activeCard.getAttribute("data-capacity"));
        }
      }
    }, 2000);

    updateActiveRouteTracker("TRN-082");
    updateCarriages("TRN-082", "92");
  })();
})();

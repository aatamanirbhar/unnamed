/* ─────────────────────────────────────────────────────────────
   Omenly · ads + donate library
   Self-contained, no dependencies.

   Usage in any game's <head>:
     <link rel="stylesheet" href="omenly.css">
     <script>
       window.OMENLY_CONFIG = {
         game: 'echo',                      // unique key per game
         gameTitle: 'Echo',                 // user-facing
         price: 3,                          // USD to remove ads here
         allAccessPrice: 10,                // hub-only; ignored elsewhere
         isHub: false,                      // true on omenly hub only
         donateUrl: 'https://www.paypal.me/vikas117/3',
         adsense: {                         // OPTIONAL — leave undefined to skip ads
           client: 'ca-pub-XXXXXXXXXXXXXXXX',
           slot:   '1234567890'
         },
         theme: { accent: '#7fffd4' }       // optional; matches game accent
       };
     </script>
     <script src="omenly.js" defer></script>

   Then anywhere in <body>:
     <div data-omenly-ad></div>          ← ad slot (hidden if pass active)
     <button data-omenly-cta>Remove ads</button>  ← opens donate modal
     <span data-omenly-badge></span>     ← becomes "★ Ad-Free" when pass active

   Cross-deploy: when the hub has the all-access pass, tile links get
   ?omenly_pass=<token> appended. Games see the param on load, validate it,
   and store it in localStorage. Token is the literal string "omenly_all"
   for honor-mode; no signing because nothing is server-verified anyway.
   ──────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── Config defaults ──
  var cfg = Object.assign({
    game: 'unknown',
    gameTitle: 'this game',
    price: 3,
    allAccessPrice: 10,
    isHub: false,
    donateUrl: 'https://www.paypal.me/vikas117/3',
    allAccessDonateUrl: 'https://www.paypal.me/vikas117/10',
    adsense: null,
    theme: null,
    // for the hub: list of game ids that the all-access pass covers.
    // games can leave this alone.
    coveredGames: []
  }, window.OMENLY_CONFIG || {});

  // Apply theme accent if provided
  if (cfg.theme && cfg.theme.accent) {
    document.documentElement.style.setProperty('--omenly-accent', cfg.theme.accent);
  }

  // ── Storage keys ──
  var GAME_PASS_KEY = 'omenly.pass.' + cfg.game;
  var ALL_PASS_KEY  = 'omenly.pass.all';
  var URL_PARAM     = 'omenly_pass';
  var ALL_TOKEN     = 'omenly_all';     // honor token for all-access
  var GAME_TOKEN    = 'omenly_one';     // honor token for per-game

  function safeGet(k) {
    try { return localStorage.getItem(k); } catch (_) { return null; }
  }
  function safeSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (_) { return false; }
  }
  function safeDel(k) {
    try { localStorage.removeItem(k); } catch (_) {}
  }

  // ── Pass detection ──
  function hasAllAccessPass() {
    return safeGet(ALL_PASS_KEY) === ALL_TOKEN;
  }
  function hasGamePass() {
    return safeGet(GAME_PASS_KEY) === GAME_TOKEN;
  }
  function hasAnyPass() {
    return hasAllAccessPass() || hasGamePass();
  }

  // ── Import a pass from the URL (cross-deploy propagation) ──
  function importUrlToken() {
    try {
      var url = new URL(window.location.href);
      var t = url.searchParams.get(URL_PARAM);
      if (!t) return false;
      var imported = false;
      if (t === ALL_TOKEN)  { safeSet(ALL_PASS_KEY, ALL_TOKEN);  imported = true; }
      if (t === GAME_TOKEN) { safeSet(GAME_PASS_KEY, GAME_TOKEN); imported = true; }
      if (imported) {
        url.searchParams.delete(URL_PARAM);
        var clean = url.pathname + (url.searchParams.toString() ? ('?' + url.searchParams.toString()) : '') + url.hash;
        try { window.history.replaceState({}, '', clean); } catch (_) {}
        return true;
      }
    } catch (_) {}
    return false;
  }
  importUrlToken();

  // ── Append the all-access token to outbound links from the hub ──
  // The hub calls this on its game tiles so the pass propagates the
  // first time the user clicks through to each game's deploy.
  function decorateLink(href) {
    if (!hasAllAccessPass()) return href;
    try {
      var u = new URL(href, window.location.href);
      u.searchParams.set(URL_PARAM, ALL_TOKEN);
      return u.toString();
    } catch (_) {
      return href + (href.indexOf('?') >= 0 ? '&' : '?') + URL_PARAM + '=' + ALL_TOKEN;
    }
  }
  function decorateAllTileLinks(root) {
    if (!hasAllAccessPass()) return;
    var sel = (root || document).querySelectorAll('[data-omenly-tile], a[data-omenly-propagate]');
    sel.forEach(function (a) {
      if (!a.href) return;
      a.href = decorateLink(a.href);
    });
  }

  // ── Modal helpers ──
  var modalEl = null;
  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'omenly-modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.innerHTML = ''
      + '<div class="omenly-modal__card">'
      + '  <button class="omenly-modal__close" aria-label="Close" type="button">×</button>'
      + '  <div class="omenly-modal__crown" data-omenly-crown></div>'
      + '  <h2 data-omenly-title></h2>'
      + '  <p data-omenly-body></p>'
      + '  <a class="omenly-modal__btn" data-omenly-pay target="_blank" rel="noopener"></a>'
      + '  <div class="omenly-modal__sep">then</div>'
      + '  <button class="omenly-modal__btn omenly-modal__btn--ghost" data-omenly-confirm type="button">I donated — turn off ads</button>'
      + '  <small>'
      + '    This is the honor system. Anyone can click the second button — but if you\'re here, you\'re probably the kind of person who actually paid. Thanks. The pass lives in your browser.'
      + '  </small>'
      + '</div>';
    document.body.appendChild(modalEl);

    modalEl.querySelector('.omenly-modal__close').addEventListener('click', closeModal);
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl.classList.contains('on')) closeModal();
    });
    modalEl.querySelector('[data-omenly-confirm]').addEventListener('click', function () {
      if (modalEl._mode === 'all') {
        safeSet(ALL_PASS_KEY, ALL_TOKEN);
      } else {
        safeSet(GAME_PASS_KEY, GAME_TOKEN);
      }
      closeModal();
      toast(modalEl._mode === 'all' ? 'All-access pass active. Thank you.' : 'Ads off. Thank you.');
      reflectPass();
    });
    return modalEl;
  }
  function openModal(mode) {
    var el = ensureModal();
    el._mode = mode === 'all' ? 'all' : 'one';
    var crown = el.querySelector('[data-omenly-crown]');
    var title = el.querySelector('[data-omenly-title]');
    var body  = el.querySelector('[data-omenly-body]');
    var pay   = el.querySelector('[data-omenly-pay]');
    if (el._mode === 'all') {
      crown.textContent = 'OMENLY · ALL-ACCESS';
      title.textContent = 'Remove ads everywhere';
      body.innerHTML = 'One <strong>$' + cfg.allAccessPrice + '</strong> donation removes ads on every game on Omenly — current and future. The pass lives in your browser; click through to each game once and it carries over.';
      pay.textContent = 'Donate $' + cfg.allAccessPrice + ' via PayPal';
      pay.href = cfg.allAccessDonateUrl;
    } else {
      crown.textContent = 'SUPPORT · ' + (cfg.gameTitle || 'THIS GAME').toUpperCase();
      title.textContent = 'Remove ads on ' + (cfg.gameTitle || 'this game');
      body.innerHTML = 'A one-time <strong>$' + cfg.price + '</strong> donation turns ads off for ' + (cfg.gameTitle || 'this game') + ' in this browser, forever.';
      pay.textContent = 'Donate $' + cfg.price + ' via PayPal';
      pay.href = cfg.donateUrl;
    }
    el.classList.add('on');
    setTimeout(function () { pay.focus(); }, 30);
  }
  function closeModal() {
    if (modalEl) modalEl.classList.remove('on');
  }

  // ── Toast ──
  var toastEl = null;
  function toast(msg, err) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'omenly-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle('err', !!err);
    toastEl.classList.add('on');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  // ── AdSense loader ──
  var adsenseLoaded = false;
  function loadAdSenseOnce() {
    if (adsenseLoaded || !cfg.adsense || !cfg.adsense.client) return;
    adsenseLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.adsense.client);
    document.head.appendChild(s);
  }

  function renderAdSlot(el) {
    if (hasAnyPass()) { el.classList.add('omenly-empty'); el.innerHTML = ''; return; }
    if (!cfg.adsense || !cfg.adsense.client || !cfg.adsense.slot) {
      // No AdSense configured: render a soft placeholder that doubles as a CTA.
      el.classList.remove('omenly-empty');
      el.innerHTML = ''
        + '<span class="omenly-ad-label">advertisement</span>'
        + '<div style="border:1px dashed rgba(244,236,247,0.18);padding:14px;text-align:center;font-family:Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:rgba(244,236,247,0.55);">'
        + '  <div style="margin-bottom:8px;">— ad space —</div>'
        + '  <button class="omenly-cta-chip" type="button" data-omenly-open-modal>Remove ads · $' + cfg.price + '</button>'
        + '</div>';
      el.querySelector('[data-omenly-open-modal]').addEventListener('click', function () { openModal(cfg.isHub ? 'all' : 'one'); });
      return;
    }
    // Real AdSense slot
    loadAdSenseOnce();
    el.classList.remove('omenly-empty');
    el.innerHTML = ''
      + '<span class="omenly-ad-label">advertisement</span>'
      + '<ins class="adsbygoogle" style="display:block" data-ad-client="' + cfg.adsense.client + '" data-ad-slot="' + cfg.adsense.slot + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
  }

  // ── Bind CTAs, badges, ad slots ──
  function reflectPass() {
    // Ad slots
    document.querySelectorAll('[data-omenly-ad]').forEach(renderAdSlot);

    // Badges
    document.querySelectorAll('[data-omenly-badge]').forEach(function (el) {
      if (hasAnyPass()) {
        el.classList.add('omenly-badge');
        el.textContent = hasAllAccessPass() ? 'All-access' : 'Ad-Free';
      } else {
        el.classList.remove('omenly-badge');
        el.textContent = '';
      }
    });

    // CTA buttons: hide if pass active (the badge takes its place)
    document.querySelectorAll('[data-omenly-cta]').forEach(function (el) {
      if (hasAnyPass()) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
        if (!el.textContent.trim()) {
          el.textContent = cfg.isHub
            ? 'All-access · $' + cfg.allAccessPrice
            : 'Remove ads · $' + cfg.price;
        }
      }
    });

    // Re-decorate tile links every time pass changes
    decorateAllTileLinks(document);
  }

  function bindCtas() {
    document.querySelectorAll('[data-omenly-cta]').forEach(function (el) {
      if (el._omenlyBound) return;
      el._omenlyBound = true;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(cfg.isHub ? 'all' : 'one');
      });
    });
  }

  // ── Reset (handy for support page / debugging) ──
  function reset() {
    safeDel(GAME_PASS_KEY);
    safeDel(ALL_PASS_KEY);
    toast('Pass cleared.');
    reflectPass();
  }

  // ── Public API ──
  window.Omenly = {
    config: cfg,
    hasPass: hasAnyPass,
    hasAllAccessPass: hasAllAccessPass,
    hasGamePass: hasGamePass,
    open: openModal,
    reset: reset,
    refresh: reflectPass,
    decorateLink: decorateLink,
    decorateAll: decorateAllTileLinks
  };

  // ── Boot ──
  function boot() {
    bindCtas();
    reflectPass();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

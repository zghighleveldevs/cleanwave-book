/* CleanWave KC funnel: multi-step quote form + FAQ accordion.
 *
 * GHL_WEBHOOK_URL: paste the URL of a GoHighLevel "Inbound Webhook" workflow trigger here
 * so every submission (with all quiz answers + UTM params) creates/updates the contact in GHL.
 * Leave it empty and the form simply forwards the visitor to the booking calendar.
 */
var GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/JgqazA9K8zxUtR2rZezR/webhook-trigger/d50bf8da-8275-4fed-9d60-32f199e4148f';
var BOOKING_PAGE = 'book.html';

(function () {
  var form = document.getElementById('qf');
  if (!form) return;
  var TOTAL = 7;
  var answers = {};
  var current = '1';
  var history = [];
  var autoTimer;

  function stepEl(id) { return form.querySelector('[data-step="' + id + '"]'); }
  function errEl() { return stepEl(current).querySelector('.err'); }
  function showErr(msg) { var e = errEl(); if (e) { e.textContent = msg; e.hidden = false; } }
  function hideErr() { var e = errEl(); if (e) e.hidden = true; }

  function setProgress() {
    var n = parseInt(current, 10);
    var progress = document.getElementById('qf-progress');
    progress.hidden = current === 'res';
    if (current === 'res') return;
    document.getElementById('qf-steplabel').textContent = 'Question ' + n + ' of ' + TOTAL;
    var pct = Math.round(((n - 1) / TOTAL) * 100);
    document.getElementById('qf-pct').textContent = pct + '% done';
    document.getElementById('qf-bar').style.width = Math.max(6, ((n - 0.5) / TOTAL) * 100) + '%';
  }

  function go(id, isBack) {
    clearTimeout(autoTimer);
    hideErr();
    if (!isBack) history.push(current);
    stepEl(current).hidden = true;
    current = String(id);
    var el = stepEl(current);
    el.hidden = false;
    // replay the entrance animation
    el.classList.remove('stepin'); void el.offsetWidth; el.classList.add('stepin');
    setProgress();
    var input = el.querySelector('input:not([type=checkbox])');
    if (input && window.matchMedia('(pointer: fine)').matches) setTimeout(function () { input.focus(); }, 350);
    var top = form.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) {
      document.getElementById('quote').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function next() {
    var n = parseInt(current, 10);
    if (current === '1' && answers.facility === 'Residential home') return go('res');
    if (n < TOTAL) go(n + 1);
  }

  // Single-choice questions: pick = save + move on automatically
  form.querySelectorAll('[data-group]').forEach(function (group) {
    var key = group.getAttribute('data-group');
    group.querySelectorAll('button').forEach(function (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        group.querySelectorAll('button').forEach(function (b) {
          b.classList.remove('tile-on', 'chip-on');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add(btn.classList.contains('tile') ? 'tile-on' : 'chip-on');
        btn.setAttribute('aria-pressed', 'true');
        answers[key] = btn.getAttribute('data-v') || btn.textContent.trim();
        hideErr();
        var at = current;
        clearTimeout(autoTimer);
        autoTimer = setTimeout(function () { if (current === at) next(); }, 450);
      });
    });
  });

  // Back buttons
  form.querySelectorAll('[data-back]').forEach(function (b) {
    b.addEventListener('click', function () { if (history.length) go(history.pop(), true); });
  });
  // Residential screen: start over
  form.querySelectorAll('[data-reset-res]').forEach(function (b) {
    b.addEventListener('click', function () {
      delete answers.facility;
      form.querySelectorAll('[data-group="facility"] button').forEach(function (x) { x.classList.remove('tile-on'); x.setAttribute('aria-pressed', 'false'); });
      history = [];
      go(1, true);
    });
  });

  // ZIP question
  function zipNext() {
    var zip = form.postal_code.value.trim();
    if (!/^\d{5}$/.test(zip)) { form.postal_code.focus(); return showErr('Enter your 5-digit ZIP code.'); }
    answers.postal_code = zip;
    next();
  }
  form.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', zipNext); });
  form.postal_code.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 5);
    hideErr();
  });
  form.postal_code.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); zipNext(); }
  });

  setProgress();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form;
    var missing = ['first_name', 'last_name', 'company_name', 'email', 'phone'].filter(function (n) { return !f[n].value.trim(); });
    if (missing.length) { f[missing[0]].focus(); return showErr('Please fill in all the fields so Justin can reach you.'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) { f.email.focus(); return showErr('Enter a valid email address.'); }
    if (f.phone.value.replace(/\D/g, '').length < 10) { f.phone.focus(); return showErr('Enter a 10-digit phone number.'); }

    var data = {
      first_name: f.first_name.value.trim(),
      last_name: f.last_name.value.trim(),
      company_name: f.company_name.value.trim(),
      email: f.email.value.trim(),
      phone: f.phone.value.trim(),
      role: f.role.value,
      postal_code: f.postal_code.value.trim(),
      sms_consent: f.sms_consent.checked ? 'yes' : 'no',
      source: 'Walkthrough Funnel'
    };
    Object.keys(answers).forEach(function (k) { data[k] = answers[k]; });
    var page = new URLSearchParams(window.location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'].forEach(function (k) { if (page.get(k)) data[k] = page.get(k); });

    // Contact details are passed to the booking widget so they're pre-filled.
    var q = new URLSearchParams({
      first_name: data.first_name, last_name: data.last_name, email: data.email,
      phone: data.phone, company_name: data.company_name
    });
    var next = BOOKING_PAGE + '?' + q.toString();

    var btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    if (!GHL_WEBHOOK_URL) { window.location.href = next; return; }
    fetch(GHL_WEBHOOK_URL, {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(function () {}).then(function () { window.location.href = next; });
  });
})();

// 3D parallax: the decorations (building, bubbles, spray bottle) drift with the mouse.
// The form card itself stays still so clicks always land where people aim.
(function () {
  var wrap = document.getElementById('quote');
  if (!wrap || !window.matchMedia) return;
  if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var scene = wrap.querySelector('.scene');
  var art = wrap.querySelector('.cf-head-art');
  var raf;
  wrap.addEventListener('mousemove', function (e) {
    var r = wrap.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5;
    var y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      if (scene) scene.style.transform = 'translate3d(' + (x * -14).toFixed(1) + 'px,' + (y * -10).toFixed(1) + 'px,0)';
      if (art) art.style.transform = 'translate3d(' + (x * 10).toFixed(1) + 'px,' + (y * 6).toFixed(1) + 'px,0) rotateY(' + (x * 14).toFixed(1) + 'deg)';
    });
  });
  wrap.addEventListener('mouseleave', function () {
    cancelAnimationFrame(raf);
    if (scene) scene.style.transform = '';
    if (art) art.style.transform = '';
  });
})();

// FAQ accordion: one open at a time
(function () {
  var faq = document.getElementById('faq');
  if (!faq) return;
  var qs = faq.querySelectorAll('.faq-q');
  qs.forEach(function (q) {
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      qs.forEach(function (o) {
        o.setAttribute('aria-expanded', 'false');
        o.querySelector('.faq-ic').classList.remove('open');
        o.nextElementSibling.hidden = true;
      });
      if (!open) {
        q.setAttribute('aria-expanded', 'true');
        q.querySelector('.faq-ic').classList.add('open');
        q.nextElementSibling.hidden = false;
      }
    });
  });
})();

// Scroll reveal fallback for browsers without CSS scroll-driven animations
(function () {
  if (window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) return;
  if (!('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll('.rv');
  els.forEach(function (el) { el.classList.add('rv-js'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('rv-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(function (el) { io.observe(el); });
})();

// 3D review carousel: rotating ring of Google reviews (desktop); swipeable row on phones
(function () {
  var ring = document.getElementById('ring');
  if (!ring) return;
  var cards = ring.querySelectorAll('.rcard');
  var n = cards.length, step = 360 / n, idx = 0, timer;
  var dotsWrap = document.getElementById('ring-dots');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dots = [];
  for (var i = 0; i < n; i++) {
    (function (k) {
      var d = document.createElement('button');
      d.type = 'button'; d.className = 'ring-dot';
      d.setAttribute('aria-label', 'Show review ' + (k + 1) + ' of ' + n);
      d.addEventListener('click', function () { show(k); restart(); });
      dotsWrap.appendChild(d); dots.push(d);
    })(i);
  }
  var turns = 0; // keep rotating in one direction without unwinding
  function show(k) {
    var prev = idx;
    idx = (k + n) % n;
    var delta = idx - prev;
    if (delta > n / 2) delta -= n;
    if (delta < -n / 2) delta += n;
    turns += delta;
    ring.style.setProperty('--rot', (-turns * step) + 'deg');
    cards.forEach(function (c, j) { c.classList.toggle('is-front', j === idx); c.setAttribute('aria-hidden', j === idx ? 'false' : 'true'); });
    dots.forEach(function (d, j) { d.classList.toggle('on', j === idx); });
  }
  function restart() {
    clearInterval(timer);
    if (!reduce) timer = setInterval(function () { show(idx + 1); }, 4500);
  }
  document.getElementById('ring-prev').addEventListener('click', function () { show(idx - 1); restart(); });
  document.getElementById('ring-next').addEventListener('click', function () { show(idx + 1); restart(); });
  var stage = document.getElementById('ring-stage');
  stage.addEventListener('mouseenter', function () { clearInterval(timer); });
  stage.addEventListener('mouseleave', restart);
  // swipe on touch devices with the 3D ring
  var sx = null;
  stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 40 && window.innerWidth > 760) { show(idx + (dx < 0 ? 1 : -1)); restart(); }
  });
  show(0);
  if (window.innerWidth > 760) restart();
  else cards.forEach(function (c) { c.removeAttribute('aria-hidden'); });
})();

// Industries: glass cards flip in on scroll, tilt in 3D toward the cursor, light follows the mouse
(function () {
  var cards = document.querySelectorAll('.gcard');
  if (!cards.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { cards.forEach(function (c) { c.classList.add('in'); c.style.opacity = 1; }); }
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    cards.forEach(function (c) { io.observe(c); });
  }
  if (reduce || !window.matchMedia('(pointer: fine)').matches) return;
  cards.forEach(function (c) {
    var raf;
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        c.style.animation = 'none'; c.style.opacity = 1;
        c.style.transform = 'rotateY(' + ((x - 0.5) * 14).toFixed(2) + 'deg) rotateX(' + ((0.5 - y) * 12).toFixed(2) + 'deg) translateZ(10px)';
        c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
    });
    c.addEventListener('mouseleave', function () { cancelAnimationFrame(raf); c.style.transform = 'none'; });
  });
})();

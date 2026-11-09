/* CleanWave KC funnel: multi-step quote form + FAQ accordion.
 *
 * GHL_WEBHOOK_URL: paste the URL of a GoHighLevel "Inbound Webhook" workflow trigger here
 * so every submission (with all quiz answers + UTM params) creates/updates the contact in GHL.
 * Leave it empty and the form simply forwards the visitor to the booking calendar.
 */
var GHL_WEBHOOK_URL = '';
var BOOKING_PAGE = 'book.html';

(function () {
  var form = document.getElementById('qf');
  if (!form) return;
  var answers = {};
  var current = '1';
  var autoTimer;

  // Single-select option groups (tiles / chips)
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
        // Step 1: once both questions are answered, move on automatically
        if (current === '1' && answers.facility && answers.frequency && (key === 'facility' || key === 'frequency')) {
          clearTimeout(autoTimer);
          autoTimer = setTimeout(function () { if (current === '1') next1(); }, 650);
        }
      });
    });
  });

  function stepEl(id) { return form.querySelector('[data-step="' + id + '"]'); }
  function errEl() { return stepEl(current).querySelector('.err'); }
  function showErr(msg) { var e = errEl(); if (e) { e.textContent = msg; e.hidden = false; } }
  function hideErr() { var e = errEl(); if (e) e.hidden = true; }

  function go(id) {
    hideErr();
    stepEl(current).hidden = true;
    current = String(id);
    stepEl(current).hidden = false;
    var progress = document.getElementById('qf-progress');
    progress.hidden = current === 'res';
    if (current !== 'res') {
      document.getElementById('qf-steplabel').textContent = 'Step ' + current + ' of 3';
      document.getElementById('qf-bar').style.width = { '1': '33.4%', '2': '66.7%', '3': '100%' }[current];
      var n = parseInt(current, 10);
      form.querySelectorAll('.stepper .sp').forEach(function (li, i) {
        li.classList.toggle('sp-on', i + 1 === n);
        li.classList.toggle('sp-done', i + 1 < n);
        li.querySelector('.sp-n').innerHTML = i + 1 < n ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' : String(i + 1);
      });
    }
    var first = stepEl(current).querySelector('input, button');
    if (first && window.innerWidth < 900) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.hasAttribute('data-reset-res')) {
        delete answers.facility;
        form.querySelectorAll('[data-group="facility"] button').forEach(function (x) { x.classList.remove('tile-on'); x.setAttribute('aria-pressed', 'false'); });
      }
      go(b.getAttribute('data-go'));
    });
  });

  function next1() {
    if (!answers.facility || !answers.frequency) return showErr('Pick your facility type and how often you need cleaning.');
    go(answers.facility === 'Residential home' ? 'res' : 2);
  }
  form.querySelector('[data-next="1"]').addEventListener('click', function () { clearTimeout(autoTimer); next1(); });

  form.querySelector('[data-next="2"]').addEventListener('click', function () {
    if (!answers.square_footage || !answers.start_timeline) return showErr('Pick a square footage and a start time.');
    var zip = form.postal_code.value.trim();
    if (zip && !/^\d{5}$/.test(zip)) return showErr('Enter a 5-digit ZIP code.');
    go(3);
  });

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
      method: 'POST', mode: 'no-cors', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(function () {}).then(function () { window.location.href = next; });
  });
})();

// Gentle 3D tilt of the form card following the mouse (desktop, motion allowed)
(function () {
  var wrap = document.getElementById('quote');
  var card = wrap && wrap.querySelector('.card-glow');
  if (!card || !window.matchMedia) return;
  if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var raf;
  wrap.addEventListener('mousemove', function (e) {
    var r = wrap.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5;
    var y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      card.style.transform = 'rotateY(' + (x * 5).toFixed(2) + 'deg) rotateX(' + (-y * 4).toFixed(2) + 'deg)';
    });
  });
  wrap.addEventListener('mouseleave', function () { cancelAnimationFrame(raf); card.style.transform = ''; });
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

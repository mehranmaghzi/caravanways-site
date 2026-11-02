(function () {
  // ---------- راهنمای نام کشور/منطقه زیر نشانگر
  var tip = null;
  document.querySelectorAll('.map-stage .map').forEach(function (svg) {
    svg.addEventListener('mousemove', function (e) {
      var path = e.target.closest && e.target.closest('[data-name]');
      var name = path && path.getAttribute('data-name');
      if (!name) { hide(); return; }
      if (!tip) { tip = document.createElement('div'); tip.className = 'map-tip'; document.body.appendChild(tip); }
      tip.textContent = name;
      tip.style.left = e.clientX + 'px';
      tip.style.top = e.clientY + 'px';
      tip.hidden = false;
    });
    svg.addEventListener('mouseleave', hide);
  });
  function hide() { if (tip) tip.hidden = true; }

  // ---------- بستن منوی زبان با کلیک بیرون
  document.addEventListener('click', function (e) {
    document.querySelectorAll('details.langs[open]').forEach(function (d) {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });

  // ---------- جستجو، سمت مرورگر (تا روی نسخهٔ ایستا هم کار کند)
  var cfg = window.SEARCH_I18N;
  var box = document.querySelector('.search-box input[name=q]');
  var out = document.getElementById('search-results');
  var status = document.getElementById('search-status');
  if (!cfg || !box || !out) return;

  var rows = null, pending = null;
  function load() {
    if (rows) return Promise.resolve(rows);
    return fetch(cfg.index).then(function (r) { return r.json(); }).then(function (d) { rows = d; return d; });
  }

  // متن را برای مقایسه ساده می‌کند: حروف کوچک، بدون اعراب، با «ی/ک» یکدست
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[ً-ْ‌]/g, '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function render(q) {
    var query = norm(q).trim();
    if (!query) { out.innerHTML = ''; status.textContent = cfg.hint; return; }
    load().then(function (data) {
      var words = query.split(/\s+/);
      var hits = data.filter(function (r) {
        var hay = norm([r.t, r.s, r.a, r.c, r.r].join(' '));
        return words.every(function (w) { return hay.indexOf(w) >= 0; });
      });
      status.textContent = hits.length ? cfg.results.replace('{n}', hits.length.toLocaleString(cfg.lang === 'fa' ? 'fa-IR' : cfg.lang)) : cfg.none;
      out.innerHTML = hits.map(function (r) {
        var img = r.i
          ? '<img class="card-img" src="/media/' + r.i + '-sm.webp" alt="" loading="lazy">'
          : '<span class="card-img noimg"></span>';
        return '<article class="card"><a class="card-link" href="' + r.u + '">' + img +
          '<span class="card-body"><span class="meta">' + esc(r.c) + (r.r ? ' · ' + esc(r.r) : '') + '</span>' +
          '<span class="card-title">' + esc(r.t) + '</span>' +
          (r.s ? '<span class="summary">' + esc(r.s) + '</span>' : '') +
          '<span class="meta">' + esc(r.a) + '</span></span></a></article>';
      }).join('');
    }).catch(function () { status.textContent = cfg.none; });
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // فرم جستجو در این صفحه بدون رفت‌وبرگشت به سرور کار می‌کند
  box.form.addEventListener('submit', function (e) {
    e.preventDefault();
    history.replaceState(null, '', box.value ? '?q=' + encodeURIComponent(box.value) : location.pathname);
    render(box.value);
  });
  box.addEventListener('input', function () {
    clearTimeout(pending);
    pending = setTimeout(function () { render(box.value); }, 150);
  });

  var initial = new URLSearchParams(location.search).get('q');
  if (initial) { box.value = initial; render(initial); }
  box.focus();
})();

// ---------- عضویت در خبرنامه (صفحهٔ /subscribe/)
(function () {
  var cfg = window.SUBSCRIBE_I18N;
  var form = document.getElementById('subscribe-form');
  var confirmForm = document.getElementById('confirm-form');
  var note = document.getElementById('subscribe-note');
  if (!cfg || !form) return;
  var email = '';

  function say(text, kind) {
    note.textContent = text;
    note.className = 'form-note ' + (kind || '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = { name: form.name.value.trim(), email: form.email.value.trim(), lang: cfg.lang };
    if (!data.name || !data.email) return;
    say('…');
    fetch('/api/subscribe', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
    }).then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (res) {
        if (!res.ok) return say(cfg.failed, 'bad');
        if (res.b.already) return say(cfg.already, 'ok');
        email = data.email;
        form.hidden = true;
        confirmForm.hidden = false;
        say(cfg.sent);
        confirmForm.code.focus();
      }).catch(function () { say(cfg.failed, 'bad'); });
  });

  confirmForm.addEventListener('submit', function (e) {
    e.preventDefault();
    say('…');
    fetch('/api/subscribe/confirm', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email, code: confirmForm.code.value.trim() }),
    }).then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (res) {
        if (!res.ok) return say(cfg.wrong, 'bad');
        confirmForm.hidden = true;
        say(cfg.done, 'ok');
      }).catch(function () { say(cfg.failed, 'bad'); });
  });
})();

// ---------- لایک و نظر (صفحهٔ سفرنامه)
(function () {
  var cfg = window.SOCIAL_I18N;
  if (!cfg) return;

  var btn = document.querySelector('.like-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      btn.disabled = true;
      fetch('/api/posts/' + encodeURIComponent(btn.dataset.post) + '/like', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          btn.classList.toggle('on', d.mine);
          btn.setAttribute('aria-pressed', d.mine ? 'true' : 'false');
          btn.querySelector('.heart').textContent = d.mine ? '♥' : '♡';
          btn.querySelector('.like-label').textContent = d.mine ? cfg.liked : cfg.like;
          btn.querySelector('.like-count').textContent =
            Number(d.count).toLocaleString(cfg.lang === 'fa' ? 'fa-IR' : cfg.lang);
        })
        .catch(function () {})
        .then(function () { btn.disabled = false; });
    });
  }

  var form = document.getElementById('comment-form');
  var note = document.getElementById('comment-note');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = { name: form.name.value.trim(), body: form.body.value.trim(), lang: cfg.lang };
    if (!body.name || !body.body) return;
    note.textContent = '…';
    note.className = 'form-note';
    fetch('/api/posts/' + encodeURIComponent(form.dataset.post) + '/comments', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error('failed');
      form.reset();
      note.textContent = cfg.thanks;
      note.className = 'form-note ok';
    }).catch(function () {
      note.textContent = cfg.failed;
      note.className = 'form-note bad';
    });
  });
})();

// ---------- فرستادن سفرنامه برای دیگران
(function () {
  var btn = document.querySelector('.share .sh-copy');
  if (!btn) return;
  var canShare = typeof navigator.share === 'function';
  if (canShare) btn.textContent = btn.dataset.share;

  btn.addEventListener('click', function () {
    if (canShare) {
      navigator.share({ title: btn.dataset.title, url: btn.dataset.url }).catch(function () {});
      return;
    }
    copy(btn.dataset.url).then(function () {
      btn.textContent = btn.dataset.copied;
      btn.classList.add('done');
      setTimeout(function () {
        btn.textContent = btn.dataset.copy;
        btn.classList.remove('done');
      }, 2000);
    });
  });

  // روی http (بدون گواهی) کلیپ‌بورد مرورگر کار نمی‌کند؛ راه قدیمی جایگزینش است
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* بی‌خیال */ }
      document.body.removeChild(ta);
      resolve();
    });
  }
})();

// ---------- درخواست نویسندگی
// فرم با multipart می‌رود، چون ممکن است عکس هم داشته باشد. اول یک کد به ایمیل
// می‌رود تا مطمئن شویم نشانی مال خودش است؛ بعد مدیر درخواست را می‌بیند.
(function () {
  var cfg = window.APPLY_I18N;
  var form = document.getElementById('apply-form');
  var confirmForm = document.getElementById('apply-confirm');
  var note = document.getElementById('apply-note');
  if (!cfg || !form) return;
  var email = '';
  var MAX_PHOTO = 10 * 1024 * 1024;

  function say(text, kind) {
    note.textContent = text;
    note.className = 'form-note ' + (kind || '');
  }

  /** وقتی روی نسخهٔ ایستا باز شده، فرستادن ممکن نیست؛ راه سایت اصلی را نشان بده */
  function offsite() {
    note.textContent = cfg.offsite + ' ';
    note.className = 'form-note bad';
    var a = document.createElement('a');
    a.href = cfg.offsiteUrl;
    a.textContent = cfg.offsiteUrl;
    note.appendChild(a);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var photo = form.photo.files[0];
    if (photo && photo.size > MAX_PHOTO) return say(cfg.tooBig, 'bad');

    var data = new FormData();
    data.append('name', form.name.value.trim());
    data.append('email', form.email.value.trim());
    data.append('lang_native', form.lang_native.value);
    data.append('lang_form', cfg.lang);
    data.append('country', form.country.value);
    data.append('about', form.about.value.trim());
    data.append('links', form.links.value.trim());
    if (photo) data.append('photo', photo);
    if (!data.get('name') || !data.get('email') || !data.get('lang_native') || !data.get('about')) return;

    say('…');
    fetch('/api/apply', { method: 'POST', body: data })
      .then(function (r) {
        if (r.status === 404) return { offsite: true };
        return r.json().then(function (b) { return { ok: r.ok, b: b }; });
      })
      .then(function (res) {
        if (res.offsite) return offsite();
        if (!res.ok) return say(res.b && res.b.error === 'photo' ? cfg.tooBig : cfg.failed, 'bad');
        if (res.b.already) return say(cfg.already, 'ok');
        email = form.email.value.trim();
        form.hidden = true;
        confirmForm.hidden = false;
        say(cfg.sent);
        confirmForm.code.focus();
      })
      .catch(function () { say(cfg.failed, 'bad'); });
  });

  confirmForm.addEventListener('submit', function (e) {
    e.preventDefault();
    say('…');
    fetch('/api/apply/confirm', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email, code: confirmForm.code.value.trim() }),
    }).then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (res) {
        if (!res.ok) return say(cfg.wrong, 'bad');
        confirmForm.hidden = true;
        say(cfg.done, 'ok');
      }).catch(function () { say(cfg.failed, 'bad'); });
  });
})();

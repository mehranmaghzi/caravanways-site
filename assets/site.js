(function () {
  // ---------- راهنمای نام کشور/منطقه زیر نشانگر
  var tip = null;
  document.querySelectorAll('.map-stage .map').forEach(function (svg) {
    svg.addEventListener('mousemove', function (e) {
      var path = e.target.closest && e.target.closest('.place');
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

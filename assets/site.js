// نام استان/کشور زیر نشانگر، روی نقشه‌های کلیک‌پذیر
(function () {
  var tip = null;
  document.querySelectorAll('.map-wrap .map').forEach(function (svg) {
    svg.addEventListener('mousemove', function (e) {
      var path = e.target.closest && e.target.closest('.place');
      if (!path) { hide(); return; }
      var name = path.getAttribute('data-name');
      if (!name) return;
      if (!tip) { tip = document.createElement('div'); tip.className = 'map-tip'; document.body.appendChild(tip); }
      tip.textContent = name;
      tip.style.left = e.clientX + 'px';
      tip.style.top = e.clientY + 'px';
      tip.hidden = false;
    });
    svg.addEventListener('mouseleave', hide);
    // راهنمای پیش‌فرض مرورگر (title) با راهنمای خودمان دوتا می‌شد؛ متنش را نگه دار و حذفش کن
    svg.querySelectorAll('.place > title').forEach(function (t) {
      t.parentNode.setAttribute('data-name', t.textContent);
      t.remove();
    });
  });
  function hide() { if (tip) tip.hidden = true; }

  // بستن منوی زبان با کلیک بیرون از آن
  document.addEventListener('click', function (e) {
    document.querySelectorAll('details.langs[open]').forEach(function (d) {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });
})();

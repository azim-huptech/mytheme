/* Small vanilla behaviours for the custom mens sections */
(function () {
  // ---- Hero slider ----
  document.querySelectorAll('[data-mens-hero]').forEach((hero) => {
    const track = hero.querySelector('[data-mens-hero-track]');
    const slides = hero.querySelectorAll('[data-mens-hero-slide]');
    const dotsWrap = hero.querySelector('[data-mens-hero-dots]');
    const prev = hero.querySelector('[data-mens-hero-prev]');
    const next = hero.querySelector('[data-mens-hero-next]');
    if (!track || slides.length === 0) return;

    let index = 0;
    let timer = null;
    const auto = hero.dataset.autoplay === 'true';
    const interval = parseInt(hero.dataset.interval || '6000', 10);

    const dots = [];
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mens-hero__dot' + (i === 0 ? ' is-active' : '');
      b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      b.addEventListener('click', () => go(i, true));
      dotsWrap && dotsWrap.appendChild(b);
      dots.push(b);
    });

    function go(i, user) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle('is-active', di === index));
      if (user) resetAuto();
    }
    function resetAuto() { if (timer) { clearInterval(timer); start(); } }
    function start() { if (auto) timer = setInterval(() => go(index + 1), interval); }

    prev && prev.addEventListener('click', () => go(index - 1, true));
    next && next.addEventListener('click', () => go(index + 1, true));
    start();
  });

  // ---- Featured tabs ----
  document.querySelectorAll('[data-mens-tabs]').forEach((tabs) => {
    const buttons = tabs.querySelectorAll('[data-mens-tab-btn]');
    const panels = tabs.querySelectorAll('[data-mens-tab-panel]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
        panels.forEach((p) => p.classList.toggle('is-active', p.dataset.key === key));
      });
    });
  });

  // ---- Horizontal scroll (collection showcase) ----
  document.querySelectorAll('[data-mens-scroll]').forEach((wrap) => {
    const scroll = wrap.querySelector('[data-mens-scroll-track]');
    const prev = wrap.querySelector('[data-mens-scroll-prev]');
    const next = wrap.querySelector('[data-mens-scroll-next]');
    if (!scroll) return;
    const step = () => Math.max(260, scroll.clientWidth * 0.6);
    prev && prev.addEventListener('click', () => scroll.scrollBy({ left: -step(), behavior: 'smooth' }));
    next && next.addEventListener('click', () => scroll.scrollBy({ left: step(), behavior: 'smooth' }));
  });

  // ---- Header: mobile nav + search toggle ----
  document.querySelectorAll('[data-mens-header]').forEach((h) => {
    const burger = h.querySelector('[data-mens-burger]');
    const nav = h.querySelector('[data-mens-nav]');
    const searchBtn = h.querySelector('[data-mens-search-btn]');
    const search = h.querySelector('[data-mens-search]');
    burger && burger.addEventListener('click', () => nav && nav.classList.toggle('is-open'));
    searchBtn && searchBtn.addEventListener('click', () => {
      if (!search) return;
      search.classList.toggle('is-open');
      if (search.classList.contains('is-open')) {
        const i = search.querySelector('input'); i && i.focus();
      }
    });
  });

  // ---- Cart free-shipping bar ----
  document.querySelectorAll('[data-mens-shipbar]').forEach((el) => {
    const threshold = parseFloat(el.dataset.threshold || '0');
    const subtotal = parseFloat(el.dataset.subtotal || '0');
    if (!threshold) return;
    const pct = Math.min(100, (subtotal / threshold) * 100);
    const fill = el.querySelector('[data-mens-shipbar-fill]');
    const msg = el.querySelector('[data-mens-shipbar-msg]');
    if (fill) fill.style.width = pct + '%';
    if (msg && subtotal >= threshold) msg.textContent = el.dataset.msgDone || 'You unlocked free shipping!';
  });
})();

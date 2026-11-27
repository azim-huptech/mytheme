/* Mens store – behaviours for collection, product, cart and account pages */
(function () {
  'use strict';

  function toast(msg) {
    let t = document.querySelector('.mens-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'mens-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('is-show'), 2200);
  }

  /* ---------------------------------------------------------
     COLLECTION – filter form, drawer, pills, swatch preview
     --------------------------------------------------------- */
  document.querySelectorAll('[data-mens-collection]').forEach((root) => {
    const form = root.querySelector('[data-mens-filter-form]');
    const panel = root.querySelector('[data-mens-filter-panel]');
    const backdrop = root.querySelector('[data-mens-backdrop]');

    function submit() {
      if (!form) return;
      const params = new URLSearchParams();
      // Include inputs that live outside the form via form="" attribute
      const fd = new FormData(form);
      for (const [k, v] of fd.entries()) {
        if (String(v).trim() !== '') params.append(k, v);
      }
      root.classList.add('is-loading');
      const qs = params.toString();
      window.location.href = form.getAttribute('action') + (qs ? '?' + qs : '');
    }

    if (form) {
      form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
      // Auto-apply checkbox changes, sort and in-stock (desktop). On mobile, wait for "Apply".
      const isDrawer = () => window.matchMedia('(max-width: 989px)').matches && panel && panel.classList.contains('is-open');
      document.addEventListener('change', (e) => {
        const el = e.target;
        if (!(el instanceof HTMLElement)) return;
        const belongs = el.form === form;
        if (!belongs) return;
        if (el.matches('[data-mens-price]')) return; // price applies with its button
        if (isDrawer() && !el.matches('[data-mens-autosubmit]')) return;
        submit();
      });
    }

    function openPanel(groupId) {
      if (!panel) return;
      if (window.matchMedia('(max-width: 989px)').matches) {
        panel.classList.add('is-open');
        backdrop && backdrop.classList.add('is-open');
        document.documentElement.style.overflow = 'hidden';
      }
      if (groupId) {
        const g = panel.querySelector('#' + CSS.escape(groupId));
        if (g) {
          g.open = true;
          g.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const inp = g.querySelector('input');
          inp && setTimeout(() => inp.focus({ preventScroll: true }), 300);
        }
      }
    }
    function closePanel() {
      panel && panel.classList.remove('is-open');
      backdrop && backdrop.classList.remove('is-open');
      document.documentElement.style.overflow = '';
    }
    root.querySelectorAll('[data-mens-filter-open]').forEach((b) =>
      b.addEventListener('click', () => openPanel(b.dataset.target))
    );
    root.querySelectorAll('[data-mens-filter-close]').forEach((b) => b.addEventListener('click', closePanel));
    backdrop && backdrop.addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

    // Only one pill dropdown open; close on outside click
    const pills = root.querySelectorAll('[data-mens-pill]');
    pills.forEach((p) =>
      p.addEventListener('toggle', () => {
        if (p.open) pills.forEach((o) => { if (o !== p) o.open = false; });
      })
    );
    document.addEventListener('click', (e) => {
      pills.forEach((p) => { if (p.open && !p.contains(e.target)) p.open = false; });
    });

    // Colour swatch hover previews the variant image on the card
    root.querySelectorAll('[data-mens-gcard]').forEach((card) => {
      const img = card.querySelector('.mens-gcard__media img');
      if (!img) return;
      const orig = { src: img.getAttribute('src'), srcset: img.getAttribute('srcset') };
      card.querySelectorAll('[data-swap]').forEach((sw) => {
        sw.addEventListener('mouseenter', () => {
          img.removeAttribute('srcset');
          img.src = sw.dataset.swap;
          card.querySelectorAll('[data-swap]').forEach((s) => s.classList.toggle('is-current', s === sw));
        });
      });
      card.addEventListener('mouseleave', () => {
        if (orig.srcset) img.setAttribute('srcset', orig.srcset);
        img.src = orig.src;
        card.querySelectorAll('[data-swap]').forEach((s, i) => s.classList.toggle('is-current', i === 0));
      });
    });
  });

  /* ---------------------------------------------------------
     PRODUCT – gallery, variant picker, qty, delivery, share
     --------------------------------------------------------- */
  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    cents = parseInt(cents, 10) || 0;
    const fmt = format || '${{amount}}';
    const match = fmt.match(/\{\{\s*(\w+)\s*\}\}/);
    const kind = match ? match[1] : 'amount';
    const fix = (n, d, ts, ds) => {
      ts = ts === undefined ? ',' : ts;
      ds = ds === undefined ? '.' : ds;
      const parts = (n / 100).toFixed(d).split('.');
      const ints = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + ts);
      return ints + (parts[1] ? ds + parts[1] : '');
    };
    let v;
    switch (kind) {
      case 'amount_no_decimals': v = fix(cents, 0); break;
      case 'amount_with_comma_separator': v = fix(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': v = fix(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': v = fix(cents, 2, "'"); break;
      case 'amount_with_space_separator': v = fix(cents, 2, ' ', ','); break;
      case 'amount_no_decimals_with_space_separator': v = fix(cents, 0, ' '); break;
      default: v = fix(cents, 2);
    }
    return fmt.replace(/\{\{\s*\w+\s*\}\}/, v);
  }

  document.querySelectorAll('[data-mens-pdp]').forEach((root) => {
    const dataEl = root.querySelector('[data-mens-pdp-json]');
    const data = dataEl ? JSON.parse(dataEl.textContent) : { variants: [], money: '' };

    // Gallery
    const slides = Array.from(root.querySelectorAll('[data-mens-slide]'));
    const thumbs = Array.from(root.querySelectorAll('[data-mens-thumb]'));
    const counter = root.querySelector('[data-mens-counter]');
    let current = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
    function show(i) {
      if (!slides.length) return;
      current = (i + slides.length) % slides.length;
      slides.forEach((s, si) => {
        const on = si === current;
        s.classList.toggle('is-active', on);
        if (!on) s.querySelectorAll('video').forEach((v) => v.pause());
      });
      thumbs.forEach((t, ti) => {
        t.classList.toggle('is-active', ti === current);
        if (ti === current) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      if (counter) counter.textContent = current + 1 + ' / ' + slides.length;
    }
    thumbs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('mouseenter', () => { if (window.matchMedia('(hover:hover)').matches) show(i); });
    });
    const prev = root.querySelector('[data-mens-prev]');
    const next = root.querySelector('[data-mens-next]');
    prev && prev.addEventListener('click', () => show(current - 1));
    next && next.addEventListener('click', () => show(current + 1));
    // swipe
    const stage = root.querySelector('[data-mens-stage]');
    if (stage) {
      let x0 = null;
      stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
        x0 = null;
      });
    }
    show(current);

    // Variant picker
    const fieldsets = Array.from(root.querySelectorAll('[data-mens-option]'));
    const idInput = root.querySelector('[data-mens-variant-id]');
    const priceNow = root.querySelector('[data-mens-price]');
    const priceWas = root.querySelector('[data-mens-compare]');
    const priceOff = root.querySelector('[data-mens-off]');
    const addBtn = root.querySelector('[data-mens-add]');
    const buyBtn = root.querySelector('[data-mens-buynow]');
    const stock = root.querySelector('[data-mens-stock]');

    function selected() {
      return fieldsets.map((fs) => {
        const c = fs.querySelector('input:checked');
        return c ? c.value : null;
      });
    }
    function findVariant(opts) {
      return data.variants.find((v) => v.options.every((o, i) => o === opts[i]));
    }
    function markAvailability(opts) {
      fieldsets.forEach((fs, idx) => {
        fs.querySelectorAll('input').forEach((inp) => {
          const test = opts.slice();
          test[idx] = inp.value;
          const v = findVariant(test);
          inp.closest('.mens-pdp__value').classList.toggle('is-unavailable', !v || !v.available);
        });
      });
    }
    function update() {
      const opts = selected();
      fieldsets.forEach((fs, i) => {
        const lab = fs.querySelector('[data-mens-option-label]');
        if (lab) lab.textContent = opts[i] || '';
      });
      markAvailability(opts);
      const v = findVariant(opts);
      if (!v) {
        if (addBtn) { addBtn.disabled = true; addBtn.textContent = data.strings.unavailable; }
        if (buyBtn) buyBtn.disabled = true;
        if (stock) { stock.textContent = data.strings.unavailable; stock.className = 'mens-pdp__stock is-out'; }
        return;
      }
      if (idInput) idInput.value = v.id;
      if (priceNow) priceNow.textContent = formatMoney(v.price, data.money);
      const onSale = v.compare && v.compare > v.price;
      if (priceWas) { priceWas.hidden = !onSale; priceWas.textContent = onSale ? formatMoney(v.compare, data.money) : ''; }
      if (priceOff) {
        priceOff.hidden = !onSale;
        priceOff.textContent = onSale ? Math.round(((v.compare - v.price) * 100) / v.compare) + '% Off' : '';
      }
      if (addBtn) { addBtn.disabled = !v.available; addBtn.textContent = v.available ? data.strings.add : data.strings.soldout; }
      if (buyBtn) buyBtn.disabled = !v.available;
      if (stock) {
        if (!v.available) { stock.textContent = data.strings.soldout; stock.className = 'mens-pdp__stock is-out'; }
        else if (v.qty !== null && v.qty > 0 && v.qty <= 5) { stock.textContent = data.strings.low.replace('[count]', v.qty); stock.className = 'mens-pdp__stock is-low'; }
        else { stock.textContent = data.strings.instock; stock.className = 'mens-pdp__stock'; }
      }
      if (v.media) {
        const idx = slides.findIndex((s) => s.dataset.mediaId === String(v.media));
        if (idx > -1) show(idx);
      }
      if (data.variants.length > 1) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', url.toString());
      }
    }
    fieldsets.forEach((fs) => fs.addEventListener('change', update));
    if (fieldsets.length) markAvailability(selected());

    // Quantity steppers (also used on cart)
    root.querySelectorAll('[data-mens-qty]').forEach(bindQty);

    // Delivery check (estimate only)
    const pinForm = root.querySelector('[data-mens-pin]');
    if (pinForm) {
      const out = root.querySelector('[data-mens-pin-result]');
      const input = pinForm.querySelector('input');
      try { const saved = localStorage.getItem('mens-pin'); if (saved && input) input.value = saved; } catch (e) {}
      pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = (input.value || '').trim();
        const re = new RegExp(pinForm.dataset.pattern || '^\\d{6}$');
        if (!re.test(val)) {
          out.className = 'mens-pdp__pin-result is-error';
          out.textContent = pinForm.dataset.error;
          return;
        }
        try { localStorage.setItem('mens-pin', val); } catch (err) {}
        const min = parseInt(pinForm.dataset.min || '3', 10);
        const max = parseInt(pinForm.dataset.max || '6', 10);
        const add = (n) => { const d = new Date(); let c = 0; while (c < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) c++; } return d; };
        const f = (d) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        out.className = 'mens-pdp__pin-result';
        out.innerHTML = '';
        const strong = document.createElement('strong');
        strong.textContent = (pinForm.dataset.label || 'Estimated delivery') + ': ' + f(add(min)) + ' – ' + f(add(max));
        out.appendChild(strong);
        if (pinForm.dataset.note) {
          out.appendChild(document.createElement('br'));
          out.appendChild(document.createTextNode(pinForm.dataset.note));
        }
      });
    }

    // Share
    const share = root.querySelector('[data-mens-share]');
    share && share.addEventListener('click', async () => {
      const url = window.location.href;
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url }); } catch (e) {}
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast(data.strings.copied);
      }
    });
  });

  function bindQty(wrap) {
    if (wrap._bound) return;
    wrap._bound = true;
    const input = wrap.querySelector('input');
    const step = (d) => {
      const min = parseInt(input.min || '0', 10);
      const max = input.max ? parseInt(input.max, 10) : Infinity;
      const v = Math.min(max, Math.max(min, (parseInt(input.value, 10) || 0) + d));
      if (String(v) !== input.value) {
        input.value = v;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    wrap.querySelector('[data-minus]') && wrap.querySelector('[data-minus]').addEventListener('click', () => step(-1));
    wrap.querySelector('[data-plus]') && wrap.querySelector('[data-plus]').addEventListener('click', () => step(1));
  }

  /* ---------------------------------------------------------
     CART – qty steppers auto-update the cart
     --------------------------------------------------------- */
  document.querySelectorAll('[data-mens-cart-form]').forEach((form) => {
    let timer;
    form.querySelectorAll('[data-mens-qty]').forEach(bindQty);
    form.addEventListener('change', (e) => {
      if (!e.target.matches('[data-mens-qty] input')) return;
      const item = e.target.closest('.mens-citem');
      item && item.classList.add('is-loading');
      clearTimeout(timer);
      timer = setTimeout(() => {
        const upd = form.querySelector('[data-mens-update]');
        if (form.requestSubmit && upd) form.requestSubmit(upd);
        else if (upd) upd.click();
        else form.submit();
      }, 450);
    });
  });

  /* ---------------------------------------------------------
     ACCOUNT – address forms + country/province selectors
     --------------------------------------------------------- */
  document.querySelectorAll('[data-mens-addresses]').forEach((root) => {
    root.querySelectorAll('[data-mens-addr-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;
        const willShow = target.hidden;
        root.querySelectorAll('[data-mens-addr-form]').forEach((f) => { f.hidden = true; });
        target.hidden = !willShow;
        if (willShow) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    root.querySelectorAll('[data-mens-addr-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (window.confirm(btn.dataset.confirm)) {
          const f = document.getElementById(btn.dataset.form);
          f && f.submit();
        }
      });
    });
    // shopify_common.js loads after this file, so wait for window load
    const initCountries = () => {
      if (!(window.Shopify && Shopify.CountryProvinceSelector)) return;
      root.querySelectorAll('[data-mens-country]').forEach((sel) => {
        try { new Shopify.CountryProvinceSelector(sel.id, sel.dataset.province, { hideElement: sel.dataset.provinceBox }); } catch (e) {}
      });
    };
    if (document.readyState === 'complete') initCountries();
    else window.addEventListener('load', initCountries);
  });

  /* Login page: toggle the password recovery form */
  document.querySelectorAll('[data-mens-auth]').forEach((root) => {
    const login = root.querySelector('[data-mens-login]');
    const recover = root.querySelector('[data-mens-recover]');
    if (!login || !recover) return;
    const set = (r) => { login.hidden = r; recover.hidden = !r; };
    if (window.location.hash === '#recover' || recover.querySelector('.mens-alert')) set(true);
    root.querySelectorAll('[data-mens-show-recover]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); set(true); }));
    root.querySelectorAll('[data-mens-show-login]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); set(false); }));
  });
})();

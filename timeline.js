/* =========  TIMELINE APP (vanilla JS)  =========
*/

(() => {
  // ---- Config ----
  const JSON_PATH = 'us_financial_events.json'; // adjust if needed
  const ICONS = {
    financial: '💰',
    crisis: '📉',
    institution: '🏦',
    law: '⚖️',
    international: '🌐',
    policy: '📜',
    economic: '📊'
  };

  // ---- State ----
  let ALL_EVENTS = [];
  let VISIBLE_EVENTS = [];
  let ORIENTATION = 'vertical'; // 'vertical' | 'horizontal'

  // ---- DOM ----
  const $timeline = document.getElementById('timeline');
  const $search = document.getElementById('search');
  const $period = document.getElementById('periodFilter');
  const $category = document.getElementById('categoryFilter');
  const $toggle = document.getElementById('orientationToggle');
  const $count = document.getElementById('count');

  // ---- Utils ----
  const debounce = (fn, ms = 200) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  const unique = arr => [...new Set(arr)].sort((a, b) => a.localeCompare(b));

  const norm = s => (s || '').toString().toLowerCase();

  const matchesSearch = (ev, q) => {
    if (!q) return true;
    const s = norm(q);
    return (
      norm(ev.title).includes(s) ||
      norm(ev.description).includes(s) ||
      norm(ev.period).includes(s) ||
      (Array.isArray(ev.category) && ev.category.some(c => norm(c).includes(s))) ||
      String(ev.year).includes(s)
    );
  };

  const matchesPeriod = (ev, p) => !p || p === 'all' ? true : ev.period === p;

  const matchesCategory = (ev, c) => {
    if (!c || c === 'all') return true;
    if (!Array.isArray(ev.category)) return false;
    // allow filtering for single category or a special "financial-only" convenience
    return ev.category.includes(c);
  };

  const setCount = n => { if ($count) $count.textContent = `${n} events`; };

  // ---- Rendering ----
  function render() {
    // orientation class on container
    $timeline.classList.toggle('horizontal', ORIENTATION === 'horizontal');
    $timeline.classList.toggle('vertical', ORIENTATION === 'vertical');

    // clear
    $timeline.innerHTML = '';

    // sort by year asc
    const sorted = [...VISIBLE_EVENTS].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

    // build fragment
    const frag = document.createDocumentFragment();

    sorted.forEach(ev => {
      const card = document.createElement('article');
      card.className = 'event-card';

      // left “node/spine” marker
      const node = document.createElement('div');
      node.className = 'event-node';
      node.title = ev.year || '';
      card.appendChild(node);

      // content
      const wrap = document.createElement('div');
      wrap.className = 'event-content';

      const header = document.createElement('header');
      header.className = 'event-header';

      const year = document.createElement('div');
      year.className = 'event-year';
      year.textContent = ev.year ?? '';

      const title = document.createElement('h3');
      title.className = 'event-title';
      title.textContent = ev.title || 'Untitled event';

      header.appendChild(year);
      header.appendChild(title);

      // badges row
      const badges = document.createElement('div');
      badges.className = 'event-badges';

      if (ev.period) {
        const b = document.createElement('span');
        b.className = 'badge period';
        b.textContent = ev.period;
        badges.appendChild(b);
      }

      if (Array.isArray(ev.category)) {
        ev.category.forEach(c => {
          const b = document.createElement('span');
          b.className = 'badge category';
          b.textContent = `${ICONS[c] || '🔖'} ${c}`;
          badges.appendChild(b);
        });
      }

      const desc = document.createElement('p');
      desc.className = 'event-desc';
      desc.textContent = ev.description || '';

      const actions = document.createElement('div');
      actions.className = 'event-actions';

      if (ev.link) {
        const a = document.createElement('a');
        a.href = ev.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'event-link';
        a.textContent = 'View source';
        actions.appendChild(a);
      }

      wrap.appendChild(header);
      wrap.appendChild(badges);
      wrap.appendChild(desc);
      if (actions.childNodes.length) wrap.appendChild(actions);

      card.appendChild(wrap);
      frag.appendChild(card);
    });

    $timeline.appendChild(frag);
    setCount(sorted.length);
  }

  // ---- Filters ----
  function applyFilters() {
    const q = $search?.value?.trim() || '';
    const p = $period?.value || 'all';
    const c = $category?.value || 'all';

    VISIBLE_EVENTS = ALL_EVENTS.filter(ev =>
      matchesSearch(ev, q) && matchesPeriod(ev, p) && matchesCategory(ev, c)
    );

    render();
    updateURLState({ q, p, c, o: ORIENTATION });
  }

  // ---- Controls population ----
  function populateFilters(events) {
    const periods = unique(events.map(e => e.period).filter(Boolean));
    const categories = unique(events.flatMap(e => Array.isArray(e.category) ? e.category : []).filter(Boolean));

    if ($period) {
      $period.innerHTML = `<option value="all">All periods</option>` +
        periods.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    if ($category) {
      $category.innerHTML = `<option value="all">All categories</option>` +
        categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  }

  // ---- URL state (so filters are shareable) ----
  function updateURLState({ q, p, c, o }) {
    const usp = new URLSearchParams(window.location.search);
    if (q) usp.set('q', q); else usp.delete('q');
    if (p && p !== 'all') usp.set('p', p); else usp.delete('p');
    if (c && c !== 'all') usp.set('c', c); else usp.delete('c');
    if (o && o !== 'vertical') usp.set('o', o); else usp.delete('o');
    const newUrl = `${window.location.pathname}?${usp.toString()}`;
    history.replaceState(null, '', newUrl);
  }

  function loadURLState() {
    const usp = new URLSearchParams(window.location.search);
    const q = usp.get('q') || '';
    const p = usp.get('p') || 'all';
    const c = usp.get('c') || 'all';
    const o = usp.get('o') || 'vertical';

    if ($search) $search.value = q;
    if ($period) $period.value = p;
    if ($category) $category.value = c;
    ORIENTATION = o === 'horizontal' ? 'horizontal' : 'vertical';
  }

  // ---- Orientation toggle ----
  function toggleOrientation() {
    ORIENTATION = ORIENTATION === 'vertical' ? 'horizontal' : 'vertical';
    if ($toggle) $toggle.setAttribute('aria-pressed', ORIENTATION === 'horizontal' ? 'true' : 'false');
    applyFilters();
  }

  // ---- Init ----
  async function init() {
    try {
      const res = await fetch(JSON_PATH, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Normalize fields & add default link placeholder if needed
      ALL_EVENTS = data.map(e => ({
        year: e.year ?? null,
        title: e.title ?? '',
        description: e.description ?? '',
        period: e.period ?? '',
        category: Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []),
        link: e.link || ''
      }));

      populateFilters(ALL_EVENTS);
      loadURLState();
      applyFilters();

      // listeners
      if ($search) $search.addEventListener('input', debounce(applyFilters, 150));
      if ($period) $period.addEventListener('change', applyFilters);
      if ($category) $category.addEventListener('change', applyFilters);
      if ($toggle) $toggle.addEventListener('click', toggleOrientation);

      // nice-to-have: keyboard toggle (T)
      document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 't') toggleOrientation();
      });

    } catch (err) {
      console.error('Failed to load events JSON:', err);
      if ($timeline) {
        $timeline.innerHTML = `
          <div class="error">
            <p>Couldn’t load the timeline data. Make sure <code>${JSON_PATH}</code> exists in your repo and is valid JSON.</p>
            <details><summary>Details</summary><pre>${String(err)}</pre></details>
          </div>`;
      }
    }
  }

  // kick off
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(function () {
  const { esc } = UI;
  UI.renderNav('members'); UI.renderFooter();

  const $ = (s) => document.querySelector(s);
  const grid = $('#grid'), tabs = $('#tabs'), countEl = $('#count'), qInput = $('#q'), title = $('#pageTitle');
  const params = new URLSearchParams(location.search);
  const state = { cat: params.get('cat') || 'all', status: params.get('status') || 'all', q: params.get('q') || '' };
  let members = [];
  qInput.value = state.q;

  const norm = (s) => String(s || '').toLowerCase();

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.cat !== 'all') p.set('cat', state.cat);
    if (state.status !== 'all') p.set('status', state.status);
    if (state.q) p.set('q', state.q);
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
  }

  function matchesSearch(m) {
    if (!state.q) return true;
    const q = norm(state.q.trim());
    return [m.discord_username, m.discord_display_name, m.discord_server_nickname, m.roblox_username, m.roblox_display_name]
      .some((v) => norm(v).includes(q));
  }
  function matchesStatus(m) {
    if (state.status === 'online') return m.discord_status !== 'offline';
    if (state.status === 'offline') return m.discord_status === 'offline';
    return true;
  }

  function render() {
    const base = members.filter((m) => matchesSearch(m) && matchesStatus(m));
    const byCat = UI.computeStats(base).byCat;

    tabs.innerHTML =
      `<button class="tab ${state.cat === 'all' ? 'active' : ''}" data-cat="all">ทั้งหมด (${base.length})</button>` +
      UI.CATEGORIES.map((c) =>
        `<button class="tab ${state.cat === c.slug ? 'active' : ''}" style="--c:${esc(c.color)}" data-cat="${esc(c.slug)}">${esc(c.icon)} ${esc(c.name)} (${byCat[c.slug] || 0})</button>`
      ).join('');

    const list = state.cat === 'all' ? base : base.filter((m) => (m.builds || []).includes(state.cat));
    const info = state.cat === 'all' ? null : UI.categoryInfo(state.cat);
    title.textContent = info ? `${info.icon} ${info.name}` : 'สมาชิกทั้งหมด';
    countEl.textContent = `พบ ${list.length} คน`;
    grid.innerHTML = list.length
      ? list.map(UI.memberCard).join('')
      : '<div class="empty glass">ไม่พบสมาชิกที่ตรงกับเงื่อนไข</div>';

    document.querySelectorAll('#statusBtns button').forEach((b) => b.classList.toggle('active', b.dataset.status === state.status));
    syncUrl();
  }

  async function load(force) {
    try { members = await API.getMembers(force); render(); }
    catch (e) { if (!members.length) UI.showError(grid, e); }
  }

  let timer;
  qInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = qInput.value; render(); }, 150);
  });
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    state.cat = b.dataset.cat; render();
  });
  document.getElementById('statusBtns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-status]'); if (!b) return;
    state.status = b.dataset.status; render();
  });

  grid.innerHTML = UI.skeletonCards(6);
  load(false);
  setInterval(() => { if (!document.hidden) load(true); }, CONFIG.REFRESH_MS || 30000);
})();

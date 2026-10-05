// เรียกข้อมูลจาก Supabase (อ่านผ่าน View สาธารณะเท่านั้น)
(function () {
  const C = window.CONFIG;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const STATUS_ORDER = { online: 0, idle: 1, dnd: 2, offline: 3 };

  async function rest(path) {
    if (!C.SUPABASE_URL || C.SUPABASE_URL.includes('YOUR-PROJECT') ||
        !C.SUPABASE_PUBLISHABLE_KEY || C.SUPABASE_PUBLISHABLE_KEY.includes('PUT_YOUR_KEY')) {
      throw new Error('ยังไม่ได้ตั้งค่า web/js/config.js (SUPABASE_URL และ SUPABASE_PUBLISHABLE_KEY)');
    }
    const res = await fetch(`${C.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${path}`, {
      headers: { apikey: C.SUPABASE_PUBLISHABLE_KEY, Accept: 'application/json' },
    });
    if (!res.ok) {
      let msg = '';
      try { msg = (await res.json()).message || ''; } catch { /* ignore */ }
      throw new Error(`${res.status} ${msg || res.statusText}`);
    }
    return res.json();
  }

  const sortMembers = (list) =>
    list.sort((a, b) => {
      const s = (STATUS_ORDER[a.discord_status] ?? 3) - (STATUS_ORDER[b.discord_status] ?? 3);
      if (s) return s;
      const an = a.discord_display_name || a.discord_username || '';
      const bn = b.discord_display_name || b.discord_username || '';
      return an.localeCompare(bn, 'th');
    });

  let memberCache = { p: null, at: 0 };
  function getMembers(force = false) {
    if (!force && memberCache.p && Date.now() - memberCache.at < 10000) return memberCache.p;
    memberCache.at = Date.now();
    memberCache.p = rest('public_members?select=*&limit=1000')
      .then(sortMembers)
      .catch((e) => { memberCache.p = null; throw e; });
    return memberCache.p;
  }

  async function getMember(id) {
    if (!UUID.test(id || '')) return null;
    const rows = await rest(`public_members?select=*&id=eq.${id}&limit=1`);
    return rows[0] || null;
  }

  let clanPromise = null;
  function getClan() {
    if (!clanPromise) {
      clanPromise = rest('public_clan?select=*&limit=1')
        .then((rows) => rows[0] || null)
        .catch((e) => { clanPromise = null; throw e; });
    }
    return clanPromise;
  }

  window.API = { getMembers, getMember, getClan };
})();

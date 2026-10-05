// ฟังก์ชันช่วยวาด UI ที่ใช้ร่วมกันทุกหน้า
// สำคัญ: ข้อมูลจาก Discord/Roblox เป็นข้อความที่ผู้ใช้ตั้งเอง → ต้อง esc() ทุกครั้งก่อนใส่ใน HTML
(function () {
  const CFG = window.CONFIG || {};
  const CATEGORIES = CFG.CATEGORIES || [];

  const STATUS = {
    online:  { label: 'Online',         cls: 's-online'  },
    idle:    { label: 'Idle',           cls: 's-idle'    },
    dnd:     { label: 'Do Not Disturb', cls: 's-dnd'     },
    offline: { label: 'Offline',        cls: 's-offline' },
  };
  const statusOf = (s) => STATUS[s] || STATUS.offline;

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

  // อนุญาตเฉพาะ URL แบบ https
  function safeUrl(u) {
    try { const x = new URL(u); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; }
  }
  const initial = (n) => esc((Array.from(String(n || '?').trim())[0] || '?').toUpperCase());

  function categoryInfo(slug) {
    return CATEGORIES.find((c) => c.slug === slug) ||
      { slug, name: slug, icon: '🏷️', color: '#8b5cf6' };
  }

  function computeStats(members) {
    const byCat = {};
    members.forEach((m) => (m.builds || []).forEach((s) => { byCat[s] = (byCat[s] || 0) + 1; }));
    return {
      total: members.length,
      online: members.filter((m) => m.discord_status && m.discord_status !== 'offline').length,
      byCat,
    };
  }

  function avatar(url, name, status, cls = '') {
    const src = safeUrl(url);
    const st = statusOf(status);
    return `<div class="avatar ${cls}">
      <span class="ph">${initial(name)}</span>
      ${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
      <i class="status-dot ${st.cls}" title="${st.label}"></i>
    </div>`;
  }

  function statusPill(status) {
    const st = statusOf(status);
    return `<span class="status-pill ${st.cls}"><i class="dot"></i>${st.label}</span>`;
  }

  function badge(icon, label, color) {
    return `<span class="badge" style="--c:${esc(color)}"><span>${esc(icon)}</span>${esc(label)}</span>`;
  }

  function badgesFor(m) {
    const out = [];
    if (m.is_owner) out.push(badge('👑', 'Owner', '#facc15'));
    (m.builds || []).forEach((slug) => {
      const c = categoryInfo(slug);
      out.push(badge(c.icon, c.name, c.color));
    });
    return out.join('');
  }

  const profileHref = (m) => `member.html?id=${encodeURIComponent(m.id)}`;
  const displayName = (m) => m.discord_display_name || m.discord_username || 'Unknown';

  function discordPanel(m, big = false) {
    return `<div class="mc-panel mc-discord">
      <span class="mc-label">Discord</span>
      <div class="mc-row">
        ${avatar(m.discord_avatar, displayName(m), m.discord_status, big ? 'big' : '')}
        <div class="mc-info">
          <a class="mc-name" href="${profileHref(m)}">${esc(displayName(m))}</a>
          <div class="mc-user">@${esc(m.discord_username)}</div>
          ${statusPill(m.discord_status)}
        </div>
      </div>
    </div>`;
  }

  // full = true (หน้าโปรไฟล์) จะแสดงทั้งรูปหัวและรูปตัวเต็ม / ในการ์ดแสดงรูปตัวเต็ม (หัวใช้เมื่อไม่มีรูปตัวเต็ม)
  function robloxPanel(m, full = false) {
    if (!m.roblox_id) {
      return `<div class="mc-panel mc-roblox">
        <span class="mc-label">Roblox</span>
        <div class="rb-empty">ยังไม่ได้เชื่อม Roblox<small>ใช้คำสั่ง /linkroblox ใน Discord</small></div>
      </div>`;
    }
    const body = safeUrl(m.roblox_avatar);
    const head = safeUrl(m.roblox_headshot);
    const idOk = /^\d+$/.test(String(m.roblox_id));
    const stats = [];
    if (m.roblox_friends != null) stats.push(`${esc(m.roblox_friends)} Friends`);
    if (m.roblox_followers != null) stats.push(`${esc(m.roblox_followers)} Followers`);
    const uname = esc(m.roblox_username || '');
    const showHead = head && (full || !body);
    return `<div class="mc-panel mc-roblox">
      <span class="mc-label">Roblox</span>
      <div class="rb-row">
        ${showHead ? `<img class="rb-head" src="${esc(head)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
        <div class="rb-info">
          <div class="rb-name">${esc(m.roblox_display_name || m.roblox_username || 'Roblox')}${
            m.roblox_verified ? '<span class="rb-ver" title="ยืนยันบัญชีแล้ว">✔</span>' : ''
          }</div>
          <div class="rb-user">${
            idOk ? `<a href="https://www.roblox.com/users/${m.roblox_id}/profile" target="_blank" rel="noopener noreferrer">▣ @${uname}</a>` : `▣ @${uname}`
          }</div>
          ${stats.length ? `<div class="rb-stats">${stats.join(' • ')}</div>` : ''}
        </div>
        ${body ? `<img class="rb-figure" src="${esc(body)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
      </div>
    </div>`;
  }

  // การ์ดสมาชิก (Discord + Roblox ในใบเดียว)
  function memberCard(m) {
    return `<article class="member-card glass">
      ${discordPanel(m)}
      ${robloxPanel(m)}
      <div class="mc-foot">
        <div class="badges">${badgesFor(m)}</div>
        <a class="btn btn-green" href="${profileHref(m)}">View Profile</a>
      </div>
    </article>`;
  }

  function skeletonCards(n = 6) {
    return Array.from({ length: n }, () => '<div class="skeleton glass"></div>').join('');
  }

  function showError(el, err) {
    el.innerHTML = `<div class="notice glass"><h3>โหลดข้อมูลไม่สำเร็จ</h3>
      <p>${esc(err && err.message ? err.message : err)}</p>
      <small>ตรวจ web/js/config.js และเช็คว่ารัน SQL ใน supabase/ ครบแล้ว</small></div>`;
  }

  function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return isNaN(d) ? '-' : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function renderNav(active) {
    const el = document.getElementById('nav');
    if (!el) return;
    const links = [['home', 'index.html', 'หน้าแรก'], ['members', 'members.html', 'สมาชิก'], ['clan', 'clan.html', 'Clan']];
    el.innerHTML = `<div class="container"><div class="nav glass">
      <a class="brand" href="index.html"><span class="brand-logo" id="brandLogo">⚔️</span><span id="brandName">${esc(CFG.CLAN_NAME_FALLBACK || 'Clan')}</span></a>
      <nav>${links.map(([k, href, t]) => `<a href="${href}" class="${k === active ? 'active' : ''}">${t}</a>`).join('')}</nav>
    </div></div>`;
    if (window.API) {
      API.getClan().then((c) => {
        if (!c) return;
        document.getElementById('brandName').textContent = c.clan_name;
        const logo = safeUrl(c.logo_url);
        if (logo) document.getElementById('brandLogo').innerHTML = `<img src="${esc(logo)}" alt="">`;
        document.title = `${c.clan_name} | ${document.title.split('|').pop().trim()}`;
      }).catch(() => {});
    }
  }

  function renderFooter() {
    const el = document.getElementById('footer');
    if (el) el.innerHTML = `<div class="container foot">Clan Dashboard • ข้อมูลซิงค์จาก Discord &amp; Roblox อัตโนมัติ</div>`;
  }

  // รูปที่โหลดไม่ได้ → ลบทิ้ง ให้เห็นตัวอักษรแทน
  document.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.target.remove();
  }, true);

  window.UI = {
    esc, safeUrl, statusOf, categoryInfo, computeStats, avatar, statusPill, badge, badgesFor,
    memberCard, discordPanel, robloxPanel, skeletonCards, showError, formatDate,
    renderNav, renderFooter, displayName, CATEGORIES,
  };
})();

(async function () {
  const { esc, safeUrl } = UI;
  UI.renderNav('home'); UI.renderFooter();
  const root = document.getElementById('home');

  function socialLinks(clan) {
    if (!clan) return '';
    const defs = [['discord_url', 'Discord', '💬'], ['tiktok_url', 'TikTok', '🎵'], ['youtube_url', 'YouTube', '▶️'], ['facebook_url', 'Facebook', '📘']];
    return defs.map(([k, label, ic]) => {
      const u = safeUrl(clan[k]);
      return u ? `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${ic} ${label}</a>` : '';
    }).join('');
  }

  try {
    const [clan, members] = await Promise.all([API.getClan().catch(() => null), API.getMembers()]);
    const st = UI.computeStats(members);
    const name = clan ? clan.clan_name : CONFIG.CLAN_NAME_FALLBACK;
    const logo = clan && safeUrl(clan.logo_url);
    const owner = members.find((m) => m.is_owner) || (clan && members.find((m) => m.id === clan.owner_member_id));
    const onlineNow = members.filter((m) => m.discord_status !== 'offline' && !m.is_owner).slice(0, 6);

    root.innerHTML = `
      <section class="hero">
        <div class="hero-logo">${logo ? UI.protectedBg(logo, 'hero-logo-img', name) : '⚔️'}</div>
        <h1 class="title-neon">${esc(name)}</h1>
        <p class="sub">${esc((clan && clan.description) || 'Clan Community')}</p>
        <div class="socials">${socialLinks(clan)}</div>
        <div class="stats">
          <div class="stat glass"><b>${st.total}</b><span>Total Members</span></div>
          <div class="stat glass online"><b>${st.online}</b><span>Online Members</span></div>
        </div>
      </section>

      <section class="section">
        <h2>หมวดหมู่สมาชิก</h2>
        <div class="cat-grid">
          ${UI.CATEGORIES.map((c) => `
            <a class="cat-card glass" style="--c:${esc(c.color)}" href="members.html?cat=${encodeURIComponent(c.slug)}">
              <span class="ic">${esc(c.icon)}</span><b>${esc(c.name)}</b><span>${st.byCat[c.slug] || 0} คน</span>
            </a>`).join('')}
        </div>
      </section>

      ${owner ? `<section class="section"><h2>👑 Clan Owner</h2><div class="owner-wrap">${UI.memberCard(owner)}</div></section>` : ''}

      ${onlineNow.length ? `<section class="section"><h2>🟢 ออนไลน์ตอนนี้</h2><div class="grid">${onlineNow.map(UI.memberCard).join('')}</div>
        <p style="margin-top:18px"><a class="btn" href="members.html">ดูสมาชิกทั้งหมด →</a></p></section>` : ''}
    `;
  } catch (e) { UI.showError(root, e); }
})();

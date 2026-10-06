(async function () {
  const { esc, safeUrl } = UI;
  UI.renderNav('clan'); UI.renderFooter();
  const root = document.getElementById('clan');
  root.innerHTML = '<div class="skeleton glass" style="height:300px"></div>';

  try {
    const [clan, members] = await Promise.all([API.getClan().catch(() => null), API.getMembers()]);
    const st = UI.computeStats(members);
    const name = clan ? clan.clan_name : CONFIG.CLAN_NAME_FALLBACK;
    const logo = clan && safeUrl(clan.logo_url);
    const cover = clan && safeUrl(clan.cover_url);
    const owner = members.find((m) => m.is_owner) || (clan && members.find((m) => m.id === clan.owner_member_id));
    const defs = [['discord_url', 'Discord', '💬'], ['tiktok_url', 'TikTok', '🎵'], ['youtube_url', 'YouTube', '▶️'], ['facebook_url', 'Facebook', '📘']];
    const socials = clan ? defs.map(([k, l, ic]) => {
      const u = safeUrl(clan[k]);
      return u ? `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${ic} ${l}</a>` : '';
    }).join('') : '';

    root.innerHTML = `
      <div class="cover" ${cover ? `style="background-image:url('${esc(cover)}')"` : ''}></div>
      <div class="clan-head">
        <div class="hero-logo">${logo ? UI.protectedBg(logo, 'hero-logo-img', name) : '⚔️'}</div>
        <div>
          <h1 class="title-neon" style="font-size:clamp(28px,5vw,44px)">${esc(name)}</h1>
          <p class="sub">${esc((clan && clan.description) || 'Clan Community')}</p>
        </div>
      </div>
      <div class="socials" style="justify-content:flex-start;margin-top:18px">${socials}</div>
      <div class="stats" style="justify-content:flex-start;margin-top:18px">
        <div class="stat glass"><b>${st.total}</b><span>Total Members</span></div>
        <div class="stat glass online"><b>${st.online}</b><span>Online Members</span></div>
        ${UI.CATEGORIES.map((c) => `<a class="stat glass" href="members.html?cat=${encodeURIComponent(c.slug)}"><b>${st.byCat[c.slug] || 0}</b><span>${esc(c.icon)} ${esc(c.name)}</span></a>`).join('')}
      </div>
      ${owner ? `<section class="section"><h2>👑 Clan Owner</h2><div class="owner-wrap">${UI.memberCard(owner)}</div></section>` : ''}
    `;
  } catch (e) { UI.showError(root, e); }
})();

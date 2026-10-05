(async function () {
  const { esc, safeUrl } = UI;
  UI.renderNav('members'); UI.renderFooter();
  const root = document.getElementById('profile');
  const id = new URLSearchParams(location.search).get('id');
  root.innerHTML = '<div class="skeleton glass" style="height:360px"></div>';

  try {
    const m = await API.getMember(id);
    if (!m) { root.innerHTML = '<div class="notice glass"><h3>ไม่พบสมาชิกคนนี้</h3><p>อาจออกจาก Server แล้ว หรือลิงก์ไม่ถูกต้อง</p></div>'; return; }

    document.title = `${UI.displayName(m)} | โปรไฟล์`;
    const banner = safeUrl(m.discord_banner);
    const roles = (m.role_names || []).map((r) => `<span class="chip">${esc(r)}</span>`).join('') || '<span class="chip">ไม่มี Role</span>';

    root.innerHTML = `
      <section class="profile glass">
        <div class="pf-banner" ${banner ? `style="background-image:url('${esc(banner)}')"` : ''}></div>
        <div class="pf-grid">
          <div class="mc-panel mc-discord pf-discord">
            <div class="mc-row">
              ${UI.avatar(m.discord_avatar, UI.displayName(m), m.discord_status, 'big')}
            </div>
            <div class="mc-info">
              <div class="mc-name">${esc(UI.displayName(m))}</div>
              <div class="mc-user">@${esc(m.discord_username)}</div>
              ${UI.statusPill(m.discord_status)}
            </div>
            <div class="badges">${UI.badgesFor(m)}</div>
            <div class="pf-meta">
              ${m.discord_server_nickname ? `<div>ชื่อเล่นใน Server: <b>${esc(m.discord_server_nickname)}</b></div>` : ''}
              <div>เข้าร่วม Server: <b>${esc(UI.formatDate(m.joined_at))}</b></div>
            </div>
            <div><span class="mc-label">Roles</span><div class="chips" style="margin-top:8px">${roles}</div></div>
          </div>
          ${UI.robloxPanel(m, true)}
        </div>
      </section>`;
  } catch (e) { UI.showError(root, e); }
})();

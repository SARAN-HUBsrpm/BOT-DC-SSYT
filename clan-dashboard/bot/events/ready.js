const { Events } = require('discord.js');
const { syncGuild, printRoles } = require('../services/discordSync');
const { refreshLinkedRoblox } = require('../services/robloxLink');

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`✓ Bot Login สำเร็จ: ${client.user.tag}`);

    const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
    if (!guild) {
      console.error('✗ หา Server ไม่เจอ ตรวจ GUILD_ID และเช็คว่าเชิญบอทเข้า Server แล้ว');
      return;
    }

    try {
      console.log('Syncing Discord Members...');
      const result = await syncGuild(guild);
      console.log(`${result.total} Members Found (บอท ${result.bots})`);
      console.log('✓ Avatars\n✓ Usernames\n✓ Roles\n✓ Status');
      if (result.left > 0) console.log(`ℹ สมาชิกที่ออกจาก Server: ${result.left}`);
      console.log(`✓ Sync Complete (${result.ms}ms)`);
      await printRoles(guild);
    } catch (err) {
      console.error('✗ Sync ล้มเหลว:', err.message);
    }

    // รีเฟรช Roblox เบื้องหลัง (ไม่บล็อกการทำงานของบอท)
    refreshLinkedRoblox()
      .then((r) => console.log(`✓ Roblox: เชื่อมไว้ ${r.linked} คน (อัปเดต ${r.updated}, ไม่สำเร็จ ${r.failed})`))
      .catch((err) => console.error('✗ รีเฟรช Roblox ล้มเหลว:', err.message));
  },
};

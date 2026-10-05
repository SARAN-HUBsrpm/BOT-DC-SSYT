const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { syncGuild, syncBanners } = require('../services/discordSync');
const { refreshLinkedRoblox } = require('../services/robloxLink');
const { isAdminOrOwner } = require('../services/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sync สมาชิก Discord + Roblox เข้า Database (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) =>
      opt.setName('banners').setDescription('ดึง Banner ด้วย (ช้า ใช้นานหลายนาทีถ้าสมาชิกเยอะ)')
    ),

  async execute(interaction) {
    if (!isAdminOrOwner(interaction)) {
      return interaction.reply({ content: '⛔ คำสั่งนี้ใช้ได้เฉพาะ Admin / Owner', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await syncGuild(interaction.guild);
      let text =
        `✅ Sync สำเร็จ\n` +
        `• สมาชิกทั้งหมด: **${result.total}** (บอท ${result.bots})\n` +
        `• ออกจาก Server: **${result.left}**\n` +
        `• ใช้เวลา: ${result.ms}ms`;
      await interaction.editReply(text + '\n⏳ กำลังรีเฟรชข้อมูล Roblox...');

      try {
        const rb = await refreshLinkedRoblox();
        text += `\n• Roblox: เชื่อมไว้ **${rb.linked}** คน (อัปเดต ${rb.updated}, ไม่สำเร็จ ${rb.failed})`;
      } catch (err) {
        text += `\n• Roblox: ❌ ${err.message}`;
      }

      if (interaction.options.getBoolean('banners')) {
        await interaction.editReply(text + '\n⏳ กำลังดึง Banner...');
        const n = await syncBanners(interaction.guild);
        text += `\n• อัปเดต Banner: **${n}** คน`;
      }
      await interaction.editReply(text);
    } catch (err) {
      console.error('/sync error:', err);
      await interaction.editReply(`❌ Sync ล้มเหลว: ${err.message}`);
    }
  },
};

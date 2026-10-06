const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { isAdminOrOwner } = require('../services/permissions');
const {
  getAutomationHealth,
  runFullSyncNow,
  runRobloxRefreshNow,
  shutdownBot,
} = require('../services/automation');

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function fmtTime(value) {
  return value ? new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '-';
}

function fmtJob(job) {
  const status = job.running ? 'กำลังทำงาน' : 'ว่าง';
  return `${status}, ล่าสุด: ${fmtTime(job.lastOkAt)}, error: ${job.lastError || '-'}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('ตรวจสถานะระบบ Phase 5 (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName('action')
        .setDescription('เลือกสิ่งที่ต้องการทำ')
        .addChoices(
          { name: 'status', value: 'status' },
          { name: 'refresh-roblox', value: 'refresh-roblox' },
          { name: 'full-sync', value: 'full-sync' },
          { name: 'shutdown', value: 'shutdown' },
        )
    ),

  async execute(interaction) {
    if (!isAdminOrOwner(interaction)) {
      return interaction.reply({ content: '⛔ คำสั่งนี้ใช้ได้เฉพาะ Admin / Owner', flags: MessageFlags.Ephemeral });
    }

    const action = interaction.options.getString('action') || 'status';

    if (action === 'status') {
      const h = getAutomationHealth(interaction.client);
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content:
          `✅ Health OK\n` +
          `• Uptime: **${formatDuration(h.uptimeMs)}**\n` +
          `• WebSocket ping: **${h.wsPing ?? '-'}ms**\n` +
          `• Queue: **${h.queue.pendingTotal}** pending (upsert ${h.queue.pendingUpserts}, patch ${h.queue.pendingPatches})\n` +
          `• Queue flush ล่าสุด: ${fmtTime(h.queue.lastFlushAt)}\n` +
          `• Roblox refresh: ${fmtJob(h.jobs.roblox)}\n` +
          `• Full sync: ${fmtJob(h.jobs.fullSync)}`,
      });
    }

    if (action === 'refresh-roblox') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const r = await runRobloxRefreshNow();
      if (r.skipped) return interaction.editReply('ℹ Roblox refresh กำลังทำงานอยู่แล้ว');
      return interaction.editReply(`✅ Roblox refresh สำเร็จ: เชื่อมไว้ ${r.linked} คน, อัปเดต ${r.updated}, ไม่สำเร็จ ${r.failed}`);
    }

    if (action === 'full-sync') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const r = await runFullSyncNow(interaction.guild);
      if (r.skipped) return interaction.editReply('ℹ Full sync กำลังทำงานอยู่แล้ว');
      return interaction.editReply(`✅ Full sync สำเร็จ: สมาชิก ${r.total}, บอท ${r.bots}, ออกจาก Server ${r.left}, ใช้เวลา ${r.ms}ms`);
    }

    await interaction.reply({ content: 'กำลังปิดบอทอย่างปลอดภัย...', flags: MessageFlags.Ephemeral });
    setTimeout(() => shutdownBot(interaction.client, `/health shutdown by ${interaction.user.id}`), 750).unref?.();
  },
};

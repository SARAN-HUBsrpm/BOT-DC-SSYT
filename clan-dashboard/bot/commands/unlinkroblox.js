const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const link = require('../services/robloxLink');
const { isAdminOrOwner } = require('../services/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlinkroblox')
    .setDescription('ยกเลิกการเชื่อม Roblox')
    .addUserOption((o) => o.setName('user').setDescription('(Admin) ยกเลิกให้สมาชิกคนอื่น')),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getUser('user');
    let targetId = interaction.user.id;
    if (target && target.id !== interaction.user.id) {
      if (!isAdminOrOwner(interaction)) return interaction.editReply('⛔ ยกเลิกให้คนอื่นได้เฉพาะ Admin / Owner');
      targetId = target.id;
    }

    const row = await link.getRow(targetId);
    if (!row || !row.roblox_id) return interaction.editReply('ยังไม่ได้เชื่อม Roblox อยู่แล้ว');

    await link.unlinkRoblox(targetId);
    await interaction.editReply(`✅ ยกเลิกการเชื่อม Roblox (@${row.roblox_username ?? row.roblox_id}) แล้ว`);
  },
};

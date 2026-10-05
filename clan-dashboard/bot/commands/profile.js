const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { toMemberRow, STATUS_LABEL } = require('../services/memberMapper');
const link = require('../services/robloxLink');

const https = (u) => (typeof u === 'string' && u.startsWith('https://') ? u : null);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('ดูโปรไฟล์ Discord + Roblox ของสมาชิก')
    .addUserOption((o) => o.setName('user').setDescription('สมาชิกที่ต้องการดู (ไม่ใส่ = ตัวคุณเอง)')),

  async execute(interaction) {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) return interaction.editReply({ content: 'ไม่พบสมาชิกคนนี้ใน Server', flags: MessageFlags.Ephemeral });

    const d = toMemberRow(member);
    const db = await link.getRow(member.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(d.discord_display_name)
      .setDescription(`@${d.discord_username} • ${STATUS_LABEL[d.discord_status]}`)
      .setThumbnail(d.discord_avatar)
      .addFields({
        name: 'Roles',
        value: d.roles.length ? d.roles.map((r) => `<@&${r.id}>`).join(' ') : 'ไม่มี Role',
      });

    if (db?.roblox_id) {
      const stats = [];
      if (db.roblox_friends != null) stats.push(`${db.roblox_friends} Friends`);
      if (db.roblox_followers != null) stats.push(`${db.roblox_followers} Followers`);
      embed.addFields({
        name: `Roblox${db.roblox_verified ? ' ✔' : ''}`,
        value:
          `[${db.roblox_display_name ?? db.roblox_username} (@${db.roblox_username})](https://www.roblox.com/users/${db.roblox_id}/profile)` +
          (stats.length ? `\n${stats.join(' • ')}` : ''),
      });
      const body = https(db.roblox_avatar);
      if (body) embed.setImage(body);
    } else {
      embed.addFields({ name: 'Roblox', value: 'ยังไม่ได้เชื่อม (ใช้ /linkroblox)' });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

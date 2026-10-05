const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const crypto = require('node:crypto');
const roblox = require('../services/roblox');
const link = require('../services/robloxLink');
const { isAdminOrOwner } = require('../services/permissions');

// ตั้ง ROBLOX_REQUIRE_VERIFY=false ใน .env ถ้าไม่ต้องการให้ยืนยันด้วยรหัส
const REQUIRE_VERIFY = String(process.env.ROBLOX_REQUIRE_VERIFY ?? 'true').toLowerCase() !== 'false';
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const pending = new Map(); // discordId → { robloxId, robloxName, code, expires, attempts }

// ใช้รหัสเป็นคำอังกฤษ 3 คำ เพราะตัวกรองของ Roblox มักตัดตัวเลขยาว ๆ/รหัสแปลก ๆ ใน About
const WORDS = ['tiger', 'maple', 'orbit', 'cloud', 'ocean', 'river', 'stone', 'eagle', 'flame', 'frost',
  'lunar', 'solar', 'comet', 'piano', 'pixel', 'robot', 'amber', 'coral', 'dune', 'ember', 'falcon',
  'garden', 'harbor', 'island', 'jungle', 'kitten', 'lemon', 'mango', 'noble', 'olive', 'panda',
  'quartz', 'rocket', 'sunset', 'thunder', 'velvet', 'willow', 'zephyr', 'bamboo', 'candle'];
const makeCode = () => Array.from({ length: 3 }, () => WORDS[crypto.randomInt(WORDS.length)]).join(' ');

async function finishLink(member, user, verified) {
  await link.ensureMember(member);
  const fetched = await roblox.fetchProfile(user.id);
  const profile = {
    ...(fetched || {}),
    roblox_id: Number(user.id),
    roblox_username: user.name,
    roblox_display_name: user.displayName,
  };
  const res = await link.linkRoblox(member.id, profile, { verified });
  if (!res.ok) return { error: '❌ บัญชี Roblox นี้ถูกเชื่อมกับสมาชิกคนอื่นไปแล้ว ถ้าเป็นบัญชีของคุณจริง ให้แจ้ง Admin' };

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('✅ เชื่อม Roblox สำเร็จ')
    .setDescription(`**${member.displayName}** ↔ [${user.displayName} (@${user.name})](https://www.roblox.com/users/${user.id}/profile)`)
    .addFields(
      { name: 'Roblox User ID', value: String(user.id), inline: true },
      { name: 'การยืนยัน', value: verified ? '✔ ยืนยันด้วยรหัสแล้ว' : 'ไม่ได้ยืนยัน (Admin เชื่อมให้)', inline: true }
    )
    .setFooter({ text: 'ข้อมูลจะขึ้นบนเว็บภายในไม่กี่วินาที • ลบรหัสออกจาก About ได้เลย' });
  if (profile.roblox_headshot) embed.setThumbnail(profile.roblox_headshot);
  if (profile.roblox_avatar) embed.setImage(profile.roblox_avatar);
  return { embed };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linkroblox')
    .setDescription('เชื่อม Discord ของคุณกับบัญชี Roblox')
    .addStringOption((o) => o.setName('roblox').setDescription('Roblox Username หรือ User ID').setRequired(true))
    .addUserOption((o) => o.setName('user').setDescription('(Admin) เชื่อมให้สมาชิกคนอื่น โดยไม่ต้องยืนยัน')),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser('user');
    let targetId = interaction.user.id;
    let force = false;
    if (targetUser && targetUser.id !== interaction.user.id) {
      if (!isAdminOrOwner(interaction)) return interaction.editReply('⛔ การเชื่อมให้คนอื่นใช้ได้เฉพาะ Admin / Owner');
      targetId = targetUser.id;
      force = true;
    }

    const member = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!member) return interaction.editReply('ไม่พบสมาชิกคนนี้ใน Server');

    let user;
    try { user = await roblox.resolveUser(interaction.options.getString('roblox', true)); }
    catch (err) { return interaction.editReply(`❌ ${err.message}`); }
    if (!user) return interaction.editReply('❌ ไม่พบบัญชี Roblox นี้ ตรวจตัวสะกดอีกครั้ง');
    if (user.isBanned) return interaction.editReply('❌ บัญชี Roblox นี้ถูกแบน จึงเชื่อมไม่ได้');

    const owner = await link.findOwnerOfRoblox(user.id);
    if (owner && owner !== targetId) {
      return interaction.editReply('❌ บัญชี Roblox นี้ถูกเชื่อมกับสมาชิกคนอื่นไปแล้ว ถ้าเป็นบัญชีของคุณจริง ให้แจ้ง Admin');
    }

    // Admin เชื่อมให้ หรือปิดการยืนยัน → เชื่อมทันที
    if (force || !REQUIRE_VERIFY) {
      const r = await finishLink(member, user, false);
      return interaction.editReply(r.error ? r.error : { embeds: [r.embed] });
    }

    // ขั้นตอนยืนยันเจ้าของบัญชี: ให้ใส่รหัสใน About ของ Roblox
    const code = makeCode();
    pending.set(interaction.user.id, {
      robloxId: user.id, robloxName: user.name, code, expires: Date.now() + TTL_MS, attempts: 0,
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🔐 ยืนยันว่าเป็นบัญชีของคุณ')
      .setDescription(
        `กำลังเชื่อมกับ [${user.displayName} (@${user.name})](https://www.roblox.com/users/${user.id}/profile)\n\n` +
        `**ขั้นตอน**\n` +
        `1. เปิดโปรไฟล์ Roblox ของคุณ → แก้ไข **About (คำอธิบาย)**\n` +
        `2. ใส่รหัสนี้ลงไป แล้วบันทึก:\n\`\`\`${code}\`\`\`\n` +
        `3. กดปุ่ม **ตรวจสอบ** ด้านล่าง\n\n` +
        `รหัสหมดอายุใน 10 นาที • ถ้าเพิ่งบันทึก รอสักครู่แล้วกดใหม่`
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('robloxverify:check').setLabel('ตรวจสอบ').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('robloxverify:cancel').setLabel('ยกเลิก').setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  // จัดการปุ่ม "ตรวจสอบ/ยกเลิก" (index.js ส่งต่อมาที่นี่)
  async handleButton(interaction) {
    const action = interaction.customId.split(':')[1];
    const p = pending.get(interaction.user.id);

    if (action === 'cancel') {
      pending.delete(interaction.user.id);
      return interaction.update({ content: 'ยกเลิกแล้ว', embeds: [], components: [] });
    }

    if (!p || p.expires < Date.now()) {
      pending.delete(interaction.user.id);
      return interaction.update({ content: '⌛ รหัสหมดอายุแล้ว ใช้ /linkroblox ใหม่อีกครั้ง', embeds: [], components: [] });
    }
    if (++p.attempts > MAX_ATTEMPTS) {
      pending.delete(interaction.user.id);
      return interaction.update({ content: '⛔ ตรวจสอบหลายครั้งเกินไป ใช้ /linkroblox ใหม่', embeds: [], components: [] });
    }

    await interaction.deferUpdate();
    try {
      const u = await roblox.getUser(p.robloxId);
      const about = String(u?.description || '').toLowerCase().replace(/\s+/g, ' ');
      if (!u || !about.includes(p.code)) {
        return interaction.followUp({
          content: '🔎 ยังไม่พบรหัสใน About ของบัญชีนี้ ตรวจว่าบันทึกแล้ว และรหัสไม่ถูกตัดเป็น #### ถ้ายังไม่ได้ให้ Admin ใช้ /linkroblox user:@คุณ เชื่อมให้',
          flags: MessageFlags.Ephemeral,
        });
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const r = await finishLink(member, u, true);
      pending.delete(interaction.user.id);
      await interaction.editReply(r.error ? { content: r.error, embeds: [], components: [] } : { content: '', embeds: [r.embed], components: [] });
    } catch (err) {
      console.error('verify roblox error:', err);
      await interaction.followUp({ content: `❌ ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  },
};

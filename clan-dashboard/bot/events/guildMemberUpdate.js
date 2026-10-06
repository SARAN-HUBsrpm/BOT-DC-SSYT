const { Events } = require('discord.js');
const { memberUpdateQueue } = require('../services/memberUpdateQueue');

function roleKey(member) {
  return member.roles.cache
    .filter((role) => role.id !== member.guild.id)
    .map((role) => role.id)
    .sort()
    .join(',');
}

module.exports = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember, newMember) {
    const changed =
      oldMember.nickname !== newMember.nickname ||
      oldMember.displayName !== newMember.displayName ||
      oldMember.displayAvatarURL() !== newMember.displayAvatarURL() ||
      roleKey(oldMember) !== roleKey(newMember);

    if (changed) memberUpdateQueue.enqueueMember(newMember, 'guildMemberUpdate');
  },
};

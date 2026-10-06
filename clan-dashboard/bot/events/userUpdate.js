const { Events } = require('discord.js');
const { memberUpdateQueue } = require('../services/memberUpdateQueue');

module.exports = {
  name: Events.UserUpdate,

  async execute(oldUser, newUser) {
    const changed =
      oldUser.username !== newUser.username ||
      oldUser.globalName !== newUser.globalName ||
      oldUser.avatar !== newUser.avatar;
    if (!changed) return;

    const guildId = process.env.GUILD_ID;
    const guild = newUser.client.guilds.cache.get(guildId) || await newUser.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const member = guild.members.cache.get(newUser.id) || await guild.members.fetch(newUser.id).catch(() => null);
    if (member) memberUpdateQueue.enqueueMember(member, 'userUpdate');
  },
};

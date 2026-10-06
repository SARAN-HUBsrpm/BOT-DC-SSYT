const { Events } = require('discord.js');
const { memberUpdateQueue } = require('../services/memberUpdateQueue');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    memberUpdateQueue.enqueueMember(member, 'guildMemberAdd');
  },
};

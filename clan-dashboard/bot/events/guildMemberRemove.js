const { Events } = require('discord.js');
const { memberUpdateQueue } = require('../services/memberUpdateQueue');

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member) {
    memberUpdateQueue.enqueueMemberLeft(member);
  },
};

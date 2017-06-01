exports.run = async (client, message, command, config) => {
  message.reply("", {embed: {
    color: config.color,
    description: "https://github.com/HSteffensen/BotBolt/wiki/Help"
  }});
};

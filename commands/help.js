exports.run = async (client, message, command, config) => {
  message.reply("", {embed: {
    color: config.color,
    description: "https://hsteffensen.github.io/BotBolt/help.html"
  }});
};

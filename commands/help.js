exports.run = async (client, message, command, config) => {
  message.reply("", {embed: {
    color: config.color,
    description: "",
    fields: [
      {
        name: "Documentation",
        value: "https://hsteffensen.github.io/BotBolt/help.html"
      },
      {
        name: "Development Discord",
        value: "https://discord.gg/WURxhs7"
      }
    ]
  }});
};

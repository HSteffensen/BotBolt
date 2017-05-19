const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");

client.login(config.token);

client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", (message) => {
  if (message.author.bot) return; //ignore other bots
  if (!message.content.startsWith(config.prefix)) return; //ignore any non-commands
  let command = message.content.slice(1);
  if (command.startsWith("ping")) {
    message.channel.send("pong!");
  }
});
//test1

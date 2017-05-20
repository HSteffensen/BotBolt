const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");

client.login(config.token);

client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", (message) => {
  if (message.author.bot) return; //ignore other bots
  if (!message.content.startsWith(config.prefix)) {
    return; //ignore any non-commands for now
  } else {
    let messageSplit = message.content.split(" ");
    let command = messageSplit[0].slice(config.prefix.length);
    let args = messageSplit.slice(1);
    console.log(command);
    console.log(args);

    let commandSanitize = /[^\w]/;
    if(!commandSanitize.test(command)) {
      message.channel.send("out");
    }
  }
});

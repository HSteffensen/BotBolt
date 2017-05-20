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

    let commandSanitize = /[^\w]/; //test for anything other than [a-z], [A-Z], [0-9], or '_'. reject if found.
    if(!commandSanitize.test(command)) {
      try {
        let commandFile = require(`./commands/${command}.js`);
        commandFile.run(client, message, args);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

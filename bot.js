const Discord = require("discord.js");
const client = new Discord.Client();
const sql = require("sqlite");
sql.open("./data/database.sqlite");
const config = require("./config.json");

client.login(config.token);

client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", async (message) => {
  if (message.author.bot) return; //ignore other bots
  let commands = parseMessageForCommands(message);
  for(let i = 0; i < commands.length; i++) {
    let line = commands[i].trim();
    if (!line.startsWith(config.prefix)) {
      return; //ignore any non-commands for now
    } else {
      let messageSplit = line.split(" ");
      let command = messageSplit[0].slice(config.prefix.length);
      let args = messageSplit.slice(1);

      let commandSanitize = /\b\w+\b/; //test for anything other than [a-z], [A-Z], [0-9], or '_'. reject if found.
      if(commandSanitize.test(command)) {
        try {
          let commandFile = require(`./commands/${command}.js`);
          await commandFile.run(client, message, args, config, sql);
        } catch (err) {
          console.error(err);
        }
      }
    }
  }
});

function parseMessageForCommands(message) {
  let commandRegexp = /([^\{\}\;]+\{[^\{\}]+\}|[^\{\}\;]+)/g; //splits commands by semicolon or allows semicolons inside {}
  let commandSplit = message.content.match(commandRegexp);
  return commandSplit;
}

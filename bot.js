const Discord = require("discord.js");
const client = new Discord.Client();
const sql = require("sqlite");
sql.open("./data/database.sqlite");
const config = require("./config.json");
const shortcut = require("./shortcut.json");

client.login(config.token);

client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", async (message) => {
  if (message.author.bot) return; //ignore other bots
  let commands = parseForCommands(message.content);
  for(let i = 0; i < commands.length; i++) {
    let command = commands[i];
    if (command.type === "command") {
      let commandName = (shortcut[command.name]) ? shortcut[command.name] : command.name;
      let commandSanitize = /\b\w+\b/; //test for anything other than [a-z], [A-Z], [0-9], or '_'. reject if found.
      if(commandSanitize.test(commandName)) {
        try {
          let commandFile = require(`./commands/${commandName}.js`);
          await commandFile.run(client, message, command, config, sql);
        } catch (err) {
          console.error(err);
        }
      }
    } else if (command.type === "alias") {

    }
  }
});

function parseForCommands(message) {
  let commandRegexp = /([^\;]+\"[^\"]+\"[^\;]*|[^\;]+)/g; //splits commands by semicolon or allows semicolons inside a single pair of ""
  let messageSplit = message.match(commandRegexp);
  let commands = messageSplit.map((line) => {
    line = line.trim();
    let command = {};
    let lineSplit = line.split(" ");
    if(line.startsWith(config.commandPrefix)) {
      command.type = "command";
      command.name = lineSplit[0].slice(config.commandPrefix.length);
      command.silent = false;
      command.verbose = false;
      command.args = lineSplit.slice(1);
      if(lineSplit[1] === "-s") {
        command.silent = true;
        command.args = lineSplit.slice(2);
      } else if(lineSplit[1] === "-v") {
        command.verbose = true;
        command.args = lineSplit.slice(2);
      }
    } else if(line.startsWith(config.aliasPrefix)) {
      command.type = "alias";
      command.name = lineSplit[0].slice(config.commandPrefix.length);
      command.args = lineSplit.slice(1);
    }


    return command;
  });
  return commands;
}

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
    if (commands[i].type === "command") {
      await runCommand(commands[i], message);
    } else if (commands[i].type === "alias") {
      let unpackedLine = await unpackAlias(commands[i].name);
      if(!commands[i].silent) {
        message.channel.send("", {embed: {
          color: config.color,
          description: `\"${commands[i].name}\" => \"${unpackedLine}\"`
        }});
      }
      let aliasCommands = parseForCommands(unpackedLine);
      for(let j = 0; i < aliasCommands.length; i++) {
        if(aliasCommands[j].type === "command") {
          await runCommand(aliasCommands[j], message);
        }
      }
    }
  }
});

async function runCommand(command, message) {
  let commandName = (shortcut[command.name]) ? shortcut[command.name] : command.name;
  let commandSanitize = /\b\w+\b/; //test for anything other than [a-z], [A-Z], [0-9], or '_'. reject if found.
  if(commandSanitize.test(commandName)) {
    try {
      let commandFile = require(`./commands/${commandName}.js`);
      await commandFile.run(client, message, command, config, sql, shortcut);
    } catch (err) {
      console.error(err);
    }
  }
}

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
      command.shortcut = lineSplit[0].slice(config.commandPrefix.length);
    } else if(line.startsWith(config.aliasPrefix)) {
      command.type = "alias";
      command.name = lineSplit[0].slice(config.aliasPrefix.length);
    }
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

    return command;
  });
  return commands;
}

async function unpackAlias(aliasName) {
  try {
    let row = await sql.get(`SELECT * FROM alias WHERE name ="${aliasName}"`);
    if(row) {
      return row.commands;
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table alias");
    await sql.run("CREATE TABLE IF NOT EXISTS alias (name TEXT, commands TEXT)");
  }
}

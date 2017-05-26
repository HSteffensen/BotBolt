const Discord = require("discord.js");
const client = new Discord.Client();
const sql = require("sqlite");
sql.open("./data/database.sqlite");
const config = require("./config.json");
const shortcut = require("./shortcut.json");
let moneypileCache = {
  refresh: true,
  list: []
};
let cooldownCache = {
  refresh: true,
  commands: {},
  timers: {}
};
let keywordData = {

};

client.login(config.token);

client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", async (message) => {
  if (message.author.bot) return; //ignore other bots
  let commands = parseForCommands(message.content);
  let aliasCommands = [];
  for(let i = 0; i < commands.length; i++) {
    if (commands[i].type === "command") {
      await runCommand(commands[i], message);
    } else if (commands[i].type === "alias") {
      let unpackedLine = await unpackAlias(commands[i].name);
      if(unpackedLine.length > 0) {
        if(!commands[i].silent) {
          message.channel.send("", {embed: {
            color: config.color,
            description: `\"${commands[i].name}\" => \"${unpackedLine}\"`
          }});
        }
        aliasCommands = parseForCommands(unpackedLine);
        for(let j = 0; j < aliasCommands.length; j++) {
          if(aliasCommands[j].type === "command") {
            await runCommand(aliasCommands[j], message);
          }
        }
      }
    } else if (commands[i].type === "keyword") {
      await runKeyword(commands[i], message);
    }
  }
  let moneypileFile = require("./routines/moneypile.js");
  await moneypileFile.run(client, message, config, sql, moneypileCache);
});

async function runCommand(command, message) {
  if(command.name === "moneydrop" || command.name === "moneygrab") {
    moneypileCache.refresh = true;
  }
  if(command.name === "cooldown") {
    cooldownCache.refresh = true;
  }
  let commandSanitize = /\b\w+\b/; //test for anything other than [a-z], [A-Z], [0-9], or '_'. reject if found.
  if(commandSanitize.test(command.name)) {
    try {
      let cooldownsFile = require("./routines/cooldowns.js");
      let cooldownOK = await cooldownsFile.checkCooldown(client, message, command, config, sql, cooldownCache);
      if(cooldownOK) {
        let commandFile = require(`./commands/${command.name}.js`);
        await commandFile.run(client, message, command, config, sql, shortcut, keywordData);
        await cooldownsFile.updateCooldown(client, message, command, config, sql, cooldownCache);
      } else {
        await cooldownsFile.punish(client, message, command, config, sql, cooldownCache);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

async function runKeyword(command, message) {
  let kw = keywordData[message.author.id + command.name];
  let commandFile = require(`./commands/${kw.command}.js`);
  await commandFile.runKeyword(client, message, command, config, sql, keywordData);
}

function parseForCommands(message) {
  let commandRegexp = /([^\;]+\"[^\"]*\"[^\;]*|[^\;]+)/g; //splits commands by semicolon or allows semicolons inside a single pair of ""
  let messageSplit = message.match(commandRegexp);
  let commands = messageSplit.map((line) => {
    line = line.trim();
    let command = {};
    let lineSplit = line.split(" ");
    if(line.startsWith(config.commandPrefix)) {
      command.type = "command";
      let commandWord = lineSplit[0].slice(config.commandPrefix.length);
      command.name = (shortcut[commandWord]) ? shortcut[commandWord] : commandWord;
      command.shortcut = commandWord;
    } else if(line.startsWith(config.aliasPrefix)) {
      command.type = "alias";
      command.name = lineSplit[0].slice(config.aliasPrefix.length);
    } else if(keywordData.hasOwnProperty(lineSplit[0] + message.author.id) || keywordData.hasOwnProperty(lineSplit[0] + "0")) {
      command.type = "keyword";
      command.name = lineSplit[0];
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
    } else {
      return "";
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table alias");
    await sql.run("CREATE TABLE IF NOT EXISTS alias (name TEXT, commands TEXT)");
  }
}

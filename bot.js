const Discord = require("discord.js");
const client = new Discord.Client();
const sql = require("sqlite");
sql.open("./data/database.sqlite");
const config = require("./config.json");
const shortcut = require("./shortcut.json");

let cacheData = {
  moneypileCache: {
    refresh: true,
    list: {}
  },
  cooldownCache: {
    refresh: true,
    commands: {},
    timers: {}
  },
  restrictionCache: {},
  keywordData: {}
};

client.login(config.token);

client.on("ready", () => {
  console.log("I am ready!");
  let hedgemazeFile = require("./commands/hedgemaze.js");
  hedgemazeFile.reloadOnRestart(client, config, sql, shortcut, cacheData);
  let restrictionFile = require("./commands/restriction.js");
  restrictionFile.reloadOnRestart(cacheData);
  let skyscrapersFile = require("./routines/skyscrapers.js");
  skyscrapersFile.run(client, config, sql);
});

client.on("message", async (message) => {
  if (message.author.bot) return; //ignore other bots
  let commands = parseForCommands(message.content, message.author.id);
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
        aliasCommands = parseForCommands(unpackedLine, message.author.id);
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
  await moneypileFile.run(client, message, config, sql, cacheData.moneypileCache);
});

client.on("channelDelete", async (channel) => {
  let moneydropFile = require("./commands/moneydrop.js");
  moneydropFile.removeDeletedChannel(client, sql, channel);
});

async function runCommand(command, message) {
  if(command.name === "moneydrop") {
    cacheData.moneypileCache.refresh = true;
  }
  if(command.name === "moneygrab" && cacheData.moneypileCache.list.hasOwnProperty(message.channel.id)) {
    cacheData.moneypileCache.list[message.channel.id].grabbed = true;
  }
  if(command.name === "cooldown") {
    cacheData.cooldownCache.refresh = true;
  }
  let commandSanitize = /\b\w+\b/; //test for anything other than [a-z], [A-Z], [0-9], or '_'. reject if found.
  if(commandSanitize.test(command.name)) {
    try {
      let restrictionsFile = require("./routines/restrictions.js");
      let restrictionOk = restrictionsFile.checkRestriction(client, message, command, config, cacheData);
      let cooldownsFile = require("./routines/cooldowns.js");
      let cooldownOk = await cooldownsFile.checkCooldown(client, message, command, config, sql, cacheData.cooldownCache);
      if(restrictionOk && cooldownOk) {
        try {
          let commandFile = require(`./commands/${command.name}.js`);
          await commandFile.run(client, message, command, config, sql, shortcut, cacheData);
        } catch (err) {
          if(err.code !== "MODULE_NOT_FOUND") { //otherwise a module not found error would be logged for every !blahblahblah that isnt a command
            console.log(err);
          }
        }
        await cooldownsFile.updateCooldown(client, message, command, config, sql, cacheData.cooldownCache);
      } else if(!cooldownOk) {
        await cooldownsFile.punish(client, message, command, config, sql, cacheData.cooldownCache);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

async function runKeyword(command, message) {
  let kw = cacheData.keywordData[command.name + message.author.id];
  let commandFile = require(`./commands/${kw.command}.js`);
  await commandFile.runKeyword(client, message, command, config, sql, cacheData);
}

function parseForCommands(message, authorID) {
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
    } else if(cacheData.keywordData.hasOwnProperty(lineSplit[0] + authorID) || cacheData.keywordData.hasOwnProperty(lineSplit[0] + "0")) {
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
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table alias");
      await sql.run("CREATE TABLE IF NOT EXISTS alias (name TEXT, commands TEXT)");
    }
  }
}

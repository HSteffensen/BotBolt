exports.run = async (client, message, command, config, sql) => {
  let args = command.args;
  //some actions are only allowed for bot owner
  let permitted = false;
  for(let i = 0, len = config.ownerIDs.length; i < len; i++) {
    let owner = config.ownerIDs[i];
    if(owner == message.author.id) {
      permitted = true;
      break;
    }
  }

  if(args.length < 1) {
    return message.reply(`syntax: \`${config.commandPrefix}alias ${config.aliasPrefix}name \"command1;command2;etc\"\``);
  }
  if(!args[0].startsWith(config.aliasPrefix)) {
    if(args[0] === "reloaddefaults") {
      if(permitted) {
        return await reloadDefaultAliases(client, message, command, config, sql);
      } else {
        return message.reply("Permission denied: alias reloaddefaults");
      }
    } else {
      return message.reply(`Alias name must start with \`${config.aliasPrefix}\`.`);
    }
  }

  let aliasName = args[0].slice(config.aliasPrefix.length);
  let aliasCommands = args.slice(1).join(" ");

  if(aliasCommands === "\"\"" || args.length == 1) {
    try {
      let row = await sql.get(`SELECT * FROM alias WHERE name ="${aliasName}"`);
      if(row) {
        if((row.isDefault == 0) || permitted) {
          await sql.run("DELETE FROM alias WHERE name = ?", [aliasName]);
        } else {
          return message.reply("Permission denied: default alias");
        }
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table alias");
        await sql.run("CREATE TABLE IF NOT EXISTS alias (name TEXT, commands TEXT, isDefault INTEGER)");
      }
    }
    if(!command.silent) {
      message.channel.send("", {embed: {
        color: config.color,
        description: `Removed alias \"${aliasName}\"`
      }});
    }
    return;
  }
  if(!aliasCommands.startsWith("\"") || !aliasCommands.endsWith("\"")) {
    return message.reply(`syntax: \`${config.commandPrefix}alias ${config.aliasPrefix}name \"command1;command2;etc\"\`. Do not use quotes within the commands.`);
  }

  aliasCommands = aliasCommands.slice(1, aliasCommands.length - 1).trim();
  let aliasSplit = aliasCommands.split(";");
  for(let i = 0; i < aliasSplit.length; i++) {
    let lineSplit = aliasCommands[i].split(" ");
    if(lineSplit[0].startsWith(config.aliasPrefix)) {
      return message.reply("Alias cannot contain other aliases.");
    }
  }

  try {
    let row = await sql.get(`SELECT * FROM alias WHERE name ="${aliasName}"`);
    if(!row) {
      await sql.run("INSERT INTO alias (name, commands, isDefault) VALUES (?, ?, ?)", [aliasName, aliasCommands, 0]);
    } else {
      if((row.isDefault == 0) || permitted) {
        await sql.run("UPDATE alias SET commands = ? WHERE name = ?", [aliasCommands, aliasName]);
      } else {
        return message.reply("Permission denied: default alias");
      }
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table alias");
      await sql.run("CREATE TABLE IF NOT EXISTS alias (name TEXT, commands TEXT, isDefault INTEGER)");
      await sql.run("INSERT INTO alias (name, commands, isDefault) VALUES (?, ?, ?)", [aliasName, aliasCommands, 0]);
    }
  }

  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: `Added alias \"${aliasName}\" : \"${aliasCommands}\"`
    }});
  }
};

async function reloadDefaultAliases(client, message, command, config, sql) {
  let description = "";
  let aliasDefaults = require("../data/aliasDefaults.json");
  let defaultsList = aliasDefaults.list;
  for(let i = 0; i < defaultsList.length; i++) {
    let aliasName = defaultsList[i].name;
    let aliasCommands = defaultsList[i].commands;
    try {
      let row = await sql.get(`SELECT * FROM alias WHERE name ="${aliasName}"`);
      if(!row) {
        await sql.run("INSERT INTO alias (name, commands, isDefault) VALUES (?, ?, ?)", [aliasName, aliasCommands, 1]);
      } else {
        await sql.run("UPDATE alias SET commands = ?, isDefault = ? WHERE name = ?", [aliasCommands, 1, aliasName]);
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table alias");
        await sql.run("CREATE TABLE IF NOT EXISTS alias (name TEXT, commands TEXT, isDefault INTEGER)");
        await sql.run("INSERT INTO alias (name, commands, isDefault) VALUES (?, ?, ?)", [aliasName, aliasCommands, 1]);
      }
    }
    description += `Set alias \"${aliasName}\" : \"${aliasCommands}\"\n`;
  }
  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: description
    }});
  }
}

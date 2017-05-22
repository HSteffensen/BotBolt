exports.run = async (client, message, command, config, sql) => {
  let args = command.args;

  if(args.length < 1) {
    return message.reply(`syntax: \`${config.commandPrefix}alias ${config.aliasPrefix}name \"command1;command2;etc\"\``);
  }
  if(!args[0].startsWith(config.aliasPrefix)) {
    return message.reply(`Alias name must start with \`${config.aliasPrefix}\`.`);
  }

  let aliasName = args[0].slice(config.aliasPrefix.length);
  let aliasCommands = args.slice(1).join(" ");

  if(aliasCommands === "\"\"" || args.length == 1) {
    try {
      let row = await sql.get(`SELECT * FROM alias WHERE name ="${aliasName}"`);
      if(row) {
        await sql.run("DELETE FROM alias WHERE name = ?", [aliasName]);
      }
    } catch(e) {
      console.error(e);
      console.log("Creating table alias");
      await sql.run("CREATE TABLE IF NOT EXISTS alias (name TEXT, commands TEXT)");
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
      await sql.run("INSERT INTO alias (name, commands) VALUES (?, ?)", [aliasName, aliasCommands]);
    } else {
      await sql.run("UPDATE alias SET commands = ? WHERE name = ?", [aliasCommands, aliasName]);
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table alias");
    await sql.run("CREATE TABLE IF NOT EXISTS alias (name TEXT, commands TEXT)");
    await sql.run("INSERT INTO alias (name, commands) VALUES (?, ?)", [aliasName, aliasCommands]);
  }

  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: `Added alias \"${aliasName}\" : \"${aliasCommands}\"`
    }});
  }
};

exports.run = async (client, message, command, config, sql, shortcut) => {
  let args = command.args;
  // Caller must be bot owner
  let permitted = false;
  //let authorID = message.author.id.toString();
  for(let i = 0, len = config.ownerIDs.length; i < len; i++) {
    let owner = config.ownerIDs[i];
    if(owner == message.author.id) {
      permitted = true;
      break;
    }
  }
  if(!permitted) {
    return message.reply("Permission denied: cooldown");
  }

  if(args.length < 1) {
    return message.reply("Bad request: must provide a command name.");
  }

  let commandName = args[0];
  if(commandName.startsWith(config.commandPrefix)) {
    commandName = commandName.slice(config.commandPrefix.length);
  }

  commandName = (shortcut[commandName]) ? shortcut[commandName] : commandName;
  try {
    require(`./${commandName}.js`); //this is janky and probably should be done with fs.stat instead.
  } catch(e) {
    return message.reply(`Bad request: command \"${commandName}\" not found.`);
  }

  if(args.length == 1) {
    return await checkCooldown(client, message, command, config, sql, commandName);
  }

  let numberCheck = /\b\d+\b/;
  if(!numberCheck.test(args[1])) {
    return message.reply("Bad request: must provide number in seconds, 0 to remove.");
  }

  if(args[1] === "0") {
    return await removeCooldown(client, message, command, config, sql, commandName);
  }

  await setCooldown(client, message, command, config, sql, commandName);
};

async function checkCooldown(client, message, command, config, sql, commandName) {
  let time = 0;
  let description = "";

  try {
    let row = await sql.get(`SELECT * FROM cooldowns WHERE commandName ="${commandName}"`);
    if(row) {
      time = row.downtime;
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table cooldowns");
    await sql.run("CREATE TABLE IF NOT EXISTS cooldowns (commandName TEXT, downtime INTEGER)");
  }

  if(time == 0) {
    description = `**!${commandName}** has no cooldown.`
  } else {
    description = `Cooldown for **!${commandName}** is ${time} seconds.`;
  }

  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});
}

async function setCooldown(client, message, command, config, sql, commandName) {
  let args = command.args;
  let time = args[1];

  try {
    let row = await sql.get(`SELECT * FROM cooldowns WHERE commandName ="${commandName}"`);
    if(!row) {
      await sql.run("INSERT INTO cooldowns (commandName, downtime) VALUES (?, ?)", [commandName, time]);
    } else {
      await sql.run("UPDATE cooldowns SET downtime = ? WHERE commandName = ", [time, commandName]);
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table cooldowns");
    await sql.run("CREATE TABLE IF NOT EXISTS cooldowns (commandName TEXT, downtime INTEGER)");
    await sql.run("INSERT INTO cooldowns (commandName, downtime) VALUES (?, ?)", [commandName, time]);
  }

  message.channel.send("", {embed: {
    color: config.color,
    description: `Cooldown for **!${commandName}** set to ${time} seconds.`
  }});
}

async function removeCooldown(client, message, command, config, sql, commandName) {
  let time = 0;
  let description = "";

  try {
    let row = await sql.get(`SELECT * FROM cooldowns WHERE commandName ="${commandName}"`);
    if(row) {
      time = row.downtime;
      await sql.run("DELETE FROM cooldowns WHERE commandName = ?", [commandName]);
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table cooldowns");
    await sql.run("CREATE TABLE IF NOT EXISTS cooldowns (commandName TEXT, downtime INTEGER)");
  }

  if(time == 0) {
    description = `**!${commandName}** has no cooldown.`
  } else {
    description = `Cooldown removed for **!${commandName}**.`
  }

  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});
}

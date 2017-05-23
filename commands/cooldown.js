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

  if(commandName === "cooldown") {
    return message.reply("Bad request: do not put a cooldown on \"cooldown\".");
  }

  let numberCheck = /\b\d+\b/;

  if(args[1] === "remove") {
    return await removeCooldown(client, message, command, config, sql, commandName);
  }

  if(args[1] === "verbosity") {
    let verbosityCheck = /\b(0|1|2|3|none|low|high|default)\b/;
    if(!verbosityCheck.test(args[2])) {
      return message.reply("verbosity requires 0, 1, 2, or default.");
    }
    let verbosityMap = {
      "none": "0",
      "low": "1",
      "high": "2",
      "default": "3"
    };
    let input = (verbosityMap[args[2]]) ? verbosityMap[args[2]] : args[2];
    return await setVerbosity(client, message, command, config, sql, commandName, input);
  }

  if(args[1] === "punishment" || args[1] === "punish") {
    if(!numberCheck.test(args[2])) {
      return message.reply("punishment requires an integer.");
    }
    return await setPunishment(client, message, command, config, sql, commandName);
  }

  if(!numberCheck.test(args[1])) {
    return message.reply("Bad request: must provide number in seconds, or one of ` remove | verbosity | punishment `.");
  }

  await setCooldown(client, message, command, config, sql, commandName);
};

async function checkCooldown(client, message, command, config, sql, commandName) {
  let time = 0;
  let verbosity = 0;
  let punishment = 0;
  let description = "";
  let exists = false;

  try {
    let row = await sql.get(`SELECT * FROM cooldowns WHERE commandName ="${commandName}"`);
    if(row) {
      time = row.downtime;
      verbosity = row.verbosity;
      punishment = row.punishment;
      exists = true;
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table cooldowns");
    await sql.run("CREATE TABLE IF NOT EXISTS cooldowns (commandName TEXT, downtime INTEGER, verbosity INTEGER, punishment INTEGER)");
  }

  let verbosityOutput = ["\"none\"", "\"low\"", "\"high\"", "default to global setting"];

  if(!exists) {
    description = `**!${commandName}** has no cooldown configuration.`;
  } else {
    description += `Cooldown for **!${commandName}** is ${time} seconds.\n`;
    description += `Time left alert set to ${verbosityOutput[verbosity]}.\n`;
    description += `Punishment is ${punishment} added seconds.\n`;
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
      await sql.run("INSERT INTO cooldowns (commandName, downtime, verbosity, punishment) VALUES (?, ?, ?, ?)", [commandName, time, 3, 0]);
    } else {
      await sql.run("UPDATE cooldowns SET downtime = ? WHERE commandName = ?", [time, commandName]);
    }
    if(time === "0") {
      await sql.run("DELETE FROM cooldownTimers WHERE commandName = ?", [commandName]);
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table cooldowns");
    await sql.run("CREATE TABLE IF NOT EXISTS cooldowns (commandName TEXT, downtime INTEGER, verbosity INTEGER, punishment INTEGER)");
    await sql.run("INSERT INTO cooldowns (commandName, downtime, verbosity, punishment) VALUES (?, ?, ?, ?)", [commandName, time, 3, 0]);
  }

  message.channel.send("", {embed: {
    color: config.color,
    description: `Cooldown for **!${commandName}** set to ${time} seconds.`
  }});
}

async function removeCooldown(client, message, command, config, sql, commandName) {
  let exists = false;
  let description = "";


  try {
    let row = await sql.get(`SELECT * FROM cooldowns WHERE commandName ="${commandName}"`);
    if(row) {
      exists = true;
      await sql.run("DELETE FROM cooldowns WHERE commandName = ?", [commandName]);
    }
    await sql.run("DELETE FROM cooldownTimers WHERE commandName = ?", [commandName]);
  } catch(e) {
    console.error(e);
    console.log("Creating table cooldowns");
    await sql.run("CREATE TABLE IF NOT EXISTS cooldowns (commandName TEXT, downtime INTEGER, verbosity INTEGER, punishment INTEGER)");
  }

  if(!exists) {
    description = `**!${commandName}** has no cooldown configuration.`;
  } else {
    description = `Cooldown configuration removed for **!${commandName}**.`;
  }

  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});
}

async function setVerbosity(client, message, command, config, sql, commandName, verbosity) {
  try {
    let row = await sql.get(`SELECT * FROM cooldowns WHERE commandName ="${commandName}"`);
    if(!row) {
      await sql.run("INSERT INTO cooldowns (commandName, downtime, verbosity, punishment) VALUES (?, ?, ?, ?)", [commandName, 0, verbosity, 0]);
    } else {
      await sql.run("UPDATE cooldowns SET verbosity = ? WHERE commandName = ?", [verbosity, commandName]);
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table cooldowns");
    await sql.run("CREATE TABLE IF NOT EXISTS cooldowns (commandName TEXT, downtime INTEGER, verbosity INTEGER, punishment INTEGER)");
    await sql.run("INSERT INTO cooldowns (commandName, downtime, verbosity, punishment) VALUES (?, ?, ?, ?)", [commandName, 0, verbosity, 0]);
  }

  let verbosityOutput = ["\"none\"", "\"low\"", "\"high\"", "default to global setting"];

  message.channel.send("", {embed: {
    color: config.color,
    description: `Verbosity of **!${commandName}** cooldown set to ${verbosityOutput[verbosity]}.`
  }});
}

async function setPunishment(client, message, command, config, sql, commandName) {
  let punishment = command.args[2];

  try {
    let row = await sql.get(`SELECT * FROM cooldowns WHERE commandName ="${commandName}"`);
    if(!row) {
      await sql.run("INSERT INTO cooldowns (commandName, downtime, verbosity, punishment) VALUES (?, ?, ?, ?)", [commandName, 0, 3, punishment]);
    } else {
      await sql.run("UPDATE cooldowns SET punishment = ? WHERE commandName = ?", [punishment, commandName]);
    }
  } catch(e) {
    console.error(e);
    console.log("Creating table cooldowns");
    await sql.run("CREATE TABLE IF NOT EXISTS cooldowns (commandName TEXT, downtime INTEGER, verbosity INTEGER, punishment INTEGER)");
    await sql.run("INSERT INTO cooldowns (commandName, downtime, verbosity, punishment) VALUES (?, ?, ?, ?)", [commandName, 0, 3, punishment]);
  }

  message.channel.send("", {embed: {
    color: config.color,
    description: `Punishment for calling **!${commandName}** during cooldown set to ${punishment} added seconds.`
  }});
}

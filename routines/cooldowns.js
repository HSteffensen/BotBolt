exports.checkCooldown = async (client, message, command, config, sql, data) => {
  let author = message.author;
  let authorID = author.id;
  let commandName = command.name;
  let timestamp = message.createdTimestamp;

  if(data.refresh && command.name !== "cooldown") {
    await refreshCooldownCache(sql, data); //should be run after time !cooldown is called ever
  }

  if(data.commands.hasOwnProperty(commandName) && data.commands[commandName].downtime > 0 && data.timers.hasOwnProperty(authorID + commandName)) {
    let timer = data.timers[authorID + commandName];
    let endTime = timer.startTime + timer.downtime;
    if(timestamp < endTime) {
      return false;
    }
  }

  return true;
};

exports.updateCooldown = async (client, message, command, config, sql, data) => {
  let author = message.author;
  let authorID = author.id;
  let commandName = command.name;
  if(!data.commands.hasOwnProperty(commandName) || data.commands[commandName].downtime <= 0) {
    return;
  }
  let timestamp = message.createdTimestamp;
  let downtime = data.commands[commandName].downtime * 1000;

  data.timers[authorID + commandName] = {
    userIDcommandName: authorID + commandName,
    userID: authorID,
    commandName: commandName,
    startTime: timestamp,
    downtime: downtime
  };

  try {
    let row = await sql.get(`SELECT * FROM cooldownTimers WHERE userIDcommandName ="${authorID + commandName}"`);
    if(!row) {
      await sql.run("INSERT INTO cooldownTimers (userIDcommandName, userID, commandName, startTime, downtime) VALUES (?, ?, ?, ?, ?)", [authorID + commandName, authorID, commandName, timestamp, downtime]);
    } else {
      await sql.run("UPDATE cooldownTimers SET startTime = ?, downtime = ? WHERE userIDcommandName = ?", [timestamp, downtime, authorID + commandName]);
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table cooldownTimers");
      await sql.run("CREATE TABLE IF NOT EXISTS cooldownTimers (userIDcommandName TEXT, userID TEXT, commandName TEXT, startTime INTEGER, downtime INTEGER)");
      await sql.run("INSERT INTO cooldownTimers (userIDcommandName, userID, commandName, startTime, downtime) VALUES (?, ?, ?, ?, ?)", [authorID + commandName, authorID, commandName, timestamp, downtime]);
    }
  }
};

exports.punish = async (client, message, command, config, sql, data) => {
  let author = message.author;
  let authorID = author.id;
  let commandName = command.name;
  let commandData = data.commands[commandName];
  let timestamp = message.createdTimestamp;
  let description = "";

  if(commandData.punishment > 0) {
    data.timers[authorID + commandName].downtime += commandData.punishment * 1000;
    if(commandData.verbosity == 2) {
      description = `\n${commandData.punishment} seconds added to your timer.`;
    }
    try {
      await sql.run("UPDATE cooldownTimers SET downtime = ? WHERE userIDcommandName = ?", [data.downtime, authorID + commandName]);
    } catch(e) {
      console.error(e);
    }
  }

  if(commandData.verbosity == 2) {
    let timer = data.timers[authorID + commandName];
    let timeleft = Math.ceil((timer.startTime + timer.downtime - timestamp) / 1000);
    description += `\n${timeleft} seconds until you can use **!${commandName}**.`;
  }

  if(commandData.verbosity == 1 || commandData.verbosity == 2) {
    description = `You are on cooldown for **!${commandName}**.` + description;
    try {
      let alertMsg = await message.channel.send("", {embed: {
        color: config.color,
        description: description
      }});
      deleteAlert(client, config, alertMsg);
    } catch(e) {
      console.log(e);
    }
  }
};

async function refreshCooldownCache(sql, data) {
  data.refresh = false;
  data.commands = {};
  data.timers = {};

  try{
    let row = await sql.all("SELECT * FROM cooldowns");
    for(let i = 0; i < row.length; i++) {
      data.commands[row[i].commandName] = row[i];
    }

    row = await sql.all("SELECT * FROM cooldownTimers");
    for(let i = 0; i < row.length; i++) {
      data.timers[row[i].userIDcommandName] = row[i];
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table cooldownTimers");
      await sql.run("CREATE TABLE IF NOT EXISTS cooldownTimers (userIDcommandName TEXT, userID TEXT, commandName TEXT, startTime INTEGER, downtime INTEGER)");
      console.log("Creating table cooldowns");
      await sql.run("CREATE TABLE IF NOT EXISTS cooldowns (commandName TEXT, downtime INTEGER, verbosity INTEGER, punishment INTEGER)");
    }
  }
}

async function deleteAlert(client, config, alertMsg) {
  if(alertMsg.channel.permissionsFor(client.user).has("MANAGE_MESSAGES")) {
    await sleep(config.deleteTimer * 1000);
    await alertMsg.delete();
  }
}

// From http://stackoverflow.com/a/39914235
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

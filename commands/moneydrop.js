exports.run = async (client, message, command, config, sql) => {
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
    return message.reply("Permission denied: moneydrop");
  }

  let channels = (message.mentions.channels.array().length > 0) ? message.mentions.channels.array() : [message.channel];

  let values = {
    "enable": 1,
    "disable": 0,
    "on": 1,
    "off": 0
  };
  if(values.hasOwnProperty(args[0])) {
    return await toggleMoneydrop(client, message, command, config, sql, channels, values[args[0]]);
  }

  if(args[0] === "set") {
    return await setProperty(client, message, command, config, sql, channels);
  }

  return await checkMoneydrop(client, message, command, config, sql, channels);
};

async function checkMoneydrop(client, message, command, config, sql, channels) {
  let description = "";
  for(let i = 0, len = channels.length; i < len; i++) {
    let channel = channels[i];
    let channelID = channel.id;
    try {
      let row = await sql.get(`SELECT * FROM moneydrop WHERE channelID ="${channelID}"`);
      if(!row) {
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [channelID, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
      } else {
        description += `${channel}\n`;
        description += `Enabled: ${(row.dropMoney == 1)}\n`;
        description += `Drop: ${row.firstMin} to ${row.firstMax}, ${row.firstProbability} chance.\n`;
        description += `Drop: ${row.secondMin} to ${row.secondMax}, ${row.secondProbability} chance.\n`;
        description += `Drop: ${row.thirdMin} to ${row.thirdMax}, ${row.thirdProbability} chance.\n`;
      }
    } catch(e) {
      console.error(e);
      console.log("Creating table moneydrop");
      await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
      await sql.run("INSERT INTO moneydrop (channelID, dropMoney, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
       [channelID, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
    }
  }

  // Can't be silent or more verbose.
  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});
}

async function toggleMoneydrop(client, message, command, config, sql, channels, enabled) {
  let description = "";
  for(let i = 0, len = channels.length; i < len; i++) {
    let channel = channels[i];
    let channelID = channel.id;
    try {
      let row = await sql.get(`SELECT * FROM moneydrop WHERE channelID ="${channelID}"`);
      if(!row) {
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [channelID, enabled, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
      } else {
        await sql.run(`UPDATE moneydrop SET dropMoney = ${enabled} WHERE channelID = ${channelID}`);
      }
    } catch(e) {
      console.error(e);
      console.log("Creating table moneydrop");
      await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
      await sql.run("INSERT INTO moneydrop (channelID, dropMoney, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
       [channelID, enabled, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
    }
    if (enabled == 1) {
      description += `Money drop **enabled** in ${channel}.\n`;
    } else {
      description += `Money drop **disabled** in ${channel}.\n`;
    }
  }

  // Can't be silent or more verbose.
  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});
}

async function setProperty(client, message, command, config, sql, channels) {
  let args = command.args;

  if(args[1] === "firstMin" || args[1] === "firstMax"|| args[1] === "secondMin"|| args[1] === "secondMax"|| args[1] === "thirdMin"|| args[1] === "thirdMax") {
    let numberCheck = /\b\d+\b/;
    if(!numberCheck.test(args[2])) {
      return message.reply(`set ${args[1]} requires an integer.`);
    }
  } else if(args[1] === "firstProbability" || args[1] === "secondProbability" || args[1] === "thirdProbability") {
    let numberCheck = /\b0\.\d+\b/;
    if(!numberCheck.test(args[2])) {
      return message.reply(`set ${args[1]} requires a decimal number between 0 and 1.`);
    }
  } else {
    return message.reply("!moneydrop set options: `firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability`");
  }

  let description = "";
  for(let i = 0, len = channels.length; i < len; i++) {
    let channel = channels[i];
    let channelID = channel.id;
    try {
      let row = await sql.get(`SELECT * FROM moneydrop WHERE channelID ="${channelID}"`);
      if(!row) {
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [channelID, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
        await sql.run(`UPDATE moneydrop SET ${args[1]} = ${args[2]} WHERE channelID = ${channelID}`);
      } else {
        await sql.run(`UPDATE moneydrop SET ${args[1]} = ${args[2]} WHERE channelID = ${channelID}`);
      }
    } catch(e) {
      console.error(e);
      console.log("Creating table moneydrop");
      await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
      await sql.run("INSERT INTO moneydrop (channelID, dropMoney, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
       [channelID, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
      await sql.run(`UPDATE moneydrop SET ${args[1]} = ${args[2]} WHERE channelID = ${channelID}`);
    }
    description += `${channel} ${args[1]} set to ${args[2]}.\n`;
  }

  // Can't be silent or more verbose.
  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});

}

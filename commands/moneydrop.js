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

  if(channels[0].type === "dm") {
    return message.reply("Bad request: can't drop money in a DM.");
  }

  let values = {
    "enable": 1,
    "disable": 0,
    "enabled": 1,
    "disabled": 0,
    "on": 1,
    "off": 0
  };
  if(values.hasOwnProperty(args[0])) {
    return await toggleMoneydrop(client, message, command, config, sql, channels, values[args[0]]);
  }

  if(args[0] === "set") {
    return await setProperty(client, message, command, config, sql, channels);
  }

  if(args[0] === "clear") {
    return await clearMoneydrop(client, message, command, config, sql, channels);
  }

  return await checkMoneydrop(client, message, command, config, sql, channels);
};

exports.removeDeletedChannel = (client, sql, channel) => {
  removeChannel(sql, channel.id);
};

async function checkMoneydrop(client, message, command, config, sql, channels) {
  let description = "";
  for(let i = 0, len = channels.length; i < len; i++) {
    let channel = channels[i];
    let channelID = channel.id;
    try {
      let row = await sql.get(`SELECT * FROM moneydrop WHERE channelID ="${channelID}"`);
      if(!row) {
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, pileSize, verbosity, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [channelID, 0, 0, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
        description += `${channel}\n`;
        description += `Enabled: ${false}. Verbosity: None.\n`;
        description += `Drop: ${0} to ${20}, ${0.02} chance.\n`;
        description += `Drop: ${20} to ${50}, ${0.005} chance.\n`;
        description += `Drop: ${100} to ${300}, ${0.001} chance.\n`;
      } else {
        let verbosityOutput = {
          "0": "None",
          "1": "Low",
          "2": "High"
        };
        description += `${channel}\n`;
        description += `Enabled: ${(row.dropMoney == 1)}. Verbosity: ${verbosityOutput[row.verbosity]}\n`;
        description += `Drop: ${row.firstMin} to ${row.firstMax}, ${row.firstProbability} chance.\n`;
        description += `Drop: ${row.secondMin} to ${row.secondMax}, ${row.secondProbability} chance.\n`;
        description += `Drop: ${row.thirdMin} to ${row.thirdMax}, ${row.thirdProbability} chance.\n`;
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table moneydrop");
        await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, pileSize INTEGER, verbosity INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, pileSize, verbosity, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [channelID, 0, 0, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
      }
      description += `${channel}\n`;
      description += `Enabled: ${false}. Verbosity: None.\n`;
      description += `Drop: ${0} to ${20}, ${0.02} chance.\n`;
      description += `Drop: ${20} to ${50}, ${0.005} chance.\n`;
      description += `Drop: ${100} to ${300}, ${0.001} chance.\n`;
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
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, pileSize, verbosity, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [channelID, 0, 0, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
      } else {
        await sql.run(`UPDATE moneydrop SET dropMoney = ${enabled} WHERE channelID = ${channelID}`);
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table moneydrop");
        await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, pileSize INTEGER, verbosity INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, pileSize, verbosity, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [channelID, 0, 0, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
      }
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
  let input = args[2];

  if(args[1] === "firstMin" || args[1] === "firstMax"|| args[1] === "secondMin"|| args[1] === "secondMax"|| args[1] === "thirdMin"|| args[1] === "thirdMax" || args[1] === "pileSize") {
    let numberCheck = /\b\d+\b/;
    if(!numberCheck.test(input)) {
      return message.reply(`set ${args[1]} requires an integer.`);
    }
  } else if(args[1] === "firstProbability" || args[1] === "secondProbability" || args[1] === "thirdProbability") {
    let numberCheck = /\b(0|0\.\d+|1)\b/;
    if(!numberCheck.test(input)) {
      return message.reply(`set ${args[1]} requires a decimal number from 0 to 1.`);
    }
  }  else if(args[1] === "verbosity") {
    let verbosityCheck = /\b(0|1|2|none|low|high)\b/;
    if(!verbosityCheck.test(input)) {
      return message.reply(`set ${args[1]} requires 0, 1, or 2.`);
    }
    let verbosityMap = {
      "none": "0",
      "low": "1",
      "high": "2"
    };
    input = (verbosityMap[input]) ? verbosityMap[input] : input;
  } else {
    return message.reply("!moneydrop set options: `verbosity, pileSize, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability`");
  }

  let description = "";
  for(let i = 0, len = channels.length; i < len; i++) {
    let channel = channels[i];
    let channelID = channel.id;
    try {
      let row = await sql.get(`SELECT * FROM moneydrop WHERE channelID ="${channelID}"`);
      if(!row) {
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, pileSize, verbosity, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [channelID, 0, 0, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
        await sql.run(`UPDATE moneydrop SET ${args[1]} = ${input} WHERE channelID = ${channelID}`);
      } else {
        await sql.run(`UPDATE moneydrop SET ${args[1]} = ${input} WHERE channelID = ${channelID}`);
      }
    } catch(e) {
      console.error(e);
      console.log("Creating table moneydrop");
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, pileSize INTEGER, verbosity INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, pileSize, verbosity, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [channelID, 0, 0, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
        await sql.run(`UPDATE moneydrop SET ${args[1]} = ${input} WHERE channelID = ${channelID}`);
      }
    }
    if(args[1] === "verbosity") {
      let verbosityOutput = {
        "0": "none",
        "1": "low",
        "2": "high"
      };
      description += `${channel} ${args[1]} set to ${verbosityOutput[input]}.\n`;
    } else {
      description += `${channel} ${args[1]} set to ${input}.\n`;
    }
  }

  // Can't be silent or more verbose.
  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});

}

async function clearMoneydrop(client, message, command, config, sql, channels) {
  let description = "";
  for(let i = 0, len = channels.length; i < len; i++) {
    let channel = channels[i];
    removeChannel(sql, channel.id);
    description += `Moneydrop configuration **cleared**, money pile **deleted**, and drop **disabled** in ${channel}.\n`;
  }

  // Can't be silent or more verbose.
  message.channel.send("", {embed: {
    color: config.color,
    description: description
  }});
}

async function removeChannel(sql, channelID) {
  try {
    let row = await sql.get(`SELECT * FROM moneydrop WHERE channelID ="${channelID}"`);
    if(row) {
      await sql.run(`DELETE FROM moneydrop WHERE channelID = ${channelID}`);
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table moneydrop");
      await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, pileSize INTEGER, verbosity INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
    }
  }
}

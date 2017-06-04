exports.run = async (client, message, config, sql, data) => {
  if(data.refresh) {
    return await refreshMoneypileCache(sql, data); //should be run every time !moneydrop is called ever.
  }
  let channelData = (data.list.hasOwnProperty(message.channel.id)) ? data.list[message.channel.id] : null;
  if(channelData == null) {
    return;
  }
  if(data.list[message.channel.id].grabbed) {
    //returns because !moneydrop and !moneygrab should not generate money.
    return await updateMoneypileSize(sql, data);
  }
  if(channelData.dropMoney == 0) {
    return;
  }

  if(spammed(client, message, channelData)) {
    return;
  }

  let dropSize = 0;
  let firstDrop = Math.random() < channelData.firstProbability;
  let secondDrop = Math.random() < channelData.secondProbability;
  let thirdDrop = Math.random() < channelData.thirdProbability;
  if(firstDrop) {
    dropSize += Math.floor(Math.random() * (channelData.firstMax - channelData.firstMin) + channelData.firstMin);
  }
  if(secondDrop) {
    dropSize += Math.floor(Math.random() * (channelData.secondMax - channelData.secondMin) + channelData.secondMin);
  }
  if(thirdDrop) {
    dropSize += Math.floor(Math.random() * (channelData.thirdMax - channelData.thirdMin) + channelData.thirdMin);
  }

  if(dropSize > 0) {
    let result = dropSize + channelData.pileSize;
    channelData.pileSize = result;
    try {
      await sql.run("UPDATE moneydrop SET pileSize = ? WHERE channelID = ?", [result, channelData.channelID]);
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, pileSize INTEGER, verbosity INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
        await sql.run("INSERT INTO moneydrop (channelID, dropMoney, pileSize, verbosity, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
         [message.channel.id, 0, result, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
      }
      await refreshMoneypileCache(sql, data);
    }

    if(channelData.verbosity == 1) {
      let highDrop = (thirdDrop) ? (Math.random() < 0.5) : true; //50% to not alert a big drop
      let midDrop = (secondDrop) ? (Math.random() < 0.75) : true; //25% to not alert a big drop
      if(channelData.pileSize > channelData.secondMin && highDrop && midDrop) { //only alert once larger than a point
        try {
          let alertMsg = await message.channel.send("", {embed: {
            color: config.color,
            description: `There is a pile of money with \$${result}.`
          }});
          deleteAlert(client, config, alertMsg);
        } catch(e) {
          console.error(e);
        }
      }
    } else if(channelData.verbosity == 2) {
      //same as 1 but every drop
      try {
        let alertMsg = await message.channel.send("", {embed: {
          color: config.color,
          description: `There is a pile of money with \$${result}.`
        }});
        deleteAlert(client, config, alertMsg);
      } catch(e) {
        console.error(e);
      }
    } else if(channelData.verbosity == 3) {
      message.channel.send("", {embed: {
        color: config.color,
        description: `There is a pile of money with \$${result}.`
      }});
    }
  }
};

function spammed(client, message, channelData) {
  let spammedGeneral = false;
  if(channelData.timers.hasOwnProperty(message.author.id)) {
    spammedGeneral = generalAntispam(client, message, channelData);
  } else {
    channelData.timers[message.author.id] = {
      start: message.createdTimestamp,
      downtime: 10 * 1000,
      infractions: 0
    };
  }

  let spammedSpecific = false;
  if(channelData.timers.hasOwnProperty(message.author.id + message.content)) {
    spammedSpecific = specificAntispam(client, message, channelData);
  } else {
    channelData.timers[message.author.id + message.content] = {
      start: message.createdTimestamp,
      downtime: 30 * 1000,
      infractions: 0
    };
  }

  let fuckyournakedogambling = {
    "$bf": true,
    "$betflip": true,
    "$br": true,
    "$betroll": true,
    "$slot": true
  };
  let firstWord = message.content.split(" ")[0];
  let spammedBanned = fuckyournakedogambling.hasOwnProperty(firstWord);

  return spammedGeneral || spammedSpecific || spammedBanned;
}

function generalAntispam(client, message, channelData) {
  let userID = message.author.id;
  let timestamp = message.createdTimestamp;
  let timeData = channelData.timers[userID];
  let endTime = timeData.start + timeData.downtime;
  let timeBetween = timestamp - timeData.start;
  let timeLeft = endTime - timestamp;

  if(timeLeft > 0) {
    if(timeBetween < (5 * 1000)) {
      timeData.infractions++;
    }
    if(timeData.infractions < 10) {
      timeData.start = timestamp;
    }
    if(timeData.infractions > 2) {
      if(timeData.infractions == 10) {
        timeData.downtime = 10 * 60 * 1000;
        message.reply("please do not spam in an attempt to get money to drop. Money will not drop from your messages for the next hour. **If this was triggered during normal conversation,** let Henry know so he can relax the anti-spam or fix any bugs.");
      } else if(timeData.infractions < 10) {
        if(timeLeft > (timeData.downtime / 2)) {
          if(timeData.downtime < (60 * 1000)) {
            timeData.downtime += 1 * 1000;
          }
        }
      }
      return true;
    }
    //continue dropping for less than 2 infractions
  } else {
    channelData.timers[userID] = {
      start: timestamp,
      downtime: 20 * 1000,
      infractions: 0
    };
  }
  return false;
}

function specificAntispam(client, message, channelData) {
  let userID = message.author.id;
  let timestamp = message.createdTimestamp;
  let timeData = channelData.timers[userID + message.content];
  let endTime = timeData.start + timeData.downtime;
  let timeLeft = endTime - timestamp;

  //this anti-spam isnt as harsh so the timer is long
  if(timeLeft > 0) {
    timeData.infractions++;
    timeData.start = timestamp;
    return true;
  } else {
    channelData.timers[message.author.id + message.content] = {
      start: message.createdTimestamp,
      downtime: 60 * 1000,
      infractions: 0
    };
  }
  return false;
}

async function refreshMoneypileCache(sql, data) {
  data.refresh = false;
  data.list = {};
  try{
    let rows = await sql.all("SELECT * FROM moneydrop");
    for(let i = 0; i < rows.length; i++) {
      let channelID = rows[i].channelID;
      data.list[channelID] = rows[i];
      data.list[channelID].update = false;
      data.list[channelID].grabbed = false;
      data.list[channelID].timers = {};
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table moneydrop");
      await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, pileSize INTEGER, verbosity INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
    }
  }
}

async function updateMoneypileSize(sql, data) {
  let channels = Object.keys(data.list);
  for(let i = 0; i < channels.length; i++) {
    let channelID = channels[i];
    let channelData = data.list[channelID];
    data.list[channelID].grabbed = false;
    try{
      let row = await sql.get("SELECT * FROM moneydrop WHERE channelID = ?", [channelID]);
      if(row) {
        await sql.run("UPDATE moneydrop SET pileSize = ? WHERE channelID = ?", [channelData.pileSize, channelData.channelID]);
      } else {
        console.error("Somehow botbolt/routines/moneypile.js:updateMoneypileSize() tried to update a moneypile in an SQLite row that doesn't exist.");
      }
    } catch(e) {
      console.error(e);
      if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
        console.log("Creating table moneydrop");
        await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, pileSize INTEGER, verbosity INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
      }
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

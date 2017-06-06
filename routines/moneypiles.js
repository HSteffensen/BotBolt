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
  let spammedMessage = messageAntispam(client, message, channelData);
  let spammedUser = userAntispam(client, message, channelData);
  let spammedQuick = quickAntispam(client, message, channelData);

  let fuckyournakedogambling = {
    "$bf": true,
    "$betflip": true,
    "$br": true,
    "$betroll": true,
    "$slot": true
  };
  let firstWord = message.content.split(" ")[0];
  let spammedBanned = fuckyournakedogambling.hasOwnProperty(firstWord);

  return spammedMessage || spammedUser || spammedQuick || spammedBanned;
}

//cancels drop if a user does too many messages too quickly, even if others post inbetween
function quickAntispam(client, message, channelData) {
  let userID = message.author.id;
  let timeData = channelData.timers[userID];

  if(channelData.timers.hasOwnProperty(userID)) {
    let timestamp = message.createdTimestamp;
    let endTime = timeData.start + timeData.downtime;
    let timeLeft = endTime - timestamp;
    if(timeLeft > 0) {
      timeData.infractions++;
      timeData.start = timestamp;
      return (timeData.infractions > 2);
    }
  }

  channelData.timers[userID] = {
    start: message.createdTimestamp,
    downtime: 5 * 1000,
    infractions: 0
  };
  return false;
}

//cancels a drop if a user sends multiple messages in a row without anyone else speaking
function userAntispam(client, message, channelData) {
  let userID = message.author.id;
  let timestamp = message.createdTimestamp;
  let endTime = channelData.lastSpeaker.start + channelData.lastSpeaker.downtime;
  let timeLeft = endTime - timestamp;

  if(channelData.lastSpeaker.userID == userID) {
    if(timeLeft > 0) {
      channelData.lastSpeaker.infractions++;
      channelData.lastSpeaker.start = timestamp;
      return (channelData.lastSpeaker.infractions > 2);
    }
  }

  channelData.lastSpeaker = {
    userID: userID,
    start: message.createdTimestamp,
    downtime: 60 * 1000,
    infractions: 0
  };
  return false;
}

//cancels a drop if a user sends the same message multiple times in a row
function messageAntispam(client, message, channelData) {
  let userID = message.author.id;
  let messageData = channelData.lastMessage[userID];

  //this anti-spam isnt as harsh so the timer is long
  if(channelData.lastMessage.hasOwnProperty(userID) && messageData.content === message.content) {
    messageData.infractions++;
    return (messageData.infractions > 1);
  }

  channelData.lastMessage[userID] = {
    content: message.content,
    infractions: 0
  };
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
      data.list[channelID].lastMessage = {};
      data.list[channelID].lastSpeaker = {};
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

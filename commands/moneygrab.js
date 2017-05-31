exports.run = async (client, message, command, config, sql, shortcut, cacheData) => {
  let author = message.author;
  let authorID = author.id;
  let channel = message.channel;
  let channelID = channel.id;

  if(channel.permissionsFor(client.user).has("MANAGE_MESSAGES")) {
    try {
      message.delete();
    } catch(e) {
      console.error(e);
    }
  }

  let data = cacheData.moneypileCache;
  let channelData = (data.list.hasOwnProperty(message.channel.id)) ? data.list[channelID] : null;
  if(channelData == null || channelData.pileSize == 0) {
    return;
  }

  let grabbed = Math.ceil((Math.random() * 0.45 + 0.5) * channelData.pileSize);
  let remaining = channelData.pileSize - grabbed;
  channelData.pileSize = remaining;
  let balance = 0;
  let total = 0;
  let verbosity = channelData.verbosity;

  //this section is from back before the moneypileCache was used instead of direct sqlite calls
  /*
  try {
    let row = await sql.get(`SELECT * FROM moneydrop WHERE channelID ="${channelID}"`);
    if(!row) {
      await sql.run("INSERT INTO moneydrop (channelID, dropMoney, pileSize, verbosity, firstMin, firstMax, firstProbability, secondMin, secondMax, secondProbability, thirdMin, thirdMax, thirdProbability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
       [channelID, 0, 0, 0, 0, 20, 0.02, 20, 50, 0.005, 100, 300, 0.001]); //default amounts and probabilities
    } else {
      grabbed = Math.ceil((Math.random() * 0.45 + 0.5) * row.pileSize);
      remaining = row.pileSize - grabbed;
      verbosity = row.verbosity;
      await sql.run(`UPDATE moneydrop SET pileSize = ${remaining} WHERE channelID = ${channelID}`);
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
  */

  try {
    let row = await sql.get(`SELECT * FROM money WHERE userID ="${authorID}"`);
    if(!row) {
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [authorID, grabbed]);
    } else {
      balance = row.balance;
      total = balance + grabbed;
      await sql.run("UPDATE money SET balance = ? WHERE userID = ?", [total, authorID]);
    }
  } catch(e) {
    console.error(e);
    if(e.message.startsWith("SQLITE_ERROR: no such table:")) {
      console.log("Creating table money");
      await sql.run("CREATE TABLE IF NOT EXISTS money (userID TEXT, balance INTEGER)");
      await sql.run("INSERT INTO money (userID, balance) VALUES (?, ?)", [authorID, grabbed]);
    }
  }

  if(verbosity == 1) {
    try {
      let alertMsg = await channel.send("", {embed: {
        color: config.color,
        description: `${author.tag} grabbed \$${grabbed} from the money pile.`
      }});
      if(channel.permissionsFor(client.user).has("MANAGE_MESSAGES")) {
        await sleep(config.deleteTimer * 1000);
        await alertMsg.delete();
      }
    } catch(e) {
      console.log(e);
    }
  }
  if(verbosity == 2) {
    channel.send("", {embed: {
      color: config.color,
      description: `**${author.tag}** grabbed \$${grabbed} from the money pile.\nThere is a pile of money with \$${remaining}.\n**${author.tag}** \$${balance} => \$${total}.`
    }});
  }
};

// From http://stackoverflow.com/a/39914235
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

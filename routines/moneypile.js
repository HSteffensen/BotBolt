exports.run = async (client, message, config, sql, data) => {
  if(data.refresh) {
    await refreshMoneypileCache(sql, data); //should be run every time !moneydrop or !moneygrab is called ever.
  }

  let channelData = null;
  for(let i = 0; i < data.list.length; i++) {
    if(data.list[i].channelID == message.channel.id) {
      channelData = data.list[i];
      break;
    }
  }
  if(channelData == null) {
    return;
  }

  let dropSize = 0;

  if(Math.random() < channelData.firstProbability) {
    dropSize += Math.floor(Math.random() * (channelData.firstMax - channelData.firstMin) + channelData.firstMin);
  }
  if(Math.random() < channelData.secondProbability) {
    dropSize += Math.floor(Math.random() * (channelData.secondMax - channelData.secondMin) + channelData.secondMin);
  }
  if(Math.random() < channelData.thirdProbability) {
    dropSize += Math.floor(Math.random() * (channelData.thirdMax - channelData.thirdMin) + channelData.thirdMin);
  }

  if(dropSize > 0) {
    let result = dropSize + channelData.pileSize;
    channelData.pileSize = result;
    try {
      await sql.run("UPDATE moneydrop SET pileSize = ? WHERE channelID = ?", [result, channelData.channelID]);
    } catch(e) {
      console.error(e);
      console.log("Creating table moneydrop");
      await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, pileSize INTEGER, verbosity INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
      await refreshMoneypileCache(sql, data);
    }

    if(channelData.verbosity == 2) {
      message.channel.send("", {embed: {
        color: config.color,
        description: `There is a pile of money with \$${result}.`
      }});
    }
  }
};

async function refreshMoneypileCache(sql, data) {
  data.refresh = false;
  data.list = [];
  try{
    let row = await sql.all("SELECT * FROM moneydrop");
    data.list = row;
  } catch(e) {
    console.error(e);
    console.log("Creating table moneydrop");
    await sql.run("CREATE TABLE IF NOT EXISTS moneydrop (channelID TEXT, dropMoney INTEGER, pileSize INTEGER, verbosity INTEGER, firstMin INTEGER, firstMax INTEGER, firstProbability FLOAT, secondMin INTEGER, secondMax INTEGER, secondProbability FLOAT, thirdMin INTEGER, thirdMax INTEGER, thirdProbability FLOAT)");
    data.list = [];
  }
}

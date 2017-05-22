exports.run = async (client, message, config, sql, data) => {
  if(data.refresh) {
    await refreshMoneypileCache(sql, data);
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
    dropSize += Math.floor(Math.random * (channelData.firstMax - channelData.firstMin) + channelData.firstMin);
  }
  if(Math.random() < channelData.secondProbability) {
    dropSize += Math.floor(Math.random * (channelData.secondMax - channelData.secondMin) + channelData.secondMin);
  }
  if(Math.random() < channelData.thirdProbability) {
    dropSize += Math.floor(Math.random * (channelData.thirdMax - channelData.thirdMin) + channelData.thirdMin);
  }

  let result = dropSize + channelData.pileSize;
  channelData.pileSize = result;
  await sql.run(`UPDATE moneydrop SET pileSize = ${result} WHERE channelID = ${channelData.channelID}`);

  if(channelData.verbose) {
    message.channel.send("", {embed: {
      color: config.color,
      description: `There is a pile of money with \$${result}.`
    }});
  }

};

async function refreshMoneypileCache(sql, data) {
  data.refresh = false;
  data.list = [];
  let row = await sql.all("SELECT * FROM moneydrop");
  data.list = row;
}

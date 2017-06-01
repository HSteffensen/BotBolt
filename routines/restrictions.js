exports.checkRestriction = (client, message, command, config, cacheData) => {
  let restrictions = cacheData.restrictionCache;
  let commandName = command.name;
  if(commandName === "moneygrab") { //moneygrab always allowed if only to delete the !grab message
    return true;
  }
  //allow a command if it doesn't have a list or if the channel is on its list
  if(restrictions.hasOwnProperty(commandName)) {
    let allowedChannels = restrictions[commandName].list;
    for(let i = 0; i < allowedChannels.length; i++) {
      if(allowedChannels[i] == message.channel.id) {
        return true;
      }
    }
    let channelMentions = allowedChannels.map((item) => {
      return `<#${item}>`;
    });
    if(restrictions[commandName].verbose) {
      message.channel.send("", {embed: {
        color: config.color,
        description: `${config.commandPrefix}${commandName} restricted to ${channelMentions}.`
      }});
    }
    return false;
  } else {
    return true;
  }
};

exports.run = async (client, message, command, config, sql, shortcut, cacheData) => {
  let args = command.args;
  // Caller must be bot owner
  let permitted = false;
  for(let i = 0, len = config.ownerIDs.length; i < len; i++) {
    let owner = config.ownerIDs[i];
    if(owner == message.author.id) {
      permitted = true;
      break;
    }
  }
  if(!permitted) {
    return message.reply("Permission denied: restriction");
  }

  if(args.length < 1) {
    return message.reply("syntax: `!restriction name (channels)`");
  }

  let channels = (message.mentions.channels.array().length > 0) ? message.mentions.channels.array() : [message.channel];

  if(channels[0].type === "dm") {
    return message.reply("Bad request: can't restrict in a DM.");
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

  let newRestrictions = null;
  if(args.length == 1) {
    return checkRestriction(client, message, command, config, cacheData, commandName);
  }

  if(args[1] === "remove") {
    newRestrictions = removeRestriction(client, message, command, config, cacheData, commandName);
  } else {
    newRestrictions = setRestriction(client, message, command, config, cacheData, commandName, channels);
  }

  if(newRestrictions != null) {
    let fs = require("fs");
    fs.writeFile("data/data_Restrictions.json", JSON.stringify(newRestrictions), (err) => {
      if (err) console.error(err);
    });
    cacheData.restrictionCache = newRestrictions;
  }
};

exports.reloadOnRestart = (cacheData) => {
  let fs = require("fs");
  fs.stat("data/data_Restrictions.json", async (err) => {
    if(err === null) { //no error finding the file
      cacheData.restrictionCache = JSON.parse(fs.readFileSync("data/data_Restrictions.json", "utf8"));
    } else if (err.code === "ENOENT") { //file doesn't exist
      let empty = {};
      fs.writeFile("data/data_Restrictions.json", JSON.stringify(empty), (err) => {
        if (err) console.error(err);
      });
    } else { //other error
      console.log(err);
    }
  });
};

function checkRestriction(client, message, command, config, cacheData, commandName) {
  let restrictions = cacheData.restrictionCache;
  let description = "";
  if(restrictions.hasOwnProperty(commandName)) {
    let channelMentions = restrictions[commandName].list.map((item) => {
      return `<#${item.id}>`;
    });
    description = `${config.commandPrefix}${commandName} restricted to ${channelMentions}.`;
  } else {
    description = `${config.commandPrefix}${commandName} is not restricted.`;
  }
  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: description
    }});
  }
}

function removeRestriction(client, message, command, config, cacheData, commandName) {
  let restrictions = cacheData.restrictionCache;
  let description = "";
  if(restrictions.hasOwnProperty(commandName)) {
    delete restrictions[commandName];
    description = `${config.commandPrefix}${commandName} is no longer restricted.`;
  } else {
    description = `${config.commandPrefix}${commandName} is not restricted.`;
  }
  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: description
    }});
  }
  return restrictions;
}

function setRestriction(client, message, command, config, cacheData, commandName, channels) {
  let restrictions = cacheData.restrictionCache;
  let channelIDs = channels.map((item) => {
    return item.id;
  });
  let channelMentions = channels.map((item) => {
    return `<#${item.id}>`;
  });
  restrictions[commandName] = {
    list: channelIDs,
    verbose: false
  };
  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: `${config.commandPrefix}${commandName} restricted to ${channelMentions}.`
    }});
  }
  return restrictions;
}

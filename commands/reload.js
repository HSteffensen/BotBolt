exports.run = (client, message, command, config, sql, shortcut) => {
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
    return message.reply("Permission denied: reload");
  }

  if(args[0] === "routine") {
    try {
      delete require.cache[require.resolve(`../routines/${args[1]}.js`)];
    } catch(e) {
      return message.reply(`Bad request: routine \"${args[1]}\" not found.`);
    }
    return message.channel.send(`The routine \"${args[1]}\" has been reloaded.`);
  }

  let commandName = (shortcut[args[0]]) ? shortcut[args[0]] : args[0];
  if(!args || args.length < 1) {
    return message.reply("Bad request: must provide a command name to reload.");
  }
  // the path is relative to the *current folder*, so just ./filename.js
  try {
    delete require.cache[require.resolve(`./${commandName}.js`)];
  } catch(e) {
    return message.reply(`Bad request: command \"${commandName}\" not found.`);
  }
  message.channel.send(`The command \"${commandName}\" has been reloaded.`);
};

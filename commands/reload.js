exports.run = (client, message, command, config) => {
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

  if(!args || args.length < 1) {
    return message.reply("Bad request: must provide a command name to reload.");
  }
  // the path is relative to the *current folder*, so just ./filename.js
  try {
    delete require.cache[require.resolve(`./${args[0]}.js`)];
  } catch(e) {
    return message.reply("Bad request: command \"" + args.join(" ") + "\" not found.");
  }
  message.channel.send(`The command \"${args[0]}\" has been reloaded.`);
};

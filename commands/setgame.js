exports.run = (client, message, command, config) => {
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
    return message.reply("Permission denied: setgame");
  }
  let gameStr = args.join(" ");
  client.user.setGame(gameStr);
  if(!command.silent) {
    message.channel.send("", {embed: {
      color: config.color,
      description: `${message.author} Game set.`
    }});
  }
};
